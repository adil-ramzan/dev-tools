import { JwtDecoder } from "@/components/tools/jwt-decoder/JwtDecoder";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "jwt-decoder";

const content: ToolPageContent = {
  metaDescription:
    "Decode a JSON Web Token in your browser to read its header, payload and claims and check when it expires. Decoding does not verify the signature.",
  howItWorks: [
    "A JSON Web Token (JWT) has three parts separated by dots: a header, a payload and a signature. The header and payload are JSON encoded with base64url, so anyone holding the token can read them. This tool decodes both parts and lists the claims, such as who issued the token (`iss`), who it is about (`sub`) and when it expires (`exp`).",
    "Times in `exp`, `nbf` (not before) and `iat` (issued at) are seconds since 1 January 1970. They are shown as dates in your time zone, and the tool compares `exp` and `nbf` with your device's clock to tell you whether the token has expired.",
    "Decoding is not verification. The signature proves the token was created by someone holding the issuer's key and has not been changed since, but checking it requires that key. This tool does not check signatures, so a decoded token may still be forged or tampered with. Always verify tokens on your server with a maintained JWT library.",
  ],
  notes: [
    "The token is decoded in your browser and is not sent anywhere. Even so, treat production tokens like passwords: anyone who has one can use it until it expires.",
    "Encrypted tokens (JWE, with five parts) cannot be decoded without the decryption key.",
    "Tokens with alg: none have no signature at all and should never be accepted by a server.",
  ],
  example: {
    description: "Decoding a token signed with HS256:",
    input: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MiIsIm5hbWUiOiJBZGEiLCJleHAiOjE3NjcyMjU2MDB9.dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk",
    inputLabel: "Token",
    output: `Header
{
  "alg": "HS256",
  "typ": "JWT"
}

Payload
{
  "sub": "42",
  "name": "Ada",
  "exp": 1767225600
}`,
    outputLabel: "Decoded",
  },
  faqs: [
    {
      question: "Does this tool verify the JWT signature?",
      answer:
        "No. It only decodes the header and payload, which are readable by anyone. Verifying the signature needs the issuer's secret or public key and should be done by the server that accepts the token.",
    },
    {
      question: "Is it safe to paste a token here?",
      answer:
        "The token is decoded in your browser and is not uploaded or stored. As a general rule, avoid pasting live production tokens into any website, and prefer test tokens or tokens that have already expired.",
    },
    {
      question: "Why does the tool say my token has expired?",
      answer:
        "The exp claim is earlier than your device's current time. If your clock is wrong, the result will be too. Servers usually also allow a small amount of clock difference.",
    },
    {
      question: "What do iss, sub and aud mean?",
      answer:
        "They are registered claims from RFC 7519: iss is the issuer that created the token, sub is the subject (usually a user ID) and aud is the audience, meaning the service the token is meant for.",
    },
    {
      question: "Why can't I decode my token?",
      answer:
        "Check that you copied the whole token with all three parts. The error message says which part failed. Tokens that are encrypted (JWE) or that are not JWTs at all, such as opaque session tokens, cannot be decoded.",
    },
  ],
  related: ["base64-encoder-decoder", "unix-timestamp-converter", "json-formatter", "url-encoder-decoder"],
};

export const metadata = toolMetadata(slug, content);

export default function JwtDecoderPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <JwtDecoder />
    </ToolPage>
  );
}
