import { useCallback, useState } from "react";

const keyFor = (gameKey: string) => `${gameKey}-intro-seen`;

/** Tracks whether a player has ever seen a given game's "how to play" intro
 *  before, so it can be shown in full once and abbreviated afterwards. */
export function useGameFirstVisit(gameKey: string) {
  const [isFirstVisit] = useState(() => {
    try {
      return localStorage.getItem(keyFor(gameKey)) !== "1";
    } catch {
      return true;
    }
  });

  const markSeen = useCallback(() => {
    try {
      localStorage.setItem(keyFor(gameKey), "1");
    } catch {
      /* ignore */
    }
  }, [gameKey]);

  return { isFirstVisit, markSeen };
}
