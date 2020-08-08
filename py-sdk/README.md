# Wallet Python SDK
Python interface for a wallet service.

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
c = wallet_sdk.WalletClient(api_url='http://127.0.0.1:8000',
                            authority_id='5f2cdb324d0e5d2eabeef432',
                            private_key=b'-----BEGIN EC PRIVATE KEY-----\nMHcCAQEEIIfoKksdIYKZU0Np56zCDeH4jcDZOqmsgAu9cM/1RYTPoAoGCCqGSM49\nAwEHoUQDQgAEfpNaJROKO0436jAjBnXGi38/T/ZdYBcs7VL+oQ0sHwM/57bYbPej\nfDqda0rOufFi0ZiOK6vFNC9wSYoTJuckhg==\n-----END EC PRIVATE KEY-----')
				 
# Ensure wallet service is operation.
try:
    c.check_service_health()
except wallet_sdk.WalletAPIError as e:
    print("Failed to ensure wallet service is running", e)
	sys.exit(1)
			 
# Add 10 to user 0's wallet
entry = c.create_entry(user_id='0', amount=10, reason='testing')
print(entry) # {'authority_id': '5f2cdb324d0e5d2eabeef432', 'user_id': '0', 'created_on': 1596869670.124, 'amount': 10, 'reason': 'testing'}

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

Build:

```
make build
```

Publish to pip:

```
make publish PIP_REPO=pypi
```
