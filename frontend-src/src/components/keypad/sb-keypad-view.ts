import { css, html, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { mdiAlertCircleOutline, mdiCheckCircleOutline } from "@mdi/js";

import { keypadOp, subscribeKeypads, unsubscribeLater } from "../../api";
import { SbElement, errorMessage, safeElement } from "../../base";
import { sharedStyles } from "../../styles";
import type { KeypadPayload, SwitchbotDevice, Unsubscribe } from "../../types";
import "../sb-icon";
import "./sb-keypad-status";
import "./sb-keypad-credentials";

export type KeypadSection = "status" | "passcodes" | "cards";

/** Runs one keypad operation; `quiet` ones do not show the busy line. */
export type KeypadOp = <T = any>(op: string, data?: Record<string, unknown>, opts?: { quiet?: boolean }) => Promise<T>;

/** One keypad section; holds the live keypad data and runs operations for its children. */
@safeElement("sb-keypad-view")
export class SbKeypadView extends SbElement {
  @property({ attribute: false }) device!: SwitchbotDevice;
  @property() section: KeypadSection = "status";

  @state() private _keypad?: KeypadPayload;
  @state() private _busy = false;
  @state() private _error?: string;
  @state() private _msg?: string;

  private _sub?: Promise<Unsubscribe>;

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.hass && !this._sub) this._subscribe();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    unsubscribeLater(this._sub);
    this._sub = undefined;
  }

  protected override firstUpdated(): void {
    if (!this._sub) this._subscribe();
  }

  protected override willUpdate(changed: Map<string, unknown>): void {
    if (changed.has("section")) this._msg = undefined;
  }

  private _subscribe() {
    this._sub = subscribeKeypads(this.hass, (msg) => {
      const mine = msg.keypads.find((k) => k.entry_id === this.device.entry_id);
      if (mine) this._keypad = mine;
    });
  }

  private _op: KeypadOp = async (op, data = {}, { quiet = false } = {}) => {
    if (!quiet) {
      this._busy = true;
      this._error = undefined;
      this._msg = undefined;
    }
    try {
      const res = await keypadOp(this.hass, this.device.entry_id, op, data);
      if (res.keypad) this._keypad = res.keypad;
      return res.result;
    } catch (err) {
      this._error = errorMessage(err);
      throw err;
    } finally {
      if (!quiet) this._busy = false;
    }
  };

  private _onMessage = (ev: CustomEvent<string>) => {
    this._msg = ev.detail;
  };

  protected override render() {
    const k = this._keypad;
    if (!k) return html`<div class="card"><div class="card-content busy"><span class="spinner"></span>${this.t("common.loading")}</div></div>`;
    const common = { hass: this.hass, keypad: k, op: this._op, busy: this._busy };
    return html`
      ${this._feedback()}
      ${this.section === "status"
        ? html`<sb-keypad-status .hass=${common.hass} .keypad=${k} .op=${this._op} .busy=${this._busy}
            @keypad-message=${this._onMessage}></sb-keypad-status>`
        : html`<sb-keypad-credentials .hass=${common.hass} .keypad=${k} .op=${this._op} .busy=${this._busy}
            .kind=${this.section} @keypad-message=${this._onMessage}></sb-keypad-credentials>`}
    `;
  }

  private _feedback() {
    if (this._busy) return html`<div class="alert"><span class="spinner"></span><div class="text">${this.t("keypad.busy")}</div></div>`;
    if (this._error)
      return html`<div class="alert error"><sb-icon .path=${mdiAlertCircleOutline}></sb-icon><div class="text">${this._error}</div></div>`;
    if (this._msg)
      return html`<div class="alert success"><sb-icon .path=${mdiCheckCircleOutline}></sb-icon><div class="text">${this._msg}</div></div>`;
    return nothing;
  }

  static override styles = [
    sharedStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .busy {
        display: flex;
        align-items: center;
        gap: 10px;
        color: var(--secondary-text-color);
      }
      @media (max-width: 600px) {
        :host {
          gap: 8px;
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "sb-keypad-view": SbKeypadView;
  }
}
