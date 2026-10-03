import TournamentBuilderPrototype from "./components/TournamentBuilderPrototype";
import VisualDashboard from "./components/VisualDashboard";
import OperationsApp from "./components/OperationsApp";

export default function App() {
  if (new URLSearchParams(window.location.search).get("app") === "operations") return <OperationsApp />;
  return new URLSearchParams(window.location.search).get("prototype") === "builder"
    ? <TournamentBuilderPrototype />
    : <VisualDashboard />;
}
