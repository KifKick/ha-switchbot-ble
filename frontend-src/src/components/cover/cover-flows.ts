/**
 * Calibration wizards of the covers, step by step as in the SwitchBot app.
 *
 * Curtain 3 / Curtain Track 4: docs/curtain-3.md section 4, docs/curtain-track-4.md
 * section 4. Roller Shade: docs/roller-shade.md section 4. Blind Tilt:
 * docs/blind-tilt.md section 4. The backend (panel/covers.py)
 * only sends single steps and streams the status (polled every second).
 */

import type { StringKey } from "../../localize";
import type { CoverStatus } from "../../types";
import type { CoverScene, CoverVariant } from "./cover-art";

export type CoverMode = "smart" | "custom" | "correction" | "full" | "route" | "tilt";

export const MIN_BATTERY = 10; // below: no calibration (the app's low-battery limit) (?)
const C3_LIMIT = 120_000; // 120 polls of 1 s
const T4_LIMIT = 115_000;
const ROLLER_LIMIT = 300_000; // the roller page polls up to 5 min

export interface CoverStep {
  /** key prefix in cover.steps (default: the step id) */
  strings?: string;
  scene(): CoverScene;
  /** runs when the step is shown; a returned id moves on (automatic steps) */
  enter?(): Promise<string | void>;
  next?(): Promise<string>;
  nextText?: StringKey;
  canNext?(): boolean;
  hint?(): string;
  /** jog buttons: curtains left/right, roller up/down */
  jog?: "horizontal" | "vertical";
  choices?: { text: StringKey; icon?: string; primary?: boolean; run(): Promise<string> }[];
  /** a confirmation the user ticks before Next */
  check?: StringKey;
  /** a "pause" button while the step runs (roller roll-up) */
  pause?: boolean;
  /** last step before "done" (Finish instead of Next) */
  finish?: boolean;
  /** demo mode: what the user does by hand here, offered as buttons in the step */
  demo?: ("pull" | "turn" | "wrong_way")[];
}

export interface CoverFlow {
  steps(): string[];
  defs: Record<string, CoverStep>;
}

export interface CoverContext {
  side: "left" | "right";
  logo: "inside" | "outside";
  roll: "standard" | "reverse";
  jogged: boolean;
  /** blind tilt: the device allowed Next after the last saved point */
  nextOk: boolean;
  /** roller: rolled-down share recorded as the open position */
  openMark?: number;
}

export interface CoverHost {
  readonly status?: CoverStatus;
  readonly model: string;
  readonly variant: CoverVariant;
  ctx: CoverContext;
  act(action: string, value?: number): Promise<void>;
  read(what: string): Promise<any>;
  busy(text: StringKey | null): void;
  /** resolves with the first status that passes, rejects after ``timeoutMs`` */
  waitFor(pred: (st: CoverStatus) => boolean, timeoutMs: number): Promise<CoverStatus>;
  sleep(ms: number): Promise<void>;
  t(key: StringKey, vars?: Record<string, string | number>): string;
}

export class CoverError extends Error {
  constructor(
    message: string,
    /** what the error card offers: back to the start of the wizard, or retry this step */
    public readonly recover: "restart" | "retry" = "restart",
  ) {
    super(message);
  }
}

/* ---------------------------------------------------------------- helpers */

export function variantOf(model: string, st?: CoverStatus): CoverVariant {
  if (model === "curtain_3") return st?.mount_type === "rod" ? "rod" : st?.mount_type === "i_rail" ? "rail_i" : "rail_u";
  if (model === "curtain_track_4") {
    if ((st?.chain_length ?? 0) > 1) return "track4_pair";
    if (st?.extended_battery_installed) return "track4_battery";
    return st?.solar_panel ? "track4_solar" : "track4";
  }
  if (model === "roller_shade") return "roller";
  return st?.slat_direction === "vertical" ? "blind_v" : "blind_h";
}

export function isMoving(model: string, st?: CoverStatus): boolean {
  if (!st) return false;
  if (model === "roller_shade") return !!st.motion && st.motion !== "stopped";
  if (model === "blind_tilt") return st.move_state === "moving";
  return !!st.motion_status && st.motion_status !== "stopped";
}

/** Open share 0..1 of a curtain / shade from the HA position (0 closed .. 100 open). */
export const openShare = (st?: CoverStatus) => Math.max(0, Math.min(1, (st?.position ?? 0) / 100));

export function availableModes(model: string, st?: CoverStatus): CoverMode[] {
  switch (model) {
    case "curtain_3":
    case "curtain_track_4":
      return ["smart", "custom", ...(st?.calibration && st?.last_calibration_auto && st?.new_auto ? (["correction"] as CoverMode[]) : [])];
    case "roller_shade":
      return ["full", ...(st?.calibration ? (["route"] as CoverMode[]) : [])];
    default:
      return ["tilt"];
  }
}

