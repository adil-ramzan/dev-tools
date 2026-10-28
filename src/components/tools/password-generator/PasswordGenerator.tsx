"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Input, Label, Textarea } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { RangeField } from "@/components/ui/RangeField";
import { Switch } from "@/components/ui/Switch";
import { cn } from "@/lib/cn";
import {
  AMBIGUOUS,
  DEFAULT_PASSWORD_SETTINGS,
  MAX_EXCLUDED,
  MAX_PASSWORDS,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  effectiveSets,
  generatePasswords,
  passwordEntropy,
  strengthFor,
  validatePasswordSettings,
} from "@/lib/tools/password";
import type { CharacterSet } from "@/lib/tools/token";

const SWITCHES: { set: CharacterSet; label: string }[] = [
  { set: "uppercase", label: "Uppercase (A–Z)" },
  { set: "lowercase", label: "Lowercase (a–z)" },
  { set: "numbers", label: "Numbers (0–9)" },
  { set: "symbols", label: "Symbols (!@#…)" },
];

const STRENGTH_TONE: Record<string, string> = { "Very weak": "text-danger", Weak: "text-danger", Fair: "text-foreground", Strong: "text-success", "Very strong": "text-success" };

export function PasswordGenerator() {
  const [length, setLength] = useState(DEFAULT_PASSWORD_SETTINGS.length);
  const [sets, setSets] = useState<CharacterSet[]>(DEFAULT_PASSWORD_SETTINGS.sets);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(DEFAULT_PASSWORD_SETTINGS.excludeAmbiguous);
  const [requireEach, setRequireEach] = useState(DEFAULT_PASSWORD_SETTINGS.requireEach);
  const [exclude, setExclude] = useState("");
  const [countText, setCountText] = useState("1");
  // Passwords exist only in this component's memory: never in storage, the URL or logs.
  const [passwords, setPasswords] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const ids = { output: useId(), count: useId(), exclude: useId(), excludeHint: useId() };

  const settings = { length, count: Number(countText), sets, excludeAmbiguous, exclude, requireEach };
  const invalid = validatePasswordSettings(settings);
  const customized =
    length !== DEFAULT_PASSWORD_SETTINGS.length || sets.length !== DEFAULT_PASSWORD_SETTINGS.sets.length || excludeAmbiguous || !requireEach || exclude !== "" || countText !== "1";

  const generate = useCallback(() => {
    const result = generatePasswords({ length, count: Number(countText), sets, excludeAmbiguous, exclude, requireEach });
    if (!result.ok) {
      setPasswords([]);
      setError(result.error);
      return;
    }
    setPasswords(result.passwords);
    setError(null);
  }, [length, countText, sets, excludeAmbiguous, exclude, requireEach]);

  // A new password appears whenever a setting changes, created in the browser after hydration.
  useEffect(() => {
    if (invalid) return;
    const handle = window.setTimeout(generate, 0);
    return () => window.clearTimeout(handle);
  }, [generate, invalid]);

  function reset() {
    setLength(DEFAULT_PASSWORD_SETTINGS.length);
    setSets(DEFAULT_PASSWORD_SETTINGS.sets);
    setExcludeAmbiguous(DEFAULT_PASSWORD_SETTINGS.excludeAmbiguous);
    setRequireEach(DEFAULT_PASSWORD_SETTINGS.requireEach);
    setExclude("");
    setCountText("1");
  }

  const toggle = (set: CharacterSet) => (on: boolean) => setSets((current) => (on ? [...current, set] : current.filter((s) => s !== set)));
  const bits = invalid ? 0 : passwordEntropy(settings);
  const strength = strengthFor(bits);
  const alphabetSize = effectiveSets(settings).reduce((n, s) => n + s.chars.length, 0);
  const output = invalid ? "" : passwords.join("\n");
  const count = Number(countText);

  return (
    <div className="flex flex-col gap-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 rounded-md border border-border bg-surface p-5 sm:p-8">
        <div className="flex flex-col gap-2">
          <label htmlFor={ids.output} className="sr-only">
            Generated {count === 1 ? "password" : "passwords"}
          </label>
          <Textarea
            id={ids.output}
            value={output}
            readOnly
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
            placeholder="Your password appears here"
            className="min-h-24 bg-subtle text-center text-base break-all"
            rows={Math.min(Math.max(passwords.length * Math.ceil(length / 60), 2), 14)}
          />
          <p role="status" className="text-center text-sm">
            {invalid ? (
              <span className="text-muted-foreground">No password: fix the settings below.</span>
            ) : (
              <>
                <span className={cn("font-medium", STRENGTH_TONE[strength.label])} data-strength>
                  {strength.label}
                </span>
                <span className="font-mono text-xs text-muted-foreground" data-entropy>
                  {" "}
                  · {Math.floor(bits)} bits of entropy · {alphabetSize}-character alphabet
                </span>
              </>
            )}
          </p>
          {!invalid ? <p className="text-center text-sm text-muted-foreground">{strength.advice}</p> : null}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <CopyButton text={output} label={count > 1 ? "Copy all" : "Copy"} ariaLabel={count > 1 ? "Copy passwords" : "Copy password"} variant="primary" />
          <Button size="sm" onClick={generate} disabled={invalid !== null}>
            Generate new
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setPasswords([])} disabled={!passwords.length}>
            Clear
          </Button>
        </div>

        <RangeField label={`Length (${length} characters)`} value={length} min={MIN_PASSWORD_LENGTH} max={MAX_PASSWORD_LENGTH} onChange={setLength} />

        <fieldset className="grid grid-cols-1 gap-x-12 gap-y-4 sm:grid-cols-2">
          <legend className="mb-3 text-sm font-medium">Characters</legend>
          {SWITCHES.map(({ set, label }) => (
            <Switch key={set} label={label} checked={sets.includes(set)} onChange={toggle(set)} />
          ))}
          <Switch label={`Exclude ambiguous (${AMBIGUOUS.split("").join(" ")})`} checked={excludeAmbiguous} onChange={setExcludeAmbiguous} />
          <Switch label="At least one of each" checked={requireEach} onChange={setRequireEach} />
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={ids.exclude}>Also exclude these characters</Label>
            <Input
              id={ids.exclude}
              value={exclude}
              onChange={(e) => setExclude(e.target.value)}
              maxLength={MAX_EXCLUDED}
              placeholder={`e.g. "'\`\\`}
              autoComplete="off"
              spellCheck={false}
              aria-describedby={ids.excludeHint}
              className="font-mono"
            />
            <p id={ids.excludeHint} className="text-xs text-muted-foreground">
              For systems that reject some symbols, such as quotes in a config file.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={ids.count}>How many</Label>
            <Input
              id={ids.count}
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_PASSWORDS}
              value={countText}
              onChange={(e) => setCountText(e.target.value)}
              aria-invalid={!Number.isInteger(count) || count < 1 || count > MAX_PASSWORDS}
              className="w-24"
            />
          </div>
        </div>

        {invalid ? <Alert title="Check the settings">{invalid}</Alert> : null}
        {error && !invalid ? <Alert title="Could not generate a password">{error}</Alert> : null}

        <div className="flex justify-end">
          <Button size="sm" variant="ghost" onClick={reset} disabled={!customized}>
            Reset settings
          </Button>
        </div>
      </div>

      <Notice className="mx-auto w-full max-w-3xl" title="Generated in your browser and never sent or saved">
        Passwords come from <code>crypto.getRandomValues()</code> and exist only on this page while it is open. Store them in a password
        manager, and use a different password for every account.
      </Notice>
    </div>
  );
}
