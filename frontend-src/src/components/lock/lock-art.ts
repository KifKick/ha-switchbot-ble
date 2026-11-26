/**
 * Original illustrations of the lock calibration wizard.
 *
 * Every model has its own drawing, modelled on the SwitchBot app's pictures
 * and photos of the devices, but drawn from scratch in the
 * theme's colours:
 *  - Lock Ultra / Ultra Max: the door edge in perspective (jamb, faceplate,
 *    bolt, night latch), the lock on the door with its knob, a hand, a speech
 *    bubble with the state the step asks for;
 *  - Lock (gen 1): the same door edge with its L-shaped body (deep front with a
 *    disc and a bar thumbturn, the shallower battery part behind it);
 *  - Lock Lite: the same door edge with the slim body and a small disc;
 *  - Lock Pro: the door seen from the front, the knob turns with the live angle.
 * Next to the scene the live dial (knob from the front, in the model's shape).
 */

import { css, svg, type SVGTemplateResult } from "lit";

import type { LockKind } from "./calibration-flows";

export type LockModel = LockKind;

export interface LockScene {
  /** 0 retracted .. 0.5 half-lock .. 1 extended */
  bolt: number;
  /** night latch lock: the spring latch above the bolt */
  nightLatch?: boolean;
  /** ① latch ② bolt: release the knob to where the latch extends */
  markers?: boolean;
  /** a hand on the knob (Ultra / Ultra Max) or pushing the door (Lock Pro, door ajar) */
  hand?: boolean;
  bubble?: "locked" | "unlocked" | null;
  /** against: held against the frame, the bolt out in front of it (Lock gen 1) */
  door?: "closed" | "ajar" | "open" | "against";
  magnet?: boolean;
  /** live knob angle (degrees) */
  knob?: number | null;
  blocked?: boolean;
  moving?: boolean;
}

const rad = (deg: number) => (Math.PI / 180) * deg;

/* ------------------------------------------------------------------ shared bits */

function padlock(x: number, y: number, open: boolean) {
  return svg`<g class="padlock" transform="translate(${x} ${y})">
    <path d=${open ? "M-5 -1 v-7 a5 5 0 0 1 10 0 v-2" : "M-5 -1 v-6 a5 5 0 0 1 10 0 v6"} class="shackle"
      transform=${open ? "translate(-4 -2)" : ""}/>
    <rect x="-8" y="-1" width="16" height="13" rx="2.5" class="lockbody"/>
  </g>`;
}

/** Dark speech bubble with a padlock; the tail points down-right (or down-left when mirrored). */
function bubbleArt(state: LockScene["bubble"], x: number, y: number, mirror = false) {
  if (!state) return null;
  return svg`<g class="bubble" transform="translate(${x} ${y})">
    <g transform=${mirror ? "translate(64 0) scale(-1 1)" : ""}>
      <path d="M20 0 h24 a20 20 0 0 1 0 40 h-4 l14 14 l-26 -14 h-8 a20 20 0 0 1 0 -40 z"/>
    </g>
    ${padlock(32, 16, state === "unlocked")}
  </g>`;
}

function badge(cx: number, cy: number, r = 11) {
  return svg`<g class="badge"><circle cx=${cx} cy=${cy} r=${r}/>
    <path d="M${cx} ${cy - r * 0.5} v${r * 0.55} M${cx} ${cy + r * 0.45} v0.5"/></g>`;
}

function marker(n: number, x: number, y: number) {
  return svg`<g class="marker"><circle cx=${x} cy=${y} r="8"/><text x=${x} y=${y + 4}>${n}</text></g>`;
}

/** Hand gripping the knob from the lower right (Ultra / Ultra Max), knob face at (kx, ky). */
function knobHand(kx: number, ky: number) {
  return svg`<g class="hand" transform="translate(${kx - 196} ${ky - 96})">
    <path d="M330 150 C300 140 268 126 250 116 C238 110 226 102 214 98 C204 94 194 92 189 98 C185 104 191 110 199 112
      C194 117 193 124 199 128 C195 134 199 140 207 141 C205 147 212 152 222 150 C238 156 262 172 296 206 L330 206 Z"/>
    <path d="M199 112 C209 112 217 115 223 120 M199 128 C209 128 217 130 224 134 M207 141 C213 141 219 143 225 146" class="fingers"/>
  </g>`;
}

