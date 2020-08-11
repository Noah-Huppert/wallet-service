[**PyPi**](https://pypi.org/project/wallet-sdk-Noah-Huppert)

# Wallet Python SDK
Python interface for a wallet service.

# Table Of Contents
- [Overview](#overview)
- [Request Credentials](#request-credentials)
- [Development](#development)
- [Packaging](#packaging)

# Overview
Wallet service Python 3 SDK.

First [follow the instructions to request wallet service credentials](#request-credentials).

Next install the [`wallet-sdk-Noah-Huppert`](https://pypi.org/project/wallet-sdk-Noah-Huppert/)
pip package and import the `wallet_sdk` module. Then use the `WalletClient` 
class to interact with the wallet service API.

```py
# Import wallet service Python SDK
import wallet_sdk

import sys

# Initialize the client
c = wallet_sdk.WalletClient.LoadFromConfig("./your-authority-client-config.json")
				 
# Ensure wallet service is operational
try:
    c.check_service_health()
except wallet_sdk.WalletAPIError as e:
    print("Failed to ensure wallet service is running:", e)
    sys.exit(1)
			 
# Add 10 to user 0's wallet
entry = c.create_entry(user_id='0', amount=10, reason='testing')
print(entry) # {'authority_id': '<your authority id>', 'user_id': '0', 'created_on': 1596869670.124, 'amount': 10, 'reason': 'testing'}

# Get the value of all wallets
wallets = c.get_wallets()
print(wallets) # [{'id': '0', 'total': 10}]
```

# Request Credentials
The wallet service Python SDK is a generic interface to any wallet service. 
There is no single one wallet service. Instead this repository provides the 
source code required for someone to host their own wallet service.

To obtain credentials you must contact the administrator of the wallet service 
you wish to interact. Ask them for an "authority client configuration file". If
they agree to give you access the administrator should provide you with a 
JSON file. **This file is secret, it authenticates you with the wallet service,
!!!and should never be made public!!!**.

Then simply provide the `WalletClient.LoadFromConfig()` function a path to
this file. 

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
This section documents how the `wallet-sdk-Noah-Huppert` pip package 
is generated.

First activate the development python virtual environment:

```
pipenv shell
```

Edit the version in [`wallet_sdk/VERSION`](./wallet_sdk/VERSION).

Publish to pip:

```
make publish PIP_REPO=pypi
```
