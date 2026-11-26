/**
 * Demo covers: one simulated device per model and variant (Curtain 3 on U / I
 * rail and on a rod, Curtain Track 4 with solar panel / Extended Battery / as a
 * pair, Roller Shade, Blind Tilt with horizontal and vertical slats), their
 * entities, a motion simulator (speed by motion mode) and a calibration
 * simulator answering covers/subscribe and covers/action like panel/covers.py.
 */

import type { CoverStatus, SwitchbotDevice } from "../types";

type Text = string | [en: string, pl: string];
type Category = "config" | "diagnostic" | null;
export interface DemoApi {
  entity(id: string, device: string, name: Text, state: string, attributes?: Record<string, any>, category?: Category,
    labels?: Record<string, Text>): void;
  setEntity(id: string, state: string, attributes?: Record<string, any>): void;
  getEntity(id: string): { state: string; attributes: Record<string, any> } | undefined;
}

export type CoverScenario = "block" | "timeout" | "short" | "nomagnet" | "lowbatt";

interface Sim {
  entry: string;
  device: string; // device_id
  slug: string;
  model: "curtain_3" | "curtain_track_4" | "roller_shade" | "blind_tilt";
  st: CoverStatus;
  timer?: number;
  scenarios: Set<CoverScenario>;
  awaitPull?: "open" | "correction";
  subs: Set<(msg: { status: CoverStatus; started: boolean }) => void>;
  started: boolean;
  route?: boolean;
}

const FEATURES = {
  correction: false, device_calibration: false, lock_calibration: false, half_lock: false,
  auto_calibration: false, keypad: false, cover_calibration: true,
};

const VARIANTS: [id: string, name: string, model: Sim["model"], extra: Partial<CoverStatus>][] = [
  ["c3u", "Curtain 3 U rail", "curtain_3", { mount_type: "u_rail" }],
  ["c3i", "Curtain 3 I rail", "curtain_3", { mount_type: "i_rail" }],
  // firmware 2.1: the older Smart calibration (no pull-to-start, open side chosen)
  ["c3rod", "Curtain 3 Rod Type", "curtain_3", { mount_type: "rod", firmware: 2.1, new_auto: false }],
  ["t4solar", "Curtain Track 4 solar", "curtain_track_4", { mount_type: "u_rail", solar_panel: true }],
  ["t4bat", "Curtain Track 4 Extended Battery", "curtain_track_4", { mount_type: "u_rail", extended_battery_installed: true }],
  ["t4pair", "Curtain Track 4 L+R", "curtain_track_4", { mount_type: "u_rail", chain_length: 2 }],
  ["roller", "Roller Shade", "roller_shade", { roll_direction: "standard" }],
  ["blindh", "Blind Tilt horizontal", "blind_tilt", { slat_direction: "horizontal" }],
  ["blindv", "Blind Tilt vertical", "blind_tilt", { slat_direction: "vertical" }],
];

export const COVER_DEVICES: SwitchbotDevice[] = VARIANTS.map(([id, name, model], i) => ({
  entry_id: `demo_${id}`, device_id: `demo-${id}`, name: `${name} (demo)`, model,
  address: `DE:MO:00:00:02:${String(i).padStart(2, "0")}`, available: true, kind: "cover", features: FEATURES,
}));

const sims: Record<string, Sim> = {};
let api: DemoApi;

const BATTERY = { device_class: "battery", unit_of_measurement: "%" };
const PROBLEM = { device_class: "problem" };
const ENUM = (options: string[]) => ({ device_class: "enum", options });
const CHARGE: Record<string, Text> = {
  not_charging: ["Not charging", "Nie ładuje"], adapter_charging: ["Charging (adapter)", "Ładowanie (zasilacz)"],
  solar_charging: ["Charging (solar panel)", "Ładowanie (panel słoneczny)"], solar_full: ["Full (solar panel)", "Naładowana (panel słoneczny)"],
  solar_idle: ["Solar panel, not charging", "Panel słoneczny, bez ładowania"],
};
const MODES: Record<string, Text> = {
  performance: ["Performance", "Wydajny"], quietdrift: ["QuietDrift", "QuietDrift"], silent: ["Silent", "Cichy"], quiet: ["Quiet", "Cichy"],
};
const SPEED: Record<string, number> = { performance: 5, silent: 2.5, quiet: 2.5, quietdrift: 1 }; // % per 200 ms

