/**
 * Original illustrations of the cover calibration wizards: Curtain 3 on a U or
 * I rail, Curtain 3 Rod Type, Curtain Track 4 (plain, solar panel, Extended
 * Battery, L/R pair), Roller Shade and Blind Tilt (horizontal / vertical slats).
 *
 * Every model has its own drawing, modelled on the SwitchBot app's pictures but
 * drawn from scratch in the theme's colours (like lock-art.ts). One <svg
 * viewBox="0 0 320 200"> per call; positions and slat angles animate with CSS.
 */

import { css, svg, type SVGTemplateResult } from "lit";

export type CoverVariant =
  | "rail_u"
  | "rail_i"
  | "rod"
  | "track4"
  | "track4_solar"
  | "track4_battery"
  | "track4_pair"
  | "roller"
  | "blind_h"
  | "blind_v";

export interface CoverScene {
  view: "front" | "profile" | "logo" | "magnet" | "pull" | "result" | "roll_side";
  /** 0 closed .. 1 fully open (curtains: share of the window uncovered; roller: share rolled up) */
  open?: number;
  /** curtains: side the curtain gathers at when open (the robot sits at the leading edge) */
  side?: "left" | "right";
  moving?: "opening" | "closing" | null;
  /** curtains "pull": a hand pulling the curtain; blind: a hand on the wand */
  hand?: boolean;
  arrow?: "left" | "right" | "up" | "down" | null;
  /** logo of the robot towards the room (inside = "indoor" in the app) or the window (outside) (?) */
  logo?: "inside" | "outside";
  ok?: boolean;
  /** blind: 0 closed down / left, 50 open, 100 closed up / right */
  tilt?: number;
  /** roller: limit lines at heights (0..1 rolled-down share) */
  marks?: { at: number; cls: "top" | "open" | "closed" }[];
  roll?: "standard" | "reverse";
  stuck?: boolean;
  magnet?: boolean | null;
}

type Body = "c3" | "rod" | "t4" | "t4_solar" | "t4_battery";

const clamp01 = (v: number | undefined, d: number) => Math.max(0, Math.min(1, v ?? d));

/* ------------------------------------------------------------------ shared bits */

/** Window with a soft sky, two panes and far hills. */
function windowArt(x: number, y: number, w: number, h: number) {
  const mx = x + w / 2;
  const hy = y + h * 0.72;
  return svg`<g class="window">
    <rect x=${x} y=${y} width=${w} height=${h} rx="2" class="sky"/>
    <path d="M${x} ${hy} Q${x + w * 0.25} ${hy - h * 0.16} ${x + w * 0.45} ${hy - h * 0.04} T${x + w} ${hy - h * 0.1} V${y + h} H${x} Z" class="hill"/>
    <rect x=${x} y=${y} width=${w} height=${h} rx="2" class="frame"/>
    <line x1=${mx} y1=${y} x2=${mx} y2=${y + h} class="mullion"/>
  </g>`;
}

/** Big direction arrow centred at (cx, cy). */
function arrowArt(dir: CoverScene["arrow"], cx: number, cy: number) {
  if (!dir) return null;
  const rot = { right: 0, down: 90, left: 180, up: 270 }[dir];
  return svg`<g class="arrow" transform="translate(${cx} ${cy}) rotate(${rot})">
    <path d="M-22 -6 H6 V-15 L24 0 L6 15 V6 H-22 Z"/>
  </g>`;
}

/** Hand gripping something at (x, y); mirror flips it. */
function handArt(x: number, y: number, mirror = false) {
  return svg`<g class="hand" transform="translate(${x} ${y}) scale(${mirror ? -1 : 1} 1)">
    <path d="M-4 -12 c4 -3 12 -3 16 0 c3 2 4 6 4 10 v14 c0 8 -6 14 -14 14 h-4 c-6 0 -10 -5 -10 -11 v-8 c0 -3 2 -5 5 -5 h3 z"/>
    <path d="M-4 -12 c-4 1 -7 4 -7 8 c0 3 2 5 5 5" class="thumb"/>
    <path d="M2 2 h12 M2 9 h12 M3 16 h10" class="fingers"/>
  </g>`;
}

function badge(ok: boolean, cx = 160, cy = 100) {
  return ok
    ? svg`<g class="badge ok"><circle cx=${cx} cy=${cy} r="34"/><path d="M${cx - 16} ${cy + 1} l11 11 l22 -24"/></g>`
    : svg`<g class="badge bad"><circle cx=${cx} cy=${cy} r="34"/><path d="M${cx} ${cy - 17} v20 M${cx} ${cy + 14} v1"/></g>`;
}

