import BrandMark from "./BrandMark";
// Throwaway prototype: three structurally different tournament builders on the
// existing app route, switchable with ?prototype=builder&variant=A|B|C.
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "motion/react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, CircleCheck, GitBranch, GripVertical, LayoutList, LockKeyhole, RotateCcw, Shuffle, Trophy, Users, X } from "lucide-react";
import SwipeToast from "./SwipeToast";
import AmbientWaves from "./AmbientWaves";
import "./TournamentBuilderPrototype.css";

type Variant = "A" | "B" | "C";
type BO = 1 | 3 | 5;
type Preset = "groups-double" | "groups-single" | "double";
type Config = { name: string; preset: Preset; teams: string[]; legs: 1 | 2; groupBO: BO; regularBO: BO; upperBO: BO; lowerBO: BO; finalBO: BO };
type EditorProps = { config: Config; update: (change: Partial<Config>) => void; locked: boolean; notify: (message: string) => void };
const TEAMS = ["GAM Esports", "Team Whales", "Vikings Esports", "Team Flash", "Saigon Buffalo", "Cerberus Esports", "MGN Blue Esports", "Secret Whales"];
const INITIAL: Config = { name: "LoL Community Cup 2026", preset: "groups-double", teams: [...TEAMS], legs: 2, groupBO: 1, regularBO: 3, upperBO: 5, lowerBO: 5, finalBO: 5 };
const PRESETS: { key: Preset; title: string; text: string }[] = [
  { key: "groups-double", title: "Hai bảng → Loại kép", text: "8 đội · Vòng tròn → Seed 1–4 → Hai lần thua" },
  { key: "groups-single", title: "Hai bảng → Loại trực tiếp", text: "8 đội · Vòng tròn → Seed 1–4 → Một lần thua" },
  { key: "double", title: "Loại kép thẳng", text: "8 đội · Xếp cặp từ danh sách → Hai lần thua" },
];
const STEPS = ["Chọn preset", "Chia bảng", "Luật & BO", "Kiểm tra"];
const VARIANTS: Variant[] = ["A", "B", "C"];
const VARIANT_NAMES = { A: "Theo bước", B: "Chỉnh trực tiếp", C: "Nhánh đấu trước" };
function grouped(config: Config) { return config.preset !== "double"; }
function double(config: Config) { return config.preset !== "groups-single"; }
function count(config: Config) { return (grouped(config) ? 12 * config.legs : 0) + (double(config) ? 14 : 7); }

function Button({ children, onClick, primary = false, disabled = false, label, className = "" }: { children: ReactNode; onClick?: () => void; primary?: boolean; disabled?: boolean; label?: string; className?: string }) {
  return <motion.button type="button" aria-label={label} disabled={disabled} onClick={onClick} className={`pb-button ${primary ? "pb-primary" : ""} ${className}`} whileHover={disabled ? undefined : { scale: 1.025 }} whileTap={disabled ? undefined : { scale: 0.96 }} transition={{ type: "spring", stiffness: 420, damping: 28 }}>{children}</motion.button>;
}

function PresetEditor({ config, update, locked }: EditorProps) {
  return <section className="pb-editor"><h2>Thông tin giải</h2><label className="pb-field">Tên giải<input value={config.name} disabled={locked} maxLength={80} onChange={(e) => update({ name: e.target.value })} /></label><h3>Chọn điểm bắt đầu</h3><div className="pb-presets">{PRESETS.map((preset) => <motion.button type="button" key={preset.key} disabled={locked} aria-pressed={config.preset === preset.key} className={`pb-preset ${config.preset === preset.key ? "selected" : ""}`} onClick={() => update({ preset: preset.key })} whileHover={locked ? undefined : { x: 3 }} whileTap={locked ? undefined : { scale: 0.985 }}><span className="pb-radio">{config.preset === preset.key && <motion.span layoutId="preset-dot" />}</span><span><strong>{preset.title}</strong><span>{preset.text}</span></span><GitBranch size={19} /></motion.button>)}</div><p className="pb-hint">Preset điền sẵn cấu hình. Bạn vẫn chỉnh được trước khi chốt.</p></section>;
}

