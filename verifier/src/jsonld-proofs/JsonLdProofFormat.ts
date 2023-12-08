import type {
  ProofFormatSelectCredentialsForRequestOptions,
  W3cPresentation,
  W3cVerifiableCredential,
  W3cVerifiablePresentation,
} from "@aries-framework/core";
import type {
  ProofFormat,
  ProofFormatGetCredentialsForRequestOptions,
} from "@aries-framework/core";
import type { JsonObject } from "@aries-framework/core";
import type { JsonCredential } from "@aries-framework/core";

export interface JsonPresentation {
  "@context": Array<string | JsonObject>;
  id?: string;
  type: Array<string>;
  holder: string | { id?: string };
  verifiableCredential: Array<JsonCredential | string>;
  [key: string]: unknown;
}

/**
 * Format for creating a jsonld proposal, offer or request.
 */
export interface JsonLdProofDetailFormat {
  presentation: W3cPresentation;
  options: {
    proofPurpose: string;
    proofType: string;
  };
}

/**
 * Format for accepting a jsonld credential request. Optionally allows the verification
 * method to use to sign the credential.
 */
export interface JsonLdAcceptRequestFormat {
  verificationMethod?: string
}

// use empty object in the acceptXXX jsonld format interface so we indicate that
// the jsonld format service needs to be invoked
type EmptyObject = Record<string, never>

export interface JsonLdProofFormat extends ProofFormat {
  formatKey: "jsonld";
  proofRecordType: 'w3c'
  proofFormats: {
    createProposal: JsonLdProofDetailFormat;
    acceptProposal: EmptyObject;
    createRequest: JsonLdProofDetailFormat;
    acceptRequest: JsonLdAcceptRequestFormat;

    getCredentialsForRequest: {
      input: ProofFormatGetCredentialsForRequestOptions<JsonLdProofFormat>;
      output: W3cVerifiableCredential[];
    };
    selectCredentialsForRequest: {
      input: ProofFormatSelectCredentialsForRequestOptions<JsonLdProofFormat>;
      output: W3cVerifiablePresentation;
    };
  };

  formatData: {
    proposal: JsonLdFormatDataProofDetail;
    request: JsonLdFormatDataProofDetail;
    presentation: W3cVerifiablePresentation;
  };
}

/**
 * Represents a signed verifiable presentation. Only meant to be used for presentation
 * format data interfaces.
 */
export interface JsonLdFormatDataVerifiablePresentation extends JsonPresentation {
  proof: {
    type: string
    proofPurpose: string
    verificationMethod: string
    created: string
    domain?: string
    challenge?: string
    jws?: string
    proofValue?: string
    nonce?: string
    [key: string]: unknown
  }
}

/**
 * Represents the jsonld credential detail. Only meant to be used for credential
 * format data interfaces.
 */
export interface JsonLdFormatDataProofDetail {
  presentation: JsonPresentation;
  options: JsonLdFormatDataProofDetailOptions;
}

/**
 * Represents the jsonld credential detail options. Only meant to be used for credential
 * format data interfaces.
 */
export interface JsonLdFormatDataProofDetailOptions {
  proofPurpose: string
  proofType: string
  created?: string
  domain?: string
  challenge?: string
  credentialStatus?: {
    type: string
    [key: string]: unknown
  }
}