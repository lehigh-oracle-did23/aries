import asyncio
from aiohttp import ClientSession
from aries_cloudagent.messaging.base_handler import BaseHandler
from aries_cloudagent.messaging.request_context import RequestContext
from aries_cloudagent.messaging.decorators.routing import (
    register_message_handler,
    unregister_message_handler
)
from aries_cloudagent.protocols.issue_credential.v1_0.messages.credential_proposal import (
    CredentialProposal, OfferCredential, IssueCredential, CredentialAck, CredentialRequest, Credential
)


class HolderCoreHandler(BaseHandler):
    async def send_propose_credential(self, connection_id: str, credential_proposal: CredentialProposal):
        request_context = RequestContext()
        request_context.update_settings({"connection_id": connection_id})
        await request_context.outbound_message(credential_proposal)

    async def send_offer_credential(self, connection_id: str, offer_credential: OfferCredential):
        request_context = RequestContext()
        request_context.update_settings({"connection_id": connection_id})
        await request_context.outbound_message(offer_credential)

    async def send_issue_credential(self, connection_id: str, issue_credential: IssueCredential):
        request_context = RequestContext()
        request_context.update_settings({"connection_id": connection_id})
        await request_context.outbound_message(issue_credential)

    async def send_credential_ack(self, connection_id: str, credential_ack: CredentialAck):
        request_context = RequestContext()
        request_context.update_settings({"connection_id": connection_id})
        await request_context.outbound_message(credential_ack)

    async def receive_credential_request(self, request_context: RequestContext, credential_request: CredentialRequest):
        # Process credential request and issue credential
        credential = await self.process_credential_request(credential_request)
        await request_context.outbound_message(credential)

    async def receive_credential(self, request_context: RequestContext, credential: Credential):
        # Process credential and mark as received
        await self.process_credential(credential)

    async def main(self):
        # Register message handlers
        register_message_handler(CredentialRequest, self.receive_credential_request)
        register_message_handler(Credential, self.receive_credential)

        # Enter loop
        while True:
            await asyncio.sleep(60)

        # Unregister message handlers
        unregister_message_handler(CredentialRequest, self.receive_credential_request)
        unregister_message_handler(Credential, self.receive_credential)

    if __name__ == "__main__":
        loop = asyncio.get_event_loop()
        loop.run_until_complete(main())