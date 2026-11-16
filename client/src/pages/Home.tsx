import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { VStack } from "@astryxdesign/core/VStack";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { Banner } from "@astryxdesign/core/Banner";
import { Selector } from "@astryxdesign/core/Selector";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { ArrowLeft, Undo2, Redo2 } from "lucide-react";
import { useGraph } from "@/hooks/useGraph";
import { useProjects } from "@/hooks/useProjects";
import { indexGraph, selectVisibleGraph } from "@/lib/navigation";
import ArgumentView from "@/components/ArgumentView";
import ReasoningWorkbench, { type WorkbenchMode } from "@/components/ReasoningWorkbench";

const GraphMap = lazy(() => import("@/components/GraphMap"));
export default function Home() {
  const params = useParams<{ projectId: string; branchId: string }>();
  const [, navigate] = useLocation();
  const { projects, getProject, getBranch, createProject } = useProjects();
  const projectId = params?.projectId || "starter";
  const branchId = params?.branchId || "examples";
  const project = getProject(projectId);
  const branch = getBranch(projectId, branchId);
  const graphId = branch?.graphId || "default";
  const state = useGraph(graphId);
  const { graph, readOnly, loading, addRootQuestion, addNode, editNode, deleteNode, linkToExistingValue, verifySource, importGraph } = state;
  const [view, setView] = useState<"map" | "outline">(() => new URLSearchParams(location.search).get("view") === "outline" ? "outline" : "map");
  const [mode, setMode] = useState<WorkbenchMode | null>(null);
  const [attachParent, setAttachParent] = useState<string>();
  const [notice, setNotice] = useState("");
  const [outlineRoot, setOutlineRoot] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const title = state.error ? "Map unavailable" : state.shared?.title || project?.name || "Reasoning map";
  const index = useMemo(() => indexGraph(graph), [graph]);
  const outlineScope = useMemo(() => selectVisibleGraph(graph, index, { focusId: outlineRoot || (graph.nodes.length > 150 ? index.roots[0]?.id : undefined), depth: 5, maxNodes: 150 }), [graph, index, outlineRoot]);
  const savedMaps = projects.flatMap((p) => p.branches.filter((b) => b.graphId !== graphId).map((b) => ({ id: b.graphId, label: `${p.name} · ${b.name}` })));
  const notify = (message: string) => { setNotice(message); clearTimeout(timer.current); timer.current = setTimeout(() => setNotice(""), 5000); };
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const element = event.target as HTMLElement;
      if (element.closest("input,textarea,[contenteditable='true'],[role='dialog']")) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") { event.preventDefault(); if (event.shiftKey) state.redo(); else state.undo(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [state.undo, state.redo]);
  const saveCopy = () => {
    try {
      const copy = createProject(`${title} (copy)`, graph);
      navigate(`/editor/${copy.id}/${copy.branches[0].id}`);
    } catch { notify("Couldn't save a copy on this device. Download the snapshot instead."); }
  };
  return <VStack height="100dvh" gap={0} className="reasoning-editor">
    <VStack as="header" gap={2} padding={3} className="reasoning-header">
      <HStack gap={2} vAlign="center" hAlign="between">
        <Button label="Back to maps" href="/" isIconOnly variant="ghost" size="lg" icon={<Icon icon={ArrowLeft} />} />
        <VStack gap={0} className="reasoning-title">
          <Text type="label" maxLines={1}>{title}</Text>
          <Text type="supporting" color="secondary">{graph.nodes.length} thoughts · {state.error ? "original data kept" : state.shared ? "shared snapshot" : "saved on this device"}</Text>
        </VStack>
        <SegmentedControl label="Reasoning view" value={view} onChange={(v) => setView(v as typeof view)} size="lg">
          <SegmentedControlItem value="map" label="Map" />
          <SegmentedControlItem value="outline" label="Outline" />
        </SegmentedControl>
      </HStack>
      <HStack gap={2} hAlign="between" vAlign="center">
        <HStack gap={1}>
          <Button label="Undo" tooltip="Undo · ⌘/Ctrl Z" isIconOnly size="lg" icon={<Icon icon={Undo2} />} isDisabled={!state.canUndo} onClick={state.undo} />
          <Button label="Redo" tooltip="Redo · ⌘/Ctrl Shift Z" isIconOnly size="lg" icon={<Icon icon={Redo2} />} isDisabled={!state.canRedo} onClick={state.redo} />
        </HStack>
        <HStack gap={2}>
          <Button label="Framework" size="lg" onClick={() => setMode("home")} />
          <Button label="Share" size="lg" onClick={() => setMode("share")} />
        </HStack>
      </HStack>
    </VStack>
    {(state.error || state.saveError) && <Banner status="error" container="section" title={state.error || state.saveError} />}
    {state.shared && <Banner status="info" container="section" title="You're viewing a shared snapshot" description="Browsing this map does not change your saved maps." endContent={!state.publicMode && <Button label="Save an editable copy" onClick={saveCopy} />} />}
    <VStack as="main" gap={0} className="reasoning-main">
      {loading ? <Text>Loading map…</Text> : view === "map" ? <Suspense fallback={<Text>Loading map…</Text>}>
        <GraphMap graph={graph} onCreateRoot={readOnly ? undefined : addRootQuestion} onAddNode={readOnly ? undefined : addNode} onEditNode={readOnly ? undefined : editNode} onDeleteNode={readOnly ? undefined : deleteNode} onLinkValue={readOnly ? undefined : linkToExistingValue} onBuildArgument={readOnly ? undefined : () => setMode("guide")} onAttachTree={readOnly ? undefined : (id) => { setAttachParent(id); setMode("attach"); }} />
      </Suspense> : <VStack gap={4} padding={4} className="reasoning-outline">
        <HStack gap={2} hAlign="between" wrap="wrap"><Text type="large">Readable reasoning</Text>{!readOnly && <Button label="Build an argument" variant="primary" onClick={() => setMode("guide")} />}</HStack>
        <Text color="secondary">Read from a question through its reasons to the foundations underneath. Structural grounding does not mean a claim is true.</Text>
        <Selector label="Outline topic" value={outlineRoot} hasSearch options={[{ value: "", label: "Overview" }, ...graph.nodes.filter((n) => (index.children.get(n.id)?.length || 0) > 0).map((n) => ({ value: n.id, label: n.content }))]} onChange={setOutlineRoot} />
        {outlineScope.truncated && <Text color="secondary">Showing {outlineScope.graph.nodes.length} of {graph.nodes.length} thoughts, up to five levels deep. Choose a thought as the next outline topic to explore further.</Text>}
        <ArgumentView graph={outlineScope.graph} sourceGraph={graph} readOnly={readOnly} focusId={null} onSetFocus={() => {}} onAddNode={addNode} onLinkValue={linkToExistingValue} onEditNode={editNode} onDeleteNode={deleteNode} onVerifySource={verifySource} />
        {graph.nodes.length === 0 && <Text>Build your first argument, or switch to Map to start with a single thought.</Text>}
      </VStack>}
    </VStack>
    {notice && <HStack padding={3} gap={2} className="reasoning-notice" role="status"><Text>{notice}</Text><Button label="Dismiss" variant="ghost" onClick={() => setNotice("")} /></HStack>}
    <ReasoningWorkbench mode={mode} onMode={setMode} graph={graph} title={title} readOnly={readOnly} savedMaps={savedMaps} attachParent={attachParent} onApply={importGraph} onNotice={notify} receivedProfile={state.shared?.profile} />
  </VStack>;
}
