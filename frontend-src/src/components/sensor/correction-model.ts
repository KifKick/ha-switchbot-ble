/**
 * Pure logic of one correction row.
 *
 * A row edits either the HA offset or, for sensors that store their own
 * compensation, the correction kept in the sensor. In the second mode the
 * advertised value already contains the stored correction, so the shown
 * "sensor" value is the uncorrected measurement (advertised - stored).
 */

import type { CorrectionKey, SensorPayload } from "../../types";

export const KEYS: Record<CorrectionKey, { unit: string; step: number; decimals: number }> = {
  temperature: { unit: "°C", step: 0.1, decimals: 1 },
  humidity: { unit: "%", step: 0.1, decimals: 1 },
  co2: { unit: "ppm", step: 10, decimals: 0 },
};

export interface RowModel {
  onDevice: boolean;
  step: number;
  /** decimals of measured values */
  dec: number;
  /** decimals of the offset */
  offDec: number;
  /** uncorrected value */
  base: number | null;
  stored: number | null;
  value: number | null;
  ready: boolean;
  dirty: boolean;
  corrected: number | null;
}

export function rowModel(s: SensorPayload, key: CorrectionKey, draft: string | undefined): RowModel {
  const v = s.values[key]!;
  const cfg = KEYS[key];
  const onDevice = s.device_calibration && (key === "temperature" || key === "humidity");
  const finish = (m: Omit<RowModel, "corrected">): RowModel => ({
    ...m,
    corrected:
      typeof m.base === "number" && m.value !== null && !Number.isNaN(m.value) ? m.base + m.value : null,
  });
  if (!onDevice) {
    const stored = v.offset;
    const value = draft !== undefined ? Number(draft) : stored;
    return finish({
      onDevice,
      step: cfg.step,
      dec: cfg.decimals,
      offDec: cfg.decimals === 0 ? 0 : 1,
      base: v.raw,
      stored,
      value,
      ready: true,
      dirty: draft !== undefined && Number(draft) !== stored,
    });
  }
  const step = key === "humidity" ? 1 : 0.1;
  const offDec = key === "humidity" ? 0 : 1;
  const cal = s.device_calibration_value;
  if (!cal) {
    return finish({ onDevice, step, dec: cfg.decimals, offDec, base: null, stored: null, value: null, ready: false, dirty: false });
  }
  const round = (x: number) => Math.round(x / step) * step;
  const stored = cal[key as "temperature" | "humidity"];
  const value = draft !== undefined ? round(Number(draft)) : stored;
  const base = typeof v.raw === "number" ? v.raw - stored : null;
  return finish({
    onDevice,
    step,
    dec: cfg.decimals,
    offDec,
    base,
    stored,
    value,
    ready: true,
    dirty: Math.abs(value - stored) > 1e-9,
  });
}

export const clamp = (x: number, [lo, hi]: [number, number]) => Math.max(lo, Math.min(hi, x));
export const round2 = (x: number) => Math.round(x * 100) / 100;
