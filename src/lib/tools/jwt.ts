/**
 * JWT decoding. Decoding only reads the token: it does not verify the
 * signature, so it cannot tell whether a token is genuine or was tampered
 * with. Verification needs the issuer's key and must happen on the server
 * that accepts the token.
 */

import { decodeBase64 } from "@/lib/tools/base64";
import { formatJson, parseJson } from "@/lib/tools/json";

export type JwtClaim = {
  name: string;
  label?: string;
  /** Pretty JSON of the value. */
  value: string;
  /** For NumericDate claims (exp, nbf, iat): the time in milliseconds. */
  time?: number;
};

export type DecodedJwt = {
  header: string;
  payload: string;
  /** Raw base64url signature, or "" for unsecured tokens. */
  signature: string;
  algorithm: string | null;
  claims: JwtClaim[];
  /** NumericDate claims as milliseconds, when present and numeric. */
  expiresAt: number | null;
  notBefore: number | null;
  warnings: string[];
};

export type JwtResult = { ok: true; token: DecodedJwt } | { ok: false; error: string };

const REGISTERED: Record<string, string> = {
  iss: "Issuer",
  sub: "Subject",
  aud: "Audience",
  exp: "Expires",
  nbf: "Not before",
  iat: "Issued at",
  jti: "Token ID",
};
const TIME_CLAIMS = new Set(["exp", "nbf", "iat"]);
const PART_NAMES = ["header", "payload", "signature"];

function decodePart(part: string, name: string): { ok: true; text: string } | { ok: false; error: string } {
  const invalid = /[^A-Za-z0-9_-]/.exec(part);
  if (invalid) {
    const hint = invalid[0] === "=" || invalid[0] === "+" || invalid[0] === "/" ? " JWTs use base64url, which has no +, / or = characters." : "";
    return { ok: false, error: `The ${name} contains an invalid character "${invalid[0]}".${hint}` };
  }
  const decoded = decodeBase64(part);
  if (!decoded.ok) return { ok: false, error: `The ${name} could not be decoded: ${decoded.error}` };
  return { ok: true, text: decoded.output };
}

export function decodeJwt(input: string): JwtResult {
  const token = input.trim().replace(/^Bearer\s+/i, "").replace(/\s+/g, "");
  if (token === "") return { ok: false, error: "Paste a JWT to decode it." };

  const parts = token.split(".");
  if (parts.length === 5) {
    return { ok: false, error: "This looks like an encrypted JWT (JWE, five parts). Its contents can only be read with the decryption key, so it cannot be decoded here." };
  }
  if (parts.length !== 3) {
    return { ok: false, error: `A JWT has three parts separated by dots (header.payload.signature), but this has ${parts.length}.` };
  }
  const empty = parts.slice(0, 2).findIndex((p) => p === "");
  if (empty !== -1) return { ok: false, error: `The ${PART_NAMES[empty]} is empty.` };
  if (parts[2] !== "" && /[^A-Za-z0-9_-]/.test(parts[2])) {
    return { ok: false, error: "The signature contains characters that are not valid in base64url." };
  }

  const headerPart = decodePart(parts[0], "header");
  if (!headerPart.ok) return headerPart;
  const header = parseJson(headerPart.text);
  if (!header.ok) return { ok: false, error: `The header is not valid JSON: ${header.error.message}.` };
  if (header.value.type !== "object") return { ok: false, error: "The header must be a JSON object." };

  const payloadPart = decodePart(parts[1], "payload");
  if (!payloadPart.ok) return payloadPart;

  const warnings: string[] = [];
  const headerValues = JSON.parse(headerPart.text) as Record<string, unknown>;
  const algorithm = typeof headerValues.alg === "string" ? headerValues.alg : null;
  if (algorithm === null) warnings.push("The header has no alg (algorithm) parameter.");
  if (algorithm?.toLowerCase() === "none") {
    warnings.push("This is an unsecured token (alg: none). It has no signature, so anyone could have created or changed it.");
  } else if (parts[2] === "") {
    warnings.push("The signature is missing.");
  }

  const payload = parseJson(payloadPart.text);
  const claims: JwtClaim[] = [];
  let expiresAt: number | null = null;
  let notBefore: number | null = null;
  let payloadText: string;

  if (!payload.ok) {
    payloadText = payloadPart.text;
    warnings.push("The payload is not JSON, so it is shown as plain text. Standard JWT claims could not be read.");
  } else {
    payloadText = formatJson(payload.value, { indent: "  " });
    for (const w of payload.warnings) warnings.push(`Payload: ${w.message}.`);
    if (payload.value.type === "object") {
      for (const entry of payload.value.entries) {
        const claim: JwtClaim = { name: entry.key, label: REGISTERED[entry.key], value: formatJson(entry.value, { indent: "  " }) };
        if (TIME_CLAIMS.has(entry.key)) {
          if (entry.value.type === "number" && Number.isFinite(Number(entry.value.raw))) {
            claim.time = Number(entry.value.raw) * 1000;
            if (entry.key === "exp") expiresAt = claim.time;
            if (entry.key === "nbf") notBefore = claim.time;
          } else {
            warnings.push(`The ${entry.key} claim should be a number of seconds since 1970 (a NumericDate).`);
          }
        }
        claims.push(claim);
      }
    } else {
      warnings.push("The payload is JSON but not an object, so it has no claims.");
    }
  }

  return {
    ok: true,
    token: {
      header: formatJson(header.value, { indent: "  " }),
      payload: payloadText,
      signature: parts[2],
      algorithm,
      claims,
      expiresAt,
      notBefore,
      warnings,
    },
  };
}

export type JwtTimeStatus =
  | { kind: "expired"; at: number }
  | { kind: "not-yet-valid"; from: number }
  | { kind: "valid"; until: number | null };

/** Whether the token's exp/nbf times allow it to be used at `now` (ms). This is not a validity check. */
export function jwtTimeStatus(token: DecodedJwt, now: number): JwtTimeStatus {
  if (token.notBefore !== null && now < token.notBefore) return { kind: "not-yet-valid", from: token.notBefore };
  if (token.expiresAt !== null && now >= token.expiresAt) return { kind: "expired", at: token.expiresAt };
  return { kind: "valid", until: token.expiresAt };
}
