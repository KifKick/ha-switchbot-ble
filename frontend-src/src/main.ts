/**
 * "SwitchBot" sidebar panel of the ha_switchbot_ble integration.
 *
 * Navigation: device list (/)  ->  device page (/device/<entry_id>/<section>).
 * The path lives in the panel route, so browser back/forward work like in HA.
 */

import { safeElement } from "./base";
import { css, html, nothing, type PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";
import { mdiArrowLeft, mdiFlask } from "@mdi/js";

import { fetchDevices } from "./api";
import { SbElement, errorMessage } from "./base";
import { DEMO_EVENTS, demoHass, onDemoChange, type DemoEvent } from "./demo/demo-hass";
import { coverEvent, coverEvents, coverScenarioOn } from "./demo/demo-covers";
import { demoLockEvent, lockScenarioOn, lockScenarios, toggleLockScenario, type LockBarEvent } from "./demo/demo-locks";
import type { StringKey } from "./localize";
import { pageStyles, sharedStyles } from "./styles";
import type { DevicesResult, HomeAssistant, PanelRoute, SwitchbotDevice } from "./types";
import "./components/sb-icon";
import "./components/sb-device-list";
import { SECTION_ICONS, currentSection, deviceSections } from "./components/sb-device-page";

const DEMO_KEY = "switchbot-panel-demo";

function readDemoFlag(): boolean {
  try {
    return localStorage.getItem(DEMO_KEY) === "1";
  } catch {
    return false;
  }
}

@safeElement("switchbot-panel")
export class SwitchbotPanel extends SbElement {
  @property({ type: Boolean }) narrow = false;
  @property({ attribute: false }) route?: PanelRoute;

  @state() private _path = "";
  @state() private _devices?: DevicesResult;
  @state() private _error?: string;
  @state() private _demo = readDemoFlag();

  private _realHass?: HomeAssistant;
  private _demoHass?: HomeAssistant;
  private _unDemo?: () => void;

  /** hass handed to child components: the real one or the demo wrapper. */
  private get _h(): HomeAssistant {
    if (!this._demo) return this.hass;
    if (this._realHass !== this.hass || !this._demoHass) {
      this._realHass = this.hass;
      this._demoHass = demoHass(this.hass);
    }
    return this._demoHass;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener("popstate", this._onPopState);
    this.addEventListener("sb-navigate", this._onNavigate as EventListener);
    // demo entity changes: hand a fresh wrapper down so everything re-renders
    this._unDemo = onDemoChange(() => {
      this._demoHass = undefined;
      this.requestUpdate();
    });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener("popstate", this._onPopState);
    this.removeEventListener("sb-navigate", this._onNavigate as EventListener);
    this._unDemo?.();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (changed.has("route") && this.route) this._path = this.route.path || "";
    if (changed.has("hass") && this.hass && !changed.get("hass") && !this._devices) this._load();
  }

  private async _load(): Promise<void> {
    this._error = undefined;
    try {
      this._devices = await fetchDevices(this._h);
    } catch (err) {
      this._error = errorMessage(err);
      this._devices = { devices: [], offset_limits: {} };
    }
  }

  private _onPopState = () => {
    if (this.route) return; // HA updates `route` itself
    this._path = location.hash.slice(1);
  };

  private _onNavigate = (ev: CustomEvent<{ path: string }>) => {
    ev.stopPropagation();
    this._go(ev.detail.path);
  };

  private _go(path: string, replace = false): void {
    this._path = path;
    if (this.route) {
      const url = this.route.prefix + path;
      if (replace) history.replaceState(null, "", url);
      else history.pushState(null, "", url);
      window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace } }));
    }
    window.scrollTo(0, 0);
  }

  private get _parsed(): { device?: SwitchbotDevice; section?: string } {
    const m = /^\/device\/([^/]+)(?:\/([^/]+))?/.exec(this._path);
    if (!m || !this._devices) return {};
    return {
      device: this._devices.devices.find((d) => d.entry_id === decodeURIComponent(m[1])),
      section: m[2],
    };
  }

  private _toggleDemo(): void {
    this._demo = !this._demo;
    try {
      localStorage.setItem(DEMO_KEY, this._demo ? "1" : "0");
    } catch {
      /* the choice just isn't remembered */
    }
    this._devices = undefined;
    this._go("", true);
    this._load();
  }

  protected override render() {
    if (!this.hass) return nothing;
    const { device, section } = this._parsed;
    const onDevicePage = this._path.startsWith("/device/");
    return html`
      <header class="header">
      <div class="toolbar">
        ${onDevicePage
          ? html`<button class="icon-btn" title=${this.t("common.back")} aria-label=${this.t("common.back")}
              @click=${() => this._go("")}>
              <sb-icon .path=${mdiArrowLeft}></sb-icon>
            </button>`
          : html`<ha-menu-button .hass=${this.hass} .narrow=${this.narrow}></ha-menu-button>`}
        <div class="main-title">${device?.name ?? this.t("title")}</div>
        <button class="demo-toggle ${this._demo ? "on" : ""}" aria-pressed=${this._demo ? "true" : "false"}
          @click=${this._toggleDemo}>
          <sb-icon .path=${mdiFlask} .size=${18}></sb-icon>${this.t("demo.toggle")}
        </button>
      </div>
      ${device ? this._renderTabs(device, section) : nothing}
      </header>
      ${this._demo ? this._renderDemoBar(device) : nothing}
      ${this._renderContent(onDevicePage, device, section)}
    `;
  }

  private _renderContent(onDevicePage: boolean, device?: SwitchbotDevice, section?: string) {
    if (!this._devices) {
      return html`<div class="page"><div class="card loading"><span class="spinner"></span>${this.t("common.loading")}</div></div>`;
    }
    if (onDevicePage && device) {
      return html`<sb-device-page
        .hass=${this._h}
        .device=${device}
        .section=${section}
        .offsetLimits=${this._devices.offset_limits}
        .narrow=${this.narrow}
      ></sb-device-page>`;
    }
    return html`<sb-device-list
      .hass=${this._h}
      .devices=${this._devices.devices}
      .error=${this._error}
    ></sb-device-list>`;
  }

  private _renderTabs(device: SwitchbotDevice, section?: string) {
    const sections = deviceSections(this._h, device);
    const current = currentSection(sections, section);
    const base = `/device/${encodeURIComponent(device.entry_id)}`;
    return html`<nav class="tabs" role="tablist">
      ${sections.map(
        (s) => html`<a role="tab" class="tab ${s === current ? "active" : ""}" aria-selected=${s === current ? "true" : "false"}
          href="#${base}/${s}" data-section=${s}
          @click=${(ev: Event) => {
            ev.preventDefault();
            this._go(s === "overview" ? base : `${base}/${s}`, true);
          }}>
          <sb-icon .path=${SECTION_ICONS[s]} .size=${20}></sb-icon><span>${this.t(`sections.${s}`)}</span>
        </a>`,
      )}
    </nav>`;
  }

  private _renderDemoBar(device?: SwitchbotDevice) {
    const sims: DemoEvent[] = device?.kind === "keypad" ? ["code", "card", "wrong", "tamper"] : [];
    const lockBar: LockBarEvent[] = device?.kind === "lock" ? ["knob", "door"] : [];
    return html`<div class="demo-bar">
      <div class="alert warning">
        <sb-icon .path=${mdiFlask}></sb-icon>
        <div class="text">${this.t("demo.banner")}</div>
        ${sims.length
          ? html`<div class="sims">
              ${sims.map(
                (s) => html`<button class="btn outlined small" @click=${() => DEMO_EVENTS[s]()}>${this.t(`demo.${s}`)}</button>`,
              )}
            </div>`
          : nothing}
        ${device?.kind === "lock"
          ? html`<div class="sims">
              ${lockBar.map(
                (ev) => html`<button class="btn outlined small" data-demo=${ev}
                  @click=${() => demoLockEvent(device.entry_id, ev)}>${this.t(`demo.${ev}` as StringKey)}</button>`,
              )}
              ${lockScenarios(device.entry_id).map(
                (sc) => html`<button class="btn small ${lockScenarioOn(device.entry_id, sc) ? "filled" : "outlined"}" data-demo=${sc}
                  @click=${() => {
                    toggleLockScenario(device.entry_id, sc);
                    this.requestUpdate();
                  }}>${this.t(`demo.lock.${sc}` as StringKey)}</button>`,
              )}
            </div>`
          : nothing}
        ${device?.kind === "cover" && coverEvents(device.entry_id).length
          ? html`<div class="sims">
              ${coverEvents(device.entry_id).map(
                (ev) => html`<button class="btn small ${coverScenarioOn(device.entry_id, ev) ? "filled" : "outlined"}" data-demo=${ev}
                  @click=${() => {
                    coverEvent(device.entry_id, ev);
                    this.requestUpdate();
                  }}>${this.t(`demo.cover.${ev}` as StringKey)}</button>`,
              )}
            </div>`
          : nothing}
      </div>
    </div>`;
  }

  static override styles = [
    sharedStyles,
    pageStyles,
    css`
      :host {
        display: block;
        min-height: 100vh;
        background: var(--primary-background-color);
      }
      .header {
        position: sticky;
        top: 0;
        z-index: 4;
        background: var(--app-header-background-color, var(--primary-color));
        color: var(--app-header-text-color, var(--text-primary-color, #fff));
        border-bottom: var(--app-header-border-bottom, none);
      }
      .toolbar {
        display: flex;
        align-items: center;
        gap: 4px;
        height: var(--header-height, 56px);
        padding: 0 16px 0 4px;
        font-size: 20px;
      }
      .main-title {
        flex: 1;
        margin-left: 12px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-weight: 400;
      }
      .demo-toggle {
        font: inherit;
        font-size: 13px;
        font-weight: 500;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 12px;
        border-radius: 16px;
        border: 1px solid currentColor;
        background: none;
        color: inherit;
        opacity: 0.75;
        cursor: pointer;
      }
      .demo-toggle.on {
        opacity: 1;
        background: color-mix(in srgb, currentColor 18%, transparent);
      }
      .demo-bar {
        max-width: 1000px;
        margin: 16px auto 0;
        padding: 0 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .demo-bar .alert {
        flex-wrap: wrap;
      }
      .demo-bar .alert .text {
        flex: 1 1 240px;
      }
      .sims {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        flex: 1 1 100%;
      }
      .demo-toggle {
        flex: none;
      }
      .tabs {
        display: flex;
        justify-content: center;
        overflow-x: auto;
        scrollbar-width: none;
      }
      .tab {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 0 16px;
        height: 48px;
        color: inherit;
        opacity: 0.72;
        text-decoration: none;
        font-size: 14px;
        font-weight: 500;
        white-space: nowrap;
        border-bottom: 2px solid transparent;
      }
      .tab:hover {
        opacity: 1;
      }
      .tab.active {
        opacity: 1;
        border-bottom-color: currentColor;
      }
      @media (max-width: 600px) {
        .tabs {
          justify-content: flex-start;
        }
        .tab {
          padding: 0 12px;
        }
        .tab sb-icon {
          display: none;
        }
      }
      .loading {
        display: flex;
        gap: 12px;
        align-items: center;
        padding: 16px;
        color: var(--secondary-text-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "switchbot-panel": SwitchbotPanel;
  }
}
