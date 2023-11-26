import { AskarModule } from "@aries-framework/askar";
import {
  Agent,
  InitConfig,
  ConnectionEventTypes,
  ConnectionStateChangedEvent,
  WsOutboundTransport,
  HttpOutboundTransport,
  DidExchangeState,
  OutOfBandRecord,
  ConnectionsModule,
  CredentialsModule,
  V2CredentialProtocol,
  W3cCredentialsModule,
  JsonLdCredentialFormatService,
  DidsModule,
  CredentialStateChangedEvent,
  CredentialEventTypes,
  CredentialState,
  ProofsModule,
  V2ProofProtocol,
  KeyType,
  KeyDidCreateOptions,
  Key,
  Ed25119Sig2018,
  Buffer,
} from "@aries-framework/core";
import { W3cJsonLdCredentialService } from "@aries-framework/core/build/modules/vc/data-integrity/W3cJsonLdCredentialService";
import { agentDependencies, HttpInboundTransport } from "@aries-framework/node";
import { ariesAskar } from "@hyperledger/aries-askar-nodejs";
import crypto from "crypto";
import * as bs58 from "bs58";

import {
  OracleModule,
  OracleModuleConfig,
  OracleLedgerService,
  OracleDidResolver,
  OracleDidRegistrar,
  OracleDidCreateOptions,
} from "@lehigh-oracle-did23/aries-framework-oracle";
import dotenv from "dotenv";
import { MultiBaseEncoder } from "@aries-framework/core/build/utils";
dotenv.config();

const initializeIssuerAgent = async () => {
  // Simple agent configuration. This sets some basic fields like the wallet
  // configuration and the label. It also sets the mediator invitation url,
  // because this is most likely required in a mobile environment.
  const config: InitConfig = {
    label: "demo-agent-issuer",
    walletConfig: {
      id: "mainIssuer",
      key: "demoagentissuer00000000000000000000",
    },
    endpoints: ["http://localhost:3002"],
  };

  // A new instance of an agent is created here
  // Askar can also be replaced by the indy-sdk if required
  const issuer = new Agent({
    config,
    modules: {
      askar: new AskarModule({ ariesAskar }),
      connections: new ConnectionsModule({ autoAcceptConnections: true }),
      dids: new DidsModule({
        registrars: [new OracleDidRegistrar()],
        resolvers: [new OracleDidResolver()],
      }),
      oracle: new OracleModule(
        new OracleModuleConfig({
          networkConfig: {
            network: `${process.env.BC_URL}`,
            channel: `${process.env.BC_CHANNEL}`,
            chaincode: `${process.env.BC_DID_CHAINCODE_NAME}`,
            encodedCredential: Buffer.from(
              `${process.env.USERNAME}:${process.env.PASSWORD}`
            ).toString("base64"),
          },
        })
      ),
      credentials: new CredentialsModule({
        credentialProtocols: [
          new V2CredentialProtocol({
            credentialFormats: [new JsonLdCredentialFormatService()],
          }),
        ],
      }),
      w3cCredentials: new W3cCredentialsModule(),
      proofs: new ProofsModule(),
    },
    dependencies: agentDependencies,
  });

  // Register a simple `WebSocket` outbound transport
  issuer.registerOutboundTransport(new WsOutboundTransport());

  // Register a simple `Http` outbound transport
  issuer.registerOutboundTransport(new HttpOutboundTransport());

  // Register a simple `Http` inbound transport
  issuer.registerInboundTransport(new HttpInboundTransport({ port: 3002 }));

  // Initialize the agent
  await issuer.initialize();

  return issuer;
};

const createNewInvitation = async (agent: Agent) => {
  const outOfBandRecord = await agent.oob.createInvitation();

  return {
    invitationUrl: outOfBandRecord.outOfBandInvitation.toUrl({
      domain: "https://example.org",
    }),
    outOfBandRecord,
  };
};

const createLegacyInvitation = async (agent: Agent) => {
  const { invitation } = await agent.oob.createLegacyInvitation();

  return invitation.toUrl({ domain: "https://example.org" });
};

const receiveInvitation = async (agent: Agent, invitationUrl: string) => {
  const { outOfBandRecord } = await agent.oob.receiveInvitationFromUrl(
    invitationUrl
  );

  return outOfBandRecord;
};

