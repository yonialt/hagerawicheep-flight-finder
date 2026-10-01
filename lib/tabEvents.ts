/**
 * Tiny cross-component signal for "the user switched the navbar tab".
 * Header dispatches it; HomeSections listens and swaps the content below
 * the hero (Popular Flight List vs Hotel Listings). A window CustomEvent
 * keeps Header and the page sections decoupled, same as searchEvents.ts.
 */

export type HomeTab = "stays" | "flights";

export const TAB_CHANGE_EVENT = "hagerawi:tab-change";

export function setTab(tab: HomeTab): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<HomeTab>(TAB_CHANGE_EVENT, { detail: tab }));
}

export function onTabChange(handler: (tab: HomeTab) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const listener = (e: Event) => handler((e as CustomEvent<HomeTab>).detail);
  window.addEventListener(TAB_CHANGE_EVENT, listener);
  return () => window.removeEventListener(TAB_CHANGE_EVENT, listener);
}
