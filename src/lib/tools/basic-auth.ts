import { decodeBase64, encodeBase64 } from "@/lib/tools/base64";

/**
 * HTTP Basic authentication headers (RFC 7617): the user-id and password
 * joined by a colon, encoded as UTF-8 and then Base64:
 *
 *   Authorization: Basic base64(utf8(user-id ":" password))
 *
 * The user-id cannot contain a colon, because the first colon separates it
 * from the password; the password can. Neither may contain control
 * characters. Base64 is an encoding, not encryption: anyone who sees the
 * header can read the password, so Basic authentication is only safe over
 * HTTPS.
 */

export type BasicAuthResult =
  | { ok: true; header: string; token: string; warnings: string[] }
  | { ok: false; error: string; field: "username" | "password" };

const CONTROL = /[\u0000-\u001f\u007f]/;

export function buildBasicAuth(username: string, password: string): BasicAuthResult {
  if (username === "") return { ok: false, error: "Enter a username.", field: "username" };
  if (username.includes(":")) {
    return { ok: false, error: "The username cannot contain a colon (:), because the first colon separates the username from the password (RFC 7617).", field: "username" };
  }
  if (CONTROL.test(username)) return { ok: false, error: "The username contains a control character such as a tab or line break, which RFC 7617 does not allow.", field: "username" };
  if (CONTROL.test(password)) return { ok: false, error: "The password contains a control character such as a tab or line break, which RFC 7617 does not allow.", field: "password" };

  const encoded = encodeBase64(`${username}:${password}`);
  if (!encoded.ok) return { ok: false, error: encoded.error, field: /[\uD800-\uDFFF]/.test(username) ? "username" : "password" };

  const warnings: string[] = [];
  if (/[^\x20-\x7e]/.test(username + password)) {
    warnings.push("The credentials contain non-ASCII characters, encoded as UTF-8 as RFC 7617 specifies. Some older servers expect ISO-8859-1 and may reject them.");
  }
  if (password === "") warnings.push("The password is empty.");
  return { ok: true, header: `Authorization: Basic ${encoded.output}`, token: encoded.output, warnings };
}

export type DecodedBasicAuth = { ok: true; username: string; password: string } | { ok: false; error: string };

/** Reads the username and password back from a header, "Basic …" value or bare token. */
export function decodeBasicAuth(input: string): DecodedBasicAuth {
  const text = input.trim().replace(/^authorization\s*:\s*/i, "");
  const match = /^(?:basic\s+)?([A-Za-z0-9+/=]+)$/i.exec(text);
  if (!match) {
    if (/^bearer\s/i.test(text)) return { ok: false, error: "This is a Bearer token, not Basic authentication. Use the JWT Decoder for JSON Web Tokens." };
    return { ok: false, error: "Paste a header such as Authorization: Basic dXNlcjpwYXNz, or just the Base64 part." };
  }
  const decoded = decodeBase64(match[1]);
  if (!decoded.ok) return { ok: false, error: decoded.error };
  const colon = decoded.output.indexOf(":");
  if (colon === -1) return { ok: false, error: "The decoded value has no colon, so it is not a username:password pair." };
  return { ok: true, username: decoded.output.slice(0, colon), password: decoded.output.slice(colon + 1) };
}
