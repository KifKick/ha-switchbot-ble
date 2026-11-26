/**
 * Mock-up of the lock calibration illustrations for review: a gallery of every
 * scene per model, and the real wizard on the demo locks (nothing talks to Home
 * Assistant). Built by ``node build.mjs --mockup <out.html> lock``.
 */

import { LitElement, css, html } from "lit";
import { state } from "lit/decorators.js";

import "../components/lock/sb-lock-calibration";
import {
  artStyles,
  blockArt,
  dialArt,
  doorArt,
  latchTypeArt,
  lockSceneArt,
  resultArt,
  type LockModel,
  type LockScene,
} from "../components/lock/lock-art";
import { LOCK_DEVICES, lockScenarioOn, lockScenarios, toggleLockScenario } from "../demo/demo-locks";
import { demoHass, onDemoChange } from "../demo/demo-hass";
import { localize, type StringKey } from "../localize";
import type { HomeAssistant } from "../types";

const LABELS: Record<string, string> = {
  demo_lock: "Ultra EU · nieznany",
  demo_lock_nl: "Ultra EU · Night Latch",
  demo_lock_op: "Ultra EU · One-Piece",
  demo_lock_us: "Ultra spoza EU",
  demo_lockpro: "Lock Pro",
  demo_ultramax: "Ultra Max",
  demo_lock1: "Lock",
  demo_lock1_nl: "Lock · zatrzask",
  demo_lite: "Lock Lite",
};

const MODELS: [LockModel, string][] = [
  ["lock_ultra", "Lock Ultra"],
  ["lock_ultra_max", "Lock Ultra Max"],
  ["lock_pro", "Lock Pro"],
  ["lock", "Lock (1. generacja)"],
  ["lock_lite", "Lock Lite"],
];

type Shot = { name: string; scene: LockScene; side?: "dial" | "door"; dial?: number; arrow?: "cw" | "ccw" };

const LOCKED = 110;
const UNLOCKED = 20;

function shots(model: LockModel): Shot[] {
  const pro = model === "lock_pro";
  if (model === "lock") {
    return [
      { name: "l1: zamknij drzwi i zamek ręcznie", scene: { bolt: 1, hand: true, door: "closed", bubble: "locked", knob: LOCKED }, arrow: "cw" },
      { name: "l2: przekręć do otwarcia", scene: { bolt: 0, hand: true, door: "closed", bubble: "unlocked", knob: UNLOCKED }, arrow: "ccw" },
      { name: "l3: drzwi przy futrynie, zamknij ręcznie", scene: { bolt: 1, door: "against", bubble: "locked", magnet: true, knob: LOCKED } },
      { name: "l4: test otwierania", scene: { bolt: 1, door: "against", bubble: "unlocked", knob: LOCKED } },
      { name: "l5: zamknij drzwi, test zamykania", scene: { bolt: 0, door: "closed", bubble: "locked", knob: UNLOCKED } },
      { name: "l3 przy Night Latch", scene: { bolt: 1, door: "against", bubble: "locked", nightLatch: true, magnet: true, knob: LOCKED } },
      { name: "Silnik w ruchu", scene: { bolt: 0.7, knob: 80, moving: true } },
      { name: "Silnik zablokowany", scene: { bolt: 0.4, knob: 60, blocked: true } },
    ];
  }
  if (model === "lock_lite") {
    return [
      { name: "t1: przekręć do zamknięcia", scene: { bolt: 1, hand: true, door: "open", bubble: "locked", knob: LOCKED }, arrow: "cw" },
      { name: "t2: przekręć do otwarcia", scene: { bolt: 0, hand: true, door: "open", bubble: "unlocked", knob: UNLOCKED }, arrow: "ccw" },
      { name: "t3: test otwierania", scene: { bolt: 1, door: "open", bubble: "unlocked", knob: LOCKED } },
      { name: "t4: zamknij drzwi", scene: { bolt: 0, door: "closed", bubble: "locked", knob: UNLOCKED } },
      { name: "Silnik w ruchu", scene: { bolt: 0.7, knob: 80, moving: true } },
      { name: "Silnik zablokowany", scene: { bolt: 0.4, knob: 60, blocked: true } },
    ];
  }
  const common: Shot[] = [
    { name: "Przekręć do zamknięcia (ręka)", scene: { bolt: 1, hand: true, bubble: "locked", knob: LOCKED }, arrow: "cw" },
    { name: "Przekręć do otwarcia (ręka)", scene: { bolt: 0, hand: true, bubble: "unlocked", knob: UNLOCKED }, arrow: "ccw" },
    { name: "Night Latch: ① zatrzask ② rygiel", scene: { bolt: 0, hand: true, bubble: "unlocked", nightLatch: true, markers: true, knob: UNLOCKED }, arrow: "ccw" },
    { name: "Test zamykania (zamek sam)", scene: { bolt: 1, bubble: "locked", knob: LOCKED } },
    { name: "Test otwierania (zamek sam)", scene: { bolt: 0, bubble: "unlocked", knob: UNLOCKED } },
    { name: "Silnik w ruchu", scene: { bolt: 0.7, knob: 80, moving: true } },
    { name: "Silnik zablokowany", scene: { bolt: 0.4, knob: 60, blocked: true } },
  ];
  if (pro) {
    return [
      ...common,
      { name: "p3: drzwi uchylone ~10 cm, zamknij ręcznie", scene: { bolt: 1, hand: true, door: "ajar", bubble: "locked", magnet: true, knob: LOCKED }, side: "door" },
      { name: "p4: test otwierania przy uchylonych drzwiach", scene: { bolt: 1, door: "ajar", bubble: "unlocked", magnet: true, knob: LOCKED }, side: "door" },
      { name: "p5: drzwi zamknięte, test zamykania", scene: { bolt: 0, door: "closed", bubble: "locked", magnet: true, knob: UNLOCKED } },
    ];
  }
  return [
    ...common,
    { name: "auto1: otwórz i przytrzymaj drzwi", scene: { bolt: 0, hand: true, door: "open", bubble: "unlocked", knob: UNLOCKED }, arrow: "ccw" },
    { name: "Półzamknięcie", scene: { bolt: 0.5, hand: true, knob: 65 } },
    { name: "Magnes: drzwi uchylone ~10 cm", scene: { bolt: 0, door: "ajar", bubble: "unlocked", magnet: true, knob: UNLOCKED }, side: "door" },
    { name: "Magnes: drzwi zamknięte", scene: { bolt: 0, door: "closed", bubble: "unlocked", magnet: true, knob: UNLOCKED }, side: "door" },
  ];
}

