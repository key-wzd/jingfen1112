/** Missing measurements are not zero; unit conversion must be explicit. */
export { toMeasurement } from '../../shared/measurement.mjs';

export function displayValue(value: unknown): string {
  return value === null || value === undefined || value === ''
    ? '—'
    : String(value);
}

export interface DeviceIdentity {
  brand: string;
  model: string;
  id?: number;
}
export function deviceKey(device: DeviceIdentity): string {
  if (typeof device.id === 'number') return `record:${device.id}`;
  return JSON.stringify([device.brand.trim(), device.model.trim()]);
}

export function readSelection(
  value: unknown,
  legacy = false,
): DeviceIdentity[] {
  if (typeof value !== 'string') return [];
  try {
    let entries: unknown;
    if (legacy) {
      let decoded = value;
      try {
        decoded = decodeURIComponent(value);
      } catch {
        /* Keep an already decoded name with a literal %. */
      }
      entries = decoded.split(',').map((pair) => {
        const split = pair.indexOf('::');
        return { brand: pair.slice(0, split), model: pair.slice(split + 2) };
      });
    } else {
      entries = JSON.parse(value);
    }
    if (!Array.isArray(entries)) return [];
    const seen = new Set<string>();
    return entries
      .filter((item): item is DeviceIdentity => {
        if (
          !item ||
          typeof item.brand !== 'string' ||
          typeof item.model !== 'string' ||
          (item.id !== undefined &&
            (typeof item.id !== 'number' || !Number.isFinite(item.id))) ||
          !item.model.trim()
        )
          return false;
        const key = deviceKey(item);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 100);
  } catch {
    return [];
  }
}

export function loadSelection(category: string): DeviceIdentity[] {
  try {
    return readSelection(
      sessionStorage.getItem(`tc-lab-selection:${category}`),
    );
  } catch {
    return [];
  }
}

export function saveSelection(
  category: string,
  samples: DeviceIdentity[],
): void {
  try {
    sessionStorage.setItem(
      `tc-lab-selection:${category}`,
      JSON.stringify(
        samples.map(({ id, brand, model }) => ({ id, brand, model })),
      ),
    );
  } catch {
    /* Selection still works in memory when storage is unavailable. */
  }
}

export function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+@\t\r]/.test(text) || /^-(?!\d)/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
