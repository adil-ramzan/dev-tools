"use client";

import { useState } from "react";
import { EncodeDecodeTool } from "@/components/tools/EncodeDecodeTool";
import { Checkbox } from "@/components/ui/Checkbox";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { decodeUrl, encodeUrl, type UrlMode } from "@/lib/tools/url";

export function UrlEncoderDecoder() {
  const [mode, setMode] = useState<UrlMode>("component");
  const [plusAsSpace, setPlusAsSpace] = useState(false);

  const sample =
    mode === "component" ? "Café & Bar / 50% off?" : "https://example.com/search results?q=café crème&lang=fr";

  return (
    <EncodeDecodeTool
      sample={sample}
      inputPlaceholder={mode === "component" ? "Text or a single value, e.g. a b&c" : "A complete URL, e.g. https://example.com/a b"}
      encode={(input) => encodeUrl(input, mode)}
      decode={(input) => decodeUrl(input, mode, { plusAsSpace })}
      options={
        <>
          <SegmentedControl
            label="Encode as"
            value={mode}
            onChange={setMode}
            options={[
              { value: "component", label: "URL component" },
              { value: "full", label: "Full URL" },
            ]}
          />
          <Checkbox
            label={
              <span>
                Decode <code className="font-mono">+</code> as a space
              </span>
            }
            checked={plusAsSpace}
            onChange={(e) => setPlusAsSpace(e.target.checked)}
            className="h-9"
          />
        </>
      }
    />
  );
}