/** Motion lines behind a moving robot at x. */
function motionLines(x: number, y: number, moving: CoverScene["moving"], towardsLeft: boolean) {
  if (!moving) return null;
  const s = towardsLeft ? 1 : -1;
  return svg`<g class="motion">
    ${[0, 10, 20].map((dy) => svg`<line x1=${x + s * 14} y1=${y + dy} x2=${x + s * (26 + dy / 2)} y2=${y + dy}/>`)}
  </g>`;
}

/* ------------------------------------------------------------------ curtain robots (front view) */

function robotFront(body: Body, x: number, top: number, label?: string) {
  switch (body) {
    case "rod":
      return svg`<g class="robot">
        <path d="M${x - 9} ${top - 10} a9 9 0 0 1 18 0 v42 a8 8 0 0 1 -8 8 h-2 a8 8 0 0 1 -8 -8 z" class="body"/>
        <circle cx=${x} cy=${top - 4} r="2.4" class="logo"/>
      </g>`;
    case "c3":
      return svg`<g class="robot">
        <circle cx=${x - 4} cy=${top - 3} r="3" class="wheel"/><circle cx=${x + 4} cy=${top - 3} r="3" class="wheel"/>
        <rect x=${x - 8} y=${top} width="16" height="50" rx="8" class="body"/>
        <circle cx=${x} cy=${top + 10} r="2.4" class="logo"/>
      </g>`;
    default: {
      // Track 4: compact body, exchangeable hook wheels on short stems
      const extra =
        body === "t4_solar"
          ? svg`<rect x=${x - 13} y=${top + 34} width="26" height="34" rx="2" class="solar"/>
              <path d="M${x - 13} ${top + 45} h26 M${x - 13} ${top + 56} h26 M${x - 4} ${top + 34} v34 M${x + 4} ${top + 34} v34" class="cells"/>`
          : body === "t4_battery"
            ? svg`<rect x=${x - 10} y=${top + 33} width="20" height="24" rx="5" class="pack"/>
                <path d="M${x - 4} ${top + 40} h8 M${x - 4} ${top + 45} h8 M${x - 4} ${top + 50} h8" class="cells"/>`
            : null;
      return svg`<g class="robot">
        <path d="M${x - 5} ${top - 6} v6 M${x + 5} ${top - 6} v6" class="stem"/>
        <circle cx=${x - 5} cy=${top - 7} r="3.4" class="wheel"/><circle cx=${x + 5} cy=${top - 7} r="3.4" class="wheel"/>
        ${extra}
        <rect x=${x - 10} y=${top} width="20" height="34" rx="6" class="body"/>
        <rect x=${x - 6} y=${top + 6} width="12" height="5" rx="2.5" class="band"/>
        ${label ? svg`<text x=${x} y=${top + 26} class="lr">${label}</text>` : null}
      </g>`;
    }
  }
}

/** Rail or rod across the top of a front view. */
function mountFront(body: Body) {
  if (body === "rod") {
    return svg`<g class="mount">
      <rect x="16" y="20" width="288" height="7" rx="3.5" class="rod"/>
      <circle cx="14" cy="23.5" r="8" class="finial"/><circle cx="306" cy="23.5" r="8" class="finial"/>
    </g>`;
  }
  return svg`<g class="mount"><rect x="22" y="16" width="276" height="10" rx="2" class="rail"/>
    <line x1="22" y1="22" x2="298" y2="22" class="rail-slot"/></g>`;
}

/** One curtain panel: full width w, gathered towards `anchor` by scaling. */
function curtainPanel(body: Body, x0: number, w: number, share: number, anchor: "left" | "right", stuck: boolean) {
  const folds = [];
  for (let i = 1; i < 10; i++) folds.push(svg`<line x1=${x0 + (w * i) / 10} y1="32" x2=${x0 + (w * i) / 10} y2="184"/>`);
  const hooks = [];
  for (let i = 0; i <= 10; i++) {
    const hx = x0 + (w * i) / 10;
    hooks.push(body === "rod" ? svg`<ellipse cx=${hx} cy="23.5" rx="2.6" ry="6" class="ring"/>` : svg`<circle cx=${hx} cy="28" r="1.8" class="hook"/>`);
  }
  const ox = anchor === "left" ? x0 : x0 + w;
  const hem = Array.from({ length: 10 }, () => `q${-w / 20} 6 ${-w / 10} 0`).join(" ");
  return svg`<g class="panel ${stuck ? "stuck" : ""}" style="transform: scaleX(${share}); transform-origin: ${ox}px 0px">
    <path d="M${x0} 30 H${x0 + w} V184 ${hem} Z" class="fabric"/>
    <g class="folds">${folds}</g>
    ${hooks}
  </g>`;
}

