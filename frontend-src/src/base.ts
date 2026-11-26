import { LitElement } from "lit";
import { property } from "lit/decorators.js";
import { localize, type Translate } from "./localize";
import type { HomeAssistant } from "./types";

/** Base of every panel component: holds `hass` and a translator for its language. */
export class SbElement extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;

  private _tHass?: HomeAssistant;
  private _t?: Translate;

  get t(): Translate {
    if (!this._t || this._tHass !== this.hass) {
      this._tHass = this.hass;
      this._t = localize(this.hass);
    }
    return this._t;
  }
}

export function errorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) return String((err as { message: unknown }).message);
  return String(err);
}

export function fireEvent<T>(node: EventTarget, type: string, detail?: T): void {
  node.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
}

/** Navigation inside the panel: `navigate` events bubble up to <switchbot-panel>. */
export function navigate(node: EventTarget, path: string): void {
  fireEvent(node, "sb-navigate", { path });
}

export function fmt(value: number | null | undefined, decimals: number): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return Number(value).toFixed(decimals);
}

/**
 * Like Lit's @customElement, but skips names that are already defined: an open
 * HA tab can load a newer bundle next to the old one after an update.
 */
export function safeElement(name: string) {
  return (cls: CustomElementConstructor) => {
    if (!customElements.get(name)) customElements.define(name, cls);
  };
}
