import type {
  JsonLdFormatDataProofDetail,
  JsonLdFormatDataVerifiablePresentation,
  JsonLdProofFormat,
  JsonPresentation,
} from "./JsonLdProofFormat";
import { JsonLdProofDetail } from "./JsonLdProofDetail";
import {
  ClaimFormat,
  W3cJsonLdVerifiableCredential,
  W3cPresentation,
  W3cVerifiableCredential,
  W3cVerifiablePresentation,
  W3cJsonLdSignPresentationOptions,
  W3cJsonLdVerifiablePresentation,
  JsonLdCredentialDetail,
  JsonLdCredentialFormatService,
  CredentialsModule,
  W3cCredentialService,
} from "@aries-framework/core";
import type {
  ProofFormatService,
  AgentContext,
  ProofFormatCreateReturn,
  FormatCreateRequestOptions,
  ProofFormatCreateProposalOptions,
  ProofFormatProcessOptions,
  ProofFormatAcceptProposalOptions,
  ProofFormatAcceptRequestOptions,
  ProofFormatProcessPresentationOptions,
  ProofFormatGetCredentialsForRequestOptions,
  ProofFormatGetCredentialsForRequestReturn,
  ProofFormatSelectCredentialsForRequestOptions,
  ProofFormatSelectCredentialsForRequestReturn,
  ProofFormatAutoRespondProposalOptions,
  ProofFormatAutoRespondRequestOptions,
  ProofFormatAutoRespondPresentationOptions,
  W3cJwtVerifiableCredential,
  W3cJwtVerifiablePresentation,
} from "@aries-framework/core";

import { findVerificationMethodByKeyType } from "@aries-framework/core";
import { DidResolverService } from "@aries-framework/core";

import {
  AriesFrameworkError,
  Attachment,
  AttachmentData,
  JsonEncoder,
  ProofFormatSpec,
  JsonTransformer,
} from "@aries-framework/core";
import { W3cJsonLdCredentialService } from "@aries-framework/core/build/modules/vc/data-integrity/W3cJsonLdCredentialService";
import { areObjectsEqual } from "@aries-framework/core/build/utils";

const JSONLD_PRESENTATION_PROPOSAL = "aries/ld-proof-vp-detail@v1.0";
const JSONLD_PRESENTATION_REQUEST = "aries/ld-proof-vp-detail@v1.0";
const JSONLD_PRESENTATION = "aries/ld-proof-vp@v1.0";

// TASK: Make functions that check that the claims asked are the claims provided

/**
 * Service for handling JSON-LD proof formats.
 */
