const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());


// All dropdown data + questions in one call (cascading filters are done in the UI)
app.get("/api/meta", (_req, res) => {
  const all = (t) => db.prepare(`SELECT * FROM ${t} ORDER BY name`).all();
  res.json({
    evaluators: all("evaluators"),
    campuses: all("campuses"),
    teachers: all("teachers"),
    subjects: all("subjects"),
    grades: all("grades"),
    sections: db.prepare("SELECT * FROM sections ORDER BY name").all(),
    students: db.prepare("SELECT * FROM students ORDER BY name").all(),
    quarters: ["Q1", "Q2", "Q3", "Q4"],
    weeks: Array.from({ length: 12 }, (_, i) => `Week ${i + 1}`),
    questions: db.prepare("SELECT * FROM questions ORDER BY category, position").all(),
  });
});


// Submit an evaluation
app.post("/api/evaluations", (req, res) => {
  const b = req.body;
  const required = ["evaluator_id", "campus_id", "teacher_id", "grade_id", "subject_id",
                    "section_id", "student_id", "quarter", "week"];
  const missing = required.filter((k) => !b[k]);
  if (missing.length) return res.status(400).json({ error: `Missing: ${missing.join(", ")}` });

  const questions = db.prepare("SELECT id FROM questions").all();
  const answers = b.answers || {};
  for (const q of questions) {
    const r = Number(answers[q.id]);
    if (!Number.isInteger(r) || r < 0 || r > 5)
      return res.status(400).json({ error: `Question ${q.id} needs a rating (0-5)` });
  }

  const save = db.transaction(() => {
    const { lastInsertRowid: id } = db.prepare(`
      INSERT INTO evaluations (evaluator_id,campus_id,teacher_id,grade_id,subject_id,section_id,student_id,quarter,week)
      VALUES (?,?,?,?,?,?,?,?,?)`).run(
      b.evaluator_id, b.campus_id, b.teacher_id, b.grade_id, b.subject_id,
      b.section_id, b.student_id, b.quarter, b.week);
    const ins = db.prepare("INSERT INTO answers (evaluation_id,question_id,rating) VALUES (?,?,?)");
    questions.forEach((q) => ins.run(id, q.id, Number(answers[q.id])));
    return id;
  });

  try {
    res.status(201).json({ id: save() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Report: average per teacher (N/A = 0 is ignored). Optional ?quarter=Q1
app.get("/api/reports/teachers", (req, res) => {
  const q = req.query.quarter;
  const rows = db.prepare(`
    SELECT t.id, t.name AS teacher, s.name AS subject,
           COUNT(DISTINCT e.id) AS evaluations,
           ROUND(AVG(CASE WHEN a.rating > 0 THEN a.rating END), 2) AS average
    FROM evaluations e
    JOIN teachers t ON t.id = e.teacher_id
    JOIN subjects s ON s.id = e.subject_id
    JOIN answers  a ON a.evaluation_id = e.id
    ${q ? "WHERE e.quarter = ?" : ""}
    GROUP BY t.id, s.id ORDER BY average DESC`).all(...(q ? [q] : []));
  res.json(rows);
});

// Report: every submitted evaluation
app.get("/api/evaluations", (_req, res) => {
  res.json(db.prepare(`
    SELECT e.id, t.name teacher, st.name student, sub.name subject, e.quarter, e.week, e.created_at,
           ROUND(AVG(CASE WHEN a.rating > 0 THEN a.rating END), 2) AS average
    FROM evaluations e
    JOIN teachers t ON t.id=e.teacher_id JOIN students st ON st.id=e.student_id
    JOIN subjects sub ON sub.id=e.subject_id JOIN answers a ON a.evaluation_id=e.id
    GROUP BY e.id ORDER BY e.id DESC`).all());
});

app.listen(3001, () => console.log("API running on http://localhost:3001"));