function fakeHass(language: string): HomeAssistant {
  return {
    language,
    locale: { language },
    states: {},
    entities: {},
    connection: { subscribeMessage: () => Promise.reject(new Error("offline mock-up")) },
    callWS: () => Promise.reject(new Error("offline mock-up")),
    callService: () => Promise.resolve(),
  } as unknown as HomeAssistant;
}

class LockMockup extends LitElement {
  @state() private _tab: "gallery" | "wizard" = "gallery";
  @state() private _entry = "demo_lock";
  @state() private _dark = matchMedia("(prefers-color-scheme: dark)").matches;
  @state() private _lang = "pl";
  @state() private _tick = 0;
  private _hass = demoHass(fakeHass("pl"));

  constructor() {
    super();
    onDemoChange(() => (this._tick += 1));
  }

  private _setLang(lang: string) {
    this._lang = lang;
    this._hass = demoHass(fakeHass(lang));
  }

  private _gallery() {
    return html`${MODELS.map(
        ([model, label]) => html`<h2>${label}</h2>
          <div class="grid">
            ${shots(model).map(
              (s) => html`<figure>
                <div class="art">
                  <div>${lockSceneArt(model, s.scene)}</div>
                  <div>
                    ${s.side === "door"
                      ? doorArt(s.scene.door === "ajar" ? 18 : 0)
                      : dialArt({ model, angle: s.scene.knob, arrow: s.arrow, moving: s.scene.moving,
                          marks: s.scene.bubble === "unlocked" ? [{ angle: LOCKED, cls: "lockmark" }] : [] })}
                  </div>
                </div>
                <figcaption>${s.name}</figcaption>
              </figure>`,
            )}
            <figure>
              <div class="art single">${blockArt(model)}</div>
              <figcaption>Okno „Zablokowany”</figcaption>
            </figure>
          </div>`,
      )}
      <h2>Wspólne: typ zamka w drzwiach (to sprzęt drzwi, nie zamek; w aplikacji też wspólne)</h2>
      <div class="grid">
        <figure><div class="art single">${latchTypeArt(true)}</div><figcaption>Zamek z zatrzaskiem (Night Latch)</figcaption></figure>
        <figure><div class="art single">${latchTypeArt(false)}</div><figcaption>Zamek jednoczęściowy (One-Piece)</figcaption></figure>
        <figure><div class="art single">${resultArt(true)}</div><figcaption>Gotowe</figcaption></figure>
      </div>`;
  }

