import { useEffect, useState } from "react";

export default function Report({ quarters }) {
  const [quarter, setQuarter] = useState("");
  const [teachers, setTeachers] = useState([]);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetch(`/api/reports/teachers${quarter ? `?quarter=${quarter}` : ""}`)
      .then((r) => r.json()).then(setTeachers);
  }, [quarter]);
  useEffect(() => { fetch("/api/evaluations").then((r) => r.json()).then(setHistory); }, []);

  return (
    <main className="page">
      <div className="titlebar">
        <h1>Teacher performance</h1>
        <select value={quarter} onChange={(e) => setQuarter(e.target.value)}>
          <option value="">All quarters</option>
          {quarters.map((q) => <option key={q}>{q}</option>)}
        </select>
      </div>

      <table className="data">
        <thead><tr><th>Teacher</th><th>Subject</th><th>Evaluations</th><th>Average (out of 5)</th></tr></thead>
        <tbody>
          {teachers.map((t) => (
            <tr key={t.id + t.subject}>
              <td>{t.teacher}</td><td>{t.subject}</td><td>{t.evaluations}</td>
              <td><div className="bar"><i style={{ width: `${((t.average || 0) / 5) * 100}%` }} /></div> {t.average ?? "–"}</td>
            </tr>
          ))}
          {!teachers.length && <tr><td colSpan="4">No evaluations yet. Submit one from the Evaluate tab.</td></tr>}
        </tbody>
      </table>

      <h2>All submissions</h2>
      <table className="data">
        <thead><tr><th>#</th><th>Teacher</th><th>Student</th><th>Subject</th><th>Quarter</th><th>Week</th><th>Average</th><th>Date</th></tr></thead>
        <tbody>
          {history.map((h) => (
            <tr key={h.id}>
              <td>{h.id}</td><td>{h.teacher}</td><td>{h.student}</td><td>{h.subject}</td>
              <td>{h.quarter}</td><td>{h.week}</td><td>{h.average ?? "–"}</td><td>{h.created_at}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