/* ---------------------------------------------------------------- flows */

export function buildFlow(h: CoverHost, mode: CoverMode): CoverFlow {
  switch (h.model) {
    case "curtain_3":
      return curtain3(h, mode);
    case "curtain_track_4":
      return track4(h, mode);
    case "roller_shade":
      return roller(h, mode);
    default:
      return blindTilt(h);
  }
}

/** Waits for a motor run: started (or 3 s passed), then stopped. */
async function untilStopped(h: CoverHost, limit: number, started = false): Promise<CoverStatus> {
  const t0 = Date.now();
  let seen = started;
  return h.waitFor((st) => {
    const moving = isMoving(h.model, st);
    if (moving) seen = true;
    return !moving && (seen || Date.now() - t0 > 3000);
  }, limit);
}

const front = (h: CoverHost, extra: Partial<CoverScene> = {}): CoverScene => ({
  view: "front",
  open: openShare(h.status),
  side: h.ctx.side,
  moving: isMoving(h.model, h.status) ? (h.status?.motion_status === "closing" ? "closing" : "opening") : null,
  ...extra,
});

/** Success: the travelled distance must be at least 16 motor steps (570F4605). */
async function finishAuto(h: CoverHost): Promise<string> {
  h.busy("cover.checking_route");
  const info = await h.read("distance");
  if (info?.route_too_short) return "short";
  await h.act("finished");
  return "done";
}

/** Steps shared by Curtain 3 and Track 4. */
function curtainSteps(h: CoverHost, limit: number, startAction: string): Record<string, CoverStep> {
  return {
    // Smart, after the open end is reached: drive to the closed end
    calibrating: {
      scene: () => front(h),
      async enter() {
        h.busy("cover.driving_open");
        await untilStopped(h, limit);
        h.busy("cover.driving_closed");
        await h.act("drive_closed");
        await h.sleep(1000);
        await untilStopped(h, limit);
        return finishAuto(h);
      },
    },
    // manual: the robot first drives to the open end, the user corrects with the jog buttons
    manualOpen: {
      scene: () => front(h, { arrow: h.ctx.side }),
      jog: "horizontal",
      nextText: "cover.auto_close",
      async enter() {
        h.busy("cover.driving_open");
        await h.act("drive_open");
        await h.sleep(1000);
        await untilStopped(h, limit);
      },
      async next() {
        return "manualClose";
      },
    },
    manualClose: {
      scene: () => front(h, { arrow: h.ctx.side === "left" ? "right" : "left" }),
      jog: "horizontal",
      finish: true,
      async enter() {
        h.busy("cover.driving_closed");
        await h.act("drive_closed");
        await h.sleep(1000);
        await untilStopped(h, limit);
      },
      async next() {
        h.busy("cover.saving");
        await h.act("exit"); // = save of the manual wizard
        return "done";
      },
    },
    // route shorter than 16 steps (< 10 cm): recalibrate or keep it
    short: {
      scene: () => ({ view: "result", ok: false }),
      choices: [
        {
          text: "cover.recalibrate",
          primary: true,
          async run() {
            await h.act(startAction);
            return "restart";
          },
        },
        {
          text: "cover.finish_anyway",
          async run() {
            await h.act("finished");
            return "done";
          },
        },
      ],
    },
    // Smart Correction (firmware >= 22, last calibration automatic): 570F45050C
    corrPull: {
      strings: "pull",
      demo: ["pull"],
      scene: () => front(h, { view: "pull", hand: true, arrow: h.ctx.side }),
      async enter() {
        h.busy("cover.waiting_pull");
        await h.waitFor((st) => isMoving(h.model, st), limit);
        return "fixing";
      },
    },
    fixing: {
      scene: () => front(h),
      async enter() {
        h.busy("cover.correcting");
        await untilStopped(h, limit, true);
        await h.act("finished");
        return "done";
      },
    },
  };
}

