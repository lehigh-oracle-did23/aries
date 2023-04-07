import asyncio
import aiohttp

class AriesTransport:
    def __init__(self, endpoint):
        self.endpoint = endpoint
        self.session = aiohttp.ClientSession()

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        await self.session.close()

    async def send_message(self, message):
        async with self.session.post(self.endpoint, json=message) as resp:
            return await resp.json()

    async def receive_message(self):
        async with self.session.get(self.endpoint) as resp:
            return await resp.json()
