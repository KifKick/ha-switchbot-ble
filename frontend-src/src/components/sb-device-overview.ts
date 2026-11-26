import { css, html, nothing } from "lit";
import { property } from "lit/decorators.js";

import { SbElement, safeElement } from "../base";
import { deviceEntities, type DeviceEntity } from "../devices";
import { pageStyles, sharedStyles } from "../styles";
import type { SwitchbotDevice } from "../types";
import "./sb-entity-row";
import "./keypad/sb-keypad-view";

const CONTROL_DOMAINS = ["lock", "cover", "light", "fan", "humidifier", "vacuum", "climate", "switch", "button", "select", "number"];

/** "Overview" section: controls, status and diagnostics of the device. */
@safeElement("sb-device-overview")
export class SbDeviceOverview extends SbElement {
  @property({ attribute: false }) device!: SwitchbotDevice;

  protected override render() {
    const all = deviceEntities(this.hass, this.device);
    const controls = all.filter((e) => e.category === null && CONTROL_DOMAINS.includes(e.domain));
    const status = all.filter((e) => e.category === null && !CONTROL_DOMAINS.includes(e.domain));
    const diagnostics = all.filter((e) => e.category === "diagnostic");
    return html`
      ${this.device.features.keypad
        ? html`<sb-keypad-view .hass=${this.hass} .device=${this.device} section="status"></sb-keypad-view>`
        : nothing}
      ${this._card("overview.controls", controls)} ${this._card("overview.status", status)}
      ${this._card("overview.diagnostics", diagnostics)}
      ${!all.length ? html`<div class="card"><div class="card-content">${this.t("common.no_entities")}</div></div>` : nothing}
    `;
  }

  private _card(title: "overview.controls" | "overview.status" | "overview.diagnostics", entities: DeviceEntity[]) {
    if (!entities.length) return nothing;
    return html`<section class="card">
      <h2 class="card-header">${this.t(title)}</h2>
      <div class="list">
        ${entities.map((e) => html`<sb-entity-row .hass=${this.hass} .device=${this.device} .entity=${e}></sb-entity-row>`)}
      </div>
    </section>`;
  }

  static override styles = [
    sharedStyles,
    pageStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      h2.card-header {
        margin: 0;
        font-size: 16px;
        font-weight: 500;
        padding-bottom: 0;
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
    "sb-device-overview": SbDeviceOverview;
  }
}