function curtainFront(variant: CoverVariant, s: CoverScene, dim = false) {
  const body = bodyOf(variant);
  const open = clamp01(s.open, 0);
  const stuck = !!s.stuck;
  const share = 1 - open * 0.82; // a gathered curtain keeps ~18 % of its width
  let content;
  if (variant === "track4_pair") {
    const w = 135;
    const sh = share;
    const lx = 25 + w * sh;
    const rx = 295 - w * sh;
    content = svg`${curtainPanel(body, 25, w, sh, "left", stuck)}${curtainPanel(body, 160, w, sh, "right", stuck)}
      <g class="slide" style="transform: translateX(${lx - 160}px)">${robotFront(body, 160 - 10, 24, "L")}</g>
      <g class="slide" style="transform: translateX(${rx - 160}px)">${robotFront(body, 160 + 10, 24, "R")}</g>
      ${motionLines(lx - 10, 40, s.moving, s.moving === "closing")}
      ${motionLines(rx + 10, 40, s.moving, s.moving !== "closing")}`;
  } else {
    const side = s.side ?? "left";
    const w = 270;
    const x0 = 25;
    const edge = side === "left" ? x0 + w * share : x0 + w - w * share;
    const towardsLeft = (side === "left") === (s.moving === "opening");
    content = svg`${curtainPanel(body, x0, w, share, side, stuck)}
      <g class="slide" style="transform: translateX(${edge - 160}px)">${robotFront(body, 160, body === "rod" ? 32 : 30)}</g>
      ${motionLines(edge, 50, s.moving, towardsLeft)}`;
  }
  return svg`<g class=${dim ? "dim" : ""}>${windowArt(40, 34, 240, 150)}${mountFront(body)}${content}</g>`;
}

function bodyOf(variant: CoverVariant): Body {
  if (variant === "rod") return "rod";
  if (variant === "track4_solar") return "t4_solar";
  if (variant === "track4_battery") return "t4_battery";
  if (variant.startsWith("track4")) return "t4";
  return "c3";
}

/* ------------------------------------------------------------------ curtain: profile, logo, magnet */

function fabricEdge(x: number, top: number) {
  return svg`<path d="M${x} ${top} q8 10 0 20 q-8 10 0 20 q8 10 0 20 q-8 10 0 20 q8 10 0 20 q-8 10 0 18" class="fabric-edge"/>`;
}

function curtainProfile(variant: CoverVariant, s: CoverScene) {
  const body = bodyOf(variant);
  const ceiling = svg`<rect x="60" y="6" width="200" height="8" class="ceiling"/>`;
  const stuck = s.stuck ? "stuck" : "";
  if (variant === "rail_u") {
    return svg`${ceiling}
      <path d="M128 14 H192 V58 H172 V51 H184 V22 H136 V51 H148 V58 H128 Z" class="profile"/>
      <circle cx="149" cy="42" r="7" class="wheel"/><circle cx="171" cy="42" r="7" class="wheel"/>
      <rect x="156" y="42" width="8" height="40" class="stem"/>
      <rect x="138" y="78" width="44" height="104" rx="20" class="body ${stuck}"/>
      <circle cx="160" cy="98" r="3.5" class="logo"/>
      <path d="M182 92 h14" class="stem-line"/>${fabricEdge(200, 82)}`;
  }
  if (variant === "rail_i") {
    return svg`${ceiling}
      <path d="M132 14 H188 V20 H163 V46 H188 V52 H132 V46 H157 V20 H132 Z" class="profile"/>
      <circle cx="146" cy="40" r="6" class="wheel"/><circle cx="174" cy="40" r="6" class="wheel"/>
      <path d="M146 40 V60 H174 V40" class="yoke"/>
      <rect x="156" y="58" width="8" height="24" class="stem"/>
      <rect x="138" y="78" width="44" height="104" rx="20" class="body ${stuck}"/>
      <circle cx="160" cy="98" r="3.5" class="logo"/>
      <path d="M182 92 h14" class="stem-line"/>${fabricEdge(200, 82)}`;
  }
  if (variant === "rod") {
    return svg`<rect x="96" y="44" width="14" height="10" class="ceiling"/><path d="M110 49 H132" class="stem-line"/>
      <path d="M134 40 a26 26 0 0 1 52 0 v118 a20 20 0 0 1 -20 20 h-12 a20 20 0 0 1 -20 -20 z" class="body ${stuck}"/>
      <circle cx="160" cy="42" r="15" class="rod"/>
      <circle cx="152" cy="24" r="4.5" class="wheel"/><circle cx="168" cy="24" r="4.5" class="wheel"/>
      <circle cx="160" cy="42" r="21" class="ring"/>
      <circle cx="160" cy="90" r="3.5" class="logo"/>
      <path d="M181 50 h15" class="stem-line"/>${fabricEdge(200, 50)}`;
  }
  // Track 4: a track with the hook wheels in it, compact body, optional panel / pack
  const extra =
    body === "t4_solar"
      ? svg`<rect x="188" y="82" width="12" height="70" rx="2" class="solar"/><path d="M188 105 h12 M188 128 h12" class="cells"/>`
      : body === "t4_battery"
        ? svg`<rect x="142" y="142" width="36" height="36" rx="10" class="pack"/>`
        : null;
  return svg`${ceiling}
    <path d="M126 14 H194 V54 H174 V47 H186 V22 H134 V47 H146 V54 H126 Z" class="profile"/>
    <circle cx="151" cy="38" r="6.5" class="wheel"/><circle cx="169" cy="38" r="6.5" class="wheel"/>
    <path d="M151 38 V60 M169 38 V60" class="yoke"/>
    ${extra}
    <rect x="136" y="60" width="48" height="84" rx="14" class="body ${stuck}"/>
    <rect x="148" y="74" width="24" height="7" rx="3.5" class="band"/>
    <path d="M184 100 h12" class="stem-line"/>${fabricEdge(200, 104)}`;
}

