import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type CSSProperties,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronLeft,
  Clock3,
  Download,
  GitBranch,
  History,
  Layers2,
  Loader2,
  Maximize2,
  MoreHorizontal,
  Plus,
  Search,
  Share2,
  Sparkles,
  Undo2,
  UserRound,
  X,
} from "lucide-react";
import {
  addThought,
  approveSuggestion,
  connectThought,
  rebaseRoadmap,
  hasRoadmapChanges,
  emptyGraph,
  exampleGraph,
  importRoadmap,
  indexGraph,
  KINDS,
  rejectSuggestion,
  removeThought,
  uid,
  validateRoadmap,
  layoutRoadmap,
  validateSources,
  type Source,
  type Draft,
  type Kind,
  type Roadmap,
  type Suggestion,
  type MergeChoice,
} from "./model";
import { readDrafts, STORAGE_KEY } from "./storage";
import { api } from "./api";
import { LAYOUT_KEY, readArrangements, ownPosition, type Point } from "./layoutStorage";
import { ChangeSummary, MergeVersion, SourceLinks } from "./Review";
import "./workbench.css";

const Canvas = lazy(() => import("./Canvas"));
interface User {
  id: string;
  name: string;
}
interface Published {
  id: string;
  owner: string;
  ownerName: string;
  title: string;
  head: string;
  updated: string;
}
interface Revision {
  id: string;
  graph: Roadmap;
  authorName: string;
  note: string;
  created: string;
  parent: string | null;
}
interface Remote {
  argument: Published;
  revision: Revision;
}
interface Proposal {
  id: string;
  base: string;
  title: string;
  reason: string;
  graph: Roadmap;
  status: string;
  authorName: string;
  author: string;
  supersedes: string | null;
  superseded_by: string | null;
  review_note: string | null;
}
interface Queue {
  draftId: string;
  steps: Suggestion[];
}
type Panel =
  | null
  | "library"
  | "new"
  | "ai"
  | "auth"
  | "publish"
  | "history"
  | "changes"
  | "edit"
  | "map"
  | "share"
  | "rebase"
  | "connection";