const setupConnectionListener = (
  agent: Agent,
  outOfBandRecord: OutOfBandRecord,
  cb: (...args: any) => void
) => {
  agent.events.on<ConnectionStateChangedEvent>(
    ConnectionEventTypes.ConnectionStateChanged,
    ({ payload }) => {
      if (payload.connectionRecord.outOfBandId !== outOfBandRecord.id) return;
      if (payload.connectionRecord.state === DidExchangeState.Completed) {
        // the connection is now ready for usage in other protocols!
        console.log(
          `Connection for out-of-band id ${outOfBandRecord.id} completed`
        );
        console.log(payload.connectionRecord.did)

        // Custom business logic can be included here
        // In this example we can send a basic message to the connection, but
        // anything is possible
        cb(payload.connectionRecord.id);

        // // We exit the flow
        // process.exit(0);
      }
    }
  );
};

const setupCredentialListener = (
  agent: Agent,
  cb: (...args: any) => void
) => {
  agent.events.on<CredentialStateChangedEvent>(
    CredentialEventTypes.CredentialStateChanged,
    async ({ payload }) => {
      switch (payload.credentialRecord.state) {
        case CredentialState.OfferReceived:
          console.log("received a credential");
          // custom logic here
          await agent.credentials.acceptOffer({
            credentialRecordId: payload.credentialRecord.id,
          });
        case CredentialState.RequestReceived:
          console.log("received a credential request");
          // custom logic here
          await agent.credentials.acceptRequest({
            credentialRecordId: payload.credentialRecord.id,
          });
        case CredentialState.Done:
          console.log(
            `Credential for credential id ${payload.credentialRecord.id} is accepted`
          );
          // For demo purposes we exit the program here.
          // process.exit(0);
      }
    }
  );
};

const generateKey = async () => {
  const keypair = crypto.generateKeyPairSync("ed25519", {
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "der",
    },
  });

  return keypair;
};

// const privateKeyToJWK = (privateKey: Buffer): jwt.Secret => {
//   const jwk: unknown = {
//     kty: "oct",
//     k: privateKey.toString("base64"),
//     alg: "EdDSA",
//     use: "sig",
//   };

//   return jwk as jwt.Secret;
// };

// determine the length of a DER-encoded ASN.1 element
function findDer(data: Uint8Array, index: number, tagByte: number) {
    while (true) {
        if (data.length < 2)
            throw Error('unexpected EOF')
        const [ tag, length ] = data
        data = data.subarray(2)
        if ((tag & 31) === 31 || length >> 7)
            throw Error('not implemented')
        if (data.length < length)
            throw Error('unexpected EOF')
        if (index-- === 0) {
            if (tag !== tagByte) throw Error(`unexpected tag ${tag}`)
            return data.subarray(0, length)
        }
        data = data.subarray(length)
    }
}