function TeamsEditor({ config, update, locked, notify }: EditorProps) {
  const [listA, enableA] = useAutoAnimate<HTMLDivElement>({ duration: 300 });
  const [listB, enableB] = useAutoAnimate<HTMLDivElement>({ duration: 300 });
  const reduced = useReducedMotion();
  useEffect(() => { enableA(!reduced); enableB(!reduced); }, [reduced, enableA, enableB]);
  const [selected, setSelected] = useState<string | null>(null);
  const hasGroups = grouped(config);
  function swap(team: string, target: number) {
    if (locked) return;
    const current = config.teams.indexOf(team);
    if (current < 0 || target < 0 || target > 7) return;
    const next = [...config.teams];
    [next[current], next[target]] = [next[target], next[current]];
    update({ teams: next }); setSelected(null); notify("Đã đổi vị trí hai đội.");
  }
  function shuffle() {
    const teams = [...config.teams];
    for (let i = teams.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [teams[i], teams[j]] = [teams[j], teams[i]]; }
    update({ teams }); setSelected(null); notify(hasGroups ? "Đã bốc lại hai bảng." : "Đã bốc lại thứ tự xếp cặp.");
  }
  function row(team: string, index: number) {
    return <div key={team} className={`pb-team ${selected === team ? "chosen" : ""}`} draggable={!locked} onDragStart={(e) => { e.dataTransfer.setData("text/plain", team); setSelected(team); }} onDragEnd={() => setSelected(null)} onDragOver={(e) => { if (!locked) e.preventDefault(); }} onDrop={(e) => { e.preventDefault(); swap(e.dataTransfer.getData("text/plain"), index); }}><GripVertical size={15} /><span className="pb-team-logo">{team.split(" ").map((word) => word[0]).join("").slice(0, 3)}</span><strong>{team}</strong><button type="button" disabled={locked} aria-label={`${selected && selected !== team ? "Đổi với" : "Chọn"} ${team}`} className="pb-team-select" aria-pressed={selected === team} onClick={() => { if (selected && selected !== team) swap(selected, index); else setSelected(selected === team ? null : team); }}>{selected === team ? <Check size={16} /> : <ArrowRight size={16} />}</button></div>;
  }
  return <section className="pb-editor"><div className="pb-section-heading"><h2>{hasGroups ? "Chia bảng" : "Thứ tự xếp cặp"}</h2><Button disabled={locked} onClick={shuffle}><Shuffle size={15} /> Bốc ngẫu nhiên</Button></div><p className="pb-hint">Kéo đội vào vị trí khác. Hoặc chọn hai đội để đổi chỗ. {hasGroups && "Mỗi bảng giữ đủ 4 đội."}</p><div className={`pb-groups ${!hasGroups ? "one-group" : ""}`}><div className="pb-group"><header><strong>{hasGroups ? "Bảng A" : "Danh sách đội"}</strong><span>{hasGroups ? "4 đội" : "8 đội"}</span></header><div ref={listA}>{(hasGroups ? config.teams.slice(0, 4) : config.teams).map((team, index) => row(team, index))}</div></div>{hasGroups && <div className="pb-group"><header><strong>Bảng B</strong><span>4 đội</span></header><div ref={listB}>{config.teams.slice(4).map((team, index) => row(team, index + 4))}</div></div>}</div>{hasGroups && <p className="pb-hint">Thứ tự trên là danh sách đội. Seed 1–4 chỉ có sau khi vòng bảng kết thúc.</p>}</section>;
}

function BOControl({ label, value, onChange, disabled }: { label: string; value: BO; onChange: (value: BO) => void; disabled: boolean }) {
  return <div className="pb-rule-row"><span>{label}</span><div className="pb-segments" aria-label={label}>{([1, 3, 5] as BO[]).map((bo) => <motion.button type="button" key={bo} disabled={disabled} aria-pressed={value === bo} onClick={() => onChange(bo)} whileTap={disabled ? undefined : { scale: 0.91 }} className={value === bo ? "active" : ""}>{value === bo && <motion.span className="pb-segment-fill" layoutId={`bo-${label}`} transition={{ type: "spring", stiffness: 360, damping: 30 }} />}<span>BO{bo}</span></motion.button>)}</div></div>;
}

