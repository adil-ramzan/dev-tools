/**
 * Saves text as a file through a temporary object URL, released straight
 * after the download starts. Nothing is uploaded.
 */
export function downloadText(name: string, text: string, type = "text/plain"): void {
  downloadBlob(name, new Blob([text], { type }));
}

/** Saves a Blob (such as a PNG or ZIP) as a file, the same way as downloadText. */
export function downloadBlob(name: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
