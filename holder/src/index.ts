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
} from "@aries-framework/core";
import { W3cJsonLdCredentialService } from "@aries-framework/core/build/modules/vc/data-integrity/W3cJsonLdCredentialService";
import { agentDependencies, HttpInboundTransport } from "@aries-framework/node";
import { ariesAskar } from "@hyperledger/aries-askar-nodejs";

import { W3cCredentialService } from "@aries-framework/core/build/modules/vc/W3cCredentialService";

import {
  OracleModule,
  OracleModuleConfig,
  OracleLedgerService,
  OracleDidResolver,
  OracleDidRegistrar,
} from "@lehigh-oracle-did23/aries-framework-oracle";
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

    const presentation = await w3cCredentialService.createPresentation({
      credentials: cred,
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
          },
        },
      },
      comment: "This is a proof proposal",
    });

    console.log(res);

  } finally {
    rl.close();
  }
};

export default run;

void run();
