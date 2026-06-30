import { Routes, Route } from "react-router-dom";
import Welcome from "./pages/Welcome.jsx";
import Quiz from "./pages/Quiz.jsx";
import Result from "./pages/Result.jsx";
import Admin from "./pages/Admin.jsx";

export default function App() {
  return (
    <div className="min-h-screen w-full text-slate-100">
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/result" element={<Result />} />
        <Route path="/admin" element={<Admin />} />
        <Route
          path="*"
          element={
            <div className="flex min-h-screen items-center justify-center grid-bg">
              <div className="neon-card p-10 text-center animate-fade-in-up">
                <h1 className="text-3xl font-semibold glow-text-cyan">404</h1>
                <p className="mt-2 text-slate-400">Signal lost in the grid.</p>
              </div>
            </div>
          }
        />
      </Routes>
    </div>
  );
}
