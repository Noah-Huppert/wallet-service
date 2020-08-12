const fsPromises = require('fs').promises

const express = require(`express`)
const mongoose = require(`mongoose`)
const jwt = require(`jsonwebtoken`)
const bodyParser = require(`body-parser`)
const keypairs = require(`keypairs`)
const joi = require(`@hapi/joi`)

function die(msg, code) {
    console.error(msg)
    process.exit(code || 1)
}

/**
 * API version, for compatibility. Semantic version. Array elements in 
 * order: major minor patch.
 */
const API_VERSION = [ 0, 1, 0 ]

/**
 * HTTP API path prefix, computed from the API_VERSION.
 */
const API_PATH_PREFIX = `/api/v${API_VERSION[0]}`

/**
 * Server configuration.
 */
const config = {
    port: process.env.APP_PORT || 8000,
    dbURI: process.env.APP_DB_URI || `mongodb://127.0.0.1/dev_wallet_service`,
    disabled: process.env.APP_DISABLED,
}

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
    })
})

// Models
var authoritySchema = new mongoose.Schema({
    name: { type: String, required: true },
    owner: {
	   contact: { type: String, required: true },
	   nickname: { type: String, required: true },
    },
    public_key: { type: String, required: true },
})
var AuthorityModel = new mongoose.model(`Authority`, authoritySchema)

var entrySchema = new mongoose.Schema({
    authority_id: { type: String, required: true },
    user_id: { type: String, required: true },
    created_on: { type: Date, required: true },
    amount: { type: Number, required: true },
    reason: { type: String, required: true },
})
var EntryModel = mongoose.model(`Entry`, entrySchema)

// Express configuration
const app = express()
const apiRouter = express.Router()

app.use(bodyParser.json())
app.use(API_PATH_PREFIX, apiRouter)

/**
 * Does what __auth does, but ensures errors are never leaked to a caller.
 * Use this, not __auth().
 */
async function auth(req, res, next) {
    try {
	   await __auth(req, res, next)
    } catch (err) {
	   console.trace(`warning: failed to authenticate: ${err}`)
	   
	   return res.status(403).json({
		  error: `forbidden`,
	   });
    }
}

/**
 * Authorization helper. Expects a JWT in the Authorization header. This should
 * be signed by an authority's private key.
 */
