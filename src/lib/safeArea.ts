// Fixed-position canvas game screens sit outside #root's safe-area padding
// (position:fixed measures from the viewport, not from a padded ancestor),
// so canvas-drawn HUD text needs the inset read in JS pixels to avoid
// landing under a notch / status bar / Dynamic Island.
export function getSafeAreaInsetPx(side: "top" | "bottom" | "left" | "right"): number {
  if (typeof window === "undefined") return 0;
  const probe = document.createElement("div");
  probe.style.position = "fixed";
  probe.style.top = "0";
  probe.style.left = "0";
  probe.style.height = `env(safe-area-inset-${side})`;
  probe.style.width = `env(safe-area-inset-${side})`;
  probe.style.visibility = "hidden";
  probe.style.pointerEvents = "none";
  document.body.appendChild(probe);
  const px = side === "top" || side === "bottom" ? probe.offsetHeight : probe.offsetWidth;
  document.body.removeChild(probe);
  return px;
}
