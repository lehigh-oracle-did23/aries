import unittest
from aries_cloudagent.messaging.agent import Agent
from pymongo import MongoClient

class TestDIDCommAgent(unittest.TestCase):

    def setUp(self):
        self.agent = Agent(
            label="Test Agent",
            seed="randomseed",
            public_did=True,
            port=8020,
            postgres=False,
            wallet_kwargs={
                "auto_create_did": True,
                "auto_provision": True
            }
        )
        
        # Set up connection to MongoDB server
        self.mongo_client = MongoClient("mongodb://localhost:27017/")
        self.db = self.mongo_client["test_database"]
        
    def tearDown(self):
        self.agent.stop()
        
        # Clean up test data from MongoDB
        self.db.drop_collection("test_collection")
        self.mongo_client.close()

    def test_agent_connection(self):
        # Test that the agent can be started and stopped
        self.agent.start()
        self.assertTrue(self.agent.is_alive())
        self.agent.stop()
        self.assertFalse(self.agent.is_alive())

    def test_mongodb_insert(self):
        # Test that data can be inserted into a MongoDB collection
        collection = self.db["test_collection"]
        data = {"name": "John", "age": 30}
        collection.insert_one(data)
        self.assertEqual(collection.count_documents({}), 1)
        
    def test_mongodb_find(self):
        # Test that data can be retrieved from a MongoDB collection
        collection = self.db["test_collection"]
        data = {"name": "John", "age": 30}
        collection.insert_one(data)
        result = collection.find_one({"name": "John"})
        self.assertIsNotNone(result)
        self.assertEqual(result["age"], 30)
