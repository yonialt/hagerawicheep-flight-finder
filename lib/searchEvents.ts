/**
 * Tiny cross-component signal for "prefill the destination field".
 * PopularRoutes cards dispatch it; SearchBar listens. A window CustomEvent
 * keeps the two siblings decoupled without threading callbacks through Hero.
 *
 * Payload is the destination city name (e.g. "Dubai") — SearchBar stores
 * city names in the field and the server resolves them to IATA codes.
 */

export const SEED_DESTINATION_EVENT = "hopper:seed-destination";

export function seedDestination(city: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<string>(SEED_DESTINATION_EVENT, { detail: city })
  );
}

export function onSeedDestination(
  handler: (city: string) => void
): () => void {
  if (typeof window === "undefined") return () => {};
  const listener = (e: Event) => handler((e as CustomEvent<string>).detail);
  window.addEventListener(SEED_DESTINATION_EVENT, listener);
  return () => window.removeEventListener(SEED_DESTINATION_EVENT, listener);
}

/**
 * Cross-component signal to prefill BOTH endpoints of the search bar
 * (origin + destination), used by the Popular Flight List accordions.
 * Payload is { origin, destination } city names; the server resolves
 * them to IATA codes.
 */

export const SEED_ROUTE_EVENT = "hagerawi:seed-route";

export function seedRoute(origin: string, destination: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(SEED_ROUTE_EVENT, { detail: { origin, destination } })
  );
}

export function onSeedRoute(
  handler: (origin: string, destination: string) => void
): () => void {
  if (typeof window === "undefined") return () => {};
  const listener = (e: Event) => {
    const { origin, destination } = (e as CustomEvent<{ origin: string; destination: string }>).detail;
    handler(origin, destination);
  };
  window.addEventListener(SEED_ROUTE_EVENT, listener);
  return () => window.removeEventListener(SEED_ROUTE_EVENT, listener);
}
