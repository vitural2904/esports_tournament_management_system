import { useEffect, useState } from "react";
import { matchSignals } from "../../shared/match-signals.mjs";
import type { Match } from "./api";
export function useMatchSignals(matches: Match[]) {
 const [now, setNow] = useState(Date.now);
 useEffect(() => {
  const update = () => setNow(Date.now());
  const timer = window.setInterval(() => { if (!document.hidden) update(); }, 60000);
  const visible = () => { if (!document.hidden) update(); };
  document.addEventListener("visibilitychange", visible);
  return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", visible); };
 }, []);
 useEffect(() => { setNow(Date.now()); }, [matches]);
 return matchSignals(matches, now);
}