/** Open hand pushing the door (Lock Pro, door ajar). */
function pushHand(x: number, y: number) {
  return svg`<g class="hand" transform="translate(${x} ${y})">
    <path d="M-40 70 C-30 50 -20 36 -8 26 L-14 -4 C-15 -9 -8 -11 -6 -6 L2 16 L0 -14 C0 -19 7 -19 7 -14 L10 14 L14 -12
      C15 -17 22 -16 21 -11 L18 16 L25 -4 C27 -9 33 -7 32 -2 L24 30 C22 42 16 52 8 60 L0 70 Z"/>
  </g>`;
}

/* ------------------------------------------------------------------ Lock Ultra / Ultra Max */

/** Lock on the door face, seen at an angle; the knob points at the viewer. Returns the knob face centre. */
function ultraBody(max: boolean, knob: number | null | undefined, blocked: boolean) {
  const b = max
    ? { x: 138, y: 38, w: 50, h: 142, r: 25, kx: 210, ky: 94, krx: 12, kry: 27, base: 176 }
    : { x: 142, y: 46, w: 40, h: 124, r: 20, kx: 196, ky: 96, krx: 10, kry: 22, base: 166 };
  const a = knob ?? 0;
  const dx = b.kx + b.krx * 0.62 * Math.sin(rad(a));
  const dy = b.ky - b.kry * 0.72 * Math.cos(rad(a));
  const art = svg`<g class="lock ${max ? "max" : "ultra"}">
    <rect x=${b.x - 7} y=${b.y + 4} width=${b.w} height=${b.h} rx=${b.r} class="body-back"/>
    <rect x=${b.x} y=${b.y} width=${b.w} height=${b.h} rx=${b.r} class="body"/>
    ${max
      ? svg`<path d="M${b.x + 8} ${b.y + b.h - 34} h${b.w - 16}" class="seam"/>
            <ellipse cx=${b.base + 6} cy=${b.ky} rx=${b.krx} ry=${b.kry + 5} class="shoulder"/>`
      : svg`<circle cx=${b.x + b.w / 2} cy=${b.y + b.h - 18} r="2.5" class="led"/>`}
    <path d="M${b.base} ${b.ky - b.kry} H${b.kx} V${b.ky + b.kry} H${b.base} Z" class="knob-side"/>
    <ellipse cx=${b.base} cy=${b.ky} rx=${b.krx * 0.8} ry=${b.kry} class="knob-side"/>
    <ellipse cx=${b.kx} cy=${b.ky} rx=${b.krx} ry=${b.kry} class="knob-face"/>
    <circle cx=${dx} cy=${dy} r="2.6" class="knob-dot"/>
    ${blocked ? badge(b.kx + 18, b.ky - b.kry - 6) : null}
  </g>`;
  return { art, kx: b.kx, ky: b.ky };
}

/** Bar thumbturn on a disc, seen from the front; turns with the live angle. */
function barKnob(cx: number, cy: number, r: number, bar: number, knob: number | null | undefined) {
  return svg`<circle cx=${cx} cy=${cy} r=${r} class="disc"/>
    <g class="needle" style="transform: rotate(${knob ?? 0}deg); transform-origin: ${cx}px ${cy}px">
      <rect x=${cx - bar / 5} y=${cy - bar / 2} width=${(bar * 2) / 5} height=${bar} rx="2.5" class="bar"/>
      <rect x=${cx - bar / 5 + 1.5} y=${cy - bar / 2 + 2} width="2.5" height=${bar - 4} rx="1.2" class="bar-shine"/>
    </g>`;
}

/**
 * Lock (gen 1): L-shaped body (box photo orientation). The disc with the bar thumbturn sits
 * at the bottom, coaxial with the door's cylinder, which the body covers from behind (rosette and
 * adapter cup); the deep battery part at the top reaches back to the door.
 */
