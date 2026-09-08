import { Switch, Route, useLocation } from "wouter";
import Home from "@/pages/Home";
import Atlas from "@/atlas/Workspace";
import Dashboard from "@/pages/Dashboard";

export default function App() {
  const [location] = useLocation();
  if (window.location.hash.startsWith('#tree=')) return <Home />;
  return (
    <Switch>
      <Route path="/" component={Atlas} />
      <Route path="/legacy" component={Dashboard} />
      <Route path="/editor/:projectId/:branchId">{() => <Home key={location} />}</Route>
    </Switch>
  );
}
