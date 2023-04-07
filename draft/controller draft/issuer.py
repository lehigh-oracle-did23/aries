from aiohttp import ClientSession
from aries_cloudcontroller import AriesAgentController

## Issue a verifiable credential with ACA-Py:

# Set up the Aries Agent Controller
agent_controller = AriesAgentController("agent1", "http://localhost:3021", "password")

# Create a new schema
schema_id = await agent_controller.schema_create(
    "my_schema_name", "1.0", ["name", "age", "gender"]
)

# Create a new credential definition
cred_def_id = await agent_controller.credential_definition_create(
    schema_id, "my_cred_def_name", "CL", False
)

# Issue a new credential
credential_offer = {
    "schema_id": schema_id,
    "cred_def_id": cred_def_id,
    "credential_proposal": {
        "@type": "did:sov:BzCbsNYhMrjHiqZDTUASHg;spec/credential-preview/1.0",
        "attributes": [
            {"name": "name", "value": "John Doe"},
            {"name": "age", "value": "25"},
            {"name": "gender", "value": "Male"},
        ],
    },
}
credential = await agent_controller.issue_credential(
    credential_offer, auto_remove=True, comment="Issuing credential to John Doe"
)