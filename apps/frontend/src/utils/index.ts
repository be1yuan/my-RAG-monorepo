/**
 * 把 ISO 时间字符串(或 Date)格式化为本地时间字符串
 * - undefined / null / 空串 → "—"
 * - 非法格式 → "—"
 * - 正常 → 本地化时间字符串(形如 2026/6/25 20:30:00)
 */
export function fmtDate(s: string | Date | null | undefined): string {
  if (!s) return "—"
  const d = s instanceof Date ? s : new Date(s)
  if (isNaN(d.getTime())) return "—"
  return d.toLocaleString()
}
