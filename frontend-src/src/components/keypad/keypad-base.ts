import { property } from "lit/decorators.js";

import { SbElement, fireEvent } from "../../base";
import type { KeypadPayload } from "../../types";
import type { KeypadOp } from "./sb-keypad-view";

/** Shared inputs of the keypad sub-views. */
export class KeypadPart extends SbElement {
  @property({ attribute: false }) keypad!: KeypadPayload;
  @property({ attribute: false }) op!: KeypadOp;
  @property({ type: Boolean }) busy = false;

  /** Success line shown above the section. */
  protected message(text: string): void {
    fireEvent(this, "keypad-message", text);
  }

  /** Errors are already shown by the parent view. */
  protected async run(fn: () => Promise<unknown>): Promise<void> {
    try {
      await fn();
    } catch {
      /* shown by sb-keypad-view */
    }
  }
}

export function localInput(date: Date): string {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 16);
}

export function randomCode(len = 6): string {
  const a = new Uint32Array(len);
  crypto.getRandomValues(a);
  return Array.from(a, (x) => x % 10).join("");
}

export const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export const minutes = (v: string) => {
  const [h, mm] = (v || "0:0").split(":").map(Number);
  return h * 60 + mm;
};
