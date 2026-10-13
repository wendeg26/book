import { useEffect, useMemo, useState } from "react";
import Report from "./Report.jsx";

const SCALE = [5, 4, 3, 2, 1, 0]; // 0 is shown as "00" (Not Applicable)
const EMPTY = { evaluator_id: "", campus_id: "", teacher_id: "", grade_id: "", subject_id: "",
                section_id: "", student_id: "", quarter: "", week: "" };

function Select({ label, value, onChange, options, disabled }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
        <option value="">Please select here</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

export default function App() {
  const [tab, setTab] = useState("form");
  const [meta, setMeta] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [answers, setAnswers] = useState({});
  const [status, setStatus] = useState(null); // {type, text}

  useEffect(() => {
    fetch("/api/meta").then((r) => r.json()).then((m) => {
      setMeta(m);
      setAnswers(Object.fromEntries(m.questions.map((q) => [q.id, 5]))); // default 5, like the screenshot
    });
  }, []);

  const set = (k) => (v) =>
    setForm((f) => {
      const next = { ...f, [k]: v };
      if (k === "grade_id") { next.section_id = ""; next.student_id = ""; }
      if (k === "section_id") next.student_id = "";
      return next;
    });

  const sections = useMemo(
    () => meta?.sections.filter((s) => String(s.grade_id) === form.grade_id) ?? [], [meta, form.grade_id]);
  const students = useMemo(
    () => meta?.students.filter((s) => String(s.section_id) === form.section_id) ?? [], [meta, form.section_id]);
  const grouped = useMemo(() => {
    const g = {};
    meta?.questions.forEach((q) => (g[q.category] ||= []).push(q));
    return g;
  }, [meta]);

  const opts = (list, label = "name") => list.map((x) => ({ value: String(x.id), label: x[label] }));
  const strs = (list) => list.map((x) => ({ value: x, label: x }));

  async function submit() {
    setStatus(null);
    const res = await fetch("/api/evaluations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, answers }),
    });
    const data = await res.json();
    if (!res.ok) return setStatus({ type: "error", text: data.error });
    setStatus({ type: "ok", text: `Evaluation #${data.id} submitted.` });
    setForm(EMPTY);
    setAnswers(Object.fromEntries(meta.questions.map((q) => [q.id, 5])));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (!meta) return <p className="loading">Loading…</p>;

  return (
    <div>
      <header className="topbar">
        <b>Welcome to 2026-2027 GSS Staff Online Evaluation</b>
        <nav>
          <button className={tab === "form" ? "on" : ""} onClick={() => setTab("form")}>Evaluate</button>
          <button className={tab === "report" ? "on" : ""} onClick={() => setTab("report")}>Reports</button>
        </nav>
      </header>

      {tab === "report" ? <Report quarters={meta.quarters} /> : (
        <main className="page">
          <div className="titlebar">
            <h1>Evaluation Questionnaire for GSS Staff: 2026-2027 EBC</h1>
            <button className="primary" onClick={submit}>Submit Evaluation</button>
          </div>

          {status && <div className={`notice ${status.type}`}>{status.text}</div>}

          <section className="grid">
            <div>
              <Select label="Name of the SD" value={form.evaluator_id} onChange={set("evaluator_id")} options={opts(meta.evaluators)} />
              <Select label="Teacher" value={form.teacher_id} onChange={set("teacher_id")} options={opts(meta.teachers)} />
              <Select label="Subject" value={form.subject_id} onChange={set("subject_id")} options={opts(meta.subjects)} />
              <Select label="Quarter" value={form.quarter} onChange={set("quarter")} options={strs(meta.quarters)} />
              <Select label="Week" value={form.week} onChange={set("week")} options={strs(meta.weeks)} />
            </div>
            <div>
              <Select label="Campus" value={form.campus_id} onChange={set("campus_id")} options={opts(meta.campuses)} />
              <Select label="Grade" value={form.grade_id} onChange={set("grade_id")} options={opts(meta.grades)} />
              <Select label="Section" value={form.section_id} onChange={set("section_id")} options={opts(sections)} disabled={!form.grade_id} />
              <Select label="Student" value={form.student_id} onChange={set("student_id")} options={opts(students)} disabled={!form.section_id} />
            </div>
          </section>

          <fieldset className="legend">
            <legend>Rating Legend</legend>
            <p>5 = Strongly Agree(Excellent), 4 = Agree(Very Good), 3 = Uncertain(Good), 2 = Disagree(NE), 1 = Strongly Disagree(Poor), 00 = Not Applicable</p>

            {Object.entries(grouped).map(([cat, qs]) => (
              <table key={cat} className="rating">
                <thead>
                  <tr>
                    <th>{cat}</th>
                    {SCALE.map((n) => <th key={n}>{n === 0 ? "00" : n}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {qs.map((q) => (
                    <tr key={q.id}>
                      <td>{q.text}</td>
                      {SCALE.map((n) => (
                        <td key={n}>
                          <input type="radio" name={`q${q.id}`} aria-label={`${n === 0 ? "N/A" : n}`}
                            checked={answers[q.id] === n}
                            onChange={() => setAnswers((a) => ({ ...a, [q.id]: n }))} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ))}
          </fieldset>
        </main>
      )}
    </div>
  );
}
