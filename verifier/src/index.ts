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
  ConnectionRecord,
  ConsoleLogger,
  LogLevel
} from "@aries-framework/core";
import { W3cJsonLdCredentialService } from "@aries-framework/core/build/modules/vc/data-integrity/W3cJsonLdCredentialService";
import { agentDependencies, HttpInboundTransport } from "@aries-framework/node";
import { ariesAskar } from "@hyperledger/aries-askar-nodejs";
import crypto from "crypto";
import * as bs58 from "bs58";

import task from "./util/task";
import prompt from "./util/prompt";
import confirm from "./util/confirm";

import { JsonLdProofFormatService } from "./jsonld-proofs/JsonLdProofFormatService";

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

import { v4 as uuidv4} from "uuid";

const initializeVerifierAgent = async () => {
  // Simple agent configuration. This sets some basic fields like the wallet
  // configuration and the label. It also sets the mediator invitation url,
  // because this is most likely required in a mobile environment.
  const config: InitConfig = {
    label: "demo-agent-verifier",
    walletConfig: {
      id: "mainVerifier",
      key: "demoagentverifier00000000000000000000",
    },
    logger: new ConsoleLogger(LogLevel.info),
    endpoints: ["http://localhost:3003"],
  };

  // A new instance of an agent is created here
  // Askar can also be replaced by the indy-sdk if required
  const verifier = new Agent({
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
      proofs: new ProofsModule({
        proofProtocols: [
          new V2ProofProtocol({
            proofFormats: [new JsonLdProofFormatService()],
          }),
        ],
      })
    },
    dependencies: agentDependencies,
  });

  // Register a simple `WebSocket` outbound transport
  verifier.registerOutboundTransport(new WsOutboundTransport());

  // Register a simple `Http` outbound transport
  verifier.registerOutboundTransport(new HttpOutboundTransport());

  // Register a simple `Http` inbound transport
  verifier.registerInboundTransport(new HttpInboundTransport({ port: 3002 }));

  // Initialize the agent
  await verifier.initialize();

  return verifier;
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
        cb(payload.connectionRecord);

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

function stripKeyToRaw(keypair: crypto.KeyPairSyncResult<string, globalThis.Buffer>): Buffer {
  /**
   * HACK - start: removes the ASN.1 wrapper from the private key and extract the raw key
   */
  let kp_raw_privKey = Buffer.from(keypair.privateKey);
  kp_raw_privKey = Buffer.from(findDer(kp_raw_privKey, 0, (1 << 5) | 16)); // SEQUENCE (PrivateKeyInfo)
  kp_raw_privKey = Buffer.from(findDer(kp_raw_privKey, 2, 4)); // OCTET STRING (PrivateKey)
  kp_raw_privKey = Buffer.from(findDer(kp_raw_privKey, 0, 4)); // OCTET STRING (CurvePrivateKey)
  /**
   * end
   */
  return kp_raw_privKey;
}

const run = async () => {
  // const logger = new ConsoleLogger(LogLevel.debug);

  const verifier = await task("Initializing Verifier agent...", initializeVerifierAgent());

  const keypair = await generateKey();
  const kp_raw_privKey = stripKeyToRaw(keypair);

  await task("Creating Verifier key...", verifier.wallet.createKey({
    privateKey: kp_raw_privKey,
    keyType: KeyType.Ed25519,
  }));

  const publicDid = await task("Creating Verifier DID...", verifier.dids.create<OracleDidCreateOptions>({
    method: "orcl",
    secret: {
      publicKeyPem: keypair.publicKey,
      },
  }));

  /**
   * TEMP - start: logging
   */

  // logger.debug("verifier DID ", publicDid);
  // logger.debug("verifier DID Document ", publicDid.didState.didDocument);

  // const stripped_publicKey = keypair.publicKey
  //   .replace(/-----BEGIN [^\n]+-----/, "")
  //   .replace(/-----END [^\n]+-----/, "");

  // logger.debug("Stripped Public Key ", { publicKey: stripped_publicKey });

  // const kp_der_publicKey = Buffer.from(stripped_publicKey, "base64");
  // const derData = crypto
  //   .createPublicKey({
  //     key: kp_der_publicKey.toString("utf8"), // Convert Buffer to string
  //     format: "der",
  //     type: "spki",
  //   })
  //   .export({ format: "der", type: "spki" });

  // logger.debug("DER Public Key ", { publicKey: kp_der_publicKey.toString("hex"), length: kp_der_publicKey.length.toString() });
  // logger.debug("DER Public Key ", { publicKey: derData.toString("hex"), length: derData.length.toString() });

  // // should remove bs58 encoding later
  // const kp_b58_publicKey = bs58.encode(derData);
  // const kp_b58_privateKey = bs58.encode(kp_raw_privKey);
  // logger.debug("Keypair BS58", { publicKey: kp_b58_publicKey, privateKey: kp_b58_privateKey });
  // logger.debug("Wallet BS58", { publicKey: key.publicKeyBase58, fingerprint: bs58.encode(Buffer.from(key.fingerprint)), key: bs58.encode(key.publicKey), prefixedKey: bs58.encode(key.prefixedPublicKey) });
  
  /**
   * end
   */

  const { outOfBandRecord, invitationUrl } = await task("Creating invitation...", createNewInvitation(verifier));

  console.log("Invitation URL:");
  console.log("\x1b[34m%s\x1b[0m", invitationUrl); // print in blue color

  console.log("Listening for connection changes...");
  // Create a Promise to resolve when the connection is established
  const connectionEstablished = new Promise<ConnectionRecord>((resolve) => {
    setupConnectionListener(verifier, outOfBandRecord, (connection) => {
      console.log(
        "We now have an active connection to use in the following tutorials"
      );
      resolve(connection); // Resolve the Promise when the connection is established
    });
  });

  // Wait for the connection to be established
  const connection = await task("",connectionEstablished);

  // logger.debug("Connection ID:", { connectionId: connection.id });
  // logger.debug("Connection DID:", { connectionDid: connection.did });

  await confirm("Would you like to issue a credential?");

  verifier.proofs.requestProof({
    connectionId: connection.id,
    pr: {
      name: "Proof of Education",
      requestedAttributes: {
        "urn:example:attribute:education": {
          name: "degree",
          restrictions: [
            {
              cred_def_id: "WgWxqztrNooG92RXvxSTWv:3:CL:20:tag",
            },
          ],
        },
      },
      requestedPredicates: {},
    },
  });
  })

  // } finally {
  //   await verifier.wallet.delete()
  //   process.exit(0);
  // }
};

export default run;

void run();
