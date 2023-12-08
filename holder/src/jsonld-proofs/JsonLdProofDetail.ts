import { Expose, Type } from "class-transformer";

import { W3cPresentation } from "@aries-framework/core";

import { JsonLdProofDetailOptions } from "./JsonLdProofDetailOptions";

export interface JsonLdProofDetailInputOptions {
  presentation: W3cPresentation;
  options: JsonLdProofDetailOptions;
}

/**
 * Class providing validation for the V2 json ld proof as per RFC-TBD (used to sign proofs)
 *
 */
export class JsonLdProofDetail {
  public constructor(options: JsonLdProofDetailInputOptions) {
    if (options) {
      this.presentation = options.presentation;
      this.options = options.options;
    }
  }

  @Type(() => W3cPresentation)
  public presentation!: W3cPresentation;

  @Expose({ name: "options" })
  @Type(() => JsonLdProofDetailOptions)
  public options!: JsonLdProofDetailOptions;
}
