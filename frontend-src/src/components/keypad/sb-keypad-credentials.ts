import { css, html, nothing, svg } from "lit";
import { property, state } from "lit/decorators.js";
import { mdiDeleteOutline, mdiDiceMultipleOutline, mdiPencilOutline, mdiPlus } from "@mdi/js";
import { safeElement } from "../../base";

import { formatDateTime, localizeList } from "../../localize";
import { sharedStyles } from "../../styles";
import type { Credential } from "../../types";
import { KeypadPart, hhmm, localInput, minutes, randomCode } from "./keypad-base";
import "../sb-icon";

const PASSCODE_TYPES = ["permanent", "time_limited", "one_time", "emergency", "periodic"];
const CARD_TYPES = ["permanent", "time_limited", "emergency"];
const DAY = 86400000;
const NFC_SECONDS = 60;

interface Form {
  name: string;
  code: string;
  type: string;
  start: string;
  end: string;
  weekdays: number[];
  begin: string;
  endTime: string;
}

interface NfcRun {
  index: number;
  left: number;
  status?: string;
}

/** Passcodes or NFC cards of a keypad: list, rename, delete, add. */
@safeElement("sb-keypad-credentials")
export class SbKeypadCredentials extends KeypadPart {
  @property() kind: "passcodes" | "cards" = "passcodes";

  @state() private _form?: Form;
  @state() private _rename?: { index: string; name: string };
  @state() private _nfc?: NfcRun;
  @state() private _existing = { index: "", name: "" };

