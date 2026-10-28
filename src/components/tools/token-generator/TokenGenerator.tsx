"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Notice } from "@/components/ui/Notice";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Input, Label, Textarea } from "@/components/ui/Field";
import { RangeField } from "@/components/ui/RangeField";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Switch } from "@/components/ui/Switch";
import {
  MAX_TOKENS,
  MAX_TOKEN_BYTES,
  MAX_TOKEN_CHARS,
  MIN_TOKEN_BYTES,
  MIN_TOKEN_CHARS,
  RECOMMENDED_MIN_BYTES,
  alphabetFor,
  encodeToken,
  encodedLength,
  entropyBits,
  generateCharacterTokens,
  generateTokenBytes,
  validateCharacterSettings,
  validateSettings,
  type CharacterSet,
} from "@/lib/tools/token";

type Mode = "characters" | "hex" | "base64url";

const SWITCHES: { set: CharacterSet; label: string }[] = [
  { set: "uppercase", label: "Uppercase (ABC…)" },
  { set: "numbers", label: "Numbers (123…)" },
  { set: "lowercase", label: "Lowercase (abc…)" },
  { set: "symbols", label: "Symbols (!-;…)" },
];

export function TokenGenerator() {
  const [mode, setMode] = useState<Mode>("characters");
  const [sets, setSets] = useState<CharacterSet[]>(["uppercase", "lowercase", "numbers"]);
  const [length, setLength] = useState(64);
  const [bytes, setBytes] = useState(32);
  const [countText, setCountText] = useState("1");
  // Tokens exist only in this component's memory: never in storage or the URL.
  const [tokens, setTokens] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const outputId = useId();
  const countId = useId();

  const count = Number(countText);
  const invalid =
    mode === "characters" ? validateCharacterSettings({ length, count, sets }) : validateSettings({ bytes, count, format: mode });

  const generate = useCallback(() => {
    const fail = (message: string) => {
      setTokens([]);
      setError(message);
    };
    if (mode === "characters") {
      const result = generateCharacterTokens({ length, count, sets });
      if (!result.ok) return fail(result.error);
      setTokens(result.tokens);
    } else {
      const result = generateTokenBytes({ bytes, count, format: mode });
      if (!result.ok) return fail(result.error);
      setTokens(result.tokens.map((t) => encodeToken(t, mode)));
      result.tokens.forEach((t) => t.fill(0));
    }
    setError(null);
  }, [mode, length, bytes, count, sets]);

  // Like a password generator, a new token is created whenever the settings change.
  useEffect(() => {
    if (invalid) return;
    const handle = window.setTimeout(generate, 0);
    return () => window.clearTimeout(handle);
  }, [generate, invalid]);

  const toggle = (set: CharacterSet) => (on: boolean) =>
    setSets((current) => (on ? [...current, set] : current.filter((s) => s !== set)));

  const output = tokens.join("\n");
  const bits = mode === "characters" ? entropyBits(length, alphabetFor(sets).length) : bytes * 8;
  const chars = mode === "characters" ? length : encodedLength(bytes, mode);

  return (
    <div className="flex flex-col gap-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 rounded-md border border-border bg-surface p-5 sm:p-8">
        <div className="flex justify-center">
          <SegmentedControl
            label="Format"
            hideLabel
            value={mode}
            onChange={setMode}
            options={[
              { value: "characters", label: "Characters" },
              { value: "hex", label: "Hex" },
              { value: "base64url", label: "Base64URL" },
            ]}
          />
        </div>

        {mode === "characters" ? (
          <fieldset className="mx-auto grid w-full max-w-xl grid-cols-1 gap-x-12 gap-y-4 sm:grid-cols-2">
            <legend className="sr-only">Characters to include</legend>
            {SWITCHES.map(({ set, label }) => (
              <Switch key={set} label={label} checked={sets.includes(set)} onChange={toggle(set)} />
            ))}
          </fieldset>
        ) : null}

        {mode === "characters" ? (
          <RangeField label={`Length (${length} characters)`} value={length} min={MIN_TOKEN_CHARS} max={MAX_TOKEN_CHARS} onChange={setLength} />
        ) : (
          <RangeField label={`Randomness (${bytes} bytes)`} value={bytes} min={MIN_TOKEN_BYTES} max={MAX_TOKEN_BYTES} unit="B" onChange={setBytes} />
        )}

        {invalid ? <Alert title="Check the settings">{invalid}</Alert> : null}
        {error ? <Alert title="Could not generate tokens">{error}</Alert> : null}

        <div className="flex flex-col gap-2">
          <label htmlFor={outputId} className="sr-only">
            Generated {count === 1 ? "token" : "tokens"}
          </label>
          <Textarea
            id={outputId}
            value={invalid ? "" : output}
            readOnly
            autoComplete="off"
            spellCheck={false}
            placeholder="Your token appears here"
            className="min-h-36 bg-subtle text-center break-all"
            rows={Math.min(Math.max(tokens.length * Math.ceil(chars / 70), 4), 16)}
          />
          <p role="status" className="text-center font-mono text-xs text-muted-foreground">
            {invalid
              ? "No token: fix the settings above."
              : `${mode === "characters" ? `${alphabetFor(sets).length}-character alphabet` : mode === "hex" ? "Hex" : "Base64URL"} · ${Math.floor(bits)} bits of entropy · ${chars} characters${count > 1 ? ` · ${count} tokens` : ""}`}
          </p>
          {!invalid && bits < RECOMMENDED_MIN_BYTES * 8 ? (
            <p className="text-center text-sm text-danger">
              Less than 128 bits of entropy is too weak for secrets such as API keys or session tokens. Increase the length.
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-end justify-center gap-3">
          <div className="flex items-center gap-2">
            <Label htmlFor={countId} className="whitespace-nowrap">
              How many
            </Label>
            <Input
              id={countId}
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_TOKENS}
              value={countText}
              onChange={(e) => setCountText(e.target.value)}
              aria-invalid={!Number.isInteger(count) || count < 1 || count > MAX_TOKENS}
              className="h-10 w-20"
            />
          </div>
          <CopyButton text={invalid ? "" : output} label={count > 1 ? "Copy all" : "Copy"} ariaLabel="Copy tokens" variant="primary" />
          <Button size="sm" onClick={generate} disabled={invalid !== null}>
            Refresh
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setTokens([])} disabled={!tokens.length || invalid !== null}>
            Clear
          </Button>
        </div>
      </div>

      <Notice className="mx-auto w-full max-w-3xl" title="Keep generated tokens secret">
        Tokens are generated in your browser and are not sent, logged or saved. Store them securely, for example in a
        secrets manager. This tool only creates random values: it does not register, validate or activate credentials
        with any service.
      </Notice>
    </div>
  );
}
