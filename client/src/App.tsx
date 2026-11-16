import { useEffect, useState } from "react";
import { Switch, Route, useLocation } from "wouter";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";

export default function App() {
  const [path] = useLocation();
  const [hash, setHash] = useState(location.hash);
  useEffect(() => { const update = () => setHash(location.hash); window.addEventListener("hashchange", update); return () => window.removeEventListener("hashchange", update); }, []);
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/editor/:projectId/:branchId">{() => <Home key={path} />}</Route>
      <Route path="/shared">{() => <Home key={`${path}${hash}`} />}</Route>
    </Switch>
  );
}