async function __auth(req, res, next) {
    const authHeader = req.headers.authorization;

    if (authHeader) {
	   // First get claimed authority id from the token
	   // Here we are not verifying the token. We are simply seeing who it claims
	   // to be, so we can check with our database and get the public key of who
	   // they claim to be. After we get this the actual verified token is provided
	   // to the request context and can be trusted.
	   //
	   // This variable should not be used as any proof of authorization
	   const unverifiedTok = jwt.decode(authHeader)
	   var authority = await AuthorityModel.findById(unverifiedTok.sub)
	   
	   if (!authority) {
		  return res.status(403).json({
			 error: `forbidden`,
		  });
	   }

	   // Then verify JWT now that we have the actual claimed user's public key
	   await new Promise((resolve, reject) => {
		  jwt.verify(authHeader, authority.public_key, (err, token) => {
			 if (err) {
				return reject(err)
			 }

			 req.authority = authority
			 req.authToken = token
			 
			 return resolve()
		  })
	   })

	   next()
    } else {
	   console.error(`warning: no authorization header`)
	   
        res.status(401).json({
		  error: `authorization data required`,
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
	   let validateRes = schema.validate(req.body)

	   if (validateRes.error) {
		  res.status(400).json({
			 error: validateRes.error
		  })
	   } else {
		  next()
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
    const val = req.query[paramName]
    if (val === undefined || val === null || val.length === 0) {
	   return []
    } else {
	   return val.split(`,`)
    }
}

/**
 * External indication that service is operating.
 */
apiRouter.get(`/health`, (req, res) => {
    res.json({
	   ok: config.disabled || true,
	   version: `${API_VERSION[0]}.${API_VERSION[1]}.${API_VERSION[2]}`,
    })
})

/**
 * Get wallets, can be filtered.
 */
apiRouter.get(`/wallets`, auth, async (req, res) => {
    let userIds = getParamList(req, `user_ids`)
    let authorityIds = getParamList(req, `authority_ids`)

    let match = {}
    if (userIds.length > 0) {
	   match.user_id = { $in: userIds }
    }

    if (authorityIds.length > 0) {
	   match.authority_id = { $in: authorityIds }
    }

    let wallets = await EntryModel.aggregate([
	   { $match: match },
	   { $group: { _id: `$user_id`, total: { $sum: "$amount" } } },
    ])
    let respWallets = wallets.map((item) => {
	   return {
		  id: item._id,
		  total: item.total,
	   }
    })
    
    res.json({
	   wallets: respWallets
    })
})

const entryReqSchema = joi.object({
    user_id: joi.string().required(),
    amount: joi.number().integer().required(),
    reason: joi.string().required(),
})

/**
 * Create an entry.
 */
apiRouter.post(`/entry`, auth, validateBody(entryReqSchema), async (req, res) => {
    let entry = new EntryModel({
	   authority_id: req.authority.id,
	   user_id: req.body.user_id,
	   created_on: new Date(),
	   amount: req.body.amount,
	   reason: req.body.reason,
    })

    await entry.save()

    res.json({
	   entry: {
		  authority_id: entry.authority_id,
		  user_id: entry.user_id,
		  created_on: entry.created_on.getTime() / 1000,
		  amount: entry.amount,
		  reason: entry.reason
	   },
    })
})

/**
 * Main entrypoint. Runs commands.
 */
async function main() {
    try{
	   // Check command line options to determine what program should do
	   var cmd = `api`
	   if (process.argv.length >= 3) {
		  cmd = process.argv[2]
	   }

	   // Connect to the database if needed
	   if (cmd === `api` || cmd === `create-authority`) {
		  await mongoose.connect(config.dbURI, {
			 useNewUrlParser: true,
			 useUnifiedTopology: true,
		  })

		  const db = mongoose.connection

		  // Only log in API command, since output of create-authority should be
		  // authority client configuration JSON.
		  if (cmd == `api`) {
			 console.log(`Connected to MongoDB`)
			 console.log(`API version ${API_VERSION[0]}.${API_VERSION[1]}`+
					   `.${API_VERSION[2]}`)
		  }
	   }

	   // Run command
	   switch (cmd) {
	   case `api`:
		  await new Promise((resolve, reject) => {
			 app.listen(config.port, () => {
				console.log(`API server listening at `+
						  `:${config.port}${API_PATH_PREFIX}`)
			 })
		  })
		  break
	   case `create-authority`:
		  // Read authority request JSON file
		  if (process.argv.length < 4) {
			 die(`usage: index.js create-authority <authority request file>
error: incorrect number of arguments provided`)
		  }
		  arPath = process.argv[3]

		  const arDat = await fsPromises.readFile(arPath)
		  const arJSON = JSON.parse(arDat)
		  
		  const arValidate = AUTHORITY_REQUEST_FILE_SCHEMA.validate(
			 arJSON)
		  if (arValidate.error) {
			 die(`error: authority request file not in the correct `+
				`format: ${arValidate.error}`)
		  }
		  const ar = arValidate.value

		  // Generate key pair
		  const pair = await keypairs.generate({
			 kty: `ECDSA`,
			 namedCurve: `P-256`
		  })
		  
		  const pubPEM = await keypairs.export({
			 jwk: pair.public,
			 encoding: `pem`
		  })
		  const privPEM = await keypairs.export({
			 jwk: pair.private,
			 encoding: `pem`
		  })

		  // Save model
		  var authority = new AuthorityModel({
			 name: ar.name,
			 owner: ar.owner,
			 public_key: pubPEM,
		  })

		  await authority.save()

		  // Generate wallet client configuration file
		  console.log(JSON.stringify({
			 config_schema_version: `0.1.0`,
			 api_base_url: ar.api_base_url,
			 authority_id: authority.id,
			 private_key: privPEM,
		  }, null, 4))
		  break
	   case `help`:
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
`)
		  break
	   default:
		  die(`usage: index.js api|create-authority|help
error: invalid command "${cmd}"`)
		  break
	   }

	   process.exit()
    } catch (e) {
	   console.trace(e)
    }
}

main()
