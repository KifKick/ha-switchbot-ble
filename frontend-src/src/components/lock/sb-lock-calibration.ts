import { css, html, nothing } from "lit";
import { property, state } from "lit/decorators.js";
import {
  mdiAlertOutline,
  mdiAutoFix,
  mdiBatteryAlertVariantOutline,
  mdiChevronRight,
  mdiDoorClosedLock,
  mdiLockMinus,
  mdiRotateRight,
} from "@mdi/js";

import { lockAction, subscribeLockStatus, unsubscribeLater } from "../../api";
import { SbElement, errorMessage, safeElement } from "../../base";
import { localizeList, type StringKey } from "../../localize";
import { sharedStyles } from "../../styles";
import type { LockStatus, SwitchbotDevice, Unsubscribe } from "../../types";
import "../sb-icon";
import { artStyles, blockArt, dialArt, doorArt, latchTypeArt, lockSceneArt, resultArt } from "./lock-art";
import {
  BLOCKED,
  LOCK_STATE,
  LOCK_TYPE_EUROPE,
  MOVING,
  availableModes,
  buildFlows,
  lockKind,
  lowBattery,
  type CalibrationContext,
  type CalibrationHost,
  type Choice,
  type Flow,
  type LockDemoAction,
  type LockKind,
  type Mode,
  type StepDef,
} from "./calibration-flows";

const MODE_ICONS: Record<Mode, string> = {
  auto: mdiAutoFix,
  manual: mdiRotateRight,
  half: mdiLockMinus,
  door: mdiDoorClosedLock,
  pro: mdiRotateRight,
  lock1: mdiRotateRight,
  lite: mdiRotateRight,
};

const START_RETRY_MS = 3000; // app: enter calibration again every 3 s until it succeeds
const START_TRIES = 10;

interface Waiter {
  check(st?: LockStatus): void;
}

class BlockedError extends Error {
  blocked = true;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** "Calibration" section of a lock: live status, mode choice and the step wizard. */
@safeElement("sb-lock-calibration")
export class SbLockCalibration extends SbElement implements CalibrationHost {
  @property({ attribute: false }) device!: SwitchbotDevice;

  @state() status?: LockStatus;
  @state() private _mode?: Mode;
  @state() private _step?: string;
  @state() private _busy?: string;
  @state() private _error?: string;
  @state() private _blocked = false;
  @state() private _checked = false;
  /** shown on the home screen after "Check the installation" */
  @state() private _notice?: "install";

  ctx: CalibrationContext = { askLatch: false, nightLatch: false };
  started = false;
  private _waiters: Waiter[] = [];
  private _sub?: Promise<Unsubscribe>;
  private _flows?: Record<Mode, Flow>;

  get model(): LockKind {
    return lockKind(this.device.model);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.hass && !this._sub) this._subscribe();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    // leaving mid-calibration: tell the lock now; the backend does it as well when the
    // last watcher goes (recover restores the previous calibration, half_lock_complete ends half-lock)
    if (this.started) {
      this.started = false;
      lockAction(this.hass, this.device.entry_id, "leave").catch(() => undefined);
    }
    unsubscribeLater(this._sub);
    this._sub = undefined;
    this._waiters = [];
  }

  protected override firstUpdated(): void {
    if (!this._sub) this._subscribe();
  }

  private _subscribe() {
    this._sub = subscribeLockStatus(this.hass, this.device.entry_id, (msg) => this._onStatus(msg.status));
    this._sub.catch((err) => (this._error = errorMessage(err)));
  }

  private _onStatus(status: LockStatus) {
    this.status = status;
    for (const w of [...this._waiters]) w.check(status);
  }

  /* ---------------- CalibrationHost */

  busy(text: StringKey): void {
    this._busy = this.t(text);
  }

  async act(action: string, extra: Record<string, unknown> = {}): Promise<void> {
    const res = await lockAction(this.hass, this.device.entry_id, action, extra);
    if (res?.status) this._onStatus(res.status);
    if (!res?.success) throw new Error(this.t("lock.err_command"));
  }

