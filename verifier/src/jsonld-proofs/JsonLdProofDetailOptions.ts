import { IsObject, IsOptional, IsString } from "class-validator";

export interface JsonLdProofDetailProofStatusOptions {
  type: string;
}

export class JsonLdProofDetailProofStatus {
  public constructor(options: JsonLdProofDetailProofStatusOptions) {
    if (options) {
      this.type = options.type;
    }
  }
  @IsString()
  public type!: string;
}

export interface JsonLdProofDetailOptionsOptions {
  proofPurpose: string;
  created?: string;
  domain?: string;
  challenge?: string;
  proofStatus?: JsonLdProofDetailProofStatus;
  proofType: string;
}

export class JsonLdProofDetailOptions {
  public constructor(options: JsonLdProofDetailOptionsOptions) {
    if (options) {
      this.proofPurpose = options.proofPurpose;
      this.created = options.created;
      this.domain = options.domain;
      this.challenge = options.challenge;
      this.proofStatus = options.proofStatus;
      this.proofType = options.proofType;
    }
  }

  @IsString()
  public proofPurpose!: string;

  @IsString()
  @IsOptional()
  public created?: string;

  @IsString()
  @IsOptional()
  public domain?: string;

  @IsString()
  @IsOptional()
  public challenge?: string;

  @IsString()
  public proofType!: string;

  @IsOptional()
  @IsObject()
  public proofStatus?: JsonLdProofDetailProofStatus;
}
