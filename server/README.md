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
First create an authority request JSON file with the following fields:

```json
{
    "api_base_url": "<your API server's host, include scheme, host, and port, no trailing slashes>",
    "name": "<name of authority>",
    "owner": {
	   "contact": "<owner contact details, any format>",
	   "nickname": "<friendly name for owner>"
    }
}
```

Next run the `create-authority` server command with this file as an input.

```
node index.js create-authority <authority request file>
```

This will save the authority in the database. The corresponding authority client
configuration JSON will be printed out. This will contain all the information an
authority client SDK requires to connect and authenticate.

## Release
1. Merge code into `master` branch.
2. Update [the compatibility matrix in the general `README.md`](../README.md#compatibility-matrix).
3. Tag the current `master` head as `server-v<version>`.
4. Create a GitHub release named `Server v<version>`.

# Circuit Breaker
The HTTP API's health endpoint returns information about the service's health. 

One field is the `ok` field. If this field is not `true` the HTTP API should be 
considered non-functional. This can be used to disable the server if needed.

The `APP_DISABLED` environment variable can be set to any value and it will be 
returned under the `ok` field instead of `true`.
