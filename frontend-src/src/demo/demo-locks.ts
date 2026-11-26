/**
 * Demo locks: one simulated lock per calibration branch (Lock Ultra EU with the
 * Night Latch setting unknown / known as Night Latch / known as One-Piece, a
 * non-EU Lock Ultra, Lock Pro EU, Lock Ultra Max EU) and a lock simulator that
 * answers calibration/subscribe and calibration/action like panel/locks.py:
 * knob angle, motor moves, status flags (auto calibration done, half-lock
 * test done), the latch the lock detects, the magnet alarm and the battery status.
 *
 * What the user does at the door (turn the knob, open the door ~10 cm …) are
 * buttons in the wizard step; error scenarios (jam, no magnet, low battery, no
 * answer) are switches in the demo bar.
 */

import type { LockDemoAction } from "../components/lock/calibration-flows";
import type { LockStatus, SwitchbotDevice } from "../types";

export type LockScenario = "block" | "nomagnet" | "lowbatt" | "timeout";
export type LockBarEvent = "knob" | "door";

interface DemoApi {
  setEntity(id: string, state: string, attributes?: Record<string, any>): void;
}

const LOCKED_ANGLE = 110;
const UNLOCKED_ANGLE = 20;
const HALF_ANGLE = 65;
const FULL_UNLOCK_ANGLE = 0;
const MOVE_MS = 1200;

interface LockDemo {
  id: string; // entry demo_<id>, device demo-<id>
  slug: string; // entity ids
  name: string;
  /** the library's model name, as the real panel gets it (sbble Model) */
  model: "Lock Ultra" | "WoLockPro" | "Lock Ultra Max" | "WoLock" | "Lock Lite";
  euro: boolean;
  /** Night Latch setting the panel gets (undefined: unknown, the wizard asks) */
  nightLatch?: boolean;
  /** magnet not calibrated yet: the wizard offers magnet calibration afterwards */
  magnetUncalibrated?: boolean;
  /** Lock (gen 1) / Lock Lite: lock type the lock reports (0 none, 1 normal, 2 latch) */
  latchType?: number;
}

const LOCK2_MODELS = new Set<LockDemo["model"]>(["Lock Ultra", "Lock Ultra Max"]);
const CLASSIC_MODELS = new Set<LockDemo["model"]>(["WoLock", "Lock Lite"]);

const LOCKS: LockDemo[] = [
  { id: "lock", slug: "lock_ultra_demo", name: "Lock Ultra", model: "Lock Ultra", euro: true, magnetUncalibrated: true },
  { id: "lock_nl", slug: "lock_ultra_nl_demo", name: "Lock Ultra EU Night Latch", model: "Lock Ultra", euro: true, nightLatch: true },
  { id: "lock_op", slug: "lock_ultra_op_demo", name: "Lock Ultra EU One-Piece", model: "Lock Ultra", euro: true, nightLatch: false },
  { id: "lock_us", slug: "lock_ultra_us_demo", name: "Lock Ultra non-EU", model: "Lock Ultra", euro: false },
  { id: "lockpro", slug: "lock_pro_demo", name: "Lock Pro", model: "WoLockPro", euro: true },
  { id: "ultramax", slug: "lock_ultra_max_demo", name: "Lock Ultra Max", model: "Lock Ultra Max", euro: true },
  { id: "lock1", slug: "lock_gen1_demo", name: "Lock", model: "WoLock", euro: false, latchType: 1 },
  { id: "lock1_nl", slug: "lock_gen1_nl_demo", name: "Lock Night Latch", model: "WoLock", euro: false, latchType: 2 },
  { id: "lite", slug: "lock_lite_demo", name: "Lock Lite", model: "Lock Lite", euro: false, latchType: 1 },
];

const FEATURES = {
  correction: false, device_calibration: false, lock_calibration: true, half_lock: false,
  auto_calibration: true, keypad: false,
};

