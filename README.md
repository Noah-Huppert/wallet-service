# Wallet Service
Generic service to record user transactions. 

# Table Of Contents
- [Overview](#overview)
- [Version Compatibility](#version-compatibility)

# Overview
The purpose of this service is to track the amount of value associated with
a user. 

Only trusted clients can add and remove value. These clients are 
named **authorities.** The service uses ECDSA key pairs to authenticate API
calls from authorities.

A Python 3 SDK (pip package `wallet-sdk`) is provided.

See the [`server/`](./server) and [`py-sdk/`](./py-sdk) directories.

# Version Compatibility
There are several different versions used in this project. This section 
documents all of these.

- API version: Simple number to version of API's behavior. Never 
  backwards compatible. The API server will run under the 
  path `/api/v<api version>`.
- Python SDK: Semantic version of Python client. Unrelated to any other version.
- Client configuration file schema version: Version used to identify client 
  configuration file schemas.
  
These versions do not update in step with each other. However if the API version
increments one might have to get a newer version of the Python SDK.