function RulesEditor({ config, update, locked }: EditorProps) {
  return <section className="pb-editor"><h2>Luật & BO</h2>{grouped(config) && <div className="pb-rule-section"><h3>Vòng bảng</h3><div className="pb-rule-row"><label htmlFor="pb-legs">Số lượt vòng tròn</label><select id="pb-legs" value={config.legs} disabled={locked} onChange={(e) => update({ legs: Number(e.target.value) as 1 | 2 })}><option value={1}>Một lượt</option><option value={2}>Lượt đi & lượt về</option></select></div><BOControl label="Trận vòng bảng" value={config.groupBO} onChange={(groupBO) => update({ groupBO })} disabled={locked} /><div className="pb-rule-note">Thắng 1 điểm · Thua 0 điểm<br />Bằng điểm → đối đầu → trận phụ BO1.</div></div>}<div className="pb-rule-section"><h3>{double(config) ? "Nhánh loại kép" : "Nhánh loại trực tiếp"}</h3><BOControl label="Các trận thông thường" value={config.regularBO} onChange={(regularBO) => update({ regularBO })} disabled={locked} />{double(config) && <><BOControl label="Chung kết nhánh thắng" value={config.upperBO} onChange={(upperBO) => update({ upperBO })} disabled={locked} /><BOControl label="Chung kết nhánh thua" value={config.lowerBO} onChange={(lowerBO) => update({ lowerBO })} disabled={locked} /></>}<BOControl label="Chung kết tổng" value={config.finalBO} onChange={(finalBO) => update({ finalBO })} disabled={locked} /><p className="pb-rule-note">{double(config) ? `Hai lần thua thì bị loại. Chung kết tổng có reset. Loạt reset dùng BO${config.finalBO}.` : "Một lần thua thì bị loại."}</p></div></section>;
}