/** Entities of every demo cover (what the catalog creates for the model). */
export function setupCoverDemo(demo: DemoApi): void {
  api = demo;
  VARIANTS.forEach(([id, , model, extra]) => {
    const dev = `demo-${id}`;
    const slug = `${id}_demo`;
    const blind = model === "blind_tilt";
    const st: CoverStatus = {
      available: true, battery: 70, firmware: model === "curtain_3" ? 2.2 : 1.8, calibration: true,
      position: blind ? null : 60, tilt: blind ? 50 : null, motion: "stopped", motion_status: "stopped",
      move_state: "stopped", stuck: false, new_auto: model !== "roller_shade" && model !== "blind_tilt",
      last_calibration_auto: true, ...extra,
    };
    sims[`demo_${id}`] = { entry: `demo_${id}`, device: dev, slug, model, st, scenarios: new Set(), subs: new Set(), started: false };
    const e = demo.entity;
    if (blind) {
      e(`cover.${slug}`, dev, "", "open", { supported_features: 240, current_tilt_position: 50, device_class: "blind" });
    } else {
      e(`cover.${slug}`, dev, "", "open", { supported_features: 15, current_position: 60,
        device_class: model === "roller_shade" ? "shade" : "curtain" });
    }
    e(`sensor.${slug}_battery`, dev, ["Battery", "Bateria"], "70", BATTERY, "diagnostic");
    e(`binary_sensor.${slug}_calibration`, dev, ["Calibration", "Kalibracja"], "on", {}, "diagnostic");
    e(`sensor.${slug}_charge_status`, dev, ["Charging state", "Stan ładowania"],
      extra.solar_panel ? "solar_charging" : "not_charging", ENUM(Object.keys(CHARGE)), "diagnostic", CHARGE);
    e(`binary_sensor.${slug}_battery_charging`, dev, ["Charging", "Ładowanie"], extra.solar_panel ? "on" : "off",
      { device_class: "battery_charging" }, "diagnostic");
    e(`binary_sensor.${slug}_solar_panel`, dev, ["Solar panel", "Panel słoneczny"], extra.solar_panel ? "on" : "off",
      { device_class: "plug" }, "diagnostic");
    e(`button.${slug}_refresh_settings`, dev, ["Refresh settings", "Odśwież ustawienia"], "unknown", {}, "diagnostic");
    if (model === "curtain_3" || model === "curtain_track_4") {
      e(`select.${slug}_motion_mode`, dev, ["Default motion mode", "Domyślny tryb ruchu"], "performance",
        { options: ["performance", "quietdrift", "silent"] }, "config", MODES);
      e(`switch.${slug}_touch_and_go`, dev, "Touch & Go", "on", {}, "config");
      e(`binary_sensor.${slug}_high_temperature`, dev, ["High temperature", "Wysoka temperatura"], "off", { device_class: "heat" }, "diagnostic");
      e(`binary_sensor.${slug}_low_temperature`, dev, ["Low temperature", "Niska temperatura"], "off", { device_class: "cold" }, "diagnostic");
      e(`binary_sensor.${slug}_overheating`, dev, ["Overheating", "Przegrzanie"], "off", { device_class: "heat" }, "diagnostic");
      e(`sensor.${slug}_mount_type`, dev, ["Mount", "Montaż"], String(extra.mount_type), ENUM(["u_rail", "rod", "i_rail"]), "diagnostic",
        { u_rail: ["U rail", "Szyna U"], rod: ["Rod", "Drążek"], i_rail: ["I rail", "Szyna I"] });
      if (model === "curtain_3") e(`binary_sensor.${slug}_magnet_alarm`, dev, ["Positioning magnet alarm", "Alarm magnesu pozycjonującego"], "off", PROBLEM, "diagnostic");
      if (model === "curtain_track_4") {
        e(`sensor.${slug}_builtin_battery`, dev, ["Built-in battery", "Bateria wbudowana"], "80", BATTERY, "diagnostic");
        if (extra.extended_battery_installed) {
          e(`sensor.${slug}_extended_battery`, dev, ["Extended Battery", "Dodatkowa bateria"], "66", BATTERY, "diagnostic");
          api.setEntity(`sensor.${slug}_battery`, "70");
        }
        e(`binary_sensor.${slug}_extended_battery_installed`, dev, ["Extended Battery installed", "Dodatkowa bateria założona"],
          extra.extended_battery_installed ? "on" : "off", { device_class: "plug" }, "diagnostic");
        if (extra.chain_length) e(`sensor.${slug}_chain_length`, dev, ["Linked devices", "Połączone urządzenia"], "2", {}, "diagnostic");
      }
    }
    if (model === "roller_shade") {
      e(`select.${slug}_motor_mode`, dev, ["Motor mode", "Tryb silnika"], "performance", { options: ["performance", "quietdrift"] }, "config", MODES);
      e(`binary_sensor.${slug}_stuck`, dev, ["Stuck", "Zablokowanie"], "off", PROBLEM);
      e(`sensor.${slug}_light_level`, dev, ["Light level", "Poziom światła"], "6", {});
      e(`sensor.${slug}_roll_direction`, dev, ["Rolling direction", "Kierunek zwijania"], "standard", ENUM(["standard", "reverse"]), "diagnostic",
        { standard: ["Standard roll", "Standardowy"], reverse: ["Reverse roll", "Odwrócony"] });
      e(`sensor.${slug}_motor_stop_reason`, dev, ["Motor stop reason", "Przyczyna zatrzymania silnika"], "target_reached", {}, "diagnostic",
        { target_reached: ["Target reached", "Osiągnięto cel"], stuck: ["Stalled", "Zablokowanie"], command: ["Stop command", "Polecenie zatrzymania"] });
      e(`button.${slug}_locate`, dev, ["Locate", "Zlokalizuj"], "unknown");
      e(`button.${slug}_toggle`, dev, ["Toggle (open / stop / close)", "Przełącz (otwórz / stop / zamknij)"], "unknown");
    }
    if (blind) {
      e(`select.${slug}_motor_mode`, dev, ["Motor mode", "Tryb silnika"], "performance", { options: ["performance", "quiet"] }, "config", MODES);
      e(`binary_sensor.${slug}_stuck`, dev, ["Stuck", "Zablokowanie"], "off", PROBLEM);
      e(`sensor.${slug}_slat_direction`, dev, ["Slat direction", "Układ lameli"], String(extra.slat_direction),
        ENUM(["horizontal", "vertical"]), "diagnostic", { horizontal: ["Horizontal slats", "Lamele poziome"], vertical: ["Vertical slats", "Lamele pionowe"] });
    }
  });
}

