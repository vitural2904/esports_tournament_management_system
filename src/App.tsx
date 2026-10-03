import TournamentBuilderPrototype from "./components/TournamentBuilderPrototype";
import VisualDashboard from "./components/VisualDashboard";

export default function App() {
  return new URLSearchParams(window.location.search).get("prototype") === "builder"
    ? <TournamentBuilderPrototype />
    : <VisualDashboard />;
}
