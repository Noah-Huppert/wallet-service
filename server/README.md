# Wallet Server
Wallet service HTTP API.

# Table Of Contents
- [Overview](#overview)
- [Development](#development)
- [Operations](#operations)
- [Circuit Breaker](#circuit-breaker)

# Overview
Nodejs server which provides an HTTP API and stores data in MongoDB.

# Development
Install dependencies:

```
npm install
```

Start the API server:

```
node index.js
```

# Operations
## Create Authority
1. First create an authority request JSON file with the following fields:
	```json
	{
		"api_base_url": "<your API server's base URL, include scheme, host, port, and any non-version specific path prefixes, no trailing slashes>",
		"name": "<name of authority>",
		"owner": {
		   "contact": "<owner contact details, any format>",
		   "nickname": "<friendly name for owner>"
		}
	}
	```
2. Ensure the `APP_DB_URI` environment variable is correct.
3. Run the `create-authority` server command with this file as an input.
   ```
   node index.js create-authority <authority request file>
   ```

   This will save the authority in the database. The corresponding authority
   client configuration JSON will be printed out. This will contain all the
   information an authority client SDK requires to connect and authenticate.
4. Send the client configuration file to the authority developer.

## Release
1. Bump version
   1. Pick new [semantic version](https://semver.org/). Change major if not 
	  backwards compatible changes, minor for new backwards compatible features,
	  and patch for new backwards compatible bug fixes.
   2. Update the `API_VERSION` variable in [`index.js`](./index.js).
   3. If the major component of the version was changed determine how multiple 
	  major versions will run at once, or create a
	  [circuit breaker](#circuit-breaker) health response for the old 
	  major version.
   4. Update [the compatibility matrix in the general `README.md`](../README.md#version-compatibility-matrix).
2. Merge code into `master` branch.
3. Tag the current `master` head as `server-v<version>`.
4. Create a GitHub release named `Server v<version>`.
   - Include a short one or two sentence summary of the changes
   - Include an h1 "Change log" section: list detailed changes

# Circuit Breaker
The HTTP API's health endpoint returns information about the service's health. 

One field is the `ok` field. If this field is not `true` the HTTP API should be 
considered non-functional. This can be used to disable the server if needed.

The `APP_DISABLED` environment variable can be set to any value and it will be 
returned under the `ok` field instead of `true`.
