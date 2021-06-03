const fsPromises = require("fs").promises;

const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const keypairs = require("keypairs");
const joi = require("@hapi/joi");
const promClient = require("prom-client");
const winston = require("winston");
const methodOverride = require("method-override");

const log = new winston.createLogger({
    level: "info",
    defaultMeta: { service: "wallet-server" },
    transports: process.env.NODE_ENV === "production" ? [
	   new winston.transports.Console(),
    ] : [
	   new winston.transports.Console({
		  format: winston.format.simple(),
	   }),
    ]
});

function die(msg, code) {
    console.error(msg)
    process.exit(code || 1)
}

/**
 * API version, for compatibility. Semantic version. Array elements in order: major minor patch.
 */
const API_VERSION = [ 1, 0, 0 ];

/**
 * HTTP API path prefix, computed from the API_VERSION.
 */
const API_PATH_PREFIX = `/api/v${API_VERSION[0]}`;

/**
 * Server configuration.
 */
const config = {
    /**
	* Port on which HTTP API will be served.
	*/
    apiPort: process.env.APP_API_PORT || 8000,

    /**
	* If not empty the HTTP API will serve a failure response on its HTTP API
	* health endpoint. The failure response will include the contents of 
	* this property.
	*/
    apiNotOkay: process.env.APP_API_NOT_OKAY,

    /**
	* If not empty the metrics server will be disabled.
	*/
    metricsDisabled: process.env.APP_METRICS_DISABLED,

    /**
	* Port on which Prometheus metrics will be served.
	*/
    metricsPort: process.env.APP_METRICS_PORT || 8001,

    /**
	* Prefix for all metrics.
	*/
    metricsPrefix: process.env.APP_METRICS_PREFIX || "wallet_server:",

    /**
	* MongoDB URI with database connection details.
	*/
    dbURI: process.env.APP_DB_URI || "mongodb://127.0.0.1/dev_wallet_service",
};

/**
 * Schema for an authority request file which is passed into the 
 * create-authority command.
 */
const AUTHORITY_REQUEST_FILE_SCHEMA = joi.object({
    api_base_url: joi.string().required(),
    name: joi.string().required(),
    owner: joi.object({
	   contact: joi.string().required(),
	   nickname: joi.string().required(),
    }),
});

// Models
var authoritySchema = new mongoose.Schema({
    name: { type: String, required: true },
    owner: {
	   contact: { type: String, required: true },
	   nickname: { type: String, required: true },
    },
    public_key: { type: String, required: true },
});
var AuthorityModel = new mongoose.model("Authority", authoritySchema);

var entrySchema = new mongoose.Schema({
    authority_id: { type: String, required: true },
    user_id: { type: String, required: true },
    created_on: { type: Date, required: true },
    amount: { type: Number, required: true },
    reason: { type: String, required: true },
    item: {
	   type: new mongoose.Schema({
		  name: { type: String, required: true },
		  used: { type: Boolean, required: true },
		  data: { type: Object, required: false },
	   }, { _id: false }),
	   required: false,
    },
});
var EntryModel = mongoose.model("Entry", entrySchema);

// Metrics
promClient.collectDefaultMetrics({
    prefix: config.metricsPrefix,
});

/**
 * Handles all logic related to measuring Prometheus metrics. Simply call the
 * the different measurement methods in their appropriate locations.
 */
class MetricsClient {
    /**
	* Initializes.
	* @param prefix Metrics prefix.
	*/
    constructor(prefix) {
	   this.requestDuration = new promClient.Histogram({
		  name: `${prefix}request_duration`,
		  help: "Duration of HTTP requests in ms",
		  labelNames: ["user_agent", "server_version", "method", "path",
					"status_code", "authorized_subject"],
		  buckets: [0.1, 5, 15, 50, 100, 500],
	   })

	   this.errCount = new promClient.Counter({
		  name: `${prefix}internal_error_count`,
		  help: "Number of internal errors which have occurred",
		  labelNames: ["user_agent", "server_version", "method", "path",
					"status_code", "error_msg", "error_stack"],
	   })
    }

