from aiohttp import ClientSession
from aries_cloudagent import holder
from aries_cloudagent.config.injection_context import InjectionContext
from aries_cloudagent.connections.models.connection_record import ConnectionRecord
from aries_cloudagent.messaging.request_context import RequestContext
from aries_cloudagent.wallet.base import BaseWallet

async def issue_credential(connection_id: str, credential_definition_id: str):
    # First, we need to get the connection record for the connection ID
    connection_record = await ConnectionRecord.retrieve_by_id(context, connection_id)

    # Then, we can get the holder agent's wallet
    holder_wallet: BaseWallet = await context.inject(BaseWallet)

    # We also need to create a request context for the message
    request_context = RequestContext(
        message="",
        connection_record=connection_record,
        base_context=context
    )

    # Now we can create the credential offer message
    credential_offer = await holder.create_credential_offer(
        holder_wallet, credential_definition_id
    )

    # We need to send the message to the other agent using DIDComm
    async with context.session() as session:
        await session.send_didcomm(
            credential_offer,
            connection_record=connection_record,
            message_type="credential-offer",
            transport_type="http"
        )

    # Finally, we can return the credential offer message
    return credential_offer

if __name__ == "__main__":
    # Create the context
    context = InjectionContext(enforce_typing=False)

    # Create the session
    context.update_settings({"session": ClientSession()})

    # Run the function
    loop = asyncio.get_event_loop()
    loop.run_until_complete(issue_credential("connection-id", "credential-definition-id"))