const Database = require("better-sqlite3");
const db = new Database("evaluation.db");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS campuses  (id INTEGER PRIMARY KEY, name TEXT UNIQUE);
CREATE TABLE IF NOT EXISTS teachers  (id INTEGER PRIMARY KEY, name TEXT);
CREATE TABLE IF NOT EXISTS subjects  (id INTEGER PRIMARY KEY, name TEXT UNIQUE);
CREATE TABLE IF NOT EXISTS grades    (id INTEGER PRIMARY KEY, name TEXT UNIQUE);
CREATE TABLE IF NOT EXISTS sections  (id INTEGER PRIMARY KEY, grade_id INTEGER REFERENCES grades(id), name TEXT);
CREATE TABLE IF NOT EXISTS students  (id INTEGER PRIMARY KEY, section_id INTEGER REFERENCES sections(id), name TEXT);
CREATE TABLE IF NOT EXISTS evaluators(id INTEGER PRIMARY KEY, name TEXT);   -- "Name of the SD"
CREATE TABLE IF NOT EXISTS questions (id INTEGER PRIMARY KEY, category TEXT, text TEXT, position INTEGER);
CREATE TABLE IF NOT EXISTS evaluations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  evaluator_id INTEGER REFERENCES evaluators(id),
  campus_id    INTEGER REFERENCES campuses(id),
  teacher_id   INTEGER REFERENCES teachers(id),
  grade_id     INTEGER REFERENCES grades(id),
  subject_id   INTEGER REFERENCES subjects(id),
  section_id   INTEGER REFERENCES sections(id),
  student_id   INTEGER REFERENCES students(id),
  quarter TEXT, week TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS answers (
  evaluation_id INTEGER REFERENCES evaluations(id) ON DELETE CASCADE,
  question_id   INTEGER REFERENCES questions(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 0 AND 5), -- 0 = N/A ("00")
  PRIMARY KEY (evaluation_id, question_id)
);
`);

// ---- seed demo data (only once) ----
if (db.prepare("SELECT COUNT(*) c FROM campuses").get().c === 0) {
  const ins = (sql, rows) => rows.forEach((r) => db.prepare(sql).run(...r));
  ins("INSERT INTO campuses(name) VALUES (?)", [["Main Campus"], ["North Campus"]]);
  ins("INSERT INTO teachers(name) VALUES (?)", [["Abebe Kebede"], ["Sara Tesfaye"], ["Daniel Mekonnen"]]);
  ins("INSERT INTO subjects(name) VALUES (?)", [["English"], ["Mathematics"], ["Science"]]);
  ins("INSERT INTO evaluators(name) VALUES (?)", [["SD One"], ["SD Two"]]);
  ins("INSERT INTO grades(name) VALUES (?)", [["Grade 1"], ["Grade 2"]]);
  ins("INSERT INTO sections(grade_id,name) VALUES (?,?)", [[1, "A"], [1, "B"], [2, "A"]]);
  ins("INSERT INTO students(section_id,name) VALUES (?,?)", [
    [1, "Hana Alemu"], [1, "Yonas Girma"], [2, "Liya Bekele"], [3, "Samuel Haile"],
  ]);
  ins("INSERT INTO questions(category,text,position) VALUES (?,?,?)", [
    ["EVALUATION POINTS 1", "Is the condition of the exercise book good? Is it covered?/ Are there comments about this from the teacher?", 1],
    ["EVALUATION POINTS 1", "Is the handwriting of the student neat, tidy, and to GSS standard? Has the teacher carefully followed the handwriting?", 2],
    ["EVALUATION POINTS 1", "Has the student written the date properly with capitalization of the months of the year and days of the week?", 3],
    ["EVALUATION POINTS 1", "Did the student write the word class work or homework and full title for each work?", 4],
  ]);
}

module.exports = db;
