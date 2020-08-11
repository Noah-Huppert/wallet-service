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
npm start
```

# Operations
## Create Authority
First create an authority request JSON file with the following fields:

```json
{
    "server_host": "<your API server's host, include port and scheme, no trailing slahs>",
    "name": "<name of authority>",
    "owner": {
	   "discord_id": "<Discord ID of owner>",
	   "nickname": "<friendly name for owner>"
    }
}
```

Next run the `create-authority` server command with this file as an input. 
Additionally an output path to this new authority's client configuration file 
should be provided.

```
npm start create-authority <authority request file> <authority client config out>
```

This will save the authority in the database. A file with the name specified by 
the `<authority client config out>` argument should also be present. This will 
contain all the information an authority client SDK requires to connect 
and authenticate.
