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
## Versions Overview
There are several different versions used in this project:

- **API version**: API [semantic version](https://semver.org/). The API
  server will run under the path `/api/v<major>`.
- **Python SDK**: PyPi [semantic version](https://semver.org/) of the Python 
  client package.
- **Client configuration file schema version**: 
  [semantic version](https://semver.org/) which identifies the schema used in 
  client configuration files.
  
All versions increment separately and for different reasons:

- **API version**: When any update to the source code of the HTTP API is made. 
  Follows the [semantic versioning scheme](https://semver.org/). Changes to the
  major version component will cause the server to host under a different
  `/api/v<major>` path.
- **Python SDK**: Whenever any update to the Python SDK code is made. Follows
  the [semantic versioning scheme](https://semver.org/).
- **Client configuration file schema version**: When the structure of client
  configuration files changes. Follows
  the [semantic versioning scheme](https://semver.org/). Major version changes
  will require that authorities re-deploy their own applications with
  updated configuration files.

Versions do not have to match other version (ex., The API & Python SDK are not 
released in lock step). However sometimes one may have to update a component to 
support a new version of another component (ex., Update the Python SDK to 
support a new API version).

## Version Comparability Matrix
The API version and Python SDK version have a compatibility relationship:

**By API version**:

| API version | Compatible Python SDK versions |
|-------------|--------------------------------|
| 0.1.0       | 0.1.0, 0.1.1                   |


**By Python SDK version**:

| Python SDK version | Compatible API versions |
|--------------------|-------------------------|
| 0.1.0, 0.1.1       | 0.1.0                   |


The Python SDK version and client configuration file schema version have a
compatibility relationship:

**By Python SDK version**:

| Python SDK version | Compatible client configuration file schema versions |
|--------------------|------------------------------------------------------|
| 0.1.0, 0.1.1       | 0.1.0                                                |

**By client configuration file schema version**:

| Client configuration file schema version | Compatible Python SDK versions |
|------------------------------------------|--------------------------------|
| 0.1.0                                    | 0.1.0, 0.1.1                   |

## Ensuring Compatibility
All components of the wallet service platform automatically check each other's
versions to ensure compatibility.

The HTTP API's health endpoint returns the API version. Client configuration 
files have a schema version field. The Python SDK knows its own version and 
knows which versions of the API and client configuration schema are compatible.