export class JsonLdProofFormatService
  implements ProofFormatService<JsonLdProofFormat>
{
  /**
   * The key identifier for the JSON-LD proof format.
   */
  public readonly formatKey = "jsonld" as const;

  /**
   * Creates a proposal for the JSON-LD proof format.
   * @param agentContext The agent context.
   * @param options The options for creating the proposal.
   * @returns A promise that resolves to the created proposal.
   * @throws Error if the jsonld format is missing.
   */
  public async createProposal(
    agentContext: AgentContext,
    {
      attachmentId,
      proofFormats,
    }: ProofFormatCreateProposalOptions<JsonLdProofFormat>
  ): Promise<ProofFormatCreateReturn> {
    const format = new ProofFormatSpec({
      format: JSONLD_PRESENTATION_PROPOSAL,
      attachmentId,
    });

    const jsonLdFormat = proofFormats.jsonld;
    if (!jsonLdFormat) {
      throw Error("Missing jsonld format to create proposal attachment format");
    }

    // this does the validation
    JsonTransformer.fromJSON(jsonLdFormat.presentation, JsonLdProofDetail);

    const attachment = this.getFormatData(jsonLdFormat, format.attachmentId);

    return { attachment, format };
  }

  /**
   * Processes a proposal for the JSON-LD proof format.
   * @param agentContext The agent context.
   * @param options The options for processing the proposal.
   * @returns A promise that resolves when the proposal is processed.
   */
  public async processProposal(
    agentContext: AgentContext,
    { attachment }: ProofFormatProcessOptions
  ): Promise<void> {
    const proposalJson =
      attachment.getDataAsJson<JsonLdFormatDataProofDetail>();

    // fromJson also validates
    JsonTransformer.fromJSON(proposalJson, JsonLdProofDetail);
  }

  /**
   * Accepts a proposal for the JSON-LD proof format.
   * @param agentContext The agent context.
   * @param options The options for accepting the proposal.
   * @returns A promise that resolves to the accepted proposal.
   * @throws AriesFrameworkError if the verification method is missing in the proof data.
   */
  public async acceptProposal(
    agentContext: AgentContext,
    {
      proposalAttachment,
      attachmentId,
    }: ProofFormatAcceptProposalOptions<JsonLdProofFormat>
  ): Promise<ProofFormatCreateReturn> {
    const format = new ProofFormatSpec({
      format: JSONLD_PRESENTATION_REQUEST,
      attachmentId,
    });

    const proposalJson =
      proposalAttachment.getDataAsJson<JsonLdFormatDataProofDetail>();
    JsonTransformer.fromJSON(proposalJson, JsonLdProofDetail);

    const request = {
      ...proposalJson,
      // We never want to reuse the nonce from the proposal, as this will allow replay attacks
      nonce: await agentContext.wallet.generateNonce(),
    };

    const attachment = this.getFormatData(request, format.attachmentId);

    return { attachment, format };
  }

  /**
   * Creates a request for the JSON-LD proof format.
   * @param agentContext The agent context.
   * @param options The options for creating the request.
   * @returns A promise that resolves to the created request.
   * @throws Error if the jsonld format is missing.
   */
  public async createRequest(
    agentContext: AgentContext,
    {
      attachmentId,
      proofFormats,
    }: FormatCreateRequestOptions<JsonLdProofFormat>
  ): Promise<ProofFormatCreateReturn> {
    const format = new ProofFormatSpec({
      format: JSONLD_PRESENTATION_REQUEST,
      attachmentId,
    });

    const jsonLdFormat = proofFormats.jsonld;
    if (!jsonLdFormat) {
      throw Error("Missing jsonld format to create proposal attachment format");
    }

    // this does the validation
    JsonTransformer.fromJSON(jsonLdFormat.presentation, JsonLdProofDetail);

    const attachment = this.getFormatData(jsonLdFormat, format.attachmentId);

    return { attachment, format };
  }

  /**
   * Processes a request for the JSON-LD proof format.
   * @param agentContext The agent context.
   * @param options The options for processing the request.
   * @returns A promise that resolves when the request is processed.
   */
  public async processRequest(
    agentContext: AgentContext,
    { attachment }: ProofFormatProcessOptions
  ): Promise<void> {
    const requestJson = attachment.getDataAsJson<JsonLdFormatDataProofDetail>();

    // fromJson also validates
    JsonTransformer.fromJSON(requestJson, JsonLdCredentialDetail);
  }

  /**
   * Accepts a request for the JSON-LD proof format.
   * @param agentContext The agent context.
   * @param options The options for accepting the request.
   * @returns A promise that resolves to the accepted request.
   * @throws AriesFrameworkError if the verification method is missing in the proof data.
   */
  public async acceptRequest(
    agentContext: AgentContext,
    {
      proofFormats,
      requestAttachment,
      attachmentId,
    }: ProofFormatAcceptRequestOptions<JsonLdProofFormat>
  ): Promise<ProofFormatCreateReturn> {
    const format = new ProofFormatSpec({
      format: JSONLD_PRESENTATION,
      attachmentId,
    });
    const w3cJsonLdCredentialService = agentContext.dependencyManager.resolve(
      W3cJsonLdCredentialService
    );

    const requestJson =
      requestAttachment.getDataAsJson<JsonLdFormatDataProofDetail>(); // I think this will error

    const verificationMethod =
      proofFormats?.jsonld?.verificationMethod ??
      (await this.deriveVerificationMethod(
        agentContext,
        requestJson.presentation,
        requestJson
      ));

    if (!verificationMethod) {
      throw new AriesFrameworkError(
        "Missing verification method in proof data"
      );
    }

    const presentation = JsonTransformer.fromJSON(
      requestJson.presentation,
      W3cPresentation
    );

    const verifiablePresentation =
      await w3cJsonLdCredentialService.signPresentation(agentContext, {
        format: ClaimFormat.LdpVp,
        presentation,
        proofType: requestJson.options.proofType,
        proofPurpose: requestJson.options.proofPurpose,
        challenge: requestJson.options.challenge as string,
        verificationMethod: verificationMethod,
      });

    const attachment = this.getFormatData(
      JsonTransformer.toJSON(verifiablePresentation),
      format.attachmentId
    );

    return { attachment, format };
  }

  /**
   * Derives a verification method using the holder from the given verifiable presentation.
   * @param agentContext The agent context.
   * @param presentationAsJson The verifiable presentation as JSON.
   * @param presentationRequest The presentation request.
   * @returns A promise that resolves to the derived verification method.
   * @throws AriesFrameworkError if the holder did is invalid or if no key type is found for the proof type.
   */
  private async deriveVerificationMethod(
    agentContext: AgentContext,
    presentationAsJson: JsonPresentation,
    presentationRequest: JsonLdFormatDataProofDetail
  ): Promise<string> {
    const didResolver =
      agentContext.dependencyManager.resolve(DidResolverService);
    const w3cJsonLdCredentialService = agentContext.dependencyManager.resolve(
      W3cJsonLdCredentialService
    );

    const presentation = JsonTransformer.fromJSON(
      presentationAsJson,
      W3cPresentation
    );

    // extract holder from vc (can be string or Holder)
    let holderDid: string | undefined =
      typeof presentation.holder === "string"
        ? presentation.holder
        : presentation.holder?.id;

    // this will throw an error if the holder did is invalid
    const holderDidDocument = await didResolver.resolveDidDocument(
      agentContext,
      holderDid as string
    );

    // find first key which matches proof type
    const proofType = presentationRequest.options.proofType;

    // actually gets the key type(s)
    const keyType =
      w3cJsonLdCredentialService.getVerificationMethodTypesByProofType(
        proofType
      );

    if (!keyType || keyType.length === 0) {
      throw new AriesFrameworkError(
        `No Key Type found for proofType ${proofType}`
      );
    }

    const verificationMethod = await findVerificationMethodByKeyType(
      keyType[0],
      holderDidDocument
    );
    if (!verificationMethod) {
      throw new AriesFrameworkError(
        `Missing verification method for key type ${keyType}`
      );
    }

    return verificationMethod.id;
  }

  /**
   * Processes a presentation for the JSON-LD proof format.
   * @param agentContext The agent context.
   * @param options The options for processing the presentation.
   * @returns A promise that resolves to a boolean indicating if the presentation is valid.
   * @throws AriesFrameworkError if the presentation fails to validate.
   */
  public async processPresentation(
    agentContext: AgentContext,
    { requestAttachment, attachment }: ProofFormatProcessPresentationOptions
  ): Promise<boolean> {
    const w3cJsonLdCredentialService = agentContext.dependencyManager.resolve(
      W3cJsonLdCredentialService
    );

    const proofJson = attachment.getDataAsJson();
    const presentation = JsonTransformer.fromJSON(
      proofJson,
      W3cJsonLdVerifiablePresentation
    );
    const proofRequestJson =
      requestAttachment.getDataAsJson<JsonLdFormatDataProofDetail>();

    this.verifyReceivedPresentationMatchesRequest(
      presentation,
      proofRequestJson
    );

    const result = await w3cJsonLdCredentialService.verifyPresentation(
      agentContext,
      {
        presentation: presentation,
        challenge: proofRequestJson.options.challenge as string,
      }
    );
    if (result && !result.isValid) {
      throw new AriesFrameworkError(
        `Failed to validate credential, error = ${result.error}`
      );
    }

    return result.isValid;
  }

  /**
   * Retrieves the credentials for a request in the JSON-LD proof format.
   * @param agentContext The agent context.
   * @param options The options for retrieving the credentials.
   * @returns A promise that resolves to the credentials for the request.
   */
  public async getCredentialsForRequest(
    agentContext: AgentContext,
    {
      requestAttachment,
      proofFormats,
    }: ProofFormatGetCredentialsForRequestOptions<JsonLdProofFormat>
  ): Promise<ProofFormatGetCredentialsForRequestReturn<JsonLdProofFormat>> {
    const proofRequestJson =
      requestAttachment.getDataAsJson<JsonLdFormatDataProofDetail>();

    const credentialsForRequest = await this._getCredentialsForRequest(
      agentContext,
      proofRequestJson
    );

    return credentialsForRequest;
  }

  /**
   * Selects the credentials for a request in the JSON-LD proof format.
   * @param agentContext The agent context.
   * @param options The options for selecting the credentials.
   * @returns A promise that resolves to the selected credentials for the request.
   */
  public async selectCredentialsForRequest(
    agentContext: AgentContext,
    {
      requestAttachment,
      proofFormats,
    }: ProofFormatSelectCredentialsForRequestOptions<JsonLdProofFormat>
  ): Promise<ProofFormatSelectCredentialsForRequestReturn<JsonLdProofFormat>> {
    const proofRequestJson =
      requestAttachment.getDataAsJson<JsonLdFormatDataProofDetail>();

    const selectedCredentials = this._selectCredentialsForRequest(
      agentContext,
      proofRequestJson
    );

    return selectedCredentials;
  }

  /**
   * Determines if the service should auto respond to a proposal in the JSON-LD proof format.
   * @param agentContext The agent context.
   * @param options The options for auto responding to the proposal.
   * @returns A promise that resolves to a boolean indicating if the service should auto respond.
   */
  public async shouldAutoRespondToProposal(
    agentContext: AgentContext,
    {
      proposalAttachment,
      requestAttachment,
    }: ProofFormatAutoRespondProposalOptions
  ): Promise<boolean> {
    const proposalJson =
      proposalAttachment.getDataAsJson<JsonLdFormatDataProofDetail>();
    const requestJson =
      requestAttachment.getDataAsJson<JsonLdFormatDataProofDetail>();

    return true; // TODO: needs to obviously not be hardcoded, look at AnonCreds
  }

  /**
   * Determines if the service should auto respond to a request in the JSON-LD proof format.
   * @param agentContext The agent context.
   * @param options The options for auto responding to the request.
   * @returns A promise that resolves to a boolean indicating if the service should auto respond.
   */
  public async shouldAutoRespondToRequest(
    agentContext: AgentContext,
    {
      proposalAttachment,
      requestAttachment,
    }: ProofFormatAutoRespondRequestOptions
  ): Promise<boolean> {
    const proposalJson =
      proposalAttachment.getDataAsJson<JsonLdFormatDataProofDetail>();
    const requestJson =
      requestAttachment.getDataAsJson<JsonLdFormatDataProofDetail>();

    return true; // TODO: needs to obviously not be hardcoded, look at AnonCreds
  }

  /**
   * Determines if the service should auto respond to a presentation in the JSON-LD proof format.
   * @param agentContext The agent context.
   * @param options The options for auto responding to the presentation.
   * @returns A promise that resolves to a boolean indicating if the service should auto respond.
   */
  public async shouldAutoRespondToPresentation(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _agentContext: AgentContext,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _options: ProofFormatAutoRespondPresentationOptions
  ): Promise<boolean> {
    // The presentation is already verified in processPresentation, so we can just return true here.
    // It's only an ack, so it's just that we received the presentation.
    return true;
  }

  /**
   * Determines if the service supports the given format identifier.
   * @param formatIdentifier The format identifier.
   * @returns A boolean indicating if the service supports the format.
   */
  public supportsFormat(formatIdentifier: string): boolean {
    const supportedFormats = [
      JSONLD_PRESENTATION_PROPOSAL,
      JSONLD_PRESENTATION_REQUEST,
      JSONLD_PRESENTATION,
    ];
    return supportedFormats.includes(formatIdentifier);
  }

  /**
   * Verifies that the received presentation matches the request.
   * @param presentation The received presentation.
   * @param request The request.
   * @throws AriesFrameworkError if the presentation proof arrays are not supported or if the presentation proof created timestamp does not match the request.
   */
  private verifyReceivedPresentationMatchesRequest(
    presentation: W3cJsonLdVerifiablePresentation,
    request: JsonLdFormatDataProofDetail
  ): void {
    const jsonPresentation = JsonTransformer.toJSON(presentation);
    delete jsonPresentation.proof;

    if (Array.isArray(presentation.proof)) {
      throw new AriesFrameworkError(
        "Presentation proof arrays are not supported"
      );
    }

    if (
      request.options.created &&
      presentation.proof.created !== request.options.created
    ) {
      throw new AriesFrameworkError(
        "Received presentation proof created does not match created from presentation request"
      );
    }

    if (presentation.proof.domain !== request.options.domain) {
      throw new AriesFrameworkError(
        "Received presentation proof domain does not match domain from presentation request"
      );
    }

    if (presentation.proof.challenge !== request.options.challenge) {
      throw new AriesFrameworkError(
        "Received presentation proof challenge does not match challenge from presentation request"
      );
    }

    if (presentation.proof.type !== request.options.proofType) {
      throw new AriesFrameworkError(
        "Received presentation proof type does not match proof type from presentation request"
      );
    }

    if (presentation.proof.proofPurpose !== request.options.proofPurpose) {
      throw new AriesFrameworkError(
        "Received presentation proof purpose does not match proof purpose from presentation request"
      );
    }

    // Check whether the received presentation (minus the proof) matches the presentation request
    // if (!areObjectsEqual(jsonPresentation, request.presentation)) {
    //   throw new AriesFrameworkError(
    //     "Received presentation does not match presentation request"
    //   );
    // }

    // TODO: add check for the presentationStatus once this is supported in AFJ
  }

  private async _getCredentialsForRequest(
    // return all credentials
    agentContext: AgentContext,
    proofRequestJson: JsonLdFormatDataProofDetail
  ): Promise<ProofFormatGetCredentialsForRequestReturn<JsonLdProofFormat>> {
    const w3cCredentialService =
      agentContext.dependencyManager.resolve(W3cCredentialService);
    const credentials = await w3cCredentialService.getAllCredentialRecords(
      agentContext
    );

    const w3cVerifiableCredentials: (
      | W3cJsonLdVerifiableCredential
      | W3cJwtVerifiableCredential
    )[] = [];

    for (const credential of credentials) {
      const verifiableCredential = JsonTransformer.fromJSON(
        credential,
        W3cJsonLdVerifiableCredential
      );
      w3cVerifiableCredentials.push(verifiableCredential);
    }

    return w3cVerifiableCredentials;
  }

  private async _selectCredentialsForRequest(
    agentContext: AgentContext,
    proofRequestJson: JsonLdFormatDataProofDetail
  ): Promise<ProofFormatSelectCredentialsForRequestReturn<JsonLdProofFormat>> {
    const w3cCredentialService =
      agentContext.dependencyManager.resolve(W3cCredentialService);
    const credentials = await this._getCredentialsForRequest(
      agentContext,
      proofRequestJson
    );

    const verifiablePresentation =
      (await w3cCredentialService.createPresentation({
        credentials: credentials,
        holder: proofRequestJson.presentation.holder as string,
      })) as W3cJsonLdVerifiablePresentation | W3cJwtVerifiablePresentation;

    return verifiablePresentation;
  }

  /**
   * Returns an object of type {@link Attachment} for use in credential exchange messages.
   * It looks up the correct format identifier and encodes the data as a base64 attachment.
   *
   * @param data The data to include in the attach object
   * @param id the attach id from the formats component of the message
   */
  private getFormatData(data: unknown, id: string): Attachment {
    const attachment = new Attachment({
      id,
      mimeType: "application/json",
      data: new AttachmentData({
        base64: JsonEncoder.toBase64(data),
      }),
    });

    return attachment;
  }
}
