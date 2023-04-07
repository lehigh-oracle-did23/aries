import asyncio
from aiohttp import ClientSession
from aries_cloudcontroller import AriesAgentController

## Setup DIDComm messaging with ACA-Py:

# Set up the Aries Agent Controller
agent_controller = AriesAgentController("agent1", "http://localhost:3021", "password")

# Define a coroutine to handle incoming messages
async def message_handler():
    async for event in agent_controller.listen_for_events():
        if event["topic"] == "basicmessages":
            message = event["payload"]["content"]
            print(f"Received message: {message}")
            # Handle the incoming message

# Define a coroutine to send a message to a DID
async def send_message(did, message):
    await agent_controller.connections_send_message(did, message)

# Start the message handler coroutine
asyncio.ensure_future(message_handler())

# Send a message to a DID
await send_message("did:example:123", "Hello, world!")