type BracketNode = { id: string; x: number; y: number; teams: [string, string]; label?: string };
function bracketNodes(config: Config): BracketNode[] {
  const openers: [string, string][] = grouped(config) ? [["A1", "B4"], ["B2", "A3"], ["B1", "A4"], ["A2", "B3"]] : [[config.teams[0], config.teams[7]], [config.teams[3], config.teams[4]], [config.teams[1], config.teams[6]], [config.teams[2], config.teams[5]]];
  const nodes: BracketNode[] = openers.map((teams, i) => ({ id: `U${i + 1}`, x: 24, y: 65 + i * 104, teams }));
  nodes.push({ id: "U5", x: 252, y: 117, teams: ["Thắng U1", "Thắng U2"] }, { id: "U6", x: 252, y: 325, teams: ["Thắng U3", "Thắng U4"] });
  if (!double(config)) return [...nodes, { id: "F1", x: 480, y: 221, teams: ["Thắng U5", "Thắng U6"], label: "Chung kết" }];
  return [...nodes, { id: "U7", x: 480, y: 221, teams: ["Thắng U5", "Thắng U6"], label: "CK nhánh thắng" },
    { id: "L1", x: 24, y: 525, teams: ["Thua U1", "Thua U2"] }, { id: "L2", x: 24, y: 677, teams: ["Thua U3", "Thua U4"] },
    { id: "L3", x: 252, y: 525, teams: ["Thắng L1", "Thua U6"] }, { id: "L4", x: 252, y: 677, teams: ["Thắng L2", "Thua U5"] },
    { id: "L5", x: 480, y: 601, teams: ["Thắng L3", "Thắng L4"] }, { id: "L6", x: 708, y: 601, teams: ["Thắng L5", "Thua U7"], label: "CK nhánh thua" },
    { id: "F1", x: 936, y: 330, teams: ["Thắng U7", "Thắng L6"], label: "Chung kết tổng" },
    { id: "F2", x: 1164, y: 330, teams: ["Đội từ nhánh thắng", "Đội từ nhánh thua"], label: "Reset nếu cần" }];
}
function nodeBO(node: BracketNode, config: Config): BO {
  if (node.id.startsWith("F")) return config.finalBO;
  if (node.id === "U7") return config.upperBO;
  if (node.id === "L6") return config.lowerBO;
  return config.regularBO;
}
function BracketPreview({ config }: { config: Config }) {
  const [selected, setSelected] = useState("U1");
  const [showLosses, setShowLosses] = useState(false);
  const [zoom, setZoom] = useState(0.8);
  const reduced = useReducedMotion();
  const nodes = bracketNodes(config);
  const active = nodes.find((node) => node.id === selected) ?? nodes[0];
  const width = double(config) ? 1390 : 708;
  const height = double(config) ? 800 : 455;
  const edges: { from: BracketNode; to: BracketNode; slot: number; loss: boolean }[] = [];
  nodes.forEach((to) => to.teams.forEach((team, slot) => {
    const match = team.match(/^(Thắng|Thua) ([UL]\d)$/);
    if (match) { const from = nodes.find((node) => node.id === match[2]); if (from) edges.push({ from, to, slot, loss: match[1] === "Thua" }); }
  }));
  const outgoing = edges.filter((edge) => edge.from.id === active.id);
  return <section className="pb-bracket"><div className="pb-section-heading"><h2>Nhánh đấu</h2><label className="pb-zoom">Thu phóng<select value={zoom} onChange={(e) => setZoom(Number(e.target.value))}><option value={0.65}>65%</option><option value={0.8}>80%</option><option value={1}>100%</option></select></label></div><div className="pb-bracket-toolbar"><span>{grouped(config) ? "Seed sau vòng bảng" : "Cặp đấu theo thứ tự đội"}</span>{double(config) && <label><input type="checkbox" checked={showLosses} onChange={(e) => setShowLosses(e.target.checked)} /> Đường xuống nhánh thua</label>}</div><div className="pb-canvas-scroll" tabIndex={0} aria-label="Sơ đồ nhánh đấu. Cuộn ngang để xem các vòng."><div style={{ width: width * zoom, height: height * zoom }}><div className="pb-canvas" style={{ width, height, transform: `scale(${zoom})` }}><div className="pb-round-label" style={{ left: 24, top: 20 }}>Tứ kết</div><div className="pb-round-label" style={{ left: 252, top: 20 }}>Bán kết</div><div className="pb-round-label" style={{ left: 480, top: 20 }}>{double(config) ? "Nhánh thắng" : "Chung kết"}</div>{double(config) && <><div className="pb-round-label" style={{ left: 24, top: 474 }}>Nhánh thua · Vòng 1</div><div className="pb-round-label" style={{ left: 252, top: 474 }}>Vòng 2</div><div className="pb-round-label" style={{ left: 480, top: 474 }}>Vòng 3</div><div className="pb-round-label" style={{ left: 708, top: 474 }}>Chung kết nhánh thua</div><div className="pb-round-label" style={{ left: 936, top: 275 }}>Chung kết tổng</div></>}<svg width={width} height={height} aria-hidden="true">{edges.filter((edge) => !edge.loss || showLosses || edge.from.id === active.id).map((edge) => {
    const sx = edge.from.x + 194, sy = edge.from.y + 43;
    const tx = edge.to.x, ty = edge.to.y + 33 + edge.slot * 25;
    const bend = edge.loss ? sx + 17 : sx + (tx - sx) / 2;
    const path = `M ${sx} ${sy} H ${bend} V ${ty} H ${tx}`;
    return <motion.path key={`${edge.from.id}-${edge.to.id}`} d={path} fill="none" stroke={edge.from.id === active.id ? (edge.loss ? "#d2b877" : "#b6e36a") : "#454b42"} strokeWidth={edge.from.id === active.id ? 2 : 1.3} strokeDasharray={edge.loss ? "5 5" : undefined} initial={reduced ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.45 }} />;
  })}{double(config) && <motion.path d="M 1130 373 H 1164" stroke="#d2b877" strokeDasharray="5 5" fill="none" initial={reduced ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} />}</svg>{nodes.map((node, index) => <motion.button type="button" key={node.id} layout className={`pb-node ${node.id === active.id ? "selected" : ""} ${node.id === "F2" ? "conditional" : ""}`} style={{ left: node.x, top: node.y }} initial={reduced ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduced ? 0 : index * 0.025, duration: 0.22 }} whileHover={{ borderColor: "#b6e36a" }} onClick={() => setSelected(node.id)} aria-pressed={node.id === active.id}><header><strong>{node.id}</strong><span>{node.label ?? ""}</span><b>BO{nodeBO(node, config)}</b></header>{node.teams.map((team, i) => <div key={i}><span>{team}</span><span>—</span></div>)}</motion.button>)}</div></div></div><div className="pb-path-info" aria-live="polite"><GitBranch size={16} /><strong>{active.id}</strong><span>{active.id === "F2" ? "Chỉ diễn ra nếu đội từ nhánh thua thắng F1." : outgoing.length ? outgoing.map((edge) => `${edge.loss ? "Thua" : "Thắng"} → ${edge.to.id}`).join(" · ") : active.id === "F1" && double(config) ? "Nhánh thắng thắng: vô địch. Nhánh thua thắng: đấu F2." : active.id.startsWith("L") ? "Thắng → chung kết tổng · Thua → bị loại" : "Thắng → vô địch"}</span></div></section>;
}

