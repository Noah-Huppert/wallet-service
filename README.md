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

A Python 3 SDK (pip package `wallet-sdk-Noah-Huppert`) is provided.

See the [`server/`](./server) and [`py-sdk/`](./py-sdk) directories.

# Version Compatibility
There are several different versions used in this project:

- **API version**: Simple integer to version API's behavior. Never 
  backwards compatible. The API server will run under the 
  path `/api/v<api version>`.
- **Python SDK**: PyPi [semantic version](https://semver.org/) of the Python 
  client package.
- **Client configuration file schema version**: Version used to identify the 
  schema used in client configuration files.
  
All versions increment separately and for different reasons:

- **API version**: When breaking changes are made to the behavior of the 
  HTTP API. This will cause the server to host under a different 
  `/api/v<api version>` path.
- **Python SDK**: Whenever any update to the Python SDK code is made. Follows
  the [semantic versioning scheme](https://semver.org/).
- **Client configuration file schema version**: When the structure of client
  configuration files changes. This will require that authorities re-deploy 
  their own applications with configuration files.

Versions do not have to match other version (ex., The API & Python SDK are not 
released in lock step). However sometimes one may have to update a component to 
support a new version of another component (ex., Update The Python SDK to 
support a new API version).
