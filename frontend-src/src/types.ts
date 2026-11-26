/** The part of Home Assistant's frontend `hass` object this panel uses. */

export interface HassEntityState {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  last_changed: string;
  last_updated: string;
}

export interface HassEntityRegistryEntry {
  entity_id: string;
  device_id?: string | null;
  platform: string;
  entity_category?: "config" | "diagnostic" | null;
  hidden?: boolean;
  translation_key?: string;
  name?: string | null;
}

export type Unsubscribe = () => void;

export interface HassConnection {
  subscribeMessage<T>(cb: (msg: T) => void, msg: Record<string, unknown>): Promise<Unsubscribe>;
}

export interface HomeAssistant {
  language: string;
  locale?: { language: string };
  states: Record<string, HassEntityState>;
  entities?: Record<string, HassEntityRegistryEntry>;
  connection: HassConnection;
  callWS<T>(msg: Record<string, unknown>): Promise<T>;
  callService(domain: string, service: string, data?: Record<string, unknown>): Promise<unknown>;
  formatEntityState?(stateObj: HassEntityState, state?: string): string;
  formatEntityAttributeValue?(stateObj: HassEntityState, attribute: string, value?: unknown): string;
}

export interface PanelRoute {
  prefix: string;
  path: string;
}

/* ------------------------------------------------------------ backend data */

export type DeviceKind = "lock" | "keypad" | "cover" | "light" | "switch" | "plug" | "appliance" | "sensor" | "other";

export interface DeviceFeatures {
  correction: boolean;
  device_calibration: boolean;
  lock_calibration: boolean;
  half_lock: boolean;
  auto_calibration: boolean;
  keypad: boolean;
  cover_calibration?: boolean;
  /** Night Latch setting of an EU lock when known (true / false); unknown: the wizard asks */
  night_latch?: boolean | null;
}

export interface SwitchbotDevice {
  entry_id: string;
  device_id: string | null;
  name: string;
  /** library model id (sbble Model value, e.g. "WoKeypadTouch"); the wizards key on it */
  model: string;
  /** product name as the app shows it ("Keypad Touch") */
  model_name?: string;
  address: string;
  available: boolean;
  kind: DeviceKind;
  features: DeviceFeatures;
}

export interface DevicesResult {
  devices: SwitchbotDevice[];
  offset_limits: Record<string, [number, number]>;
  demo?: boolean;
}

export type CorrectionKey = "temperature" | "humidity" | "co2";

export interface SensorValue {
  raw: number | null;
  offset: number;
  entity_id: string | null;
}

export interface DeviceCalibrationValue {
  temperature: number;
  humidity: number;
}

export interface SensorPayload {
  entry_id: string;
  name: string;
  model: string;
  available: boolean;
  values: Partial<Record<CorrectionKey, SensorValue>>;
  device_calibration: boolean;
  device_calibration_value: DeviceCalibrationValue | null;
}

export interface LockStatus {
  available?: boolean;
  lock_state: number | null;
  knob_angle?: number | null;
  door_open?: boolean | null;
  calibration?: boolean | null;
  auto_calibration_done?: boolean | null;
  half_lock_calibration_done?: boolean | null;
  half_lock_enabled?: boolean | null;
  battery?: number | null;
  /** Lock Ultra / Ultra Max: 0 main, 1 main low, 2 no main, 3 main and backup low, 4 no backup */
  battery_status?: number | null;
  lock_type?: number | null;
  /** 0 unknown, 1 normal, 2 night latch */
  latch_state?: number | null;
  magnetic_position_alarm?: boolean | null;
  rotation_direction?: number | null;
  /** Lock (gen 1) / Lock Lite: 0 not reported, 1 normal, 2 latch */
  latch_type?: number | null;
  /** Lock (gen 1): jammed, self-adjusting; Lock Lite: emergency power */
  self_adjusting?: boolean | null;
}

/** Live status of a cover in a calibration wizard (panel/covers.py). */
export interface CoverStatus {
  available?: boolean;
  new_auto?: boolean;
  steps?: string[];
  battery?: number | null;
  firmware?: number | null;
  calibration?: boolean | null;
  position?: number | null; // HA scale: 0 closed .. 100 open
  tilt?: number | null;
  motion?: "stopped" | "opening" | "closing" | null; // roller shade
  motion_status?: "stopped" | "opening" | "closing" | null; // curtains
  move_state?: "stopped" | "moving" | "stuck" | null; // blind tilt
  motor_stop_reason?: string | null;
  stuck?: boolean | null;
  mount_type?: "u_rail" | "i_rail" | "rod" | null;
  slat_direction?: "horizontal" | "vertical" | null;
  roll_direction?: "standard" | "reverse" | null;
  logo_outside?: boolean | null;
  solar_panel?: boolean | null;
  extended_battery_installed?: boolean | null;
  calibration_step?: number | null;
  calibration_next?: boolean | null;
  calibration_exited?: boolean | null;
  calibration_wrong_way?: boolean | null;
  magnet_detected?: boolean | null;
  calibration_distance?: { distance_cm: number; steps: number; route_too_short: boolean } | null;
  last_calibration_auto?: boolean | null;
  chain_length?: number | null;
}

export interface CoverActionResult {
  success: boolean;
  result?: any;
  status?: CoverStatus;
}

export interface ActionResult {
  success: boolean;
  status?: LockStatus;
}

export interface KeypadState {
  battery?: number;
  battery_charging?: boolean;
  firmware?: string | number;
  lockout?: boolean;
  passcode_locked_out?: boolean;
  nfc_locked_out?: boolean;
  fingerprint_locked_out?: boolean;
  tamper_alarm?: boolean;
  duress_alarm?: boolean;
  keypad_enabled?: boolean;
  tamper_alarm_enabled?: boolean;
  sound_enabled?: boolean;
  backlight_mode?: string;
  backlight_level?: number;
  lock_button_mode?: string;
  lock_button_time?: number;
  passcodes_count?: number;
  nfc_cards_count?: number;
  [key: string]: unknown;
}

export interface Credential {
  name: string;
  type: string;
  start?: string;
  end?: string;
  weekdays?: number[];
  begin_minute?: number;
  end_minute?: number;
}

export interface KeypadPayload {
  entry_id: string;
  name: string;
  model: string;
  available: boolean;
  state: KeypadState;
  passcodes: Record<string, Credential>;
  cards: Record<string, Credential>;
}

/** One record of a lock / keypad history event entity (from the recorder). */
export interface HistoryRecord {
  time: string;
  type: string;
  source?: string;
  credential?: string;
  credential_id?: number | null;
  credential_name?: string;
  unknown_credential?: boolean;
}