  async startCalibration(): Promise<void> {
    this.busy("lock.starting");
    for (let i = 1; ; i++) {
      try {
        await this.act("start");
        this.started = true;
        return;
      } catch (err) {
        if (i >= START_TRIES || !this.isConnected) throw err;
        await sleep(START_RETRY_MS);
      }
    }
  }

  /**
   * Resolve when ``predicate`` holds; a blocked motor rejects with BlockedError
   * unless ``blockedEnds``; the timeout rejects unless ``resolveOnTimeout``.
   */
  private _waitFor(
    predicate: (st: LockStatus) => boolean,
    timeoutMs: number,
    { blockedEnds = false, resolveOnTimeout = false } = {},
  ): Promise<LockStatus> {
    return new Promise((resolve, reject) => {
      const done = () => {
        clearTimeout(timer);
        this._waiters = this._waiters.filter((w) => w !== waiter);
      };
      // a jam the lock still reports from before the wait does not count
      let armed = false;
      const waiter: Waiter = {
        check: (st) => {
          if (!st) return;
          const blocked = st.lock_state !== null && BLOCKED.has(st.lock_state);
          if (!blocked) armed = true;
          if (blocked && !blockedEnds) {
            if (armed) {
              done();
              reject(new BlockedError(this.t("lock.err_blocked")));
            }
          } else if (predicate(st)) {
            done();
            resolve(st);
          }
        },
      };
      const timer = setTimeout(() => {
        done();
        if (resolveOnTimeout) resolve(this.status!);
        else reject(new Error(this.t("lock.err_timeout")));
      }, timeoutMs);
      this._waiters.push(waiter);
      waiter.check(this.status);
    });
  }

  /** A move into ``state``: the state the lock is in when the wait starts does not count. */
  waitState(target: number, timeoutMs: number): Promise<LockStatus> {
    let left = false;
    return this._waitFor((st) => {
      if (st.lock_state !== target) left = true;
      return left && st.lock_state === target;
    }, timeoutMs);
  }

  /**
   * The flag must be (re)raised: seen cleared or the motor moving first.
   * Auto calibration finds the end positions by driving the motor until it stalls,
   * so the lock reports locking/unlocking blocked there; the app
   * ignores the lock state on those steps and waits for the flag only.
   */
  waitFlag(key: "auto_calibration_done" | "half_lock_calibration_done", timeoutMs: number): Promise<LockStatus> {
    const auto = key === "auto_calibration_done";
    let reset = false;
    return this._waitFor(
      (st) => {
        const moving = st.lock_state !== null && MOVING.has(st.lock_state);
        const stalled = st.lock_state !== null && BLOCKED.has(st.lock_state);
        if (moving || !st[key] || (auto && stalled)) reset = true;
        return reset && !moving && !!st[key];
      },
      timeoutMs,
      { blockedEnds: auto },
    );
  }

  /** Magnet test: the motor moved and stopped, whatever the end state; 20 s at most. */
  async waitStopped(timeoutMs: number): Promise<void> {
    let moved = false;
    await this._waitFor(
      (st) => {
        const moving = st.lock_state !== null && MOVING.has(st.lock_state);
        if (moving) moved = true;
        return moved && !moving;
      },
      timeoutMs,
      { blockedEnds: true, resolveOnTimeout: true },
    );
  }

  async complete(): Promise<void> {
    try {
      await this.act("complete");
    } catch (err) {
      // same as the app: a failed "complete" restores the previous calibration
      await this.act("recover").catch(() => undefined);
      this.started = false;
      throw err;
    }
    this.started = false;
  }

  /* ---------------- flow control */

  private get flows(): Record<Mode, Flow> {
    return (this._flows ??= buildFlows(this));
  }

  private _goto(step: string) {
    if (step === "home") {
      this._home_();
      return;
    }
    this._step = step;
    this._checked = false;
    this._def()?.enter?.();
  }

  private _home_() {
    this._mode = undefined;
    this._step = undefined;
    this._busy = undefined;
    this._error = undefined;
    this._blocked = false;
  }

