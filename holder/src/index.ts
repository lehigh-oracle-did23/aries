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
  ConsoleLogger,
  LogLevel,
  CredentialExchangeRecord,
  ProofsModule,
  V2ProofProtocol,
  JsonTransformer,
  ConnectionRecord,
  Buffer,
  ProofStateChangedEvent,
  ProofEventTypes,
  ProofState,
  KeyType,
} from "@aries-framework/core";
import { W3cJsonLdCredentialService } from "@aries-framework/core/build/modules/vc/data-integrity/W3cJsonLdCredentialService";
import { agentDependencies, HttpInboundTransport } from "@aries-framework/node";
import { ariesAskar } from "@hyperledger/aries-askar-nodejs";

import task from "./util/task";
import prompt from "./util/prompt";
import confirm from "./util/confirm";

import { W3cCredentialService } from "@aries-framework/core/build/modules/vc/W3cCredentialService";

import {
  OracleModule,
  OracleModuleConfig,
  OracleLedgerService,
  OracleDidResolver,
  OracleDidRegistrar,
  OracleDidCreateOptions,
} from "@lehigh-oracle-did23/aries-framework-oracle";

import crypto from "crypto";

import dotenv from "dotenv";
dotenv.config();

import { JsonLdProofFormatService } from "./jsonld-proofs/JsonLdProofFormatService";

import { JsonPresentation } from "./jsonld-proofs/JsonLdProofFormat";

import readline from "readline";

const initializeHolderAgent = async () => {
  // Simple agent configuration. This sets some basic fields like the wallet
  // configuration and the label. It also sets the mediator invitation url,
  // because this is most likely required in a mobile environment.
  const config: InitConfig = {
    label: "demo-agent-holder",
    walletConfig: {
      id: "mainHolder",
      key: "demoagentholder00000000000000000000",
    },
    logger: new ConsoleLogger(LogLevel.info),
    endpoints: ["http://localhost:3001"],
  };

  // A new instance of an agent is created here
  // Askar can also be replaced by the indy-sdk if required
  const holder = new Agent({
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
      proofs: new ProofsModule({
        proofProtocols: [
          new V2ProofProtocol({
            proofFormats: [new JsonLdProofFormatService()],
          }),
        ],
      }),
    },
    dependencies: agentDependencies,
  });

  // Register a simple `WebSocket` outbound transport
  holder.registerOutboundTransport(new WsOutboundTransport());

  // Register a simple `Http` outbound transport
  holder.registerOutboundTransport(new HttpOutboundTransport());

  // Register a simple `Http` inbound transport
  holder.registerInboundTransport(new HttpInboundTransport({ port: 3001 }));

  // Initialize the agent
  await holder.initialize();

  return holder;
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

// determine the length of a DER-encoded ASN.1 element
function findDer(data: Uint8Array, index: number, tagByte: number) {
  while (true) {
    if (data.length < 2) throw Error("unexpected EOF");
    const [tag, length] = data;
    data = data.subarray(2);
    if ((tag & 31) === 31 || length >> 7) throw Error("not implemented");
    if (data.length < length) throw Error("unexpected EOF");
    if (index-- === 0) {
      if (tag !== tagByte) throw Error(`unexpected tag ${tag}`);
      return data.subarray(0, length);
    }
    data = data.subarray(length);
  }
}

function stripKeyToRaw(
  keypair: crypto.KeyPairSyncResult<string, globalThis.Buffer>
): Buffer {
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
        console.log(payload.connectionRecord.did);

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

const setupCredentialOfferListener = (agent: Agent, cb: (...args: any) => void) => {
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
        case CredentialState.Done:
          console.log(
            `Credential for credential id ${payload.credentialRecord.id} is accepted`
          );
          // For demo purposes we exit the program here.
          cb();
          break;
      }
    }
  );
};

const setupCredentialRequestListener = (agent: Agent, cb: (...args: any) => void) => {
  agent.events.on<CredentialStateChangedEvent>(
    CredentialEventTypes.CredentialStateChanged,
    async ({ payload }) => {
      switch (payload.credentialRecord.state) {
        case CredentialState.CredentialReceived:
          console.log("received a credential");
          // custom logic here
          await agent.credentials.acceptCredential({
            credentialRecordId: payload.credentialRecord.id,
          });
        case CredentialState.Done:
          console.log(
            `Credential for credential id ${payload.credentialRecord.id} is accepted`
          );
          // For demo purposes we exit the program here.
          cb(payload.credentialRecord);
          break;
      }
    }
  );
};

