import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Wallet() {
  const [didInfo, setDidInfo] = useState(null);
  const [credentials, setCredentials] = useState([]);

  // Define a function to create an Oracle DID and store it in the wallet
  async function createOracleDid() {
    try {
      // Send a POST request to the server to create an Oracle DID
      const response = await axios.post('/create-oracle-did');

      // Update the state with the new DID information
      setDidInfo(response.data);
    } catch (error) {
      console.error(error);
    }
  }

  // Define a function to get all credentials from the wallet
  async function getCredentials() {
    try {
      // Send a GET request to the server to get all credentials
      const response = await axios.get('/get-credentials');

      // Update the state with the credentials
      setCredentials(response.data);
    } catch (error) {
      console.error(error);
    }
  }

  // Call the createOracleDid function when the component mounts
  useEffect(() => {
    createOracleDid();
  }, []);

  // Render the component
  return (
    <div>
      <h1>Wallet</h1>
      {didInfo && (
        <div>
          <h2>Oracle DID created:</h2>
          <p>DID: {didInfo.did}</p>
          <p>Verkey: {didInfo.verkey}</p>
        </div>
      )}
      <button onClick={createOracleDid}>Create Oracle DID</button>
      <button onClick={getCredentials}>Get Credentials</button>
      {credentials.length > 0 && (
        <div>
          <h2>Credentials:</h2>
          <ul>
            {credentials.map((credential) => (
              <li key={credential.credential_id}>{credential.credential_id}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default Wallet;