function Review({ config, locked }: { config: Config; locked: boolean }) {
  return <section className="pb-editor pb-review"><h2>{locked ? "Thể thức đã chốt" : "Kiểm tra trước khi chốt"}</h2><ul>{["8 đội đã đủ vị trí, không trùng đội", grouped(config) ? "Hai bảng, mỗi bảng 4 đội" : "Đủ 8 vị trí mở màn", "BO đã đặt cho mọi vòng", grouped(config) ? "Seed A1–A4 và B1–B4 đã nối vào nhánh" : "Đã nối đường thắng và thua", "Luật xếp hạng và đi tiếp đã xác định"].map((text) => <li key={text}><CircleCheck size={17} />{text}</li>)}</ul><div className="pb-lock-note"><LockKeyhole size={19} /><p>Chốt một lần trước giai đoạn đầu. Sau đó không đổi bảng, BO hoặc nhánh. Lịch thi đấu vẫn chỉnh được.</p></div><p className="pb-hint">{count(config)}{double(config) ? `–${count(config) + 1}` : ""} trận dự kiến. Chưa tính trận phụ phân hạng.</p></section>;
}

function Summary({ config, locked, onLock }: { config: Config; locked: boolean; onLock: () => void }) {
  return <div className="pb-summary"><div className="pb-summary-title"><Trophy size={20} /><strong>{config.name || "Giải chưa có tên"}</strong></div><dl><div><dt>Đội tham dự</dt><dd>8 đội{grouped(config) ? " · 2 bảng" : ""}</dd></div>{grouped(config) && <div><dt>Vòng bảng</dt><dd>{config.legs === 2 ? "Hai lượt" : "Một lượt"} · BO{config.groupBO}</dd></div>}<div><dt>Nhánh đấu</dt><dd>{double(config) ? "Loại kép" : "Loại trực tiếp"}</dd></div><div><dt>Trận dự kiến</dt><dd><motion.span key={count(config)} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>{count(config)}{double(config) ? `–${count(config) + 1}` : ""}</motion.span></dd></div><div><dt>Chung kết</dt><dd>BO{config.finalBO}</dd></div></dl><Button primary disabled={locked || !config.name.trim()} onClick={onLock}>{locked ? <Check size={16} /> : <LockKeyhole size={16} />}{locked ? "Đã chốt thể thức" : "Kiểm tra & chốt"}</Button><p className="pb-hint">{locked ? "Mở bản thử mới để thử lại." : "Chưa tính trận phụ phân hạng."}</p></div>;
}