function curtain3(h: CoverHost, mode: CoverMode): CoverFlow {
  const shared = curtainSteps(h, C3_LIMIT, mode === "custom" ? "start_manual" : h.status?.new_auto ? "start_new_auto" : "start_auto");
  const magnet: CoverStep = {
    scene: () => ({ view: "magnet", magnet: h.status?.magnet_detected ?? null, side: h.ctx.side }),
    choices: [
      {
        text: "cover.magnet_detect",
        primary: true,
        icon: "magnet",
        async run() {
          h.busy("cover.magnet_checking");
          await h.act("magnet_on");
          await h.sleep(500);
          const { magnet_detected } = await h.read("magnet");
          if (!magnet_detected) throw new CoverError(h.t("cover.err_magnet"), "retry");
          return "@next";
        },
      },
      {
        text: "cover.magnet_skip",
        async run() {
          await h.act("magnet_off");
          return "@next";
        },
      },
    ],
  };
  // direction screen: Next starts Smart (fw < 22) or Custom; the new auto started on open
  const logo: CoverStep = {
    scene: () => ({ view: "profile" }),
    check: "cover.logo_check",
    async next() {
      if (mode === "custom" || !h.status?.new_auto) await h.act(mode === "custom" ? "start_manual" : "start_auto");
      return "@next";
    },
  };
  const close: CoverStep = {
    scene: () => ({ view: "front", open: 0, side: h.ctx.side, hand: true }),
    check: "cover.close_check",
    next: async () => "@next",
  };
  const openSide: CoverStep = {
    scene: () => ({ view: "front", open: 0.75, side: h.ctx.side }),
    choices: (["left", "right"] as const).map((side) => ({
      text: `cover.open_${side}` as StringKey,
      icon: side,
      async run() {
        h.ctx.side = side;
        await h.act("open_side", side === "left" ? 0 : 1);
        return "@next";
      },
    })),
  };
  // Smart, firmware >= 22: the user pulls the curtain open 5 cm and the robot takes over
  const pull: CoverStep = {
    demo: ["pull"],
    scene: () => front(h, { view: "pull", hand: true, arrow: h.ctx.side }),
    async enter() {
      await h.act("drive_open");
      h.busy("cover.waiting_pull");
      await h.waitFor((st) => isMoving(h.model, st), C3_LIMIT);
      return "calibrating";
    },
  };
  // Smart, older firmware: drive to the open end first
  const driveOpen: CoverStep = {
    strings: "calibrating",
    scene: () => front(h),
    async enter() {
      h.busy("cover.driving_open");
      await h.act("drive_open");
      await h.sleep(1000);
      return "calibrating";
    },
  };
  const defs = { ...shared, logo, close, magnet, openSide, pull, driveOpen };
  if (mode === "correction") return { steps: () => ["corrPull", "fixing"], defs };
  if (mode === "custom") return { steps: () => ["logo", "close", "magnet", "manualOpen", "manualClose"], defs };
  if (h.status?.new_auto) return { steps: () => ["logo", "magnet", "pull", "calibrating"], defs };
  return { steps: () => ["logo", "close", "magnet", "openSide", "driveOpen", "calibrating"], defs };
}

function track4(h: CoverHost, mode: CoverMode): CoverFlow {
  const shared = curtainSteps(h, T4_LIMIT, mode === "custom" ? "start_manual" : "start_new_auto");
  // mounting screen (Smart: logo inside / outside) or the direction screen
  // (Custom: always 570F450406 01 00 00)
  const mount: CoverStep = {
    scene: () => ({ view: "logo", logo: h.ctx.logo }),
    choices: (mode === "custom" ? (["inside"] as const) : (["inside", "outside"] as const)).map((logo) => ({
      text: (mode === "custom" ? "cover.start_calibration" : `cover.logo_${logo}`) as StringKey,
      primary: logo === "inside",
      async run() {
        h.ctx.logo = logo;
        await h.act("mount_side", logo === "inside" ? 0 : 1);
        await h.act(mode === "custom" ? "start_manual" : "start_new_auto");
        return "@next";
      },
    })),
  };
  // Smart: no 0508 frame for the open end; a robot that turns (closing) is already in phase 2
  const calibrating: CoverStep = {
    scene: () => front(h),
    async enter() {
      h.busy("cover.driving_open");
      const t0 = Date.now();
      let seen = false;
      const st = await h.waitFor((s) => {
        const motion = s.motion_status;
        if (motion && motion !== "stopped") seen = true;
        return motion === "closing" || ((seen || Date.now() - t0 > 3000) && motion === "stopped");
      }, T4_LIMIT);
      h.busy("cover.driving_closed");
      if (st.motion_status === "stopped") {
        await h.act("drive_closed");
        await h.sleep(1000);
      }
      await untilStopped(h, T4_LIMIT, st.motion_status === "closing");
      return finishAuto(h);
    },
  };
  const defs = { ...shared, mount, calibrating };
  if (mode === "correction") return { steps: () => ["corrPull", "fixing"], defs };
  if (mode === "custom") return { steps: () => ["mount", "manualOpen", "manualClose"], defs };
  return { steps: () => ["mount", "calibrating"], defs };
}

