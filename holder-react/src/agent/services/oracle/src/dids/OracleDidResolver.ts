import type { AgentContext, DidResolutionResult, DidResolver, ParsedDid } from '@aries-framework/core'
import { orclIdentifierRegex , parseOracleDid } from "./identifiers"
import { DidDocument, AriesFrameworkError, utils, JsonTransformer } from '@aries-framework/core'

import { OracleLedgerService } from '../ledger';

export class OracleDidResolver implements DidResolver {
  public readonly supportedMethods = ['orcl']

  public async resolve(agentContext: AgentContext, did: string, parsed: ParsedDid): Promise<DidResolutionResult> {
    const didDocumentMetadata = {}

    try {
      const parsedDid = parseOracleDid(parsed.didUrl);
      if (!parsedDid) {
        throw new Error('Invalid DID')
      }

      switch (did) {
        case did.match(orclIdentifierRegex)?.input:
          return await this.resolveDidDoc(agentContext, parsedDid.did);
        default:
          return {
            didDocument: null,
            didDocumentMetadata,
            didResolutionMetadata: {
              error: "Invalid request",
              message: `Unsupported did Url: '${did}'`,
            },
          };
      }
    } catch (error) {
      return {
        didDocument: null,
        didDocumentMetadata,
        didResolutionMetadata: {
          error: 'notFound',
          message: `resolver_error: Unable to resolve did '${did}': ${error}`,
        },
      }
    }
  }

  private async resolveDidDoc(agentContext: AgentContext, did: string): Promise<DidResolutionResult> {
    
    const oracleLedgerService = agentContext.dependencyManager.resolve(OracleLedgerService);

    const { didDocument, didDocumentMetadata } = await oracleLedgerService.resolve(did);

    return {
      didDocument: JsonTransformer.fromJSON(didDocument, DidDocument),
      didDocumentMetadata,
      didResolutionMetadata: {},
    }
  }
}