export function isNiranStorytimeEnabled(
  value = import.meta.env.VITE_NIRAN_STORYTIME_ENABLED
) {
  return value === 'true';
}
