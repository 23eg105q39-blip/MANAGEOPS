import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Brain,
  Check,
  ChevronRight,
  CircleDot,
  Database,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import {
  Link,
  NavLink,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  analyzeIncident,
  createDemoIncident,
  createIncident,
  getDashboardStats,
  getIncident,
  listIncidents,
  recallMemory,
  submitFeedback,
  type DashboardStats,
  type Incident,
  type IncidentAnalysis,
  type Memory,
} from "./api";
import "./App.css";

type FormState = {
  title: string;
  service: string;
  environment: string;
  severity: Incident["severity"];
  error: string;
  logs: string;
};
const emptyForm: FormState = {
  title: "",
  service: "Payment API",
  environment: "Production",
  severity: "HIGH",
  error: "",
  logs: "",
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" to="/">
          <span className="brand-mark">M</span>
          <span>
            <strong>MEMORYOPS</strong>
            <small>Incident intelligence</small>
          </span>
        </Link>
        <nav>
          <NavLink to="/" end>
            <Activity size={16} />
            Overview
          </NavLink>
          <NavLink to="/incidents">
            <AlertTriangle size={16} />
            Incidents
          </NavLink>
          <NavLink to="/memory">
            <Brain size={16} />
            Hindsight memory
          </NavLink>
        </nav>
        <div className="sidebar-status">
          <span className="pulse" />
          Services online
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}

function Header({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      {action}
    </header>
  );
}

