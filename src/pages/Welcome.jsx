import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSupabase } from "../context/SupabaseContext.jsx";

const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());

export default function Welcome() {
  const { client, setSession, session } = useSupabase();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // If we already have a registered session, jump straight into the quiz.
    if (session?.name && session?.email) {
      navigate("/quiz", { replace: true });
    }
  }, [session, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      setError("Please enter your full name to continue.");
      return;
    }
    if (!isValidEmail(cleanEmail)) {
      setError("That email address doesn't look valid.");
      return;
    }

    setSubmitting(true);
    try {
      // Duplicate check against the `submissions` table.
      if (client) {
        const { data, error: qErr } = await client
          .from("submissions")
          .select("id, email")
          .ilike("email", cleanEmail)
          .limit(1);

        if (qErr) {
          // Don't block the user if the read failed; surface a warning instead.
          // eslint-disable-next-line no-console
          console.warn("[Welcome] duplicate check failed:", qErr.message);
        } else if (Array.isArray(data) && data.length > 0) {
          setError(
            "This email is already registered. Each candidate may attempt the assessment only once."
          );
          setSubmitting(false);
          return;
        }
      }

      setSession({ name: cleanName, email: cleanEmail, startedAt: Date.now() });
      navigate("/quiz");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen w-full grid-bg overflow-hidden">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-fuchsia-500/20 blur-3xl" />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-10">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg border border-cyan-400/40 bg-cyan-500/10 flex items-center justify-center animate-pulse-glow">
            <span className="text-cyan-300 font-bold">Q</span>
          </div>
          <div className="leading-tight">
            <div className="text-sm uppercase tracking-[0.3em] text-slate-400">Quiz.OS</div>
            <div className="text-base font-semibold glow-text-cyan">Technical Assessment</div>
          </div>
        </div>
        <Link
          to="/admin"
          className="text-xs uppercase tracking-[0.25em] text-slate-500 hover:text-cyan-300 transition-colors"
        >
          Admin ↗
        </Link>
      </header>

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-88px)] max-w-6xl flex-col items-center justify-center px-6 py-10 md:flex-row md:gap-12">
        <div className="w-full md:w-1/2 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-1 text-xs uppercase tracking-widest text-fuchsia-200">
            <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400 animate-pulse" />
            Live · Cohort 2026
          </div>
          <h1 className="mt-6 text-4xl font-semibold leading-tight md:text-6xl">
            Prove your{" "}
            <span className="shimmer-text">engineering</span>
            <br />
            caliber in 10 questions.
          </h1>
          <p className="mt-5 max-w-lg text-slate-400">
            A high-signal, linear assessment designed for senior full-stack
            engineers. 10 curated questions, strict grading, and a definitive
            technical grade the moment you finish.
          </p>

          <ul className="mt-8 space-y-3 text-sm text-slate-300">
            {[
              "Strict linear flow — no going back",
              "10 questions across the full stack",
              "Automated grading & tier classification",
            ].map((line) => (
              <li key={line} className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.9)]" />
                {line}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-10 w-full md:mt-0 md:w-1/2 animate-fade-in-up">
          <div className="neon-card relative overflow-hidden p-8">
            <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-fuchsia-500/10 blur-3xl" />

            <div className="relative">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-cyan-300/80">
                <span className="step-dot active" /> Registration
              </div>
              <h2 className="mt-3 text-2xl font-semibold">Initialize session</h2>
              <p className="mt-1 text-sm text-slate-400">
                Enter your details to begin. One attempt per email.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-widest text-slate-400">
                    Full name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ada Lovelace"
                    className="neon-input"
                    autoComplete="name"
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-widest text-slate-400">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ada@engineer.dev"
                    className="neon-input"
                    autoComplete="email"
                    disabled={submitting}
                  />
                </div>

                {error && (
                  <div
                    role="alert"
                    className="animate-fade-in-up rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
                    style={{
                      boxShadow: "0 0 20px rgba(244, 63, 94, 0.25)",
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 inline-block h-2 w-2 rounded-full bg-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.9)]" />
                      <span>{error}</span>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="neon-button w-full"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300" />
                      Verifying…
                    </>
                  ) : (
                    <>Launch assessment →</>
                  )}
                </button>
              </form>

              <div className="neon-divider my-6" />
              <p className="text-center text-[11px] uppercase tracking-[0.3em] text-slate-500">
                Secure · Encrypted · Anonymous
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
