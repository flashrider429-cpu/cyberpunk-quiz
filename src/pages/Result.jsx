import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSupabase } from "../context/SupabaseContext.jsx";

function tierMeta(tier) {
  switch (tier) {
    case "Advanced":
      return {
        color: "#22d3ee",
        label: "Advanced",
        blurb: "Senior-grade command of the full stack. Hire on sight.",
      };
    case "Intermediate":
      return {
        color: "#a855f7",
        label: "Intermediate",
        blurb: "Solid mid-level engineer. Ready for ownership of features.",
      };
    default:
      return {
        color: "#f59e0b",
        label: "Junior",
        blurb: "Foundational understanding. Strong growth trajectory ahead.",
      };
  }
}

export default function Result() {
  const { client, session, clearSession } = useSupabase();
  const navigate = useNavigate();

  const [insertState, setInsertState] = useState("pending"); // pending | success | error
  const [insertError, setInsertError] = useState("");
  const firedRef = useRef(false);

  const score = session?.score ?? 0;
  const total = session?.total ?? 10;
  const tier = session?.tier ?? "Junior";
  const meta = useMemo(() => tierMeta(tier), [tier]);
  const pct = useMemo(() => Math.round((score / total) * 100), [score, total]);

  useEffect(() => {
    // If we land here without a session, bounce home.
    if (!session?.name || !session?.email) {
      navigate("/", { replace: true });
      return;
    }

    if (firedRef.current) return;
    firedRef.current = true;

    (async () => {
      try {
        if (!client) {
          setInsertState("error");
          setInsertError(
            "Supabase client not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local."
          );
          return;
        }

        const payload = {
          name: session.name,
          email: session.email,
          score,
          total,
          tier,
        };

        const { error } = await client.from("submissions").insert([payload]);

        if (error) {
          // 23505 = unique_violation: treat as already-inserted (idempotent).
          if (error.code === "23505") {
            setInsertState("success");
            return;
          }
          // eslint-disable-next-line no-console
          console.error("[Result] insert failed:", error);
          setInsertState("error");
          setInsertError(error.message || "Unknown database error.");
          return;
        }

        setInsertState("success");
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
        setInsertState("error");
        setInsertError(err?.message || "Unexpected error.");
      }
    })();
  }, [client, session, score, total, tier, navigate]);

  const handleRestart = () => {
    clearSession();
    navigate("/", { replace: true });
  };

  // SVG ring math
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct / 100);

  return (
    <main className="relative min-h-screen w-full grid-bg overflow-hidden">
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-cyan-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-fuchsia-500/15 blur-3xl" />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-10">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg border border-cyan-400/40 bg-cyan-500/10 flex items-center justify-center">
            <span className="text-cyan-300 font-bold">Q</span>
          </div>
          <div className="leading-tight">
            <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Quiz.OS</div>
            <div className="text-sm font-semibold glow-text-cyan">Result</div>
          </div>
        </div>
        <Link
          to="/"
          onClick={(e) => {
            e.preventDefault();
            handleRestart();
          }}
          className="text-xs uppercase tracking-[0.25em] text-slate-500 hover:text-cyan-300 transition-colors"
        >
          New session ↺
        </Link>
      </header>

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-88px)] max-w-5xl flex-col items-center justify-center px-6 py-10">
        <div className="neon-card relative w-full overflow-hidden p-8 md:p-12 animate-fade-in-up">
          <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-fuchsia-500/10 blur-3xl" />

          <div className="relative grid items-center gap-10 md:grid-cols-2">
            {/* Circular score graph */}
            <div className="flex flex-col items-center justify-center">
              <div className="relative">
                <svg width="220" height="220" viewBox="0 0 220 220" className="animate-fade-in-up">
                  <defs>
                    <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#22d3ee" />
                      <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                  </defs>
                  <circle
                    cx="110"
                    cy="110"
                    r={radius}
                    fill="none"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="14"
                  />
                  <circle
                    cx="110"
                    cy="110"
                    r={radius}
                    fill="none"
                    stroke="url(#ringGrad)"
                    strokeWidth="14"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    transform="rotate(-90 110 110)"
                    style={{
                      transition: "stroke-dashoffset 1.2s ease-out",
                      filter: "drop-shadow(0 0 10px rgba(34,211,238,0.6))",
                    }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-5xl font-semibold glow-text-cyan">{pct}%</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.3em] text-slate-400">
                    {score} / {total} correct
                  </div>
                </div>
              </div>

              <div
                className="mt-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs uppercase tracking-[0.3em]"
                style={{
                  borderColor: `${meta.color}66`,
                  color: meta.color,
                  backgroundColor: `${meta.color}1a`,
                  boxShadow: `0 0 18px ${meta.color}55`,
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: meta.color, boxShadow: `0 0 10px ${meta.color}` }}
                />
                {meta.label}
              </div>
            </div>

            {/* Summary */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs uppercase tracking-widest text-cyan-200">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                Assessment complete
              </div>
              <h1 className="mt-4 text-3xl font-semibold md:text-4xl">
                Nice work,{" "}
                <span className="shimmer-text">{session?.name?.split(" ")[0] || "candidate"}</span>.
              </h1>
              <p className="mt-3 text-slate-400">{meta.blurb}</p>

              <div className="neon-divider my-6" />

              <dl className="grid grid-cols-3 gap-3 text-center">
                <Stat label="Score" value={`${score}/${total}`} />
                <Stat label="Percent" value={`${pct}%`} />
                <Stat label="Tier" value={meta.label} accent={meta.color} />
              </dl>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button onClick={handleRestart} className="neon-button">
                  Start a new session ↺
                </button>
                <Link to="/admin" className="neon-button neon-button-purple">
                  View admin dashboard →
                </Link>
              </div>

              <InsertStatus state={insertState} error={insertError} />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
      <div
        className="text-lg font-semibold"
        style={accent ? { color: accent, textShadow: `0 0 10px ${accent}66` } : undefined}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
    </div>
  );
}

function InsertStatus({ state, error }) {
  if (state === "pending") {
    return (
      <div className="mt-6 flex items-center gap-2 text-xs uppercase tracking-widest text-slate-500">
        <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
        Encrypting payload · pushing to submissions…
      </div>
    );
  }
  if (state === "success") {
    return (
      <div
        className="mt-6 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-200"
        style={{ boxShadow: "0 0 15px rgba(16,185,129,0.2)" }}
      >
        ✓ Submission persisted to the database.
      </div>
    );
  }
  return (
    <div
      className="mt-6 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-200"
      style={{ boxShadow: "0 0 15px rgba(244,63,94,0.2)" }}
    >
      ⚠ Failed to save submission: {error || "Unknown error."}
    </div>
  );
}