export const LOCK_DEVICES: SwitchbotDevice[] = LOCKS.map((l, i) => ({
  entry_id: `demo_${l.id}`, device_id: `demo-${l.id}`, name: `${l.name} (demo)`, model: l.model,
  model_name: ({ WoLock: "Lock", WoLockPro: "Lock Pro" } as Record<string, string>)[l.model] ?? l.model,
  address: `DE:MO:00:00:03:${String(i).padStart(2, "0")}`, available: true, kind: "lock",
  features: {
    ...FEATURES,
    half_lock: LOCK2_MODELS.has(l.model) && l.euro,
    auto_calibration: LOCK2_MODELS.has(l.model),
    ...(l.nightLatch !== undefined ? { night_latch: l.nightLatch } : {}),
  },
}));

/** [device_id, entity slug, model] of every demo lock */
export const LOCK_SLUGS: [string, string, LockDemo["model"]][] = LOCKS.map((l) => [`demo-${l.id}`, l.slug, l.model]);

type StatusCb = (msg: { status: LockStatus; started: boolean }) => void;

interface Sim {
  def: LockDemo;
  st: LockStatus;
  subs: Set<StatusCb>;
  started: boolean;
  halfMode: boolean;
  scenarios: Set<LockScenario>;
  timer?: number;
  unlockAngle: number;
}

const sims: Record<string, Sim> = {};
let api: DemoApi;

export function setupLockDemo(demo: DemoApi): void {
  api = demo;
  for (const def of LOCKS) {
    const lock2 = LOCK2_MODELS.has(def.model);
    // what each library parser reports (lock_base.py): the first generation has no
    // lock_type / latch_state / magnet, only the knob angle and its own latch type
    const st: LockStatus = CLASSIC_MODELS.has(def.model)
      ? {
          available: true, lock_state: 0, knob_angle: LOCKED_ANGLE, calibration: true, battery: 87,
          latch_type: def.latchType ?? 0, self_adjusting: false,
          ...(def.model === "WoLock" ? { door_open: false } : {}),
        }
      : {
          available: true, lock_state: 0, knob_angle: LOCKED_ANGLE, door_open: false, calibration: true, battery: 87,
          lock_type: def.euro ? 1 : 0, latch_state: def.euro ? 1 : 0, magnetic_position_alarm: !!def.magnetUncalibrated,
          rotation_direction: 0,
          ...(lock2
            ? { battery_status: 0, auto_calibration_done: true, half_lock_calibration_done: false, half_lock_enabled: false }
            : {}),
        };
    sims[`demo_${def.id}`] = {
      def,
      st,
      subs: new Set(),
      started: false,
      halfMode: false,
      scenarios: new Set(),
      unlockAngle: UNLOCKED_ANGLE,
    };
  }
}

const simOf = (entryId: string) => sims[entryId];

function push(s: Sim) {
  for (const cb of s.subs) cb({ status: { ...s.st }, started: s.started });
}

function set(s: Sim, p: Partial<LockStatus>) {
  Object.assign(s.st, p);
  push(s);
  if (p.lock_state === 0 || p.lock_state === 1) api.setEntity(`lock.${s.def.slug}`, p.lock_state === 0 ? "locked" : "unlocked");
  if (p.door_open !== undefined) api.setEntity(`binary_sensor.${s.def.slug}_door`, p.door_open ? "on" : "off");
  if (p.battery !== undefined) api.setEntity(`sensor.${s.def.slug}_battery`, String(p.battery));
}

/** Knob to ``angle`` over ``ms``; ``during`` while moving, ``after`` at the end. */
function turn(s: Sim, angle: number, ms: number, during: Partial<LockStatus>, after: Partial<LockStatus>, done?: () => void) {
  clearInterval(s.timer);
  const start = s.st.knob_angle ?? 0;
  const t0 = Date.now();
  set(s, during);
  s.timer = window.setInterval(() => {
    const k = Math.min(1, (Date.now() - t0) / ms);
    set(s, { knob_angle: Math.round(start + (angle - start) * k) });
    if (k >= 1) {
      clearInterval(s.timer);
      set(s, after);
      done?.();
    }
  }, 150);
}

/**
 * The motor drives to ``to`` (0 locked, 1 unlocked, 7 half); scenarios: jam half way,
 * no answer at all.
 */