  private async _startMode(mode: Mode) {
    this._mode = mode;
    const known = this.device.features.night_latch;
    const eu = this.status?.lock_type === LOCK_TYPE_EUROPE;
    this.ctx = {
      askLatch: eu && (known === null || known === undefined),
      nightLatch: eu && known === true,
    };
    this._error = undefined;
    this._blocked = false;
    this._notice = undefined;
    this._step = undefined;
    const flow = this.flows[mode];
    try {
      if (flow.start) await this.startCalibration();
      await flow.enter?.();
      this._goto(flow.steps()[0]);
    } catch (err) {
      this._error = errorMessage(err);
      await this._leave();
      this._mode = undefined;
    }
    this._busy = undefined;
  }

  private async _run(fn: () => Promise<string>) {
    this._error = undefined;
    this._blocked = false;
    try {
      this._goto(await fn());
    } catch (err) {
      this._error = errorMessage(err);
      this._blocked = err instanceof BlockedError;
    }
    this._busy = undefined;
  }

  private async _leave() {
    this._waiters = [];
    if (!this.started) return;
    this.busy("lock.cancelling");
    this.started = false;
    // recover + notifications off + status, or half_lock_complete for half-lock (panel/locks.py)
    await this.act("leave").catch(() => undefined);
  }

  private async _cancel(ask = true) {
    if (this.started && ask && !confirm(this.t("lock.confirm_cancel"))) return;
    await this._leave();
    this._home_();
  }

  /**
   * Jam dialog: "Recalibrate" starts the mode again, nothing of the step is repeated.
   * Lock Lite: the app first saves what was done (notifications off, complete).
   */
  private async _recalibrate() {
    const mode = this._mode!;
    if (this.flows[mode].recalibrateCommits && this.started) {
      this.busy("lock.saving");
      this._waiters = [];
      this.started = false;
      await this.act("notify_off").catch(() => undefined);
      await this.act("complete").catch(() => undefined);
    }
    await this._leave();
    this._home_();
    await this._startMode(mode);
  }

  private async _checkInstall() {
    await this._leave();
    this._home_();
    this._notice = "install";
  }

  private _chooseLatch(nightLatch: boolean) {
    this.ctx.nightLatch = nightLatch;
    const steps = this.flows[this._mode!].steps();
    this._goto(steps[steps.indexOf("latch") + 1]);
  }

  /* ---------------- rendering */

  protected override render() {
    return html`${this._live()} ${this._mode ? this._wizard() : this._home()}
      ${!this._mode && this._error ? html`<div class="alert error"><div class="text">${this._error}</div></div>` : nothing}`;
  }

  private _live() {
    const st = this.status;
    const states = localizeList(this.hass, "lock.states");
    const val = <T,>(v: T | null | undefined, f: (x: T) => string) => (v === null || v === undefined ? "—" : f(v));
    return html`<section class="card">
      <h2 class="card-header">${this.t("lock.live")}</h2>
      <div class="card-content">
        ${!st
          ? html`<div class="busy"><span class="spinner"></span>${this.t("lock.connecting")}</div>`
          : html`${st.available === false
                ? html`<div class="alert warning"><sb-icon .path=${mdiAlertOutline}></sb-icon><div class="text">${this.t("lock.offline")}</div></div>`
                : nothing}
              <div class="chips">
                <span class="chip"><b>${this.t("lock.state")}</b> <span id="c-state">${val(st.lock_state, (s) => states[s] ?? String(s))}</span></span>
                <span class="chip"><b>${this.t("lock.angle")}</b> <span id="c-angle">${val(st.knob_angle, (a) => `${a}°`)}</span></span>
                ${this.model === "lock_lite"
                  ? nothing
                  : html`<span class="chip"><b>${this.t("lock.door")}</b> ${val(st.door_open, (o) => this.t(o ? "lock.door_open" : "lock.door_closed"))}</span>`}
                <span class="chip"><b>${this.t("lock.calibrated")}</b> ${val(st.calibration, (c) => this.t(c ? "common.yes" : "common.no"))}</span>
                <span class="chip"><b>${this.t("lock.battery")}</b> ${val(st.battery, (b) => `${b}%`)}</span>
                ${st.lock_type !== null && st.lock_type !== undefined
                  ? html`<span class="chip"><b>${this.t("lock.lock_type")}</b> <span id="c-type">${this.t(st.lock_type === LOCK_TYPE_EUROPE ? "lock.type_eu" : "lock.type_other")}</span></span>`
                  : nothing}
                ${st.latch_state || st.latch_type
                  ? html`<span class="chip"><b>${this.t("lock.latch")}</b> <span id="c-latch">${this.t((st.latch_state || st.latch_type) === 2 ? "lock.latch_night" : "lock.latch_normal")}</span></span>`
                  : nothing}
              </div>`}
      </div>
    </section>`;
  }

