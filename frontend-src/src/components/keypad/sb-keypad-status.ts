import { css, html, nothing } from "lit";
import { mdiAlert, mdiShieldAlertOutline, mdiLockAlertOutline } from "@mdi/js";

import { safeElement } from "../../base";

import { sharedStyles } from "../../styles";
import { KeypadPart } from "./keypad-base";
import "../sb-icon";

/** Keypad alarms with the actions that clear them, and a summary of what is stored. */
@safeElement("sb-keypad-status")
export class SbKeypadStatus extends KeypadPart {
  private _action(action: string) {
    this.run(async () => {
      await this.op("action", { action });
      this.message(this.t("common.done"));
    });
  }

  protected override render() {
    const s = this.keypad.state;
    const alerts = [];
    if (s.lockout) {
      const which = (["passcode", "nfc", "fingerprint"] as const).filter((x) => s[`${x}_locked_out`]);
      alerts.push(html`<div class="alert error">
        <sb-icon .path=${mdiLockAlertOutline}></sb-icon>
        <div class="text">${this.t("keypad.lockout")}</div>
        ${(which.length ? which : (["passcode", "nfc"] as const)).map(
          (x) => html`<button class="btn small" data-action="cancel_${x}_lockout" ?disabled=${this.busy}
            @click=${() => this._action(`cancel_${x}_lockout`)}>${this.t("keypad.lift")}: ${this.t(`keypad.lockout_kinds.${x}`)}</button>`,
        )}
      </div>`);
    }
    if (s.tamper_alarm)
      alerts.push(html`<div class="alert error">
        <sb-icon .path=${mdiShieldAlertOutline}></sb-icon><div class="text">${this.t("keypad.tamper")}</div>
        <button class="btn small" data-action="clear_tamper_alarm" ?disabled=${this.busy}
          @click=${() => this._action("clear_tamper_alarm")}>${this.t("keypad.clear")}</button>
      </div>`);
    if (s.duress_alarm)
      alerts.push(html`<div class="alert error">
        <sb-icon .path=${mdiAlert}></sb-icon><div class="text">${this.t("keypad.duress")}</div>
        <button class="btn small" data-action="cancel_duress_alarm" ?disabled=${this.busy}
          @click=${() => this._action("cancel_duress_alarm")}>${this.t("common.cancel")}</button>
      </div>`);
    return html`${alerts}
      <section class="card">
        <div class="list">
          ${s.battery !== undefined
            ? html`<div class="item"><span class="text">${this.t("keypad.battery")}</span>
                <span class="meta ${s.battery <= 15 ? "error-text" : ""}">${s.battery}%${s.battery_charging ? ` · ${this.t("keypad.charging")}` : ""}</span></div>`
            : nothing}
          ${s.passcodes_count !== undefined
            ? html`<div class="item"><span class="text">${this.t("keypad.on_device")}</span>
                <span class="meta">${this.t("keypad.on_device_value", { p: s.passcodes_count, c: s.nfc_cards_count ?? "?" })}</span></div>`
            : nothing}
          ${s.firmware ? html`<div class="item"><span class="text">${this.t("keypad.firmware")}</span><span class="meta">${s.firmware}</span></div>` : nothing}
        </div>
      </section>`;
  }

  static override styles = [
    sharedStyles,
    css`
      :host {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .item {
        min-height: 48px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "sb-keypad-status": SbKeypadStatus;
  }
}
