#!python3
"""
Client SDK for the [Wallet Service project](https://github.com/Noah-Huppert/wallet-service).

The WalletClient provides a programmatic interface to the wallet service HTTP API.
"""
from typing import List, Dict, Tuple, Optional, Callable, TypedDict
import json
import os

import requests
import voluptuous as v
import jwt

# Version of the API with which the client knows how to communicate. List elements
# in the order: major minor
COMPATIBLE_API_VERSION = ( 1, 1 )

# Version of client configuration file which the client knows how to parse. List of
# elements in the order: major minor
COMPATIBLE_CONFIG_SCHEMA_VERSION = ( 0, 1 )

class EntryItemT(TypedDict):
    """ Python type hint for entry items.
    """
    name: str
    used: bool
    data: Optional[object]

def SemVer(compatible_at: Tuple[int, int]=None) -> Callable[[str], Tuple[int, int, int]]:
    """ Validates that a string is formatted as semantic version: major.minor.patch.
    Additionally ensures that this semantic version is compatible with the provided
    compatible_at.

    Arguments:
    - compatible_at: Semantic version which program is compatible with, the 
      validator checks the parsed semantic version for compatibility if this is 
      not None.

    Returns: Validation function.
    """
    def validate(value: str) -> Tuple[int, int, int]:
        """ Validates based on the requirements defined in SemVer().
        Arugments:
        - value: To validate.

        Returns: Value if valid.

        Raises:
        - v.Invalid: If invalid.
        """
        parts = value.split(".")
        if len(parts) != 3:
            raise v.Invalid("should be 3 integers seperated by dots in the "+
                             "format: major.minor.patch")

        try:
            major = int(parts[0])
        except ValueError as e:
            raise v.Invalid(f"failed to parse major component as an integer: {e}")

        try:
            minor = int(parts[1])
        except ValueError as e:
            raise v.Invalid(f"failed to parse minor component as an integer: {e}")

        try:
            patch = int(parts[2])
        except ValueError as e:
            raise v.Invalid(f"failed to parse patch component as an integer: {e}")

        if compatible_at is not None:
            if major != compatible_at[0] or minor < compatible_at[1]:
                raise v.Invalid(f"semantic versions are not compatible, was: "+
                                 f"major={major} minor={minor} patch={patch}, "+
                                 f"compatible version(s): "+
                                 f"major={compatible_at[0]} "+
                                 f"minor>={compatible_at[1]} patch=*")

        return (major, minor, patch)

    return validate

def dotget(root, path: str, default=None) -> object:
    """ Access an item in the root field via a dot path.
    Arguments:
    - root: Object to access via dot path.
    - path: Every dot path should be relative to the state property.
    - default: Default value if path doesn't exist.

    Returns: Value. If path does not exist default is returned.
    """
    parts = path.split('.')

    for part in parts:
        try:
            if type(root) is list:
                root = root[int(part)]
            else:
                root = root[part]
        except KeyError:
            return default

    return root

