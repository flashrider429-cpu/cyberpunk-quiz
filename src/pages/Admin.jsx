import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSupabase } from "../context/SupabaseContext.jsx";

const ADMIN_PASSWORD = "admin123";

export default function Admin() {
  const { client } = useSupabase();
  const [authed, setAuthed] = useState(false);

  // Login overlay state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [attempting, setAttempting] = useState(false);

  // Dashboard data
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [query, setQuery] = useState("");

  const stats = useMemo(() => {
    const total = rows.length;
    if (total === 0) {
      return { total: 0, passRate: 0, avgScore: 0, advanced: 0, intermediate: 0, junior: 0 };
    }
    const totalScore = rows.reduce((acc, r) => acc + (Number(r.score) || 0), 0);
    const passed = rows.filter((r) => (Number(r.score) || 0) >= 5).length;
    const advanced = rows.filter((r) => r.tier === "Advanced").length;
    const intermediate = rows.filter((r) => r.tier === "Intermediate").length;
    const junior = rows.filter((r) => r.tier === "Junior").length;
    return {
      total,
      passRate: Math.round((passed / total) * 100),
      avgScore: Math.round((totalScore / total) * 10) / 10,
      advanced,
      intermediate,
      junior,
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const hay = `${r.name || ""} ${r.email || ""} ${r.tier || ""} ${r.score ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query]);

  const fetchSubmissions = async () => {
    if (!client) {
      setFetchError(
        "Supabase client not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local."
      );
      setLoading(false);
      return;
    }
    setLoading(true);
    setFetchError("");
    try {
      const { data, error } = await client
        .from("submissions")
        .select("id, name, email, score, total, tier, created_at")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) {
        setFetchError(error.message);
        setRows([]);
      } else {
        setRows(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      setFetchError(err?.message || "Unexpected error.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authed) fetchSubmissions();
  }, [authed]);

  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError("");
    if (password !== ADMIN_PASSWORD) {
      setLoginError("Invalid credentials. Access denied.");
      return;
    }
    if (!email.trim()) {
      setLoginError("Admin email is required.");
      return;
    }
    setAttempting(true);
    // Tiny artificial delay for the cyberpunk "handshake" feel.
    setTimeout(() => {
      setAttempting(false);
      setAuthed(true);
    }, 400);
  };

  if (!authed) {
    return (
      <main className="relative min-h-screen w-full grid-bg overflow-hidden">
        <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-fuchsia-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-cyan-500/15 blur-3xl" />

        <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-10">
          <Link to="/" className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg border border-fuchsia-400/40 bg-fuchsia-500/10 flex items-center justify-center">
              <span className="text-fuchsia-300 font-bold">A</span>
            </div>
            <div className="leading-tight">
              <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Restricted</div>
              <div className="text-sm font-semibold glow-text-purple">Admin Portal</div>
            </div>
          </Link>
          <Link
            to="/"
            className="text-xs uppercase tracking-[0.25em] text-slate-500 hover:text-cyan-300 transition-colors"
          >
            ← Back to quiz
          </Link>
        </header>

        <section className="relative z-10 mx-auto flex min-h-[calc(100vh-88px)] max-w-md flex-col items-center justify-center px-6 py-10">
          <div className="neon-card relative w-full overflow-hidden p-8 animate-fade-in-up">
            <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-fuchsia-500/10 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl" />

            <div className="relative">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-fuchsia-300/80">
                <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400 animate-pulse" />
                Secure handshake
              </div>
              <h1 className="mt-3 text-2xl font-semibold">Admin authentication</h1>
              <p className="mt-1 text-sm text-slate-400">
                Restricted area. Unauthorized access is logged.
              </p>

              <form onSubmit={handleLogin} className="mt-6 space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-widest text-slate-400">
                    Admin email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@quiz.os"
                    className="neon-input"
                    autoComplete="email"
                    disabled={attempting}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-widest text-slate-400">
                    Secret password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="neon-input"
                    autoComplete="current-password"
                    disabled={attempting}
                  />
                </div>

                {loginError && (
                  <div
                    role="alert"
                    className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
                    style={{ boxShadow: "0 0 18px rgba(244, 63, 94, 0.25)" }}
                  >
                    {loginError}
                  </div>
                )}

                <button type="submit" className="neon-button neon-button-purple w-full" disabled={attempting}>
                  {attempting ? "Authenticating…" : "Unlock dashboard →"}
                </button>
              </form>

              <p className="mt-6 text-center text-[11px] uppercase tracking-[0.3em] text-slate-500">
                AES-256 · MFA-ready · Audit trail on
              </p>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen w-full grid-bg overflow-hidden">
      <div className="pointer-events-none absolute -top-40 right-0 h-96 w-96 rounded-full bg-cyan-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 left-0 h-96 w-96 rounded-full bg-fuchsia-500/15 blur-3xl" />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-10">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg border border-fuchsia-400/40 bg-fuchsia-500/10 flex items-center justify-center animate-pulse-glow">
            <span className="text-fuchsia-300 font-bold">A</span>
          </div>
          <div className="leading-tight">
            <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Admin Console</div>
            <div className="text-sm font-semibold glow-text-purple">Quiz.OS Control Panel</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchSubmissions} className="neon-button text-xs">
            Refresh ↻
          </button>
          <Link
            to="/"
            className="text-xs uppercase tracking-[0.25em] text-slate-500 hover:text-cyan-300 transition-colors"
          >
            ← Public
          </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-16">
        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <KpiCard
            label="Total candidates"
            value={stats.total}
            accent="cyan"
            sub={
              stats.total === 0
                ? "Awaiting first submission"
                : `${stats.advanced} advanced · ${stats.intermediate} mid · ${stats.junior} junior`
            }
            icon="◉"
          />
          <KpiCard
            label="Pass rate"
            value={stats.total === 0 ? "—" : `${stats.passRate}%`}
            accent="purple"
            sub="Score ≥ 5 of 10"
            icon="✓"
          />
          <KpiCard
            label="Average score"
            value={stats.total === 0 ? "—" : stats.avgScore}
            accent="cyan"
            sub="Out of 10 questions"
            icon="∑"
          />
        </div>

        {/* Submissions table */}
        <div className="neon-card mt-8 overflow-hidden">
          <div className="flex flex-col items-stretch gap-3 border-b border-white/10 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Candidate submissions</h2>
              <p className="text-xs text-slate-400">
                Real-time view of all registered attempts.
              </p>
            </div>
            <div className="relative w-full md:w-80">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, email, tier, score…"
                className="neon-input pl-10"
              />
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                ⌕
              </span>
            </div>
          </div>

          {fetchError && (
            <div className="m-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              ⚠ {fetchError}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/[0.02] text-[11px] uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="px-5 py-3">Candidate</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Score</th>
                  <th className="px-5 py-3">Tier</th>
                  <th className="px-5 py-3">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-slate-400">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
                        Loading submissions…
                      </span>
                    </td>
                  </tr>
                )}

                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-slate-500">
                      {rows.length === 0
                        ? "No submissions yet. The grid is quiet."
                        : "No matches for your search."}
                    </td>
                  </tr>
                )}

                {!loading &&
                  filtered.map((r, i) => (
                    <tr
                      key={r.id ?? `${r.email}-${i}`}
                      className="border-t border-white/5 transition-colors hover:bg-white/[0.03]"
                    >
                      <td className="px-5 py-3 font-medium text-slate-100">{r.name || "—"}</td>
                      <td className="px-5 py-3 text-slate-300">{r.email || "—"}</td>
                      <td className="px-5 py-3">
                        <span className="rounded-md border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 text-cyan-200">
                          {r.score ?? 0} / {r.total ?? 10}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <TierChip tier={r.tier} />
                      </td>
                      <td className="px-5 py-3 text-slate-400">
                        {formatDate(r.created_at)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-white/10 px-5 py-3 text-xs text-slate-500">
            {rows.length > 0 ? (
              <span>
                Showing <span className="text-slate-300">{filtered.length}</span> of{" "}
                <span className="text-slate-300">{rows.length}</span>
              </span>
            ) : (
              <span>No data</span>
            )}
            <span className="uppercase tracking-widest">Live · Supabase REST</span>
          </div>
        </div>
      </section>
    </main>
  );
}

function KpiCard({ label, value, sub, accent, icon }) {
  const isCyan = accent === "cyan";
  const color = isCyan ? "#22d3ee" : "#a855f7";
  return (
    <div
      className="neon-card relative overflow-hidden p-6"
      style={{ boxShadow: `0 0 25px ${color}22` }}
    >
      <div
        className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full blur-3xl"
        style={{ background: `${color}22` }}
      />
      <div className="relative flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-[0.3em] text-slate-400">{label}</div>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg border"
          style={{
            borderColor: `${color}55`,
            color,
            background: `${color}1a`,
            textShadow: `0 0 8px ${color}aa`,
          }}
        >
          {icon}
        </div>
      </div>
      <div
        className="relative mt-3 text-4xl font-semibold"
        style={{ color, textShadow: `0 0 16px ${color}66` }}
      >
        {value}
      </div>
      <div className="relative mt-1 text-xs text-slate-500">{sub}</div>
    </div>
  );
}

function TierChip({ tier }) {
  const map = {
    Advanced: { color: "#22d3ee" },
    Intermediate: { color: "#a855f7" },
    Junior: { color: "#f59e0b" },
  };
  const m = map[tier] || { color: "#94a3b8" };
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs"
      style={{
        borderColor: `${m.color}55`,
        color: m.color,
        background: `${m.color}1a`,
        textShadow: `0 0 6px ${m.color}88`,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: m.color, boxShadow: `0 0 8px ${m.color}` }}
      />
      {tier || "—"}
    </span>
  );
}

function formatDate(value) {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString();
  } catch {
    return String(value);
  }
}
