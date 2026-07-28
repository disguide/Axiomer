import { Switch, Route } from "wouter";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import ProfileEditor from "@/pages/ProfileEditor";
import { GlobalProfileWidget } from "@/components/GlobalProfileWidget";

export default function App() {
  return (
    <>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/profile" component={ProfileEditor} />
        <Route path="/editor/:projectId/:branchId" component={Home} />
      </Switch>
      <GlobalProfileWidget />
    </>
  );
}