  private _nfcTimer?: number;

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    clearInterval(this._nfcTimer);
  }

  protected override willUpdate(changed: Map<string, unknown>): void {
    if (changed.has("kind")) {
      this._form = undefined;
      this._rename = undefined;
    }
  }

  private get _isCards() {
    return this.kind === "cards";
  }

  private _typeLabel(type?: string) {
    return this.t(`keypad.types.${type || "unknown"}`);
  }

  private _validity(item: Credential): string {
    if (item.type === "periodic") {
      const names = localizeList(this.hass, "keypad.weekdays");
      return `${(item.weekdays || []).map((d) => names[d]).join(" ")} · ${hhmm(item.begin_minute ?? 0)}–${hhmm(item.end_minute ?? 0)}`;
    }
    if (!item.end || item.end.startsWith("2100")) return this.t("keypad.always");
    return `${formatDateTime(this.hass, item.start)} – ${formatDateTime(this.hass, item.end)}`;
  }

  private _newForm() {
    const now = new Date();
    this._form = {
      name: "",
      code: randomCode(6),
      type: "permanent",
      start: localInput(now),
      end: localInput(new Date(now.getTime() + DAY)),
      weekdays: [0, 1, 2, 3, 4],
      begin: "08:00",
      endTime: "17:00",
    };
  }

  private _patch(p: Partial<Form>) {
    this._form = { ...this._form!, ...p };
  }

  /* ---------------- actions */

  private _savePasscode() {
    const f = this._form!;
    const data: Record<string, unknown> = { name: f.name, code: f.code, type: f.type };
    if (["time_limited", "one_time", "periodic"].includes(f.type)) {
      data.start = f.start || null;
      // a recurring code without an end date is valid for ever
      data.end = f.end || null;
    }
    if (f.type === "periodic") {
      data.weekdays = f.weekdays;
      data.begin_minute = minutes(f.begin);
      data.end_minute = minutes(f.endTime);
    }
    this.run(async () => {
      const res = await this.op<{ index: number }>("add_passcode", data);
      this._form = undefined;
      this.message(this.t("keypad.code_saved", { index: res.index, code: f.code }));
    });
  }

  private _delete(index: string, item: Credential) {
    if (!confirm(this.t("keypad.confirm_delete", { name: item.name || `#${index}` }))) return;
    this.run(() => this.op(this._isCards ? "nfc_delete" : "delete_passcode", { index: Number(index) }));
  }

  private _saveRename() {
    const r = this._rename!;
    this.run(async () => {
      await this.op("rename", { kind: this.kind, index: Number(r.index), name: r.name }, { quiet: true });
      this._rename = undefined;
    });
  }

  private _saveExisting() {
    const ex = this._existing;
    if (ex.index === "") return;
    this.run(async () => {
      await this.op("rename", { kind: this.kind, index: Number(ex.index), name: ex.name }, { quiet: true });
      this._existing = { index: "", name: "" };
    });
  }

  /** NFC: start enrolment, poll once a second until a card is read or time runs out. */
  private _startCard() {
    const f = this._form!;
    this.run(async () => {
      const res = await this.op<{ index: number }>("nfc_start", { type: f.type });
      this._nfc = { index: res.index, left: NFC_SECONDS };
      clearInterval(this._nfcTimer);
      let polling = false;
      this._nfcTimer = window.setInterval(async () => {
        if (polling || !this._nfc) return;
        polling = true;
        try {
          const run = { ...this._nfc, left: this._nfc.left - 1 };
          const st = await this.op<{ status: string }>("nfc_status", {}, { quiet: true });
          if (st.status && st.status !== "idle") {
            clearInterval(this._nfcTimer);
            if (st.status === "success") {
              const data: Record<string, unknown> = { index: run.index, type: f.type, name: f.name };
              if (f.type === "time_limited") Object.assign(data, { start: f.start, end: f.end });
              await this.op("nfc_finish", data, { quiet: true });
            }
            run.status = st.status;
          } else if (run.left <= 0) {
            clearInterval(this._nfcTimer);
            run.status = "timeout";
          }
          this._nfc = run;
        } catch {
          clearInterval(this._nfcTimer);
          this._nfc = { ...this._nfc!, status: "failed" };
        } finally {
          polling = false;
        }
      }, 1000);
    });
  }

  private _closeNfc() {
    clearInterval(this._nfcTimer);
    this._nfc = undefined;
    this._form = undefined;
  }

  /* ---------------- rendering */

  protected override render() {
    const items = Object.entries(this.keypad[this.kind] || {}).sort((a, b) => Number(a[0]) - Number(b[0]));
    return html`<section class="card">
        ${items.length
          ? html`<div class="list">${items.map(([idx, it]) => this._row(idx, it))}</div>`
          : html`<div class="card-content secondary">${this.t("keypad.none_yet")}</div>`}
        ${this._nfc ? this._nfcView() : this._form ? (this._isCards ? this._cardForm() : this._passcodeForm()) : nothing}
        ${!this._form && !this._nfc
          ? html`<div class="card-actions">
              <button class="btn filled" data-act="new" @click=${this._newForm}>
                <sb-icon .path=${mdiPlus} .size=${18}></sb-icon>${this.t(this._isCards ? "keypad.add_card" : "keypad.add_code")}
              </button>
            </div>`
          : nothing}
      </section>
      ${this._existingForm()}`;
  }

  private _row(idx: string, it: Credential) {
    const renaming = this._rename?.index === idx;
    return html`<div class="item" data-index=${idx}>
      <span class="idx">#${idx}</span>
      ${renaming
        ? html`<span class="text rename">
            <input .value=${this._rename!.name} maxlength="40" aria-label=${this.t("keypad.name")}
              @input=${(e: Event) => (this._rename = { index: idx, name: (e.target as HTMLInputElement).value })} />
            <button class="btn filled small" data-act="rename-save" @click=${this._saveRename}>${this.t("common.save")}</button>
            <button class="btn small" @click=${() => (this._rename = undefined)}>${this.t("common.cancel")}</button>
          </span>`
        : html`<span class="text">
              <span class="headline">${it.name || "—"}</span>
              <span class="supporting">${this._typeLabel(it.type)} · ${this._validity(it)}</span>
            </span>
            <button class="icon-btn" title=${this.t("common.rename")} aria-label=${this.t("common.rename")} data-act="rename"
              @click=${() => (this._rename = { index: idx, name: it.name || "" })}><sb-icon .path=${mdiPencilOutline}></sb-icon></button>`}
      <button class="icon-btn danger" title=${this.t("common.delete")} aria-label=${this.t("common.delete")} data-act="delete"
        ?disabled=${this.busy} @click=${() => this._delete(idx, it)}><sb-icon .path=${mdiDeleteOutline}></sb-icon></button>
    </div>`;
  }

  private _typeSelect(types: string[]) {
    return html`<label class="field">${this.t("keypad.type")}
      <select data-f="type" @change=${(e: Event) => {
        const type = (e.target as HTMLSelectElement).value;
        // recurring codes default to no end date
        this._patch({ type, end: type === "periodic" ? "" : this._form!.end || localInput(new Date(Date.now() + DAY)) });
      }}>
        ${types.map((t) => html`<option value=${t} ?selected=${this._form!.type === t}>${this._typeLabel(t)}</option>`)}
      </select>
    </label>`;
  }

  private _dates() {
    const f = this._form!;
    return html`<label class="field">${this.t("keypad.valid_from")}
        <input type="datetime-local" data-f="start" .value=${f.start} @input=${(e: Event) => this._patch({ start: (e.target as HTMLInputElement).value })} />
      </label>
      <label class="field">${this.t("keypad.valid_to")}
        <input type="datetime-local" data-f="end" .value=${f.end} @input=${(e: Event) => this._patch({ end: (e.target as HTMLInputElement).value })} />
      </label>`;
  }

  private _nameField() {
    return html`<label class="field grow">${this.t("keypad.name")}
      <input data-f="name" .value=${this._form!.name} placeholder=${this.t("keypad.name_ph")} maxlength="40"
        @input=${(e: Event) => this._patch({ name: (e.target as HTMLInputElement).value })} />
    </label>`;
  }

  private _passcodeForm() {
    const f = this._form!;
    const timed = ["time_limited", "one_time", "periodic"].includes(f.type);
    const names = localizeList(this.hass, "keypad.weekdays");
    return html`<div class="form">
      <div class="row">
        ${this._nameField()}
        <label class="field">${this.t("keypad.code")}
          <span class="inline">
            <input class="code" data-f="code" .value=${f.code} inputmode="numeric" maxlength="12"
              @input=${(e: Event) => this._patch({ code: (e.target as HTMLInputElement).value })} />
            <button class="icon-btn" title=${this.t("keypad.generate")} aria-label=${this.t("keypad.generate")} data-act="gen"
              @click=${() => this._patch({ code: randomCode(Math.max(6, f.code.length)) })}><sb-icon .path=${mdiDiceMultipleOutline}></sb-icon></button>
          </span>
        </label>
      </div>
      <div class="row">${this._typeSelect(PASSCODE_TYPES)} ${timed ? this._dates() : nothing}</div>
      ${f.type === "periodic"
        ? html`<div class="row days">
              <span class="field">${this.t("keypad.days")}</span>
              ${names.map(
                (d, i) => html`<label class="day"><input type="checkbox" data-day=${i} .checked=${f.weekdays.includes(i)}
                  @change=${(e: Event) => {
                    const on = (e.target as HTMLInputElement).checked;
                    this._patch({ weekdays: on ? [...new Set([...f.weekdays, i])].sort() : f.weekdays.filter((x) => x !== i) });
                  }} />${d}</label>`,
              )}
            </div>
            <div class="row">
              <label class="field">${this.t("keypad.hours")}
                <span class="inline">
                  <input type="time" .value=${f.begin} @input=${(e: Event) => this._patch({ begin: (e.target as HTMLInputElement).value })} /> –
                  <input type="time" .value=${f.endTime} @input=${(e: Event) => this._patch({ endTime: (e.target as HTMLInputElement).value })} />
                </span>
              </label>
            </div>`
        : nothing}
      <div class="row end">
        <button class="btn" data-act="form-cancel" @click=${() => (this._form = undefined)}>${this.t("common.cancel")}</button>
        <button class="btn filled" data-act="passcode-save" ?disabled=${this.busy} @click=${this._savePasscode}>${this.t("common.add")}</button>
      </div>
    </div>`;
  }

  private _cardForm() {
    const f = this._form!;
    return html`<div class="form">
      <div class="row">${this._nameField()} ${this._typeSelect(CARD_TYPES)}</div>
      ${f.type === "time_limited" ? html`<div class="row">${this._dates()}</div>` : nothing}
      <div class="row end">
        <button class="btn" data-act="form-cancel" @click=${() => (this._form = undefined)}>${this.t("common.cancel")}</button>
        <button class="btn filled" data-act="card-start" ?disabled=${this.busy} @click=${this._startCard}>${this.t("common.add")}</button>
      </div>
    </div>`;
  }

  private _nfcView() {
    const n = this._nfc!;
    const keys = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) keys.push(svg`<circle cx=${20 + c * 11} cy=${26 + r * 11} r="3.2" class="key"/>`);
    return html`<div class="form nfc">
      <svg viewBox="0 0 120 80" class="nfcsvg" aria-hidden="true">
        <rect x="8" y="10" width="46" height="62" rx="6" class="dev"/>
        ${keys}
        <rect x="70" y=${n.status === "success" ? 18 : 24} width="40" height="28" rx="4" class="nfccard ${n.status || "wait"}"/>
        ${n.status ? null : svg`<path d="M62 30 q6 10 0 20 M58 26 q10 14 0 28" class="waves"/>`}
      </svg>
      <div>${n.status
        ? this.t(`keypad.nfc_status.${n.status}`)
        : html`${this.t("keypad.nfc_wait")} <span class="secondary">${this.t("keypad.nfc_left", { s: n.left })}</span>`}</div>
      <div class="row end">
        <button class="btn ${n.status === "success" ? "filled" : ""}" data-act="nfc-close" @click=${this._closeNfc}>
          ${n.status === "success" ? this.t("common.done") : this.t("common.cancel")}
        </button>
      </div>
    </div>`;
  }

  private _existingForm() {
    return html`<details class="card existing">
      <summary>${this.t("keypad.existing")}</summary>
      <div class="row">
        <label class="field">${this.t("keypad.index")}
          <input type="number" min="0" max="254" class="narrow" data-f="existing-index" .value=${this._existing.index}
            @input=${(e: Event) => (this._existing = { ...this._existing, index: (e.target as HTMLInputElement).value })} />
        </label>
        <label class="field grow">${this.t("keypad.name")}
          <input maxlength="40" data-f="existing-name" .value=${this._existing.name}
            @input=${(e: Event) => (this._existing = { ...this._existing, name: (e.target as HTMLInputElement).value })} />
        </label>
        <button class="btn outlined" data-act="existing" @click=${this._saveExisting}>${this.t("common.save")}</button>
      </div>
    </details>`;
  }

  static override styles = [
    sharedStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .idx {
        width: 36px;
        color: var(--secondary-text-color);
        font-variant-numeric: tabular-nums;
        flex: none;
      }
      .rename {
        flex-direction: row;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .rename input {
        flex: 1;
        min-width: 140px;
      }
      .icon-btn {
        color: var(--secondary-text-color);
      }
      .icon-btn.danger {
        color: var(--error-color, #db4437);
      }
      .form {
        border-top: 1px solid var(--divider-color);
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .inline {
        display: flex;
        gap: 6px;
        align-items: center;
      }
      input.code {
        width: 150px;
        letter-spacing: 2px;
        font-variant-numeric: tabular-nums;
      }
      input.narrow {
        width: 90px;
      }
      .days {
        align-items: center;
      }
      label.day {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 14px;
      }
      .existing {
        padding: 12px 16px;
        font-size: 14px;
        color: var(--secondary-text-color);
      }
      .existing summary {
        cursor: pointer;
      }
      .existing .row {
        margin-top: 12px;
      }
      .nfc {
        align-items: center;
        text-align: center;
      }
      .nfc .row {
        align-self: stretch;
      }
      .nfcsvg {
        width: 180px;
        height: 120px;
      }
      .nfcsvg .dev { fill: var(--secondary-background-color); stroke: var(--secondary-text-color); stroke-width: 1.5; }
      .nfcsvg .key { fill: var(--secondary-text-color); opacity: .6; }
      .nfcsvg .nfccard { fill: color-mix(in srgb, var(--primary-color) 25%, transparent); stroke: var(--primary-color); stroke-width: 1.5; }
      .nfcsvg .nfccard.success { fill: color-mix(in srgb, var(--success-color, #43a047) 30%, transparent); stroke: var(--success-color, #43a047); }
      .nfcsvg .nfccard.failed, .nfcsvg .nfccard.timeout, .nfcsvg .nfccard.already_exists, .nfcsvg .nfccard.not_dedicated_card { stroke: var(--error-color, #db4437); }
      .nfcsvg .nfccard.wait { animation: tap 1.6s ease-in-out infinite; }
      .nfcsvg .waves { fill: none; stroke: var(--primary-color); stroke-width: 1.5; stroke-linecap: round; opacity: .7; }
      @keyframes tap { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(-8px); } }
      @media (prefers-reduced-motion: reduce) { .nfcsvg .nfccard.wait { animation: none; } }
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
    "sb-keypad-credentials": SbKeypadCredentials;
  }
}