/* ---------------------------------------------------------------- motion */

const simByEntity = (id: string) => Object.values(sims).find((s) => id.startsWith(`cover.${s.slug}`) || id.startsWith(`button.${s.slug}`));
const posKey = (s: Sim) => (s.model === "blind_tilt" ? "tilt" : "position");

function push(s: Sim) {
  for (const cb of s.subs) cb({ status: { ...s.st }, started: s.started });
}

function syncEntities(s: Sim) {
  const v = s.st[posKey(s)] ?? 0;
  const moving = s.st.motion === "opening" || s.st.motion === "closing";
  const state = moving ? s.st.motion! : s.model === "blind_tilt" ? (v < 20 || v > 80 ? "closed" : "open") : v === 0 ? "closed" : "open";
  api.setEntity(`cover.${s.slug}`, state, s.model === "blind_tilt" ? { current_tilt_position: v } : { current_position: v });
  api.setEntity(`binary_sensor.${s.slug}_calibration`, s.st.calibration ? "on" : "off");
  api.setEntity(`sensor.${s.slug}_battery`, String(s.st.battery));
  if (s.model === "roller_shade" || s.model === "blind_tilt") api.setEntity(`binary_sensor.${s.slug}_stuck`, s.st.stuck ? "on" : "off");
  if (s.model === "roller_shade" && s.st.motor_stop_reason) api.setEntity(`sensor.${s.slug}_motor_stop_reason`, s.st.motor_stop_reason);
  push(s);
}