    /**
	* Measures a request handler.
	* @param handler Function to run and measure.
	*/
    measureHandler(req, res, handler) {
	   let reqDurationEnd = this.requestDuration.startTimer()
	   
	   handler()

	   reqDurationEnd({
		  user_agent: req.get("User-Agent"),
		  server_version: `${API_VERSION[0]}.${API_VERSION[1]}.${API_VERSION[2]}`,
		  method: req.method,
		  path: req.path,
		  status_code: res.statusCode,
		  authorized_subject: req.authority ? req.authority.id : undefined,
	   })
    }

    /**
	* Measures an internal error's details.
	* @param msg Error message.
	* @param stack Error stack trace.
	*/
    measureInternalError(err, req, res) {
	   this.errCount.labels({
		  user_agent: req.get("User-Agent"),
		  server_version: `${API_VERSION[0]}.${API_VERSION[1]}.${API_VERSION[2]}`,
		  method: req.method,
		  path: req.path,
		  status_code: res.statusCode,
		  error_msg: err.msg,
		  error_stack: err.stack,
	   }).inc()
    }
}
const metricsClient = new MetricsClient(config.metricsPrefix);

// Express configuration
const app = express();
const apiRouter = express.Router();

// ... middleware
const reqMeasureMW = (req, res, next) => {
    metricsClient.measureHandler(req, res, next)
};

const reqLogMW = (req, res, next) => {
    log.info("Request", {
	   method: req.method,
	   path: req.path,
	   user_agent: req.get("User-Agent"),
    })

    next()
};

app.use(reqMeasureMW);
app.use(reqLogMW);
app.use(bodyParser.json());
app.use(API_PATH_PREFIX, apiRouter);

// ... error handler
const reqErrHndlr = (err, req, res, next) => {
    log.error("Request handler error", {
	   method: req.method,
	   path: req.path,
	   user_agent: req.get("User-Agent"),
	   error: {
		  message: err.message,
		  stack: err.stack,
	   },
	   status_code: err.statusCode,
    })

    metricsClient.measureInternalError(err, req, res)

    // If statement from: http://expressjs.com/en/guide/error-handling.html
    if (res.headersSent) {
	   return next(err)
    }
    
    res.status(500).json({
	   error: "an internal error has occurred",
    })
};

app.use(reqErrHndlr);

// Second express app only for publishing metrics internally
const metricsApp = express();

metricsApp.use(reqMeasureMW);
metricsApp.use(reqLogMW);
metricsApp.use(reqErrHndlr);

/**
 * Prometheus metrics endpoint.
 * NOTICE: Path not API versioned.
 */
metricsApp.get("/metrics", (req, res) => {
    res.set("Content-Type", promClient.register.contentType);
    res.send(promClient.register.metrics());
})

/**
 * Does what __auth does, but ensures errors are never leaked to a caller.
 * Use this, not __auth().
 */
async function auth(req, res, next) {
    try {
	   await __auth(req, res, next);
    } catch (err) {
	   log.warn("failed to authenticate", {
		  error: err,
	   });
	   
	   return res.status(403).json({
		  error: "forbidden",
	   });
    }
}

/**
 * Authorization helper. Expects a JWT in the Authorization header. This should
 * be signed by an authority's private key.
 */
async function __auth(req, res, next) {
    const authHeader = req.headers.authorization;

    const reqLogDetails = {
	   method: req.method,
	   path: req.path,
	   user_agent: req.userAgent,
    };

    if (authHeader) {
	   // First get claimed authority id from the token
	   // Here we are not verifying the token. We are simply seeing who it claims
	   // to be, so we can check with our database and get the public key of who
	   // they claim to be. After we get this the actual verified token is provided
	   // to the request context and can be trusted.
	   //
	   // This variable should not be used as any proof of authorization
	   const unverifiedTok = jwt.decode(authHeader);
	   var authority = await AuthorityModel.findById(unverifiedTok.sub);
	   
	   if (!authority) {
		  log.warn("Request JWT specified non-existant authority", {
			 ...reqLogDetails,
			 unverified_token: unverifiedTok,
		  });
		  
		  return res.status(403).json({
			 error: "forbidden",
		  });
	   }

	   // Then verify JWT now that we have the actual claimed user's public key
	   await new Promise((resolve, reject) => {
		  jwt.verify(authHeader, authority.public_key, (err, token) => {
			 if (err) {
				log.warn("Failed to verify JWT", {
				    ...reqLogDetails,
				    error: err,
				});
				
				return reject(err);
			 }

			 req.authority = authority;
			 req.authToken = token;
			 
			 return resolve();
		  });
	   });

	   next();
    } else {
	   console.error("warning: no authorization header");

	   log.warn("No authorization data", reqLogDetails);
	   
        res.status(401).json({
		  error: "authorization data required",
	   });
    }
};

