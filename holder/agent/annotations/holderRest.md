# Holder REST API

We're using the AIOHTTP library to make a REST API call to ACA-Py to create a credential definition. We're using the BaseWallet class to get the wallet associated with the holder agent, and constructing the request body for the API call.

We then make the API call using the AIOHTTP session.post method, passing in the request body and headers. We parse the response body as JSON and return the credential_definition_id field.

