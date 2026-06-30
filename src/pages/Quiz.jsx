import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSupabase } from "../context/SupabaseContext.jsx";

const QUESTION_TIME = 30; // seconds per question

const fallbackQuestions = [
  {
    id: "fallback-1",
    question: "Which data structure offers O(1) average-case insertion?",
    options: ["Sorted array", "Hash table", "Binary search tree", "Linked list"],
    correct_answer: 1,
  },
  {
    id: "fallback-2",
    question: "What does the `useEffect` cleanup function run for?",
    options: [
      "Mounting the component",
      "Before the next effect or on unmount",
      "Only on the first render",
      "Only when state changes",
    ],
    correct_answer: 1,
  },
  {
    id: "fallback-3",
    question: "Which HTTP status code means 'Created'?",
    options: ["200", "201", "204", "301"],
    correct_answer: 1,
  },
  {
    id: "fallback-4",
    question: "In SQL, which clause filters rows BEFORE aggregation?",
    options: ["HAVING", "WHERE", "GROUP BY", "ORDER BY"],
    correct_answer: 1,
  },
  {
    id: "fallback-5",
    question: "What does CSS `position: sticky` do?",
    options: [
      "Removes the element from flow",
      "Fixes the element to the viewport",
      "Toggles between relative and fixed based on scroll",
      "Centers the element horizontally",
    ],
    correct_answer: 2,
  },
  {
    id: "fallback-6",
    question: "Which is NOT a JavaScript primitive type?",
    options: ["string", "number", "object", "boolean"],
    correct_answer: 2,
  },
  {
    id: "fallback-7",
    question: "What is the time complexity of binary search?",
    options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"],
    correct_answer: 1,
  },
  {
    id: "fallback-8",
    question: "Which React hook is used for memoizing a computed value?",
    options: ["useEffect", "useMemo", "useCallback", "useRef"],
    correct_answer: 1,
  },
  {
    id: "fallback-9",
    question: "Which command initializes a new Node project?",
    options: ["node init", "npm start", "npm init -y", "node new"],
    correct_answer: 2,
  },
  {
    id: "fallback-10",
    question: "What is the default port for HTTPS?",
    options: ["80", "443", "8080", "3000"],
    correct_answer: 1,
  },
];

function pickCorrectIndex(q) {
  if (typeof q.correct_answer === "number") return q.correct_answer;
  if (typeof q.correct_index === "number") return q.correct_index;
  if (typeof q.answer === "number") return q.answer;
  if (typeof q.correct === "string") {
    const idx = (q.options || []).findIndex((o) => o === q.correct);
    if (idx >= 0) return idx;
  }
  return -1;
}

function normalizeQuestion(raw, idx) {
  const options = raw.options || raw.choices || [];
  return {
    id: raw.id ?? `q-${idx + 1}`,
    question: raw.question || raw.text || raw.prompt || `Question ${idx + 1}`,
    options: Array.isArray(options) ? options : [],
    correctIndex: pickCorrectIndex(raw),
  };
}

function computeTier(score) {
  if (score >= 8) return "Advanced";
  if (score >= 5) return "Intermediate";
  return "Junior";
}

