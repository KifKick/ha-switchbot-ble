/**
 * Calibration step machines.
 *
 * They follow the SwitchBot app 10.10: Lock Ultra / Ultra Max
 * (docs/lock2-calibration.md), Lock Pro (docs/lockpro-calibration.md), Lock and
 * Lock Lite (docs/lock-calibration.md). The backend (panel/locks.py) exposes only
 * primitive actions and a live status stream.
 */

import type { StringKey } from "../../localize";
import type { LockStatus } from "../../types";

export const LOCK_STATE = {
  LOCKED: 0,
  UNLOCKED: 1,
  LOCKING: 2,
  UNLOCKING: 3,
  LOCKING_BLOCKED: 4,
  UNLOCKING_BLOCKED: 5,
  LATCH: 6,
  HALF: 7,
} as const;

export const MOVING = new Set<number>([LOCK_STATE.LOCKING, LOCK_STATE.UNLOCKING]);
export const BLOCKED = new Set<number>([LOCK_STATE.LOCKING_BLOCKED, LOCK_STATE.UNLOCKING_BLOCKED]);
export const LOCK_TYPE_EUROPE = 1;
export const LATCH_NIGHT_LATCH = 2; // latch type "night latch"
export const MIN_ROTATION = 10; // degrees, same threshold as the app
export const TEST_TIMEOUT = 60000; // app: test locking / unlocking, half-lock test
export const AUTO_TIMEOUT = 30000; // app: auto calibration steps
export const CLOSE_TIMEOUT = 20000; // app: lock after the calibration, magnet test

export type Mode = "auto" | "manual" | "half" | "door" | "pro" | "lock1" | "lite";

/** Calibratable lock models: the panel gets the library's model names (sbble Model). */
export type LockKind = "lock" | "lock_lite" | "lock_pro" | "lock_ultra" | "lock_ultra_max";

const KINDS: Record<string, LockKind> = {
  WoLock: "lock",
  "Lock Lite": "lock_lite",
  WoLockPro: "lock_pro",
  "Lock Ultra": "lock_ultra",
  "Lock Ultra Max": "lock_ultra_max",
};

/** The model a lock entry reports (``WoLockPro``, ``Lock Ultra Max`` …) as our kind. */
export function lockKind(model: string): LockKind {
  return KINDS[model] ?? (Object.values(KINDS).includes(model as LockKind) ? (model as LockKind) : "lock_ultra");
}

/** Lock (gen 1) status latch_type: 2 = the lock found a latch */
export const CLASSIC_LATCH = 2;
const SAVE_PAUSE_MS = 500; // the app waits after every saved position

/** Demo mode only: what the user does by hand in a step (demo/demo-locks.ts). */
export type LockDemoAction =
  | "turn_locked"
  | "turn_unlocked"
  | "release_latch"
  | "turn_half"
  | "door_ajar"
  | "door_against"
  | "door_close"
  | "lock_manual";

/** "home": back to the mode list, the calibration is over. */
export type StepResult = string;

export interface Choice {
  text: StringKey;
  run(): Promise<StepResult>;
}

export interface StepDef {
  /** key prefix in lock.steps (defaults to the step id) */
  strings?: string | (() => string);
  /** scene overrides (the door the step asks for when it is not ``door``) */
  scene?: { door?: "closed" | "ajar" | "open" | "against"; magnet?: boolean };
  /** live dial; hand: a hand on the knob in the scene */
  dial?: { hand?: boolean; showLockMark?: boolean };
  /** where the user turns the knob to; the dial arrow points that way */
  turnTo?: "locked" | "unlocked" | "half";
  bolt?: number;
  door?: "ajar" | "closed";
  success?: boolean;
  /** the user must tick "Done" before Next (guided steps of the auto calibration) */
  check?: boolean;
  /** label of the main button (default: Next) */
  button?: StringKey;
  choices?: Choice[] | (() => Choice[]);
  demo?: LockDemoAction[] | (() => LockDemoAction[]);
  /** runs when the step is shown */
  enter?(): void;
  canNext?(): boolean;
  hint?(): string;
  next?(): Promise<StepResult>;
}

export interface Flow {
  /** enter calibration mode (retried) before the first step */
  start: boolean;
  /** Lock Lite: "Calibrate again" first saves what was done, as the app does */
  recalibrateCommits?: boolean;
  steps(): string[];
  defs: Record<string, StepDef>;
  /** after start, before the first step */
  enter?(): Promise<void>;
}

