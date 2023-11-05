import crypto from "crypto";

export function generateRSAKeyPair(): {
  publicKey: string;
  privateKey: string;
} {
  const keyPair = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048, // Adjust the key size as needed
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
    },
  });

  return {
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
  };
}
