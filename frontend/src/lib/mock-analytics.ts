/**
 * ⚠️  DEMONSTRATION DATA — NOT MEASURED.
 *
 * The backend has no user model and no attempt persistence: `AttemptStore`
 * is an in-memory list wiped on every restart, with no user_id field, and
 * the PostgreSQL logger is a contract with no database behind it. There is
 * therefore no real student history to chart.
 *
 * Everything below is hand-authored so the dashboard has something to show.
 * It is shaped from the real knowledge graph (actual concept, constraint and
 * equation ids) so the charts are at least structurally honest — but no
 * number here was measured from a student.
 *
 * Every screen that renders this module MUST display the "Sample data"
 * badge. See components/MockDataBadge.tsx.
 *
 * To make this real: add user_id to AttemptStore, wire PostgresAttemptLogger
 * to an actual database, then replace this module with API calls.
 */

export const IS_MOCK_DATA = true;

export interface ChapterStat {
  id: string;
  name: string;
  subject: string;
  grade: number;
  attempted: number;
  correct: number;
  mastery: number; // 0-100
  available: boolean; // is this chapter actually in the knowledge graph?
}

/** Only kinematics exists in data/kinematics_graph.json. The rest are
 *  shown greyed out so the UI reflects real coverage, not an imagined one. */
export const CHAPTERS: ChapterStat[] = [
  { id: "kinematics_1d", name: "Motion in a Straight Line", subject: "Physics", grade: 11, attempted: 48, correct: 41, mastery: 85, available: true },
  { id: "kinematics_2d", name: "Motion in a Plane", subject: "Physics", grade: 11, attempted: 0, correct: 0, mastery: 0, available: false },
  { id: "laws_of_motion", name: "Laws of Motion", subject: "Physics", grade: 11, attempted: 0, correct: 0, mastery: 0, available: false },
  { id: "work_energy", name: "Work, Energy and Power", subject: "Physics", grade: 11, attempted: 0, correct: 0, mastery: 0, available: false },
];

export interface WeakSpot {
  id: string;
  label: string;
  kind: "concept" | "constraint" | "equation" | "skill";
  errorRate: number; // 0-100
  attempts: number;
  hint: string;
}

export const WEAK_SPOTS: WeakSpot[] = [
  {
    id: "constraint_max_height_v_zero",
    label: "Velocity at maximum height",
    kind: "constraint",
    errorRate: 42,
    attempts: 12,
    hint: "At the top of a rise the velocity is zero — the acceleration is not.",
  },
  {
    id: "eq_v2_u2_2as",
    label: "Third equation of motion",
    kind: "equation",
    errorRate: 35,
    attempts: 17,
    hint: "Use v² = u² + 2as when time is neither given nor asked for.",
  },
  {
    id: "sign_convention",
    label: "Sign conventions in free fall",
    kind: "skill",
    errorRate: 31,
    attempts: 19,
    hint: "Choose one positive direction and keep it for the whole problem.",
  },
  {
    id: "unit_conversion",
    label: "km/h to m/s conversion",
    kind: "skill",
    errorRate: 18,
    attempts: 22,
    hint: "Divide by 3.6 to go from km/h to m/s.",
  },
  {
    id: "constraint_from_rest",
    label: "Recognising 'starts from rest'",
    kind: "constraint",
    errorRate: 9,
    attempts: 23,
    hint: "'From rest' always means the initial velocity is zero.",
  },
];

export interface ProgressPoint {
  week: string;
  accuracy: number;
  solved: number;
}

export const PROGRESS: ProgressPoint[] = [
  { week: "W1", accuracy: 52, solved: 6 },
  { week: "W2", accuracy: 58, solved: 9 },
  { week: "W3", accuracy: 61, solved: 7 },
  { week: "W4", accuracy: 70, solved: 11 },
  { week: "W5", accuracy: 74, solved: 8 },
  { week: "W6", accuracy: 81, solved: 13 },
  { week: "W7", accuracy: 85, solved: 10 },
];

export interface ConceptScore {
  concept: string;
  score: number;
}

export const CONCEPT_SCORES: ConceptScore[] = [
  { concept: "Uniform motion", score: 92 },
  { concept: "Uniform acceleration", score: 78 },
  { concept: "Free fall", score: 64 },
  { concept: "Relative motion", score: 58 },
];

export const SUBJECTS = [
  { id: "physics", name: "Physics", available: true, chapters: 1, icon: "atom" },
  { id: "chemistry", name: "Chemistry", available: false, chapters: 0, icon: "flask" },
  { id: "maths", name: "Mathematics", available: false, chapters: 0, icon: "sigma" },
  { id: "biology", name: "Biology", available: false, chapters: 0, icon: "leaf" },
];

export const GRADES = [6, 7, 8, 9, 10, 11, 12];

export const SUMMARY = {
  problemsSolved: 48,
  accuracy: 85,
  streakDays: 6,
  conceptsMastered: 3,
  totalConcepts: 4,
};