function classicBody(knob: number | null | undefined, blocked: boolean) {
  const art = svg`<g class="lock classic">
    <ellipse cx="124" cy="140" rx="6" ry="19" class="rosette"/>
    <g class="coupler">
      <path d="M124 124 H140 V156 H124 Z" class="cup"/>
      <path d="M124 124 l5 -5 h11 v5 M124 156 l5 5 h11 v-5" class="jaw"/>
      <path d="M130 128 v24 M135 128 v24" class="cup-line"/>
    </g>
    <rect x="130" y="36" width="50" height="78" rx="7" class="body-back"/>
    <path d="M136 52 h-4 M136 96 h-4" class="seam"/>
    <rect x="138" y="40" width="54" height="140" rx="9" class="body"/>
    <path d="M144 72 h42" class="seam"/>
    <path d="M158 60 h14" class="bslot"/>
    <circle cx="165" cy="98" r="2.2" class="led"/>
    ${barKnob(165, 140, 21, 40, knob)}
    ${blocked ? badge(196, 44) : null}
  </g>`;
  return { art, kx: 182, ky: 152 };
}

/** Lock Lite: slim body, small disc with a bar near the top. */
function liteBody(knob: number | null | undefined, blocked: boolean) {
  const art = svg`<g class="lock lite">
    <rect x="140" y="48" width="38" height="124" rx="13" class="body-back"/>
    <rect x="146" y="44" width="38" height="124" rx="13" class="body"/>
    ${barKnob(165, 80, 14, 26, knob)}
    <circle cx="165" cy="140" r="2.2" class="led"/>
    ${blocked ? badge(188, 46) : null}
  </g>`;
  return { art, kx: 178, ky: 90 };
}

function edgeBody(model: LockModel, s: LockScene) {
  if (model === "lock") return classicBody(s.knob, !!s.blocked);
  if (model === "lock_lite") return liteBody(s.knob, !!s.blocked);
  return ultraBody(model === "lock_ultra_max", s.knob, !!s.blocked);
}

function edgeScene(model: LockModel, s: LockScene) {
  const gap = s.door === "ajar" ? 36 : s.door === "open" ? 70 : s.door === "against" ? 34 : 0;
  const ext = Math.max(0, Math.min(1, s.bolt));
  const reach = 30 * ext;
  const { art: body, kx, ky } = edgeBody(model, s);
  const bolt =
    ext > 0.02
      ? svg`<g class="bolt-g ${s.markers ? "hl" : ""}">
          <path d="M${99 - reach} 100 l6 -6 h${12 + reach} l-6 6 z" class="bolt-top"/>
          <rect x=${99 - reach} y="100" width=${12 + reach} height="20" class="bolt"/>
        </g>`
      : svg`<rect x="101" y="100" width="8" height="20" rx="2" class="slot"/>`;
  const latch = s.nightLatch
    ? svg`<g class="latch-g ${s.markers ? "hl" : ""}">
        <path d="M85 70 h26 v22 h-26 a6 11 0 0 1 0 -22 z" class="latch"/>
        <path d="M86 77 h24 M86 85 h24" class="latch-line"/>
      </g>`
    : null;
  return svg`<svg viewBox="0 0 320 200" class="scene edge ${s.moving ? "moving" : ""} ${s.blocked ? "blocked" : ""}" role="img">
    <rect x="0" y="0" width="64" height="200" class="wall"/>
    <rect x="64" y="0" width="20" height="200" class="jamb"/>
    <rect x="84" y="0" width="8" height="200" class="jamb-lip"/>
    <rect x="84" y="99" width="8" height="22" class="strike"/>
    ${s.nightLatch ? svg`<rect x="84" y="69" width="8" height="24" class="strike"/>` : null}
    ${s.magnet ? svg`<g class="magnet-g"><rect x="70" y="28" width="12" height="30" rx="3" class="magnet"/>
        <path d="M70 36 h12" class="magnet-line"/></g>` : null}
    ${gap ? svg`<rect x="92" y="0" width=${gap} height="200" class="gap"/>` : null}
    <g class="door-g" style="transform: translateX(${gap}px)">
      <rect x="94" y="-2" width="22" height="204" class="door-edge"/>
      <rect x="99" y="10" width="12" height="180" rx="6" class="faceplate"/>
      <circle cx="105" cy="24" r="2.4" class="screw"/><circle cx="105" cy="176" r="2.4" class="screw"/>
      ${latch}
      ${bolt}
      <rect x="116" y="-2" width="220" height="204" class="door"/>
      ${body}
      ${s.hand ? knobHand(kx, ky) : null}
    </g>
    ${s.door === "ajar" ? svg`<text x=${92 + gap / 2} y="194" class="gap-label">≈10 cm</text>` : null}
    ${s.markers ? svg`${marker(1, 40, 81)}${marker(2, 40, 110)}` : null}
    ${bubbleArt(s.bubble, 6, 18)}
  </svg>`;
}