export interface CalibrationContext {
  /** ask Night Latch / One-Piece (EU lock, setting not known) */
  askLatch: boolean;
  /** the lock is a night latch lock (EU only) */
  nightLatch: boolean;
  lockAngle?: number | null;
  unlockAngle?: number | null;
  startAngle?: number | null;
  /** Lock (gen 1): the latch question was answered in this run */
  latchAsked?: boolean;
}

/** What the flows need from the wizard component. */
export interface CalibrationHost {
  readonly status?: LockStatus;
  readonly model: LockKind;
  readonly ctx: CalibrationContext;
  /** the lock is in a calibration mode that must be left on cancel */
  started: boolean;
  act(action: string, extra?: Record<string, unknown>): Promise<void>;
  busy(text: StringKey): void;
  /** enter calibration mode, retried every 3 s like the app */
  startCalibration(): Promise<void>;
  /** wait for the lock to go into ``state`` (a move, not the state it is already in) */
  waitState(state: number, timeoutMs: number): Promise<LockStatus>;
  /** wait for a status flag to be raised again (auto_calibration_done, half_lock_calibration_done) */
  waitFlag(key: "auto_calibration_done" | "half_lock_calibration_done", timeoutMs: number): Promise<LockStatus>;
  /** wait until the motor stops in any end state; resolves on timeout too */
  waitStopped(timeoutMs: number): Promise<void>;
  complete(): Promise<void>;
  t(key: StringKey, vars?: Record<string, string | number>): string;
}

const rotated = (from: number | null | undefined, to: number | null | undefined) =>
  from !== null && from !== undefined && to !== null && to !== undefined && Math.abs(to - from) >= MIN_ROTATION;

/** As in the app: no calibration on a low or missing main battery. */
export function lowBattery(st?: LockStatus): boolean {
  const bs = st?.battery_status;
  if (bs === null || bs === undefined) return false;
  if (bs === 1 || bs === 2) return true; // MAIN_LOW, NO_MAIN
  const b = st?.battery;
  return b !== null && b !== undefined && b <= 10 && bs !== 0; // depleted
}

