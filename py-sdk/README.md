[**PyPi**](https://pypi.org/project/wallet-sdk-Noah-Huppert)

# Wallet Python SDK
Python interface for a wallet service.

# Table Of Contents
- [Overview](#overview)
- [Wallet Client](#wallet-client)
- [Request Credentials](#request-credentials)
- [Development](#development)
- [Operations](#operations)

# Overview
Wallet service Python 3 SDK.

First [follow the instructions to request wallet service credentials](#request-credentials).

Next install the [`wallet-sdk-Noah-Huppert`](https://pypi.org/project/wallet-sdk-Noah-Huppert/) pip package and import the `wallet_sdk` module. Then use the `WalletClient` class to interact with the wallet service API.

```py
# Import wallet service Python SDK
import wallet_sdk

# Initialize the client
c = wallet_sdk.WalletClient.LoadFromConfig("./your-authority-client-config.json")

# Add / remove value and items from user's wallets
c.create_entry(user_id='foobar123',
               amount=99,
               reason='returned a lot of cans')
try:
    c.create_entry(user_id='bobcats9',
                   amount=-5,
                   reason='bought a soda',
                   item={ 'name': 'Soda Can' })
except wallet_sdk.NotEnoughFundsError as e:
    print("Sorry user 'bobcats9' cannot afford to buy soda right now")
			   
# Get wallet values
all_wallets = c.get_wallets()
print(all_wallets) # [{ 'user_id': 'foobar123', 'total': 99},
                   #  { 'user_id': 'bobcats9', 'total': 595 }]
c.get_wallets(user_ids=['foobar123'],
              authority_id=['xxyyzz'])

# Get items
all_inventory = c.get_inventory()
print(all_inventory) # [{'entry_id': 'xxx',
                    #   'authority_id': 'xxx',
                    #   'user_id': 'xxx',
                    #   'item': { 'name': 'xxx', 'used': False, 'data': 'xxx' } },
                    #  { ... }]
c.get_inventory(entry_ids=['1234'],
                user_ids=['foobar123'],
                authority_ids=['yyzzii'])
				
# Mark items as used up
c.use_item(entry_id='998877')
```

## Wallet Client
The wallet service stores arbitrary transaction data. Certain trusted applications, named "authorities", can create entries to add or remove value from a user's wallet, and optionally add an item to a user's inventory.

A user's wallet value and items they own are aggregated and returned by the wallet service server.

This SDK allows you to act as an authority, and perform these actions.

### Create Entries
**Examples**  
```py
# Add 1000 to user 1 's wallet
c.create_entry(user_id='1',
               amount=1000,
               reason='payday')

# Remove 100 from user 1 's wallet and give them an item named Cool Shades
try:
    c.create_entry(user_id='1',
                   amount=-100,
                   reason='bought sunglasses',
                   item={
                     'name': 'Cool Shades',
                     'data': '{ "internal_id": "001122" }'
                   })
except wallet_sdk.NotEnoughFundsError as e:
    print("Sorry, user 1 does not have enough money to buy cool shades right now")
  
```

**Overview**  
As an authority you can create an entry to modify a user's wallet and inventory.

Create entries with the `create_entry` method. Specify entry parameters via the arguments:

- `user_id` (`str`)
- `amount` (`int`)
- `reason` (`str`)
- `item` (`object`, optional)
  - `name` (`str`)
  - `data` (anything)
  
See [Data Types - Entry](#entry) for descriptions of fields.

**Exceptions**  
- `NotEnoughFundsError`: Raised when the API determines that the user cannot afford to back a transaction
  
**Return Value**  
The `create_entry` method returns the newly created entry. See [Data Types - Entry](#entry).
  
## Query Wallets
**Examples**  
```py
# Get all wallets
all_wallets = c.get_wallets()
print(all_wallets) # [{'user_id': '1', 'total': 900},
                   #  { ... },
                   #  {'user_id': '60', 'total': 6000}]

# Find wallets of only users 0 and 2
wallets_0_and_2 = c.get_wallets(user_ids=['0', '2'])
print(wallets_0_and_2) # [{'user_id': '0', 'total': 10},
                       #  {'user_id': '2', 'total': 97000}]
					   
# Find wallets but only take into account entries we've made
my_transactions = c.get_wallets(authority_ids=['<your authority id>'])
print(my_transactions) # [{'user_id': '1', 'total': 900},
                       #  {'user_id': '34', 'total': 150000},
                       #  {'user_id': '41', 'total': 700}]
```

**Overview**  
Entries are totaled for each user and can be retrieved using the `get_wallets` method.

Queries can narrowed to only retrieve certain users by providing an array of their IDs via the `user_ids` argument.

Wallet totals can be limited to entries which only specific authorities created. This will omit entries not created by the specified authorities in the total value calculations. To do so provide an array of authorities IDs via the `authority_ids` argument.

These arguments can both be provided.

**Return Value**  
The `get_wallets` method returns an array of [Data Type - Wallet Total](#wallet-total) objects.

## Query Inventory
**Examples**  
```py
# Get all user inventory items
all_inventory = c.get_inventory()
print(all_inventory) # [{'entry_id': 'xxx',
                     #   'authority_id': 'xxx',
                     #   'user_id': 'xxx',
                     #   'item': { 'name': 'xxx', 'used': False, 'data': 'xxx' } },
                     #  { ... }]
					 
# Filter inventory by entry IDs
c.get_inventory(entry_ids=['abc00', 'xyz99'])

# Filter inventory by user IDs
c.get_inventory(user_ids=['0', '30'])

# Filter inventory by authority IDs
c.get_inventory(authority_ids=['xxx', 'zzz'])

# Find inventory which has been used
c.get_inventory(used=True)

# Do not filter by used
c.get_inventory(used=None)
```

**Overview**  
User inventory items can be retrieved using the `get_inventory` method.

The results can be filtered by entry ID, user ID, and authority ID via the `entry_ids`, `user_ids`, `authority_ids` arguments respectively.

Results can also be filtered based off of if they are marked as used by providing the `used` argument. By default only unused items are returned. Set `True` to find used items, and to `None` in order to disable filtering based on used status.

These arguments may be provided together.

**Return Value**  
The `get_inventory` method returns an array of [Data Type - Entry Item](#entry-item) objects.

## Mark Item As Used
**Example**  
```py
# Mark item from entry xyz012 as used
c.use_item(entry_id='xyz012')
```

**Overview**  
To mark an item as used call the `use_item` method. 

The ID of the entry in which the item was created is used to specify the item.

**Return Value**  
The `use_item` method returns the [Data Type - Entry](#entry) which was modified.
  
## Ensure wallet service is operational
**Example**  
```py
try:
    c.check_service_health()
except wallet_sdk.WalletAPIError as e:
    print("Failed to ensure wallet service is running:", e)
    sys.exit(1)
```

**Overview**  
If you would like to create a circuit breaker in your code and determine if the wallet service is running use the `check_service_health` method.

**Return Value**  
The `check_service_health` method returns a `bool` indicating if the wallet service server can be used. A `wallet_sdk.WalletAPIError` exception may be raised if the SDK fails to communicate with the wallet service server.

## Data Types
### Entry
A transaction entry.

- `entry_id` (`str`): Unique ID of entry
- `authority_id` (`str`): ID of authority which created entry
- `user_id` (`str`): ID of user for which entry pertains
- `created_on` (`int`): Unix timestamp of when entry was created
- `amount` (`int`): Amount added (positive) or removed (negative) from the user's wallet
- `reason` (`str`): User friendly description of why this transaction occurred
- `item` (`object`, optional): Item given to user in this transaction
  - `name` (`str`): User friendly name of item
  - `used` (`bool`): If item has been used up
  - `data` (`object`, optional): Any arbitrary data which the creating authority would like to store for this item
  
### Wallet Total
Describes the current value of a wallet.

- `user_id` (`str`): ID of user who owns wallet
- `total` (`int`): Total amount of money in user's wallet

### Entry Item
An item a user owns from a transaction.

- `entry_id` (`str`): ID of the entry in which this item was given to the user, this is used as the unique ID for this item
- `authority_id` (`str`): ID of authority who gave the user the item
- `user_id` (`str`): ID of the user who owns the item
- `item` (`object`): Owned item
  - `name` (`str`): User friendly name of item
  - `used` (`bool`): If the item has been used up
  - `data` (`object`, optional): Arbitrary data which the creating authority specified

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
