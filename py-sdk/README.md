# Wallet Python SDK
Python interface for a wallet service.x

# Table Of Contents
- [Overview](#overview)
- [Development](#development)
- [Packaging](#packaging)

# Overview
Wallet service Python 3 SDK.

Install the `wallet-sdk` pip package. Then use the `WalletClient` class.

```py
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

Edit the version in [`wallet_sdk/VERSION`](./wallet_sdk/VERSION).

Publish to pip:

```
make publish PIP_REPO=pypi
```