  private _home() {
    const f = this.device.features;
    const modes = availableModes(this.model, f.half_lock, f.auto_calibration, this.status);
    const low = lowBattery(this.status);
    return html`<section class="card">
      <h2 class="card-header">${this.t("lock.choose")}</h2>
      <div class="card-content">
        <p class="intro">${this.t("lock.experimental")}</p>
        ${low
          ? html`<div class="alert warning" id="lowbatt"><sb-icon .path=${mdiBatteryAlertVariantOutline}></sb-icon>
              <div class="text">${this.t("lock.low_battery")}</div></div>`
          : nothing}
        ${this._notice === "install"
          ? html`<div class="alert warning" id="install"><sb-icon .path=${mdiAlertOutline}></sb-icon>
              <div class="text pre">${this.t("lock.jam_install")}</div></div>`
          : nothing}
      </div>
      <div class="list modes">
        ${modes.map(
          (m) => html`<button class="item" data-mode=${m} ?disabled=${low || !this.status} @click=${() => this._startMode(m)}>
            <sb-icon class="leading" .path=${MODE_ICONS[m]}></sb-icon>
            <span class="text">
              <span class="headline">${this.t(`lock.modes.${m}`)}</span>
              <span class="supporting">${this.t(`lock.modes.${m}_desc`)}</span>
            </span>
            <sb-icon .path=${mdiChevronRight}></sb-icon>
          </button>`,
        )}
      </div>
    </section>`;
  }

  private _def(): StepDef | undefined {
    if (!this._mode || !this._step || this._step === "latch") return undefined;
    return this.flows[this._mode].defs[this._step];
  }

  private _stringsKey(def?: StepDef): string {
    if (this._step === "latch") return "latch";
    const s = def?.strings;
    return typeof s === "function" ? s() : (s ?? this._step!);
  }

  private _wizard() {
    const mode = this._mode!;
    const head = html`<h2 class="card-header">
      ${this.t(`lock.modes.${mode}`)}<span class="spacer"></span>${this._stepLabel()}
    </h2>`;
    if (!this._step) {
      return html`<section class="card wizard">${head}
        <div class="card-content"><div class="busy"><span class="spinner"></span>${this._busy ?? ""}</div></div>
      </section>`;
    }
    if (this._blocked) return this._jam(head);
    const def = this._def();
    const key = this._stringsKey(def);
    const canNext = !this._busy && (!def?.check || this._checked) && (!def?.canNext || def.canNext());
    const hint = def?.canNext && !def.canNext() && !this._busy && def.hint ? def.hint() : "";
    const demo = def?.demo ? (typeof def.demo === "function" ? def.demo() : def.demo) : [];
    return html`<section class="card wizard" data-step=${this._step}>
      ${head}
      <div class="card-content">
        ${this._step === "latch" ? this._latchChoice() : this._illustration(def)}
        <div class="wz-title">${this.t(`lock.steps.${key}_title`)}</div>
        <div class="wz-text">${this.t(`lock.steps.${key}_text`)}</div>
        ${def?.check
          ? html`<label class="check"><input type="checkbox" data-act="check" .checked=${this._checked} ?disabled=${!!this._busy}
                @change=${(e: Event) => (this._checked = (e.target as HTMLInputElement).checked)} />
              ${this.t("lock.check_done")}</label>`
          : nothing}
        ${hint ? html`<div class="hint">${hint}</div>` : nothing}
        ${this.status?.self_adjusting
          ? html`<div class="alert warning"><sb-icon .path=${mdiAlertOutline}></sb-icon><div class="text">${this.t(this.model === "lock_lite" ? "lock.emergency_power" : "lock.self_adjusting")}</div></div>`
          : nothing}
        ${demo.length && (this.hass as any)?.sbDemoLockEvent && !this._busy ? this._demoActions(demo) : nothing}
        ${this._busy ? html`<div class="busy"><span class="spinner"></span>${this._busy}</div>` : nothing}
        ${this._error
          ? html`<div class="alert error"><sb-icon .path=${mdiAlertOutline}></sb-icon><div class="text">${this._error}</div></div>`
          : nothing}
      </div>
      <div class="card-actions">${this._actions(def, canNext)}</div>
    </section>`;
  }