function setMotion(s: Sim, motion: "stopped" | "opening" | "closing") {
  s.st.motion = motion;
  s.st.motion_status = motion;
  s.st.move_state = motion === "stopped" ? (s.st.stuck ? "stuck" : "stopped") : "moving";
}

function stop(s: Sim, reason = "command") {
  clearInterval(s.timer);
  s.timer = undefined;
  setMotion(s, "stopped");
  s.st.motor_stop_reason = reason;
  syncEntities(s);
}

/** Move to ``target`` (HA scale) at ``speed`` % per 200 ms; blocked / timeout scenarios stop or hang half-way. */
function move(s: Sim, target: number, speed: number, done?: () => void) {
  clearInterval(s.timer);
  const key = posKey(s);
  const from = s.st[key] ?? 0;
  if (from === target) return done?.();
  s.st.stuck = false;
  const opening = key === "tilt" ? Math.abs(target - 50) < Math.abs(from - 50) : target > from;
  setMotion(s, opening ? "opening" : "closing");
  const half = (from + target) / 2;
  s.timer = window.setInterval(() => {
    const cur = s.st[key] ?? 0;
    const blocked = s.scenarios.has("block") || s.scenarios.has("timeout");
    if (blocked && Math.abs(cur - half) < speed) {
      if (s.scenarios.has("timeout") || s.model.startsWith("curtain")) {
        // the motor keeps "running" without getting anywhere: the wizard times out
        syncEntities(s);
        return;
      }
      s.st.stuck = true;
      stop(s, "stuck");
      return;
    }
    const next = cur + Math.sign(target - cur) * Math.min(speed, Math.abs(target - cur));
    s.st[key] = Math.round(next * 10) / 10;
    if (s.st[key] === target) {
      stop(s, s.model === "roller_shade" ? (target === 100 ? "fully_open" : "target_reached") : "target_reached");
      done?.();
    } else syncEntities(s);
  }, 200);
  syncEntities(s);
}

function modeSpeed(s: Sim, speed?: string) {
  const mode = speed && speed !== "default" ? speed : api.getEntity(`select.${s.slug}_motion_mode`)?.state ?? api.getEntity(`select.${s.slug}_motor_mode`)?.state ?? "performance";
  return SPEED[mode] ?? 5;
}

/** cover / button services of the demo covers; false when the entity is not one of them. */
export function coverService(domain: string, service: string, data: Record<string, any>): boolean {
  const s = simByEntity(String(data.entity_id));
  if (!s) return false;
  if (domain === "button") {
    if (data.entity_id.endsWith("_locate")) move(s, Math.max(0, (s.st.position ?? 0) - 5), 2, () => move(s, (s.st.position ?? 0) + 5, 2));
    else if (data.entity_id.endsWith("_toggle")) {
      if (s.timer) stop(s);
      else move(s, (s.st.position ?? 0) > 50 ? 0 : 100, modeSpeed(s));
    }
    return true;
  }
  if (!s.st.calibration && !service.startsWith("stop")) return true; // uncalibrated: does not move
  const speed = modeSpeed(s, data.speed);
  if (service.startsWith("stop")) stop(s);
  else if (service === "open_cover") move(s, 100, speed);
  else if (service === "close_cover") move(s, 0, speed);
  else if (service === "set_cover_position") move(s, Number(data.position), speed);
  else if (service === "open_cover_tilt") move(s, 50, speed);
  else if (service === "close_cover_tilt") move(s, (s.st.tilt ?? 0) > 50 ? 100 : 0, speed);
  else if (service === "set_cover_tilt_position") move(s, Number(data.tilt_position), speed);
  return true;
}

