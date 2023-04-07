import asyncio
from aiohttp import ClientSession
from aries_cloudcontroller import AriesAgentController

# Set up the Aries Agent Controller
agent_controller = AriesAgentController("agent1", "http://localhost:3021", "password")

# Define a coroutine to handle incoming messages
async def message_handler():
    async for event in agent_controller.listen_for_events():
        if event["topic"] == "didexchange":
            state = event["payload"]["state"]
            their_did = event["payload"]["did"]
            my_connection_id = event["payload"]["connection_id"]
            if state == "invitation":
                # Auto-accept connection invitation
                await agent_controller.connections_accept_invitation(my_connection_id)
            elif state == "request":
                # Auto-respond to connection request
                await agent_controller.connections_send_request(my_connection_id)
            elif state == "response":
                # Auto-respond to connection response
                await agent_controller.connections_send_response(my_connection_id)
            elif state == "completed":
                # Add routing information for the connection
                await agent_controller.mediator_register(
                    my_connection_id, their_did, "http://example.com/mediator"
                )

# Start the message handler coroutine
asyncio.ensure_future(message_handler())

# Start the event loop
asyncio.get_event_loop().run_forever()
