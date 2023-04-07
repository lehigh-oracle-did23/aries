import asyncio
from aiohttp import ClientSession
from aries_cloudcontroller import AriesAgentController

# Set up the Aries Agent Controller
agent_controller = AriesAgentController("issuer_agent", "http://localhost:3021", "password")

# Define the credential schema and definition
credential_schema = {
    "name": "Example Credential",
    "version": "1.0",
    "attributes": ["name", "age"]
}

credential_definition = {
    "schema": credential_schema,
    "tag": "default"
}

# Define a coroutine to create and issue a credential
async def issue_credential(their_did):
    # Create a credential offer
    offer = await agent_controller.issuer_create_credential_offer(credential_definition)

    # Create a credential request
    request = await agent_controller.issuer_create_credential_request(offer["credential_offer"], their_did)

    # Create the credential
    credential_values = {"name": "Alice", "age": 25}
    credential = await agent_controller.issuer_create_credential(
        offer["credential_offer"], request["credential_request"], credential_values
    )

    # Send the credential to the other party
    await agent_controller.issuer_send_credential(credential, request["credential_request"], their_did)

# Start the event loop
asyncio.get_event_loop().run_until_complete(issue_credential("did:example:123"))
