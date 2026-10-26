export function toMeasurement(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || !value.trim()) return null;
  const text = value.trim();
  if (
    !/^[+-]?(?:\d{1,3}(?:,\d{3})+|\d+|\d*\.\d+)(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(
      text,
    )
  )
    return null;
  const number = Number(text.replaceAll(',', ''));
  return Number.isFinite(number) ? number : null;
}