  /** Night Latch Lock vs One-Piece Lock (the app's question). */
  private _latchChoice() {
    return html`<div class="latch-choice">
      ${([true, false] as const).map(
        (nl) => html`<button class="latch-opt" data-act=${nl ? "latch-night" : "latch-onepiece"} @click=${() => this._chooseLatch(nl)}>
          ${latchTypeArt(nl)}
          <span class="headline">${this.t(nl ? "lock.latch_night_lock" : "lock.latch_one_piece")}</span>
          <span class="supporting">${this.t(nl ? "lock.latch_night_desc" : "lock.latch_one_piece_desc")}</span>
        </button>`,
      )}
    </div>`;
  }

  /** Motor blocked: like the app's jam dialog, no "retry the step". */
  private _jam(head: unknown) {
    return html`<section class="card wizard" data-step="jam">
      ${head}
      <div class="card-content">
        <div class="art single">${blockArt(this.model)}</div>
        <div class="wz-title">${this.t("lock.jam_title")}</div>
        <div class="wz-text">${this.t("lock.jam_text")}</div>
      </div>
      <div class="card-actions">
        <button class="btn" data-act="cancel" @click=${() => this._cancel(false)}>${this.t("common.cancel")}</button>
        <button class="btn outlined" data-act="install" @click=${() => this._checkInstall()}>${this.t("lock.jam_check_install")}</button>
        <button class="btn filled" data-act="recalibrate" @click=${() => this._recalibrate()}>${this.t("lock.recalibrate")}</button>
      </div>
    </section>`;
  }

  private _demoActions(actions: LockDemoAction[]) {
    return html`<div class="demo-acts">
      <span>${this.t("lock.demo_hint")}</span>
      ${actions.map(
        (a) => html`<button class="btn outlined" data-demo-step=${a}
          @click=${() => (this.hass as any).sbDemoLockEvent(this.device.entry_id, a)}>${this.t(`demo.lock.${a}` as StringKey)}</button>`,
      )}
    </div>`;
  }

  private _stepLabel() {
    const steps = this.flows[this._mode!].steps();
    const idx = this._step ? steps.indexOf(this._step) : -1;
    return idx >= 0 ? html`<span class="steplabel">${this.t("lock.step", { n: idx + 1, total: steps.length })}</span>` : nothing;
  }

  private _actions(def: StepDef | undefined, canNext: boolean) {
    const cancel = html`<button class="btn" data-act="cancel" ?disabled=${!!this._busy} @click=${() => this._cancel(!def?.success)}>${this.t("common.cancel")}</button>`;
    if (this._step === "latch") return cancel;
    const choices: Choice[] = def?.choices ? (typeof def.choices === "function" ? def.choices() : def.choices) : [];
    if (choices.length) {
      return html`${def?.success ? nothing : cancel}
        ${choices.map(
          (c, i) => html`<button class="btn ${i === 0 ? "filled" : "outlined"}" data-choice=${i} ?disabled=${!!this._busy}
            @click=${() => {
              this.busy("lock.working");
              this._run(() => c.run());
            }}>${this.t(c.text)}</button>`,
        )}`;
    }
    return html`${cancel}
      <button class="btn filled" data-act="next" ?disabled=${!canNext} @click=${() => this._run(() => def!.next!())}>
        ${this.t(def?.button ?? "lock.next")}
      </button>`;
  }