const run = async () => {
  console.log("Initializing Issuer agent...");
  const issuer = await initializeIssuerAgent();

  const keypair = await generateKey();
  // console.log(keypair.publicKey);
  // print in DER format;

  // remove the ASN.1 wrapper from the private key and extract the raw key
  let kp_raw_privKey = Buffer.from(keypair.privateKey);
  kp_raw_privKey = Buffer.from(findDer(kp_raw_privKey, 0, (1 << 5) | 16)); // SEQUENCE (PrivateKeyInfo)
  kp_raw_privKey = Buffer.from(findDer(kp_raw_privKey, 2, 4)); // OCTET STRING (PrivateKey)
  kp_raw_privKey = Buffer.from(findDer(kp_raw_privKey, 0, 4)); // OCTET STRING (CurvePrivateKey)

  const key = await issuer.wallet.createKey({
    privateKey: kp_raw_privKey,
    keyType: KeyType.Ed25519,
  });

  const publicDid = await issuer.dids.create<OracleDidCreateOptions>({
    method: "orcl",
    secret: {
      // verificationMethod: {
      //   id: "key-1",
      //   type: "Ed25519VerificationKey2020",
      //   controller: "#id",
      //   publicKeyPem: keypair.publicKey,
      //   publicKeyMultibase: key.fingerprint,
      //   // publicKeyBase58: key.publicKeyBase58,
      // },
      publicKeyPem: keypair.publicKey,
    },
  });

  console.log("Issuer DID:");
  console.log(publicDid);
  console.log("Issuer DID Document:");
  console.log(JSON.stringify(publicDid.didState.didDocument, null, 2));

  const stripped_publicKey = keypair.publicKey
    .replace(/-----BEGIN [^\n]+-----/, "")
    .replace(/-----END [^\n]+-----/, "");

  console.log(stripped_publicKey + "\n");

  const kp_der_publicKey = Buffer.from(stripped_publicKey, "base64");
  const derData = crypto
    .createPublicKey({
      key: kp_der_publicKey.toString("utf8"), // Convert Buffer to string
      format: "der",
      type: "spki",
    })
    .export({ format: "der", type: "spki" });

  console.log(
    kp_der_publicKey.toString("hex") +
      " : Length : " +
      kp_der_publicKey.length.toString()
  );

  console.log(
    derData.toString("hex") + " : Length : " + derData.length.toString()
  );

  // should remove bs58 encoding later

  const kp_b58_publicKey = bs58.encode(derData);
  const kp_b58_privateKey = bs58.encode(kp_raw_privKey);
  console.log("Keypair BS58");
  console.log("Public Key: " + kp_b58_publicKey);
  console.log("Private Key: " + kp_b58_privateKey + "\n");

  console.log("Wallet BS58");
  console.log("Public Key: " + key.publicKeyBase58);
  console.log("Fingerprint Key: " + bs58.encode(Buffer.from(key.fingerprint)) + "\n");
  console.log("Key: " + bs58.encode(key.publicKey) + "\n"
              + bs58.encode(key.prefixedPublicKey) + "\n");

  if (
    publicDid.didState &&
    publicDid.didState.didDocument &&
    publicDid.didState.didDocument.verificationMethod
  ) {
    const xValues = publicDid.didState.didDocument.verificationMethod.map(
      (verificationMethod) => verificationMethod.publicKeyJwk?.x // Add null check here
    );
    const xValuesString = xValues.join(""); // Join the array of strings into a single string
    const xValuesBuffer = Buffer.from(xValuesString, "base64");
    console.log("DID Public Key Base 58: " + bs58.encode(xValuesBuffer) + "\n");
  }

  console.log("Creating the invitation as Issuer...");
  const { outOfBandRecord, invitationUrl } = await createNewInvitation(issuer);

  console.log("Invitation URL:");
  console.log(invitationUrl);

  console.log("Listening for connection changes...");
  // Create a Promise to resolve when the connection is established
  const connectionEstablished = new Promise<void>((resolve) => {
    setupConnectionListener(issuer, outOfBandRecord, (connectionID) => {
      console.log(
        "We now have an active connection to use in the following tutorials"
      );
      resolve(connectionID); // Resolve the Promise when the connection is established
    });
  });

  // Wait for the connection to be established
  const connectionID = await connectionEstablished;

  console.log(connectionID);

  const jsonldCredentialExchangeRecord =
    await issuer.credentials.offerCredential({
      protocolVersion: "v2",
      connectionId: `${connectionID}`,
      credentialFormats: {
        jsonld: {
          credential: {
            "@context": [
              "https://www.w3.org/2018/credentials/v1",
              "https://www.w3.org/2018/credentials/examples/v1",
            ],
            id: "urn:uuid:3978344f-8596-4c3a-a978-8fcaba3903c5",
            type: ["VerifiableCredential", "UniversityDegreeCredential"],
            issuer:  publicDid.didState.did as string,
            issuanceDate: "2020-01-01T19:23:24Z",
            expirationDate: "2021-01-01T19:23:24Z",
            credentialSubject: {
              id: "did:key:z6MkpTHR8VNsBxYAAWHut2Geadd9jSwuBV8xRoAnwWsdvktH",
              degree: {
                type: "BachelorDegree",
                name: "Bachelor of Science and Arts",
              },
            },
          },
          options: {
            proofPurpose: "assertionMethod",
            proofType: "JsonWebKey2020",
          },
        },
      },
    });

  console.log("Credential offer sent");

  console.log("Listening for credential changes...");
  setupCredentialListener(issuer, () =>
    console.log(
      "We now have an active credential to use in the following tutorials"
    )
  );
};

export default run;

void run();
