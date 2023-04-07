import asyncio
from aiohttp import ClientSession
from aries_cloudcontroller import AriesAgentController

# Set up the Aries Agent Controller
agent_controller = AriesAgentController("wallet_agent", "http://localhost:3021", "password")

# Define a coroutine to create a DID and store it in the wallet
async def create_did():
    # Create a new DID
    did_info = await agent_controller.wallet_create_did()

    # Store the DID in the wallet
    await agent_controller.wallet_set_public_did(did_info["did"], did_info["verkey"])

    # Print the DID information
    print(f"DID created: {did_info['did']}, verkey: {did_info['verkey']}")

# Define a coroutine to get all credentials from the wallet
async def get_credentials():
    # Get all credentials from the wallet
    credentials = await agent_controller.wallet_get_all_credentials()

    # Print the credentials
    print(credentials)

# Start the event loop
asyncio.get_event_loop().run_until_complete(create_did())
asyncio.get_event_loop().run_until_complete(get_credentials())
