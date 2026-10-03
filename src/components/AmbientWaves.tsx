import { useEffect, useId, useState } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";

// Closed surfaces give the folds thickness; dark seams and bright rims give depth.
function ribbon(y: number) {
  const edge = (offset: number) => `M -140 ${y + offset} C 150 ${y - 230 + offset} 290 ${y + 320 + offset} 600 ${y + 120 + offset} C 890 ${y - 80 + offset} 920 ${y - 290 + offset} 1190 ${y - 100 + offset} C 1400 ${y + 30 + offset} 1500 ${y + 50 + offset} 1660 ${y - 100 + offset}`;
  return {
    rim: edge(0),
    surface: `${edge(0)} L 1660 ${y - 88} C 1500 ${y + 62} 1400 ${y + 42} 1190 ${y - 88} C 920 ${y - 278} 890 ${y - 68} 600 ${y + 132} C 290 ${y + 332} 150 ${y - 218} -140 ${y + 12} Z`,
  };
}
const ribbons = Array.from({ length: 30 }, (_, index) => ribbon(80 + index * 15));

function FoldedRibbon({ id, secondary = false }: { id: string; secondary?: boolean }) {
  return <svg className={`ambient-ribbon ${secondary ? "ambient-ribbon-secondary" : ""}`} viewBox="0 0 1500 850" aria-hidden="true">
    <defs>
      <linearGradient id={`${id}-surface`} x1="0%" y1="20%" x2="100%" y2="70%">
        <stop offset="0" stopColor="#173b3b" />
        <stop offset=".19" stopColor="#64b4a7" />
        <stop offset=".32" stopColor="#c9ead6" />
        <stop offset=".4" stopColor="#255e5c" />
        <stop offset=".47" stopColor="#102b34" />
        <stop offset=".56" stopColor="#79c7bc" />
        <stop offset=".66" stopColor="#c6b9e5" />
        <stop offset=".78" stopColor="#ecd4a0" />
        <stop offset="1" stopColor="#45897a" />
      </linearGradient>
      <linearGradient id={`${id}-rim`} x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0" stopColor="#173130" stopOpacity="0" />
        <stop offset=".32" stopColor="#e3ffee" stopOpacity=".8" />
        <stop offset=".53" stopColor="#0a252b" stopOpacity=".2" />
        <stop offset=".78" stopColor="#ede2ff" stopOpacity=".7" />
        <stop offset="1" stopColor="#e4cf9d" stopOpacity="0" />
      </linearGradient>
      <radialGradient id={`${id}-fade`} cx="57%" cy="45%" r="65%">
        <stop offset=".35" stopColor="white" />
        <stop offset="1" stopColor="black" />
      </radialGradient>
      <mask id={`${id}-mask`}><rect width="1500" height="850" fill={`url(#${id}-fade)`} /></mask>
    </defs>
    <g mask={`url(#${id}-mask)`}>
      {ribbons.map((band, index) => <g key={index} opacity={.55 + Math.sin(index / 29 * Math.PI) * .45}>
        <path d={band.surface} fill={`url(#${id}-surface)`} stroke="#0b2426" strokeWidth="1.1" />
        <path d={band.rim} fill="none" stroke={`url(#${id}-rim)`} strokeWidth="1.5" />
      </g>)}
    </g>
  </svg>;
}

export default function AmbientWaves() {
  const id = useId().replace(/:/g, "");
  const reduced = useReducedMotion();
  const [active, setActive] = useState(false);
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const x = useSpring(pointerX, { stiffness: 35, damping: 22 });
  const y = useSpring(pointerY, { stiffness: 35, damping: 22 });

  useEffect(() => {
    const desktop = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 701px)");
    const sync = () => {
      const enabled = desktop.matches && !reduced && !document.hidden;
      setActive(enabled);
      if (!enabled) { pointerX.set(0); pointerY.set(0); }
    };
    const move = (event: PointerEvent) => {
      if (!desktop.matches || reduced || document.hidden) return;
      pointerX.set((event.clientX / window.innerWidth - .5) * 24);
      pointerY.set((event.clientY / window.innerHeight - .5) * 18);
    };
    const reset = () => { pointerX.set(0); pointerY.set(0); };
    sync();
    desktop.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", reset);
    return () => {
      desktop.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", reset);
    };
  }, [reduced, pointerX, pointerY]);

  return <div className="ambient-waves" aria-hidden="true" data-motion={active ? "flow" : "still"}>
    <motion.div className="ambient-waves-parallax" style={{ x, y }}>
      <motion.div className="ambient-waves-field"
        initial={false} animate={active ? { y: [0, -16, 0], rotate: [0, 1.3, 0], scaleY: [1, 1.06, 1] } : { y: 0, rotate: 0, scaleY: 1 }}
        transition={active ? { duration: 26, repeat: Infinity, ease: "easeInOut" } : { duration: 0 }}>
        <FoldedRibbon id={`${id}-main`} />
        <FoldedRibbon id={`${id}-secondary`} secondary />
      </motion.div>
    </motion.div>
  </div>;
}
