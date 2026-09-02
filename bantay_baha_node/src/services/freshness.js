export function calculateFreshness(observedAt, fetchedAt, warningMinutes, criticalMinutes, now = new Date()) {
  const reference = observedAt ?? fetchedAt;
  if (!reference) return "unknown";
  const age = now.valueOf() - new Date(reference).valueOf();
  if (age >= criticalMinutes * 60_000) return "stale_critical";
  if (age >= warningMinutes * 60_000) return "stale_warning";
  return "fresh";
}