function VariantA({ editors, step, setStep, locked, onLock }: { editors: EditorProps; step: number; setStep: (step: number) => void; locked: boolean; onLock: () => void }) {
  return <div className="pb-wizard"><nav className="pb-step-nav" aria-label="Các bước tạo giải">{STEPS.map((title, i) => <button type="button" key={title} onClick={() => setStep(i)} aria-current={step === i ? "step" : undefined}><span>{locked || i < step ? <Check size={15} /> : i + 1}</span><strong>{title}</strong>{i === step && <motion.div className="pb-step-line" layoutId="wizard-line" />}</button>)}</nav><AnimatePresence mode="wait" initial={false}><motion.div key={step} className="pb-step-body" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} transition={{ duration: 0.2 }}>{step === 0 && <PresetEditor {...editors} />}{step === 1 && <TeamsEditor {...editors} />}{step === 2 && <RulesEditor {...editors} />}{step === 3 && <><Review config={editors.config} locked={locked} /><BracketPreview config={editors.config} /></>}</motion.div></AnimatePresence><footer className="pb-wizard-footer"><Button disabled={step === 0} onClick={() => setStep(step - 1)}><ArrowLeft size={16} /> Quay lại</Button><span>{step + 1} / 4</span>{step < 3 ? <Button primary disabled={!editors.config.name.trim()} onClick={() => setStep(step + 1)}>Tiếp tục <ArrowRight size={16} /></Button> : <Button primary disabled={locked || !editors.config.name.trim()} onClick={onLock}><LockKeyhole size={16} />{locked ? "Đã chốt" : "Chốt thể thức"}</Button>}</footer></div>;
}
function VariantB({ editors, locked, onLock }: { editors: EditorProps; locked: boolean; onLock: () => void }) {
  return <div className="pb-document"><div className="pb-document-main"><PresetEditor {...editors} /><TeamsEditor {...editors} /><RulesEditor {...editors} /><Review config={editors.config} locked={locked} /><BracketPreview config={editors.config} /></div><aside className="pb-document-summary"><Summary config={editors.config} locked={locked} onLock={onLock} /></aside></div>;
}
function VariantC({ editors, locked, onLock }: { editors: EditorProps; locked: boolean; onLock: () => void }) {
  const [tab, setTab] = useState(0);
  return <div className="pb-visual"><div className="pb-visual-main">{grouped(editors.config) && <div className="pb-stage-flow"><div><Users size={19} /><strong>Vòng bảng</strong><span>2 bảng · {12 * editors.config.legs} trận · BO{editors.config.groupBO}</span></div><ArrowRight size={20} /><div><GitBranch size={19} /><strong>{double(editors.config) ? "Loại kép" : "Loại trực tiếp"}</strong><span>Cả 8 đội · Theo seed 1–4</span></div></div>}<BracketPreview config={editors.config} /><div className="pb-visual-footer"><span><Check size={16} /> Cặp đấu và BO cập nhật ngay khi chỉnh</span><Button primary disabled={locked || !editors.config.name.trim()} onClick={onLock}><LockKeyhole size={16} />{locked ? "Đã chốt thể thức" : "Kiểm tra & chốt"}</Button></div></div><aside className="pb-inspector"><nav aria-label="Chỉnh cấu hình">{["Preset", "Đội", "Luật"].map((title, i) => <button type="button" key={title} onClick={() => setTab(i)} aria-pressed={tab === i} className={tab === i ? "active" : ""}>{title}{tab === i && <motion.span layoutId="inspector-line" />}</button>)}</nav><AnimatePresence mode="wait" initial={false}><motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>{tab === 0 ? <PresetEditor {...editors} /> : tab === 1 ? <TeamsEditor {...editors} /> : <RulesEditor {...editors} />}</motion.div></AnimatePresence></aside></div>;
}

function PrototypeSwitcher({ variant, change }: { variant: Variant; change: (variant: Variant) => void }) {
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest("input, textarea, select, button, [contenteditable], [role=dialog]")) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); const index = VARIANTS.indexOf(variant); change(VARIANTS[(index + (event.key === "ArrowLeft" ? 2 : 1)) % 3]); }
    };
    window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key);
  }, [variant, change]);
  return <div className="pb-switcher" aria-label="Chọn bản thử giao diện"><Button label="Bản thử trước" onClick={() => change(VARIANTS[(VARIANTS.indexOf(variant) + 2) % 3])}><ChevronLeft size={18} /></Button><div><span>Bản thử {variant} / 3</span><AnimatePresence mode="wait" initial={false}><motion.strong key={variant} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}>{VARIANT_NAMES[variant]}</motion.strong></AnimatePresence></div><Button label="Bản thử tiếp" onClick={() => change(VARIANTS[(VARIANTS.indexOf(variant) + 1) % 3])}><ChevronRight size={18} /></Button></div>;
}