class WalletAPIError(Exception):
    """ Indicates an error occurred with a wallet service API call.
    """
    
    def __init__(self, url: str, method: str, status_code: int, error: str):
        """ Initializes.
        Arguments:
        - url: Request URL of API call.
        - method: HTTP method of API call.
        - status_code: HTTP status code of API response. Is -1 if not response from the server was received.
        - error: Issue which occurred.
        """
        super().__init__("Failed to call {method} {url}: {status_code} {error}".format(
            method=method, url=url, status_code=status_code, error=error))
        self.url = url
        self.method = method
        self.status_code = status_code
        self.error = error

    @staticmethod
    def CheckResp(resp: requests.Response, resp_schema: v.Schema=None):
        """ Determine if a response was successful, if not raise a WalletAPIError.
        Arguments:
        - resp: Response to check.
        - resp_schema: If provided ensures that the response has JSON data which
          matches this schema.

        Raises:
        - WalletAPIError: If the response indicates failure.
        """
        # Check if error response
        if not resp.ok:
            # Check if any JSON response
            resp_error_val = "Unknown"
            try:
                data = resp.json()

                if 'error' in data:
                    resp_error_val = data['error']
            except ValueError:
                pass

            raise WalletAPIError(
                url=resp.request.url, method=resp.request.method,
                status_code=resp.status_code,
                error=("Error response ({status_code} {status_msg}): {error_msg} "+
                "{raw_body}").format(
                    status_code=resp.status_code, status_msg=resp.reason,
                    error_msg=resp_error_val, raw_body=resp.text))

        # Validate schema
        if resp_schema is not None:
            data = None
            try:
                data = resp.json()
            except ValueError:
                raise WalletAPIError(
                    url=resp.request.url, method=resp.request.method,
                    status_code=resp.status_code,
                    error="Response did not have JSON body: actual body={}".format(
                        resp.text))

            try:
                resp_schema(data)
            except v.MultipleInvalid as e:
                field_path = ".".join(map(str, e.path))
                raise WalletAPIError(
                    url=resp.request.url, method=resp.request.method,
                    status_code=resp.status_code,
                    error="Response JSON not in the correct format: "+
                    "\"{field_path}\" was \"{actual}\" but: {error}".format(
                        field_path=field_path,
                        actual=dotget(data, field_path),
                        error=e.msg))

class NotEnoughFundsError(Exception):
    """ Indicates a user did not have enough funds to bac a potential transaction.
    """

    def __init__(self):
        """ Initializes.
        """
        super().__init__("user does not have funds to back the transaction")

class WalletConfigError(Exception):
    """ Indicates there was an error while fetching or parsing a wallet service 
    configuration file.
    """

    def __init__(self, msg: str):
        """ Initializes.
        Arguments:
        - msg: Description of issue.
        """
        super().__init__(msg)
        
