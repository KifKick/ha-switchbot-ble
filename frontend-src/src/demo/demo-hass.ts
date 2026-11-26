/**
 * Demo mode: simulated locks, keypad, plug and sensors that live only in the
 * browser. Every SwitchBot websocket call, entity state and service of the
 * panel is answered here; real devices are not shown and nothing is sent to
 * any device.
 */

import { WS } from "../api";
import { COVER_DEVICES, coverAction, coverEvent, coverService, coverSubscribe, setupCoverDemo } from "./demo-covers";
import {
  LOCK_DEVICES,
  LOCK_SLUGS,
  demoKeypadUnlock,
  demoLockAction,
  demoLockEvent,
  demoLockService,
  demoLockSubscribe,
  setupLockDemo,
} from "./demo-locks";
import type {
  Credential,
  HassEntityRegistryEntry,
  HassEntityState,
  HomeAssistant,
  HistoryRecord,
  KeypadPayload,
  SensorPayload,
  SwitchbotDevice,
} from "../types";

const DAY = 86400000;
const iso = (ms: number) => new Date(ms).toISOString();
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((cb) => cb());

/** Called whenever demo entity states change (the panel then re-renders). */
export function onDemoChange(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/* ---------------- devices and entities */

const FEATURES = {
  correction: false,
  device_calibration: false,
  lock_calibration: false,
  half_lock: false,
  auto_calibration: true,
  keypad: false,
};

/** Product names as the backend sends them (``model_name``), by the demo devices' model. */
const PRODUCT_NAMES: Record<string, string> = {
  keypad: "Keypad", plug_mini_eu: "Plug Mini (EU)", garage_door_opener: "Garage Door Opener",
  bulb: "Color Bulb", strip_light_3: "Strip Light 3", bot: "Bot", relay_switch_1pm: "Relay Switch 1PM",
  evaporative_humidifier: "Evaporative Humidifier", circulator_fan: "Circulator Fan",
  standing_fan: "Standing Fan", circulator_fan_pro: "Circulator Fan Pro", air_purifier_us: "Air Purifier US",
  air_purifier_table_us: "Air Purifier Table US", k10_pro_vacuum: "K10+ Pro Vacuum",
  contact: "Contact Sensor", motion_sensor: "Motion Sensor", leak: "Water Leak Detector",
  presence_sensor: "Presence Sensor", smart_thermostat_radiator: "Smart Radiator Thermostat", hub2: "Hub 2",
  indoor_outdoor_thermo_hygrometer: "Indoor/Outdoor Thermo-Hygrometer", meter_pro_co2: "Meter Pro CO2",
  curtain_3: "Curtain 3", curtain_track_4: "Curtain Track 4", roller_shade: "Roller Shade", blind_tilt: "Blind Tilt",
};

const DEVICES: SwitchbotDevice[] = ([
  ...LOCK_DEVICES,
  {
    entry_id: "demo_keypad", device_id: "demo-keypad", name: "Keypad (demo)", model: "keypad",
    address: "DE:MO:00:00:00:03", available: true, kind: "keypad", features: { ...FEATURES, keypad: true },
  },
  {
    entry_id: "demo_plug", device_id: "demo-plug", name: "Plug Mini (demo)", model: "plug_mini_eu",
    address: "DE:MO:00:00:00:04", available: true, kind: "plug", features: FEATURES,
  },
  ...(
    [
      ["garage", "Garage Door Opener", "garage_door_opener", "switch"],
      ["bulb", "Color Bulb", "bulb", "light"],
      ["strip", "Strip Light 3", "strip_light_3", "light"],
      ["bot", "Bot", "bot", "switch"],
      ["relay", "Relay Switch 1PM", "relay_switch_1pm", "switch"],
      ["humidifier", "Evaporative Humidifier", "evaporative_humidifier", "appliance"],
      ["fan", "Battery Circulator Fan", "circulator_fan", "appliance"],
      ["standingfan", "Standing Circulator Fan", "standing_fan", "appliance"],
      ["fanpro", "Battery Circulator Fan 2 Pro", "circulator_fan_pro", "appliance"],
      ["purifier", "Air Purifier", "air_purifier_us", "appliance"],
      ["purifiertable", "Air Purifier Table", "air_purifier_table_us", "appliance"],
      ["vacuum", "K10+ Pro Vacuum", "k10_pro_vacuum", "appliance"],
      ["contact", "Contact Sensor", "contact", "sensor"],
      ["motion", "Motion Sensor", "motion_sensor", "sensor"],
      ["leak", "Water Leak Detector", "leak", "sensor"],
      ["presence", "Presence Sensor", "presence_sensor", "sensor"],
      ["trv", "Smart Radiator Thermostat", "smart_thermostat_radiator", "appliance"],
    ] as const
  ).map(
    ([id, name, model, kind], i): SwitchbotDevice => ({
      entry_id: `demo_${id}`, device_id: `demo-${id}`, name: `${name} (demo)`, model,
      address: `DE:MO:00:00:01:${String(i).padStart(2, "0")}`, available: true, kind, features: FEATURES,
    }),
  ),
  ...COVER_DEVICES,
  {
    entry_id: "demo_hub2", device_id: "demo-hub2", name: "Hub 2 (demo)", model: "hub2",
    address: "DE:MO:00:00:00:08", available: true, kind: "sensor", features: { ...FEATURES, correction: true },
  },
  {
    entry_id: "demo_thermo", device_id: "demo-thermo", name: "Thermo-Hygrometer (demo)",
    model: "indoor_outdoor_thermo_hygrometer", address: "DE:MO:00:00:00:05", available: true, kind: "sensor",
    features: { ...FEATURES, correction: true, device_calibration: true },
  },
  {
    entry_id: "demo_co2", device_id: "demo-co2", name: "Meter Pro CO2 (demo)", model: "meter_pro_co2",
    address: "DE:MO:00:00:00:06", available: true, kind: "sensor", features: { ...FEATURES, correction: true },
  },
] as SwitchbotDevice[]).map((d) => ({ ...d, model_name: d.model_name ?? PRODUCT_NAMES[d.model] }));

const OFFSET_LIMITS: Record<string, [number, number]> = { temperature: [-10, 10], humidity: [-20, 20], co2: [-500, 500] };

/** Language of the demo texts, set from hass when the wrapper is built. */
let pl = false;
type Text = string | [en: string, pl: string];
const tr = (t: Text) => (typeof t === "string" ? t : t[pl ? 1 : 0]);

interface DemoEntity {
  device: string;
  name: Text;
  category: "config" | "diagnostic" | null;
  state: string;
  attributes: Record<string, any>;
  labels?: Record<string, Text>;
}

const now = iso(Date.now());
const ENTITIES: Record<string, DemoEntity> = {};

function entity(id: string, device: string, name: Text, state: string, attributes: Record<string, any> = {},
  category: DemoEntity["category"] = null, labels?: Record<string, Text>) {
  ENTITIES[id] = { device, name, category, state, attributes, labels };
}

const VOLUME = { min: 0, max: 4, step: 1, mode: "slider" };
for (const [dev, slug, model] of LOCK_SLUGS) {
  entity(`lock.${slug}`, dev, "", "locked");
  entity(`sensor.${slug}_battery`, dev, ["Battery", "Bateria"], "87", { device_class: "battery", unit_of_measurement: "%" });
  if (model !== "Lock Lite") entity(`binary_sensor.${slug}_door`, dev, ["Door", "Drzwi"], "off", { device_class: "door" });
  // the first-generation locks have no settings, history or firmware entities (catalog/locks.py _basic)
  if (model === "WoLock" || model === "Lock Lite") continue;
  entity(`event.${slug}_history`, dev, ["History", "Historia"], now, { event_type: "locked", event_types: ["locked", "unlocked"] });
  entity(`switch.${slug}_led`, dev, ["LED", "Dioda LED"], "on", {}, "config");
  entity(`switch.${slug}_sound`, dev, ["Sound", "Dźwięk"], "on", {}, "config");
  entity(`switch.${slug}_auto_lock`, dev, ["Auto-lock", "Autozamykanie"], "on", {}, "config");
  entity(`number.${slug}_auto_lock_delay`, dev, ["Auto-lock delay", "Opóźnienie autozamykania"], "30",
    { min: 0, max: 3659, step: 1, mode: "box", unit_of_measurement: "s" }, "config");
  entity(`sensor.${slug}_firmware`, dev, "Firmware", "1.4", {}, "diagnostic");
}
entity("select.lock_ultra_demo_motor_speed", "demo-lock", ["Motor speed", "Prędkość silnika"], "standard",
  { options: ["standard", "gentle", "fast"] }, "config", { standard: ["Standard", "Standardowa"], gentle: ["Gentle", "Łagodna"], fast: ["Fast", "Szybka"] });
entity("number.lock_ultra_demo_beep_volume", "demo-lock", ["Beep volume", "Głośność sygnałów"], "2", VOLUME, "config");
entity("sensor.keypad_demo_battery", "demo-keypad", ["Battery", "Bateria"], "76", { device_class: "battery", unit_of_measurement: "%" });
entity("event.keypad_demo_keypad_history", "demo-keypad", ["History", "Historia"], now, { event_type: "unlocked", event_types: ["unlocked", "locked"] });
entity("switch.keypad_demo_keypad_enabled", "demo-keypad", ["Keypad enabled", "Klawiatura włączona"], "on", {}, "config");
entity("switch.keypad_demo_tamper_alarm_enabled", "demo-keypad", ["Tamper alarm", "Alarm sabotażu"], "on", {}, "config");
entity("switch.keypad_demo_sound_enabled", "demo-keypad", ["Sound", "Dźwięk"], "on", {}, "config");
entity("select.keypad_demo_backlight_mode", "demo-keypad", ["Backlight", "Podświetlenie"], "auto",
  { options: ["off", "auto", "on"] }, "config", { off: ["Off", "Wyłączone"], auto: ["Auto", "Automatyczne"], on: ["On", "Włączone"] });
entity("select.keypad_demo_lock_button_mode", "demo-keypad", ["Lock button", "Przycisk zamykania"], "timed",
  { options: ["off", "always", "timed"] }, "config", { off: ["Off", "Wyłączony"], always: ["Always", "Zawsze"], timed: ["Timed", "Czasowo"] });
entity("number.keypad_demo_lock_button_time", "demo-keypad", ["Lock button time", "Czas przycisku zamykania"], "30",
  { min: 1, max: 600, step: 1, mode: "box", unit_of_measurement: "s" }, "config");
entity("button.keypad_demo_sync_time", "demo-keypad", ["Set clock", "Ustaw zegar"], now, {}, "config");
entity("switch.plug_mini_demo", "demo-plug", "", "on");
entity("sensor.plug_mini_demo_power", "demo-plug", ["Power", "Moc"], "41.2", { device_class: "power", unit_of_measurement: "W" });
entity("sensor.plug_mini_demo_voltage", "demo-plug", ["Voltage", "Napięcie"], "231", { device_class: "voltage", unit_of_measurement: "V" });
entity("sensor.plug_mini_demo_current", "demo-plug", ["Current", "Prąd"], "0.2", { device_class: "current", unit_of_measurement: "A" });
entity("sensor.plug_mini_demo_energy", "demo-plug", ["Energy", "Energia"], "12.47",
  { device_class: "energy", unit_of_measurement: "kWh", state_class: "total_increasing" });
entity("switch.plug_mini_demo_led", "demo-plug", ["LED", "Dioda LED"], "on", {}, "config");
entity("select.plug_mini_demo_power_on_state", "demo-plug", ["Power-on state", "Stan po zaniku zasilania"], "last_state",
  { options: ["off", "on", "last_state"] }, "config", { off: ["Off", "Wyłączone"], on: ["On", "Włączone"], last_state: ["Last state", "Ostatni stan"] });

const BATTERY = { device_class: "battery", unit_of_measurement: "%" };
const PERCENT = { min: 0, max: 4, step: 1, mode: "slider" };
entity("number.lock_ultra_max_demo_voice_volume", "demo-ultramax", ["Voice volume", "Głośność głosu"], "3", PERCENT, "config");
entity("number.lock_ultra_max_demo_beep_volume", "demo-ultramax", ["Beep volume", "Głośność sygnałów"], "2", PERCENT, "config");
entity("select.lock_ultra_max_demo_voice_language", "demo-ultramax", ["Voice language", "Język komunikatów"], "english",
  { options: ["german", "english", "french", "italian"] }, "config",
  { german: ["German", "Niemiecki"], english: ["English", "Angielski"], french: ["French", "Francuski"], italian: ["Italian", "Włoski"] });
entity("select.lock_ultra_max_demo_weather", "demo-ultramax", ["Weather announcement", "Zapowiedź pogody"], "scheduled",
  { options: ["always", "scheduled", "off"] }, "config",
  { always: ["Always", "Zawsze"], scheduled: ["Scheduled", "W wybranych godzinach"], off: ["Off", "Wyłączona"] });

setupLockDemo({ setEntity: (id, st, attrs) => setEntity(id, st, attrs) });
setupCoverDemo({ entity, setEntity: (id, st, attrs) => setEntity(id, st, attrs), getEntity: (id) => ENTITIES[id] });
entity("cover.garage_demo", "demo-garage", "", "closed", { supported_features: 3, device_class: "garage" });
entity("light.bulb_demo", "demo-bulb", "", "on", { brightness: 180, color_mode: "rgb", supported_color_modes: ["rgb"] });
entity("light.strip_demo", "demo-strip", "", "off", { color_mode: "rgb", supported_color_modes: ["rgb"] });
entity("switch.bot_demo", "demo-bot", "", "off");
entity("sensor.bot_demo_battery", "demo-bot", ["Battery", "Bateria"], "95", BATTERY);
entity("switch.relay_demo", "demo-relay", "", "on");
entity("sensor.relay_demo_power", "demo-relay", ["Power", "Moc"], "1240", { device_class: "power", unit_of_measurement: "W" });
entity("sensor.relay_demo_voltage", "demo-relay", ["Voltage", "Napięcie"], "229", { device_class: "voltage", unit_of_measurement: "V" });
entity("sensor.relay_demo_current", "demo-relay", ["Current", "Prąd"], "5.4", { device_class: "current", unit_of_measurement: "A" });
entity("sensor.relay_demo_energy", "demo-relay", ["Energy", "Energia"], "87.1", { device_class: "energy", unit_of_measurement: "kWh" });
appliances();
entity("vacuum.vacuum_demo", "demo-vacuum", "", "docked", { battery_level: 100 });
entity("sensor.vacuum_demo_battery", "demo-vacuum", ["Battery", "Bateria"], "100", BATTERY);
entity("binary_sensor.contact_demo", "demo-contact", ["Door", "Drzwi"], "off", { device_class: "door" });
entity("binary_sensor.contact_demo_motion", "demo-contact", ["Motion", "Ruch"], "off", { device_class: "motion" });
entity("sensor.contact_demo_battery", "demo-contact", ["Battery", "Bateria"], "88", BATTERY);
entity("binary_sensor.motion_demo", "demo-motion", ["Motion", "Ruch"], "on", { device_class: "motion" });
entity("binary_sensor.motion_demo_light", "demo-motion", ["Light", "Światło"], "on", { device_class: "light" });
entity("sensor.motion_demo_battery", "demo-motion", ["Battery", "Bateria"], "67", BATTERY);
entity("binary_sensor.leak_demo", "demo-leak", ["Leak", "Wyciek"], "off", { device_class: "moisture" });
entity("sensor.leak_demo_battery", "demo-leak", ["Battery", "Bateria"], "90", BATTERY);
sensorsDemo();
entity("sensor.hub2_demo_temperature", "demo-hub2", ["Temperature", "Temperatura"], "21.9",
  { device_class: "temperature", unit_of_measurement: "°C" });
entity("sensor.hub2_demo_humidity", "demo-hub2", ["Humidity", "Wilgotność"], "44", { device_class: "humidity", unit_of_measurement: "%" });
entity("sensor.hub2_demo_light", "demo-hub2", ["Light level", "Poziom światła"], "12", {});

const TEMP = { device_class: "temperature", unit_of_measurement: "°C", state_class: "measurement" };
const HUM = { device_class: "humidity", unit_of_measurement: "%", state_class: "measurement" };
entity("sensor.thermo_demo_temperature", "demo-thermo", ["Temperature", "Temperatura"], "21.6", TEMP);
entity("sensor.thermo_demo_humidity", "demo-thermo", ["Humidity", "Wilgotność"], "47", HUM);
entity("sensor.thermo_demo_battery", "demo-thermo", ["Battery", "Bateria"], "64", { device_class: "battery", unit_of_measurement: "%" });
entity("sensor.co2_demo_temperature", "demo-co2", ["Temperature", "Temperatura"], "22.3", TEMP);
entity("sensor.co2_demo_humidity", "demo-co2", ["Humidity", "Wilgotność"], "41", HUM);
entity("sensor.co2_demo_co2", "demo-co2", "CO₂", "820", { device_class: "carbon_dioxide", unit_of_measurement: "ppm" });
entity("sensor.co2_demo_battery", "demo-co2", ["Battery", "Bateria"], "92", { device_class: "battery", unit_of_measurement: "%" });

/* ---------------- contact / motion / presence / leak extras and the TRV */

function sensorsDemo() {
  const PROBLEM = { device_class: "problem" };
  // motion sensor
  entity("sensor.motion_demo_distance", "demo-motion", ["Detection distance", "Zasięg wykrywania"], "medium",
    { device_class: "enum", options: ["long", "medium", "short"] }, "diagnostic",
    { long: ["Long (8 m)", "Daleki (8 m)"], medium: ["Medium (4 m)", "Średni (4 m)"], short: ["Short (2 m)", "Bliski (2 m)"] });
  entity("binary_sensor.motion_demo_led", "demo-motion", ["Indicator light", "Lampka wskaźnika"], "on", { device_class: "light" }, "diagnostic");
  // presence sensor
  const p = "demo-presence";
  entity("binary_sensor.presence_demo", p, ["Occupancy", "Obecność"], "on", { device_class: "occupancy" });
  entity("sensor.presence_demo_light", p, ["Light level", "Poziom światła"], "9", { state_class: "measurement" });
  entity("sensor.presence_demo_battery", p, ["Battery", "Bateria"], "81", BATTERY);
  entity("binary_sensor.presence_demo_adaptive", p, ["Auto-adjusted", "Autokalibracja wykonana"], "on", {}, "diagnostic");
  entity("binary_sensor.presence_demo_led", p, ["Indicator light", "Lampka wskaźnika"], "on", { device_class: "light" }, "diagnostic");
  // water leak detector
  const l = "demo-leak";
  entity("binary_sensor.leak_demo_alarm", l, ["Alarm", "Alarm"], "off", PROBLEM);
  entity("binary_sensor.leak_demo_buzzer", l, ["Buzzer", "Brzęczyk"], "off", { device_class: "sound" });
  entity("sensor.leak_demo_alarm_mode", l, ["Alarm mode", "Tryb alarmu"], "leak", { device_class: "enum", options: ["leak", "dry"] }, null,
    { leak: ["Leak alert", "Alarm zalania"], dry: ["Dry alert", "Alarm suchości"] });
  entity("sensor.leak_demo_volume", l, ["Alarm volume", "Głośność alarmu"], "low", { device_class: "enum", options: ["quiet", "low", "medium", "high"] },
    "diagnostic", { quiet: ["Quiet", "Cichy"], low: ["Low", "Niska"], medium: ["Medium", "Średnia"], high: ["High", "Wysoka"] });
  entity("sensor.leak_demo_duration", l, ["Alarm duration", "Czas trwania alarmu"], "60", { device_class: "duration", unit_of_measurement: "s" }, "diagnostic");
  entity("sensor.leak_demo_interval", l, ["Alarm interval", "Odstęp alarmów"], "5", { device_class: "duration", unit_of_measurement: "min" }, "diagnostic");
  entity("binary_sensor.leak_demo_wifi", l, ["Wi-Fi fault", "Błąd Wi-Fi"], "off", PROBLEM, "diagnostic");
  // radiator thermostat
  const t = "demo-trv";
  const C = { unit_of_measurement: "°C", mode: "box" };
  entity("climate.trv_demo", t, "", "heat", {
    hvac_modes: ["heat", "off"], hvac_action: "heating", current_temperature: 20.5, temperature: 22,
    min_temp: 10, max_temp: 25, target_temp_step: 0.5, preset_mode: "comfort",
    preset_modes: ["schedule", "manual", "off", "eco", "comfort", "boost"],
  });
  entity("binary_sensor.trv_demo_valve", t, ["Valve", "Zawór"], "on", { device_class: "opening" });
  entity("binary_sensor.trv_demo_window", t, ["Window open", "Okno otwarte"], "off", { device_class: "window" });
  entity("sensor.trv_demo_temperature", t, ["Temperature", "Temperatura"], "20.5", { device_class: "temperature", unit_of_measurement: "°C" });
  entity("sensor.trv_demo_battery", t, ["Battery", "Bateria"], "74", BATTERY);
  entity("binary_sensor.trv_demo_fault", t, ["Fault", "Usterka"], "off", PROBLEM, "diagnostic");
  entity("sensor.trv_demo_fast_heat_remaining", t, ["Fast heating remaining", "Pozostały czas szybkiego grzania"], "0",
    { device_class: "duration", unit_of_measurement: "min" }, "diagnostic");
  entity("switch.trv_demo_child_lock", t, ["Child lock", "Blokada rodzicielska"], "off", {}, "config");
  entity("switch.trv_demo_window_detection", t, ["Open window detection", "Wykrywanie otwartego okna"], "on", {}, "config");
  entity("switch.trv_demo_anti_frost", t, ["Anti-frost", "Ochrona przed zamarzaniem"], "on", {}, "config");
  entity("switch.trv_demo_descaling", t, ["Descaling", "Odkamienianie"], "on", {}, "config");
  entity("number.trv_demo_comfort", t, ["Comfort temperature", "Temperatura komfortowa"], "22", { ...C, min: 10, max: 25, step: 0.5 }, "config");
  entity("number.trv_demo_eco", t, ["Eco temperature", "Temperatura eko"], "17", { ...C, min: 10, max: 20, step: 0.5 }, "config");
  entity("number.trv_demo_manual", t, ["Manual temperature", "Temperatura ręczna"], "20", { ...C, min: 4, max: 35, step: 0.5 }, "config");
  entity("number.trv_demo_fast_heat", t, ["Fast heating duration", "Czas szybkiego grzania"], "30",
    { min: 1, max: 180, step: 1, mode: "box", unit_of_measurement: "min" }, "config");
  entity("number.trv_demo_response", t, ["Response time", "Czas reakcji"], "3",
    { min: 1, max: 5, step: 1, mode: "slider", unit_of_measurement: "min" }, "config");
  entity("number.trv_demo_calibration", t, ["Temperature calibration", "Kalibracja temperatury"], "0",
    { min: -10, max: 10, step: 1, mode: "slider", unit_of_measurement: "°C" }, "config");
}

/* ---------------- purifiers, fans, humidifier */

function appliances() {
  const ON_OFF: Record<string, Text> = { off: ["Off", "Wyłączona"], on: ["On", "Włączona"] };
  const PROBLEM = { device_class: "problem" };
  const MIN = { min: 0, max: 1440, step: 1, mode: "box", unit_of_measurement: "min" };
  const SECONDS = { device_class: "duration", unit_of_measurement: "s" };
  const HOURS = { device_class: "duration", unit_of_measurement: "h" };

  // Evaporative Humidifier
  const h = "demo-humidifier";
  entity("humidifier.humidifier_demo", h, "", "on",
    { humidity: 55, current_humidity: 46, min_humidity: 30, max_humidity: 80, mode: "auto" });
  entity("sensor.humidifier_demo_humidity", h, ["Humidity", "Wilgotność"], "46", { device_class: "humidity", unit_of_measurement: "%" });
  entity("sensor.humidifier_demo_temperature", h, ["Temperature", "Temperatura"], "21.5", { device_class: "temperature", unit_of_measurement: "°C" });
  entity("sensor.humidifier_demo_water", h, ["Water level", "Poziom wody"], "medium", {}, null,
    { empty: ["Empty", "Pusty"], low: ["Low", "Niski"], medium: ["Medium", "Średni"], high: ["High", "Wysoki"] });
  entity("binary_sensor.humidifier_demo_tank_removed", h, ["Water tank removed", "Zbiornik wody wyjęty"], "off", PROBLEM);
  entity("binary_sensor.humidifier_demo_tilted", h, ["Tilted", "Przechylenie"], "off", PROBLEM);
  entity("binary_sensor.humidifier_demo_filter_missing", h, ["Filter missing", "Brak filtra"], "off", PROBLEM);
  entity("binary_sensor.humidifier_demo_meter_online", h, ["Bound meter", "Powiązany termometr"], "on",
    { device_class: "connectivity" }, "diagnostic");
  entity("sensor.humidifier_demo_filter_clean", h, ["Time since filter cleaning", "Czas od czyszczenia filtra"], "148", HOURS, "diagnostic");
  entity("sensor.humidifier_demo_filter_replace", h, ["Time since filter replacement", "Czas od wymiany filtra"], "1730", HOURS, "diagnostic");
  entity("switch.humidifier_demo_child_lock", h, ["Child lock", "Blokada rodzicielska"], "off", {}, "config");
  entity("switch.humidifier_demo_protection", h, ["Over-humidify protection", "Ochrona przed przewilżeniem"], "on", {}, "config");
  entity("number.humidifier_demo_threshold", h, ["Over-humidify threshold", "Próg ochrony przed przewilżeniem"], "65",
    { min: 1, max: 99, step: 1, mode: "slider", unit_of_measurement: "%" }, "config");
  entity("switch.humidifier_demo_prompt_sound", h, ["Prompt sound", "Dźwięk powiadomień"], "on", {}, "config");
  entity("switch.humidifier_demo_alarm_sound", h, ["Alarm sound", "Dźwięk alarmu"], "on", {}, "config");
  entity("switch.humidifier_demo_dnd", h, ["Do not disturb", "Nie przeszkadzać"], "on", {}, "config");
  entity("time.humidifier_demo_dnd_start", h, ["Do not disturb start", "Nie przeszkadzać od"], "22:00:00", {}, "config");
  entity("time.humidifier_demo_dnd_end", h, ["Do not disturb end", "Nie przeszkadzać do"], "07:00:00", {}, "config");

  // fans
  const NIGHT = { options: ["off", "soft", "bright"] };
  const NIGHT_LABELS: Record<string, Text> = { off: ["Off", "Wyłączona"], soft: ["Soft", "Przyciemniona"], bright: ["Bright", "Jasna"] };
  const CHARGING = { device_class: "battery_charging" };
  const f = "demo-fan";
  entity("fan.fan_demo", f, "", "on", { percentage: 40, preset_mode: "natural", oscillating: true });
  entity("sensor.fan_demo_battery", f, ["Battery", "Bateria"], "100", BATTERY);
  entity("binary_sensor.fan_demo_charging", f, ["Charging", "Ładowanie"], "off", CHARGING, "diagnostic");
  entity("select.fan_demo_night_light", f, ["Night light", "Lampka nocna"], "off", NIGHT, "config", NIGHT_LABELS);

  const s = "demo-standingfan";
  entity("fan.standing_fan_demo", s, "", "off", { percentage: 30, preset_mode: "normal", oscillating: false });
  entity("sensor.standing_fan_demo_battery", s, ["Battery", "Bateria"], "64", BATTERY);
  entity("binary_sensor.standing_fan_demo_charging", s, ["Charging", "Ładowanie"], "on", CHARGING, "diagnostic");
  entity("switch.standing_fan_demo_horizontal", s, ["Horizontal oscillation", "Oscylacja pozioma"], "off");
  entity("switch.standing_fan_demo_vertical", s, ["Vertical oscillation", "Oscylacja pionowa"], "off");
  entity("select.standing_fan_demo_night_light", s, ["Night light", "Lampka nocna"], "soft", NIGHT, "config", NIGHT_LABELS);
  entity("number.standing_fan_demo_h_angle", s, ["Horizontal oscillation angle", "Kąt oscylacji poziomej"], "60",
    { min: 30, max: 90, step: 30, mode: "slider", unit_of_measurement: "°" }, "config");
  entity("switch.standing_fan_demo_child_lock", s, ["Child lock", "Blokada rodzicielska"], "off", {}, "config");
  entity("switch.standing_fan_demo_display", s, ["Display", "Wyświetlacz"], "on", {}, "config");
  entity("switch.standing_fan_demo_sound", s, ["Key tone", "Dźwięk przycisków"], "on", {}, "config");
  entity("switch.standing_fan_demo_recenter", s, ["Return to centre", "Powrót do środka"], "on", {}, "config");

  const p = "demo-fanpro";
  entity("fan.fan_pro_demo", p, "", "on", { percentage: 55, preset_mode: "hurricane", oscillating: true });
  entity("light.fan_pro_demo_night_light", p, ["Night light", "Lampka nocna"], "off", { color_mode: "onoff", supported_color_modes: ["onoff"] });
  entity("sensor.fan_pro_demo_battery", p, ["Battery", "Bateria"], "82", BATTERY);
  entity("binary_sensor.fan_pro_demo_charging", p, ["Charging", "Ładowanie"], "off", CHARGING, "diagnostic");
  entity("sensor.fan_pro_demo_h_swing", p, ["Horizontal swing angle", "Kąt obrotu w poziomie"], "90", { unit_of_measurement: "°" }, "diagnostic");
  entity("sensor.fan_pro_demo_v_swing", p, ["Vertical swing angle", "Kąt obrotu w pionie"], "60", { unit_of_measurement: "°" }, "diagnostic");
  entity("switch.fan_pro_demo_vertical", p, ["Vertical oscillation", "Oscylacja pionowa"], "on");
  entity("switch.fan_pro_demo_child_lock", p, ["Child lock", "Blokada rodzicielska"], "off", {}, "config");
  entity("switch.fan_pro_demo_beep", p, ["Beep", "Dźwięk"], "on", {}, "config");
  entity("switch.fan_pro_demo_indicator", p, ["Indicator light", "Lampka wskaźnika"], "on", {}, "config");
  entity("switch.fan_pro_demo_h_recenter", p, ["Horizontal return to centre on power-off", "Powrót do środka w poziomie po wyłączeniu"], "on", {}, "config");
  entity("switch.fan_pro_demo_v_recenter", p, ["Vertical return to centre on power-off", "Powrót do środka w pionie po wyłączeniu"], "off", {}, "config");

  // air purifiers
  for (const [dev, slug, table] of [["demo-purifier", "air_purifier_demo", false], ["demo-purifiertable", "air_purifier_table_demo", true]] as const) {
    entity(`fan.${slug}`, dev, "", table ? "off" : "on", { percentage: 50, preset_mode: "auto" });
    entity(`light.${slug}_light`, dev, ["Light", "Światło"], "on", { brightness: 128, color_mode: "rgb", supported_color_modes: ["rgb"] });
    entity(`sensor.${slug}_pm25`, dev, "PM2.5", table ? "4" : "12", { device_class: "pm25", unit_of_measurement: "µg/m³" });
    entity(`sensor.${slug}_air_quality`, dev, ["Air quality", "Jakość powietrza"], table ? "excellent" : "good", {}, null,
      { excellent: ["Excellent", "Doskonała"], good: ["Good", "Dobra"], moderate: ["Moderate", "Umiarkowana"], unhealthy: ["Poor", "Zła"] });
    entity(`binary_sensor.${slug}_filter_door`, dev, ["Filter door", "Klapka filtra"], "off", { device_class: "door" });
    entity(`binary_sensor.${slug}_voc_fault`, dev, ["VOC sensor fault", "Awaria czujnika VOC"], "off", PROBLEM, "diagnostic");
    entity(`binary_sensor.${slug}_pm25_fault`, dev, ["PM2.5 sensor fault", "Awaria czujnika PM2.5"], "off", PROBLEM, "diagnostic");
    entity(`binary_sensor.${slug}_fan_fault`, dev, ["Fan fault", "Awaria wentylatora"], "off", PROBLEM, "diagnostic");
    entity(`sensor.${slug}_filter`, dev, ["Filter usage", "Zużycie filtra"], "412", HOURS, "diagnostic");
    entity(`number.${slug}_off_timer`, dev, ["Off timer", "Wyłącznik czasowy"], table ? "0" : "45", MIN);
    entity(`sensor.${slug}_off_timer_remaining`, dev, ["Off timer remaining", "Pozostały czas do wyłączenia"], table ? "0" : "2700", SECONDS, "diagnostic");
    entity(`switch.${slug}_child_lock`, dev, ["Child lock", "Blokada rodzicielska"], "off", {}, "config");
    entity(`switch.${slug}_beep`, dev, ["Beep", "Dźwięk"], "on", {}, "config");
    entity(`select.${slug}_indicator`, dev, ["Indicator light", "Lampka wskaźnika"], "auto",
      { options: ["off", "on", "auto"] }, "config", { ...ON_OFF, auto: ["Auto (light sensor)", "Auto (czujnik światła)"] });
    entity(`button.${slug}_reset_filter`, dev, ["Reset filter", "Zresetuj filtr"], "unknown", {}, "config");
    if (table) entity(`switch.${slug}_wireless_charging`, dev, ["Wireless charging", "Ładowanie bezprzewodowe"], "on", {}, "config");
  }
}

function setEntity(id: string, state: string, attributes: Record<string, any> = {}) {
  const e = ENTITIES[id];
  if (!e) return;
  e.state = state;
  Object.assign(e.attributes, attributes);
  changed();
}

function toState(id: string, e: DemoEntity): HassEntityState {
  const device = DEVICES.find((d) => d.device_id === e.device)!.name;
  const name = tr(e.name);
  return {
    entity_id: id,
    state: e.state,
    attributes: { ...e.attributes, friendly_name: name ? `${device} ${name}` : device },
    last_changed: now,
    last_updated: now,
  };
}

/* ---------------- simulated sensors (correction tab) */

type SensorCb = (msg: { sensors: SensorPayload[]; full?: boolean }) => void;

const sensors: Record<string, SensorPayload> = {
  demo_thermo: {
    entry_id: "demo_thermo", name: "Thermo-Hygrometer (demo)", model: "indoor_outdoor_thermo_hygrometer", available: true,
    device_calibration: true,
    device_calibration_value: null,
    values: {
      temperature: { raw: 21.6, offset: 0, entity_id: "sensor.thermo_demo_temperature" },
      humidity: { raw: 47, offset: 0, entity_id: "sensor.thermo_demo_humidity" },
    },
  },
  demo_hub2: {
    entry_id: "demo_hub2", name: "Hub 2 (demo)", model: "hub2", available: true,
    device_calibration: false,
    device_calibration_value: null,
    values: {
      temperature: { raw: 21.9, offset: 0, entity_id: "sensor.hub2_demo_temperature" },
      humidity: { raw: 44, offset: 0, entity_id: "sensor.hub2_demo_humidity" },
    },
  },
  demo_co2: {
    entry_id: "demo_co2", name: "Meter Pro CO2 (demo)", model: "meter_pro_co2", available: true,
    device_calibration: false,
    device_calibration_value: null,
    values: {
      temperature: { raw: 22.3, offset: 0, entity_id: "sensor.co2_demo_temperature" },
      humidity: { raw: 41, offset: 0, entity_id: "sensor.co2_demo_humidity" },
      co2: { raw: 820, offset: 0, entity_id: "sensor.co2_demo_co2" },
    },
  },
};
/** correction stored "in" the demo thermo-hygrometer */
const devcal = { temperature: 0.3, humidity: 0 };
const sensorSubs = new Set<SensorCb>();
const pushSensor = (id: string) => sensorSubs.forEach((cb) => cb({ sensors: [structuredClone(sensors[id])] }));

/** Entity state = what HA would show: the reading plus the HA offset. */
function syncSensorEntities(id: string) {
  const s = sensors[id];
  for (const [key, v] of Object.entries(s.values)) {
    if (!v?.entity_id || v.raw === null) continue;
    const value = v.raw + v.offset;
    setEntity(v.entity_id, key === "temperature" ? value.toFixed(1) : String(Math.round(value)));
  }
}

function sensorOp(msg: Record<string, any>) {
  const s = sensors[msg.entry_id];
  if (!s) throw new Error("Device not found");
  if (msg.type === `${WS}/sensors/set_offset`) {
    const [lo, hi] = OFFSET_LIMITS[msg.key];
    const offset = Math.round(Math.max(lo, Math.min(hi, Number(msg.offset))) * 100) / 100;
    s.values[msg.key as "temperature"]!.offset = offset;
    syncSensorEntities(msg.entry_id);
    pushSensor(msg.entry_id);
    return { offset, sensor: structuredClone(s) };
  }
  // device_calibration: the sensor applies a new correction to what it advertises
  if (msg.action === "set" || msg.action === "reset") {
    for (const k of ["temperature", "humidity"] as const) {
      const next = msg.action === "reset" ? 0 : (msg[k] ?? devcal[k]);
      const v = s.values[k]!;
      v.raw = Math.round(((v.raw ?? 0) - devcal[k] + next) * 10) / 10;
      devcal[k] = next;
    }
    syncSensorEntities(msg.entry_id);
  }
  s.device_calibration_value = { ...devcal };
  pushSensor(msg.entry_id);
  return { calibration: { ...devcal }, sensor: structuredClone(s) };
}

/* ---------------- lock history (what the event entity would record) */

interface HistoryRow {
  time: string;
  type: string;
  source?: string;
  credential?: string;
  credential_id?: number;
}

const lockHistory: HistoryRow[] = [
  { time: iso(Date.now() - 2 * 3600e3), type: "unlocked", source: "keypad", credential: "passcode", credential_id: 3 },
  { time: iso(Date.now() - 3 * 3600e3), type: "locked", source: "auto_lock" },
  { time: iso(Date.now() - 26 * 3600e3), type: "door_left_open" },
  { time: iso(Date.now() - 27 * 3600e3), type: "unlocked", source: "manual" },
];

function lockEvent(type: string, extra: Partial<HistoryRow> = {}) {
  const row = { time: iso(Date.now()), type, ...extra };
  lockHistory.unshift(row);
  setEntity("event.lock_ultra_demo_history", row.time, { event_type: type, ...extra });
}

/* ---------------- simulated keypad */

const NO_END = "2100-01-01T00:00:00+00:00";
type KeypadCb = (msg: { keypads: KeypadPayload[]; full?: boolean }) => void;

const kp = {
  data: {
    entry_id: "demo_keypad", name: "Keypad (demo)", model: "keypad", available: true,
    state: {
      battery: 76, firmware: 1.2, lockout: false, passcode_locked_out: false, nfc_locked_out: false,
      tamper_alarm: false, duress_alarm: false, keypad_enabled: true, tamper_alarm_enabled: true,
      sound_enabled: true, backlight_mode: "auto", backlight_level: 1, lock_button_mode: "timed",
      lock_button_time: 30, passcodes_count: 2, nfc_cards_count: 1,
    },
    passcodes: {
      3: { name: "Family", type: "permanent", start: iso(Date.now() - 90 * DAY), end: NO_END },
      5: { name: "Cleaner", type: "periodic", weekdays: [1, 4], begin_minute: 540, end_minute: 720 },
    } as Record<string, Credential>,
    cards: { 1: { name: "Key fob", type: "permanent", start: iso(Date.now() - 30 * DAY), end: NO_END } } as Record<string, Credential>,
  } as KeypadPayload,
  log: [
    { time: iso(Date.now() - 2 * 3600e3), type: "unlocked", source: "passcode", credential_id: 3, credential_name: "Family" },
    { time: iso(Date.now() - 5 * 3600e3), type: "verification_failed", source: "passcode", credential_id: null, unknown_credential: true },
    { time: iso(Date.now() - 9 * 3600e3), type: "unlocked", source: "nfc", credential_id: 1, credential_name: "Key fob" },
    { time: iso(Date.now() - 20 * 3600e3), type: "locked", source: "lock_button" },
  ] as HistoryRecord[],
  subs: new Set<KeypadCb>(),
  nextIndex: 6,
  nfc: null as null | { polls: number; tapped?: boolean },
  push() {
    for (const cb of this.subs) cb({ keypads: [structuredClone(this.data)] });
  },
  record(type: string, source: string, extra: Partial<HistoryRecord> = {}) {
    const row = { time: iso(Date.now()), type, source, ...extra };
    this.log.unshift(row);
    setEntity("event.keypad_demo_keypad_history", row.time, { event_type: type, ...row });
  },
  credential(d: Record<string, any>): Credential {
    return {
      name: d.name || "",
      type: d.type,
      start: d.start ? iso(new Date(d.start).getTime()) : iso(Date.now()),
      end: d.end ? iso(new Date(d.end).getTime()) : NO_END,
    };
  },
  op(op: string, d: Record<string, any>): unknown {
    const s = this.data.state;
    switch (op) {
      case "refresh":
        return { passcodes: s.passcodes_count, nfc_cards: s.nfc_cards_count };
      case "action":
        if (d.action === "cancel_passcode_lockout") s.passcode_locked_out = false;
        if (d.action === "cancel_nfc_lockout") s.nfc_locked_out = false;
        if (d.action === "clear_tamper_alarm") s.tamper_alarm = false;
        if (d.action === "cancel_duress_alarm") s.duress_alarm = false;
        s.lockout = !!(s.passcode_locked_out || s.nfc_locked_out);
        return null;
      case "add_passcode": {
        if (!/^\d{6,12}$/.test(String(d.code))) throw new Error("ValueError: passcode must be 6-12 digits");
        if (["time_limited", "one_time"].includes(d.type) && !d.end) throw new Error("ValueError: this passcode type needs an end time");
        if (d.type === "periodic" && !(d.weekdays || []).length) throw new Error("ValueError: select at least one weekday");
        const index = this.nextIndex++;
        this.data.passcodes[index] = {
          ...this.credential(d),
          ...(d.type === "periodic" ? { weekdays: d.weekdays, begin_minute: d.begin_minute, end_minute: d.end_minute } : {}),
        };
        s.passcodes_count = (s.passcodes_count ?? 0) + 1;
        return { index };
      }
      case "delete_passcode":
        delete this.data.passcodes[d.index];
        s.passcodes_count = Math.max(0, (s.passcodes_count ?? 1) - 1);
        return null;
      case "rename": {
        const list = this.data[d.kind as "passcodes" | "cards"];
        (list[d.index] ??= { name: "", type: "unknown" }).name = d.name;
        return null;
      }
      case "nfc_start":
        this.nfc = { polls: 0 };
        return { index: Math.max(1, ...Object.keys(this.data.cards).map(Number)) + 1 };
      case "nfc_status":
        // the card "arrives" after ~3 s, or right after the demo button is used
        if (this.nfc) this.nfc.polls++;
        return { status: !this.nfc ? "idle" : this.nfc.tapped || this.nfc.polls >= 4 ? "success" : "idle" };
      case "nfc_finish":
        this.data.cards[d.index] = this.credential(d);
        s.nfc_cards_count = (s.nfc_cards_count ?? 0) + 1;
        this.nfc = null;
        return { index: d.index };
      case "nfc_delete":
        delete this.data.cards[d.index];
        s.nfc_cards_count = Math.max(0, (s.nfc_cards_count ?? 1) - 1);
        return null;
      default:
        throw new Error(`demo: unknown op ${op}`);
    }
  },
};

/* ---------------- demo bar buttons */

export type DemoEvent = "code" | "card" | "wrong" | "tamper";

export const DEMO_EVENTS: Record<DemoEvent, () => void> = {
  code: () => {
    const [idx, item] = Object.entries(kp.data.passcodes)[0] || [];
    kp.record("unlocked", "passcode", { credential_id: idx ? Number(idx) : null, credential_name: item?.name });
    demoKeypadUnlock();
    lockEvent("unlocked", { source: "keypad", credential: "passcode", credential_id: idx ? Number(idx) : undefined });
    kp.push();
  },
  card: () => {
    if (kp.nfc) {
      kp.nfc.tapped = true;
      return;
    }
    const [idx, item] = Object.entries(kp.data.cards)[0] || [];
    kp.record("unlocked", "nfc", { credential_id: idx ? Number(idx) : null, credential_name: item?.name });
    kp.push();
  },
  wrong: () => {
    for (let i = 0; i < 3; i++) kp.record("verification_failed", "passcode", { credential_id: null, unknown_credential: true });
    kp.record("locked_out", "alarm");
    Object.assign(kp.data.state, { lockout: true, passcode_locked_out: true });
    kp.push();
  },
  tamper: () => {
    kp.record("tamper", "alarm");
    kp.data.state.tamper_alarm = true;
    kp.push();
  },
};

/* ---------------- hass wrapper */

const isDemoEntry = (id: unknown) => typeof id === "string" && id.startsWith("demo_");

const coverTimers: Record<string, number> = {};

/** Cover moves 10 % every 300 ms; stop freezes it where it is. */
function moveCover(id: string, service: string) {
  const e = ENTITIES[id];
  clearInterval(coverTimers[id]);
  if (service.startsWith("stop")) {
    const value = e.attributes.current_position ?? e.attributes.current_tilt_position;
    setEntity(id, value === 0 ? "closed" : "open");
    return;
  }
  const opening = service.startsWith("open");
  const key = "current_position" in e.attributes ? "current_position" : "current_tilt_position" in e.attributes ? "current_tilt_position" : null;
  if (!key) {
    // garage door: no position, just opening / closing for 3 s
    setEntity(id, opening ? "opening" : "closing");
    coverTimers[id] = window.setTimeout(() => setEntity(id, opening ? "open" : "closed"), 3000);
    return;
  }
  setEntity(id, opening ? "opening" : "closing");
  coverTimers[id] = window.setInterval(() => {
    const next = Math.max(0, Math.min(100, e.attributes[key] + (opening ? 10 : -10)));
    if (next === 0 || next === 100) {
      clearInterval(coverTimers[id]);
      setEntity(id, next === 0 ? "closed" : "open", { [key]: next });
    } else setEntity(id, opening ? "opening" : "closing", { [key]: next });
  }, 300);
}

function demoService(domain: string, service: string, data: Record<string, any>) {
  const id = data.entity_id as string;
  const e = ENTITIES[id];
  if (!e) return false;
  if ((domain === "cover" || domain === "button") && coverService(domain, service, data)) return true;
  if (domain === "switch") setEntity(id, service === "turn_on" ? "on" : "off");
  else if (domain === "select") setEntity(id, data.option);
  else if (domain === "number") {
    setEntity(id, String(data.value));
    // purifier off-timer: the remaining-time sensor follows
    const remaining = id.replace(/^number\.(.*)_off_timer$/, "sensor.$1_off_timer_remaining");
    if (remaining !== id) setEntity(remaining, String(Number(data.value) * 60));
  } else if (domain === "time") setEntity(id, data.time);
  else if (domain === "button") setEntity(id, iso(Date.now()));
  else if (["light", "fan", "humidifier"].includes(domain)) setEntity(id, service === "turn_on" ? "on" : "off");
  else if (domain === "cover") moveCover(id, service);
  else if (domain === "climate") {
    if (service === "set_temperature") {
      setEntity(id, e.state, { temperature: data.temperature });
      // the valve follows: open while the room is colder than the target
      setEntity("binary_sensor.trv_demo_valve", data.temperature > e.attributes.current_temperature ? "on" : "off");
      setEntity(id, e.state, { hvac_action: data.temperature > e.attributes.current_temperature ? "heating" : "idle" });
    } else if (service === "set_hvac_mode") setEntity(id, data.hvac_mode, { hvac_action: data.hvac_mode === "off" ? "off" : "heating" });
  }
  else if (domain === "vacuum") {
    if (service === "start") setEntity(id, "cleaning");
    else {
      setEntity(id, "returning");
      setTimeout(() => setEntity(id, "docked"), 3000);
    }
  } else if (domain === "lock" && demoLockService(id, service)) {
    if (id === "lock.lock_ultra_demo") lockEvent(service === "lock" ? "locked" : "unlocked", { source: "app" });
  } else if (domain === "lock") setEntity(id, service === "lock" ? "locked" : "unlocked");
  return true;
}

export function demoHass(real: HomeAssistant): HomeAssistant {
  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const callWS = async (msg: Record<string, any>): Promise<any> => {
    switch (msg.type) {
      case `${WS}/panel/devices`:
        return { devices: DEVICES, offset_limits: OFFSET_LIMITS, demo: true };
      case `${WS}/sensors/set_offset`:
      case `${WS}/sensors/device_calibration`:
        await delay(msg.type === `${WS}/sensors/set_offset` ? 150 : 700);
        return sensorOp(msg);
      case `${WS}/covers/action`:
        await delay(200);
        return coverAction(msg);
      case `${WS}/calibration/action`:
        await delay(250);
        return demoLockAction(msg as any);
      case `${WS}/keypad/op`: {
        await delay(msg.op === "nfc_status" || msg.op === "rename" ? 50 : 450);
        const result = kp.op(msg.op, msg.data || {});
        setTimeout(() => kp.push(), 0);
        return { result, keypad: structuredClone(kp.data) };
      }
      case "history/history_during_period": {
        const ids: string[] = msg.entity_ids || [];
        if (!ids.every((id) => id in ENTITIES)) return {};
        const rows = /^event\.lock_.*_history$/.test(ids[0]) ? lockHistory : ids[0] === "event.keypad_demo_keypad_history" ? kp.log : [];
        return {
          [ids[0]]: [...rows].reverse().map((r) => ({
            s: r.time,
            lu: new Date(r.time).getTime() / 1000,
            a: { event_type: r.type, ...r },
          })),
        };
      }
      default:
        // nothing of the integration reaches the real Home Assistant in demo mode
        if (isDemoEntry(msg.entry_id) || String(msg.type).startsWith(`${WS}/`)) {
          throw new Error("Not available in demo mode");
        }
        return real.callWS(msg);
    }
  };

  const subscribeMessage = async (cb: (msg: any) => void, msg: Record<string, any>) => {
    if (msg.type === `${WS}/sensors/subscribe`) {
      sensorSubs.add(cb);
      setTimeout(() => cb({ sensors: Object.values(sensors).map((x) => structuredClone(x)), full: true }), 10);
      return () => {
        sensorSubs.delete(cb);
      };
    }
    if (msg.type === `${WS}/calibration/subscribe`) {
      const unsub = demoLockSubscribe(msg.entry_id, cb);
      if (unsub) return unsub;
    }
    if (msg.type === `${WS}/covers/subscribe`) {
      const unsub = coverSubscribe(msg.entry_id, cb);
      if (unsub) return unsub;
    }
    if (msg.type === `${WS}/keypad/subscribe`) {
      kp.subs.add(cb);
      setTimeout(() => cb({ keypads: [structuredClone(kp.data)], full: true }), 10);
      return () => {
        kp.subs.delete(cb);
      };
    }
    if (String(msg.type).startsWith(`${WS}/`)) throw new Error("Not available in demo mode");
    return real.connection.subscribeMessage(cb, msg);
  };

  pl = (real.locale?.language || real.language || "en").startsWith("pl");
  // the panel only looks at SwitchBot entities: in demo mode those are the demo ones
  const entities: Record<string, HassEntityRegistryEntry> = Object.fromEntries(
    Object.entries(real.entities ?? {}).filter(([, e]) => e.platform !== WS),
  );
  const states: Record<string, HassEntityState> = { ...real.states };
  for (const [id, e] of Object.entries(ENTITIES)) {
    states[id] = toState(id, e);
    entities[id] = { entity_id: id, device_id: e.device, platform: WS, entity_category: e.category };
  }

  const formatEntityState = (stateObj: HassEntityState, state?: string): string => {
    const e = ENTITIES[stateObj.entity_id];
    if (!e) return real.formatEntityState ? real.formatEntityState(stateObj, state) : (state ?? stateObj.state);
    const value = state ?? stateObj.state;
    if (e.labels?.[value]) return tr(e.labels[value]);
    try {
      if (real.formatEntityState) return real.formatEntityState(stateObj, state);
    } catch {
      /* demo entity unknown to HA's formatters */
    }
    if (stateObj.attributes.device_class === "timestamp" && !Number.isNaN(Date.parse(value))) {
      return new Date(value).toLocaleString(pl ? "pl-PL" : "en-GB", { dateStyle: "medium", timeStyle: "short" });
    }
    const unit = stateObj.attributes.unit_of_measurement;
    return unit ? `${value} ${unit}` : value;
  };

  const connection = new Proxy(real.connection, {
    get(c, p) {
      if (p === "subscribeMessage") return subscribeMessage;
      const v = (c as any)[p];
      return typeof v === "function" ? v.bind(c) : v;
    },
  });

  return new Proxy(real, {
    get(target, prop) {
      switch (prop) {
        case "callWS":
          return callWS;
        case "connection":
          return connection;
        case "states":
          return states;
        case "entities":
          return entities;
        case "formatEntityState":
          return formatEntityState;
        case "sbDemo":
          return true;
        case "sbDemoEvent":
          return coverEvent;
        case "sbDemoLockEvent":
          return demoLockEvent;
        case "callService":
          return async (domain: string, service: string, data: Record<string, any> = {}) => {
            if (demoService(domain, service, data)) {
              await delay(300);
              return;
            }
            return target.callService(domain, service, data);
          };
        default: {
          const v = (target as any)[prop];
          return typeof v === "function" ? v.bind(target) : v;
        }
      }
    },
  });
}
