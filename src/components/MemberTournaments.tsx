import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Tournament } from "../lib/api";
import DirectoryWorkspace from "./DirectoryWorkspace";
import FormatBuilder from "./FormatBuilder";
import MatchOperations from "./MatchOperations";

export default function MemberTournaments() {
  const [events, setEvents] = useState<Tournament[]>([]);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState("");
  const [directory, setDirectory] = useState(false);
  useEffect(() => {
    let current = true;
    void api<{ tournaments: Tournament[] }>("/tournaments").then(result => { if (current) setEvents(result.tournaments); }).catch(problem => { if (current) setError(problem.message); }).finally(() => { if (current) setReady(true); });
    return () => { current = false; };
  }, []);
  if (events.some(event => event.roles.includes("operator"))) return <><nav className="op-admin-nav" aria-label="Không gian làm việc"><button type="button" aria-current={!directory ? "page" : undefined} onClick={() => setDirectory(false)}>Giải đấu</button><button type="button" aria-current={directory ? "page" : undefined} onClick={() => setDirectory(true)}>Danh bạ</button></nav><DirectoryWorkspace key={String(directory)} directoryOnly={directory} /></>;
  return <><section className="op-panel"><h2>Giải đấu của bạn</h2>{error && <p role="alert" className="op-error">{error}</p>}{!ready ? <p>Đang tải…</p> : events.length ? <div className="op-event-list">{events.map(event => <button type="button" key={event.id} aria-pressed={selected === event.id} onClick={() => setSelected(event.id)}><strong>{event.name}</strong><span>Nhập liệu · {event.lockedAt ? "Đã chốt thể thức" : "Đang chuẩn bị"} · {event.registrations.length} đội</span></button>)}</div> : <p>Chưa có giải được cấp cho bạn.</p>}</section>{selected && <><MatchOperations key={`matches-${selected}`} tournamentId={selected} /><FormatBuilder key={selected} tournamentId={selected} onSaved={() => Promise.resolve()} /></>}</>;
}
