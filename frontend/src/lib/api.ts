/**
 * Typed client for the FastAPI backend.
 *
 * Shapes mirror calcmate.models.Solution.to_jsonable() exactly — if that
 * method changes, this file must change with it.
 */

export interface SolutionStep {
  equation_node: string;
  law_node: string;
  equation: string;
  substitution: Record<string, number>;
  solved_symbol: string;
  value: number;
  unit: string;
}

export interface PhaseTrace {
  phase: string;
  status: "ok" | "blocked" | "skipped" | string;
  detail: string;
}

export interface RetrievedCase {
  case_id: string;
  score: number;
  constraints_fired: string[];
  equations_used: string[];
  law_nodes: string[];
}

export interface UnitValidation {
  expected_unit: string;
  actual_unit: string;
  is_valid: boolean;
  message: string;
}

export interface Quantity {
  symbol: string;
  value: number;
  unit: string;
  source_text: string;
}

export interface Solution {
  overlay_id: string;
  extraction: {
    raw_text: string;
    target: string;
    domain_hint: string;
    trigger_phrases: string[];
    quantities: Record<string, Quantity>;
  };
  applied_constraints: string[];
  steps: SolutionStep[];
  answer: { symbol: string; value: number | null; unit: string };
  law_nodes: string[];
  narration: string;
  retrieved_cases: RetrievedCase[];
  unit_validation: UnitValidation | null;
  phase_trace: PhaseTrace[];
  was_under_constrained: boolean;
  was_contradiction: boolean;
  was_unresolved: boolean;
  fallback_case_id: string | null;
  attempt_id?: string;
}

export class ApiError extends Error {}

export async function solveProblem(text: string, overlayId = "ncert"): Promise<Solution> {
  const response = await fetch("/api/solve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, overlay_id: overlayId }),
  });

  if (!response.ok) {
    // FastAPI puts the message in `detail`; fall back to the status line.
    let detail = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      if (body?.detail) detail = String(body.detail);
    } catch {
      /* non-JSON error body — keep the status text */
    }
    throw new ApiError(detail);
  }

  return response.json();
}

export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch("/api/health");
    return response.ok;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ *
 * Presentation helpers — turn graph node ids into student-facing text. *
 * ------------------------------------------------------------------ */

const EQUATION_NAMES: Record<string, string> = {
  eq_s_vt: "Distance at constant speed",
  eq_average_speed: "Average speed",
  eq_v_u_at: "First equation of motion",
  eq_s_ut_half_at2: "Second equation of motion",
  eq_v2_u2_2as: "Third equation of motion",
  eq_avg_velocity: "Average velocity",
  eq_time_of_flight: "Time of flight",
  eq_relative_speed: "Relative velocity",
  eq_meeting_time: "Time to meet",
};

const CONSTRAINT_NAMES: Record<string, string> = {
  constraint_from_rest: "Starts from rest, so u = 0",
  constraint_comes_to_rest: "Comes to rest, so v = 0",
  constraint_constant_speed: "Constant speed, so a = 0",
  constraint_max_height_v_zero: "At maximum height, v = 0",
  constraint_free_fall_upward_a_minus_g: "Free fall, so a = −9.8 m/s²",
  constraint_same_direction_relative_motion: "Same direction",
  constraint_opposite_direction_relative_motion: "Opposite directions",
  // The reasoner's meta-rules imply exactly what the graph constraints above
  // imply, and both can fire for one problem. Giving them identical labels
  // lets the UI de-duplicate them into a single chip.
  meta_from_rest_u_zero: "Starts from rest, so u = 0",
  meta_free_fall_a_minus_g: "Free fall, so a = −9.8 m/s²",
};

const SYMBOL_NAMES: Record<string, string> = {
  u: "initial velocity",
  v: "final velocity",
  a: "acceleration",
  t: "time",
  s: "displacement",
  speed: "speed",
  distance: "distance",
  time: "time",
  avg_v: "average velocity",
  v1: "velocity of first body",
  v2: "velocity of second body",
  relative_speed: "relative velocity",
  separation: "separation",
  direction: "direction",
};

