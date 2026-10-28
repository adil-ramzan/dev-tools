"use client";

import { useState } from "react";
import { EncodeDecodeTool } from "@/components/tools/EncodeDecodeTool";
import { Checkbox } from "@/components/ui/Checkbox";
import { formatBytes } from "@/lib/format";
import { decodeBase64, encodeBase64 } from "@/lib/tools/base64";

export function Base64EncoderDecoder() {
  const [urlSafe, setUrlSafe] = useState(false);

  return (
    <EncodeDecodeTool
      sample="Hello, world! Grüße aus München 👋"
      inputPlaceholder="Text to encode, or Base64 to decode"
      encode={(input) => {
        const result = encodeBase64(input, { urlSafe });
        return result.ok ? { ok: true, output: result.output, note: `${formatBytes(result.bytes)} of UTF-8 text encoded.` } : result;
      }}
      decode={(input) => {
        const result = decodeBase64(input);
        return result.ok ? { ok: true, output: result.output, note: `${formatBytes(result.bytes)} decoded as UTF-8 text.` } : result;
      }}
      options={
        <Checkbox
          label="URL-safe output (- and _, no padding)"
          checked={urlSafe}
          onChange={(e) => setUrlSafe(e.target.checked)}
          className="h-9"
        />
      }
    />
  );
}