/* ---------------------------------------------------------------- calibration */

export function coverSubscribe(entryId: string, cb: (msg: any) => void): (() => void) | null {
  const s = sims[entryId];
  if (!s) return null;
  s.subs.add(cb);
  setTimeout(() => push(s), 10);
  // the backend polls the device every second while the panel watches it
  const poll = window.setInterval(() => cb({ status: { ...s.st }, started: s.started }), 1000);
  return () => {
    clearInterval(poll);
    s.subs.delete(cb);
    if (!s.subs.size && s.started) abort(s); // panel closed mid-calibration
  };
}

function abort(s: Sim) {
  stop(s);
  s.awaitPull = undefined;
  s.started = false;
  if (s.model === "blind_tilt") Object.assign(s.st, { calibration_next: false, calibration_wrong_way: false });
  push(s);
}

const CAL_SPEED = 4;

export function coverAction(msg: Record<string, any>): { success: boolean; result?: any; status: CoverStatus } {
  const s = sims[msg.entry_id];
  if (!s) throw new Error("Device not found");
  const ok = (result?: any, success = true) => {
    syncEntities(s);
    return { success, result, status: { ...s.st } };
  };
  if (msg.read) {
    if (msg.read === "distance") {
      const short = s.scenarios.has("short");
      s.st.calibration_distance = { distance_cm: short ? 6 : 180, steps: short ? 10 : 260, route_too_short: short };
      return ok(s.st.calibration_distance);
    }
    if (msg.read === "magnet") {
      s.st.magnet_detected = !s.scenarios.has("nomagnet");
      return ok({ magnet_detected: s.st.magnet_detected });
    }
    if (msg.read === "last_auto") return ok({ last_calibration_auto: s.st.last_calibration_auto });
    return ok(s.st);
  }
  const a = String(msg.action);
  const v = msg.value as number | undefined;
  switch (a) {
    case "abort":
      abort(s);
      return ok();
    case "finished":
      s.started = false;
      s.st.calibration = true;
      return ok();
    case "poll":
      return ok();
  }
  if (a.startsWith("start") || a === "smart_correction" || a === "route_start") {
    s.started = true;
    if (a !== "route_start" && a !== "smart_correction") s.st.calibration = false;
  }
  if (s.model === "blind_tilt") return blindAction(s, a, v, ok);
  if (s.model === "roller_shade") return rollerAction(s, a, ok);
  return curtainAction(s, a, ok);
}

type Ok = (result?: any, success?: boolean) => { success: boolean; result?: any; status: CoverStatus };

function curtainAction(s: Sim, a: string, ok: Ok) {
  switch (a) {
    case "start_new_auto":
      // Curtain 3: waits for the pull; Track 4 drives to the open end by itself
      if (s.model === "curtain_track_4") move(s, 100, CAL_SPEED);
      else s.awaitPull = "open";
      break;
    case "smart_correction":
      s.awaitPull = "correction";
      break;
    case "drive_open":
      if (!s.awaitPull) move(s, 100, CAL_SPEED);
      break;
    case "drive_closed":
      move(s, 0, CAL_SPEED);
      break;
    case "jog_left":
      move(s, 100, 1.5);
      break;
    case "jog_right":
      move(s, 0, 1.5);
      break;
    case "pause":
      stop(s);
      break;
    case "exit":
      stop(s);
      s.started = false;
      s.st.calibration = true;
      break;
    case "magnet_on":
    case "magnet_off":
    case "open_side":
    case "mount_side":
    case "start_auto":
    case "start_manual":
      break;
    default:
      throw new Error(`ValueError: ${a} is not a calibration step`);
  }
  return ok();
}

