const axios = require("axios");

const tokenUrl =
  "https://idcs-8076696250a94dc8b6b2f8cefa28e425.identity.oraclecloud.com/oauth2/v1/token";
const clientId = "e4af37ff5973413e9c0dbc1267712a8c";
const clientSecret = "4dcdebd1-b0e4-4724-9b38-2e101f7dada9";

async function generateBearerToken() {
  const data = new URLSearchParams();
  data.append("grant_type", "client_credentials");
  data.append("scope", "urn:opc:idm:__myscopes__");

  try {
    const response = await axios.post(tokenUrl, data, {
      auth: {
        username: clientId,
        password: clientSecret,
      },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    return response.data.access_token; // Return the access token
  } catch (error) {
    throw error; // Throw the error for handling in the component
  }
}

// generateBearerToken()
//   .then((token) => {
//     console.log("Bearer Token:", token);
//   })
//   .catch((error) => {
//     console.error("Error:", error);
//   });

export { generateBearerToken };