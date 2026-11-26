import { css, html, nothing } from "lit";
import type { PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";
import { mdiAlertOutline, mdiChevronRight } from "@mdi/js";

import { coverAction, subscribeCoverStatus, unsubscribeLater } from "../../api";
import { SbElement, errorMessage, safeElement } from "../../base";
import type { StringKey } from "../../localize";
import { sharedStyles } from "../../styles";
import type { CoverStatus, SwitchbotDevice, Unsubscribe } from "../../types";
import "../sb-icon";
import { COVER_ICONS, coverArt, coverArtStyles, type CoverVariant } from "./cover-art";
import {
  CoverError,
  MIN_BATTERY,
  availableModes,
  buildFlow,
  isMoving,
  openShare,
  startAction,
  variantOf,
  type CoverContext,
  type CoverFlow,
  type CoverHost,
  type CoverMode,
  type CoverStep,
} from "./cover-flows";

const MODE_ICONS: Record<CoverMode, string> = {
  smart: COVER_ICONS.auto,
  custom: COVER_ICONS.manual,
  correction: COVER_ICONS.auto,
  full: COVER_ICONS.manual,
  route: COVER_ICONS.up,
  tilt: COVER_ICONS.hand,
};
const STUCK_REASONS = new Set(["stuck", "step_timeout"]);

interface Waiter {
  check(st?: CoverStatus): void;
}

const freshContext = (): CoverContext => ({ side: "left", logo: "inside", roll: "standard", jogged: false, nextOk: false });

/** "Calibration" section of a curtain, roller shade or blind tilt. */
@safeElement("sb-cover-calibration")
export class SbCoverCalibration extends SbElement implements CoverHost {
  @property({ attribute: false }) device!: SwitchbotDevice;

  @state() status?: CoverStatus;
  @state() private _mode?: CoverMode;
  @state() private _step?: string;
  @state() private _busy?: string;
  @state() private _error?: string;
  @state() private _retry = false;
  @state() private _checked = false;
  @state() private _jogging?: string;

  ctx: CoverContext = freshContext();
  private _started = false;
  private _waiters: Waiter[] = [];
  private _sub?: Promise<Unsubscribe>;
  private _flow?: CoverFlow;
  private _askedLastAuto = false;

  get model(): string {
    return this.device.model;
  }

  get variant(): CoverVariant {
    return variantOf(this.model, this.status);
  }

  /** demo mode runs every wait ten times faster */
  private get _timeScale(): number {
    return (this.hass as any)?.sbDemo ? 0.1 : 1;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.hass && !this._sub) this._subscribe();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    // leaving mid-calibration: the backend sends the exit frames
    unsubscribeLater(this._sub);
    this._sub = undefined;
    this._waiters = [];
  }

  protected override firstUpdated(): void {
    if (!this._sub) this._subscribe();
  }

  /** Another device in the same element: leave the old one, start over. */
  protected override willUpdate(changed: PropertyValues<this>): void {
    const old = changed.get("device") as SwitchbotDevice | undefined;
    if (!old || old.entry_id === this.device.entry_id) return;
    unsubscribeLater(this._sub);
    this._sub = undefined;
    this._waiters = [];
    Object.assign(this, { status: undefined, _mode: undefined, _step: undefined, _busy: undefined, _error: undefined,
      _flow: undefined, _jogging: undefined, _started: false, _askedLastAuto: false });
    this.ctx = freshContext();
    if (this.hass) this._subscribe();
  }

  private _subscribe() {
    this._sub = subscribeCoverStatus(this.hass, this.device.entry_id, (msg) => this._onStatus(msg.status));
    this._sub.catch((err) => (this._error = errorMessage(err)));
  }

  private _onStatus(status: CoverStatus) {
    const wasMoving = isMoving(this.model, this.status);
    this.status = status;
    // Smart Correction is offered after a calibrated automatic run (570F468104)
    if (!this._askedLastAuto && status.calibration && status.new_auto && this.model.startsWith("curtain")) {
      this._askedLastAuto = true;
      this.read("last_auto").catch(() => undefined);
    }
    if (status.calibration_next) this.ctx.nextOk = true;
    if (this._jogging && wasMoving && !isMoving(this.model, status)) {
      this._jogging = undefined;
      if (this.model === "roller_shade" && STUCK_REASONS.has(status.motor_stop_reason ?? "")) {
        this._fail(new CoverError(this.t("cover.err_stuck")));
      }
    }
    if (this.model === "blind_tilt" && status.calibration_wrong_way && this._step && this._step !== "b1") {
      this._error = this.t("cover.err_wrong_way");
      this._retry = false;
    }
    for (const w of [...this._waiters]) w.check(status);
  }

  /* ---------------- CoverHost */

  busy(text: StringKey | null): void {
    this._busy = text ? this.t(text) : undefined;
  }

  async act(action: string, value?: number): Promise<void> {
    const res = await coverAction(this.hass, this.device.entry_id, value === undefined ? { action } : { action, value });
    if (res?.status) this._onStatus(res.status);
    if (!res?.success) throw new Error(this.t("cover.err_command"));
    if (["start", "start_auto", "start_manual", "start_new_auto", "smart_correction", "route_start"].includes(action)) this._started = true;
    if (["exit", "complete", "route_confirm", "finished", "abort"].includes(action)) this._started = false;
  }

  async read(what: string): Promise<any> {
    const res = await coverAction(this.hass, this.device.entry_id, { read: what });
    if (res?.status) this._onStatus(res.status);
    return res?.result;
  }

  waitFor(pred: (st: CoverStatus) => boolean, timeoutMs: number): Promise<CoverStatus> {
    return new Promise((resolve, reject) => {
      const done = () => {
        clearTimeout(timer);
        this._waiters = this._waiters.filter((w) => w !== waiter);
      };
      const waiter: Waiter = {
        check: (st) => {
          if (!st) return;
          if (st.stuck || st.move_state === "stuck") {
            done();
            reject(new CoverError(this.t("cover.err_stuck")));
          } else if (pred(st)) {
            done();
            resolve(st);
          }
        },
      };
      const timer = setTimeout(() => {
        done();
        reject(new CoverError(this.t("cover.err_timeout")));
      }, timeoutMs * this._timeScale);
      this._waiters.push(waiter);
      waiter.check(this.status);
    });
  }

  sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms * Math.max(this._timeScale, 0.3)));
  }

  /* ---------------- flow control */

  private _def(): CoverStep | undefined {
    return this._step && this._step !== "done" ? this._flow?.defs[this._step] : undefined;
  }

  private async _startMode(mode: CoverMode) {
    this._mode = mode;
    this.ctx = freshContext();
    this._error = undefined;
    this._step = undefined;
    this._flow = buildFlow(this, mode);
    const start = startAction(this.model, mode, this.status);
    try {
      if (start) {
        this.busy("cover.starting");
        await this.act(start);
      }
      this._busy = undefined;
      this._goto(this._flow.steps()[0]);
    } catch (err) {
      this._busy = undefined;
      this._error = errorMessage(err);
      this._mode = undefined;
    }
  }

  /** Show a step and run its ``enter``. */
  private _goto(target: string) {
    const steps = this._flow!.steps();
    let id = target;
    if (target === "@next") id = steps[steps.indexOf(this._step!) + 1] ?? "done";
    if (target === "restart") id = steps[0];
    this._step = id;
    this._checked = false;
    this._jogging = undefined;
    const def = this._def();
    if (def?.enter) this._run(() => def.enter!());
  }

  private async _run(fn: () => Promise<string | void>) {
    this._error = undefined;
    this._retry = false;
    try {
      const next = await fn();
      this._busy = undefined;
      if (next) this._goto(next);
    } catch (err) {
      this._fail(err);
    }
  }

  /** A failed step: retry the step, or leave calibration (pause + exit) and offer a restart. */
  private async _fail(err: unknown) {
    this._busy = undefined;
    this._waiters = [];
    this._error = errorMessage(err);
    this._retry = err instanceof CoverError && err.recover === "retry";
    if (!this._retry && this._started) await this.act("abort").catch(() => undefined);
  }

  private async _cancel(ask = true) {
    if (this._started && ask && !confirm(this.t("cover.confirm_cancel"))) return;
    this._waiters = [];
    if (this._started) {
      this.busy("cover.cancelling");
      await this.act("abort").catch(() => undefined);
    }
    this._mode = undefined;
    this._step = undefined;
    this._busy = undefined;
    this._error = undefined;
    this._flow = undefined;
  }

  private async _jog(dir: "left" | "right" | "up" | "down") {
    this._error = undefined;
    try {
      if (this._jogging === dir) {
        this._jogging = undefined;
        await this.act("pause");
      } else {
        this._jogging = dir;
        this.ctx.jogged = true;
        await this.act(`jog_${dir}`);
      }
    } catch (err) {
      this._jogging = undefined;
      this._error = errorMessage(err);
    }
  }

  /* ---------------- rendering */

  protected override render() {
    return html`${this._live()} ${this._mode ? this._wizard() : this._home()}`;
  }

  private _value(v: unknown, f: (x: any) => string = String) {
    return v === null || v === undefined ? "—" : f(v);
  }

  private _motionText(st: CoverStatus): string {
    const m = st.motion ?? st.motion_status ?? st.move_state;
    return m ? this.t(`cover.motion.${m}` as StringKey) : "—";
  }

  private _live() {
    const st = this.status;
    const tilt = this.model === "blind_tilt";
    return html`<section class="card">
      <h2 class="card-header">${this.t("cover.live")}</h2>
      <div class="card-content">
        ${!st
          ? html`<div class="busy"><span class="spinner"></span>${this.t("cover.connecting")}</div>`
          : html`${st.available === false
                ? html`<div class="alert warning"><sb-icon .path=${mdiAlertOutline}></sb-icon><div class="text">${this.t("cover.offline")}</div></div>`
                : nothing}
              <div class="chips">
                <span class="chip"><b>${this.t("cover.state")}</b> <span id="c-motion">${this._motionText(st)}</span></span>
                <span class="chip"><b>${this.t(tilt ? "cover.tilt" : "cover.position")}</b>
                  <span id="c-pos">${this._value(tilt ? st.tilt : st.position, (v) => `${v}%`)}</span></span>
                <span class="chip"><b>${this.t("cover.calibrated")}</b> ${this._value(st.calibration, (c) => this.t(c ? "common.yes" : "common.no"))}</span>
                <span class="chip"><b>${this.t("cover.battery")}</b> ${this._value(st.battery, (b) => `${b}%`)}</span>
                ${st.firmware ? html`<span class="chip"><b>${this.t("cover.firmware")}</b> ${st.firmware}</span>` : nothing}
                ${st.mount_type ? html`<span class="chip"><b>${this.t("cover.mount")}</b> ${this.t(`cover.mounts.${st.mount_type}` as StringKey)}</span>` : nothing}
                ${st.slat_direction ? html`<span class="chip"><b>${this.t("cover.slats")}</b> ${this.t(`cover.slat.${st.slat_direction}` as StringKey)}</span>` : nothing}
              </div>`}
      </div>
    </section>`;
  }

  private _homeScene() {
    const st = this.status;
    if (this.model === "blind_tilt") return { view: "front" as const, tilt: st?.tilt ?? 50 };
    return { view: "front" as const, open: openShare(st), side: this.ctx.side };
  }

  private _home() {
    const st = this.status;
    const modes = availableModes(this.model, st);
    const low = st?.battery !== null && st?.battery !== undefined && st.battery < MIN_BATTERY;
    return html`<section class="card">
      <h2 class="card-header">${this.t("cover.choose")}</h2>
      <div class="card-content">
        <div class="art single">${coverArt(this.variant, this._homeScene())}</div>
        <p class="intro">${this.t(`cover.intro.${this.model}` as StringKey)}</p>
        <p class="intro">${this.t("cover.experimental")}</p>
        ${low ? html`<div class="alert warning"><sb-icon .path=${mdiAlertOutline}></sb-icon><div class="text">${this.t("cover.err_battery", { min: MIN_BATTERY })}</div></div>` : nothing}
        ${this._error ? html`<div class="alert error"><div class="text">${this._error}</div></div>` : nothing}
      </div>
      <div class="list modes">
        ${modes.map(
          (m) => html`<button class="item" data-mode=${m} ?disabled=${low || !st} @click=${() => this._startMode(m)}>
            <sb-icon class="leading" .path=${MODE_ICONS[m]}></sb-icon>
            <span class="text">
              <span class="headline">${this.t(`cover.modes.${m}` as StringKey)}</span>
              <span class="supporting">${this.t(`cover.modes.${m}_desc` as StringKey)}</span>
            </span>
            <sb-icon .path=${mdiChevronRight}></sb-icon>
          </button>`,
        )}
      </div>
    </section>`;
  }

  private _wizard() {
    const steps = this._flow?.steps() ?? [];
    const idx = this._step ? steps.indexOf(this._step) : -1;
    const head = html`<h2 class="card-header">
      ${this.t(`cover.modes.${this._mode}` as StringKey)}<span class="spacer"></span>
      ${idx >= 0 ? html`<span class="steplabel">${this.t("cover.step", { n: idx + 1, total: steps.length })}</span>` : nothing}
    </h2>`;
    if (!this._step) {
      return html`<section class="card wizard">${head}
        <div class="card-content">
          ${this._busy ? html`<div class="busy"><span class="spinner"></span>${this._busy}</div>` : nothing}
          ${this._error ? html`<div class="alert error"><div class="text">${this._error}</div></div>` : nothing}
        </div>
        <div class="card-actions">${this._cancelButton()}</div>
      </section>`;
    }
    const def = this._def();
    const key = this._step === "done" ? "done" : (def?.strings ?? this._step);
    const scene = this._step === "done" ? { view: "result" as const, ok: true } : this._error && !this._retry ? { view: "result" as const, ok: false } : def!.scene();
    const prefix = `cover.steps.${this.model.startsWith("curtain") ? "curtain" : this.model}.${key}`;
    return html`<section class="card wizard" data-step=${this._step}>
      ${head}
      <div class="card-content">
        <div class="art single">${coverArt(this.variant, scene)}</div>
        <div class="wz-title">${this.t(`${prefix}_title` as StringKey)}</div>
        <div class="wz-text">${this.t(`${prefix}_text` as StringKey)}</div>
        ${def?.check
          ? html`<label class="check"><input type="checkbox" .checked=${this._checked}
              @change=${(e: Event) => (this._checked = (e.target as HTMLInputElement).checked)} />${this.t(def.check)}</label>`
          : nothing}
        ${def?.jog ? this._jogControls(def.jog) : nothing}
        ${def?.demo && (this.hass as any)?.sbDemoEvent ? this._demoActions(def.demo) : nothing}
        ${this._busy ? html`<div class="busy"><span class="spinner"></span>${this._busy}</div>` : nothing}
        ${this._error ? html`<div class="alert error"><sb-icon .path=${mdiAlertOutline}></sb-icon><div class="text">${this._error}</div></div>` : nothing}
        ${def?.hint && def.canNext && !def.canNext() && !this._busy ? html`<div class="hint">${def.hint()}</div>` : nothing}
      </div>
      <div class="card-actions">${this._actions(def)}</div>
    </section>`;
  }

  private _jogControls(kind: "horizontal" | "vertical") {
    const dirs = kind === "horizontal" ? (["left", "right"] as const) : (["up", "down"] as const);
    return html`<div class="jog">
      ${dirs.map(
        (d) => html`<button class="jogbtn ${this._jogging === d ? "on" : ""}" data-jog=${d} ?disabled=${!!this._busy}
          aria-label=${this.t(`cover.jog_${d}` as StringKey)} title=${this.t(`cover.jog_${d}` as StringKey)}
          @click=${() => this._jog(d)}>
          <sb-icon .path=${this._jogging === d ? COVER_ICONS.pause : COVER_ICONS[d]}></sb-icon>
        </button>`,
      )}
      <span class="joghint">${this.t("cover.jog_hint")}</span>
    </div>`;
  }

  /** Demo mode: the user's manual part of the step (pull the curtain, turn the wand). */
  private _demoActions(events: string[]) {
    return html`<div class="demo-acts">
      <span>${this.t("cover.demo_hint")}</span>
      ${events.map(
        (ev) => html`<button class="btn outlined" data-demo-step=${ev}
          @click=${() => (this.hass as any).sbDemoEvent(this.device.entry_id, ev)}>${this.t(`demo.cover.${ev}` as StringKey)}</button>`,
      )}
    </div>`;
  }

  private _cancelButton() {
    return html`<button class="btn" data-act="cancel" @click=${() => this._cancel()}>${this.t("common.cancel")}</button>`;
  }

  private _actions(def?: CoverStep) {
    if (this._step === "done") {
      return html`<button class="btn filled" data-act="home" @click=${() => this._cancel(false)}>${this.t("cover.done")}</button>`;
    }
    if (this._error && !this._retry) {
      return html`<button class="btn filled" data-act="home" @click=${() => this._cancel(false)}>${this.t("cover.back_to_start")}</button>`;
    }
    const busy = !!this._busy;
    if (def?.choices) {
      return html`${this._cancelButton()}
        ${def.choices.map(
          (c, i) => html`<button class="btn ${c.primary ? "filled" : "outlined"}" data-choice=${i} ?disabled=${busy}
            @click=${() => this._run(() => c.run())}>
            ${c.icon ? html`<sb-icon .path=${(COVER_ICONS as Record<string, string>)[c.icon] ?? c.icon} .size=${18}></sb-icon>` : nothing}${this.t(c.text)}
          </button>`,
        )}`;
    }
    const pause = def?.pause
      ? html`<button class="btn outlined" data-act="pause" ?disabled=${!busy} @click=${() => this.act("pause").catch((e) => (this._error = errorMessage(e)))}>
          <sb-icon .path=${COVER_ICONS.pause} .size=${18}></sb-icon>${this.t("cover.pause")}</button>`
      : nothing;
    if (!def?.next) return html`${this._cancelButton()}${pause}`;
    const canNext = !busy && !this._jogging && (!def.check || this._checked) && (!def.canNext || def.canNext());
    return html`${this._cancelButton()}${pause}
      <button class="btn filled" data-act="next" ?disabled=${!canNext} @click=${() => this._run(() => def.next!())}>
        ${this.t(def.nextText ?? (def.finish ? "cover.finish" : "cover.next"))}
      </button>`;
  }

  static override styles = [
    sharedStyles,
    coverArtStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      h2.card-header {
        margin: 0;
      }
      .steplabel {
        font-size: 14px;
        color: var(--secondary-text-color);
      }
      .modes {
        border-top: 1px solid var(--divider-color);
      }
      .modes .item sb-icon.leading {
        color: var(--primary-color);
      }
      .modes .item[disabled] {
        opacity: 0.5;
        pointer-events: none;
      }
      .art {
        display: flex;
        justify-content: center;
        padding: 12px;
        border-radius: 12px;
        background: var(--secondary-background-color);
      }
      .art svg {
        width: 100%;
        max-width: 420px;
        max-height: 260px;
      }
      .wz-title {
        font-size: 18px;
        font-weight: 500;
        margin-top: 16px;
      }
      .wz-text {
        margin-top: 6px;
        line-height: 1.45;
        white-space: pre-line;
      }
      .hint {
        margin-top: 8px;
        color: var(--secondary-text-color);
        font-size: 13px;
      }
      .busy {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-top: 12px;
        color: var(--secondary-text-color);
      }
      .alert {
        margin-top: 12px;
      }
      .check {
        display: flex;
        gap: 8px;
        align-items: center;
        margin-top: 12px;
        cursor: pointer;
      }
      .check input {
        width: 18px;
        height: 18px;
        accent-color: var(--primary-color);
      }
      .jog {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-top: 14px;
        flex-wrap: wrap;
      }
      .jogbtn {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        border: 2px solid var(--primary-color);
        background: none;
        color: var(--primary-color);
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .jogbtn.on {
        background: var(--primary-color);
        color: var(--text-primary-color, #fff);
      }
      .jogbtn[disabled] {
        opacity: 0.4;
        cursor: default;
      }
      .joghint {
        color: var(--secondary-text-color);
        font-size: 13px;
        flex: 1;
        min-width: 160px;
      }
      .demo-acts {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
        margin-top: 14px;
        padding: 10px 12px;
        border-radius: 12px;
        border: 1px dashed var(--warning-color, #ffa600);
      }
      .demo-acts span {
        font-size: 13px;
        color: var(--secondary-text-color);
        flex: 1 1 100%;
      }
      .card-actions .btn sb-icon {
        margin-right: 4px;
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
    "sb-cover-calibration": SbCoverCalibration;
  }
}