export default function Quiz() {
  const { client, session, updateSession } = useSupabase();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { questionId: optionIndex }
  const [secondsLeft, setSecondsLeft] = useState(QUESTION_TIME);
  const [submitting, setSubmitting] = useState(false);

  // Mirror `answers` in a ref so the interval's setTimeout-style callback
  // always reads the *latest* picks — even if the user changed their answer
  // in the last second before timeout.
  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const tickRef = useRef(null);
  const submittingRef = useRef(false);

  // Guard: must have a registered session.
  useEffect(() => {
    if (!session?.name || !session?.email) {
      navigate("/", { replace: true });
    }
  }, [session, navigate]);

  // Load questions once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        if (client) {
          const { data, error } = await client
            .from("questions")
            .select("id, question, options, correct_answer")
            .limit(10);
          if (!error && Array.isArray(data) && data.length > 0) {
            const normalized = data.map(normalizeQuestion);
            if (!cancelled) {
              setQuestions(normalized);
              setLoading(false);
              return;
            }
          }
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[Quiz] questions fetch failed, using fallback:", err?.message);
      }
      if (!cancelled) {
        setQuestions(fallbackQuestions.map(normalizeQuestion));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client]);

  const total = questions.length;
  const current = questions[index];
  const progressPct = useMemo(() => {
    if (!total) return 0;
    return Math.round(((index + 1) / total) * 100);
  }, [index, total]);

  // Stop any running timer and clear it.
  const stopTimer = () => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  // Per-question countdown timer. Recreates the interval whenever the
  // current question changes (i.e. when `index` advances).
  useEffect(() => {
    if (loading || submitting || !current) return;

    setSecondsLeft(QUESTION_TIME);
    stopTimer();

    tickRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          // Time is up — stop the timer and auto-advance.
          stopTimer();
          // Defer the advance to a microtask so we don't update state
          // inside the same render commit as `setSecondsLeft`.
          queueMicrotask(() => advance());
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return stopTimer;
    // We intentionally don't depend on `answers` — the timer should keep
    // running when the user picks an option.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, loading, current]);

  const handleSelect = (optionIdx) => {
    if (!current) return;
    setAnswers((prev) => ({ ...prev, [current.id]: optionIdx }));
  };

  const finalize = (finalAnswers) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    stopTimer();

    let score = 0;
    for (const q of questions) {
      const picked = finalAnswers[q.id];
      if (typeof picked === "number" && picked === q.correctIndex) score += 1;
    }
    const tier = computeTier(score);

    updateSession({ score, total: questions.length, tier, answers: finalAnswers });
    // Result page handles the Supabase insert.
    navigate("/result", { replace: true });
  };

  const advance = () => {
    if (submittingRef.current) return;
    if (index + 1 >= total) {
      finalize(answersRef.current);
    } else {
      setIndex((i) => i + 1);
    }
  };

  const handleNext = () => {
    stopTimer();
    advance();
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center grid-bg">
        <div className="neon-card flex items-center gap-3 px-6 py-4 animate-fade-in-up">
          <span className="h-3 w-3 animate-pulse rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.9)]" />
          <span className="text-sm text-slate-300">Calibrating question bank…</span>
        </div>
      </main>
    );
  }

  if (!current) {
    return (
      <main className="flex min-h-screen items-center justify-center grid-bg">
        <div className="neon-card p-8 text-center">
          <p className="text-slate-300">No questions available right now.</p>
        </div>
      </main>
    );
  }

  const selected = answers[current.id];
  const isLast = index + 1 === total;

  return (
    <main className="relative min-h-screen w-full grid-bg overflow-hidden">
      <div className="pointer-events-none absolute -top-40 right-0 h-96 w-96 rounded-full bg-fuchsia-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 left-0 h-96 w-96 rounded-full bg-cyan-500/15 blur-3xl" />

      <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-10">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg border border-cyan-400/40 bg-cyan-500/10 flex items-center justify-center">
            <span className="text-cyan-300 font-bold">Q</span>
          </div>
          <div className="leading-tight">
            <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Live assessment</div>
            <div className="text-sm font-semibold text-slate-200">
              {session?.name || "Candidate"}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Candidate</div>
          <div className="text-sm text-slate-300">{session?.email}</div>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-4xl px-6 pb-20">
        {/* Progress steps */}
        <div className="mb-6 flex items-center gap-2">
          {questions.map((q, i) => {
            const cls =
              i < index ? "step-dot done" : i === index ? "step-dot active" : "step-dot";
            return <span key={q.id} className={cls} />;
          })}
          <span className="ml-3 text-xs uppercase tracking-widest text-slate-400">
            {index + 1} / {total}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-8 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progressPct}%`,
              background: "linear-gradient(90deg, #06b6d4, #a855f7)",
              boxShadow: "0 0 15px rgba(6, 182, 212, 0.6)",
            }}
          />
        </div>

        <div className="neon-card relative overflow-hidden p-6 md:p-10 animate-fade-in-up">
          <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl" />

          <div className="relative flex items-center justify-between">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs uppercase tracking-widest text-cyan-200">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Question {index + 1}
            </div>

            <Countdown seconds={secondsLeft} total={QUESTION_TIME} />
          </div>

          <h2 className="relative mt-6 text-2xl font-semibold leading-snug md:text-3xl">
            {current.question}
          </h2>

          <div className="relative mt-8 grid gap-3">
            {current.options.map((opt, i) => {
              const isSelected = selected === i;
              return (
                <button
                  key={`${current.id}-${i}`}
                  type="button"
                  onClick={() => handleSelect(i)}
                  className={[
                    "group flex w-full items-center gap-4 rounded-xl border px-4 py-4 text-left transition-all duration-300",
                    isSelected
                      ? "border-cyan-400/60 bg-cyan-500/10"
                      : "border-white/10 bg-white/[0.02] hover:border-fuchsia-400/40 hover:bg-fuchsia-500/5",
                  ].join(" ")}
                  style={
                    isSelected
                      ? { boxShadow: "0 0 20px rgba(6,182,212,0.25)" }
                      : undefined
                  }
                >
                  <span
                    className={[
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-sm font-semibold",
                      isSelected
                        ? "border-cyan-300 bg-cyan-400/20 text-cyan-100"
                        : "border-white/15 bg-black/30 text-slate-400 group-hover:border-fuchsia-300/50 group-hover:text-fuchsia-200",
                    ].join(" ")}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="text-sm md:text-base text-slate-100">{opt}</span>
                </button>
              );
            })}
          </div>

          <div className="relative mt-8 flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest text-slate-500">
              {selected === undefined ? "Select an answer to continue" : "Locked in"}
            </span>
            <button
              type="button"
              onClick={handleNext}
              disabled={submitting}
              className="neon-button neon-button-purple"
            >
              {submitting ? "Grading…" : isLast ? "Submit assessment" : "Next question →"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

function Countdown({ seconds, total }) {
  const pct = Math.max(0, Math.min(100, (seconds / total) * 100));
  const danger = seconds <= 5;
  return (
    <div
      className="flex items-center gap-3"
      title="Time remaining for this question"
    >
      <div className="relative h-10 w-10">
        <svg className="h-10 w-10 -rotate-90" viewBox="0 0 36 36">
          <circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="3"
          />
          <circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            stroke={danger ? "#f43f5e" : "#22d3ee"}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * 94.25} 94.25`}
            style={{
              transition: "stroke-dasharray 1s linear",
              filter: danger
                ? "drop-shadow(0 0 6px rgba(244,63,94,0.8))"
                : "drop-shadow(0 0 6px rgba(34,211,238,0.8))",
            }}
          />
        </svg>
        <div
          className={`absolute inset-0 flex items-center justify-center text-xs font-semibold ${
            danger ? "text-rose-300" : "text-cyan-200"
          }`}
        >
          {seconds}
        </div>
      </div>
    </div>
  );
}
