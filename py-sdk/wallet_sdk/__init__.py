#!python3
"""
Client SDK for the [Wallet Service project](https://github.com/Noah-Huppert/wallet-service).

The WalletClient provides a programmatic interface to the wallet service HTTP API.
"""
from typing import List, Dict, Optional

import requests
import voluptuous as v
import jwt

class WalletAPIError(Exception):
    """ Indicates an error occurred with a wallet service API call.
    """
    
    def __init__(self, url: str, method: str, error: str):
        """ Initializes.
        Arguments:
        - url: Request URL of API call.
        - method: HTTP method of API call.
        - error: Issue which occurred.
        """
        super().__init__("Failed to call {method} {url}: {error}".format(
            method=method, url=url, error=error))

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
                    error="Response did not have JSON body: actual body={}".format(
                        resp.text))

            try:
                resp_schema(data)
            except v.MultipleInvalid as e:
                raise WalletAPIError(
                    url=resp.request.url, method=resp.request.method,
                    error="Response JSON not in the correct format: {}".format(e))
                                     
        
class WalletClient:
    """ Wallet service API client.
    Static fields:
    - ENTRY_SCHEMA: Schema for entry model.
    - GET_WALLETS_RESP_SCHEMA: Schema for a get wallets endpoint response.
    - CREATE_ENTRY_RESP_SCHEMA: Schema for a create entry endpoint response.
    """

    ENTRY_SCHEMA = v.Schema({
        v.Required('authority_id'): str,
        v.Required('user_id'): str,
        v.Required('created_on'): float,
        v.Required('amount'): int,
        v.Required('reason'): str,
    })

    HEALTH_RESP_SCHEMA = v.Schema({
        v.Required('ok'): True,
    })

    GET_WALLETS_RESP_SCHEMA = v.Schema({
        v.Required('wallets'): [{
            v.Required('id'): str,
            v.Required('total'): int,
        }]
    })

    CREATE_ENTRY_RESP_SCHEMA = v.Schema({
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

    def check_service_health(self):
        """ Ensures that the wallet service is operating.
        Raises:
        - WalletAPIError: If the service is not operating correctly.
        """
        resp = requests.get(self.api_url + '/health')
        WalletAPIError.CheckResp(resp, WalletClient.HEALTH_RESP_SCHEMA)

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
        resp = requests.get(self.api_url + '/wallets', params={
            'user_ids': ",".join(user_ids),
            'authority_ids': ",".join(authority_ids),
        }, headers={
            'Authorization': self.auth_token,
        })
        
        WalletAPIError.CheckResp(resp, WalletClient.GET_WALLETS_RESP_SCHEMA)
        
        return resp.json()['wallets']

    def create_entry(self, user_id: str, amount: int,
                     reason: str) -> Dict[str, object]:
        """ Creates an entry in the wallet service.
        Argments:
        - user_id: ID of user involved in entry.
        - amount: Positive amount to add, or negative amount to remove.
        - reason: Purpose for adding or removing value to / from a user.

        Returns: Created entry

        Raises:
        - WalletAPIError
        """
        resp = requests.post(self.api_url + '/entry', json={
            'user_id': user_id,
            'amount': amount,
            'reason': reason,
        }, headers={
            'Authorization': self.auth_token,
        })

        WalletAPIError.CheckResp(resp, WalletClient.CREATE_ENTRY_RESP_SCHEMA)

        return resp.json()['entry']
        

if __name__ == '__main__':
    c = WalletClient(api_url='http://127.0.0.1:8000',
                     authority_id='5f2cdb324d0e5d2eabeef432',
                     private_key=b'-----BEGIN EC PRIVATE KEY-----\nMHcCAQEEIIfoKksdIYKZU0Np56zCDeH4jcDZOqmsgAu9cM/1RYTPoAoGCCqGSM49\nAwEHoUQDQgAEfpNaJROKO0436jAjBnXGi38/T/ZdYBcs7VL+oQ0sHwM/57bYbPej\nfDqda0rOufFi0ZiOK6vFNC9wSYoTJuckhg==\n-----END EC PRIVATE KEY-----')
    entry = c.create_entry(user_id='0', amount=10, reason='testing')
    print("entry={}".format(entry))

    wallets = c.get_wallets()
    print("wallets={}".format(wallets))
