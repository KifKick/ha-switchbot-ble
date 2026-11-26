import { css, html, nothing } from "lit";
import { property } from "lit/decorators.js";
import { mdiAlertCircleOutline, mdiBattery, mdiBatteryAlert, mdiChevronRight } from "@mdi/js";

import { SbElement, navigate, safeElement } from "../base";
import { KIND_ORDER, batteryLevel, deviceIcon, modelName, primaryState } from "../devices";
import { pageStyles, sharedStyles } from "../styles";
import type { SwitchbotDevice } from "../types";
import "./sb-icon";

/** Start page: every SwitchBot device, grouped by kind. */
@safeElement("sb-device-list")
export class SbDeviceList extends SbElement {
  @property({ attribute: false }) devices: SwitchbotDevice[] = [];
  @property() error?: string;

  protected override render() {
    if (!this.devices.length) {
      return html`<div class="page">
        <div class="card"><div class="card-content">${this.t("devices.none")}</div></div>
        ${this.error ? html`<div class="alert error"><div class="text">${this.error}</div></div>` : nothing}
      </div>`;
    }
    const groups = KIND_ORDER.map((kind) => ({
      kind,
      devices: this.devices.filter((d) => d.kind === kind).sort((a, b) => a.name.localeCompare(b.name)),
    })).filter((g) => g.devices.length);
    return html`<div class="page">
      <p class="intro">${this.t("devices.intro")}</p>
      ${groups.map(
        (g) => html`<section class="card">
          <h2 class="card-header">${this.t(`devices.groups.${g.kind}`)}</h2>
          <div class="list">${g.devices.map((d) => this._row(d))}</div>
        </section>`,
      )}
    </div>`;
  }

  private _row(d: SwitchbotDevice) {
    const battery = batteryLevel(this.hass, d);
    const live = d.available ? primaryState(this.hass, d) : "";
    const supporting = [d.model_name ?? modelName(d.model), live].filter(Boolean).join(" · ");
    const href = `/device/${encodeURIComponent(d.entry_id)}`;
    return html`<a class="item" href="#${href}" data-entry=${d.entry_id}
      @click=${(ev: Event) => {
        ev.preventDefault();
        navigate(this, href);
      }}>
      <span class="badge ${d.kind}"><sb-icon .path=${deviceIcon(d)}></sb-icon></span>
      <span class="text">
        <span class="headline">${d.name}</span>
        <span class="supporting">${supporting}</span>
      </span>
      <span class="meta">
        ${!d.available
          ? html`<span class="unavailable"><sb-icon .path=${mdiAlertCircleOutline} .size=${18}></sb-icon>${this.t(
              "common.unavailable",
            )}</span>`
          : nothing}
        ${battery !== null
          ? html`<span class="battery ${battery <= 15 ? "low" : ""}">
              <sb-icon .path=${battery <= 15 ? mdiBatteryAlert : mdiBattery} .size=${18}></sb-icon>${battery}%
            </span>`
          : nothing}
        <sb-icon .path=${mdiChevronRight}></sb-icon>
      </span>
    </a>`;
  }

  static override styles = [
    sharedStyles,
    pageStyles,
    css`
      h2.card-header {
        margin: 0;
      }
      .badge {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: none;
        color: var(--badge-color);
        background: color-mix(in srgb, var(--badge-color) 16%, transparent);
        --badge-color: var(--state-icon-color, var(--primary-color));
      }
      .badge.lock {
        --badge-color: var(--state-lock-locked-color, var(--green-color, #43a047));
      }
      .badge.keypad {
        --badge-color: var(--indigo-color, #3f51b5);
      }
      .badge.sensor {
        --badge-color: var(--orange-color, #ff9800);
      }
      .badge.cover {
        --badge-color: var(--purple-color, #926bc7);
      }
      .badge.light {
        --badge-color: var(--yellow-color, #ffd500);
      }
      .badge.switch {
        --badge-color: var(--cyan-color, #00bcd4);
      }
      .badge.appliance {
        --badge-color: var(--teal-color, #009688);
      }
      .badge.plug {
        --badge-color: var(--amber-color, #ffc107);
      }
      .badge.other {
        --badge-color: var(--blue-color, #2196f3);
      }
      .battery,
      .unavailable {
        display: inline-flex;
        align-items: center;
        gap: 2px;
      }
      .battery.low,
      .unavailable {
        color: var(--error-color, #db4437);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "sb-device-list": SbDeviceList;
  }
}
