// Detects if the app is running inside a native WebView (Android/iOS wrapper).
// Important: Google OAuth refuses to load inside a plain Android WebView
// (error: "disallowed_useragent"). When detected we surface a friendlier flow.

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
 * Open OAuth in a way that stays inside the WebView container.
 * - In WebView: uses location.assign (full in-place redirect, no popup blockers,
 *   no external Chrome window). The OAuth flow will return to the same origin
 *   and Supabase will restore the session from the URL hash.
 * - In a normal browser: same in-place redirect — popups are unreliable on mobile.
 */
export const inAppRedirect = (url: string) => {
  // Replace so the OAuth provider page is not in browser history.
  window.location.assign(url);
};
