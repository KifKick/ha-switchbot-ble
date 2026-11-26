import { css, html, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import {
  mdiAlertOutline,
  mdiChip,
  mdiMinus,
  mdiMoleculeCo2,
  mdiPlus,
  mdiRefresh,
  mdiThermometer,
  mdiWaterPercent,
} from "@mdi/js";

import { deviceCalibration, setOffset, subscribeSensors, unsubscribeLater } from "../../api";
import { SbElement, errorMessage, fmt, safeElement } from "../../base";
import { sharedStyles } from "../../styles";
import type { CorrectionKey, SensorPayload, SwitchbotDevice, Unsubscribe } from "../../types";
import { KEYS, clamp, round2, rowModel } from "./correction-model";
import "../sb-icon";

const ICONS: Record<CorrectionKey, string> = {
  temperature: mdiThermometer,
  humidity: mdiWaterPercent,
  co2: mdiMoleculeCo2,
};

/** "Calibration" section of a sensor: offsets in HA or the correction stored in the sensor. */
@safeElement("sb-sensor-correction")
export class SbSensorCorrection extends SbElement {
  @property({ attribute: false }) device!: SwitchbotDevice;
  @property({ attribute: false }) offsetLimits: Record<string, [number, number]> = {};

  @state() private _sensor?: SensorPayload;
  @state() private _drafts: Partial<Record<CorrectionKey, string>> = {};
  @state() private _refs: Partial<Record<CorrectionKey, string>> = {};
  @state() private _flash: Partial<Record<CorrectionKey, boolean>> = {};
  @state() private _busy = false;
  @state() private _error?: string;

  private _sub?: Promise<Unsubscribe>;
  private _autoRead = false;

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

  private _subscribe() {
    this._sub = subscribeSensors(this.hass, (msg) => {
      const mine = msg.sensors.find((s) => s.entry_id === this.device.entry_id);
      if (!mine) return;
      this._sensor = mine;
      // the panel reads the stored correction once, without the user asking
      if (mine.device_calibration && !mine.device_calibration_value && !this._autoRead) {
        this._autoRead = true;
        this._deviceCall({ action: "read" });
      }
    });
  }

  private _limits(key: CorrectionKey): [number, number] {
    return this.offsetLimits[key] ?? [-100, 100];
  }

  private async _deviceCall(req: Parameters<typeof deviceCalibration>[2], flashKey?: CorrectionKey) {
    this._busy = true;
    this._error = undefined;
    try {
      const res = await deviceCalibration(this.hass, this.device.entry_id, req);
      this._sensor = res.sensor;
      if (flashKey) this._afterSave(flashKey);
    } catch (err) {
      this._error = errorMessage(err);
    } finally {
      this._busy = false;
    }
  }

  private _afterSave(key: CorrectionKey) {
    const { [key]: _drop, ...rest } = this._drafts;
    this._drafts = rest;
    this._flash = { ...this._flash, [key]: true };
    setTimeout(() => (this._flash = { ...this._flash, [key]: false }), 2500);
  }

  private async _save(key: CorrectionKey, value: number) {
    const s = this._sensor!;
    if (rowModel(s, key, undefined).onDevice) {
      const v = key === "humidity" ? Math.round(value) : Math.round(value * 10) / 10;
      await this._deviceCall({ action: "set", [key]: v }, key);
      return;
    }
    this._busy = true;
    this._error = undefined;
    try {
      const res = await setOffset(this.hass, s.entry_id, key, value);
      this._sensor = res.sensor;
      this._afterSave(key);
    } catch (err) {
      this._error = errorMessage(err);
    } finally {
      this._busy = false;
    }
  }

  private _setDraft(key: CorrectionKey, value: number) {
    this._drafts = { ...this._drafts, [key]: String(clamp(value, this._limits(key))) };
    this._flash = { ...this._flash, [key]: false };
  }

  protected override render() {
    const s = this._sensor;
    if (!s) return html`<div class="card"><div class="card-content waiting"><span class="spinner"></span>${this.t("sensor.waiting")}</div></div>`;
    const keys = (Object.keys(KEYS) as CorrectionKey[]).filter((k) => s.values[k]);
    return html`${this._summary(s)} ${keys.map((k) => this._row(s, k))}`;
  }

  /** Intro and (for sensors that store the correction) reading it back. */
  private _summary(s: SensorPayload) {
    return html`<section class="card">
      <div class="card-content">
        <p class="intro">${this.t(s.device_calibration ? "sensor.devcal_intro" : "sensor.intro")}</p>
        ${this._error ? html`<div class="alert error"><sb-icon .path=${mdiAlertOutline}></sb-icon><div class="text">${this._error}</div></div>` : nothing}
      </div>
      ${s.device_calibration
        ? html`<div class="card-actions">
            ${this._busy ? html`<span class="busy"><span class="spinner"></span>${this.t("sensor.devcal_busy")}</span>` : nothing}
            <span class="spacer"></span>
            <button class="btn" data-act="devcal-read" ?disabled=${this._busy} @click=${() => this._deviceCall({ action: "read" })}>
              <sb-icon .path=${mdiRefresh} .size=${18}></sb-icon>${this.t("common.read")}
            </button>
          </div>`
        : nothing}
    </section>`;
  }

  /** One measurement as an HA settings card: header, setting rows, actions. */
  private _row(s: SensorPayload, key: CorrectionKey) {
    const cfg = KEYS[key];
    const v = s.values[key]!;
    const m = rowModel(s, key, this._drafts[key]);
    const lim = this._limits(key);
    const disabled = !m.ready || (m.onDevice && this._busy);
    const ref = this._refs[key] ?? "";
    const unit = html`<span class="u">${cfg.unit}</span>`;
    const range = this.t("sensor.limit", { min: lim[0], max: lim[1] }) + (m.onDevice && key === "humidity" ? ` · ${this.t("sensor.whole_percent")}` : "");
    return html`<section class="card corr-row" data-key=${key}>
      <div class="card-header">
        <sb-icon class="hdr-icon" .path=${ICONS[key]}></sb-icon>
        <div class="hdr-text">
          <span>${this.t(`sensor.${key}`)}</span>
          ${v.entity_id ? html`<span class="eid">${v.entity_id}</span>` : nothing}
        </div>
        ${m.onDevice ? html`<span class="tag"><sb-icon .path=${mdiChip} .size=${14}></sb-icon>${this.t("sensor.stored_in_sensor")}</span>` : nothing}
      </div>
      <div class="list">
        <div class="item">
          <span class="text"><span class="headline">${this.t(m.onDevice ? "sensor.raw_device" : "sensor.raw")}</span></span>
          <span class="value"><span data-f="raw">${fmt(m.base, cfg.decimals)}</span>${unit}</span>
        </div>
        <div class="item">
          <span class="text">
            <span class="headline">${this.t(m.onDevice ? "sensor.offset_device" : "sensor.offset")}</span>
            <span class="supporting">${range}</span>
          </span>
          <div class="stepper">
            <button class="icon-btn" data-step="-1" ?disabled=${disabled} aria-label="−"
              @click=${() => this._setDraft(key, round2((m.value ?? 0) - m.step))}><sb-icon .path=${mdiMinus} .size=${20}></sb-icon></button>
            <input type="number" inputmode="decimal" data-f="offset" step=${m.step} min=${lim[0]} max=${lim[1]}
              .value=${m.value === null ? "" : fmt(m.value, m.offDec)} ?disabled=${disabled}
              @input=${(ev: Event) => {
                const raw = (ev.target as HTMLInputElement).value;
                if (raw !== "" && !Number.isNaN(Number(raw))) this._setDraft(key, Number(raw));
              }} />
            <button class="icon-btn" data-step="1" ?disabled=${disabled} aria-label="+"
              @click=${() => this._setDraft(key, round2((m.value ?? 0) + m.step))}><sb-icon .path=${mdiPlus} .size=${20}></sb-icon></button>
          </div>
        </div>
        <div class="item">
          <span class="text">
            <span class="headline">${this.t("sensor.reference")}</span>
            <span class="supporting">${this.t("sensor.reference_hint")}</span>
          </span>
          <div class="ref">
            <input type="number" inputmode="decimal" data-f="ref" step=${cfg.step} .value=${ref} ?disabled=${!m.ready}
              aria-label=${this.t("sensor.reference")} placeholder=${cfg.unit}
              @input=${(ev: Event) => (this._refs = { ...this._refs, [key]: (ev.target as HTMLInputElement).value })} />
            <button class="btn" data-act="ref" ?disabled=${disabled || ref === "" || typeof m.base !== "number"}
              @click=${() => this._setDraft(key, round2(Number(ref) - (m.base as number)))}>${this.t("sensor.apply_ref")}</button>
          </div>
        </div>
        <div class="item result">
          <span class="text"><span class="headline">${this.t(m.onDevice ? "sensor.result_device" : "sensor.result")}</span></span>
          <span class="value ${m.dirty ? "dirty" : ""}"><span data-f="result">${fmt(m.corrected, cfg.decimals)}</span>${unit}</span>
        </div>
      </div>
      <div class="card-actions">
        ${this._flash[key] ? html`<span class="ok-text">${this.t(m.onDevice ? "sensor.saved_device" : "sensor.saved")}</span>` : nothing}
        <span class="spacer"></span>
        <button class="btn" data-act="reset" ?disabled=${disabled || (m.value === 0 && !m.dirty)} @click=${() => this._save(key, 0)}>
          ${this.t("common.reset")}
        </button>
        <button class="btn filled" data-act="save" ?disabled=${!m.dirty || disabled} @click=${() => this._save(key, m.value ?? 0)}>
          ${this.t(m.onDevice ? "sensor.save_device" : "common.save")}
        </button>
      </div>
    </section>`;
  }

  static override styles = [
    sharedStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .waiting,
      .busy {
        display: flex;
        align-items: center;
        gap: 10px;
        color: var(--secondary-text-color);
        font-size: 14px;
      }
      .alert {
        margin-top: 12px;
      }
      .card-header {
        padding-bottom: 8px;
      }
      .hdr-icon {
        color: var(--state-icon-color, var(--secondary-text-color));
        margin-right: 8px;
      }
      .hdr-text {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
      }
      .eid {
        font-size: 12px;
        line-height: 16px;
        color: var(--secondary-text-color);
        font-family: var(--ha-font-family-code, monospace);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .tag {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        font-weight: 500;
        padding: 2px 8px;
        border-radius: 10px;
        background: color-mix(in srgb, var(--primary-color) 14%, transparent);
        color: var(--primary-color);
        white-space: nowrap;
      }
      .list {
        padding: 0;
      }
      .corr-row .list {
        border-top: 1px solid var(--divider-color);
      }
      .item {
        min-height: 64px;
      }
      .value {
        font-size: 16px;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }
      .u {
        margin-left: 4px;
        color: var(--secondary-text-color);
        font-size: 14px;
      }
      .result .value {
        font-size: 20px;
        font-weight: 500;
      }
      .result .value.dirty,
      .result .value.dirty .u {
        color: var(--primary-color);
      }
      .stepper,
      .ref {
        display: flex;
        align-items: center;
        gap: 4px;
        flex: none;
      }
      .stepper .icon-btn {
        color: var(--primary-color);
      }
      .stepper input {
        width: 80px;
        text-align: center;
      }
      .ref input {
        width: 104px;
        text-align: center;
      }
      .ok-text {
        font-size: 14px;
      }
      @media (max-width: 520px) {
        .item:has(.stepper),
        .item:has(.ref) {
          flex-wrap: wrap;
          gap: 8px;
        }
        .item:has(.stepper) .text,
        .item:has(.ref) .text {
          flex-basis: 100%;
        }
        .stepper,
        .ref {
          margin-left: auto;
        }
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
    "sb-sensor-correction": SbSensorCorrection;
  }
}