/* ------------------------------------------------------------------ Lock Pro */

function proScene(s: LockScene) {
  const gap = s.door === "ajar" ? 28 : s.door === "open" ? 60 : 0;
  const ext = Math.max(0, Math.min(1, s.bolt));
  const a = s.knob ?? 0;
  return svg`<svg viewBox="0 0 320 200" class="scene pro ${s.moving ? "moving" : ""} ${s.blocked ? "blocked" : ""}" role="img">
    <rect x="0" y="0" width="222" height="200" class="door"/>
    <line x1="222" y1="0" x2="222" y2="200" class="door-line"/>
    ${gap ? svg`<rect x="223" y="0" width=${gap} height="200" class="gap"/>` : null}
    ${gap && ext > 0.02 ? svg`<rect x="222" y="94" width=${Math.min(gap - 2, 22 * ext + 4)} height="18" rx="2" class="bolt"/>` : null}
    <g style="transform: translateX(${gap}px)" class="door-g">
      <rect x="224" y="0" width="12" height="200" class="jamb-lip"/>
      <rect x="236" y="0" width="100" height="200" class="wall"/>
      ${s.magnet ? svg`<rect x="226" y="38" width="9" height="26" rx="2" class="magnet"/>` : null}
    </g>
    <g class="lock pro">
      <rect x="118" y="44" width="54" height="116" rx="9" class="body"/>
      <rect x="124" y="50" width="42" height="104" rx="6" class="body-inner"/>
      <circle cx="145" cy="80" r="17" class="knob-face"/>
      <g class="needle" style="transform: rotate(${a}deg); transform-origin: 145px 80px">
        <rect x="141" y="65" width="8" height="30" rx="4" class="grip"/>
      </g>
      <circle cx="145" cy="112" r="3" class="led"/>
      <path d="M124 128 h42" class="seam"/>
      ${s.blocked ? badge(170, 50) : null}
    </g>
    ${s.hand && s.door === "ajar" ? pushHand(70, 130) : null}
    ${s.door === "ajar" ? svg`<text x=${222 + gap / 2} y="194" class="gap-label">≈10 cm</text>` : null}
    ${bubbleArt(s.bubble, 238 + gap, 24, true)}
  </svg>`;
}

/** The main picture of a calibration step. */
export function lockSceneArt(model: LockModel, scene: LockScene): SVGTemplateResult {
  return model === "lock_pro" ? proScene(scene) : edgeScene(model, scene);
}

/* ------------------------------------------------------------------ jam, lock type, result */

/** Motor blocked: the lock from the front with a red badge (per model). */
export function blockArt(model: LockModel): SVGTemplateResult {
  const lock =
    model === "lock"
      ? svg`<rect x="58" y="14" width="84" height="172" rx="14" class="jam-body"/>
          <path d="M68 52 h64" class="jam-seam"/><circle cx="100" cy="90" r="3.5" class="jam-dot"/>
          <circle cx="100" cy="136" r="32" class="jam-knob"/><rect x="93" y="108" width="14" height="56" rx="3" class="jam-bar"/>`
      : model === "lock_lite"
        ? svg`<rect x="70" y="14" width="60" height="172" rx="22" class="jam-body light"/>
            <circle cx="100" cy="62" r="22" class="jam-knob light"/><rect x="95" y="44" width="10" height="36" rx="3" class="jam-bar"/>
            <circle cx="100" cy="130" r="3.5" class="jam-dot"/>`
        : model === "lock_pro"
      ? svg`<rect x="62" y="20" width="76" height="160" rx="12" class="jam-body"/>
          <circle cx="100" cy="68" r="24" class="jam-knob"/><rect x="95" y="48" width="10" height="40" rx="5" class="jam-grip"/>
          <circle cx="100" cy="118" r="4" class="jam-dot"/>`
      : model === "lock_ultra_max"
        ? svg`<rect x="56" y="8" width="88" height="184" rx="44" class="jam-body light"/>
            <circle cx="100" cy="122" r="36" class="jam-knob light"/>`
        : svg`<rect x="64" y="14" width="72" height="172" rx="36" class="jam-body"/>
            <circle cx="100" cy="126" r="30" class="jam-knob"/><circle cx="100" cy="106" r="3.5" class="jam-dot"/>`;
  return svg`<svg viewBox="0 0 200 200" class="jam" role="img">${lock}${badge(138, 164, 18)}</svg>`;
}