function download(value: unknown, filename: string) {
  const url = URL.createObjectURL(
    new Blob(
      [typeof value === "string" ? value : JSON.stringify(value, null, 2)],
      { type: "application/json" },
    ),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Dialog({
  title,
  onClose,
  children,
  wide = false,
  className = "",
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const node = box.current;
    const focusableElements = () => Array.from(node?.querySelectorAll<HTMLElement>(
      "button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),a[href],summary",
    ) || []).filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0);
    const initial = focusableElements().find((element) => element.matches("input,textarea")) || focusableElements()[0];
    initial?.focus();
    const listener = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab" && node) {
        const focusable = focusableElements();
        const first = focusable[0],
          last = focusable.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener("keydown", listener);
    return () => {
      window.removeEventListener("keydown", listener);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="dialog-scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={box}
        className={`dialog ${wide ? "wide" : ""} ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header>
          <h2>{title}</h2>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={19} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
export default function Workbench() {
  const [initial] = useState(() => readDrafts(localStorage));
  const [initialLayouts] = useState(() => readArrangements(localStorage));
  const [arrangeVersion, setArrangeVersion] = useState(0);
  const [fitVersion, setFitVersion] = useState(0);
  const focusCardRef = useRef<HTMLElement>(null);
  const [sheetHeight, setSheetHeight] = useState(0);
  const [layouts, setLayouts] = useState(initialLayouts.layouts);
  const [editingSources, setEditingSources] = useState<Source[]>([]);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const restored =
    location.pathname === "/"
      ? initial.drafts.find((d) => d.id === initial.activeDraftId) ||
        initial.drafts.find((d) => d.id === initial.queue?.draftId) ||
        initial.drafts[0]
      : undefined;
  const [drafts, setDrafts] = useState<Draft[]>(initial.drafts),
    [active, setActive] = useState<string | null>(restored?.id || null),
    [remote, setRemote] = useState<Remote | null>(null);
  const [storageError, setStorageError] = useState(initial.error),
    [saved, setSaved] = useState(true);
  const [queue, setQueue] = useState<Queue | null>(initial.queue);
  const [selected, setSelected] = useState<string | null>(
      restored?.graph.anchor || null,
    ),
    [trail, setTrail] = useState<string[]>(
      restored?.graph.anchor ? [restored.graph.anchor] : [],
    ),
    [overview, setOverview] = useState(true),
    [panel, setPanel] = useState<Panel>(null),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const [user, setUser] = useState<User | null>(null),
    [authMode, setAuthMode] = useState<"login" | "register">("register");
  const [community, setCommunity] = useState<Published[]>([]),
    [libraryTab, setLibraryTab] = useState<"local" | "public">("local"),
    [revisions, setRevisions] = useState<Omit<Revision, "graph">[]>([]),
    [proposals, setProposals] = useState<Proposal[]>([]),
    [review, setReview] = useState<{
      proposal: Proposal;
      base: Roadmap;
      latest: Remote;
    } | null>(null);
  const [rebase, setRebase] = useState<{
    proposal: Proposal;
    base: Roadmap;
    latest: Remote;
    choices: Record<string, MergeChoice>;
  } | null>(null);
  const rebased = useMemo(
    () =>
      rebase
        ? rebaseRoadmap(
            rebase.base,
            rebase.proposal.graph,
            rebase.latest.revision.graph,
            rebase.choices,
          )
        : null,
    [rebase],
  );
  const [query, setQuery] = useState(""),
    [composer, setComposer] = useState(false),
    [nextText, setNextText] = useState("");
  const [provider, setProvider] = useState("openai"),
    [model, setModel] = useState("gpt-4.1-mini"),
    [key, setKey] = useState(""),
    [explanation, setExplanation] = useState("");
  const fileRef = useRef<HTMLInputElement>(null),
    undo = useRef<{ graph: Roadmap; queue: Queue | null }[]>([]),
    noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestDrafts = useRef(drafts);
  latestDrafts.current = drafts;
  const draft = drafts.find((d) => d.id === active),
    graph = draft?.graph || remote?.revision.graph || emptyGraph(),
    readonly = !draft,
    title = draft?.title || remote?.argument.title || "Your reasoning";
  const index = useMemo(() => indexGraph(graph), [graph]),
    thought = selected ? index.byId.get(selected) : undefined,
    next = index.children.get(selected || "") || [],
    parent = index.parents.get(selected || "") || [];
  useEffect(() => {
    const node = focusCardRef.current;
    if (!node) { setSheetHeight(0); return; }
    const measure = () => setSheetHeight(Math.ceil(node.getBoundingClientRect().height));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [thought?.id]);
  const connection = graph.edges.find((e) => e.id === selectedEdge);
  const manualPositions = useMemo(() => draft && Object.hasOwn(layouts, draft.id) ? layouts[draft.id] : Object.create(null), [draft?.id, layouts]);
  const defaultPositions = useMemo(() => layoutRoadmap(graph), [graph]);
  const defaultPosition = thought ? defaultPositions.get(thought.id) : undefined;
  useEffect(() => {
    if (panel === "edit") setEditingSources(thought?.sources ? structuredClone(thought.sources) : []);
  }, [panel, thought?.id]);
  const currentQueue = queue?.draftId === draft?.id ? queue : null,
    pending = currentQueue?.steps.find((s) => s.status === "pending"),
    argumentId = draft?.publishedId || remote?.argument.id;
  const reducedMotion = useMemo(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  const flash = (text: string) => {
    setNotice(text);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(""), 6500);
  };
  const close = () => setPanel(null);
  useEffect(() => {
    if (initial.error) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ drafts, queue, activeDraftId: active || undefined }),
      );
      setSaved(true);
      setStorageError(null);
    } catch {
      setSaved(false);
      setStorageError(
        "Saving failed. Your current work is still open. Export it before closing this page.",
      );
    }
  }, [drafts, queue, active, initial.error]);
  useEffect(() => {
    api<{ user: User | null }>("/session")
      .then((r) => setUser(r.user))
      .catch(() => {});
    const path = location.pathname.match(/^\/argument\/([^/]+)/);
    if (path)
      void openPublished(
        path[1],
        new URLSearchParams(location.search).get("revision") || undefined,
        false,
      );
  }, []);
  useEffect(
    () => () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    },
    [],
  );
  useEffect(() => {
    const listener = () => {
      const path = location.pathname.match(/^\/argument\/([^/]+)/);
      if (path)
        void openPublished(
          path[1],
          new URLSearchParams(location.search).get("revision") || undefined,
          false,
        );
      else {
        setRemote(null);
        setActive(null);
      }
    };
    window.addEventListener("popstate", listener);
    return () => window.removeEventListener("popstate", listener);
  }, []);
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch (e) {
      flash((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  function select(id: string) {
    setSelected(id);
    setComposer(false);
    setNextText("");
    setTrail((t) => (t.at(-1) === id ? t : [...t, id]));
  }
  function resetView(g: Roadmap) {
    setSelected(g.anchor);
    setTrail(g.anchor ? [g.anchor] : []);
    setOverview(true);
    undo.current = [];
    setComposer(false);
    setQuery("");
  }
  function openDraft(d: Draft) {
    setActive(d.id);
    setRemote(null);
    resetView(d.graph);
    setPanel(null);
    history.pushState({}, "", "/");
  }
  function makeDraft(g: Roadmap, name: string, extra: Partial<Draft> = {}) {
    const d: Draft = {
      id: uid(),
      title: name,
      graph: g,
      updated: new Date().toISOString(),
      ...extra,
    };
    setDrafts((ds) => [d, ...ds]);
    openDraft(d);
    return d;
  }
  function updateGraph(g: Roadmap, keepQueue = false) {
    if (!draft) return;
    const next = validateRoadmap(g);
    undo.current = [...undo.current.slice(-39), { graph: draft.graph, queue }];
    setDrafts((ds) =>
      ds.map((d) =>
        d.id === active
          ? { ...d, graph: next, updated: new Date().toISOString() }
          : d,
      ),
    );
    if (!keepQueue && queue?.draftId === active) {
      setQueue(null);
      flash("Pending AI review cleared because the map changed.");
    }
  }
  function savePositions(positions: Record<string, Point>) {
    if (!draft) return;
    if (initialLayouts.error) { flash(initialLayouts.error); return; }
    const nextLayouts = { ...layouts, [draft.id]: positions };
    setLayouts(nextLayouts);
    try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(nextLayouts)); }
    catch { flash("This arrangement could not be saved. Your argument is still saved separately."); }
  }
  function moveThought(id: string, position: Point) {
    if (!Number.isFinite(position.x) || !Number.isFinite(position.y) || Math.abs(position.x) > 1e8 || Math.abs(position.y) > 1e8) {
      flash("Choose a finite position between −100,000,000 and 100,000,000."); return;
    }
    savePositions({ ...manualPositions, [id]: position });
  }
  function undoChange() {
    const previous = undo.current.pop();
    if (!previous || !draft) return;
    setDrafts((ds) =>
      ds.map((d) => (d.id === active ? { ...d, graph: previous.graph } : d)),
    );
    setQueue(previous.queue);
    if (!previous.graph.nodes.some((n) => n.id === selected))
      setSelected(previous.graph.anchor);
    flash("Change undone.");
  }
  async function openPublished(id: string, revision?: string, navigate = true) {
    await run(async () => {
      const result = await api<Remote>(
        `/arguments/${encodeURIComponent(id)}${revision ? `?revision=${encodeURIComponent(revision)}` : ""}`,
      );
      result.revision.graph = validateRoadmap(result.revision.graph);
      setRemote(result);
      setActive(null);
      resetView(result.revision.graph);
      setPanel(null);
      if (navigate)
        history.pushState(
          {},
          "",
          `/argument/${id}${revision ? `?revision=${revision}` : ""}`,
        );
    });
  }
  function editPublished() {
    if (!remote) return;
    makeDraft(structuredClone(remote.revision.graph), remote.argument.title, {
      publishedId: remote.argument.id,
      revision:
        user?.id === remote.argument.owner
          ? remote.argument.head
          : remote.revision.id,
      ownerId: remote.argument.owner,
    });
    flash(
      "You are editing a private copy. Published work stays unchanged until reviewed or published.",
    );
  }
  async function openLibrary(tab: "local" | "public" = "local") {
    setLibraryTab(tab);
    setPanel("library");
    if (tab === "public")
      await run(async () =>
        setCommunity(
          (await api<{ arguments: Published[] }>("/arguments")).arguments,
        ),
      );
  }
  async function openHistory() {
    if (!argumentId) return;
    setPanel("history");
    await run(async () =>
      setRevisions(
        (
          await api<{ revisions: Omit<Revision, "graph">[] }>(
            `/arguments/${argumentId}/revisions`,
          )
        ).revisions,
      ),
    );
  }
  async function openChanges() {
    if (!argumentId) return;
    setReview(null);
    setPanel("changes");
    await run(async () =>
      setProposals(
        (
          await api<{ proposals: Proposal[] }>(
            `/arguments/${argumentId}/proposals`,
          )
        ).proposals,
      ),
    );
  }
  async function openProposal(proposal: Proposal) {
    if (!argumentId) return;
    await run(async () => {
      const [base, latest] = await Promise.all([
        api<Remote>(
          `/arguments/${argumentId}?revision=${encodeURIComponent(proposal.base)}`,
        ),
        api<Remote>(`/arguments/${argumentId}`),
      ]);
      setReview({ proposal, base: base.revision.graph, latest });
      setPanel("changes");
    });
  }
  async function updateProposal() {
    if (!review || !argumentId) return;
    await run(async () => {
      const latest = await api<Remote>(`/arguments/${argumentId}`);
      setRebase({
        proposal: review.proposal,
        base: review.base,
        latest,
        choices: {},
      });
      setPanel("rebase");
    });
  }
  function prepareUpdatedDraft(nextGraph: Roadmap) {
    if (!rebase) return;
    makeDraft(nextGraph, rebase.latest.argument.title, {
      publishedId: rebase.latest.argument.id,
      revision: rebase.latest.argument.head,
      ownerId: rebase.latest.argument.owner,
      replacesProposalId: rebase.proposal.id,
    });
    setRebase(null);
    flash(
      "Updated private draft ready. Review it, then submit your updated proposal. Nothing was published.",
    );
  }
  async function importFile(file: File) {
    try {
      const data = JSON.parse(await file.text());
      const g = importRoadmap(data);
      makeDraft(
        g,
        typeof data.title === "string"
          ? data.title
          : file.name.replace(/\.json$/, ""),
      );
      flash("Map imported. The original file was not changed.");
    } catch (e) {
      flash((e as Error).message);
    }
  }
  const visibleResults = query.trim()
    ? graph.nodes
        .filter((n) => n.text.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 12)
    : [];
  const proposalMode = !!draft?.publishedId && draft.ownerId !== user?.id;
  const viewBase = remote && remote.argument.head !== remote.revision.id;

  return (
    <div className="axiomer-app">
      <header className="app-header">
        <div className="brand-group">
          <button
            className="brand"
            onClick={() => void openLibrary()}
            aria-label="Open map library"
          >
            <GitBranch size={20} />
            <span>Axiomer</span>
          </button>
          <span className="header-divider" />
          {graph.nodes.length > 0 && (
            <div className="map-heading">
              <strong>{title}</strong>
              <span>
                {readonly
                  ? `by ${remote?.argument.ownerName}`
                  : saved
                    ? "Private draft · saved on this device"
                    : "Unsaved changes"}
              </span>
            </div>
          )}
        </div>
        <nav className="header-actions" aria-label="Map actions">
          <button className="quiet-button" onClick={() => void openLibrary()}>
            <Layers2 size={16} />
            <span>Library</span>
          </button>
          {graph.nodes.length > 0 && (
            <>
              <button
                className="quiet-button ai-trigger"
                onClick={() => {
                  if (!draft) {
                    flash("Make a private draft before using AI.");
                    return;
                  }
                  setPanel("ai");
                }}
              >
                <Sparkles size={16} />
                <span>Build with AI</span>
              </button>
              {draft ? (
                <button
                  className="primary-button compact"
                  onClick={() => {
                    if (!user) {
                      setAuthMode("register");
                      setPanel("auth");
                    } else setPanel("publish");
                  }}
                >
                  <Share2 size={15} />
                  <span>{proposalMode ? "Propose change" : "Publish"}</span>
                </button>
              ) : (
                <button
                  className="primary-button compact"
                  onClick={editPublished}
                >
                  <GitBranch size={15} />
                  <span>
                    {user?.id === remote?.argument.owner
                      ? "Edit draft"
                      : "Suggest a change"}
                  </span>
                </button>
              )}
            </>
          )}
          <button
            className="icon-button"
            onClick={() => setPanel("auth")}
            aria-label={user ? `Account: ${user.name}` : "Sign in"}
          >
            <UserRound size={18} />
          </button>
        </nav>
      </header>
      {storageError && (
        <div className="storage-warning" role="alert">
          <span>{storageError}</span>
          <button
            onClick={() =>
              download(
                initial.error
                  ? localStorage.getItem(STORAGE_KEY) || ""
                  : { drafts, queue },
                "axiomer-recovery.json",
              )
            }
          >
            Download backup
          </button>
          {initial.error && (
            <button
              onClick={() => {
                const raw = localStorage.getItem(STORAGE_KEY);
                if (raw)
                  localStorage.setItem(
                    `${STORAGE_KEY}.recovery.${Date.now()}`,
                    raw,
                  );
                localStorage.removeItem(STORAGE_KEY);
                location.reload();
              }}
            >
              Back up & reset
            </button>
          )}
        </div>
      )}
      {viewBase && (
        <div className="version-banner">
          You are reading an earlier revision.
          <button onClick={() => void openPublished(remote!.argument.id)}>
            Open latest
          </button>
        </div>
      )}
      {!graph.nodes.length ? (
        <main className="welcome">
          <div className="welcome-label">
            <span /> A clearer way to disagree
          </div>
          <h1>
            Every belief
            <br />
            has a <em>beginning.</em>
          </h1>
          <p>
            Start with what matters to you. Follow the reasons.
            <br className="desktop-break" /> Let others see how you got there.
          </p>
          <div className="welcome-actions">
            <button className="primary-button" onClick={() => setPanel("new")}>
              Start with a value <ArrowUpRight size={18} />
            </button>
            <button
              className="text-button"
              onClick={() =>
                makeDraft(exampleGraph(), "From well-being to a decision")
              }
            >
              Explore an example <ArrowRight size={16} />
            </button>
          </div>
          <div className="welcome-foot">
            <span>Write freely</span>
            <i />
            <span>Think in branches</span>
            <i />
            <span>Share your reasoning</span>
          </div>
          <button
            className="community-entry"
            onClick={() => void openLibrary("public")}
          >
            Browse published arguments <ArrowUpRight size={14} />
          </button>
        </main>
      ) : (
        <main className={`map-workspace ${thought ? "has-focus" : ""}`} style={{ "--thought-sheet-height": `${sheetHeight}px` } as CSSProperties}>
          <div className="map-canvas" aria-label="Reasoning map">
            <Suspense
              fallback={
                <div className="map-loading">
                  <Loader2 className="spin" />
                  Opening your map…
                </div>
              }
            >
              <Canvas
                key={draft?.id || remote?.revision.id}
                graph={graph}
                selected={selected}
                overview={overview}
                onSelect={select}
                reducedMotion={reducedMotion}
                editable={!readonly}
                manualPositions={manualPositions}
                arrangeVersion={arrangeVersion}
                fitVersion={fitVersion}
                onMove={moveThought}
                onConnect={(from, to) => {
                  try { updateGraph(connectThought(graph, from, to)); flash("Connection added."); }
                  catch (err) { flash((err as Error).message); }
                }}
                onEdgeSelect={(id) => { setSelectedEdge(id); setPanel("connection"); }}
              />
            </Suspense>
          </div>
          <div className="map-top-tools">
            <label className="map-search">
              <Search size={16} />
              <input
                aria-label="Search thoughts"
                placeholder="Find a thought…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button aria-label="Clear search" onClick={() => setQuery("")}>
                  <X size={14} />
                </button>
              )}
            </label>
            {query && (
              <div className="search-results">
                {visibleResults.length ? (
                  visibleResults.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => {
                        select(n.id);
                        setQuery("");
                      }}
                    >
                      {n.text}
                    </button>
                  ))
                ) : (
                  <p>No matching thoughts.</p>
                )}
              </div>
            )}
          </div>
          <div className="map-caption">
            <span className="live-dot" />
            {graph.nodes.length} thoughts <span>·</span> {graph.edges.length}{" "}
            connections
          </div>
          <div className="map-bottom-tools">
            <button
              className={overview ? "selected" : ""}
              onClick={() => { setOverview(true); setFitVersion((version) => version + 1); }}
            >
              <Maximize2 size={15} />
              Whole map
            </button>
            <button
              className={!overview ? "selected" : ""}
              onClick={() => {
                setOverview(false);
                if (!selected && graph.anchor) select(graph.anchor);
              }}
            >
              <BookOpen size={15} />
              Follow a path
            </button>
            {overview && !readonly && Object.keys(manualPositions).length > 0 && (
              <button onClick={() => { savePositions({}); setArrangeVersion((version) => version + 1); }} title="Restore the automatic reading layout on this device">Arrange</button>
            )}
          </div>
          <div className="map-more">
            <button
              className="icon-button"
              aria-label="More map actions"
              title="Map actions"
              onClick={() => setPanel("map")}
            >
              <MoreHorizontal size={20} />
            </button>
          </div>
          {thought && (
            <aside ref={focusCardRef} className="focus-card" aria-label="Selected thought">
              <header>
                <span className="eyebrow">
                  {graph.anchor === thought.id
                    ? "Starting value"
                    : thought.kind || "A step in your reasoning"}
                </span>
                <button
                  className="icon-button"
                  aria-label="Close thought"
                  onClick={() => {
                    setSelected(null);
                    setTrail([]);
                    setOverview(true);
                  }}
                >
                  <X size={17} />
                </button>
              </header>
              <p className="thought-content">{thought.text}</p>
              {!!thought.sources?.length && <div className="focus-sources"><span className="eyebrow">Sources</span><SourceLinks sources={thought.sources} /></div>}
              {!readonly && (
                <div className="thought-actions">
                  <button className="thought-edit-button" onClick={() => setPanel("edit")}>
                    Edit thought <ArrowUpRight size={14} />
                  </button>
                </div>
              )}
              {currentQueue && (
                <div className="review-progress">
                  <Sparkles size={14} />
                  {
                    currentQueue.steps.filter((s) => s.status === "accepted")
                      .length
                  }{" "}
                  approved ·{" "}
                  {
                    currentQueue.steps.filter((s) => s.status === "pending")
                      .length
                  }{" "}
                  to review
                  <button onClick={() => setPanel("ai")}>Review</button>
                </div>
              )}
              {next.length > 0 && (
                <div className="next-steps">
                  <span className="eyebrow">
                    {next.length > 1 ? "Choose a branch" : "Next step"}
                  </span>
                  {next.map((id, i) => (
                    <button key={id} onClick={() => select(id)}>
                      <span className="step-number">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span>{index.byId.get(id)?.text}</span>
                      <ArrowRight size={16} />
                    </button>
                  ))}
                </div>
              )}
              {!readonly &&
                (composer ? (
                  <form
                    className="step-composer"
                    onSubmit={(e) => {
                      e.preventDefault();
                      try {
                        const g = addThought(graph, nextText, thought.id);
                        updateGraph(g);
                        select(g.nodes.at(-1)!.id);
                      } catch (err) {
                        flash((err as Error).message);
                      }
                    }}
                  >
                    <label className="eyebrow" htmlFor="next-step">
                      What follows from this?
                    </label>
                    <textarea
                      id="next-step"
                      autoFocus
                      rows={3}
                      value={nextText}
                      onChange={(e) => setNextText(e.target.value)}
                      placeholder="Write the next reason. You can add labels later."
                    />
                    <div>
                      <button
                        type="button"
                        className="quiet-button"
                        onClick={() => setComposer(false)}
                      >
                        Cancel
                      </button>
                      <button
                        className="primary-button compact"
                        disabled={!nextText.trim()}
                      >
                        Add step <ArrowRight size={14} />
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    className="continue-button"
                    onClick={() => {
                      setComposer(true);
                      setNextText("");
                    }}
                  >
                    <Plus size={16} />
                    {next.length ? "Add another branch" : "Continue this step"}
                  </button>
                ))}
              <footer>
                <button
                  className="quiet-button"
                  disabled={!parent.length && trail.length < 2}
                  onClick={() => {
                    const prev =
                      trail.length > 1 ? trail[trail.length - 2] : parent[0];
                    if (prev) {
                      setTrail((t) => t.slice(0, -1));
                      setSelected(prev);
                      setComposer(false);
                    }
                  }}
                >
                  <ArrowLeft size={15} />
                  Back
                </button>
                <span>
                  {next.length
                    ? `${next.length} way${next.length > 1 ? "s" : ""} forward`
                    : "End of this path"}
                </span>
                <button
                  className="quiet-button"
                  disabled={next.length !== 1}
                  onClick={() => select(next[0])}
                >
                  Next
                  <ArrowRight size={15} />
                </button>
              </footer>
            </aside>
          )}
        </main>
      )}
      {notice && (
        <div className="toast" role="status">
          <span>{notice}</span>
          <button aria-label="Dismiss message" onClick={() => setNotice("")}>
            <X size={15} />
          </button>
        </div>
      )}
      {busy && (
        <div className="working" role="status">
          <Loader2 size={14} className="spin" />
          Working…
        </div>
      )}
      <input
        type="file"
        accept=".json,application/json"
        hidden
        ref={fileRef}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void importFile(file);
          e.target.value = "";
        }}
      />

      {panel === "new" && (
        <Dialog title="Start a reasoning map" onClose={close}>
          <form
            className="dialog-body form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              makeDraft(
                addThought(emptyGraph(), String(f.get("value")), null, "value"),
                String(f.get("title")),
              );
            }}
          >
            <p className="muted">What is the value you want to reason from?</p>
            <label>
              Map title
              <input
                name="title"
                required
                maxLength={200}
                placeholder="What are you exploring?"
              />
            </label>
            <label>
              Starting value
              <textarea
                name="value"
                required
                rows={3}
                maxLength={10000}
                placeholder="For example: reduce avoidable suffering."
              />
            </label>
            <button className="primary-button">
              Create map <ArrowRight size={16} />
            </button>
          </form>
        </Dialog>
      )}

      {panel === "library" && (
        <Dialog title="Your reasoning, connected" onClose={close} wide>
          <div className="dialog-body">
            <div className="library-toolbar">
              <div className="tabs">
                <button
                  className={libraryTab === "local" ? "selected" : ""}
                  onClick={() => setLibraryTab("local")}
                >
                  On this device
                </button>
                <button
                  className={libraryTab === "public" ? "selected" : ""}
                  onClick={() => void openLibrary("public")}
                >
                  Published
                </button>
              </div>
              <button
                className="primary-button compact"
                onClick={() => setPanel("new")}
              >
                <Plus size={15} />
                New map
              </button>
            </div>
            {libraryTab === "local" ? (
              <>
                <div className="map-library">
                  {drafts.map((d) => (
                    <button
                      className="library-card"
                      key={d.id}
                      onClick={() => openDraft(d)}
                    >
                      <GitBranch size={20} />
                      <h3>{d.title}</h3>
                      <p>
                        {d.graph.nodes.length} thoughts ·{" "}
                        {new Date(d.updated).toLocaleDateString()}
                      </p>
                      <ArrowUpRight size={16} />
                    </button>
                  ))}
                </div>
                {!drafts.length && (
                  <p className="empty-copy">
                    A blank page is a good place to begin. Create your first
                    map.
                  </p>
                )}
                <div className="library-import">
                  <button
                    className="quiet-button"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Download size={15} />
                    Import JSON
                  </button>
                  <button
                    className="quiet-button"
                    onClick={() => {
                      let count = 0;
                      try {
                        const imported: Draft[] = [];
                        for (let i = 0; i < localStorage.length; i++) {
                          const k = localStorage.key(i)!;
                          if (k.startsWith("axiomer_graph_")) {
                            const graph = importRoadmap(
                              JSON.parse(localStorage.getItem(k)!),
                            );
                            imported.push({
                              id: uid(),
                              title: `Earlier map: ${k.slice(14)}`,
                              graph,
                              updated: new Date().toISOString(),
                            });
                            count++;
                          }
                        }
                        setDrafts((ds) => [...ds, ...imported]);
                        flash(
                          count
                            ? `${count} earlier maps copied. Original storage was preserved.`
                            : "No earlier maps were found on this device.",
                        );
                      } catch (e) {
                        flash(
                          `Import stopped; originals preserved. ${(e as Error).message}`,
                        );
                      }
                    }}
                  >
                    Import earlier Axiomer maps
                  </button>
                </div>
              </>
            ) : (
              <div className="map-library">
                {community.map((a) => (
                  <button
                    key={a.id}
                    className="library-card"
                    onClick={() => void openPublished(a.id)}
                  >
                    <GitBranch size={20} />
                    <h3>{a.title}</h3>
                    <p>by {a.ownerName}</p>
                    <ArrowUpRight size={16} />
                  </button>
                ))}
                {!community.length && (
                  <p className="empty-copy">
                    No arguments have been published on this service yet.
                  </p>
                )}
              </div>
            )}
          </div>
        </Dialog>
      )}

      {panel === "connection" && connection && (
        <Dialog title={readonly ? "Connection" : "Edit connection"} onClose={close}>
          <form className="dialog-body form-stack" key={connection.id} onSubmit={(e) => {
            e.preventDefault();
            if (readonly) return;
            const label = String(new FormData(e.currentTarget).get("label") || "").trim();
            try {
              const edited = { ...graph, edges: graph.edges.map((edge) => edge.id === connection.id ? { ...edge, label } : edge) };
              if (hasRoadmapChanges(graph, edited)) updateGraph(edited);
              close();
            }
            catch (err) { flash((err as Error).message); }
          }}>
            <p className="connection-path">{index.byId.get(connection.from)?.text}<ArrowRight size={16} aria-label="leads to" />{index.byId.get(connection.to)?.text}</p>
            {connection.semantic && <p className="muted">Original relationship: {index.byId.get(connection.semantic.from)?.text} — {connection.semantic.type} → {index.byId.get(connection.semantic.to)?.text}</p>}
            {readonly ? <p>{connection.label || "Next step"}</p> : <>
              <label>Relationship <input name="label" maxLength={100} defaultValue={connection.label} placeholder="For example: supports, challenges, therefore" /></label>
              <button className="primary-button">Save connection</button>
              <button type="button" className="danger-button" onClick={() => {
                updateGraph({ ...graph, edges: graph.edges.filter((e) => e.id !== connection.id) });
                close(); flash("Connection removed. Thoughts kept. Undo is available.");
              }}>Remove connection</button>
            </>}
          </form>
        </Dialog>
      )}

      {panel === "edit" && thought && !readonly && (
        <Dialog title="Edit thought" onClose={close} className="quick-edit-dialog">
              <form
                className="quick-edit-form"
                key={thought.id}
                onInvalid={(event) => { const details = (event.target as HTMLElement).closest("details"); if (details) details.open = true; }}
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  try {
                    const edited = validateRoadmap({
                      ...graph,
                      nodes: graph.nodes.map((n) =>
                        n.id === thought.id
                          ? {
                              ...n,
                              text: String(f.get("text")).trim(),
                              kind: (f.get("kind") || null) as Kind | null,
                              sources: validateSources(editingSources),
                            }
                          : n,
                      ),
                    });
                    if (hasRoadmapChanges(graph, edited)) updateGraph(edited);
                    const x = Number(f.get("position-x")), y = Number(f.get("position-y"));
                    const currentPosition = ownPosition(manualPositions, thought.id) || defaultPosition;
                    if (currentPosition && (x !== currentPosition.x || y !== currentPosition.y)) moveThought(thought.id, { x, y });
                    close();
                  } catch (err) {
                    flash((err as Error).message);
                  }
                }}
              >
                <div className="quick-edit-scroll form-stack">
                <label>
                  Your thought
                  <textarea
                    name="text"
                    defaultValue={thought.text}
                    required
                    rows={4}
                  />
                </label>
                <details className="editor-options label-options">
                  <summary>Optional label</summary>
                <label>
                  Optional label
                  <select name="kind" defaultValue={thought.kind || ""}>
                    <option value="">No label</option>
                    {KINDS.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </label>
                </details>
                <details className="editor-options source-options">
                  <summary>Sources <span>{editingSources.length || ""}</span></summary>
                <fieldset className="source-editor">
                  <legend>Sources</legend>
                  {editingSources.map((source, i) => (
                    <div className="source-fields" key={source.id}>
                      <label>Title<input name={`source-title-${i}`} value={source.title} maxLength={300} required onChange={(e) => setEditingSources((sources) => sources.map((v) => v.id === source.id ? { ...v, title: e.target.value } : v))} /></label>
                      <label>Link<input name={`source-url-${i}`} type="url" value={source.url} maxLength={2048} placeholder="https://…" required onChange={(e) => setEditingSources((sources) => sources.map((v) => v.id === source.id ? { ...v, url: e.target.value } : v))} /></label>
                      <label>Page or section <span className="muted">(optional)</span><input name={`source-locator-${i}`} value={source.locator || ""} maxLength={500} onChange={(e) => setEditingSources((sources) => sources.map((v) => v.id === source.id ? { ...v, locator: e.target.value } : v))} /></label>
                      <button type="button" className="quiet-button" onClick={() => setEditingSources((sources) => sources.filter((v) => v.id !== source.id))}>Remove source {i + 1}</button>
                    </div>
                  ))}
                  <button type="button" className="quiet-button" disabled={editingSources.length >= 20} onClick={() => setEditingSources((sources) => [...sources, { id: uid(), title: "", url: "" }])}><Plus size={14} /> Add source</button>
                </fieldset>
                </details>
                <details className="editor-options position-editor">
                  <summary>Position on this device</summary>
                  <div className="position-fields">
                    <label>X<input name="position-x" type="number" min={-1e8} max={1e8} step="any" defaultValue={ownPosition(manualPositions, thought.id)?.x ?? defaultPosition?.x ?? 0} /></label>
                    <label>Y<input name="position-y" type="number" min={-1e8} max={1e8} step="any" defaultValue={ownPosition(manualPositions, thought.id)?.y ?? defaultPosition?.y ?? 0} /></label>
                  </div>
                </details>
                <details className="editor-options connection-options">
                  <summary>Connections & actions</summary>
                  <div className="form-stack">
                <button
                  type="button"
                  className="quiet-button"
                  onClick={() => {
                    updateGraph({ ...graph, anchor: thought.id });
                    close();
                    flash("This is now the map’s starting point.");
                  }}
                >
                  Use as starting point
                </button>
                <label>
                  Connect to an existing thought
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value)
                        try {
                          updateGraph(
                            connectThought(graph, thought.id, e.target.value),
                          );
                          close();
                        } catch (err) {
                          flash((err as Error).message);
                        }
                    }}
                  >
                    <option value="" disabled>
                      Choose a thought…
                    </option>
                    {graph.nodes
                      .filter((n) => n.id !== thought.id)
                      .map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.text.slice(0, 80)}
                        </option>
                      ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => {
                    updateGraph(removeThought(graph, thought.id));
                    setSelected(null);
                    close();
                    flash(
                      "Thought removed. Other thoughts were kept. Undo is available.",
                    );
                  }}
                >
                  Remove this thought
                </button>
                  </div>
                </details>
                </div>
                <footer className="quick-edit-footer">
                  <button type="button" className="quiet-button" onClick={close}>Cancel</button>
                  <button className="primary-button">Save thought</button>
                </footer>
              </form>
        </Dialog>
      )}

      {panel === "map" && (
        <Dialog title="Map actions" onClose={close} className="map-actions-dialog">
          <div className="dialog-body form-stack">
            {!readonly && (
              <button
                className="quiet-button"
                onClick={() => {
                  undoChange();
                  close();
                }}
                disabled={!undo.current.length}
              >
                <Undo2 size={16} />
                Undo last change
              </button>
            )}
            <button
              className="quiet-button"
              onClick={() => download({ title, graph }, "axiomer-map.json")}
            >
              <Download size={16} />
              Export a portable copy
            </button>
            {argumentId && (
              <>
                <button
                  className="quiet-button"
                  onClick={() => void openHistory()}
                >
                  <History size={16} />
                  Version history
                </button>
                <button
                  className="quiet-button"
                  onClick={() => void openChanges()}
                >
                  <GitBranch size={16} />
                  Proposed changes
                </button>
                <button
                  className="quiet-button"
                  onClick={() => setPanel("share")}
                >
                  <Share2 size={16} /> Share published argument
                </button>
              </>
            )}
            {readonly && (
              <button className="primary-button" onClick={editPublished}>
                Make an editable draft
              </button>
            )}
          </div>
        </Dialog>
      )}

      {panel === "auth" && (
        <Dialog
          title={
            user
              ? `Signed in as ${user.name}`
              : authMode === "register"
                ? "Join the conversation"
                : "Welcome back"
          }
          onClose={close}
        >
          {user ? (
            <div className="dialog-body form-stack">
              <p>
                Your local drafts stay on this device. Publishing makes an
                argument public.
              </p>
              <button
                className="quiet-button"
                onClick={() =>
                  void run(async () => {
                    await api("/logout", {});
                    setUser(null);
                    close();
                    setKey("");
                    flash(
                      "Signed out. Provider key cleared from this session.",
                    );
                  })
                }
              >
                Sign out
              </button>
            </div>
          ) : (
            <form
              className="dialog-body form-stack"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void run(async () => {
                  const result = await api<{ user: User }>(
                    authMode === "register" ? "/register" : "/login",
                    { name: f.get("name"), password: f.get("password") },
                  );
                  setUser(result.user);
                  close();
                  flash("Signed in. Your private draft is unchanged.");
                });
              }}
            >
              <p className="muted">
                Reading is open to everyone. Sign in to publish and propose
                changes. This release uses usernames; password recovery is not
                yet available.
              </p>
              <label>
                Username
                <input
                  name="name"
                  required
                  minLength={3}
                  maxLength={40}
                  pattern="[a-zA-Z0-9_-]+"
                  autoComplete="username"
                />
              </label>
              <label>
                Password
                <input
                  name="password"
                  type="password"
                  required
                  minLength={authMode === "register" ? 10 : 1}
                  autoComplete={
                    authMode === "register"
                      ? "new-password"
                      : "current-password"
                  }
                />
              </label>
              <button className="primary-button" disabled={busy}>
                {authMode === "register" ? "Create account" : "Sign in"}
              </button>
              <button
                type="button"
                className="text-button"
                onClick={() =>
                  setAuthMode(authMode === "register" ? "login" : "register")
                }
              >
                {authMode === "register"
                  ? "Already have an account? Sign in"
                  : "New here? Create an account"}
              </button>
            </form>
          )}
        </Dialog>
      )}

      {panel === "publish" && draft && (
        <Dialog
          title={
            proposalMode ? "Propose a correction" : "Publish your reasoning"
          }
          onClose={close}
        >
          <form
            className="dialog-body form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void run(async () => {
                if (proposalMode) {
                  const result = await api<{ id: string }>(
                    `/arguments/${draft.publishedId}/proposals`,
                    {
                      graph,
                      title: f.get("title"),
                      reason: f.get("note"),
                      baseRevision: draft.revision,
                      replacesProposalId: draft.replacesProposalId,
                    },
                  );
                  setDrafts((ds) =>
                    ds.map((d) =>
                      d.id === draft.id
                        ? { ...d, replacesProposalId: result.id }
                        : d,
                    ),
                  );
                  close();
                  flash(
                    "Change proposed. The published argument has not been modified.",
                  );
                } else {
                  const result = await api<{ id: string; revision: string }>(
                    "/arguments",
                    {
                      id: draft.publishedId,
                      baseRevision: draft.revision,
                      title: f.get("title"),
                      graph,
                      note: f.get("note"),
                    },
                  );
                  setDrafts((ds) =>
                    ds.map((d) =>
                      d.id === draft.id
                        ? {
                            ...d,
                            publishedId: result.id,
                            revision: result.revision,
                            ownerId: user!.id,
                            title: String(f.get("title")),
                          }
                        : d,
                    ),
                  );
                  close();
                  flash(
                    "Published. Choose a latest-version or fixed-version link from map tools.",
                  );
                }
              });
            }}
          >
            <p className="muted">
              {proposalMode
                ? "Your submitted proposal, graph and explanation will be publicly readable. Only the owner can accept or decline it."
                : "Your map will be publicly readable. Each update keeps the previous revision."}
            </p>
            <label>
              {proposalMode ? "Change title" : "Argument title"}
              <input
                name="title"
                required
                maxLength={200}
                defaultValue={proposalMode ? "Clarify the reasoning" : title}
              />
            </label>
            <label>
              {proposalMode ? "Why are you proposing this?" : "What changed?"}
              <textarea
                name="note"
                required
                maxLength={2000}
                rows={3}
                placeholder={
                  proposalMode
                    ? "Explain the correction."
                    : "For example: first published version."
                }
              />
            </label>
            <button className="primary-button" disabled={busy}>
              {proposalMode
                ? draft.replacesProposalId
                  ? "Submit updated proposal"
                  : "Submit proposal"
                : "Publish revision"}
              <ArrowUpRight size={16} />
            </button>
          </form>
        </Dialog>
      )}

      {panel === "history" && argumentId && (
        <Dialog title="How the argument developed" onClose={close}>
          <div className="dialog-body revision-list">
            {revisions.map((r) => (
              <button
                key={r.id}
                onClick={() => void openPublished(argumentId, r.id)}
              >
                <Clock3 size={17} />
                <div>
                  <strong>{r.note}</strong>
                  <span>
                    {r.authorName} · {new Date(r.created).toLocaleString()}
                  </span>
                </div>
                <ArrowUpRight size={16} />
              </button>
            ))}
            {!revisions.length && <p className="muted">No revisions loaded.</p>}
          </div>
        </Dialog>
      )}

      {panel === "changes" && argumentId && (
        <Dialog title="Proposed changes" onClose={close} wide>
          <div className="dialog-body">
            {review ? (
              <>
                <button
                  className="quiet-button"
                  onClick={() => setReview(null)}
                >
                  <ChevronLeft size={15} />
                  All proposals
                </button>
                <h3>{review.proposal.title}</h3>
                <p>{review.proposal.reason}</p>
                <p className="muted">
                  By {review.proposal.authorName} · {review.proposal.status}
                </p>
                <ChangeSummary
                  before={review.base}
                  after={review.proposal.graph}
                />
                {review.proposal.status === "pending" &&
                  review.proposal.base !== review.latest.argument.head && (
                    <p className="inline-warning" role="status">
                      The argument has changed since this proposal. Its author
                      can compare the latest version and submit an update before
                      it can be accepted.
                    </p>
                  )}
                {review.proposal.status === "pending" &&
                  user?.id === review.proposal.author && (
                    <button
                      className="primary-button"
                      onClick={() => void updateProposal()}
                      disabled={busy}
                    >
                      Update my proposal
                    </button>
                  )}
                {review.proposal.superseded_by && (
                  <button
                    className="quiet-button"
                    onClick={() => {
                      const updated = proposals.find(
                        (p) => p.id === review.proposal.superseded_by,
                      );
                      if (updated) void openProposal(updated);
                    }}
                  >
                    View updated proposal
                  </button>
                )}
                {review.proposal.supersedes && (
                  <p className="muted">
                    This updates an earlier proposal. Its original graph and
                    explanation remain in the proposal history.
                  </p>
                )}

                {review.proposal.review_note && (
                  <p>Reviewer: {review.proposal.review_note}</p>
                )}
                {review.proposal.status === "pending" &&
                  user?.id === (remote?.argument.owner || draft?.ownerId) && (
                    <form
                      className="form-stack"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget);
                        const decision = (
                          e.nativeEvent as SubmitEvent
                        ).submitter?.getAttribute("value");
                        void run(async () => {
                          await api(`/proposals/${review.proposal.id}/review`, {
                            decision,
                            note: f.get("note"),
                          });
                          await openPublished(argumentId);
                          flash(
                            decision === "accept"
                              ? "Proposal accepted as a new attributed revision."
                              : "Proposal declined. The current argument is unchanged.",
                          );
                        });
                      }}
                    >
                      <label>
                        Review note
                        <textarea name="note" rows={2} />
                      </label>
                      <div className="button-row">
                        <button
                          name="decision"
                          value="accept"
                          className="primary-button"
                          disabled={
                            busy ||
                            review.proposal.base !== review.latest.argument.head
                          }
                        >
                          Accept change
                        </button>
                        <button
                          name="decision"
                          value="decline"
                          className="quiet-button"
                          disabled={busy}
                        >
                          Decline
                        </button>
                      </div>
                    </form>
                  )}
              </>
            ) : (
              <div className="revision-list">
                {proposals.map((p) => (
                  <button key={p.id} onClick={() => void openProposal(p)}>
                    <GitBranch size={17} />
                    <div>
                      <strong>{p.title}</strong>
                      <span>
                        {p.authorName} · {p.status}
                      </span>
                    </div>
                    <ArrowRight size={16} />
                  </button>
                ))}
                {!proposals.length && (
                  <p className="empty-copy">
                    No proposed changes yet. Readers can suggest a change from
                    the published argument.
                  </p>
                )}
              </div>
            )}
          </div>
        </Dialog>
      )}

      {panel === "share" && argumentId && (
        <Dialog title="Share your reasoning" onClose={close}>
          <div className="dialog-body form-stack">
            <p className="muted">
              Anyone can read published arguments and submitted proposals. These
              links share published work; private draft edits are not included.
            </p>
            {[
              {
                label: "Latest version",
                note: "Follows future published changes.",
                url: `${location.origin}/argument/${argumentId}`,
              },
              {
                label: "This published revision",
                note: "Keeps this exact version for a discussion or citation.",
                url: `${location.origin}/argument/${argumentId}?revision=${remote?.revision.id || draft?.revision}`,
              },
            ].map((link) => (
              <section className="share-link-row" key={link.label}>
                <h3>{link.label}</h3>
                <p className="muted">{link.note}</p>
                <input
                  aria-label={`${link.label} link`}
                  readOnly
                  value={link.url}
                  onFocus={(e) => e.currentTarget.select()}
                />
                <button
                  className="quiet-button"
                  onClick={() =>
                    void navigator.clipboard
                      .writeText(link.url)
                      .then(() => flash(`${link.label} link copied.`))
                      .catch(() => flash("Select and copy the link above."))
                  }
                >
                  Copy {link.label.toLowerCase()} link
                </button>
              </section>
            ))}
          </div>
        </Dialog>
      )}

      {panel === "rebase" && rebase && rebased && (
        <Dialog title="Update your proposed changes" onClose={close} wide>
          <div className="dialog-body form-stack">
            <p className="muted">
              Compare your changes with the latest argument. Changes to
              different items are combined; changes to the same item need your
              choice. This only prepares a private draft.
            </p>
            <details>
              <summary>Your original changes</summary>
              <ChangeSummary
                before={rebase.base}
                after={rebase.proposal.graph}
              />
            </details>
            <details>
              <summary>Changes published since you started</summary>
              <ChangeSummary
                before={rebase.base}
                after={rebase.latest.revision.graph}
              />
            </details>
            {rebased.conflicts.map((conflict) => (
              <fieldset className="merge-conflict" key={conflict.key}>
                <legend>
                  {conflict.kind === "anchor"
                    ? "Starting value"
                    : conflict.kind === "thought"
                      ? "Thought"
                      : conflict.kind === "order"
                        ? "Branch reading order"
                        : "Connection"}
                  : choose a version
                </legend>
                <details>
                  <summary>Original version</summary>
                  <MergeVersion value={conflict.base} graph={rebase.base} />
                </details>
                <div className="merge-options">
                  {(["proposed", "latest"] as const).map((choice) => (
                    <label
                      className={conflict.choice === choice ? "selected" : ""}
                      key={choice}
                    >
                      <span>
                        <input
                          type="radio"
                          name={conflict.key}
                          aria-label={
                            choice === "proposed"
                              ? "Keep my proposed version"
                              : "Keep latest published version"
                          }
                          checked={conflict.choice === choice}
                          onChange={() =>
                            setRebase((r) =>
                              r
                                ? {
                                    ...r,
                                    choices: {
                                      ...r.choices,
                                      [conflict.key]: choice,
                                    },
                                  }
                                : null,
                            )
                          }
                        />
                        {choice === "proposed"
                          ? "My proposal"
                          : "Latest published"}
                      </span>
                      <MergeVersion
                        value={conflict[choice]}
                        graph={
                          choice === "proposed"
                            ? rebase.proposal.graph
                            : rebase.latest.revision.graph
                        }
                      />
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
            {rebased.conflicts.some((c) => !c.choice) && (
              <p role="status">
                Choose a version for each conflicting item to continue.
              </p>
            )}
            {rebased.error && (
              <p className="inline-warning" role="alert">
                These choices cannot form a valid map: {rebased.error}. Choose a
                different version, or start a separate draft from the latest map
                and reapply your changes. Your original proposal is preserved.
              </p>
            )}
            {rebased.graph && (
              <>
                <h3>Changes for the owner to review</h3>
                <ChangeSummary
                  before={rebase.latest.revision.graph}
                  after={rebased.graph}
                />
              </>
            )}
            <button
              className="primary-button"
              disabled={
                !rebased.graph ||
                !hasRoadmapChanges(rebase.latest.revision.graph, rebased.graph)
              }
              onClick={() =>
                rebased.graph && prepareUpdatedDraft(rebased.graph)
              }
            >
              Prepare updated draft
            </button>
            <button
              className="text-button"
              onClick={() =>
                prepareUpdatedDraft(
                  structuredClone(rebase.latest.revision.graph),
                )
              }
            >
              Start from latest and reapply manually
            </button>
          </div>
        </Dialog>
      )}

      {panel === "ai" && draft && (
        <Dialog title="Explain it. Build it together." onClose={close}>
          <div className="dialog-body form-stack">
            {pending ? (
              <>
                <p className="eyebrow">
                  One thought at a time ·{" "}
                  {
                    currentQueue!.steps.filter((s) => s.status === "pending")
                      .length
                  }{" "}
                  remaining
                </p>
                <div className="ai-proposal">
                  <p>{pending.text}</p>
                  <span>
                    Connects after:{" "}
                    {graph.nodes.find((n) => n.id === pending.parentId)?.text ||
                      (!pending.parentId
                        ? "New starting value"
                        : "A proposed step that needs approval first")}
                  </span>
                  <details>
                    <summary>Why this step?</summary>
                    <p>{pending.rationale}</p>
                    {pending.excerpt && (
                      <blockquote>{pending.excerpt}</blockquote>
                    )}
                  </details>
                </div>
                <textarea
                  aria-label="Edit proposed thought"
                  value={pending.text}
                  onChange={(e) =>
                    setQueue((q) =>
                      q
                        ? {
                            ...q,
                            steps: q.steps.map((s) =>
                              s.id === pending.id
                                ? { ...s, text: e.target.value }
                                : s,
                            ),
                          }
                        : null,
                    )
                  }
                  rows={3}
                />
                <div className="button-row">
                  <button
                    className="primary-button"
                    disabled={
                      !pending.text.trim() ||
                      (!!pending.parentId && !index.byId.has(pending.parentId))
                    }
                    onClick={() => {
                      try {
                        updateGraph(approveSuggestion(graph, pending), true);
                        setQueue((q) =>
                          q
                            ? {
                                ...q,
                                steps: q.steps.map((s) =>
                                  s.id === pending.id
                                    ? { ...s, status: "accepted" }
                                    : s,
                                ),
                              }
                            : null,
                        );
                        select(pending.id);
                      } catch (e) {
                        flash((e as Error).message);
                      }
                    }}
                  >
                    <Check size={16} />
                    Approve
                  </button>
                  <button
                    className="quiet-button"
                    onClick={() =>
                      setQueue((q) =>
                        q
                          ? {
                              ...q,
                              steps: rejectSuggestion(q.steps, pending.id),
                            }
                          : null,
                      )
                    }
                  >
                    <X size={16} />
                    Reject
                  </button>
                </div>
                <button
                  className="text-button"
                  onClick={() => {
                    setQueue(null);
                    flash(
                      "Unapproved suggestions discarded. Approved thoughts were kept.",
                    );
                  }}
                >
                  Discard remaining suggestions
                </button>
              </>
            ) : (
              <>
                <p className="muted">
                  Explain your value, perspective and reasons. The assistant
                  drafts a small path; you approve or reject every step and
                  connection. Nothing is published automatically.
                </p>
                {currentQueue && (
                  <div className="review-done">
                    {
                      currentQueue.steps.filter((s) => s.status === "accepted")
                        .length
                    }{" "}
                    approved ·{" "}
                    {
                      currentQueue.steps.filter((s) => s.status === "rejected")
                        .length
                    }{" "}
                    rejected ·{" "}
                    {
                      currentQueue.steps.filter((s) => s.status === "blocked")
                        .length
                    }{" "}
                    dependent steps skipped
                  </div>
                )}
                <form
                  className="form-stack"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const base = JSON.stringify(graph);
                    void run(async () => {
                      const result = await api<{ steps: Suggestion[] }>(
                        "/ai/draft",
                        {
                          provider,
                          model,
                          apiKey: key,
                          explanation,
                          graph,
                          selectedId: selected,
                        },
                      );
                      const latest = latestDrafts.current.find(
                        (d) => d.id === active,
                      );
                      if (!latest || JSON.stringify(latest.graph) !== base)
                        throw new Error(
                          "The map changed while the AI was drafting. Generate again.",
                        );
                      setQueue({ draftId: draft.id, steps: result.steps });
                    });
                  }}
                >
                  <label>
                    Your perspective
                    <textarea
                      required
                      rows={5}
                      maxLength={30000}
                      value={explanation}
                      onChange={(e) => setExplanation(e.target.value)}
                      placeholder="What matters to you, what do you believe, and why? Paste writing or use your device’s dictation."
                    />
                  </label>
                  <details className="provider-settings" open={!key}>
                    <summary>AI connection</summary>
                    <div className="form-stack">
                      <label>
                        Provider
                        <select
                          value={provider}
                          onChange={(e) => {
                            setProvider(e.target.value);
                            setModel(
                              e.target.value === "openai"
                                ? "gpt-4.1-mini"
                                : "claude-sonnet-4-6",
                            );
                          }}
                        >
                          <option value="openai">OpenAI</option>
                          <option value="anthropic">Anthropic</option>
                        </select>
                      </label>
                      <label>
                        Model ID
                        <input
                          required
                          value={model}
                          onChange={(e) => setModel(e.target.value)}
                        />
                      </label>
                      <label>
                        API key
                        <input
                          type="password"
                          autoComplete="off"
                          required
                          value={key}
                          onChange={(e) => setKey(e.target.value)}
                        />
                      </label>
                      <p className="fine-print">
                        Your explanation goes to this provider. Its API usage
                        may cost money. The key stays in this page’s memory and
                        passes through the Axiomer server for this request; it
                        is never saved with your maps.
                      </p>
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => setKey("")}
                      >
                        Disconnect & clear key
                      </button>
                    </div>
                  </details>
                  <button
                    className="primary-button"
                    disabled={busy || !key.trim() || !explanation.trim()}
                  >
                    <Sparkles size={16} />
                    {busy ? "Drafting…" : "Draft a path"}
                  </button>
                </form>
              </>
            )}
          </div>
        </Dialog>
      )}
      <a
        className="source-link"
        title="AGPL-3.0 source. This local working branch has not been pushed to GitHub."
        href="https://github.com/disguide/Axiomer"
        target="_blank"
        rel="noreferrer"
      >
        Open source · AGPL-3.0
      </a>
    </div>
  );
}
