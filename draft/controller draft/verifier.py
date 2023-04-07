import asyncio
from aiohttp import ClientSession
from aries_cloudcontroller import AriesAgentController

# Set up the Aries Agent Controller
agent_controller = AriesAgentController("verifier_agent", "http://localhost:3021", "password")

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

# Define a coroutine to verify a credential
async def verify_credential(credential_id):
    # Get the credential from the agent's wallet
    credential = await agent_controller.wallet_get_credential(credential_id)

    # Verify the credential
    verification_result = await agent_controller.verifier_verify_credential(credential_definition, credential)

    # Check the verification result
    if verification_result["verified"]:
        print("Credential verified!")
    else:
        print("Credential not verified.")

# Start the event loop
asyncio.get_event_loop().run_until_complete(verify_credential("12345"))
