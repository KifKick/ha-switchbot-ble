import { html } from "lit";
import { property } from "lit/decorators.js";
import { mdiInformationOutline } from "@mdi/js";

import { SbElement, safeElement } from "../base";
import { deviceEntities } from "../devices";
import { sharedStyles } from "../styles";
import type { SwitchbotDevice } from "../types";
import "./sb-entity-row";
import "./sb-icon";

const SETTING_DOMAINS = ["switch", "select", "number", "time", "button"];

/** "Settings" section: the device's configuration entities with their controls. */
@safeElement("sb-entity-settings")
export class SbEntitySettings extends SbElement {
  @property({ attribute: false }) device!: SwitchbotDevice;

  protected override render() {
    const entities = deviceEntities(this.hass, this.device).filter(
      (e) => e.category === "config" && SETTING_DOMAINS.includes(e.domain),
    );
    // switches first, then choices, numbers and actions, like the device page in HA
    // a time window reads start, then end (entity ids sort "end" first)
    const windowPos = (id: string) => (/_(start|from)$/.test(id) ? 0 : /_(end|to)$/.test(id) ? 1 : 0);
    entities.sort(
      (a, b) =>
        SETTING_DOMAINS.indexOf(a.domain) - SETTING_DOMAINS.indexOf(b.domain) ||
        windowPos(a.entity_id) - windowPos(b.entity_id),
    );
    return html`<div class="card">
      ${entities.length
        ? html`<div class="list">
            ${entities.map((e) => html`<sb-entity-row .hass=${this.hass} .device=${this.device} .entity=${e}></sb-entity-row>`)}
          </div>`
        : html`<div class="card-content">${this.t("settings.none")}</div>`}
      <div class="card-actions">
        <span class="sub hint"><sb-icon .path=${mdiInformationOutline} .size=${16}></sb-icon> ${this.t("settings.note")}</span>
        <span class="spacer"></span>
      </div>
    </div>`;
  }

  static override styles = [sharedStyles];
}

declare global {
  interface HTMLElementTagNameMap {
    "sb-entity-settings": SbEntitySettings;
  }
}