function rollerAction(s: Sim, a: string, ok: Ok) {
  switch (a) {
    case "start":
    case "record_top":
    case "record_open":
    case "record_closed":
      break;
    case "to_top":
    case "route_start":
      s.route = a === "route_start";
      move(s, 100, CAL_SPEED);
      break;
    case "jog_up":
      move(s, 100, 1.5);
      break;
    case "jog_down":
      move(s, 0, 1.5);
      break;
    case "pause":
    case "stop":
      stop(s);
      break;
    case "complete":
      // "short": the set rolled-up position is below the closed one
      if (s.scenarios.has("short")) return ok(undefined, false);
      s.started = false;
      s.st.calibration = true;
      break;
    case "route_confirm":
      s.started = false;
      s.st.calibration = true;
      break;
    case "exit":
      stop(s);
      s.started = false;
      break;
    default:
      throw new Error(`ValueError: ${a} is not a calibration step`);
  }
  return ok();
}

const BLIND_TARGETS: Record<number, number> = { 0: 0, 1: 50, 2: 100, 3: 50 }; // after saving point i, turn towards the next

function blindAction(s: Sim, a: string, v: number | undefined, ok: Ok) {
  switch (a) {
    case "start":
      Object.assign(s.st, { calibration_step: 0, calibration_next: false, calibration_exited: false, calibration_wrong_way: false });
      break;
    case "save": {
      if (![1, 2, 3, 5].includes(v ?? -1)) throw new Error("ValueError: save needs one of (1, 2, 3, 5)");
      s.st.calibration_step = v === 5 ? 4 : v;
      s.st.calibration_next = false;
      break;
    }
    case "exit":
      s.started = false;
      s.st.calibration = true;
      Object.assign(s.st, { calibration_exited: true, calibration_next: false, calibration_wrong_way: false });
      break;
    default:
      throw new Error(`ValueError: ${a} is not a calibration step`);
  }
  return ok();
}

/* ---------------------------------------------------------------- demo bar */

export type CoverEvent = "pull" | "turn" | "wrong_way" | CoverScenario;

/** Demo bar buttons of a cover device. */
export function coverEvents(entryId?: string): CoverEvent[] {
  const s = entryId ? sims[entryId] : undefined;
  if (!s) return [];
  if (s.model === "blind_tilt") return ["turn", "wrong_way", "block", "lowbatt"];
  if (s.model === "roller_shade") return ["block", "timeout", "short", "lowbatt"];
  return ["pull", "block", "timeout", "short", ...(s.model === "curtain_3" ? (["nomagnet"] as CoverEvent[]) : []), "lowbatt"];
}

/** Is the scenario switched on for the device (the demo bar shows it pressed). */
export function coverScenarioOn(entryId: string, ev: CoverEvent): boolean {
  return !!sims[entryId]?.scenarios.has(ev as CoverScenario);
}

export function coverEvent(entryId: string, ev: CoverEvent): void {
  const s = sims[entryId];
  if (!s) return;
  if (ev === "pull") {
    // the user pulls the curtain 5 cm: the robot takes over
    const what = s.awaitPull;
    s.awaitPull = undefined;
    if (what === "correction") move(s, 100, CAL_SPEED, () => move(s, 0, CAL_SPEED));
    else move(s, 100, CAL_SPEED);
    return;
  }
  if (ev === "turn") {
    // the user turns the wand to the next position; the device then allows Next
    const step = s.st.calibration_step ?? 0;
    move(s, BLIND_TARGETS[step] ?? 50, 4, () => {
      if (s.started) s.st.calibration_next = true;
      syncEntities(s);
    });
    return;
  }
  if (ev === "wrong_way") {
    s.st.calibration_wrong_way = true;
    syncEntities(s);
    return;
  }
  if (s.scenarios.has(ev)) s.scenarios.delete(ev);
  else s.scenarios.add(ev);
  if (ev === "lowbatt") s.st.battery = s.scenarios.has("lowbatt") ? 7 : 70;
  if (ev === "block" && !s.scenarios.has("block")) s.st.stuck = false;
  syncEntities(s);
}
