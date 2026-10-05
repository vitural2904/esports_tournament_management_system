import { lazy, Suspense } from "react";
import LandingPage from "./components/LandingPage";

const TournamentBuilderPrototype = lazy(() => import("./components/TournamentBuilderPrototype"));
const VisualDashboard = lazy(() => import("./components/VisualDashboard"));
const OperationsApp = lazy(() => import("./components/OperationsApp"));

export default function App() {
  const query = new URLSearchParams(window.location.search);
  if (query.get("app") !== "operations" && query.get("app") !== "demo" && query.get("prototype") !== "builder") return <LandingPage />;
  return <Suspense fallback={<p role="status">Đang tải…</p>}>
    {query.get("app") === "operations" ? <OperationsApp /> : query.get("prototype") === "builder" ? <TournamentBuilderPrototype /> : <VisualDashboard />}
  </Suspense>;
}