/** Night Latch lock (latch + bolt, key cylinder outside) vs One-Piece lock (one latch, handle). */
export function latchTypeArt(night: boolean): SVGTemplateResult {
  return svg`<svg viewBox="0 0 160 110" class="latchtype" role="img">
    <rect x="30" y="0" width="16" height="110" class="door-edge"/>
    <rect x="34" y="6" width="9" height="98" rx="4.5" class="faceplate"/>
    <rect x="46" y="0" width="120" height="110" class="door"/>
    ${night
      ? svg`<path d="M22 34 h21 v18 h-21 a5 9 0 0 1 0 -18 z" class="latch"/>
          <path d="M23 40 h20 M23 46 h20" class="latch-line"/>
          <path d="M20 62 l5 -5 h18 l-5 5 z" class="bolt-top"/><rect x="20" y="62" width="23" height="16" class="bolt"/>
          <circle cx="100" cy="60" r="14" class="cyl"/><path d="M100 60 h26 v6 h-6 v4 h-6 v-4 h-14 z" class="key"/>
          <circle cx="100" cy="60" r="5" class="cyl-in"/>`
      : svg`<path d="M24 46 h19 v18 h-19 l-6 -9 z" class="latch"/>
          <circle cx="84" cy="56" r="9" class="cyl"/>
          <path d="M84 50 h44 a8 8 0 0 1 0 14 h-44" class="handle"/>`}
  </svg>`;
}

export function resultArt(ok: boolean) {
  return ok
    ? svg`<svg viewBox="0 0 120 120" class="result ok"><circle cx="60" cy="60" r="52"/><path d="M36 62 l16 16 l32 -36"/></svg>`
    : svg`<svg viewBox="0 0 120 120" class="result bad"><path d="M60 12 L112 104 H8 Z"/><path d="M60 46 v28 M60 88 v2"/></svg>`;
}

/* ------------------------------------------------------------------ live dial */

/** Knob seen from the front in the model's shape: ring with ticks, live needle, recorded marks, turn arrow. */
export function dialArt({
  model = "lock_ultra",
  angle,
  marks = [],
  moving = false,
  arrow,
}: {
  model?: LockModel;
  angle?: number | null;
  marks?: { angle: number; cls: string }[];
  moving?: boolean;
  /** direction the user turns the knob */
  arrow?: "cw" | "ccw";
}) {
  const cx = 110;
  const cy = 110;
  const ticks = [];
  for (let a = 0; a < 360; a += 15) {
    const long = a % 90 === 0;
    ticks.push(
      svg`<line x1=${cx} y1=${cy - (long ? 78 : 83)} x2=${cx} y2=${cy - 90} transform="rotate(${a} ${cx} ${cy})"
        class="tick ${long ? "long" : ""}"/>`,
    );
  }
  const knob =
    model === "lock"
      ? svg`<rect x=${cx - 66} y=${cy - 66} width="132" height="132" rx="16" class="plate"/>
          <circle cx=${cx} cy=${cy} r="56" class="body"/>`
      : model === "lock_lite"
        ? svg`<rect x=${cx - 54} y=${cy - 70} width="108" height="140" rx="40" class="plate"/>
            <circle cx=${cx} cy=${cy} r="48" class="body"/>`
        : model === "lock_pro"
      ? svg`<rect x=${cx - 58} y=${cy - 66} width="116" height="132" rx="14" class="plate"/>
          <circle cx=${cx} cy=${cy} r="50" class="body"/>`
      : model === "lock_ultra_max"
        ? svg`<circle cx=${cx} cy=${cy} r="72" class="plate"/><circle cx=${cx} cy=${cy} r="60" class="body"/>`
        : svg`<circle cx=${cx} cy=${cy} r="62" class="body"/>`;
  const grip =
    model === "lock" || model === "lock_lite"
      ? svg`<rect x=${cx - 10} y=${cy - 48} width="20" height="96" rx="4" class="grip bar"/>`
      : model === "lock_pro"
      ? svg`<rect x=${cx - 7} y=${cy - 44} width="14" height="88" rx="7" class="grip"/>`
      : model === "lock_ultra_max"
        ? svg`<rect x=${cx - 11} y=${cy - 52} width="22" height="104" rx="11" class="grip"/>`
        : svg`<rect x=${cx - 9} y=${cy - 56} width="18" height="112" rx="9" class="grip"/>`;
  return svg`<svg viewBox="0 0 220 220" class="dial ${moving ? "moving" : ""}" role="img">
    <circle cx=${cx} cy=${cy} r="96" class="ring"/>
    ${ticks}
    ${marks.map(
      (m) => svg`<g transform="rotate(${m.angle} ${cx} ${cy})">
        <path d="M${cx - 6} ${cy - 102} L${cx + 6} ${cy - 102} L${cx} ${cy - 92} Z" class="mark ${m.cls}"/>
      </g>`,
    )}
    ${knob}
    <g class="needle" style="transform: rotate(${angle ?? 0}deg); transform-origin: ${cx}px ${cy}px">
      ${grip}
      <circle cx=${cx} cy=${cy - (model === "lock_pro" ? 34 : 40)} r="4" class="dot"/>
    </g>
    ${arrow
      ? svg`<g class="turn" transform=${arrow === "ccw" ? `translate(${2 * cx} 0) scale(-1 1)` : ""}>
          <path d="M168 52 a70 70 0 0 1 22 40" class="turn-arrow"/><path d="M186 86 l5 9 l6 -9" class="turn-arrow"/>
        </g>`
      : null}
  </svg>`;
}

