import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Decodes Instagram's weirdly encoded strings.
 * They seem to be UTF-8 bytes encoded as latin1/cp1252 characters.
 * This function reverses that process to restore the original characters.
 * @param str The garbled string from Instagram's JSON export.
 * @returns The corrected string with proper characters.
 */
export function fixInstagramString(str: string): string {
  if (!str) return str;
  try {
    // Attempt to decode the string by reversing the likely encoding process.
    // 1. Get the bytes of the string as if it were latin1.
    // 2. Decode these bytes as UTF-8.
    const bytes = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
      bytes[i] = str.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(bytes);
  } catch (e) {
    // If decoding fails, it might not be double-encoded, so return original.
    console.warn("Could not decode string, returning original:", str, e);
    return str;
  }
}
