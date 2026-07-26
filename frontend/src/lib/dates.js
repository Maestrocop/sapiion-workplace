const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// dd/Mon/yyyy — never numeric-only or US format
export function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d)) return String(value);
  const dd = String(d.getDate()).padStart(2, '0');
  return `${dd}/${MONTHS[d.getMonth()]}/${d.getFullYear()}`;
}

// 24h HH:MM — never AM/PM
export function formatTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d)) return '';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}
