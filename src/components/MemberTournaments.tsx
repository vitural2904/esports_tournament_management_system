import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Tournament } from "../lib/api";
import MatchOperations from "./MatchOperations";

export default function MemberTournaments() {
  const [events, setEvents] = useState<Tournament[]>([]);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState("");
  useEffect(() => {
    let current = true;
    void api<{ tournaments: Tournament[] }>("/tournaments").then(result => { if (current) setEvents(result.tournaments); }).catch(problem => { if (current) setError(problem.message); }).finally(() => { if (current) setReady(true); });
    return () => { current = false; };
  }, []);
  return <><section className="op-panel"><h2>Chọn giải để ghi kết quả</h2>{error && <p role="alert" className="op-error">{error}</p>}{!ready ? <p>Đang tải…</p> : events.length ? <div className="op-event-list">{events.map(event => <button type="button" key={event.id} aria-pressed={selected === event.id} onClick={() => setSelected(event.id)}><strong>{event.name}</strong><span>referee · {event.lockedAt ? "Đã chốt thể thức" : "Đang chuẩn bị"}</span></button>)}</div> : <p>Chưa có giải đấu.</p>}</section>{selected && <MatchOperations key={selected} tournamentId={selected} />}</>;
}