class WalletClient:
    """ Wallet service API client.
    Static fields:
    - CONFIG_FILE_SCHEMA: Schema for wallet service config file.
    - ENTRY_SCHEMA: Schema for entry model.
    - GET_WALLETS_RESP_SCHEMA: Schema for a get wallets endpoint response.
    - CREATE_ENTRY_RESP_SCHEMA: Schema for a create entry endpoint response.
    """

    CONFIG_FILE_SCHEMA = v.Schema({
        v.Required('config_schema_version'): SemVer(
            compatible_at=COMPATIBLE_CONFIG_SCHEMA_VERSION),
        v.Required('api_base_url'): str,
        v.Required('authority_id'): str,
        v.Required('private_key'): str,
    })

    ENTRY_ITEM_SCHEMA = v.Schema({
        v.Required('name'): str,
        v.Required('used'): bool,
        v.Optional('data'): object,
    })

    ENTRY_SCHEMA = v.Schema({
        v.Required('entry_id'): str,
        v.Required('authority_id'): str,
        v.Required('user_id'): str,
        v.Required('created_on'): float,
        v.Required('amount'): int,
        v.Required('reason'): str,
        v.Optional('item'): ENTRY_ITEM_SCHEMA,
    })

    HEALTH_RESP_SCHEMA = v.Schema({
        v.Required('version'): SemVer(
            compatible_at=COMPATIBLE_API_VERSION),
        v.Required('ok'): True,
    })

    GET_WALLETS_RESP_SCHEMA = v.Schema({
        v.Required('wallets'): [{
            v.Required('user_id'): str,
            v.Required('total'): int,
        }]
    })

    CREATE_ENTRY_RESP_SCHEMA = v.Schema({
        v.Required('entry'): ENTRY_SCHEMA,
    })

    GET_INVENTORY_RESP_SCHEMA = v.Schema({
        v.Required('inventory'): [{
            v.Required('entry_id'): str,
            v.Required('authority_id'): str,
            v.Required('user_id'): str,
            v.Required('item'): ENTRY_ITEM_SCHEMA,
        }]
    })

    MARK_USED_RESP_SCHEMA = v.Schema({
        v.Required('entry'): ENTRY_SCHEMA,
    })

    def __init__(self, api_url: str, authority_id: str, private_key: str):
        """ Initializes the API client.
        Arguments:
        - api_url: HTTP URL of wallet service API.
        - authority_id: Unique identifier of authority to act as.
        - private_key: PEM encoded ECDSA P-256 private key used to authenticate as
                       an authority with the wallet service API.
        """
        self.api_url = api_url
        self.authority_id = authority_id
        self.private_key = private_key
        
        self.auth_token = jwt.encode({
            'sub': authority_id,
        }, self.private_key, algorithm='ES256')

        with open(os.path.join(os.path.dirname(os.path.realpath(__file__)),
                               "./VERSION"), "r") as f:
            self.__version__ = f.read().replace("\n", "")

        # True if the wallet service's health has been checked and is good,
        # False if checked and bad, and
        # None if not checked.
        #
        # The __do_request__() method automatically checks health if None and
        # raises a WalletAPIError if False.
        self.service_health_good = None

    def LoadFromConfig(config_file_path: str) -> 'WalletClient':
        """ Loads Wallet API client configuration from a config file.
        Arguments:
        - config_file_path: Path to wallet service configuration file.
        
        Returns: WalletClient.

        Raises:
        - WalletConfigError: If an error occurrs loading the configuration file.
        """
        # Load
        dat = None
        try:
            with open(config_file_path, "r") as f:
                dat = json.load(f)
        except IOError as e:
            raise WalletConfigError(f"Error reading configuration file " +
                                    f"\"{config_file_path}\": {e}")
        except json.JSONDecodeError as e:
            raise WalletConfigError(f"Error decoding configuration file as JSON " +
                                    f"\"{config_file_path}\": {e}")

        # Validate
        config = None
        try:
            config = WalletClient.CONFIG_FILE_SCHEMA(dat)
        except v.MultipleInvalid as e:
            raise WalletConfigError(f"Error validating configuration file "+
                                    f"\"{config_file_path}\": {e}")

        # Initialize
        return WalletClient(
            api_url="{}/api/v{}".format(config['api_base_url'], COMPATIBLE_API_VERSION[0]),
            authority_id=config['authority_id'],
            private_key=config['private_key'])

    def __do_request__(self, method: str, path: str, resp_schema: v.Schema=None,
                       __is_health_check_req__=False,
                       **kwargs) -> requests.Response:
        """ Performs an HTTP request to the API. Handles error checking, response
        parsing and validation, user agent, and authorization.
        Arguments:
        - method: HTTP method, all caps.
        - path: Path to request, appended to self.api_url.
        - resp_schema: Schema which if not None will be used to validate 
          the response.
        - __is_health_check_req__: If true the method won't automatically check
          the wallet service's health if self.service_health_good is None. This
          prevents infinite loops when __do_request__ is used internally to perform
          check_service_health().
        - kwargs: Any additional args which are accepted by requests.request (https://requests.readthedocs.io/en/master/api/#requests.request)

        Returns: The response.
        """
        # Check service health if we haven't done so already
        if self.service_health_good != True and not __is_health_check_req__:
            try:
                self.check_service_health()
            except WalletAPIError as e:
                 raise WalletAPIError(
                     self.api_url + path, method, e.status_code, "The wallet service's health "+
                     "had not been checked yet, upon checking the service's "+
                     "health was found to be bad: {}".format(str(e)))
                                      
        # Add authorization header
        if 'headers' not in kwargs:
            kwargs['headers'] = {}

        if 'Authorization' not in kwargs['headers']:
            kwargs['headers']['Authorization'] = self.auth_token

        if 'User-Agent' not in kwargs['headers']:
            kwargs['headers']['User-Agent'] = "wallet-service-py-sdk {}".format(
                self.__version__)
        
        try:
            # Make request
            resp = requests.request(url=self.api_url + path,
                                    method=method,
                                    **kwargs)

            # Check response
            WalletAPIError.CheckResp(resp, resp_schema)

            return resp
        except WalletAPIError as e:
            # Intercept WalletAPIError to find application specific errors
            if e.status_code == 402:
                # 402 = payment required
                raise NotEnoughFundsError()
            else:
                raise e
        except requests.RequestException as e:
            raise WalletAPIError(self.api_url + path, method, -1, str(e))

    def check_service_health(self):
        """ Ensures that the wallet service is operating.
        Stores the result in self.wallet_service_good.
        Returns: True if service halth is good. False is never returned, instead
                 the WalletAPIError exception is used to indicate failure.

        Raises:
        - WalletAPIError: If the service is not operating correctly.
        """
        try:
            self.__do_request__('GET', '/health', WalletClient.HEALTH_RESP_SCHEMA,
                                __is_health_check_req__=True)
        except WalletAPIError as e:
            self.wallet_service_good = False
            raise e

        self.wallet_service_good = True
        return True

    def get_wallets(self, user_ids: List[str]=[],
                    authority_ids: List[str]=[]) -> List[Dict[str, object]]:
        """ Get wallets. Filterable by user and authority.
        Arguments:
        - user_ids: If provided only returns these user's wallets.
        - authority_ids: If provided only returns the value of wallets' transactions
        with authorities.

        Returns: Wallets.

        Raises:
        - WalletAPIError
        """
        resp = self.__do_request__(
            'GET', '/wallet', resp_schema=WalletClient.GET_WALLETS_RESP_SCHEMA,
            params={
                'user_ids': ",".join(user_ids),
                'authority_ids': ",".join(authority_ids),
            })
        
        return resp.json()['wallets']

    def create_entry(self, user_id: str, amount: int, reason: str, item: Optional[EntryItemT]=None) -> Dict[str, object]:
        """ Creates an entry in the wallet service.
        Argments:
        - user_id: ID of user involved in entry.
        - amount: Positive amount to add, or negative amount to remove.
        - reason: Purpose for adding or removing value to / from a user.
        - item: Item which is being exchanged in this entry, optional.

        Returns: Created entry

        Raises:
        - WalletAPIError
        - NotEnoughFundsError: If the user does not have enough funds to back the new entry.
        """
        resp = self.__do_request__(
            'POST', '/entry', resp_schema=WalletClient.CREATE_ENTRY_RESP_SCHEMA,
            json={
                'user_id': user_id,
                'amount': amount,
                'reason': reason,
                'item': item,
            })

        return resp.json()['entry']

    def get_inventory(self, entry_ids: List[str]=[], user_ids: List[str]=[], authority_ids: List[str]=[], used: Optional[bool]=False) -> List[Dict[str, object]]:
        """ Get user inventories. Filterable by user, authority, and item URI.
        Arguments:
        - entry_ids: Filter inventories to specified entries, optional.
        - user_ids: Filter inventories to specified users, optional.
        - authority_ids: Filter inventories to items from specified authorities, optional.
        - used: Filter inventories to used or unused items, optional. Defaults to un-used items.

        Returns: Wallets.

        Raises:
        - WalletAPIError
        """
        usedStr = None
        if used is not None:
            if used:
                usedStr = "true"
            else:
                usedStr = "false"
                
        resp = self.__do_request__(
            'GET', '/entry/inventory', resp_schema=WalletClient.GET_INVENTORY_RESP_SCHEMA,
            params={
                'entry_ids': ",".join(entry_ids),
                'user_ids': ",".join(user_ids),
                'authority_ids': ",".join(authority_ids),
                'used': usedStr,
            })

        return resp.json()['inventory']

    def use_item(self, entry_id: str) -> Dict[str, object]:
        """ Mark an item as used.
        Argments:
        - entry_id: ID of entry in which item was noted.

        Returns: Entry with modified item.

        Raises:
        - WalletAPIError
        """
        resp = self.__do_request__(
            'POST', f'/entry/{entry_id}/inventory/use', resp_schema=WalletClient.MARK_USED_RESP_SCHEMA)

        return resp.json()['entry']