function roller(h: CoverHost, mode: CoverMode): CoverFlow {
  const shade = (extra: Partial<CoverScene> = {}): CoverScene => ({
    view: "front",
    open: openShare(h.status),
    moving: h.status?.motion === "opening" ? "opening" : h.status?.motion === "closing" ? "closing" : null,
    stuck: !!h.status?.stuck,
    ...extra,
  });
  const route = mode === "route";
  const rollUp = (action: string): CoverStep => ({
    strings: route ? "routeUp" : "rollUp",
    scene: () => shade({ arrow: "up" }),
    pause: !route,
    async enter() {
      h.busy(route ? "cover.route_rolling" : "cover.rolling_up");
      if (action) await h.act(action);
      await untilStopped(h, ROLLER_LIMIT);
      return "stuckSel";
    },
  });
  const defs: Record<string, CoverStep> = {
    direction: {
      scene: () => ({ view: "roll_side", roll: h.ctx.roll }),
      choices: (["standard", "reverse"] as const).map((roll) => ({
        text: `cover.roll_${roll}` as StringKey,
        primary: roll === "standard",
        async run() {
          h.ctx.roll = roll;
          await h.act("start", roll === "standard" ? 1 : 0);
          return "rollUp";
        },
      })),
    },
    rollUp: rollUp("to_top"),
    routeUp: rollUp(""), // route_start was the start step
    stuckSel: {
      scene: () => shade({ view: "front", open: 1 }),
      choices: [
        {
          text: "cover.rolled_up",
          primary: true,
          async run() {
            if (route) {
              await h.act("route_confirm");
              return "done";
            }
            await h.act("record_top");
            return "setOpen";
          },
        },
        { text: "cover.is_stuck", run: async () => "stuckHelp" },
      ],
    },
    stuckHelp: {
      scene: () => shade({ stuck: true }),
      nextText: route ? "cover.continue_route" : "cover.continue_calibration",
      async next() {
        if (route) {
          await h.act("route_start");
          return "routeUp";
        }
        return "rollUp";
      },
    },
    setOpen: {
      scene: () => shade({ marks: [{ at: 0, cls: "top" }] }),
      jog: "vertical",
      async enter() {
        h.ctx.jogged = false;
      },
      async next() {
        h.busy("cover.saving");
        await h.act("record_open");
        h.ctx.openMark = 1 - openShare(h.status);
        return "setClosed";
      },
    },
    setClosed: {
      scene: () => shade({ marks: [{ at: 0, cls: "top" }, { at: h.ctx.openMark ?? 0, cls: "open" }] }),
      jog: "vertical",
      finish: true,
      async enter() {
        h.ctx.jogged = false;
      },
      canNext: () => h.ctx.jogged,
      hint: () => h.t("cover.jog_first"),
      async next() {
        h.busy("cover.saving");
        await h.act("record_closed");
        await h.sleep(300);
        try {
          await h.act("complete");
        } catch {
          await h.act("exit").catch(() => undefined);
          throw new CoverError(h.t("cover.err_open_below_closed"));
        }
        await h.sleep(500);
        await h.read("state").catch(() => undefined);
        return "done";
      },
    },
  };
  return { steps: () => (route ? ["routeUp", "stuckSel"] : ["direction", "rollUp", "stuckSel", "setOpen", "setClosed"]), defs };
}

function blindTilt(h: CoverHost): CoverFlow {
  const vertical = () => h.variant === "blind_v";
  // closed down / open / closed up / open from above: points 1, 2, 3, 5
  const points: [string, number, "down" | "up" | null][] = [
    ["b1", 1, "down"],
    ["b2", 2, null],
    ["b3", 3, "up"],
    ["b4", 5, null],
  ];
  const arrow = (dir: "down" | "up" | null) => (dir && vertical() ? (dir === "down" ? "left" : "right") : dir);
  const defs: Record<string, CoverStep> = {};
  points.forEach(([id, value, dir], i) => {
    const last = i === points.length - 1;
    defs[id] = {
      strings: vertical() ? `${id}v` : id,
      scene: () => ({ view: "front", tilt: h.status?.tilt ?? 50, hand: true, arrow: arrow(dir ?? (i === 3 ? "down" : "up")) }),
      finish: last,
      canNext: () => i === 0 || h.ctx.nextOk,
      hint: () => h.t("cover.blind_turn_more"),
      demo: i === 0 ? ["turn"] : ["turn", "wrong_way"],
      async next() {
        if (i > 0 && h.status?.calibration_wrong_way) throw new CoverError(h.t("cover.err_wrong_way"));
        h.busy("cover.saving");
        h.ctx.nextOk = false;
        await h.act("save", value);
        if (!last) return points[i + 1][0];
        await h.act("exit");
        return "done";
      },
    };
  });
  return { steps: () => points.map(([id]) => id), defs };
}

/** Start frame of a mode (sent before the first step); null = the first step starts it. */
export function startAction(model: string, mode: CoverMode, st?: CoverStatus): string | null {
  if (mode === "correction") return "smart_correction";
  if (model === "curtain_3") return mode === "smart" && st?.new_auto ? "start_new_auto" : null;
  if (model === "roller_shade") return mode === "route" ? "route_start" : null;
  if (model === "blind_tilt") return "start";
  return null; // Track 4: after the mounting side
}