function curtainLogo(variant: CoverVariant, s: CoverScene) {
  const body = bodyOf(variant);
  // the window strip is at the top: "inside" (indoor, the room) points down
  const inside = (s.logo ?? "inside") !== "inside";
  const t4 = body.startsWith("t4");
  const bw = t4 ? 46 : 36;
  const bh = t4 ? 40 : 52;
  const y = 100 - bh / 2;
  const dotY = inside ? y + 8 : y + bh - 8;
  return svg`
    <rect x="30" y="18" width="260" height="18" rx="2" class="sky"/>
    <path d="M30 36 H290 M160 18 V36" class="frame-line"/>
    <rect x="20" y="88" width="280" height="${body === "rod" ? 14 : 24}" rx=${body === "rod" ? 7 : 3} class=${body === "rod" ? "rod" : "rail"}/>
    ${t4 ? svg`<rect x=${160 - 15} y="94" width="10" height="12" rx="3" class="wheel"/><rect x=${160 + 5} y="94" width="10" height="12" rx="3" class="wheel"/>` : null}
    <rect x=${160 - bw / 2} y=${y} width=${bw} height=${bh} rx=${t4 ? 12 : 18} class="body top ${s.stuck ? "stuck" : ""}"/>
    <circle cx="160" cy=${dotY} r="5" class="logo"/>
    <g class="arrow small" transform="translate(160 ${inside ? y - 22 : y + bh + 22}) rotate(${inside ? 270 : 90}) scale(.6)">
      <path d="M-22 -6 H6 V-15 L24 0 L6 15 V6 H-22 Z"/>
    </g>
    <path d="M40 182 h240" class="floor"/>`;
}

function curtainMagnet(variant: CoverVariant, s: CoverScene) {
  const body = bodyOf(variant);
  const state = s.magnet;
  const ring =
    state === true
      ? svg`<circle cx="262" cy="44" r="20" class="mag-ok"/><path d="M252 44 l7 7 l13 -14" class="mag-ok-mark"/>`
      : state === false
        ? svg`<circle cx="262" cy="44" r="20" class="mag-bad"/><path d="M254 36 l16 16 M270 36 l-16 16" class="mag-bad-mark"/>`
        : svg`<circle cx="262" cy="44" r="20" class="mag-unknown"/>`;
  return svg`${windowArt(40, 34, 240, 150)}${mountFront(body)}
    <rect x="255" y="${body === "rod" ? 15 : 12}" width="14" height="${body === "rod" ? 17 : 18}" rx="2" class="magnet"/>
    <path d="M255 ${body === "rod" ? 23 : 21} h14" class="magnet-pole"/>
    ${curtainPanel(body, 25, 270, 1, "left", !!s.stuck)}
    <g class="slide" style="transform: translateX(${232 - 160}px)">${robotFront(body, 160, body === "rod" ? 32 : 30)}</g>
    ${ring}`;
}