export const equationName = (id: string) => EQUATION_NAMES[id] ?? id;
export const constraintName = (id: string) => CONSTRAINT_NAMES[id] ?? id;
export const symbolName = (id: string) => SYMBOL_NAMES[id] ?? id;

/** "v = u + a*t" → "v = u + a·t" for display. */
export const prettyEquation = (expression: string) =>
  expression.replace(/\*\*/g, "^").replace(/\*/g, "·");

/** "m/s^2" → "m/s²" — the backend stores units ASCII-safe. */
export const prettyUnit = (unit: string) =>
  unit.replace(/\^2/g, "²").replace(/\^3/g, "³");

/** Phase ids like "4a_trigger_constraints" → "Trigger constraints". */
export function phaseLabel(phase: string): string {
  const withoutIndex = phase.replace(/^\d+[a-z]?_/, "");
  return withoutIndex.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

export interface NarrationLine {
  text: string;
  kind: "heading" | "math" | "body";
}

/**
 * The narrator is an LLM writing for a student, and it reaches for LaTeX and
 * markdown unprompted: \( … \), \boxed{…}, \text{m/s}, **Given:**. Rendering
 * that verbatim next to a clean answer card looks broken, so strip the markup
 * down to readable lines and tag the ones that are equations.
 */
export function formatNarration(narration: string): NarrationLine[] {
  let cleaned = narration
    // Display and inline math delimiters -> newlines so equations sit alone.
    .replace(/\\\[|\\\]/g, "\n")
    .replace(/\\\(|\\\)/g, "")
    .replace(/\$\$?/g, "")
    // Arrows, spacing and symbol commands.
    .replace(/\\(?:quad|qquad|,|;|:|!|>| )/g, " ")
    .replace(/\\(?:Rightarrow|rightarrow|to|implies)/g, "→")
    .replace(/\\times/g, "×")
    .replace(/\\cdot/g, "·")
    .replace(/\\pm/g, "±")
    .replace(/\\left|\\right/g, "")
    .replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, "($1)/($2)");

  // \text{…} and \boxed{…} nest — \boxed{s = 20 \text{m}} needs two passes.
  // Repeat until the string stops changing rather than guessing a depth.
  const WRAPPER = /\\(?:text|mathrm|textbf|textit|boxed|operatorname)\s*\{([^{}]*)\}/g;
  for (let i = 0; i < 5; i++) {
    const next = cleaned.replace(WRAPPER, "$1");
    if (next === cleaned) break;
    cleaned = next;
  }

  cleaned = cleaned
    // Superscript/subscript braces: v^{2} -> v^2, a_{x} -> a_x
    .replace(/([\^_])\{([^{}]*)\}/g, "$1$2")
    // Any LaTeX command we did not name explicitly.
    .replace(/\\[a-zA-Z]+/g, "")
    // Markdown emphasis — we render plain text, so drop the markers.
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/(?<!\*)\*(?!\*)/g, "")
    // Non-breaking hyphens the model emits mid-word ("Step‑wise").
    .replace(/‑/g, "-")
    // Braces left behind once their command was removed.
    .replace(/[{}]/g, "")
    .replace(/[ \t]{2,}/g, " ");

  return cleaned
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((text) => {
      if (/^(given|find|answer|step|solution)\b.*:?$/i.test(text) && text.length < 40) {
        return { text: text.replace(/:$/, ""), kind: "heading" as const };
      }
      // A line that is mostly symbols and an equals sign is an equation.
      if (/=/.test(text) && text.replace(/[^a-zA-Z]/g, "").length <= text.length / 2) {
        return { text, kind: "math" as const };
      }
      return { text, kind: "body" as const };
    });
}
