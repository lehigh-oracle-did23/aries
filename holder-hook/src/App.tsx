import React, { useEffect, useState } from 'react';
import logo from './logo.svg';
import './App.css';
import AgentProvider from '@aries-framework/react-hooks'

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

import {
  OracleModule,
  OracleModuleConfig,
  OracleLedgerService,
  OracleDidResolver,
  OracleDidRegistrar,
  OracleDidCreateOptions,
} from "@lehigh-oracle-did23/aries-framework-oracle";
import dotenv from "dotenv";

dotenv.config();

function App() {
  const [agent, setAgent] = useState<Agent | undefined>(undefined);

  const initializeAgent = async () => {
    const config: InitConfig = {
      label: "demo-agent-issuer",
      walletConfig: {
        id: "mainIssuer",
        key: "demoagentissuer00000000000000000000",
      },
      endpoints: ["http://localhost:3002"],
    };

    const appAgent = new Agent({
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
              encodedCredential: Buffer.from(`${process.env.USERNAME}:${process.env.PASSWORD}`).toString("base64"),
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
    })
    // Register a simple `WebSocket` outbound transport
    appAgent.registerOutboundTransport(new WsOutboundTransport());

    // Register a simple `Http` outbound transport
    appAgent.registerOutboundTransport(new HttpOutboundTransport());

    // Register a simple `Http` inbound transport
    appAgent.registerInboundTransport(new HttpInboundTransport({ port: 3002 }));

    await appAgent.initialize()
    setAgent(appAgent)
  }

  useEffect(() => {
    initializeAgent()
  }, [])

  if (!agent) return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );

  return <AgentProvider agent={agent}>Initialized!</AgentProvider>
  
}

export default App;