function curtainPull(variant: CoverVariant, s: CoverScene) {
  const side = s.side ?? "left";
  const open = clamp01(s.open, 0.15);
  const share = 1 - open * 0.82;
  const edge = side === "left" ? 25 + 270 * share : 295 - 270 * share;
  const dir = side === "left" ? "left" : "right";
  return svg`${curtainFront(variant, { ...s, open, side, view: "front" })}
    ${handArt(edge + (side === "left" ? 14 : -14), 120, side !== "left")}
    ${arrowArt(s.arrow ?? dir, edge + (side === "left" ? -46 : 46), 150)}`;
}

/* ------------------------------------------------------------------ roller shade */

function rollerFront(s: CoverScene, dim = false) {
  const open = clamp01(s.open, 0);
  const top = 34;
  const h = 148;
  const down = 1 - open;
  const marks = (s.marks ?? []).map((m) => {
    const my = top + clamp01(m.at, 0) * h;
    return svg`<g class="mark ${m.cls}"><line x1="44" y1=${my} x2="276" y2=${my}/><path d="M36 ${my - 5} L44 ${my} L36 ${my + 5} Z"/></g>`;
  });
  return svg`<g class=${dim ? "dim" : ""}>${windowArt(50, top, 220, h)}
    <g class="shade ${s.stuck ? "stuck" : ""}">
      <rect x="54" y=${top} width="212" height=${h} class="fabric roller" style="transform: scaleY(${down}); transform-origin: 0px ${top}px"/>
      <g class="slide" style="transform: translateY(${down * h}px)"><rect x="50" y=${top - 2} width="220" height="7" rx="3" class="bar"/></g>
    </g>
    <rect x="40" y="16" width="240" height="20" rx="6" class="cassette"/>
    <circle cx="48" cy="26" r="5" class="endcap"/><circle cx="272" cy="26" r="5" class="motor"/>
    ${marks}
    ${s.arrow ? arrowArt(s.arrow, 296, Math.min(top + down * h, 170)) : null}</g>`;
}

function rollerSide(s: CoverScene) {
  const reverse = s.roll === "reverse";
  const cx = 170;
  const cy = 56;
  const r = 22;
  const fx = reverse ? cx - r : cx + r;
  return svg`
    <rect x="110" y="8" width="150" height="8" class="ceiling"/>
    <path d="M${cx} 16 V${cy - 8}" class="stem-line"/><rect x=${cx - 9} y="16" width="18" height="10" rx="2" class="bracket"/>
    <rect x="72" y="16" width="12" height="176" class="wall"/>
    <rect x="84" y="40" width="10" height="140" class="sky"/><path d="M94 40 V180" class="frame-line"/>
    <path d="M${fx} ${cy} V176" class="fabric-line ${s.stuck ? "stuck" : ""}"/>
    <rect x=${fx - 6} y="176" width="12" height="6" rx="2" class="bar"/>
    <circle cx=${cx} cy=${cy} r=${r} class="tube"/>
    <circle cx=${cx} cy=${cy} r=${r - 7} class="motor"/>
    <path d=${reverse
      ? `M${cx + 30} ${cy - 14} A32 32 0 0 0 ${cx - 6} ${cy - 32}`
      : `M${cx - 30} ${cy - 14} A32 32 0 0 1 ${cx + 6} ${cy - 32}`} class="turn"/>
    <path d=${reverse ? `M${cx - 4} ${cy - 38} l-8 6 l9 4` : `M${cx + 4} ${cy - 38} l8 6 l-9 4`} class="turn"/>
    <path d="M100 190 H300" class="floor"/>`;
}

/* ------------------------------------------------------------------ blind tilt */

