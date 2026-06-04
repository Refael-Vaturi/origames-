// Detects if the app is running inside a native WebView (Android/iOS wrapper).
// Important: Google OAuth refuses to load inside a plain Android WebView
// (error: "disallowed_useragent"). When detected we use Capacitor Browser
// (Chrome Custom Tabs / SFSafariViewController) which Google accepts.

import { Browser } from "@capacitor/browser";

export const isAndroidWebView = (): boolean => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  // Standard Android WebView signature: "; wv)" appears in the UA string.
  // Also catch our custom wrapper if it sets "OriGamesApp" token.
  return /; wv\)/.test(ua) || /OriGamesApp/i.test(ua);
};

export const isIosWebView = (): boolean => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isIos = /iPhone|iPad|iPod/.test(ua);
  // Safari sets "Safari/" — its absence on iOS means we're in a WKWebView.
  return isIos && !/Safari\//.test(ua);
};

export const isInWebView = (): boolean => isAndroidWebView() || isIosWebView();

/**
 * Open OAuth in a way that works in WebViews.
 * - When Capacitor Browser is available (native app): opens Chrome Custom Tabs
 *   or SFSafariViewController — Google accepts these.
 * - In a plain browser: uses location.assign (in-place redirect).
 */
export const openOAuth = async (url: string) => {
  try {
    // Capacitor Browser opens a system native browser view that Google trusts.
    await Browser.open({ url, presentationStyle: "fullscreen" });
  } catch {
    // Fallback for plain web or if Capacitor is not available.
    window.location.assign(url);
  }
};
