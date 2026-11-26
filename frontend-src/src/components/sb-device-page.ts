import { css, html, nothing } from "lit";
import { property } from "lit/decorators.js";
import {
  mdiCardAccountDetailsOutline,
  mdiCogOutline,
  mdiFormTextboxPassword,
  mdiHistory,
  mdiInformationOutline,
  mdiOpenInNew,
  mdiTune,
  mdiTuneVariant,
} from "@mdi/js";

import { SbElement, safeElement } from "../base";
import { deviceEntities, deviceIcon, findEntity, modelName } from "../devices";
import { pageStyles, sharedStyles } from "../styles";
import type { SwitchbotDevice } from "../types";
import "./sb-icon";
import "./sb-device-overview";
import "./sb-entity-settings";
import "./sensor/sb-sensor-correction";
import "./lock/sb-lock-calibration";
import "./cover/sb-cover-calibration";
import "./sb-history";
import "./keypad/sb-keypad-view";

export type Section = "overview" | "correction" | "calibration" | "passcodes" | "cards" | "settings" | "history";

export const SECTION_ICONS: Record<Section, string> = {
  overview: mdiInformationOutline,
  correction: mdiTuneVariant,
  calibration: mdiTune,
  passcodes: mdiFormTextboxPassword,
  cards: mdiCardAccountDetailsOutline,
  settings: mdiCogOutline,
  history: mdiHistory,
};

/** Sections a device offers, in tab order. */
export function deviceSections(hass: SbElement["hass"], device: SwitchbotDevice): Section[] {
  const sections: Section[] = ["overview"];
  if (device.features.correction) sections.push("correction");
  if (device.features.lock_calibration || device.features.cover_calibration) sections.push("calibration");
  if (device.features.keypad) sections.push("passcodes", "cards");
  const hasSettings = deviceEntities(hass, device).some(
    (e) => e.category === "config" && ["switch", "select", "number", "time", "button"].includes(e.domain),
  );
  if (hasSettings) sections.push("settings");
  if (["lock", "keypad"].includes(device.kind) && findEntity(hass, device, (e) => e.domain === "event"))
    sections.push("history");
  return sections;
}

/** Section shown for a path segment (unknown or missing -> overview). */
export function currentSection(sections: Section[], section?: string): Section {
  return (sections as string[]).includes(section ?? "") ? (section as Section) : "overview";
}

/** One device: header card and the selected section (tabs live in the panel header). */
@safeElement("sb-device-page")
export class SbDevicePage extends SbElement {
  @property({ attribute: false }) device!: SwitchbotDevice;
  @property() section?: string;
  @property({ attribute: false }) offsetLimits: Record<string, [number, number]> = {};
  @property({ type: Boolean }) narrow = false;

  protected override render() {
    const current = currentSection(deviceSections(this.hass, this.device), this.section);
    return html`<div class="page">
      ${current === "overview" ? this._header() : nothing}
      ${this._section(current)}
    </div>`;
  }

  private _header() {
    const d = this.device;
    return html`<div class="card device-head">
      <span class="badge"><sb-icon .path=${deviceIcon(d)}></sb-icon></span>
      <div class="text">
        <div class="headline">${d.name}</div>
        <div class="supporting">${d.model_name ?? modelName(d.model)} ·
          <a
            class="address"
            href="/config/bluetooth/advertisement-monitor?search=${encodeURIComponent(d.address)}"
            title=${this.t("common.show_advertisements")}
            >${d.address}</a
          >
          ${d.available ? nothing : html` · <span class="error-text">${this.t("common.unavailable")}</span>`}</div>
      </div>
      ${d.device_id && !d.device_id.startsWith("demo")
        ? html`<a class="btn" href="/config/devices/device/${d.device_id}">
            <sb-icon .path=${mdiOpenInNew} .size=${18}></sb-icon>${this.narrow ? nothing : this.t("common.open_device")}
          </a>`
        : nothing}
    </div>`;
  }

  private _section(section: Section) {
    const d = this.device;
    switch (section) {
      case "correction":
        return html`<sb-sensor-correction .hass=${this.hass} .device=${d} .offsetLimits=${this.offsetLimits}></sb-sensor-correction>`;
      case "calibration":
        return d.features.cover_calibration
          ? html`<sb-cover-calibration .hass=${this.hass} .device=${d}></sb-cover-calibration>`
          : html`<sb-lock-calibration .hass=${this.hass} .device=${d}></sb-lock-calibration>`;
      case "passcodes":
      case "cards":
        return html`<sb-keypad-view .hass=${this.hass} .device=${d} .section=${section}></sb-keypad-view>`;
      case "settings":
        return html`<sb-entity-settings .hass=${this.hass} .device=${d}></sb-entity-settings>`;
      case "history":
        return html`<sb-history .hass=${this.hass} .device=${d}></sb-history>`;
      default:
        return html`<sb-device-overview .hass=${this.hass} .device=${d}></sb-device-overview>`;
    }
  }

  static override styles = [
    sharedStyles,
    pageStyles,
    css`
      :host {
        display: block;
      }
      .device-head {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px;
      }
      .device-head .text {
        flex: 1;
        min-width: 0;
      }
      .headline {
        font-size: 18px;
        line-height: 24px;
      }
      .supporting {
        font-size: 14px;
        color: var(--secondary-text-color);
      }
      .address {
        color: inherit;
        font-family: var(--code-font-family, monospace);
        text-decoration: underline dotted;
        text-underline-offset: 3px;
      }
      .address:hover {
        color: var(--primary-color);
      }
      .badge {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: var(--primary-color);
        background: color-mix(in srgb, var(--primary-color) 14%, transparent);
        flex: none;
      }
      a.btn {
        text-decoration: none;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "sb-device-page": SbDevicePage;
  }
}