function motor(s: Sim, to: 0 | 1 | 7, angle: number, after: Partial<LockStatus> = {}, done?: () => void) {
  if (s.scenarios.has("timeout") && (s.started || s.halfMode)) return; // the lock never answers
  const moving = to === 1 ? 3 : 2;
  if (s.scenarios.has("block") && (s.started || s.halfMode)) {
    const mid = Math.round(((s.st.knob_angle ?? 0) + angle) / 2);
    turn(s, mid, MOVE_MS / 2, { lock_state: moving }, { lock_state: to === 1 ? 5 : 4 });
    return;
  }
  turn(s, angle, MOVE_MS, { lock_state: moving }, { lock_state: to, ...after }, done);
}

const HALF_ACTIONS = new Set(["half_lock_set_and_test", "half_lock_start", "half_lock_complete", "half_lock_enable"]);

/** Every calibration/action the demo locks got (read by tests/panel/run_panel.py). */
const actionLog: Record<string, unknown>[] = ((window as any).sbDemoLockActions = []);

/** calibration/action of panel/locks.py */
export function demoLockAction(msg: { entry_id: string; action: string; has_latch?: boolean }) {
  actionLog.push({ ...msg });
  const s = simOf(msg.entry_id);
  if (!s) throw new Error("demo: unknown lock");
  const a = msg.action;
  if (HALF_ACTIONS.has(a) && s.st.lock_type !== 1) throw new Error("ValueError: half lock needs an EU lock");
  const lock2 = LOCK2_MODELS.has(s.def.model);
  switch (a) {
    case "start":
      s.started = true;
      if (lock2) s.st.auto_calibration_done = false;
      break;
    case "notify":
    case "notify_off":
    case "set_latch_type":
    case "refresh":
    case "set_latch":
    case "set_lock_position":
    case "set_lock_position_door_closed":
    case "set_door_closed":
      break;
    case "set_unlock_position":
    case "set_unlock_position_door_open":
    case "set_latch_position":
      s.unlockAngle = s.st.knob_angle ?? UNLOCKED_ANGLE;
      break;
    case "set_door_open":
      s.st.magnetic_position_alarm = s.scenarios.has("nomagnet");
      break;
    case "auto_record_unlocked":
      s.unlockAngle = s.st.knob_angle ?? UNLOCKED_ANGLE;
      s.st.auto_calibration_done = false;
      // like the real lock: the motor drives until it stalls (locking blocked), then the flag
      motor(s, 0, LOCKED_ANGLE, { lock_state: 4 }, () => set(s, { auto_calibration_done: true, lock_state: 0 }));
      break;
    case "auto_record_locked":
      s.st.auto_calibration_done = false;
      motor(s, 1, s.unlockAngle, { lock_state: 5 }, () => set(s, { auto_calibration_done: true, lock_state: 1 }));
      break;
    case "test_lock":
    case "lock":
      motor(s, 0, LOCKED_ANGLE);
      break;
    case "test_unlock":
    case "unlock":
      motor(s, 1, s.unlockAngle);
      break;
    case "complete":
      s.started = false;
      s.st.calibration = true;
      break;
    case "recover":
      s.started = false;
      break;
    case "leave":
      s.started = false;
      s.halfMode = false;
      clearInterval(s.timer);
      break;
    case "half_lock_start":
      s.halfMode = true;
      s.started = true;
      break;
    case "half_lock_set_and_test":
      s.st.half_lock_calibration_done = false;
      motor(s, 7, HALF_ANGLE, {}, () => set(s, { half_lock_calibration_done: true }));
      break;
    case "half_lock_complete":
      s.halfMode = false;
      s.started = false;
      break;
    case "half_lock_enable":
      s.st.half_lock_enabled = true;
      break;
    default:
      throw new Error(`demo: unknown action ${a}`);
  }
  push(s);
  return { success: true, status: { ...s.st } };
}

