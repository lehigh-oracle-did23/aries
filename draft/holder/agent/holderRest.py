import json
import aiohttp
from aiohttp import ClientSession
from aries_cloudagent.config.injection_context import InjectionContext
from aries_cloudagent.wallet.base import BaseWallet

async def create_credential_definition(wallet: BaseWallet, tag: str, schema_id: str):
    # First, we need to construct the request body for the REST API call
    request_body = {
        "tag": tag,
        "schema_id": schema_id,
        "support_revocation": False
    }

    # Then, we can use the AIOHTTP library to make the API call to ACA-Py
    async with aiohttp.ClientSession() as session:
        async with session.post(
            "http://localhost:8024/credential-definitions",
            headers={"Content-Type": "application/json"},
            json=request_body,
        ) as resp:
            response_body = await resp.json()

    # Finally, we can return the credential definition ID from the response body
    return response_body["credential_definition_id"]

if __name__ == "__main__":
    # Create the context
    context = InjectionContext(enforce_typing=False)

    # Create the session
    context.update_settings({"session": ClientSession()})

    # Run the function
    loop = asyncio.get_event_loop()
    loop.run_until_complete(create_credential_definition("wallet", "tag", "schema-id"))
