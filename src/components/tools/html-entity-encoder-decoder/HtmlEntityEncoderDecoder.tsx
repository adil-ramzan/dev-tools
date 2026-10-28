"use client";

import { useEffect, useId, useState } from "react";
import { EncodeDecodeTool } from "@/components/tools/EncodeDecodeTool";
import { Alert } from "@/components/ui/Alert";
import { Notice } from "@/components/ui/Notice";
import { Checkbox } from "@/components/ui/Checkbox";
import { Label, Select } from "@/components/ui/Field";
import {
  decodeHtmlEntities,
  encodeHtmlEntities,
  loadEntities,
  type EntitiesModule,
  type NonAsciiMode,
} from "@/lib/tools/html-entities";

const SAMPLE = `<p class="note">Tom & Jerry's "café" costs < €5 — &copy; 2024</p>`;

export function HtmlEntityEncoderDecoder() {
  const [lib, setLib] = useState<EntitiesModule | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [nonAscii, setNonAscii] = useState<NonAsciiMode>("keep");
  const [doubleEncode, setDoubleEncode] = useState(false);
  const [strict, setStrict] = useState(false);
  const nonAsciiId = useId();

  // The entity tables load in the background as soon as the page is ready.
  useEffect(() => {
    loadEntities().then(setLib, () => setLoadFailed(true));
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {loadFailed ? (
        <Alert title="The entity table could not be loaded">
          Decoding and named references are unavailable. Check your connection and reload the page.
        </Alert>
      ) : null}
      <EncodeDecodeTool
        sample={SAMPLE}
        inputPlaceholder="Text to encode, or HTML with entities to decode"
        encode={(input) => {
          const result = encodeHtmlEntities(input, { nonAscii, doubleEncode }, lib);
          if (!result.ok) return result;
          const summary = `${result.changed.toLocaleString("en-US")} ${result.changed === 1 ? "character" : "characters"} encoded.`;
          return { ok: true, output: result.output, note: result.note ? `${summary} ${result.note}` : summary };
        }}
        decode={(input) => {
          if (!lib) return { ok: false, error: "The entity table is still loading. Try again in a moment." };
          const result = decodeHtmlEntities(input, { strict }, lib);
          if (!result.ok) return result;
          const summary = `${result.changed.toLocaleString("en-US")} ${result.changed === 1 ? "reference" : "references"} decoded.`;
          return { ok: true, output: result.output, note: result.note ? `${summary} ${result.note}` : summary };
        }}
        options={
          <>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={nonAsciiId}>Non-ASCII characters</Label>
              <Select
                id={nonAsciiId}
                value={nonAscii}
                onChange={(e) => setNonAscii(e.target.value as NonAsciiMode)}
                className="w-56"
              >
                <option value="keep">Keep as is (UTF-8 pages)</option>
                <option value="named">Named where available (&amp;eacute;)</option>
                <option value="numeric">Numeric (&amp;#xE9;)</option>
              </Select>
            </div>
            <div className="flex flex-col gap-2 pb-1">
              <Checkbox label="Encode existing entities again" checked={doubleEncode} onChange={(e) => setDoubleEncode(e.target.checked)} />
              <Checkbox label="Decode: require semicolons" checked={strict} onChange={(e) => setStrict(e.target.checked)} />
            </div>
          </>
        }
      />
      <Notice title="Encoding is not sanitizing">
        Escaping makes text safe to show between HTML tags or inside a quoted attribute value. It does not make untrusted
        HTML safe, and it is not enough inside &lt;script&gt; or &lt;style&gt;, unquoted attributes, event handlers or
        URLs such as javascript: links. To accept user-written HTML, use a dedicated sanitizer such as DOMPurify.
      </Notice>
    </div>
  );
}
