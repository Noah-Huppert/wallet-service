# Wallet Python SDK
Python interface for a wallet service.

# Table Of Contents
- [Overview](#overview)
- [Development](#development)
- [Packaging](#packaging)

# Overview
Wallet service Python 3 SDK.

Install the `wallet-sdk` pip package. 

# Development
A virtual environment is provided for development purposes.

Install [Pipenv](https://pipenv.pypa.io/en/latest/), the official Python virtual
environment manager.

Then install dependencies:

```
pipenv install
```

Finally activate the environment:

```
pipenv shell
```

# Package
This section documents how the `wallet-sdk` pip package is generated.

First activate the development python virtual environment:

```
pipenv shell
```

Build:

```
make build
```

Publish to pip:

```
make publish PIP_REPO=pypi
```