export default function TournamentBuilderPrototype() {
  const urlVariant = new URLSearchParams(window.location.search).get("variant");
  const [variant, setVariant] = useState<Variant>(urlVariant === "B" || urlVariant === "C" ? urlVariant : "A");
  const [config, setConfig] = useState<Config>(() => ({ ...INITIAL, teams: [...TEAMS] }));
  const [locked, setLocked] = useState(false);
  const [step, setStep] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  function change(next: Variant) {
    setVariant(next); const url = new URL(window.location.href); url.searchParams.set("variant", next); window.history.pushState(null, "", url); window.scrollTo({ top: 0, behavior: "instant" });
  }
  useEffect(() => { const pop = () => { const v = new URLSearchParams(window.location.search).get("variant"); setVariant(v === "B" || v === "C" ? v : "A"); }; window.addEventListener("popstate", pop); return () => window.removeEventListener("popstate", pop); }, []);
  useEffect(() => {
    if (!confirm) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setConfirm(false);
      if (event.key === "Tab") {
        const buttons = dialog.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
        if (!buttons?.length) return;
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", key);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", key); opener.current?.focus(); };
  }, [confirm]);
  const editors: EditorProps = { config, locked, update: (change) => { if (!locked) setConfig((old) => ({ ...old, ...change })); }, notify: setToast };
  function openConfirm() { if (!locked && config.name.trim()) { opener.current = document.activeElement as HTMLElement; setConfirm(true); } }
  function lock() { setLocked(true); setConfirm(false); setStep(3); setToast("Đã chốt thể thức. Bảng, BO và nhánh đã khóa."); }
  function restart() { setConfig({ ...INITIAL, teams: [...TEAMS] }); setLocked(false); setStep(0); setConfirm(false); setToast("Đã mở bản thử mới. Dữ liệu mẫu được khôi phục."); window.scrollTo({ top: 0, behavior: "instant" }); }
  return <MotionConfig reducedMotion="user" transition={{ duration: 0.22 }}><div className="app-shell pb-shell"><AmbientWaves /><aside className="sidebar"><a className="brand" href="?"><BrandMark /><span>bracket</span></a><div className="pb-org">Ban tổ chức<span>LoL Community</span></div><nav className="nav-list" aria-label="Điều hướng"><a className="nav-item" href="?app=demo"><LayoutList size={17} /> Tổng quan</a><a className="nav-item active" href="?prototype=builder"><Trophy size={17} /> Tạo giải đấu</a><span className="nav-item"><Users size={17} /> 8 đội mẫu</span></nav><div className="sidebar-bottom"><div className="profile-row"><div className="avatar">AN</div><div className="profile-copy"><strong>An Nguyễn</strong><span>Điều hành giải</span></div></div></div></aside><main className={`pb-main pb-variant-${variant}`}><header className="pb-topbar"><div><a href="?">Giải đấu</a><span>/</span><strong>Tạo giải mới</strong></div><span className="pb-prototype-label">Bản thử · dữ liệu mẫu</span></header><div className="pb-page-heading"><div><h1>{locked ? config.name : "Dựng thể thức giải"}</h1><p>{locked ? "Đã chốt. Bảng, BO và nhánh không thể chỉnh." : "Chọn preset, chỉnh thể thức, kiểm tra rồi chốt."}</p></div><div className="pb-heading-actions">{locked && <motion.span className="pb-locked" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}><LockKeyhole size={14} /> Đã chốt</motion.span>}<Button onClick={restart}><RotateCcw size={15} /> Bản thử mới</Button></div></div><AnimatePresence mode="wait" initial={false}><motion.div key={variant} initial={reduced ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>{variant === "A" ? <VariantA editors={editors} step={step} setStep={setStep} locked={locked} onLock={openConfirm} /> : variant === "B" ? <VariantB editors={editors} locked={locked} onLock={openConfirm} /> : <VariantC editors={editors} locked={locked} onLock={openConfirm} />}</motion.div></AnimatePresence><details className="pb-state"><summary>Trạng thái bản thử</summary><pre>{JSON.stringify({ variant, step: STEPS[step], locked, ...config }, null, 2)}</pre></details><p className="pb-session-note">Dữ liệu chỉ giữ trong lần mở này. Tải lại trang sẽ về mẫu ban đầu.</p></main>{import.meta.env.DEV && <PrototypeSwitcher variant={variant} change={change} />}<AnimatePresence>{confirm && <motion.div className="pb-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirm(false)}><motion.div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="pb-confirm-title" aria-describedby="pb-confirm-copy" className="pb-modal" initial={reduced ? false : { scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.97, opacity: 0 }} onClick={(event) => event.stopPropagation()}><div className="pb-modal-heading"><LockKeyhole size={24} /><Button label="Đóng xác nhận" onClick={() => setConfirm(false)}><X size={18} /></Button></div><h2 id="pb-confirm-title">Chốt thể thức một lần?</h2><p id="pb-confirm-copy">{config.name}. Sau khi chốt, không đổi bảng, BO, nhánh hoặc luật đi tiếp. Lịch vẫn chỉnh được.</p><Review config={config} locked={false} /><footer><Button onClick={() => setConfirm(false)}>Quay lại kiểm tra</Button><Button primary onClick={lock}><Check size={16} /> Xác nhận chốt</Button></footer></motion.div></motion.div>}</AnimatePresence>{toast && <SwipeToast key={toast} open title={toast} description="Bản thử giao diện · Không lưu vào hệ thống" onClose={() => setToast(null)} duration={3000} background="#272d23" color="#eceeea" fuseColor="#b6e36a" closeButton />}</div></MotionConfig>;
}