  private _illustration(def?: StepDef) {
    const st = this.status;
    const lockState = st?.lock_state ?? null;
    const moving = lockState !== null && MOVING.has(lockState);
    const blocked = lockState !== null && BLOCKED.has(lockState);
    if (def?.success) return html`<div class="art single">${resultArt(true)}</div>`;
    // Lock (gen 1) latch question: a night latch lock vs a door without latch (the app's question)
    if (this._step === "latch1") return html`<div class="art"><div>${latchTypeArt(true)}</div><div>${latchTypeArt(false)}</div></div>`;
    const liveBolt =
      lockState === LOCK_STATE.LOCKED ? 1 : lockState === LOCK_STATE.HALF ? 0.5 : lockState === LOCK_STATE.UNLOCKED ? 0 : null;
    // while waiting show the live bolt, otherwise the position the user should reach
    const bolt = this._busy ? (liveBolt ?? def?.bolt ?? 0) : (def?.bolt ?? liveBolt ?? 0);
    const model = this.model;
    const marks =
      def?.dial?.showLockMark && this.ctx.lockAngle !== undefined && this.ctx.lockAngle !== null
        ? [{ angle: this.ctx.lockAngle, cls: "lockmark" }]
        : [];
    // rotation_direction: 0 = the knob turns clockwise to lock (to be confirmed on a real lock)
    const lockCw = st?.rotation_direction !== 1;
    // half-lock: the direction depends on where the knob starts, so no arrow
    const arrow =
      def?.turnTo && def.turnTo !== "half" && !this._busy ? ((def.turnTo === "unlocked") !== lockCw ? "cw" : "ccw") : undefined;
    // the bubble shows the state the step is about (as in the app); none for the half-lock
    const target = def?.turnTo ?? (def?.bolt === 1 ? "locked" : def?.bolt === 0 ? "unlocked" : null);
    const door = def?.scene?.door ?? def?.door ?? (st?.door_open ? "ajar" : "closed");
    const scene = lockSceneArt(model, {
      bolt,
      nightLatch: this.ctx.nightLatch,
      markers: this.ctx.nightLatch && def?.turnTo === "unlocked",
      hand: !!def?.dial?.hand || (model === "lock_pro" && door === "ajar" && !!def?.demo),
      bubble: target === "locked" || target === "unlocked" ? target : null,
      door,
      magnet: !!def?.door || !!def?.scene?.magnet,
      knob: st?.knob_angle,
      blocked,
      moving,
    });
    const side = def?.door
      ? doorArt(def.door === "ajar" ? 18 : 0)
      : dialArt({ model, angle: st?.knob_angle, marks, moving, arrow });
    return html`<div class="art"><div>${scene}</div><div>${side}</div></div>`;
  }

  static override styles = [
    sharedStyles,
    artStyles,
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
        cursor: default;
      }
      .wz-title {
        font-size: 18px;
        font-weight: 500;
        margin-top: 16px;
      }
      .wz-text,
      .pre {
        margin-top: 6px;
        line-height: 1.45;
        white-space: pre-line;
      }
      .hint {
        margin-top: 8px;
        color: var(--secondary-text-color);
        font-size: 13px;
      }
      .check {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 12px;
        cursor: pointer;
      }
      .check input {
        width: 18px;
        height: 18px;
        accent-color: var(--primary-color);
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
      .latch-choice {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .latch-opt {
        display: flex;
        flex-direction: column;
        gap: 6px;
        text-align: left;
        padding: 16px;
        border-radius: 12px;
        border: 1px solid var(--divider-color);
        background: var(--secondary-background-color);
        color: var(--primary-text-color);
        font: inherit;
        cursor: pointer;
      }
      .latch-opt:hover {
        border-color: var(--primary-color);
      }
      .latch-opt .headline {
        font-weight: 500;
        font-size: 16px;
      }
      .latch-opt .supporting {
        color: var(--secondary-text-color);
        font-size: 13px;
        line-height: 1.4;
      }
      .demo-acts {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
        margin-top: 12px;
        padding: 8px 12px;
        border-radius: 8px;
        border: 1px dashed var(--warning-color, #ffa600);
        font-size: 13px;
        color: var(--secondary-text-color);
      }
      @media (max-width: 600px) {
        :host {
          gap: 8px;
        }
        .latch-choice {
          grid-template-columns: 1fr;
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "sb-lock-calibration": SbLockCalibration;
  }
}
