import { css, html, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import { mdiAlertCircleOutline, mdiDialpad, mdiLockOpenVariantOutline, mdiLockOutline, mdiRefresh } from "@mdi/js";

import { fetchEventHistory } from "../api";
import { SbElement, errorMessage, safeElement } from "../base";
import { findEntity } from "../devices";
import { formatDateTime, type StringKey } from "../localize";
import { sharedStyles } from "../styles";
import type { HistoryRecord, SwitchbotDevice } from "../types";
import "./sb-icon";

const DAYS = 14;

/** How the records of each device kind read. */
const KINDS = {
  lock: {
    events: "history.lock_events",
    sources: "history.lock_sources",
    bad: new Set(["lock_failed", "unlock_failed", "latch_release_failed", "door_left_open",
      "left_unlocked", "low_temperature", "low_power"]),
    icon: (type: string) => (type === "locked" || type === "half_locked" ? mdiLockOutline : mdiLockOpenVariantOutline),
  },
  keypad: {
    events: "keypad.events",
    sources: "keypad.sources",
    bad: new Set(["unlock_failed", "verification_failed", "expired_credential", "lock_failed", "locked_out", "tamper"]),
    icon: () => mdiDialpad,
  },
} as const;

/**
 * "History" section of a lock or keypad: the records its history event entity
 * fired, from the recorder (reloaded whenever the entity fires again).
 */
@safeElement("sb-history")
export class SbHistory extends SbElement {
  @property({ attribute: false }) device!: SwitchbotDevice;
  @state() private _records?: HistoryRecord[];
  @state() private _error?: string;
  @state() private _loading = false;
  private _lastEvent?: string;

  private get _kind() {
    return KINDS[this.device.kind === "keypad" ? "keypad" : "lock"];
  }

  private get _entityId(): string | undefined {
    return findEntity(this.hass, this.device, (e) => e.domain === "event")?.entity_id;
  }

  protected override updated(): void {
    // the event entity's state is the time of its last event
    const id = this._entityId;
    const stamp = id ? this.hass.states[id]?.state : undefined;
    if (id && stamp !== this._lastEvent && !this._loading) {
      this._lastEvent = stamp;
      this._load();
    }
  }

  private async _load() {
    const id = this._entityId;
    if (!id) return;
    this._loading = true;
    this._error = undefined;
    try {
      this._records = await fetchEventHistory(this.hass, id, DAYS);
    } catch (err) {
      this._error = errorMessage(err);
    } finally {
      this._loading = false;
    }
  }

  protected override render() {
    if (!this._entityId) return html`<div class="card"><div class="card-content">${this.t("history.no_entity")}</div></div>`;
    return html`<section class="card">
      <h2 class="card-header">${this.t("history.days", { n: DAYS })}<span class="spacer"></span>
        <button class="icon-btn" title=${this.t("common.reload")} aria-label=${this.t("common.reload")} ?disabled=${this._loading}
          @click=${this._load}><sb-icon .path=${mdiRefresh}></sb-icon></button>
      </h2>
      <div class="card-content"><p class="intro">${this.t("history.intro")}</p></div>
      ${this._error ? html`<div class="card-content"><div class="alert error"><div class="text">${this._error}</div></div></div>` : nothing}
      ${!this._records
        ? html`<div class="card-content busy"><span class="spinner"></span>${this.t("common.loading")}</div>`
        : !this._records.length
          ? html`<div class="card-content secondary">${this.t("history.empty")}</div>`
          : html`<div class="list">${this._records.map((r) => this._row(r))}</div>`}
    </section>`;
  }

  /** Translated label, or the raw value for one the panel does not know yet. */
  private _label(key: string, value: string): string {
    const text = this.t(`${key}.${value}` as StringKey);
    return text === `${key}.${value}` ? value : text;
  }

  private _row(r: HistoryRecord) {
    const kind = this._kind;
    const bad = kind.bad.has(r.type);
    const who = r.credential_name || (r.unknown_credential ? this.t("history.unknown_cred") : "");
    const how = [
      r.source ? this._label(kind.sources, r.source) : "",
      r.credential ? this._label("history.credentials", r.credential) : "",
      who || (r.credential_id !== undefined && r.credential_id !== null ? `#${r.credential_id}` : ""),
    ]
      .filter(Boolean)
      .join(" · ");
    return html`<div class="item">
      <sb-icon class="leading ${bad ? "bad" : ""}" .path=${bad ? mdiAlertCircleOutline : kind.icon(r.type)}></sb-icon>
      <span class="text">
        <span class="headline ${bad ? "error-text" : ""}">${this._label(kind.events, r.type)}</span>
        ${how ? html`<span class="supporting">${how}</span>` : nothing}
      </span>
      <span class="meta">${formatDateTime(this.hass, r.time)}</span>
    </div>`;
  }

  static override styles = [
    sharedStyles,
    css`
      h2.card-header {
        margin: 0;
      }
      .busy {
        display: flex;
        gap: 10px;
        align-items: center;
        color: var(--secondary-text-color);
      }
      .list {
        border-top: 1px solid var(--divider-color);
      }
      sb-icon.leading.bad {
        color: var(--error-color, #db4437);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "sb-history": SbHistory;
  }
}