/**
 * Validates that a request's JSON body matches a schema.
 * @param schema Definition of data requirements.
 * @returns A middleware function which validates the request body.
 */
function validateBody(schema) {
    return (req, res, next) => {
	   let validateRes = schema.validate(req.body);

	   if (validateRes.error) {
		  res.status(400).json({
			 error: validateRes.error
		  });
	   } else {
		  next();
	   }
    }
}

/**
 * Retrieves a comma seperated list from a URL query parameter.
 * @param req Express request
 * @param paramName Key of parameter in URL
 * @returns Array of items
 */
function getParamList(req, paramName) {
    const val = req.query[paramName];
    if (val === undefined || val === null || val.length === 0) {
	   return [];
    } else {
	   return val.split(",");
    }
}

/**
 * External indication that service is operating.
 */
apiRouter.get("/health", (req, res) => {
    res.json({
	   ok: config.apiNotOkay || true,
	   version: `${API_VERSION[0]}.${API_VERSION[1]}.${API_VERSION[2]}`,
    });
})

/**
 * Get wallets, can be filtered.
 */
apiRouter.get("/wallet", auth, async (req, res) => {
    let userIds = getParamList(req, "user_ids");
    let authorityIds = getParamList(req, "authority_ids");

    let match = {};
    if (userIds.length > 0) {
	   match.user_id = { $in: userIds };
    }

    if (authorityIds.length > 0) {
	   match.authority_id = { $in: authorityIds };
    }

    let wallets = await EntryModel.aggregate([
	   { $match: match },
	   { $group: { _id: "$user_id", total: { $sum: "$amount" } } },
    ]);
    let respWallets = wallets.map((item) => {
	   return {
		  user_id: item._id,
		  total: item.total,
	   }
    });
    
    res.json({
	   wallets: respWallets
    });
});

const entryReqSchema = joi.object({
    user_id: joi.string().required(),
    amount: joi.number().integer().required(),
    reason: joi.string().required(),
    item: joi.object({
	   name: joi.string().required(),
	   data: joi.object(),
    }),
});

function entryJSON(entry) {
    return {
		  entry_id: entry._id,
		  authority_id: entry.authority_id,
		  user_id: entry.user_id,
		  created_on: entry.created_on.getTime() / 1000,
		  amount: entry.amount,
		  reason: entry.reason,
		  item: entry.item,
    };
}

/**
 * Create an entry.
 */
apiRouter.post("/entry", auth, validateBody(entryReqSchema), async (req, res) => {
    let entry = new EntryModel({
	   authority_id: req.authority.id,
	   user_id: req.body.user_id,
	   created_on: new Date(),
	   amount: req.body.amount,
	   reason: req.body.reason,
	   item: { ...req.body.item, used: false },
    });

    await entry.save();

    res.json({
	   entry: entryJSON(entry),
    });
});

/**
 * Get user inventories, can be filtered.
 */
apiRouter.get("/entry/inventory", auth, async (req, res) => {
    let entryIDs = getParamList(req, "entry_ids");
    let userIds = getParamList(req, "user_ids");
    let authorityIds = getParamList(req, "authority_ids");
    let used = req.query.used;

    let match = { item: { $exists: true } };
    if (entryIDs.length > 0) {
	   match._id = { $in: entryIDs };
    }
    
    if (userIds.length > 0) {
	   match.user_id = { $in: userIds };
    }

    if (authorityIds.length > 0) {
	   match.authority_id = { $in: authorityIds };
    }

    console.log(used);
    if (used !== undefined) {
	   match["item.used"] = used;
    }

    let items = await EntryModel.find(match)
    let respItems = items.map((item) => {
	   return {
		  entry_id: item._id,
		  authority_id: item.authority_id,
		  user_id: item.user_id,
		  item: item.item,
	   }
    });
    
    res.json({
	   inventory: respItems
    });
});


