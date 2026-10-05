import { useState, type PointerEvent } from "react";
import { motion, useReducedMotion, useSpring } from "motion/react";
import { ArrowUpRight, Pause, Play } from "lucide-react";
import BrandMark from "./BrandMark";
import "./LandingPage.css";

// A fixed link target, with a spring inside: ordinary click, touch and Enter work.
// The restrained pull is inspired by React Bits Micro's Sling Button.
function LoginLink({ moving }: { moving: boolean }) {
  const x = useSpring(0, { stiffness: 260, damping: 20 });
  const y = useSpring(0, { stiffness: 260, damping: 20 });
  function move(event: PointerEvent<HTMLAnchorElement>) {
    if (!moving || event.pointerType !== "mouse") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    x.set((event.clientX - bounds.left - bounds.width / 2) * 0.08);
    y.set((event.clientY - bounds.top - bounds.height / 2) * 0.08);
  }
  function reset() { x.set(0); y.set(0); }
  return <a className="landing-login" href="/?app=operations" onPointerMove={move} onPointerLeave={reset} onBlur={reset}>
    <motion.span className="landing-login-face" style={{ x: moving ? x : 0, y: moving ? y : 0 }}>Đăng nhập <ArrowUpRight size={20} aria-hidden="true" /></motion.span>
  </a>;
}

export default function LandingPage() {
  const reduce = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const moving = !reduce && !paused;
  const x = useSpring(0, { stiffness: 35, damping: 18 });
  const y = useSpring(0, { stiffness: 35, damping: 18 });
  function move(event: PointerEvent<HTMLDivElement>) {
    if (!moving || event.pointerType !== "mouse") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    x.set((event.clientX / bounds.width - 0.5) * 16);
    y.set((event.clientY / bounds.height - 0.5) * 12);
  }
  function reset() { x.set(0); y.set(0); }
  return <div className="landing" data-moving={moving} onPointerMove={move} onPointerLeave={reset}>
    <motion.div className="landing-art" aria-hidden="true" style={{ x: moving ? x : 0, y: moving ? y : 0 }}>
      <img className="landing-poster" src="/brand/landing.webp" width="2048" height="2048" alt="" fetchPriority="high" />
      <div className="landing-fragment landing-fragment-left" />
      <div className="landing-fragment landing-fragment-right" />
    </motion.div>
    <header className="landing-header">
      <a className="brand" href="/" aria-label="bracket. — Trang chủ"><BrandMark /><span>bracket<span className="landing-period">.</span></span></a>
      <nav aria-label="Điều hướng chính"><a className="landing-nav-login" href="/?app=operations">Đăng nhập <ArrowUpRight size={16} aria-hidden="true" /></a></nav>
    </header>
    <main className="landing-main">
      <h1 className="landing-sr">CHV Esport</h1>
      <LoginLink moving={moving} />
    </main>
    {!reduce && <button type="button" className="landing-motion" aria-pressed={paused} onClick={() => { reset(); setPaused(!paused); }}>
      {paused ? <Play size={13} aria-hidden="true" /> : <Pause size={13} aria-hidden="true" />}{paused ? "Bật chuyển động" : "Tắt chuyển động"}
    </button>}
  </div>;
}