function Dashboard() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [demoBusy, setDemoBusy] = useState("");
  const [syncState, setSyncState] = useState<"syncing" | "synced" | "offline">(
    "syncing",
  );
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const [items, values] = await Promise.all([
          listIncidents(),
          getDashboardStats(),
        ]);
        if (active) {
          setIncidents(items);
          setStats(values);
          setLastSynced(new Date());
          setSyncState("synced");
        }
      } catch {
        if (active) setSyncState("offline");
      }
    };
    void refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);
  async function loadDemo(scenario: "mongodb" | "redis") {
    setDemoBusy(scenario);
    try {
      const incident = await createDemoIncident(scenario);
      window.location.href = `/incidents/${incident.id}`;
    } finally {
      setDemoBusy("");
    }
  }
  const syncLabel =
    syncState === "syncing"
      ? "Syncing"
      : syncState === "offline"
        ? "Offline"
        : `Updated ${lastSynced?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
  return (
    <>
      <Header
        eyebrow="OPERATIONS / OVERVIEW"
        title="Incident command center"
        action={
          <span className={`sync-state ${syncState}`}>
            <i /> {syncLabel}
          </span>
        }
      />
      <section className="signal">
        <div className="signal-icon">
          <Brain size={19} />
        </div>
        <div>
          <strong>Hindsight memory is active</strong>
          <p>
            Recommendations improve when your team records what actually
            happened.
          </p>
        </div>
        <span className="live">
          <i /> POLLED 5S
        </span>
      </section>
      <section className="demo-bar">
        <div>
          <p className="eyebrow">DEMO SCENARIOS</p>
          <strong>Load a real incident into the queue</strong>
        </div>
        <button
          className="button ghost"
          disabled={Boolean(demoBusy)}
          onClick={() => loadDemo("mongodb")}
        >
          <Database size={13} />{" "}
          {demoBusy === "mongodb" ? "Loading..." : "MongoDB"}
        </button>
        <button
          className="button ghost"
          disabled={Boolean(demoBusy)}
          onClick={() => loadDemo("redis")}
        >
          <Activity size={13} /> {demoBusy === "redis" ? "Loading..." : "Redis"}
        </button>
      </section>
      <section className="metrics">
        <Metric
          label="Total incidents"
          value={stats?.totalIncidents ?? "—"}
          icon={<Database size={16} />}
        />
        <Metric
          label="Open incidents"
          value={stats?.openIncidents ?? "—"}
          icon={<AlertTriangle size={16} />}
        />
        <Metric
          label="Learned events"
          value={stats?.learningEvents ?? "—"}
          icon={<Brain size={16} />}
        />
        <Metric
          label="Failed approaches"
          value={stats?.failedApproaches ?? "—"}
          icon={<ShieldCheck size={16} />}
        />
      </section>
      <section className="dashboard-grid">
        <div className="panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">CURRENT QUEUE</p>
              <h2>Recent incidents</h2>
            </div>
            <Link to="/incidents">
              View all <ArrowRight size={13} />
            </Link>
          </div>
          {incidents.length === 0 ? (
            <Empty text="No incidents yet. Start the first learning loop." />
          ) : (
            incidents
              .slice(0, 6)
              .map((incident) => (
                <IncidentRow key={incident.id} incident={incident} />
              ))
          )}
        </div>
        <div className="panel learning-panel">
          <div className="panel-title">
            <div>
              <p className="eyebrow">DATABASE ACTIVITY</p>
              <h2>Learning records</h2>
            </div>
            <Brain size={18} color="#83a9ff" />
          </div>
          <div className="activity-summary">
            <ActivityRow
              label="Successful resolutions"
              value={stats?.successfulResolutions ?? "—"}
              tone="positive"
            />
            <ActivityRow
              label="Failed approaches"
              value={stats?.failedApproaches ?? "—"}
              tone="warning"
            />
            <ActivityRow
              label="Learning events"
              value={stats?.learningEvents ?? "—"}
              tone="neutral"
            />
          </div>
        </div>
      </section>
    </>
  );
}

function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <article className="metric">
      <span>
        {icon}
        {label}
      </span>
      <strong>{value}</strong>
      <small>
        {label === "Memory status"
          ? "Hindsight connection"
          : "From MongoDB records"}
      </small>
    </article>
  );
}
function ActivityRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: "positive" | "warning" | "neutral";
}) {
  return (
    <div className="activity-row">
      <span className={`activity-mark ${tone}`} />
      <strong>{label}</strong>
      <b>{value}</b>
    </div>
  );
}
function IncidentRow({ incident }: { incident: Incident }) {
  return (
    <Link className="incident-row" to={`/incidents/${incident.id}`}>
      <span className={`severity ${incident.severity.toLowerCase()}`}>
        {incident.severity}
      </span>
      <div>
        <strong>{incident.title}</strong>
        <small>
          {incident.service} · {incident.environment}
        </small>
      </div>
      <span className={`status ${incident.status.toLowerCase()}`}>
        {incident.status}
      </span>
      <ChevronRight size={15} />
    </Link>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="empty">
      <CircleDot size={20} />
      <p>{text}</p>
    </div>
  );
}

function NewIncident() {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const update = (key: keyof FormState, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const incident = await createIncident(form);
      navigate(`/incidents/${incident.id}`);
    } catch {
      setError("Could not create the incident. Check that the API is running.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Header
        eyebrow="INCIDENTS / NEW"
        title="Open an incident"
        action={
          <Link className="button ghost" to="/">
            Cancel
          </Link>
        }
      />
      <form className="form-panel" onSubmit={submit}>
        <div className="form-intro">
          <Brain size={21} />
          <div>
            <strong>Start the learning loop</strong>
            <p>
              Give MemoryOps enough context to search organizational memory.
            </p>
          </div>
        </div>
        <div className="form-grid">
          <label>
            Title
            <input
              required
              value={form.title}
              onChange={(event) => update("title", event.target.value)}
              placeholder="Payment API MongoDB timeout"
            />
          </label>
          <label>
            Service
            <input
              required
              value={form.service}
              onChange={(event) => update("service", event.target.value)}
            />
          </label>
          <label>
            Environment
            <select
              value={form.environment}
              onChange={(event) => update("environment", event.target.value)}
            >
              <option>Production</option>
              <option>Staging</option>
              <option>Development</option>
            </select>
          </label>
          <label>
            Severity
            <select
              value={form.severity}
              onChange={(event) => update("severity", event.target.value)}
            >
              <option>CRITICAL</option>
              <option>HIGH</option>
              <option>MEDIUM</option>
              <option>LOW</option>
            </select>
          </label>
          <label className="full">
            Error message
            <textarea
              required
              value={form.error}
              onChange={(event) => update("error", event.target.value)}
              placeholder="What is failing?"
              rows={4}
            />
          </label>
          <label className="full">
            Logs or supporting context
            <textarea
              value={form.logs}
              onChange={(event) => update("logs", event.target.value)}
              placeholder="Paste relevant logs, deployment details, or recent changes."
              rows={7}
            />
          </label>
        </div>
        {error && <p className="error-text">{error}</p>}
        <button className="button primary submit-button" disabled={busy}>
          {busy ? (
            "Creating..."
          ) : (
            <>
              Create and investigate <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>
    </>
  );
}

function EngineerFeedback({
  incident,
  busy,
  onSubmit,
}: {
  incident: Incident;
  busy: boolean;
  onSubmit: (payload: {
    outcome: "SUCCESS" | "FAILED";
    attemptedAction: string;
    actualRootCause: string;
    successfulResolution: string;
    engineerFeedback: string;
  }) => Promise<void>;
}) {
  const [outcome, setOutcome] = useState<"SUCCESS" | "FAILED">(
    incident.feedback?.outcome ?? "FAILED",
  );
  const [details, setDetails] = useState(
    incident.feedback?.engineerFeedback ?? "",
  );
  const [error, setError] = useState("");
  const submitted = Boolean(incident.feedback);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (outcome === "FAILED" && !details.trim()) {
      setError(
        "Describe what actually happened before submitting failed feedback.",
      );
      return;
    }
    setError("");
    await onSubmit({
      outcome,
      attemptedAction:
        incident.analysis?.recommendedActions[0]?.action ??
        "Followed the initial incident recommendation",
      actualRootCause: details || "The recommendation resolved the incident.",
      successfulResolution:
        details || "The recommendation resolved the incident.",
      engineerFeedback: details,
    });
  }
  return (
    <section className="feedback-section panel">
      <div className="panel-title">
        <div>
          <p className="eyebrow">ENGINEER FEEDBACK</p>
          <h2>Was the recommendation helpful?</h2>
        </div>
        <Brain size={18} color="#83a9ff" />
      </div>
      {submitted ? (
        <div className="feedback-recorded">
          <Check size={17} />
          <div>
            <strong>
              Feedback recorded. Hindsight has learned from this incident.
            </strong>
            <p>{incident.feedback?.engineerFeedback}</p>
          </div>
        </div>
      ) : (
        <form className="feedback-form" onSubmit={submit}>
          <div className="outcome-toggle">
            <button
              type="button"
              className={outcome === "SUCCESS" ? "selected success" : ""}
              onClick={() => setOutcome("SUCCESS")}
            >
              <Check size={15} /> SUCCESS
            </button>
            <button
              type="button"
              className={outcome === "FAILED" ? "selected failure" : ""}
              onClick={() => setOutcome("FAILED")}
            >
              <X size={15} /> FAILED
            </button>
          </div>
          <label>
            Tell the agent what actually happened...
            <textarea
              required={outcome === "FAILED"}
              rows={4}
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="The connection pool was healthy, so increasing the pool size did not solve the incident. The actual root cause was an incorrect MONGO_URI configuration after deployment. Remember this failed troubleshooting approach for future MongoDB timeout incidents."
            />
          </label>
          {error && <p className="error-text">{error}</p>}
          <button className="button primary" disabled={busy}>
            {busy ? "Submitting feedback..." : "Submit feedback"}
          </button>
        </form>
      )}
    </section>
  );
}

function IncidentDetail() {
  const { id = "" } = useParams();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [analysis, setAnalysis] = useState<IncidentAnalysis | undefined>();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [busy, setBusy] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState({
    outcome: "FAILED" as "SUCCESS" | "FAILED",
    attemptedAction: "",
    actualRootCause: "",
    successfulResolution: "",
    engineerFeedback: "",
  });
  async function refreshIncident() {
    const data = await getIncident(id);
    setIncident(data);
    setAnalysis(data.analysis);
  }
  useEffect(() => {
    refreshIncident().catch(() => setIncident(null));
  }, [id]);
  if (!incident) return <Empty text="Incident not found or still loading." />;
  async function runAnalysis() {
    setBusy(true);
    setMessage(
      "Searching Hindsight, then reasoning over historical experience...",
    );
    try {
      const result = await analyzeIncident(id);
      setIncident(result.incident);
      setAnalysis(result.analysis);
      setMemories(result.memories);
      setMessage(
        `Analysis complete. ${result.memoryCount} historical memories used.`,
      );
    } catch {
      setMessage(
        "Analysis unavailable. Check the backend and OpenAI account quota.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function teach(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await submitFeedback(id, feedback);
      setIncident(result.incident);
      setFeedbackOpen(false);
      setMessage(
        "Memory updated successfully. Future recalls can use this experience.",
      );
      await refreshIncident();
    } catch {
      setMessage("Learning could not be saved. Check Hindsight connectivity.");
    } finally {
      setBusy(false);
    }
  }
  async function submitInlineFeedback(
    payload: Parameters<typeof submitFeedback>[1],
  ) {
    setBusy(true);
    try {
      await submitFeedback(id, payload);
      await refreshIncident();
      const recalled = await recallMemory(
        `${incident?.service ?? "service"} incident root causes, failed approaches, and successful resolutions`,
      );
      setMemories(recalled.memories);
      setMessage(
        "Feedback recorded. Hindsight has learned from this incident.",
      );
    } catch {
      setMessage("Learning could not be saved. Check Hindsight connectivity.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Header
        eyebrow={`INCIDENTS / ${incident.id}`}
        title={incident.title}
        action={
          <Link className="button ghost" to="/incidents">
            Back to incidents
          </Link>
        }
      />
      <div className="incident-meta">
        <span className={`severity ${incident.severity.toLowerCase()}`}>
          {incident.severity}
        </span>
        <span>{incident.service}</span>
        <span>{incident.environment}</span>
        <span className={`status ${incident.status.toLowerCase()}`}>
          {incident.status}
        </span>
      </div>
      <div className="detail-grid">
        <section className="panel detail-main">
          <div className="panel-title">
            <div>
              <p className="eyebrow">AI ANALYSIS</p>
              <h2>Diagnosis and next steps</h2>
            </div>
            <button
              className="button primary"
              onClick={runAnalysis}
              disabled={busy}
            >
              <Sparkles size={15} />
              {busy ? "Reasoning..." : "Analyze incident"}
            </button>
          </div>
          {message && (
            <div className="notice">
              <Activity size={15} />
              {message}
            </div>
          )}
          {analysis ? (
            <AnalysisView analysis={analysis} />
          ) : (
            <Empty text="Run analysis to recall Hindsight memories and build a recommendation." />
          )}
          <EngineerFeedback
            incident={incident}
            busy={busy}
            onSubmit={submitInlineFeedback}
          />
          <div className="incident-evidence">
            <p className="eyebrow">CURRENT EVIDENCE</p>
            <h3>Error</h3>
            <pre>{incident.error}</pre>
            {incident.logs && (
              <>
                <h3>Logs</h3>
                <pre>{incident.logs}</pre>
              </>
            )}
          </div>
        </section>
        <aside className="panel memory-side">
          <div className="panel-title">
            <div>
              <p className="eyebrow">HINDSIGHT MEMORY</p>
              <h2>{memories.length} memories</h2>
            </div>
            <Brain size={18} color="#83a9ff" />
          </div>
          {memories.length ? (
            memories.map((memory) => (
              <article className="memory-card" key={memory.id}>
                <span>{memory.type}</span>
                <p>{memory.text}</p>
              </article>
            ))
          ) : (
            <Empty text="Memories recalled during analysis appear here." />
          )}
        </aside>
      </div>
      {analysis && (
        <section className="learning-banner">
          <div>
            <p className="eyebrow">ENGINEER FEEDBACK</p>
            <h2>Teach MemoryOps what really happened.</h2>
            <p>
              Record the outcome so the next recommendation can avoid failed
              approaches.
            </p>
          </div>
          <button
            className="button primary"
            onClick={() => setFeedbackOpen(true)}
          >
            <Brain size={15} /> Teach MemoryOps
          </button>
        </section>
      )}
      {(analysis || incident.feedback) && (
        <MemoryEvolution
          feedback={incident.feedback}
          memoryUsed={analysis?.memoryUsed ?? false}
          outcome={incident.feedback?.outcome}
        />
      )}
      {feedbackOpen && (
        <div className="modal-backdrop">
          <form className="modal" onSubmit={teach}>
            <button
              type="button"
              className="close"
              onClick={() => setFeedbackOpen(false)}
            >
              <X size={17} />
            </button>
            <p className="eyebrow">LEARNING EVENT</p>
            <h2>What happened in production?</h2>
            <div className="outcome-toggle">
              <button
                type="button"
                className={
                  feedback.outcome === "SUCCESS" ? "selected success" : ""
                }
                onClick={() =>
                  setFeedback((current) => ({ ...current, outcome: "SUCCESS" }))
                }
              >
                <Check size={15} /> Success
              </button>
              <button
                type="button"
                className={
                  feedback.outcome === "FAILED" ? "selected failure" : ""
                }
                onClick={() =>
                  setFeedback((current) => ({ ...current, outcome: "FAILED" }))
                }
              >
                <X size={15} /> Failed
              </button>
            </div>
            {[
              ["attemptedAction", "What action was attempted?"],
              ["actualRootCause", "What was the actual root cause?"],
              ["successfulResolution", "What solution worked?"],
              ["engineerFeedback", "What should the agent remember?"],
            ].map(([key, label]) => (
              <label key={key}>
                {label}
                <textarea
                  required
                  rows={2}
                  value={feedback[key as keyof typeof feedback]}
                  onChange={(event) =>
                    setFeedback((current) => ({
                      ...current,
                      [key]: event.target.value,
                    }))
                  }
                />
              </label>
            ))}
            <button className="button primary" disabled={busy}>
              {busy ? "Retaining memory..." : "Retain learning"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}

function MemoryEvolution({
  feedback,
  memoryUsed,
  outcome,
}: {
  feedback?: Incident["feedback"];
  memoryUsed: boolean;
  outcome?: "SUCCESS" | "FAILED";
}) {
  return (
    <section className="evolution panel">
      <div>
        <p className="eyebrow">MEMORY EVOLUTION</p>
        <h2>From first guess to team knowledge</h2>
      </div>
      <div className="evolution-track">
        <div className="evolution-step">
          <b>01</b>
          <strong>Initial recommendation</strong>
          <span>
            {memoryUsed ? "Historical context recalled" : "Generic diagnosis"}
          </span>
        </div>
        <ArrowRight size={17} />
        <div className="evolution-step">
          <b>02</b>
          <strong>Engineer feedback</strong>
          <span>
            {outcome
              ? `Marked ${outcome.toLowerCase()}`
              : "Waiting for outcome"}
          </span>
        </div>
        <ArrowRight size={17} />
        <div className="evolution-step">
          <b>03</b>
          <strong>Hindsight retained</strong>
          <span>
            {feedback ? "Root cause and fix stored" : "Waiting to teach memory"}
          </span>
        </div>
        <ArrowRight size={17} />
        <div className="evolution-step after">
          <b>04</b>
          <strong>Future recommendation</strong>
          <span>
            {feedback ? "Failed path can be avoided" : "Ready to improve"}
          </span>
        </div>
      </div>
    </section>
  );
}

function AnalysisView({ analysis }: { analysis: IncidentAnalysis }) {
  return (
    <div className="analysis">
      <p className="summary">{analysis.summary}</p>
      <p className="assessment">{analysis.severityAssessment}</p>
      <h3>Likely causes</h3>
      {analysis.likelyCauses.map((cause) => (
        <div className="cause" key={cause.cause}>
          <strong>{cause.cause}</strong>
          <span>{Math.round(cause.confidence * 100)}% confidence</span>
          <p>{cause.reason}</p>
        </div>
      ))}
      <h3>Recommended actions</h3>
      {analysis.recommendedActions.map((action) => (
        <div className="action" key={action.step}>
          <b>{action.step}</b>
          <div>
            <strong>{action.action}</strong>
            <p>{action.reason}</p>
          </div>
          <span>{action.risk} risk</span>
        </div>
      ))}
      {analysis.failedApproachesToAvoid.length > 0 && (
        <div className="avoid">
          <strong>Failed approaches to avoid</strong>
          {analysis.failedApproachesToAvoid.map((item) => (
            <p key={item}>× {item}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function Incidents() {
  const [items, setItems] = useState<Incident[]>([]);
  useEffect(() => {
    listIncidents().then(setItems);
  }, []);
  return (
    <>
      <Header
        eyebrow="INCIDENTS"
        title="Incident history"
        action={
          <Link className="button primary" to="/new-incident">
            <Plus size={16} /> New incident
          </Link>
        }
      />
      <div className="panel table-panel">
        {items.length ? (
          items.map((incident) => (
            <IncidentRow key={incident.id} incident={incident} />
          ))
        ) : (
          <Empty text="No incidents recorded yet." />
        )}
      </div>
    </>
  );
}
function Memory() {
  const [query, setQuery] = useState("");
  const [memories, setMemories] = useState<Memory[]>([]);
  const [busy, setBusy] = useState(false);
  async function search(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      setMemories((await recallMemory(query)).memories);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Header eyebrow="HINDSIGHT / RECALL" title="Organizational memory" />
      <form className="memory-search" onSubmit={search}>
        <Search size={18} />
        <input
          required
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search failed approaches, root causes, and resolutions..."
        />
        <button className="button primary">
          {busy ? "Searching..." : "Recall memory"}
        </button>
      </form>
      <div className="memory-results">
        <p className="eyebrow">{memories.length} MEMORIES FOUND</p>
        {memories.map((memory) => (
          <article className="panel memory-result" key={memory.id}>
            <span>{memory.type}</span>
            <p>{memory.text}</p>
          </article>
        ))}
        {!memories.length && (
          <Empty text="Search Hindsight to see what your organization has learned." />
        )}
      </div>
    </>
  );
}

export default function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/incidents" element={<Incidents />} />
        <Route path="/new-incident" element={<NewIncident />} />
        <Route path="/incidents/:id" element={<IncidentDetail />} />
        <Route path="/memory" element={<Memory />} />
      </Routes>
    </Shell>
  );
}
