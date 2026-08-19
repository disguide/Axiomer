import { Switch, Route } from "wouter";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";

export default function App() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/editor/:projectId/:branchId" component={Home} />
    </Switch>
  );
}
