import { RsaKeyPairGenerator } from "@/components/tools/rsa-key-pair-generator/RsaKeyPairGenerator";
import { ToolPage, toolMetadata } from "@/components/tools/ToolPage";
import type { ToolPageContent } from "@/types/tool";

const slug = "rsa-key-pair-generator";

const content: ToolPageContent = {
  metaDescription:
    "Generate 2048- or 4096-bit RSA-OAEP key pairs in your browser with Web Crypto, and export the public key as SPKI PEM and the private key as PKCS#8 PEM.",
  howItWorks: [
    "Choose a key size and select Generate key pair. Your browser's Web Crypto API creates the keys with its native cryptographic library, using RSA-OAEP with SHA-256 and the standard public exponent 65537.",
    "The public key is exported as SPKI PEM (`-----BEGIN PUBLIC KEY-----`) and the private key as PKCS#8 PEM (`-----BEGIN PRIVATE KEY-----`), the formats OpenSSL, Node.js, Java, Go and most libraries read. Copy them or download them as .pem files.",
    "The tool also shows the SHA-256 fingerprint of the public key, so you can check later that you are using the right one.",
  ],
  notes: [
    "The private key is exported without a password. Anyone who gets it can decrypt messages meant for you. Store it in a secrets manager or encrypt it, and never commit it to source control.",
    "The keys are generated for RSA-OAEP encryption. The PEM files are standard, but if you import them into Web Crypto, use them for encryption only; generate separate keys for signatures.",
    "2048 bits is the minimum recommended size today; 4096 bits is stronger but slower to generate and use.",
    "Keys exist only in this page's memory and are never sent or saved. For long-lived production keys, prefer generating them on the machine that will use them.",
  ],
  example: {
    description: "The beginning of an exported 2048-bit public key:",
    input: "Key size: 2048 bits",
    output: `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA…
-----END PUBLIC KEY-----`,
  },
  faqs: [
    {
      question: "Is it safe to generate keys in a browser?",
      answer:
        "The keys come from the browser's built-in cryptographic library and secure random number generator, not from JavaScript code on this page, and they are never sent anywhere. The main risk is handling: copying a private key through the clipboard or leaving it on screen. For high-value keys, generate them offline on the machine that uses them.",
    },
    {
      question: "2048 or 4096 bits?",
      answer:
        "2048-bit RSA is considered secure until about 2030 by NIST. Choose 4096 for keys that must stay secure longer, at the cost of slower operations.",
    },
    {
      question: "Can I use these keys for SSH?",
      answer:
        "Not directly: SSH uses its own public key format. You can convert the PEM public key with ssh-keygen -i -m PKCS8 -f public_key.pem, but ssh-keygen -t ed25519 is the simpler choice for SSH.",
    },
    {
      question: "Why is RSA-OAEP used?",
      answer:
        "OAEP is the recommended padding for RSA encryption. The older PKCS#1 v1.5 padding has known attacks and should not be used for new systems.",
    },
  ],
  related: ["hmac-generator", "token-generator", "hash-generator", "base64-file-converter"],
};

export const metadata = toolMetadata(slug, content);

export default function RsaKeyPairGeneratorPage() {
  return (
    <ToolPage slug={slug} content={content}>
      <RsaKeyPairGenerator />
    </ToolPage>
  );
}