  private _wizard() {
    const device = LOCK_DEVICES.find((d) => d.entry_id === this._entry)!;
    const t = localize(this._hass);
    return html`<nav>
        ${LOCK_DEVICES.map(
          (d) => html`<button class=${d.entry_id === this._entry ? "on" : ""} @click=${() => (this._entry = d.entry_id)}>${LABELS[d.entry_id]}</button>`,
        )}
      </nav>
      <div class="row">
        <span>Symulacja:</span>
        ${lockScenarios(this._entry).map(
          (sc) => html`<button class=${lockScenarioOn(this._entry, sc) ? "on" : ""} @click=${() => {
            toggleLockScenario(this._entry, sc);
            this.requestUpdate();
          }}>${t(`demo.lock.${sc}` as StringKey)}</button>`,
        )}
      </div>
      ${[this._entry].map(
        () => html`<sb-lock-calibration .hass=${this._hass} .device=${device} data-tick=${this._tick}></sb-lock-calibration>`,
      )}`;
  }

  protected override render() {
    document.documentElement.dataset.theme = this._dark ? "dark" : "light";
    return html`<header>
        <h1>Kalibracja zamków: ilustracje (makieta)</h1>
        <p>Własne rysunki dla każdego modelu (Lock Ultra, Ultra Max, Lock Pro, Lock 1. generacji, Lock Lite), wzorowane na obrazkach aplikacji SwitchBot i zdjęciach urządzeń.
          „Galeria” pokazuje każdą scenę, „Kreator” to prawdziwy kreator z panelu na zamkach demo.</p>
        <div class="row">
          <button class=${this._tab === "gallery" ? "on" : ""} @click=${() => (this._tab = "gallery")}>Galeria</button>
          <button class=${this._tab === "wizard" ? "on" : ""} @click=${() => (this._tab = "wizard")}>Kreator</button>
          <span class="spacer"></span>
          <button @click=${() => (this._dark = !this._dark)}>${this._dark ? "Jasny" : "Ciemny"}</button>
          <button @click=${() => this._setLang(this._lang === "pl" ? "en" : "pl")}>${this._lang === "pl" ? "EN" : "PL"}</button>
        </div>
      </header>
      <main>${this._tab === "gallery" ? this._gallery() : this._wizard()}</main>`;
  }

  static override styles = [
    artStyles,
    css`
      :host {
        display: block;
        max-width: 980px;
        margin: 0 auto;
        padding: 16px;
        color: var(--primary-text-color);
        font-family: Roboto, system-ui, sans-serif;
      }
      h1 {
        font-size: 20px;
        margin: 0 0 4px;
      }
      h2 {
        font-size: 16px;
        margin: 20px 0 8px;
      }
      p {
        margin: 0 0 12px;
        color: var(--secondary-text-color);
        font-size: 14px;
      }
      nav,
      .row {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 10px;
        align-items: center;
      }
      .row span {
        font-size: 13px;
        color: var(--secondary-text-color);
      }
      .spacer {
        flex: 1;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 12px;
      }
      figure {
        margin: 0;
        padding: 8px;
        border-radius: 14px;
        background: var(--card-background-color);
        border: 1px solid var(--divider-color);
      }
      figcaption {
        font-size: 13px;
        color: var(--secondary-text-color);
        margin-top: 6px;
      }
      .grid .art {
        grid-template-columns: 3fr 2fr;
      }
      button {
        font: inherit;
        font-size: 13px;
        padding: 6px 10px;
        border-radius: 16px;
        border: 1px solid var(--divider-color);
        background: var(--card-background-color);
        color: var(--primary-text-color);
        cursor: pointer;
      }
      button.on {
        background: var(--primary-color);
        border-color: var(--primary-color);
        color: #fff;
      }
    `,
  ];
}

customElements.define("lock-mockup", LockMockup);
