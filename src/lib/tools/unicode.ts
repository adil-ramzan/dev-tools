const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

/**
 * Index of the first unpaired UTF-16 surrogate, or -1. Such text cannot be
 * encoded as UTF-8; TextEncoder would silently replace it with U+FFFD.
 */
export function findLoneSurrogate(text: string): number {
  const match = LONE_SURROGATE.exec(text);
  return match ? match.index : -1;
}

/** UTF-8 byte length of a string. */
export function utf8Length(text: string): number {
  return new TextEncoder().encode(text).length;
}