function blindArt(variant: CoverVariant, s: CoverScene, dim = false) {
  const vertical = variant === "blind_v";
  const tilt = Math.max(0, Math.min(100, s.tilt ?? 50));
  const angle = ((tilt - 50) / 50) * 80;
  // seen from the front: an open (level) slat is a thin line, a closed one a full band
  const k = Math.max(0.1, Math.abs(Math.sin((angle * Math.PI) / 180)));
  const upEdge = angle > 0;
  const slats = [];
  if (!vertical) {
    for (let i = 0; i < 9; i++) {
      const y = 46 + i * 15.5;
      slats.push(svg`<g class="slat" style="transform: translate(0px, ${y}px) scaleY(${k})">
        <rect x="52" y="-7" width="196" height="14" rx="2"/>
        <line x1="52" x2="248" y1=${upEdge ? -7 : 7} y2=${upEdge ? -7 : 7} class="edge"/>
      </g>`);
    }
  } else {
    for (let i = 0; i < 9; i++) {
      const x = 62 + i * 22;
      slats.push(svg`<g class="slat" style="transform: translate(${x}px, 0px) scaleX(${k})">
        <rect x="-10" y="38" width="20" height="142" rx="2"/>
        <line y1="38" y2="180" x1=${upEdge ? 10 : -10} x2=${upEdge ? 10 : -10} class="edge"/>
      </g>`);
    }
  }
  const ladders = vertical ? null : svg`<path d="M90 34 V184 M210 34 V184" class="ladder"/>`;
  return svg`<g class=${dim ? "dim" : ""}>${windowArt(50, 34, 200, 150)}
    ${ladders}${slats}
    <rect x="40" y="20" width="236" height="14" rx="3" class="headrail"/>
    <rect x="258" y="32" width="18" height="24" rx="4" class="device ${s.stuck ? "stuck" : ""}"/>
    <circle cx="267" cy="44" r="3" class="logo"/>
    <rect x="265" y="56" width="4" height="108" rx="2" class="wand"/>
    ${s.hand ? svg`${handArt(267, 132)}<path d="M250 112 a20 9 0 1 0 34 0" class="turn"/><path d="M280 106 l4 7 l-8 2" class="turn"/>` : null}
    ${arrowArt(s.arrow ?? null, 150, 108)}</g>`;
}

/* ------------------------------------------------------------------ entry point */

export function coverArt(variant: CoverVariant, scene: CoverScene): SVGTemplateResult {
  const cls = `coverart ${variant} ${scene.view} ${scene.moving ? "moving" : ""} ${scene.stuck ? "is-stuck" : ""}`;
  let content;
  const curtain = !["roller", "blind_h", "blind_v"].includes(variant);
  switch (scene.view) {
    case "profile":
      content = curtain ? curtainProfile(variant, scene) : variant === "roller" ? rollerSide(scene) : blindArt(variant, scene);
      break;
    case "logo":
      content = curtain ? curtainLogo(variant, scene) : null;
      break;
    case "magnet":
      content = curtain ? curtainMagnet(variant, scene) : null;
      break;
    case "pull":
      content = curtain ? curtainPull(variant, scene) : null;
      break;
    case "roll_side":
      content = variant === "roller" ? rollerSide(scene) : null;
      break;
    case "result":
      content = svg`${curtain ? curtainFront(variant, scene, true) : variant === "roller" ? rollerFront(scene, true) : blindArt(variant, { ...scene, hand: false, arrow: null }, true)}
        ${badge(scene.ok !== false)}`;
      break;
    default:
      content = curtain
        ? svg`${curtainFront(variant, scene)}${arrowArt(scene.arrow ?? null, 160, 108)}`
        : variant === "roller"
          ? rollerFront(scene)
          : blindArt(variant, scene);
  }
  return svg`<svg viewBox="0 0 320 200" class=${cls} role="img">${content ?? curtainFront(variant, scene)}</svg>`;
}

/* ------------------------------------------------------------------ icons (24×24, filled) */

export const COVER_ICONS: Record<"left" | "right" | "up" | "down" | "pause" | "auto" | "manual" | "swap" | "magnet" | "hand", string> = {
  left: "M16 4.5 L6.5 12 L16 19.5 Z",
  right: "M8 4.5 L17.5 12 L8 19.5 Z",
  up: "M4.5 16 L12 6.5 L19.5 16 Z",
  down: "M4.5 8 L12 17.5 L19.5 8 Z",
  pause: "M6.5 5h4v14h-4z M13.5 5h4v14h-4z",
  // the letter A inside a turning ring (auto calibration)
  auto:
    "M12 2a10 10 0 0 1 9.4 6.6l1.6-.6-1 4.4-3.8-2.4 1.4-.5A8 8 0 0 0 4.3 9.8L2.4 9.2A10 10 0 0 1 12 2z " +
    "M12 22a10 10 0 0 1-9.4-6.6l-1.6.6 1-4.4 3.8 2.4-1.4.5a8 8 0 0 0 15.3-.3l1.9.6A10 10 0 0 1 12 22z " +
    "M11 6.5h2l4 11h-2.2l-.9-2.6h-3.8l-.9 2.6H7z M12 9.3l-1.3 3.8h2.6z",
  // a pointing finger (manual calibration)
  manual: "M10 2.5a1.5 1.5 0 0 1 1.5 1.5v6.5h1.2a1.4 1.4 0 0 1 2.6.4 1.4 1.4 0 0 1 2.4.6 1.4 1.4 0 0 1 2.3 1V16c0 3.3-2.5 5.5-5.6 5.5h-1.6c-2 0-3.3-.9-4.4-2.4L5.3 15a1.4 1.4 0 0 1 2.2-1.8l1 1.2V4a1.5 1.5 0 0 1 1.5-1.5z",
  swap: "M7 6h10.2l-2.6-2.6L16 2l5 5-5 5-1.4-1.4L17.2 8H7z M17 18H6.8l2.6 2.6L8 22l-5-5 5-5 1.4 1.4L6.8 16H17z",
  magnet: "M4 3h5v4H4z M15 3h5v4h-5z M4 8h5v4a3 3 0 0 0 6 0V8h5v4a8 8 0 0 1-16 0z",
  hand: "M8.5 21.5C6 20.4 4 17.6 4 14.5V9a1.5 1.5 0 0 1 3 0v3h1V5a1.5 1.5 0 0 1 3 0v6h1V4a1.5 1.5 0 0 1 3 0v7h1V6a1.5 1.5 0 0 1 3 0v8.5c0 4-3 7-7 7z",
};

