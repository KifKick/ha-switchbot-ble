/** Helpers that tie a SwitchBot device to its Home Assistant entities. */

import {
  mdiAirPurifier,
  mdiBlindsHorizontal,
  mdiBluetooth,
  mdiCurtains,
  mdiDialpad,
  mdiDoorOpen,
  mdiFan,
  mdiGarage,
  mdiGauge,
  mdiLedStrip,
  mdiLightbulbOutline,
  mdiLock,
  mdiMotionSensor,
  mdiPowerSocketEu,
  mdiRadiator,
  mdiRobot,
  mdiRobotVacuum,
  mdiRollerShade,
  mdiThermometer,
  mdiToggleSwitchOutline,
  mdiWaterAlert,
  mdiWaterPercent,
} from "@mdi/js";
import type { DeviceKind, HassEntityState, HomeAssistant, SwitchbotDevice } from "./types";

export const KIND_ORDER: DeviceKind[] = [
  "lock",
  "keypad",
  "cover",
  "light",
  "switch",
  "plug",
  "appliance",
  "sensor",
  "other",
];

export const KIND_ICONS: Record<DeviceKind, string> = {
  lock: mdiLock,
  keypad: mdiDialpad,
  cover: mdiCurtains,
  light: mdiLightbulbOutline,
  switch: mdiToggleSwitchOutline,
  plug: mdiPowerSocketEu,
  appliance: mdiFan,
  sensor: mdiThermometer,
  other: mdiBluetooth,
};

/** Model-specific icons; the kind's icon otherwise. */
const MODEL_ICONS: [RegExp, string][] = [
  [/co2/, mdiGauge],
  [/contact/, mdiDoorOpen],
  [/motion|presence/, mdiMotionSensor],
  [/leak/, mdiWaterAlert],
  [/garage/, mdiGarage],
  [/strip|rope|bar/, mdiLedStrip],
  [/^bot$/, mdiRobot],
  [/air_purifier/, mdiAirPurifier],
  [/thermostat_radiator/, mdiRadiator],
  [/roller_shade/, mdiRollerShade],
  [/blind_tilt/, mdiBlindsHorizontal],
];

export function deviceIcon(device: SwitchbotDevice): string {
  const match = MODEL_ICONS.find(([re]) => re.test(device.model));
  if (match) return match[1];
  if (device.kind === "appliance" && device.model.includes("vacuum")) return mdiRobotVacuum;
  if (device.kind === "appliance" && device.model.includes("humidifier")) return mdiWaterPercent;
  return KIND_ICONS[device.kind];
}

const ACRONYMS = new Set(["eu", "us", "led", "rgb", "rgbic", "rgbicww", "co2", "1pm", "2pm"]);

/** "relay_switch_1pm" -> "Relay Switch 1PM", "hub2" -> "Hub 2", "k10_pro_vacuum" -> "K10 Pro Vacuum". */
export function modelName(model: string): string {
  return model
    .split("_")
    .map((w) => {
      if (ACRONYMS.has(w)) return w.toUpperCase();
      if (/^[a-z]\d+$/.test(w)) return w.toUpperCase(); // k10, s20
      const m = /^([a-z]+)(\d+)$/.exec(w); // hub2, hub3
      if (m) return `${m[1][0].toUpperCase()}${m[1].slice(1)} ${m[2]}`;
      return w[0].toUpperCase() + w.slice(1);
    })
    .join(" ");
}

export interface DeviceEntity {
  entity_id: string;
  domain: string;
  category: "config" | "diagnostic" | null;
  translation_key?: string;
  state?: HassEntityState;
}

/** The device's entities from the entity registry, in a stable order. */
export function deviceEntities(hass: HomeAssistant, device: SwitchbotDevice): DeviceEntity[] {
  if (!device.device_id || !hass.entities) return [];
  return Object.values(hass.entities)
    .filter((e) => e.device_id === device.device_id && !e.hidden)
    .map((e) => ({
      entity_id: e.entity_id,
      domain: e.entity_id.split(".")[0],
      category: e.entity_category ?? null,
      translation_key: e.translation_key,
      state: hass.states[e.entity_id],
    }))
    .sort((a, b) => a.entity_id.localeCompare(b.entity_id));
}

export function findEntity(
  hass: HomeAssistant,
  device: SwitchbotDevice,
  match: (e: DeviceEntity) => boolean,
): DeviceEntity | undefined {
  return deviceEntities(hass, device).find(match);
}

/** Entity name without the device name in front, like HA's device page. */
export function entityName(device: SwitchbotDevice, entity: DeviceEntity): string {
  const friendly: string = entity.state?.attributes.friendly_name ?? entity.entity_id;
  const prefix = device.name + " ";
  const stripped = friendly.startsWith(prefix) ? friendly.slice(prefix.length) : friendly;
  return stripped ? stripped[0].toUpperCase() + stripped.slice(1) : friendly;
}

export function formatState(hass: HomeAssistant, stateObj?: HassEntityState): string {
  if (!stateObj) return "—";
  if (hass.formatEntityState) return hass.formatEntityState(stateObj);
  const unit = stateObj.attributes.unit_of_measurement;
  return unit ? `${stateObj.state} ${unit}` : stateObj.state;
}

/** Battery percentage from the device's battery sensor, if it has one. */
export function batteryLevel(hass: HomeAssistant, device: SwitchbotDevice): number | null {
  const entity = findEntity(
    hass,
    device,
    (e) => e.domain === "sensor" && e.state?.attributes.device_class === "battery",
  );
  const value = Number(entity?.state?.state);
  return entity && Number.isFinite(value) ? value : null;
}

/** Short live summary for the device list, from the primary entity's state. */
export function primaryState(hass: HomeAssistant, device: SwitchbotDevice): string {
  const domains: Record<DeviceKind, string[]> = {
    lock: ["lock"],
    keypad: [],
    cover: ["cover"],
    light: ["light"],
    switch: ["switch", "cover"], // cover: the garage door opener
    plug: ["switch"],
    appliance: ["humidifier", "fan", "vacuum", "climate"],
    sensor: ["sensor", "binary_sensor"],
    other: [],
  };
  const wanted = domains[device.kind];
  // sensors: the temperature, else the first binary sensor (contact, motion, leak)
  const entity =
    findEntity(
      hass,
      device,
      (e) =>
        wanted.includes(e.domain) &&
        e.category === null &&
        (device.kind !== "sensor" || e.state?.attributes.device_class === "temperature"),
    ) ??
    (device.kind === "sensor"
      ? findEntity(hass, device, (e) => e.domain === "binary_sensor" && e.category === null)
      : undefined);
  return entity?.state ? formatState(hass, entity.state) : "";
}
