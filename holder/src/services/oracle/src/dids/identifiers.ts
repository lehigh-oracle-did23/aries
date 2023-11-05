import type { ParsedDid } from "@aries-framework/core";

import { TypedArrayEncoder, utils } from "@aries-framework/core";
import { isBase58 } from "class-validator";

const ID_CHAR = "([a-z,A-Z,0-9,-])";
const IDENTIFIER = `((?:${ID_CHAR}*:)*(${ID_CHAR}+))`;

export const orclIdentifierRegex = new RegExp(
  `^did:orcl:${IDENTIFIER}$`
);

export type ParsedOracleDid = ParsedDid;
export function parseOracleDid(didUrl: string): ParsedOracleDid | null {
    if (didUrl === "" || !didUrl) return null;
    const sections = didUrl.match(orclIdentifierRegex);
    if (sections && utils.isValidUuid(sections[1])) {
        const parts: ParsedOracleDid = {
            did: `did:orcl:${sections[1]}`,
            method: "orcl",
            id: sections[1],
            didUrl,
        };
        return parts;
    }
    return null;
}