/**
 * Mark an item an a user's inventory as used up.
 */
apiRouter.post("/entry/:entry_id/inventory/use", auth, async (req, res) => {
    let entryID = req.params.entry_id;

    let entry = await EntryModel.findOne({
	   _id: entryID,
	   item: { $exists: true },
    });
    entry.item.used = true;
    await entry.save();
    
    res.json({
	   entry: entryJSON(entry),
    });
});

/**
 * Main entrypoint. Runs commands.
 */
async function main() {
    try{
	   // Check command line options to determine what program should do
	   var cmd = "api";
	   if (process.argv.length >= 3) {
		  cmd = process.argv[2];
	   }

	   // Connect to the database if needed
	   if (cmd === "api" || cmd === "create-authority") {
		  await mongoose.connect(config.dbURI, {
			 useNewUrlParser: true,
			 useUnifiedTopology: true,
		  });

		  const db = mongoose.connection;

		  // Only log in API command, since output of create-authority should be
		  // authority client configuration JSON.
		  if (cmd == "api") {
			 log.info("Connected to MongoDB");
			 log.info("API version", {
				api_version: API_VERSION
			 });
		  }
	   }

	   // Run command
	   switch (cmd) {
	   case "api":
		  await new Promise((resolve, reject) => {
			 app.listen(config.apiPort, () => {
				log.info("API server listening", {
				    port: config.port,
				    path_prefix: API_PATH_PREFIX,
				});
			 });

			 if (!config.metricsDisabled) {
				metricsApp.listen(config.metricsPort, () => {
				    log.info("Metrics server listening", {
					   port: config.metricsPort,
				    });
				});
			 } else {
				log.info("Metrics server disabled", {
				    config: {
					   metricsDisabled: config.metricsDisabled,
				    }
				});
			 }
		  });
		  break
	   case "create-authority":
		  // Read authority request JSON file
		  if (process.argv.length < 4) {
			 die(`usage: index.js create-authority <authority request file>
error: incorrect number of arguments provided`);
		  }
		  arPath = process.argv[3];

		  const arDat = await fsPromises.readFile(arPath);
		  const arJSON = JSON.parse(arDat);
		  
		  const arValidate = AUTHORITY_REQUEST_FILE_SCHEMA.validate(arJSON);
		  if (arValidate.error) {
			 die("error: authority request file not in the correct format: ${arValidate.error}");
		  }
		  const ar = arValidate.value;

		  // Generate key pair
		  const pair = await keypairs.generate({
			 kty: "ECDSA",
			 namedCurve: "P-256",
		  });
		  
		  const pubPEM = await keypairs.export({
			 jwk: pair.public,
			 encoding: "pem",
		  });
		  const privPEM = await keypairs.export({
			 jwk: pair.private,
			 encoding: "pem",
		  });

		  // Save model
		  var authority = new AuthorityModel({
			 name: ar.name,
			 owner: ar.owner,
			 public_key: pubPEM,
		  });

		  await authority.save();

		  // Generate wallet client configuration file
		  console.log(JSON.stringify({
			 config_schema_version: "0.1.0",
			 api_base_url: ar.api_base_url,
			 authority_id: authority.id,
			 private_key: privPEM,
		  }, null, 4));
		  break;
	   case "help":
		  console.log(`index.js - wallet service main

USAGE

     api|create-authority|help [options...]

COMMANDS

    api                 Start HTTP API server.

    create-authority    Create a new authority and save it in the database. A file
                        path to a JSON authority request file (containing fields
                        from the AUTHORITY_REQUEST_FILE_SCHEMA) must be provided.
                        The authority's client configuration JSON will be outputed.

    help                Show this help text.
`);
		  break;
	   default:
		  die(`usage: index.js api|create-authority|help
error: invalid command "${cmd}"`);
		  break;
	   }

	   process.exit();
    } catch (e) {
	   console.trace(e);
    }
}

main().catch((e) => console.trace(e));
