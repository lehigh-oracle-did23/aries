const axios = require("axios");

const apiUrl =
  "https://idcs-8076696250a94dc8b6b2f8cefa28e425.identity.oraclecloud.com/admin/v1/HTTPAuthenticator";

interface AuthResponse {
  // Define the structure of the authentication response data
  // Adjust these types as per the actual response structure
}

async function authenticateUser(
  authToken: string,
  encodedCredentials: string
): Promise<AuthResponse> {

  const requestBody = {
    credType: "authorization",
    creds: `Basic ${encodedCredentials}`,
    schemas: ["urn:ietf:params:scim:schemas:oracle:idcs:HTTPAuthenticator"],
  };

  try {
    const response = await axios.post(apiUrl, requestBody, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
    });

    return response.data as AuthResponse; // Return the API response, adjust the type
  } catch (error) {
    throw error; // Throw the error for handling in your application
  }
}

// Example usage:
// authenticateUser(authToken, 'username', 'password')
//   .then((data) => {
//     console.log('Authentication response:', data);
//   })
//   .catch((error) => {
//     console.error('Error:', error);
//   });

export { authenticateUser };
