import { LitElement, css, html, svg } from "lit";
import { property } from "lit/decorators.js";
import { safeElement } from "../base";

/** Material Design icon from an @mdi/js path (bundled, no runtime lookup). */
@safeElement("sb-icon")
export class SbIcon extends LitElement {
  @property() path = "";
  @property({ type: Number }) size = 24;

  static override styles = css`
    :host {
      display: inline-flex;
      line-height: 0;
    }
    svg {
      fill: currentColor;
    }
  `;

  override render() {
    return html`<svg width=${this.size} height=${this.size} viewBox="0 0 24 24" aria-hidden="true">
      ${svg`<path d=${this.path}></path>`}
    </svg>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sb-icon": SbIcon;
  }
}
