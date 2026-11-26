/**
 * Mock-up of the cover calibration wizards for review: the real wizard
 * component on the demo devices (nothing talks to Home Assistant). Built by
 * ``node build.mjs --mockup <out.html>`` into one self-contained page.
 */

import { LitElement, css, html } from "lit";
import { state } from "lit/decorators.js";

import "../components/cover/sb-cover-calibration";
import { COVER_DEVICES, coverEvent, coverEvents, coverScenarioOn } from "../demo/demo-covers";
import { demoHass, onDemoChange } from "../demo/demo-hass";
import { localize, type StringKey } from "../localize";
import type { HomeAssistant } from "../types";

const LABELS: Record<string, string> = {
  demo_c3u: "Curtain 3 · szyna U",
  demo_c3i: "Curtain 3 · szyna I",
  demo_c3rod: "Curtain 3 · drążek",
  demo_t4solar: "Track 4 · panel słoneczny",
  demo_t4bat: "Track 4 · Extended Battery",
  demo_t4pair: "Track 4 · para L/R",
  demo_roller: "Roller Shade",
  demo_blindh: "Blind Tilt · poziome",
  demo_blindv: "Blind Tilt · pionowe",
};

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

class CoverMockup extends LitElement {
  @state() private _entry = "demo_c3u";
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

  protected override render() {
    document.documentElement.dataset.theme = this._dark ? "dark" : "light";
    const device = COVER_DEVICES.find((d) => d.entry_id === this._entry)!;
    const t = localize(this._hass);
    return html`<header>
        <h1>Kalibracja zasłon i rolet — makieta</h1>
        <p>Prawdziwy kreator z panelu na symulowanych urządzeniach. Przyciski „Symulacja” udają to, co robi użytkownik lub urządzenie.</p>
        <nav>
          ${COVER_DEVICES.map(
            (d) => html`<button class=${d.entry_id === this._entry ? "on" : ""} @click=${() => (this._entry = d.entry_id)}>${LABELS[d.entry_id]}</button>`,
          )}
        </nav>
        <div class="row">
          <span>Symulacja:</span>
          ${coverEvents(this._entry).map(
            (ev) => html`<button class=${coverScenarioOn(this._entry, ev) ? "on" : ""} @click=${() => {
              coverEvent(this._entry, ev);
              this.requestUpdate();
            }}>${t(`demo.cover.${ev}` as StringKey)}</button>`,
          )}
          <span class="spacer"></span>
          <button @click=${() => (this._dark = !this._dark)}>${this._dark ? "Jasny" : "Ciemny"}</button>
          <button @click=${() => this._setLang(this._lang === "pl" ? "en" : "pl")}>${this._lang === "pl" ? "EN" : "PL"}</button>
        </div>
      </header>
      <main>
        ${[this._entry].map(
          () => html`<sb-cover-calibration .hass=${this._hass} .device=${device} data-tick=${this._tick}></sb-cover-calibration>`,
        )}
      </main>`;
  }

  static override styles = css`
    :host {
      display: block;
      max-width: 760px;
      margin: 0 auto;
      padding: 16px;
      color: var(--primary-text-color);
      font-family: Roboto, system-ui, sans-serif;
    }
    h1 {
      font-size: 20px;
      margin: 0 0 4px;
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
  `;
}

customElements.define("cover-mockup", CoverMockup);