/* ------------------------------------------------------------------ styles */

export const coverArtStyles = css`
  svg.coverart {
    width: 100%;
    max-height: 240px;
    --ca-line: var(--primary-text-color);
    --ca-soft: var(--secondary-text-color);
    --ca-fill: var(--card-background-color);
    --ca-fill2: var(--secondary-background-color);
    --ca-accent: var(--primary-color);
  }
  .coverart * { vector-effect: non-scaling-stroke; }
  .coverart .sky { fill: color-mix(in srgb, var(--ca-accent) 16%, var(--ca-fill)); }
  .coverart .hill { fill: color-mix(in srgb, var(--ca-accent) 30%, var(--ca-fill)); opacity: .7; }
  .coverart .window .frame { fill: none; stroke: var(--ca-soft); stroke-width: 3; }
  .coverart .mullion, .coverart .frame-line { stroke: var(--ca-soft); stroke-width: 2; fill: none; }
  .coverart .rail, .coverart .profile, .coverart .headrail, .coverart .cassette {
    fill: var(--ca-fill2); stroke: var(--ca-line); stroke-width: 1.5;
  }
  .coverart .rail-slot { stroke: var(--ca-soft); stroke-width: 1; opacity: .6; }
  .coverart .rod, .coverart .finial { fill: var(--ca-fill2); stroke: var(--ca-line); stroke-width: 1.5; }
  .coverart .ceiling, .coverart .wall { fill: var(--ca-soft); opacity: .35; }
  .coverart .floor { stroke: var(--ca-soft); stroke-width: 2; opacity: .5; }
  .coverart .fabric { fill: color-mix(in srgb, var(--ca-fill) 82%, var(--ca-soft)); stroke: var(--ca-line); stroke-width: 1.5; }
  .coverart .folds line { stroke: var(--ca-soft); stroke-width: 1; opacity: .55; }
  .coverart .hook { fill: var(--ca-soft); }
  .coverart .ring { fill: none; stroke: var(--ca-soft); stroke-width: 1.5; }
  .coverart .body { fill: var(--ca-fill); stroke: var(--ca-line); stroke-width: 2; }
  .coverart .band { fill: var(--ca-fill2); stroke: var(--ca-line); stroke-width: 1; }
  .coverart .logo { fill: var(--ca-accent); }
  .coverart .wheel { fill: var(--ca-fill2); stroke: var(--ca-line); stroke-width: 1.5; }
  .coverart .stem { fill: var(--ca-fill2); stroke: var(--ca-line); stroke-width: 1.2; }
  .coverart .stem-line, .coverart .yoke { fill: none; stroke: var(--ca-line); stroke-width: 2; }
  .coverart .fabric-edge, .coverart .fabric-line { fill: none; stroke: var(--ca-soft); stroke-width: 3; stroke-linecap: round; }
  .coverart .solar { fill: #26324a; stroke: var(--ca-line); stroke-width: 1.2; }
  .coverart .cells { stroke: #7f93b5; stroke-width: 1; fill: none; }
  .coverart .pack { fill: var(--ca-fill2); stroke: var(--ca-line); stroke-width: 1.5; }
  .coverart .pack + .cells, .coverart .t4_battery .cells { stroke: var(--ca-accent); }
  .coverart .lr { font: 600 11px sans-serif; text-anchor: middle; fill: var(--ca-accent); }
  .coverart .slide, .coverart .panel { transition: transform .8s ease; }
  .coverart .motion line { stroke: var(--ca-accent); stroke-width: 2; stroke-linecap: round; animation: ca-fade 1s ease-in-out infinite; }
  .coverart .arrow path { fill: var(--ca-accent); }
  .coverart.moving .arrow path { animation: ca-fade 1.2s ease-in-out infinite; }
  .coverart .hand path { fill: var(--ca-fill2); stroke: var(--ca-line); stroke-width: 1.5; stroke-linejoin: round; }
  .coverart .hand .fingers, .coverart .hand .thumb { fill: none; }
  .coverart .magnet { fill: var(--ca-accent); stroke: var(--ca-line); stroke-width: 1.2; }
  .coverart .magnet-pole { stroke: var(--ca-fill); stroke-width: 1.5; }
  .coverart .mag-ok, .coverart .mag-bad, .coverart .mag-unknown { fill: none; stroke-width: 3; }
  .coverart .mag-ok, .coverart .mag-ok-mark { stroke: var(--success-color, #43a047); }
  .coverart .mag-bad, .coverart .mag-bad-mark { stroke: var(--error-color, #db4437); }
  .coverart .mag-ok-mark, .coverart .mag-bad-mark { fill: none; stroke-width: 3.5; stroke-linecap: round; stroke-linejoin: round; }
  .coverart .mag-unknown { stroke: var(--ca-soft); stroke-dasharray: 5 5; animation: ca-spin 4s linear infinite; transform-origin: 262px 44px; }
  .coverart .roller { fill: color-mix(in srgb, var(--ca-fill2) 70%, var(--ca-soft)); stroke: var(--ca-line); stroke-width: 1.2; transition: transform .8s ease; }
  .coverart .bar { fill: var(--ca-line); }
  .coverart .endcap { fill: var(--ca-fill); stroke: var(--ca-line); stroke-width: 1.2; }
  .coverart .motor { fill: var(--ca-accent); opacity: .8; }
  .coverart .tube { fill: var(--ca-fill2); stroke: var(--ca-line); stroke-width: 2; }
  .coverart .bracket { fill: var(--ca-soft); }
  .coverart .mark line { stroke-width: 2; stroke-dasharray: 6 4; }
  .coverart .mark path { stroke: none; }
  .coverart .mark.top line { stroke: var(--ca-soft); }
  .coverart .mark.top path { fill: var(--ca-soft); }
  .coverart .mark.open line { stroke: var(--ca-accent); }
  .coverart .mark.open path { fill: var(--ca-accent); }
  .coverart .mark.closed line { stroke: color-mix(in srgb, var(--ca-accent) 60%, var(--ca-line)); }
  .coverart .mark.closed path { fill: color-mix(in srgb, var(--ca-accent) 60%, var(--ca-line)); }
  .coverart .turn { fill: none; stroke: var(--ca-accent); stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
  .coverart .slat { transition: transform .6s ease; }
  .coverart .slat rect { fill: color-mix(in srgb, var(--ca-fill) 85%, var(--ca-soft)); stroke: var(--ca-line); stroke-width: 1; }
  .coverart .slat .edge { stroke: var(--ca-soft); stroke-width: 2; }
  .coverart .ladder { stroke: var(--ca-soft); stroke-width: 1; opacity: .6; fill: none; }
  .coverart .device { fill: var(--ca-fill); stroke: var(--ca-line); stroke-width: 1.5; }
  .coverart .wand { fill: var(--ca-fill2); stroke: var(--ca-line); stroke-width: 1.2; }
  .coverart .dim { opacity: .3; }
  .coverart .badge circle { fill: var(--ca-fill); stroke-width: 5; }
  .coverart .badge path { fill: none; stroke-width: 7; stroke-linecap: round; stroke-linejoin: round; }
  .coverart .badge.ok circle, .coverart .badge.ok path { stroke: var(--success-color, #43a047); }
  .coverart .badge.bad circle, .coverart .badge.bad path { stroke: var(--error-color, #db4437); }
  .coverart .stuck .fabric, .coverart .stuck.fabric-line, .coverart .body.stuck, .coverart .device.stuck,
  .coverart .stuck .roller {
    stroke: var(--error-color, #db4437);
    stroke-width: 2.5;
  }
  @keyframes ca-fade { 50% { opacity: .35; } }
  @keyframes ca-spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) {
    .coverart .slide, .coverart .panel, .coverart .slat, .coverart .roller { transition: none; }
    .coverart .motion line, .coverart.moving .arrow path, .coverart .mag-unknown { animation: none; }
  }
`;