export function buildFlows(h: CalibrationHost): Record<Mode, Flow> {
  const st = () => h.status;
  const eu = () => st()?.lock_type === LOCK_TYPE_EUROPE;
  const nl = () => eu() && h.ctx.nightLatch;
  const variant = (key: string) => () => (nl() ? `${key}_nl` : key);
  const unlockCmd = () => (nl() ? "set_latch_position" : "set_unlock_position");
  const lockState = () => st()?.lock_state;
  const latchStep = () => (h.ctx.askLatch ? ["latch"] : []);
  const magnetAlarm = () => !!st()?.magnetic_position_alarm;
  const ultraMax = () => h.model === "lock_ultra_max";
  /** Lock (gen 1): Night Latch was chosen in the latch question */
  const classicVariant = (key: string) => () => (h.ctx.nightLatch ? `${key}_nl` : key);
  const pause = () => new Promise((r) => setTimeout(r, SAVE_PAUSE_MS));
  /** first-generation gate: any knob move (the app has no 10° rule there) */
  const moved = (from: number | null | undefined) => {
    const to = st()?.knob_angle;
    return from !== null && from !== undefined && to !== null && to !== undefined && to !== from;
  };
  /** Lock (gen 1): newer firmware reports the lock type; Next waits for it (firmware >= 64, as in the app) */
  const typeKnown = () => st()?.latch_type !== 0;
  /** test steps of Lock / Lock Lite: notifications off, then save */
  const finishClassic = async (): Promise<StepResult> => {
    h.busy("lock.saving");
    await h.act("notify_off");
    await h.complete();
    return "classic_done";
  };
  /** Lock (gen 1) unlocked step: unlock position + door open in one frame */
  const saveUnlock = async (): Promise<StepResult> => {
    h.busy("lock.saving");
    h.ctx.unlockAngle = st()?.knob_angle ?? null;
    await h.act("set_unlock_position_door_open"); // 570f4e030400c0c0
    await pause();
    return "l3";
  };
  const classicDone: StepDef = {
    strings: "done",
    success: true,
    choices: [{ text: "lock.finish", run: async () => "home" }],
  };

  /** The unlocked position by hand (manual mode, Lock Pro). */
  const unlockGate = {
    canNext: () => rotated(h.ctx.lockAngle, st()?.knob_angle) && (!nl() || st()?.latch_state === LATCH_NIGHT_LATCH),
    hint: () =>
      !rotated(h.ctx.lockAngle, st()?.knob_angle)
        ? h.t("lock.hint_unlock_first", { deg: MIN_ROTATION })
        : h.t("lock.hint_no_latch"),
  };

  /* ---- magnet (door sensor) calibration, also chained after a lock calibration */
  const doorDefs: Record<string, StepDef> = {
    door1: {
      door: "ajar",
      bolt: 0,
      demo: ["door_ajar"],
      async next() {
        h.busy("lock.saving");
        await h.act("set_door_open");
        return "door2";
      },
    },
    door2: {
      door: "closed",
      bolt: 0,
      demo: ["door_close"],
      async next() {
        // app: no magnet detected -> back to the open-door step, nothing sent
        if (magnetAlarm()) return "door_nomagnet";
        h.busy("lock.testing_lock");
        await h.act("set_door_closed");
        await h.act("test_lock");
        await h.waitStopped(CLOSE_TIMEOUT); // any end state; the app goes on after 20 s too
        h.busy("lock.saving");
        await h.complete(); // save; on error restore the previous calibration
        return "door_done";
      },
    },
    door_nomagnet: {
      strings: "nomagnet_door",
      door: "closed",
      choices: [{ text: "lock.try_again", run: async () => "door1" }],
    },
    door_done: {
      success: true,
      choices: [{ text: "lock.finish", run: async () => "home" }],
    },
  };

  /* ---- after a Lock Ultra / Ultra Max lock calibration: magnet, then close and lock */
  const lockDone: Record<string, StepDef> = {
    done: {
      success: true,
      strings: () => (magnetAlarm() ? "done_magnet" : "done"),
      choices: () =>
        magnetAlarm()
          ? [
              {
                text: "lock.calibrate_magnet",
                async run() {
                  await h.startCalibration();
                  return "door1";
                },
              },
              { text: "lock.skip", run: async () => "close" },
            ]
          : [{ text: "lock.next", run: async () => "close" }],
    },
    close: {
      door: "closed",
      bolt: 0,
      button: "lock.done_lock",
      demo: ["door_close"],
      async next() {
        h.busy("lock.testing_lock");
        await h.act("lock");
        await h.waitState(LOCK_STATE.LOCKED, CLOSE_TIMEOUT);
        return "home";
      },
    },
  };

  /* ---- guided steps (auto "No" branch), test unlock shared with manual */
  const guide1: StepDef = {
    strings: variant("g1"),
    dial: { hand: true },
    turnTo: "locked",
    bolt: 1,
    check: true,
    demo: ["turn_locked"],
    async next() {
      h.busy("lock.saving");
      await h.act("set_lock_position");
      h.ctx.lockAngle = st()?.knob_angle ?? null;
      return "g2";
    },
  };

  const testLockAfterUnlock = async (): Promise<StepResult> => {
    h.busy("lock.saving");
    await h.act(unlockCmd());
    h.ctx.unlockAngle = st()?.knob_angle ?? null;
    h.busy("lock.testing_lock");
    await h.act("test_lock");
    await h.waitState(LOCK_STATE.LOCKED, TEST_TIMEOUT);
    return "g3";
  };

  const guide2: StepDef = {
    strings: variant("g2"),
    dial: { hand: true, showLockMark: true },
    turnTo: "unlocked",
    bolt: 0,
    check: true,
    button: "lock.test_lock",
    demo: () => (nl() ? ["turn_unlocked", "release_latch"] : ["turn_unlocked"]),
    next: testLockAfterUnlock,
  };

  const testUnlock: StepDef = {
    strings: variant("g3"),
    dial: { showLockMark: true },
    bolt: 1,
    button: "lock.test_unlock",
    canNext: () => lockState() === LOCK_STATE.LOCKED,
    hint: () => h.t("lock.hint_lock_first"),
    async next() {
      h.busy("lock.testing_unlock");
      await h.act("test_unlock");
      await h.waitState(LOCK_STATE.UNLOCKED, TEST_TIMEOUT);
      h.busy("lock.saving");
      await h.complete();
      return "done";
    },
  };

  return {
    // Lock Ultra / Ultra Max: automatic calibration
    auto: {
      start: true,
      steps: () => [...latchStep(), "auto1", "auto2", "auto3"],
      defs: {
        auto1: {
          strings: variant("auto1"),
          scene: { door: "open" }, // "open the door and hold it"
          dial: { hand: true },
          turnTo: "unlocked",
          bolt: 0,
          demo: () => (nl() ? ["turn_unlocked", "release_latch"] : ["turn_unlocked"]),
          async next() {
            h.busy("lock.working");
            if (eu()) await h.act("set_latch", { has_latch: nl() });
            await h.act("auto_record_unlocked"); // records unlocked, drives to locked
            await h.waitFlag("auto_calibration_done", AUTO_TIMEOUT);
            return "auto2";
          },
        },
        auto2: {
          strings: variant("auto2"),
          dial: {},
          bolt: 1,
          choices: [
            {
              text: "lock.correct",
              async run() {
                h.busy("lock.working");
                await h.act("auto_record_locked"); // records locked, drives back
                await h.waitFlag("auto_calibration_done", AUTO_TIMEOUT);
                return "auto3";
              },
            },
            { text: "lock.no", run: async () => "g1" },
          ],
        },
        auto3: {
          strings: variant("auto3"),
          dial: {},
          bolt: 0,
          choices: [
            {
              text: "lock.correct",
              async run() {
                h.busy("lock.saving");
                await h.complete();
                return "done";
              },
            },
            { text: "lock.no", run: async () => "g2" },
          ],
        },
        g1: guide1,
        g2: guide2,
        g3: testUnlock,
        ...lockDone,
        ...doorDefs,
      },
    },
    // Lock Ultra / Ultra Max: manual calibration
    manual: {
      start: true,
      steps: () => [...latchStep(), "m1", "m2", "g3"],
      defs: {
        m1: {
          strings: variant("m1"),
          dial: { hand: true },
          turnTo: "locked",
          bolt: 1,
          demo: ["turn_locked"],
          async next() {
            h.busy("lock.saving");
            await h.act("set_lock_position");
            h.ctx.lockAngle = st()?.knob_angle ?? null;
            return "m2";
          },
        },
        m2: {
          strings: variant("m2"),
          dial: { hand: true, showLockMark: true },
          turnTo: "unlocked",
          bolt: 0,
          button: "lock.test_lock",
          demo: () => (nl() ? ["turn_unlocked", "release_latch"] : ["turn_unlocked"]),
          ...unlockGate,
          next: testLockAfterUnlock,
        },
        g3: testUnlock,
        ...lockDone,
        ...doorDefs,
      },
    },
    // Lock Pro: locked -> (latch) -> unlocked -> door open position
    // -> test unlocking -> test locking
    pro: {
      start: true,
      steps: () => ["p1", ...latchStep(), "p2", "p3", "p4", "p5"],
      defs: {
        p1: {
          dial: { hand: true },
          turnTo: "locked",
          bolt: 1,
          demo: ["turn_locked"],
          async next() {
            h.busy("lock.saving");
            await h.act("set_lock_position_door_closed");
            h.ctx.lockAngle = st()?.knob_angle ?? null;
            return h.ctx.askLatch ? "latch" : "p2";
          },
        },
        p2: {
          strings: variant("p2"),
          dial: { hand: true, showLockMark: true },
          turnTo: "unlocked",
          bolt: 0,
          demo: () => (nl() ? ["turn_unlocked", "release_latch"] : ["turn_unlocked"]),
          ...unlockGate,
          async next() {
            h.busy("lock.saving");
            await h.act(unlockCmd()); // or the latch position for a night latch
            h.ctx.unlockAngle = st()?.knob_angle ?? null;
            return "p3";
          },
        },
        p3: {
          door: "ajar",
          bolt: 1,
          demo: ["door_ajar", "lock_manual"],
          canNext: () => rotated(h.ctx.unlockAngle, st()?.knob_angle),
          hint: () => h.t("lock.hint_lock_by_hand"),
          async next() {
            if (magnetAlarm()) return "p3_nomagnet";
            h.busy("lock.saving");
            await h.act("set_door_open");
            return "p4";
          },
        },
        p3_nomagnet: {
          strings: "nomagnet_pro",
          door: "ajar",
          bolt: 1,
          choices: [
            { text: "lock.try_again", run: async () => "p3" },
            {
              text: "lock.skip",
              async run() {
                // the app's Skip still records the open door
                h.busy("lock.saving");
                await h.act("set_door_open");
                return "p4";
              },
            },
          ],
        },
        p4: {
          door: "ajar",
          bolt: 1,
          button: "lock.test_unlock",
          canNext: () => lockState() === LOCK_STATE.LOCKED,
          hint: () => h.t("lock.hint_lock_first"),
          async next() {
            h.busy("lock.testing_unlock");
            await h.act("test_unlock");
            await h.waitState(LOCK_STATE.UNLOCKED, TEST_TIMEOUT);
            return "p5";
          },
        },
        p5: {
          door: "closed",
          bolt: 0,
          button: "lock.test_lock",
          demo: ["door_close"],
          canNext: () => lockState() === LOCK_STATE.UNLOCKED,
          hint: () => h.t("lock.hint_unlock_test"),
          async next() {
            h.busy("lock.testing_lock");
            await h.act("test_lock");
            await h.waitState(LOCK_STATE.LOCKED, TEST_TIMEOUT);
            h.busy("lock.saving");
            await h.complete();
            return "pro_done";
          },
        },
        pro_done: {
          strings: "done",
          success: true,
          choices: [{ text: "lock.finish", run: async () => "home" }],
        },
      },
    },
    // Lock (gen 1): calibration, then the test screen
    lock1: {
      start: true,
      steps: () => ["l1", "l2", "l3", "l4", "l5"],
      defs: {
        l1: {
          door: "closed",
          dial: { hand: true },
          turnTo: "locked",
          bolt: 1,
          demo: ["turn_locked"],
          async next() {
            h.busy("lock.saving");
            h.ctx.lockAngle = st()?.knob_angle ?? null;
            await h.act("set_lock_position_door_closed");
            await pause();
            return "l2";
          },
        },
        l2: {
          door: "closed",
          dial: { hand: true, showLockMark: true },
          turnTo: "unlocked",
          bolt: 0,
          demo: ["turn_unlocked"],
          canNext: () => moved(h.ctx.lockAngle) && typeKnown(),
          hint: () => h.t(moved(h.ctx.lockAngle) ? "lock.hint_lock_type" : "lock.hint_turn_unlock"),
          async next() {
            // the lock reports a latch: the app asks, once
            if (st()?.latch_type === CLASSIC_LATCH && !h.ctx.latchAsked) return "latch1";
            return saveUnlock();
          },
        },
        latch1: {
          door: "closed",
          bolt: 0,
          choices: [
            {
              text: "lock.latch_need_key",
              async run() {
                h.ctx.latchAsked = true;
                h.ctx.nightLatch = true;
                h.busy("lock.saving");
                await h.act("set_latch_type"); // the unlock frame is skipped then
                h.ctx.unlockAngle = st()?.knob_angle ?? null;
                return "l3";
              },
            },
            {
              text: "lock.latch_no_key",
              async run() {
                h.ctx.latchAsked = true;
                h.ctx.nightLatch = false;
                return saveUnlock();
              },
            },
          ],
        },
        l3: {
          strings: classicVariant("l3"),
          // the door held against the frame, the bolt out in front of it; the magnet records it
          scene: { door: "against", magnet: true },
          dial: { showLockMark: true },
          turnTo: "locked",
          bolt: 1,
          demo: ["door_against", "lock_manual"],
          canNext: () => moved(h.ctx.unlockAngle) && typeKnown(),
          hint: () => h.t("lock.hint_lock_by_hand"),
          async next() {
            h.busy("lock.saving");
            await h.act("notify_off");
            await pause();
            await h.act("set_door_open");
            await h.act("notify"); // the test screen turns notifications on again
            return "l4";
          },
        },
        l4: {
          strings: classicVariant("l4"),
          scene: { door: "against" },
          bolt: 1,
          button: "lock.test_unlock",
          canNext: () => lockState() === LOCK_STATE.LOCKED,
          hint: () => h.t("lock.hint_lock_first"),
          async next() {
            h.busy("lock.testing_unlock");
            await h.act("test_unlock");
            await h.waitState(LOCK_STATE.UNLOCKED, TEST_TIMEOUT);
            return "l5";
          },
        },
        l5: {
          door: "closed",
          bolt: 0,
          button: "lock.test_lock",
          demo: ["door_close"],
          canNext: () => lockState() === LOCK_STATE.UNLOCKED,
          hint: () => h.t("lock.hint_unlock_test"),
          async next() {
            h.busy("lock.testing_lock");
            await h.act("test_lock");
            await h.waitState(LOCK_STATE.LOCKED, TEST_TIMEOUT);
            return finishClassic();
          },
        },
        classic_done: classicDone,
      },
    },
    // Lock Lite (no door sensor, no latch question)
    lite: {
      start: true,
      recalibrateCommits: true,
      steps: () => ["t1", "t2", "t3", "t4"],
      defs: {
        t1: {
          scene: { door: "open" },
          dial: { hand: true },
          turnTo: "locked",
          bolt: 1,
          demo: ["turn_locked"],
          async next() {
            h.busy("lock.saving");
            h.ctx.lockAngle = st()?.knob_angle ?? null;
            await h.act("set_lock_position_door_closed");
            await pause();
            return "t2";
          },
        },
        t2: {
          scene: { door: "open" },
          dial: { hand: true, showLockMark: true },
          turnTo: "unlocked",
          bolt: 0,
          button: "lock.test_lock",
          demo: ["turn_unlocked"],
          canNext: () => moved(h.ctx.lockAngle),
          hint: () => h.t("lock.hint_turn_unlock"),
          async next() {
            h.busy("lock.saving");
            h.ctx.unlockAngle = st()?.knob_angle ?? null;
            await h.act("set_unlock_position_door_open"); // 570f4e030400c0c0
            await pause();
            h.busy("lock.testing_lock");
            await h.act("test_lock");
            await h.waitState(LOCK_STATE.LOCKED, TEST_TIMEOUT);
            return "t3";
          },
        },
        t3: {
          scene: { door: "open" },
          dial: { showLockMark: true },
          bolt: 1,
          button: "lock.test_unlock",
          canNext: () => lockState() === LOCK_STATE.LOCKED,
          hint: () => h.t("lock.hint_lock_first"),
          async next() {
            h.busy("lock.testing_unlock");
            await h.act("test_unlock");
            await h.waitState(LOCK_STATE.UNLOCKED, TEST_TIMEOUT);
            return "t4";
          },
        },
        t4: {
          door: "closed",
          bolt: 0,
          canNext: () => lockState() === LOCK_STATE.UNLOCKED,
          hint: () => h.t("lock.hint_unlock_test"),
          async next() {
            h.busy("lock.testing_lock");
            await h.act("test_lock"); // the lock locks by itself
            await h.waitState(LOCK_STATE.LOCKED, TEST_TIMEOUT);
            return finishClassic();
          },
        },
        classic_done: classicDone,
      },
    },
    // Lock Ultra / Ultra Max: half-lock calibration (EU locks only)
    half: {
      start: false,
      steps: () => ["half1", "half2"],
      async enter() {
        h.busy("lock.starting");
        await h.act("notify");
        if (ultraMax()) {
          await h.act("half_lock_start"); // once per visit
          h.started = true;
        }
      },
      defs: {
        half1: {
          dial: { hand: true },
          turnTo: "half",
          bolt: 0.5,
          demo: ["turn_half"],
          enter() {
            h.ctx.startAngle = st()?.knob_angle ?? null;
          },
          canNext: () => rotated(h.ctx.startAngle, st()?.knob_angle),
          hint: () => h.t("lock.hint_turn", { deg: MIN_ROTATION }),
          async next() {
            h.busy("lock.testing_half");
            await h.act("half_lock_set_and_test");
            await h.waitFlag("half_lock_calibration_done", TEST_TIMEOUT);
            return "half2";
          },
        },
        half2: {
          dial: {},
          bolt: 0.5,
          choices: [
            {
              text: "lock.correct",
              async run() {
                h.busy("lock.saving");
                if (ultraMax()) {
                  await h.act("half_lock_complete");
                  h.started = false;
                }
                await h.act("half_lock_enable"); // the app turns Partially-Lock on
                return "half_done";
              },
            },
            { text: "lock.no", run: async () => "half1" },
          ],
        },
        half_done: {
          success: true,
          choices: [{ text: "lock.finish", run: async () => "home" }],
        },
      },
    },
    // Lock Ultra / Ultra Max: door sensor (magnet) calibration
    door: {
      start: true,
      steps: () => ["door1", "door2"],
      defs: doorDefs,
    },
  };
}

/** Modes offered for a lock; Lock Pro, Lock and Lock Lite have one wizard each, like the app. */
export function availableModes(model: LockKind, halfLock: boolean, autoCalibration: boolean, status?: LockStatus): Mode[] {
  if (model === "lock_pro") return ["pro"];
  if (model === "lock") return ["lock1"];
  if (model === "lock_lite") return ["lite"];
  const eu = status?.lock_type === LOCK_TYPE_EUROPE;
  return [...(autoCalibration ? (["auto"] as Mode[]) : []), "manual", ...(halfLock && eu ? (["half"] as Mode[]) : []), "door"];
}