const setupProofListener = (agent: Agent, cb: (...args: any) => void) => {
  agent.events.on<ProofStateChangedEvent>(
    ProofEventTypes.ProofStateChanged,
    async ({ payload }) => {
      switch (payload.proofRecord.state) {
        case ProofState.RequestReceived:
          console.log("received a proof request");
          // custom logic here
          await agent.proofs.acceptRequest({
            proofRecordId: payload.proofRecord.id,
          });
        case ProofState.Done:
          console.log(
            `Proof for proof id ${payload.proofRecord.id} is accepted`
          );
          // For demo purposes we exit the program here.
          // process.exit(0);
          cb();
          break;
      }
    }
  );
};

const askQuestion = (rl: readline.Interface, question: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(question, (answer: string) => {
      resolve(answer);
    });
  });
};

const run = async () => {
  console.log("Initializing Holder agent...");
  const holder = await initializeHolderAgent();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    // Issuer invitation
    const invitationUrl = await askQuestion(rl, "Paste the invitation URL and press Enter: ");
    console.log("Accepting the invitation as Holder...");
    await receiveInvitation(holder, invitationUrl);

    console.log("Listening for credential changes...");
    const credentialOffer = new Promise<void>((resolve) => {
      setupCredentialOfferListener(holder, () => {
        console.log(
          "We now have an active credential to use in the following tutorials"
        );
        resolve();
      });
    });

    await credentialOffer;

    console.log("Listening for credential changes...");
    const credentialAccept = new Promise<CredentialExchangeRecord>((resolve) => {
      setupCredentialRequestListener(holder, (credential) => {
        console.log(
          "We now have an active credential to use in the following tutorials"
        );
        resolve(credential);
      });
    });

    const credential = (await credentialAccept).credentials;

    // Show all credentials
    await holder.w3cCredentials.getCredentialRecordById(credential[0].credentialRecordId).then((record) => {
      console.log(record);
    });

    // Verifier invitation
    const secondInvitationUrl = await askQuestion(rl, "Paste the second invitation URL and press Enter: ");
    console.log("Accepting the second invitation as Holder...");
    const outOfBandRecord = await receiveInvitation(holder, secondInvitationUrl);

    console.log("Listening for presentation changes...");

    // press enter to send a proof proposal

    console.log("Listening for connection changes...");
    // Create a Promise to resolve when the connection is established
    const connectionEstablished = new Promise<ConnectionRecord>((resolve) => {
      setupConnectionListener(holder, outOfBandRecord, (connection) => {
        console.log(
          "We now have an active connection to use in the following tutorials"
        );
        resolve(connection); // Resolve the Promise when the connection is established
      });
    });

    // Wait for the connection to be established
    const connection = await connectionEstablished
    
    await askQuestion(rl, "Press Enter to send a proof proposal: ");

     const w3cCredentialService =
        holder.dependencyManager.resolve(W3cCredentialService);

    const credRecord =  await holder.w3cCredentials.getCredentialRecordById(credential[0].credentialRecordId)

    const cred = credRecord.credential

    const keypair = await generateKey();
    const kp_raw_privKey = stripKeyToRaw(keypair);

    await task(
      "Creating Holder key...",
      holder.wallet.createKey({
        privateKey: kp_raw_privKey,
        keyType: KeyType.Ed25519,
      })
    );

    const publicDid = await task(
      "Creating Issuer DID...",
      holder.dids.create<OracleDidCreateOptions>({
        method: "orcl",
        secret: {
          publicKeyPem: keypair.publicKey,
        },
      })
    );


    const presentation = await w3cCredentialService.createPresentation({
      credentials: [cred],
      holder: publicDid.didState.did
    });

    const res = await holder.proofs.proposeProof({
      connectionId: connection.id,
      protocolVersion: "v2",
      proofFormats: {
        jsonld: {
          presentation: presentation,
          options: {
            proofPurpose: "authentication",
            proofType: "Ed25519Signature2018",
            challenge: "12345678901234567890123456789012",
          },
        },
      },
      comment: "This is a proof proposal",
    });

    await res;

    console.log("Listening for proof requests...");
    const proofRequest = new Promise<void>((resolve) => {
        setupProofListener(holder, (credential) => {
          console.log(
            "Proof request accepted"
          );
          resolve();
        });
      }
    );

    await proofRequest;

  } finally {
    rl.close();
  }
};

export default run;

void run();
