import { LitElement, css, html } from "lit";
import { property } from "lit/decorators.js";
import { safeElement } from "../base";

/** Toggle switch in the style of HA's ha-switch; fires `change` with `detail.checked`. */
@safeElement("sb-switch")
export class SbSwitch extends LitElement {
  @property({ type: Boolean, reflect: true }) checked = false;
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property() label = "";

  static override styles = css`
    :host {
      display: inline-flex;
    }
    button {
      position: relative;
      width: 36px;
      height: 20px;
      padding: 0;
      border: none;
      border-radius: 10px;
      background: var(--switch-unchecked-track-color, var(--disabled-text-color, #9e9e9e));
      opacity: 0.6;
      cursor: pointer;
      transition: background 0.15s, opacity 0.15s;
    }
    button::after {
      content: "";
      position: absolute;
      top: 2px;
      left: 2px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: var(--switch-unchecked-button-color, #fafafa);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
      transition: transform 0.15s;
    }
    :host([checked]) button {
      background: var(--switch-checked-track-color, var(--primary-color));
      opacity: 1;
    }
    :host([checked]) button::after {
      transform: translateX(16px);
      background: var(--switch-checked-button-color, #fff);
    }
    :host([disabled]) button {
      cursor: default;
      opacity: 0.35;
    }
    button:focus-visible {
      outline: 2px solid var(--primary-color);
      outline-offset: 2px;
    }
  `;

  override render() {
    return html`<button
      role="switch"
      aria-checked=${this.checked ? "true" : "false"}
      aria-label=${this.label}
      ?disabled=${this.disabled}
      @click=${this._toggle}
    ></button>`;
  }

  private _toggle() {
    this.checked = !this.checked;
    this.dispatchEvent(new CustomEvent("change", { detail: { checked: this.checked }, bubbles: true, composed: true }));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sb-switch": SbSwitch;
  }
}