/** calibration/subscribe; the backend leaves the calibration when the last watcher goes. */
export function demoLockSubscribe(entryId: string, cb: StatusCb): (() => void) | null {
  const s = simOf(entryId);
  if (!s) return null;
  s.subs.add(cb);
  setTimeout(() => push(s), 10);
  return () => {
    s.subs.delete(cb);
    if (!s.subs.size && s.started) demoLockAction({ entry_id: entryId, action: "leave" });
  };
}

/** lock.lock / lock.unlock of a demo lock entity */
export function demoLockService(entityId: string, service: string): boolean {
  const s = Object.values(sims).find((x) => `lock.${x.def.slug}` === entityId);
  if (!s) return false;
  if (service === "lock") motor(s, 0, LOCKED_ANGLE);
  else motor(s, 1, s.unlockAngle);
  return true;
}

/** The keypad demo unlocks the first lock. */
export function demoKeypadUnlock(): void {
  const s = simOf("demo_lock");
  if (s) motor(s, 1, s.unlockAngle);
}

/** What the user does at the door (wizard step buttons) and the demo bar knob / door. */
export function demoLockEvent(entryId: string, ev: LockDemoAction | LockBarEvent): void {
  const s = simOf(entryId);
  if (!s) return;
  const eu = s.st.lock_type === 1;
  const hand = (angle: number, after: Partial<LockStatus>) => turn(s, angle, 600, {}, after);
  switch (ev) {
    case "knob":
      set(s, { knob_angle: (s.st.knob_angle ?? 0) + 20 });
      break;
    case "door":
      set(s, { door_open: !s.st.door_open });
      break;
    case "turn_locked":
    case "lock_manual":
      hand(LOCKED_ANGLE, { lock_state: 0, latch_state: eu ? 1 : 0 });
      break;
    case "turn_unlocked":
      // an EU lock does not report the night latch when the knob just stops at unlocked
      hand(UNLOCKED_ANGLE, { lock_state: 1, latch_state: eu ? 1 : 0 });
      break;
    case "release_latch":
      // fully unlocked first, then released to where the latch extends
      hand(FULL_UNLOCK_ANGLE, { lock_state: 1 });
      window.setTimeout(() => hand(UNLOCKED_ANGLE, { lock_state: 1, latch_state: eu ? 2 : 0 }), 700);
      break;
    case "turn_half":
      // a second try starts where the test left the knob: turn a bit further
      hand(Math.abs((s.st.knob_angle ?? 0) - HALF_ANGLE) < 10 ? HALF_ANGLE + 15 : HALF_ANGLE, { lock_state: 1 });
      break;
    case "door_ajar":
    case "door_against":
      set(s, { door_open: true });
      break;
    case "door_close":
      set(s, { door_open: false });
      break;
  }
}

/** Error scenarios offered in the demo bar for a lock. */
export function lockScenarios(entryId?: string): LockScenario[] {
  const s = entryId ? simOf(entryId) : undefined;
  if (!s) return [];
  // the Lock Pro reports no battery status (the app checks it on Lock Ultra / Ultra Max only)
  if (CLASSIC_MODELS.has(s.def.model)) return ["block", "timeout"]; // no magnet check, no battery status
  return s.def.model === "WoLockPro" ? ["block", "nomagnet", "timeout"] : ["block", "nomagnet", "lowbatt", "timeout"];
}

export function lockScenarioOn(entryId: string, sc: LockScenario): boolean {
  return !!simOf(entryId)?.scenarios.has(sc);
}

export function toggleLockScenario(entryId: string, sc: LockScenario): void {
  const s = simOf(entryId);
  if (!s) return;
  if (s.scenarios.has(sc)) s.scenarios.delete(sc);
  else s.scenarios.add(sc);
  const on = s.scenarios.has(sc);
  if (sc === "lowbatt") set(s, { battery: on ? 8 : 87, battery_status: on ? 1 : 0 });
  else if (sc === "nomagnet") set(s, { magnetic_position_alarm: on || !!s.def.magnetUncalibrated });
  else if (sc === "block" && !on && s.st.lock_state !== null && s.st.lock_state >= 4) set(s, { lock_state: 1 });
  else push(s);
}
