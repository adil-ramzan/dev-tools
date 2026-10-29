"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { EncodeDecodeTool, type ConvertResult } from "@/components/tools/EncodeDecodeTool";
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
  const [loadFailed, setLoadFailed] = useState(false);
  const [nonAscii, setNonAscii] = useState<NonAsciiMode>("keep");
  const [doubleEncode, setDoubleEncode] = useState(false);
  const [strict, setStrict] = useState(false);
  const nonAsciiId = useId();
  const libRef = useRef<Promise<EntitiesModule> | null>(null);

  /**
   * The entity tables, loaded once. Encoding and decoding always wait for
   * them, so an action taken while they load gives the full result rather
   * than numeric-only or empty output. A failed load is retried next time.
   */
  const getLib = useCallback(() => {
    libRef.current ??= loadEntities().then(
      (lib) => {
        setLoadFailed(false);
        return lib;
      },
      (error: unknown) => {
        libRef.current = null;
        setLoadFailed(true);
        throw error;
      },
    );
    return libRef.current;
  }, []);

  // Start loading in the background as soon as the page is ready.
  useEffect(() => {
    getLib().catch(() => {});
  }, [getLib]);

  const withLib = async (run: (lib: EntitiesModule) => ConvertResult): Promise<ConvertResult> => {
    let lib: EntitiesModule;
    try {
      lib = await getLib();
    } catch {
      return { ok: false, error: "The entity table could not be loaded. Check your connection and try again." };
    }
    return run(lib);
  };

  return (
    <div className="flex flex-col gap-4">
      {loadFailed ? (
        <Alert title="The entity table could not be loaded">
          Encoding and decoding need it. Check your connection, then select Encode or Decode again to retry.
        </Alert>
      ) : null}
      <EncodeDecodeTool
        sample={SAMPLE}
        inputPlaceholder="Text to encode, or HTML with entities to decode"
        pendingMessage="Loading the HTML entity table…"
        encode={(input) =>
          withLib((lib) => {
            const result = encodeHtmlEntities(input, { nonAscii, doubleEncode }, lib);
            if (!result.ok) return result;
            const summary = `${result.changed.toLocaleString("en-US")} ${result.changed === 1 ? "character" : "characters"} encoded.`;
            return { ok: true, output: result.output, note: result.note ? `${summary} ${result.note}` : summary };
          })
        }
        decode={(input) =>
          withLib((lib) => {
            const result = decodeHtmlEntities(input, { strict }, lib);
            if (!result.ok) return result;
            const summary = `${result.changed.toLocaleString("en-US")} ${result.changed === 1 ? "reference" : "references"} decoded.`;
            return { ok: true, output: result.output, note: result.note ? `${summary} ${result.note}` : summary };
          })
        }
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
