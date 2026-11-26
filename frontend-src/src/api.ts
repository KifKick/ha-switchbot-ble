/** Typed wrappers of the integration's websocket API (custom_components/ha_switchbot_ble/panel/). */

import type {
  ActionResult,
  CoverActionResult,
  CoverStatus,
  CorrectionKey,
  DeviceCalibrationValue,
  DevicesResult,
  HomeAssistant,
  KeypadPayload,
  HistoryRecord,
  LockStatus,
  SensorPayload,
  Unsubscribe,
} from "./types";

/** Command prefix (the integration's domain). */
export const WS = "ha_switchbot_ble";

export const fetchDevices = (hass: HomeAssistant) =>
  hass.callWS<DevicesResult>({ type: `${WS}/panel/devices` });

/* ---------------- sensors */

export interface SensorsMessage {
  sensors: SensorPayload[];
  full?: boolean;
}

export const subscribeSensors = (hass: HomeAssistant, cb: (msg: SensorsMessage) => void) =>
  hass.connection.subscribeMessage<SensorsMessage>(cb, { type: `${WS}/sensors/subscribe` });

export const setOffset = (hass: HomeAssistant, entryId: string, key: CorrectionKey, offset: number) =>
  hass.callWS<{ offset: number; sensor: SensorPayload }>({
    type: `${WS}/sensors/set_offset`,
    entry_id: entryId,
    key,
    offset,
  });

export const deviceCalibration = (
  hass: HomeAssistant,
  entryId: string,
  req: { action: "read" | "set" | "reset"; temperature?: number; humidity?: number },
) =>
  hass.callWS<{ calibration: DeviceCalibrationValue; sensor: SensorPayload }>({
    type: `${WS}/sensors/device_calibration`,
    entry_id: entryId,
    ...req,
  });

/* ---------------- locks */

export interface LockStatusMessage {
  status: LockStatus;
  started: boolean;
}

/** Streams the lock status; the backend keeps the BLE link up meanwhile. */
export const subscribeLockStatus = (
  hass: HomeAssistant,
  entryId: string,
  cb: (msg: LockStatusMessage) => void,
): Promise<Unsubscribe> =>
  hass.connection.subscribeMessage<LockStatusMessage>(cb, {
    type: `${WS}/calibration/subscribe`,
    entry_id: entryId,
  });

export const lockAction = (hass: HomeAssistant, entryId: string, action: string, extra: Record<string, unknown> = {}) =>
  hass.callWS<ActionResult>({ type: `${WS}/calibration/action`, entry_id: entryId, action, ...extra });

/* ---------------- covers */

export interface CoverStatusMessage {
  status: CoverStatus;
  started: boolean;
}

/** Streams the cover status; the backend polls it every second meanwhile. */
export const subscribeCoverStatus = (
  hass: HomeAssistant,
  entryId: string,
  cb: (msg: CoverStatusMessage) => void,
): Promise<Unsubscribe> =>
  hass.connection.subscribeMessage<CoverStatusMessage>(cb, { type: `${WS}/covers/subscribe`, entry_id: entryId });

/** A calibration step (``action`` + ``value``), a ``read``, or ``finished`` / ``abort``. */
export const coverAction = (hass: HomeAssistant, entryId: string, req: { action?: string; value?: number; read?: string }) =>
  hass.callWS<CoverActionResult>({ type: `${WS}/covers/action`, entry_id: entryId, ...req });

/** Records of a history event entity (lock, keypad), from the recorder. */
export async function fetchEventHistory(
  hass: HomeAssistant,
  entityId: string,
  days = 14,
): Promise<HistoryRecord[]> {
  const start = new Date(Date.now() - days * 86400000).toISOString();
  const res = await hass.callWS<Record<string, { s: string; a?: Record<string, any>; lu: number }[]>>({
    type: "history/history_during_period",
    start_time: start,
    entity_ids: [entityId],
    minimal_response: false,
    no_attributes: false,
    significant_changes_only: false,
  });
  const rows = res[entityId] || [];
  return rows
    .filter((r) => r.a?.event_type && r.s !== "unavailable" && r.s !== "unknown")
    .map((r) => ({
      time: r.a!.time || new Date(r.lu * 1000).toISOString(),
      type: r.a!.event_type,
      source: r.a!.source,
      credential: r.a!.credential,
      credential_id: r.a!.credential_id,
      credential_name: r.a!.credential_name,
      unknown_credential: r.a!.unknown_credential,
    }))
    .reverse();
}

/* ---------------- keypads */

export interface KeypadsMessage {
  keypads: KeypadPayload[];
  full?: boolean;
}

export const subscribeKeypads = (hass: HomeAssistant, cb: (msg: KeypadsMessage) => void) =>
  hass.connection.subscribeMessage<KeypadsMessage>(cb, { type: `${WS}/keypad/subscribe` });

export async function keypadOp<T = any>(
  hass: HomeAssistant,
  entryId: string,
  op: string,
  data: Record<string, unknown> = {},
): Promise<{ result: T; keypad?: KeypadPayload }> {
  return hass.callWS({ type: `${WS}/keypad/op`, entry_id: entryId, op, data });
}

/** Unsubscribe helper that tolerates a pending or failed subscription. */
export function unsubscribeLater(sub: Promise<Unsubscribe> | undefined): void {
  sub?.then((u) => u()).catch(() => undefined);
}
