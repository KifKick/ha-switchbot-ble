import { css, html, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import {
  mdiArrowDown,
  mdiArrowUp,
  mdiBell,
  mdiCheckboxMarkedCircleOutline,
  mdiClockOutline,
  mdiCurtains,
  mdiEye,
  mdiFan,
  mdiFormatListBulleted,
  mdiGestureTapButton,
  mdiHomeImportOutline,
  mdiLightbulbOutline,
  mdiLock,
  mdiMinus,
  mdiNumeric,
  mdiPlay,
  mdiPlus,
  mdiRobotVacuum,
  mdiStop,
  mdiThermostat,
  mdiToggleSwitchOutline,
  mdiWaterPercent,
} from "@mdi/js";

import { SbElement, errorMessage, fireEvent, safeElement } from "../base";
import { entityName, formatState, type DeviceEntity } from "../devices";
import { sharedStyles } from "../styles";
import type { SwitchbotDevice } from "../types";
import "./sb-icon";
import "./sb-switch";

const DOMAIN_ICONS: Record<string, string> = {
  switch: mdiToggleSwitchOutline,
  select: mdiFormatListBulleted,
  number: mdiNumeric,
  time: mdiClockOutline,
  button: mdiGestureTapButton,
  lock: mdiLock,
  binary_sensor: mdiCheckboxMarkedCircleOutline,
  event: mdiBell,
  cover: mdiCurtains,
  light: mdiLightbulbOutline,
  fan: mdiFan,
  humidifier: mdiWaterPercent,
  climate: mdiThermostat,
  vacuum: mdiRobotVacuum,
};

/** One entity as a row with the control HA would show for it. */
@safeElement("sb-entity-row")
export class SbEntityRow extends SbElement {
  @property({ attribute: false }) device!: SwitchbotDevice;
  @property({ attribute: false }) entity!: DeviceEntity;
  @state() private _busy = false;
  @state() private _error?: string;

  private _moreInfo() {
    fireEvent(this, "hass-more-info", { entityId: this.entity.entity_id });
  }

  private async _call(domain: string, service: string, data: Record<string, unknown> = {}) {
    this._busy = true;
    this._error = undefined;
    try {
      await this.hass.callService(domain, service, { entity_id: this.entity.entity_id, ...data });
    } catch (err) {
      this._error = errorMessage(err);
    } finally {
      this._busy = false;
    }
  }

  protected override render() {
    const e = this.entity;
    const st = e.state;
    const unavailable = !st || st.state === "unavailable";
    const icon = customElements.get("ha-state-icon") && st
      ? html`<ha-state-icon .hass=${this.hass} .stateObj=${st}></ha-state-icon>`
      : html`<sb-icon .path=${DOMAIN_ICONS[e.domain] ?? mdiEye}></sb-icon>`;
    return html`<div class="item">
        <span class="leading">${icon}</span>
        <button class="text name" @click=${this._moreInfo}>
          <span class="headline">${entityName(this.device, e)}</span>
          ${this._error ? html`<span class="supporting error-text">${this._error}</span>` : nothing}
        </button>
        <span class="control">${unavailable ? html`<span class="secondary">${formatState(this.hass, st)}</span>` : this._control()}</span>
      </div>`;
  }

  private _control() {
    const e = this.entity;
    const st = e.state!;
    const a = st.attributes;
    switch (e.domain) {
      case "switch":
      case "light":
      case "fan":
      case "humidifier":
        return html`${e.domain !== "switch" ? html`<span class="secondary state">${formatState(this.hass, st)}</span>` : nothing}
          <sb-switch .checked=${st.state === "on"} ?disabled=${this._busy} .label=${entityName(this.device, e)}
            @change=${(ev: CustomEvent<{ checked: boolean }>) => this._call(e.domain, ev.detail.checked ? "turn_on" : "turn_off")}
          ></sb-switch>`;
      case "cover": {
        const pos = a.current_position;
        const tilt = a.current_tilt_position;
        const value = pos ?? tilt;
        return html`<span class="secondary state">${formatState(this.hass, st)}${value !== undefined ? ` · ${value}%` : ""}</span>
          <span class="cover-btns">
            <button class="icon-btn" title=${this.t("controls.open")} aria-label=${this.t("controls.open")}
              ?disabled=${this._busy || st.state === "opening"} @click=${() => this._call("cover", pos === undefined && tilt !== undefined ? "open_cover_tilt" : "open_cover")}>
              <sb-icon .path=${mdiArrowUp}></sb-icon></button>
            <button class="icon-btn" title=${this.t("controls.stop")} aria-label=${this.t("controls.stop")}
              ?disabled=${this._busy} @click=${() => this._call("cover", pos === undefined && tilt !== undefined ? "stop_cover_tilt" : "stop_cover")}>
              <sb-icon .path=${mdiStop}></sb-icon></button>
            <button class="icon-btn" title=${this.t("controls.close")} aria-label=${this.t("controls.close")}
              ?disabled=${this._busy || st.state === "closing"} @click=${() => this._call("cover", pos === undefined && tilt !== undefined ? "close_cover_tilt" : "close_cover")}>
              <sb-icon .path=${mdiArrowDown}></sb-icon></button>
          </span>`;
      }
      case "vacuum": {
        const cleaning = st.state === "cleaning";
        return html`<span class="secondary state">${formatState(this.hass, st)}</span>
          <button class="icon-btn" title=${this.t(cleaning ? "controls.dock" : "controls.start")}
            aria-label=${this.t(cleaning ? "controls.dock" : "controls.start")} ?disabled=${this._busy}
            @click=${() => this._call("vacuum", cleaning ? "return_to_base" : "start")}>
            <sb-icon .path=${cleaning ? mdiHomeImportOutline : mdiPlay}></sb-icon></button>`;
      }
      case "climate": {
        const target = a.temperature as number | undefined;
        const step = Number(a.target_temp_step ?? 0.5);
        const set = (delta: number) => {
          const v = Math.min(Number(a.max_temp ?? 35), Math.max(Number(a.min_temp ?? 4), (target ?? 0) + delta));
          this._call("climate", "set_temperature", { temperature: v });
        };
        const unit = (this.hass as { config?: { unit_system?: { temperature?: string } } }).config?.unit_system?.temperature ?? "°C";
        return html`<span class="secondary state">${formatState(this.hass, st)}${
          a.current_temperature !== undefined ? ` · ${a.current_temperature} ${unit}` : ""
        }</span>
          ${target !== undefined && target !== null
            ? html`<span class="cover-btns">
                <button class="icon-btn" title="−" aria-label="−" ?disabled=${this._busy} @click=${() => set(-step)}>
                  <sb-icon .path=${mdiMinus}></sb-icon></button>
                <span class="temp">${target} ${unit}</span>
                <button class="icon-btn" title="+" aria-label="+" ?disabled=${this._busy} @click=${() => set(step)}>
                  <sb-icon .path=${mdiPlus}></sb-icon></button>
              </span>`
            : nothing}`;
      }
      case "select":
        return html`<select ?disabled=${this._busy} aria-label=${entityName(this.device, e)}
          @change=${(ev: Event) => this._call("select", "select_option", { option: (ev.target as HTMLSelectElement).value })}>
          ${(a.options as string[]).map(
            (o) => html`<option value=${o} ?selected=${o === st.state}>${this._optionLabel(o)}</option>`,
          )}
        </select>`;
      case "number": {
        const min = Number(a.min ?? 0);
        const max = Number(a.max ?? 100);
        const step = Number(a.step ?? 1);
        const unit = a.unit_of_measurement ? ` ${a.unit_of_measurement}` : "";
        const set = (ev: Event) => {
          const v = Number((ev.target as HTMLInputElement).value);
          if (Number.isFinite(v) && v >= min && v <= max) this._call("number", "set_value", { value: v });
        };
        if (a.mode === "slider" || (a.mode !== "box" && max - min <= 10)) {
          return html`<span class="slider">
            <input type="range" min=${min} max=${max} step=${step} .value=${st.state} ?disabled=${this._busy}
              aria-label=${entityName(this.device, e)} @change=${set} />
            <span class="value">${formatState(this.hass, st)}</span>
          </span>`;
        }
        return html`<span class="box">
          <input type="number" min=${min} max=${max} step=${step} .value=${st.state} ?disabled=${this._busy}
            aria-label=${entityName(this.device, e)} @change=${set} />${unit}
        </span>`;
      }
      case "time":
        return html`<input type="time" .value=${st.state.slice(0, 5)} ?disabled=${this._busy}
          aria-label=${entityName(this.device, e)}
          @change=${(ev: Event) => {
            const v = (ev.target as HTMLInputElement).value;
            if (v) this._call("time", "set_value", { time: `${v}:00` });
          }} />`;
      case "button":
        return html`<button class="btn" ?disabled=${this._busy} @click=${() => this._call("button", "press")}>
          ${this.t("settings.press")}
        </button>`;
      case "lock": {
        const locked = st.state === "locked";
        return html`<span class="secondary">${formatState(this.hass, st)}</span>
          <button class="btn outlined" ?disabled=${this._busy} @click=${() => this._call("lock", locked ? "unlock" : "lock")}>
            ${this.t(locked ? "common.unlock" : "common.lock")}
          </button>`;
      }
      default:
        return html`<span class="secondary state">${formatState(this.hass, st)}</span>`;
    }
  }

  private _optionLabel(option: string): string {
    const st = this.entity.state!;
    return this.hass.formatEntityState ? this.hass.formatEntityState(st, option) : option;
  }

  static override styles = [
    sharedStyles,
    css`
      :host {
        display: block;
      }
      .item {
        min-height: 52px;
        padding: 4px 16px;
      }
      .leading {
        color: var(--state-icon-color, var(--secondary-text-color));
        display: inline-flex;
        width: 40px;
        justify-content: center;
        flex: none;
      }
      button.name {
        background: none;
        border: none;
        padding: 0;
        color: inherit;
        font: inherit;
        text-align: left;
        cursor: pointer;
      }
      .control {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        justify-content: flex-end;
        text-align: right;
        flex: none;
        max-width: 60%;
      }
      .cover-btns {
        display: inline-flex;
        align-items: center;
      }
      .temp {
        min-width: 4.5em;
        text-align: center;
        white-space: nowrap;
      }
      .state {
        white-space: nowrap;
      }
      select {
        max-width: 220px;
      }
      .slider {
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      .slider input {
        width: 140px;
      }
      .slider .value {
        min-width: 48px;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
      }
      .box input {
        width: 96px;
        text-align: right;
      }
      @media (max-width: 450px) {
        .slider input {
          width: 96px;
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "sb-entity-row": SbEntityRow;
  }
}
