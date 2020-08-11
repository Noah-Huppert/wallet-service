# Wallet Server
Wallet service HTTP API.

# Table Of Contents
- [Overview](#overview)
- [Development](#development)
- [Operations](#operations)

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