/** Door seen from above with the magnet; ``deg`` how far it is open (≈18° = ajar ~10 cm). */
export function doorArt(deg: number) {
  const end = `${56 + 148 * Math.cos(rad(-deg))} ${135 + 148 * Math.sin(rad(-deg))}`;
  return svg`<svg viewBox="0 0 260 180" class="doorsvg" role="img">
    <rect x="16" y="120" width="40" height="30" class="frame"/>
    <rect x="204" y="120" width="40" height="30" class="frame"/>
    <path d="M56 135 A148 148 0 0 1 ${end}" class="swing"/>
    ${deg ? svg`<text x="214" y="86" class="gap">≈10 cm</text>` : null}
    <g style="transform: rotate(${-deg}deg); transform-origin: 56px 135px; transition: transform .8s ease">
      <rect x="56" y="128" width="148" height="14" rx="2" class="leaf"/>
      <rect x="168" y="118" width="24" height="10" rx="2" class="housing"/>
    </g>
    <rect x="200" y="112" width="10" height="8" class="magnet"/>
  </svg>`;
}

export const artStyles = css`
  :host {
    --art-line: var(--primary-text-color);
    --art-paper: var(--card-background-color);
    --art-shade: color-mix(in srgb, var(--primary-text-color) 10%, var(--card-background-color));
    --art-dark: color-mix(in srgb, var(--primary-text-color) 72%, var(--card-background-color));
    --art-accent: #f39a1e;
    --art-bubble-edge: color-mix(in srgb, var(--primary-text-color) 35%, transparent);
  }
  .art {
    display: grid;
    grid-template-columns: 3fr 2fr;
    gap: 12px;
    align-items: center;
    padding: 12px;
    border-radius: 12px;
    background: var(--secondary-background-color);
  }
  .art.single {
    grid-template-columns: 1fr;
    justify-items: center;
  }
  .art svg {
    width: 100%;
    max-height: 230px;
  }
  .art.single svg {
    max-width: 260px;
  }
  @media (max-width: 520px) {
    .art {
      grid-template-columns: 1fr;
    }
    .art .dial {
      max-height: 160px;
    }
  }

  /* scenes */
  .scene .wall { fill: var(--secondary-background-color); }
  .scene .jamb { fill: #5b626c; }
  .scene .jamb-lip { fill: var(--art-shade); stroke: var(--art-line); stroke-width: 1.2; }
  .scene .strike { fill: var(--art-dark); opacity: .55; }
  .scene .gap { fill: var(--art-dark); opacity: .25; }
  .scene .door-g { transition: transform .8s ease; }
  .scene .door, .latchtype .door { fill: var(--art-paper); stroke: var(--art-line); stroke-width: 1.6; }
  .scene .door-line { stroke: var(--art-line); stroke-width: 2.5; }
  .scene .door-edge, .latchtype .door-edge { fill: var(--art-shade); stroke: var(--art-line); stroke-width: 1.4; }
  .scene .faceplate, .latchtype .faceplate { fill: var(--art-paper); stroke: var(--art-line); stroke-width: 1.4; }
  .scene .screw { fill: none; stroke: var(--art-line); stroke-width: 1; }
  .scene .bolt, .latchtype .bolt { fill: var(--art-accent); stroke: var(--art-line); stroke-width: 1.4; }
  .scene .bolt-top, .latchtype .bolt-top { fill: color-mix(in srgb, var(--art-accent) 60%, #fff); stroke: var(--art-line); stroke-width: 1.2; }
  .scene .slot { fill: none; stroke: var(--art-accent); stroke-width: 2.2; }
  .scene .latch, .latchtype .latch { fill: var(--art-paper); stroke: var(--art-line); stroke-width: 1.4; }
  .scene .latch-line, .latchtype .latch-line { stroke: var(--art-line); stroke-width: 1.2; }
  .scene .latch-g.hl .latch { fill: color-mix(in srgb, var(--art-accent) 55%, var(--art-paper)); }
  .scene .magnet, .doorsvg .magnet { fill: var(--primary-color); }
  .scene .magnet-line { stroke: var(--art-paper); stroke-width: 1.5; }
  .scene .body { fill: var(--art-paper); stroke: var(--art-line); stroke-width: 2; }
  .scene .body-back { fill: var(--art-shade); stroke: var(--art-line); stroke-width: 1.6; }
  .scene .body-inner { fill: none; stroke: var(--art-line); stroke-width: 1; opacity: .6; }
  .scene .seam { stroke: var(--art-line); stroke-width: 1; opacity: .6; }
  .scene .led { fill: var(--primary-color); }
  .scene .shoulder { fill: var(--art-shade); stroke: var(--art-line); stroke-width: 1.4; }
  .scene .knob-side { fill: var(--art-shade); stroke: var(--art-line); stroke-width: 1.6; }
  .scene .knob-face { fill: var(--art-paper); stroke: var(--art-line); stroke-width: 2; }
  .scene .knob-dot { fill: var(--primary-color); }
  .scene .grip { fill: var(--art-shade); stroke: var(--art-line); stroke-width: 1.6; }
  .scene .disc { fill: var(--art-shade); stroke: var(--art-line); stroke-width: 1.6; }
  .scene .bar { fill: color-mix(in srgb, var(--art-line) 22%, var(--art-paper)); stroke: var(--art-line); stroke-width: 1.6; }
  .scene .bar-shine { fill: var(--art-paper); opacity: .8; }
  .scene .rosette { fill: color-mix(in srgb, var(--art-line) 30%, var(--art-paper)); stroke: var(--art-line); stroke-width: 1.4; }
  .scene .cup { fill: color-mix(in srgb, var(--art-line) 45%, var(--art-paper)); stroke: var(--art-line); stroke-width: 1.4; }
  .scene .jaw { fill: none; stroke: var(--art-line); stroke-width: 1.6; stroke-linejoin: round; }
  .scene .cup-line { stroke: var(--art-paper); stroke-width: 1; opacity: .6; }
  .scene .bslot { stroke: var(--art-line); stroke-width: 2; stroke-linecap: round; opacity: .7; }
  .scene .needle { transition: transform .5s ease; }
  .scene.moving .needle { transition: transform .25s linear; }
  .scene .hand path { fill: var(--art-paper); stroke: var(--art-line); stroke-width: 1.6; stroke-linejoin: round; }
  .scene .hand .fingers { fill: none; stroke-width: 1.2; }
  .scene .bubble > g > path { fill: #333a44; stroke: var(--art-bubble-edge, transparent); stroke-width: 1.5; }
  .scene .padlock .lockbody { fill: #fff; }
  .scene .padlock .shackle { fill: none; stroke: #fff; stroke-width: 2.6; stroke-linecap: round; }
  .scene .marker circle { fill: #333a44; stroke: var(--art-bubble-edge, transparent); stroke-width: 1.2; }
  .scene .marker text { fill: #fff; font: 700 11px Roboto, sans-serif; text-anchor: middle; }
  .scene .gap-label { fill: var(--primary-color); font: 600 12px Roboto, sans-serif; text-anchor: middle; }
  .scene.blocked .bolt { fill: var(--error-color, #db4437); }
  .scene.moving .bolt, .scene.moving .slot { animation: pulse .8s ease-in-out infinite; }
  .badge circle { fill: var(--error-color, #db4437); }
  .badge path { stroke: #fff; stroke-width: 3; stroke-linecap: round; }
  @keyframes pulse { 50% { opacity: .5; } }

  /* jam */
  .jam { width: 160px; height: 160px; }
  .jam .jam-body { fill: #4a5059; }
  .jam .jam-body.light { fill: #8e98a3; }
  .jam .jam-knob { fill: #3b4048; stroke: #6b737d; stroke-width: 3; }
  .jam .jam-knob.light { fill: #d9dde1; stroke: none; }
  .jam .jam-grip { fill: #6b737d; }
  .jam .jam-bar { fill: #c3c8ce; stroke: #6b737d; stroke-width: 1.5; }
  .jam .jam-seam { stroke: #6b737d; stroke-width: 2; }
  .jam .jam-dot { fill: var(--error-color, #db4437); }

  /* lock type */
  .latchtype { width: 100%; max-width: 160px; align-self: center; }
  .latchtype .cyl { fill: var(--art-shade); stroke: var(--art-line); stroke-width: 1.4; }
  .latchtype .cyl-in { fill: none; stroke: var(--art-line); stroke-width: 1.2; }
  .latchtype .key { fill: var(--art-accent); stroke: var(--art-line); stroke-width: 1.2; }
  .latchtype .handle { fill: var(--art-paper); stroke: var(--art-line); stroke-width: 1.6; }

  /* dial */
  .dial .ring { fill: none; stroke: var(--divider-color); stroke-width: 2; }
  .dial .tick { stroke: var(--secondary-text-color); stroke-width: 1.2; opacity: .5; }
  .dial .tick.long { stroke-width: 2; opacity: .9; }
  .dial .plate { fill: var(--secondary-background-color); stroke: var(--primary-text-color); stroke-width: 1.5; }
  .dial .body { fill: var(--card-background-color); stroke: var(--primary-text-color); stroke-width: 2.5; }
  .dial .needle { transition: transform .5s ease; }
  .dial .grip { fill: var(--secondary-background-color); stroke: var(--primary-text-color); stroke-width: 2.5; }
  .dial .grip.bar { fill: color-mix(in srgb, var(--primary-text-color) 22%, var(--card-background-color)); }
  .dial .dot { fill: var(--primary-color); }
  .dial .mark.lockmark { fill: var(--primary-color); }
  .dial .turn-arrow { fill: none; stroke: var(--primary-color); stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
  .dial.moving .needle { transition: transform .25s linear; }

  /* door from above */
  .doorsvg .frame { fill: var(--secondary-text-color); opacity: .35; }
  .doorsvg .leaf { fill: var(--card-background-color); stroke: var(--primary-text-color); stroke-width: 2.5; }
  .doorsvg .housing { fill: var(--secondary-background-color); stroke: var(--primary-text-color); stroke-width: 1.5; }
  .doorsvg .swing { fill: none; stroke: var(--secondary-text-color); stroke-dasharray: 4 6; }
  .doorsvg .gap { fill: var(--primary-color); font: 600 14px sans-serif; text-anchor: middle; }

  .result { width: 120px; height: 120px; }
  .result.ok circle { fill: none; stroke: var(--success-color, #43a047); stroke-width: 6; }
  .result.ok path { fill: none; stroke: var(--success-color, #43a047); stroke-width: 8; stroke-linecap: round; stroke-linejoin: round; }
  .result.bad path:first-child { fill: none; stroke: var(--error-color, #db4437); stroke-width: 6; stroke-linejoin: round; }
  .result.bad path:last-child { stroke: var(--error-color, #db4437); stroke-width: 8; stroke-linecap: round; }
  @media (prefers-reduced-motion: reduce) {
    .scene.moving .bolt, .scene.moving .slot { animation: none; }
  }
`;
