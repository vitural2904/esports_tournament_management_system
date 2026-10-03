import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, MotionConfig, animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { Activity, ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronDown, Clock3, GitBranch, LayoutGrid, Plus, Swords, Trophy, Users, X } from "lucide-react";
import BellToggle from "./BellToggle";
import SwipeToast from "./SwipeToast";
import AmbientWaves from "./AmbientWaves";

type Match = { id: number; time: string; home: string; away: string; round: string; bo: number; state: "live" | "upcoming" | "pending"; score: string };
const SAMPLE: Match[] = [
  { id: 1, time: "18:30", home: "GAM Esports", away: "Secret Whales", round: "Tứ kết nhánh thắng", bo: 3, state: "live", score: "1 : 0" },
  { id: 2, time: "19:45", home: "Team Whales", away: "Vikings Esports", round: "Tứ kết nhánh thắng", bo: 3, state: "upcoming", score: "— : —" },
  { id: 3, time: "21:00", home: "Team Flash", away: "Cerberus Esports", round: "Tứ kết nhánh thắng", bo: 3, state: "pending", score: "2 : 1" },
];
const STATE = { live: "Đang đấu", upcoming: "Sắp bắt đầu", pending: "Chờ xác nhận" };
function AnimatedNumber({ value }: { value: number }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (current) => Math.round(current));
  const reduce = useReducedMotion();
  useEffect(() => { if (reduce) { count.set(value); return; } const animation = animate(count, value, { duration: .7, ease: "easeOut" }); return () => animation.stop(); }, [value, reduce, count]);
  return <motion.span>{rounded}</motion.span>;
}
function Action({ children, onClick, className = "", label }: { children: ReactNode; onClick?: () => void; className?: string; label?: string }) {
  return <motion.button type="button" aria-label={label} className={`vd-action ${className}`} onClick={onClick} whileHover={{ y: -2 }} whileTap={{ scale: .96 }} transition={{ type: "spring", stiffness: 450, damping: 27 }}>{children}</motion.button>;
}
function TeamMark({ name, alternate = false }: { name: string; alternate?: boolean }) { return <span className={`vd-team-mark ${alternate ? "alternate" : ""}`}>{name.split(" ").map((word) => word[0]).join("").slice(0, 3)}</span>; }
export default function VisualDashboard() {
  const [matches, setMatches] = useState(SAMPLE);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Match | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const detailRef = useRef<HTMLElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const [parent, enable] = useAutoAnimate<HTMLDivElement>({ duration: 320 });
  const reduced = useReducedMotion();
  useEffect(() => enable(!reduced), [reduced, enable]);
  useEffect(() => {
    if (!selected) return;
    previousFocus.current = document.activeElement as HTMLElement;
    const beforeOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    detailRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
      if (event.key !== "Tab") return;
      const controls = detailRef.current?.querySelectorAll<HTMLElement>("button, a[href]");
      if (!controls?.length) return;
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => { window.removeEventListener("keydown", handleKey); document.body.style.overflow = beforeOverflow; previousFocus.current?.focus(); };
  }, [selected]);
  const live = matches[0];
  const visible = matches.filter((match) => filter === "all" || match.state === filter);
  function createMatch() { setMatches((current) => [...current, { id: current.length + 1, time: "22:15", home: "Saigon Buffalo", away: "MGN Blue Esports", round: "Tứ kết nhánh thắng", bo: 3, state: "upcoming", score: "— : —" }]); setFilter("all"); setToast("Đã thêm trận mẫu vào lịch hôm nay."); }
  return <MotionConfig reducedMotion="user"><div className="app-shell vd-shell"><AmbientWaves /><aside className="sidebar"><a className="brand" href="#overview"><span className="brand-mark"><Swords size={19} /></span><span>bracket<span className="vd-brand-period">.</span></span></a><div className="vd-workspace"><span>Không gian làm việc</span><strong>LoL Community <ChevronDown size={15} /></strong></div><nav className="nav-list" aria-label="Điều hướng chính"><a className="nav-item active" href="#overview"><LayoutGrid size={18} /> Tổng quan</a><a className="nav-item" href="#matches"><Swords size={18} /> Trận đấu</a><a className="nav-item" href="#teams"><Users size={18} /> Đội tuyển</a><a className="nav-item" href="#schedule"><CalendarDays size={18} /> Lịch thi đấu</a><a className="nav-item" href="?prototype=builder&variant=C"><GitBranch size={18} /> Dựng thể thức</a></nav><div className="vd-side-tournament"><Trophy size={20} /><strong>Community Cup</strong><span>Liên Minh Huyền Thoại</span><a href="?prototype=builder&variant=A">Tạo giải mới <Plus size={15} /></a></div><div className="sidebar-bottom"><div className="profile-row"><div className="avatar">AN</div><div className="profile-copy"><strong>An Nguyễn</strong><span>Điều hành giải</span></div></div></div></aside><main className="main-content vd-main" id="overview"><header className="topbar"><div className="breadcrumb">Giải đấu <span>/</span><strong>Community Cup 2026</strong></div><div className="top-actions"><span className="vd-sample-label">Dữ liệu mẫu</span><BellToggle label="Theo dõi thông báo" offLabel="Thông báo" onLabel="Đang theo dõi" size="md" radius={8} count={3} waves color="#e8e5dd" background="#2d2d2a" onColor="#171c18" onBackground="#c5dccb" /></div></header><section className="vd-heading"><motion.div initial={reduced ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .4 }}><div className="vd-heading-meta"><span>Liên Minh Huyền Thoại</span><span>Playoffs · Ngày 1</span></div><h1>Community<br /><span>Cup 2026<span className="vd-title-period">.</span></span></h1></motion.div><div className="vd-heading-side"><span className="vd-format">8 đội / 2 bảng / Loại kép</span><motion.a className="vd-create-link" href="?prototype=builder&variant=C" whileHover={{ x: 3 }} whileTap={{ scale: .98 }}>Dựng thể thức <ArrowUpRight size={19} /></motion.a></div></section><section className="vd-overview-strip" aria-label="Tổng quan giải"><div><span>Đội tham dự</span><strong><AnimatedNumber value={8} /><em>đội</em></strong></div><div><span>Trận vòng bảng</span><strong><AnimatedNumber value={24} /><em>đã kết thúc</em></strong></div><div><span>Trận hôm nay</span><strong><AnimatedNumber value={matches.length} /><em>trận</em></strong></div><div><span>Chung kết tổng</span><strong>BO5<em>có reset</em></strong></div></section><div className="vd-content-grid"><motion.section className="vd-live-panel" initial={reduced ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .45, delay: .1 }}><div className="vd-live-heading"><span><Activity size={15} /> Đang thi đấu</span><span>{live.round} · BO{live.bo}</span></div><div className="vd-featured-teams"><div><TeamMark name={live.home} /><strong>{live.home}</strong></div><div className="vd-score"><span>01</span><b>:</b><span>00</span></div><div><TeamMark name={live.away} alternate /><strong>{live.away}</strong></div></div><div className="vd-live-footer"><span><Clock3 size={14} /> {live.time} · Game 2</span><Action onClick={() => setSelected(live)}>Xem trận đấu <ArrowUpRight size={17} /></Action></div></motion.section><section className="vd-stage-panel"><div className="vd-stage-heading"><GitBranch size={19} /><h2>Đường tới chung kết</h2></div><div className="vd-stage-row"><Check size={16} /><span>Vòng bảng</span><strong>24 trận</strong></div><div className="vd-stage-connector" /><div className="vd-stage-row current"><Swords size={16} /><span>Nhánh loại kép</span><strong>BO3</strong></div><div className="vd-stage-connector" /><div className="vd-stage-row"><Trophy size={16} /><span>Các trận chung kết</span><strong>BO5</strong></div><a href="?prototype=builder&variant=C">Xem toàn bộ nhánh <ArrowRight size={16} /></a></section></div><section className="vd-schedule" id="schedule"><div className="vd-schedule-heading"><div><h2>Trận đấu hôm nay<span>{matches.length.toString().padStart(2, "0")}</span></h2><p>Giờ Việt Nam · UTC+7</p></div><Action className="vd-coral-action" onClick={createMatch}><Plus size={16} /> Tạo trận mẫu</Action></div><nav className="vd-filters" aria-label="Lọc trận đấu">{[{ id: "all", label: "Tất cả" }, { id: "live", label: "Đang đấu" }, { id: "pending", label: "Chờ xác nhận" }].map((tab) => <motion.button type="button" key={tab.id} aria-pressed={filter === tab.id} onClick={() => setFilter(tab.id)} whileTap={{ scale: .96 }} className={filter === tab.id ? "selected" : ""}>{tab.label}{filter === tab.id && <motion.span layoutId="match-filter-line" transition={{ type: "spring", stiffness: 350, damping: 30 }} />}</motion.button>)}</nav><div className="vd-match-list" ref={parent} id="matches">{visible.map((match) => <button type="button" key={match.id} className={`vd-match-row ${match.state}`} onClick={() => setSelected(match)}><time>{match.time}</time><div className="vd-match-teams"><strong>{match.home}</strong><span>vs</span><strong>{match.away}</strong></div><div className="vd-match-round"><span>{match.round}</span><strong>BO{match.bo}</strong></div><span className="vd-state">{STATE[match.state]}</span><ArrowUpRight size={18} /></button>)}</div></section><section className="vd-team-directory" id="teams"><h2>Đội tham dự</h2><div>{["GAM Esports", "Team Whales", "Vikings Esports", "Team Flash", "Saigon Buffalo", "Cerberus Esports", "MGN Blue Esports", "Secret Whales"].map((team, index) => <div key={team}><span>{(index + 1).toString().padStart(2, "0")}</span><strong>{team}</strong></div>)}</div></section></main><AnimatePresence>{selected && <motion.div className="vd-detail-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelected(null)}><motion.section ref={detailRef} className="vd-detail" role="dialog" aria-modal="true" aria-labelledby="vd-detail-title" initial={reduced ? false : { x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 50, opacity: 0 }} transition={{ type: "spring", stiffness: 280, damping: 30 }} onClick={(event) => event.stopPropagation()}><header><span>Chi tiết trận mẫu</span><Action label="Đóng chi tiết" onClick={() => setSelected(null)}><X size={18} /></Action></header><h2 id="vd-detail-title">{selected.home}<br /><span>vs</span><br />{selected.away}</h2><dl><div><dt>Lịch</dt><dd>{selected.time} · UTC+7</dd></div><div><dt>Vòng</dt><dd>{selected.round}</dd></div><div><dt>Thể thức</dt><dd>BO{selected.bo}</dd></div><div><dt>Trạng thái</dt><dd>{STATE[selected.state]}</dd></div><div><dt>Kết quả mẫu</dt><dd>{selected.score}</dd></div></dl><a href="?prototype=builder&variant=C">Xem nhánh đấu <ArrowRight size={16} /></a></motion.section></motion.div>}</AnimatePresence>{toast && <SwipeToast key={`${toast}-${matches.length}`} open title={toast} onClose={() => setToast(null)} background="#e8e4da" color="#222622" fuseColor="#a14332" closeButton />}</div></MotionConfig>;
}
