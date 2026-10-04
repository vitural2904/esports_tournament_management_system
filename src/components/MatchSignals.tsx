import { Activity, Check, CircleAlert, ClipboardCheck, Clock, ClockArrowUp, Minus, Pencil, TriangleAlert } from "lucide-react";
import type { MatchSignal, SignalLabel } from "../../shared/match-signals.mjs";
import "./MatchSignals.css";
const icons = { activity: Activity, check: Check, error: CircleAlert, clipboard: ClipboardCheck, clock: Clock, minus: Minus, pencil: Pencil, alert: TriangleAlert };
export function StatusLabel({ label }: { label: SignalLabel }) {
 const Icon = icons[label.icon];
 return <span className={`signal-label signal-${label.tone}`}><Icon size={16} aria-hidden="true" />{label.text}</span>;
}
export function MatchStatus({ signal, decision }: { signal: MatchSignal; decision?: boolean }) {
 return <span className="match-status"><StatusLabel label={signal.lifecycle} />{signal.attention ? <StatusLabel label={signal.attention} /> : decision ? <StatusLabel label={{ text: "Xử thắng cả trận", tone: "neutral", icon: "check" }} /> : signal.isNext ? <span className="signal-label signal-next"><ClockArrowUp size={16} aria-hidden="true" />Tiếp theo</span> : null}</span>;
}
export function MatchSchedule({ signal }: { signal: MatchSignal }) {
 return <span className="match-schedule"><span className={signal.isNext ? "signal-next" : "signal-neutral"}>{signal.scheduledAt === null ? null : <time dateTime={new Date(signal.scheduledAt).toISOString()}>{new Date(signal.scheduledAt).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</time>}{signal.isNext && <> · Tiếp theo</>}</span>{signal.schedule && <StatusLabel label={signal.schedule} />}</span>;
}
export function GameStatus({ state }: { state: "draft" | "submitted" | "confirmed" }) {
 return <StatusLabel label={state === "confirmed" ? { text: "Đã xác nhận", tone: "success", icon: "check" } : state === "submitted" ? { text: "Chờ xác nhận", tone: "attention", icon: "clipboard" } : { text: "Nháp", tone: "neutral", icon: "pencil" }} />;
}
