[**PyPi**](https://pypi.org/project/wallet-sdk-Noah-Huppert)

# Wallet Python SDK
Python interface for a wallet service.

# Table Of Contents
- [Overview](#overview)
- [Request Credentials](#request-credentials)
- [Development](#development)
- [Operations](#operations)

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

# Add a few more entries
c.create_entry(user_id='1', amount=200000, reason='family wealth')
c.create_entry(user_id='2', amount=-3000, reason='vegas')
c.create_entry(user_id='1', amount=-50000, reason='bought a tesla')
c.create_entry(user_id='2', amount=100000, reason='won the lottery')

# Find wallets of only users 0 and 2
wallets_0_and_2 = c.get_wallets(user_ids=['0', '2'])
print(wallets_0_and_2) # [{'id': '0', 'total': 10},
                       #  {'id': '2', 'total': 97000}]

# Find wallets but only take into account entries we've made
my_transactions = c.get_wallets(authority_ids=['<your authority id>'])
print(my_transactions) # [{'id': '0', 'total': 10},
                       #  {'id': '1', 'total': 150000},
                       #  {'id': '2', 'total': 97000}]
```

# Request Credentials
The wallet service Python SDK is a generic interface to any wallet service. 
There is no single wallet service. Instead this repository provides the 
source code required for someone to host their own wallet service.

To obtain credentials you must contact the administrator of the wallet service 
with which you wish to interact. Ask them for an "authority client configuration
file". If they agree to give you access the administrator should provide you
with a JSON file. **This file is secret, it authenticates you with the wallet 
service, !!!and should never be made public!!!**.

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

# Operations
## Release PyPi Package
This section documents how the `wallet-sdk-Noah-Huppert` pip package 
is generated.

1. First activate the development python virtual environment:
   ```
   pipenv shell
   ```
2. Update the version
   1. Pick new [semantic version](https://semver.org/). Change major if not 
	  backwards compatible changes, minor for new backwards compatible features,
	  and patch for new backwards compatible bug fixes.
   2. Edit the version in [`wallet_sdk/VERSION`](./wallet_sdk/VERSION).
   3. Ensure the API compatible version `COMPATIBLE_API_VERSION` is correct.
   4. Update [the compatibility matrix in the general `README.md`](../README.md#version-compatibility-matrix).
3. Merge code into the `master` branch.
4. Publish to test pip
   ```
   make clean
   make publish
   ```
   Inspect package page to ensure everything looks good.
5. Tag the current `master` as `py-sdk-v<version>`.
6. Create a new GitHub release named `Python SDK v<version>`.
   - Include a short one or two sentence summary of the changes
   - Include an h1 "Change log" section: list detailed changes
5. Publish to pip:
   ```
   make clean
   make publish PIP_REPO=pypi
   ```
