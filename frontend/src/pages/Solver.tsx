import * as React from "react";
import {
  AlertCircle, CheckCircle2, ChevronDown, CornerDownLeft, Loader2, Network, Sparkles, XCircle,
} from "lucide-react";
import {
  Badge, Button, Card, CardContent, Input, Separator, Switch,
} from "@/components/ui/primitives";
import {
  constraintName, equationName, formatNarration, phaseLabel, prettyEquation, prettyUnit,
  solveProblem, symbolName, type Solution,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const SAMPLES = [
  "A motorcycle starts from rest and accelerates at 3 m/s^2 for 8 seconds. What is its final velocity?",
  "A ball is thrown upward with initial velocity 20 m/s. Find the maximum height.",
  "A school bus travels 36 km in 45 minutes. What is the average speed in km/h?",
  "An object moves for 5 seconds. How far does it go?",
];

interface Turn {
  id: number;
  question: string;
  solution?: Solution;
  error?: string;
  pending: boolean;
}

export default function Solver() {
  const [question, setQuestion] = React.useState("");
  const [turns, setTurns] = React.useState<Turn[]>([]);
  const [showGraph, setShowGraph] = React.useState(false);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const nextId = React.useRef(0);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  async function ask(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    const id = nextId.current++;
    setTurns((prev) => [...prev, { id, question: trimmed, pending: true }]);
    setQuestion("");

    try {
      const solution = await solveProblem(trimmed);
      setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, solution, pending: false } : t)));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, error: message, pending: false } : t)));
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Problem solver</h1>
          <p className="mt-1 text-muted-foreground">
            Motion in a Straight Line Â· every answer is symbolically verified before you see it
          </p>
        </div>

        {/* The toggle the brief asked for: refined answer by default, the raw
            knowledge-graph path on demand. */}
        <label className="flex cursor-pointer items-center gap-3 rounded-lg border bg-card px-4 py-2.5">
          <Network className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Show reasoning graph</span>
          <Switch checked={showGraph} onCheckedChange={setShowGraph} />
        </label>
      </div>

      {turns.length === 0 && (
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="h-5 w-5" />
              <p className="font-semibold">Try one of these</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {SAMPLES.map((sample) => (
                <button
                  key={sample}
                  onClick={() => ask(sample)}
                  className="rounded-lg border bg-secondary/40 p-3 text-left text-sm transition-colors hover:border-primary/40 hover:bg-accent/40"
                >
                  {sample}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              The last one is under-constrained on purpose â€” watch it decline to answer
              rather than invent a number.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-5">
        {turns.map((turn) => (
          <div key={turn.id} className="space-y-3 animate-fade-up">
            <div className="flex justify-end">
              <div className="max-w-2xl rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-primary-foreground">
                {turn.question}
              </div>
            </div>

            {turn.pending && (
              <Card className="max-w-3xl">
                <CardContent className="flex items-center gap-3 p-5 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Extracting quantities, solving, verifyingâ€¦</span>
                </CardContent>
              </Card>
            )}

            {turn.error && (
              <Card className="max-w-3xl border-destructive/40">
                <CardContent className="flex items-start gap-3 p-5">
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                  <div>
                    <p className="font-medium text-destructive">Could not process that</p>
                    <p className="mt-1 text-sm text-muted-foreground">{turn.error}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {turn.solution && <AnswerCard solution={turn.solution} showGraph={showGraph} />}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
        className="sticky bottom-4 flex items-center gap-2 rounded-xl border bg-card p-2 shadow-lg"
      >
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Type a kinematics problemâ€¦"
          className="border-0 shadow-none focus-visible:ring-0"
        />
        <Button type="submit" disabled={!question.trim()}>
          Solve
          <CornerDownLeft className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

/* --------------------------------------------------------------- Answer */

function AnswerCard({ solution, showGraph }: { solution: Solution; showGraph: boolean }) {
  const unresolved = solution.was_unresolved;
  const answer = solution.answer;
  const givens = Object.values(solution.extraction.quantities);
  const finalStep = solution.steps[solution.steps.length - 1];

  return (
    <Card className={cn("max-w-3xl", unresolved && "border-amber-500/40")}>
      <CardContent className="space-y-4 p-5">
        {unresolved ? (
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <p className="font-semibold text-amber-700">No verified answer</p>
              <p className="mt-1 text-sm text-muted-foreground">
                This problem is under-constrained â€” there isn't enough information to
                reach <span className="font-medium">{symbolName(answer.symbol)}</span>.
                Rather than guess, the solver stops here.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-baseline gap-3">
              <CheckCircle2 className="h-5 w-5 shrink-0 translate-y-1 text-emerald-500" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {symbolName(answer.symbol)}
                </p>
                <p className="text-3xl font-bold tracking-tight">
                  {answer.value} <span className="text-xl text-muted-foreground">{prettyUnit(answer.unit)}</span>
                </p>
              </div>
              {solution.unit_validation?.is_valid && (
                <Badge variant="success" className="ml-auto">Verified</Badge>
              )}
            </div>

            {/* Refined, student-facing view â€” no node ids. */}
            <Separator />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Given
                </p>
                <ul className="space-y-1 text-sm">
                  {givens.map((q) => (
                    <li key={q.symbol} className="flex justify-between gap-3">
                      <span className="text-muted-foreground">{symbolName(q.symbol)}</span>
                      <span className="font-medium">{q.value} {prettyUnit(q.unit)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Method
                </p>
                {finalStep && (
                  <>
                    <p className="text-sm font-medium">{equationName(finalStep.equation_node)}</p>
                    <code className="mt-1 block rounded bg-secondary px-2 py-1 text-sm">
                      {prettyEquation(finalStep.equation)}
                    </code>
                  </>
                )}
              </div>
            </div>

            {solution.applied_constraints.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  What the wording told us
                </p>
                <div className="flex flex-wrap gap-2">
                  {[...new Set(solution.applied_constraints.map(constraintName))].map((label) => (
                    <Badge key={label} variant="secondary">{label}</Badge>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* On an unresolved attempt the narration is the same "no verified
            answer" sentence already shown above, so there is nothing to expand. */}
        {!unresolved && solution.narration && <Explanation narration={solution.narration} />}

        {/* Everything below is the raw graph path â€” hidden unless toggled. */}
        {showGraph && <GraphTrace solution={solution} />}
      </CardContent>
    </Card>
  );
}

/** Collapsible step-by-step explanation, LaTeX stripped out. */
function Explanation({ narration }: { narration: string }) {
  const [open, setOpen] = React.useState(false);
  const lines = React.useMemo(() => formatNarration(narration), [narration]);
  if (lines.length === 0) return null;

  return (
    <>
      <Separator />
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-sm font-semibold">Step-by-step explanation</span>
        <ChevronDown
          className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="space-y-2 animate-fade-up">
          {lines.map((line, i) =>
            line.kind === "heading" ? (
              <p key={i} className="pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {line.text}
              </p>
            ) : line.kind === "math" ? (
              <code key={i} className="block rounded bg-secondary px-3 py-1.5 text-sm">
                {line.text}
              </code>
            ) : (
              <p key={i} className="text-sm leading-relaxed text-foreground/90">
                {line.text}
              </p>
            ),
          )}
        </div>
      )}
    </>
  );
}

function GraphTrace({ solution }: { solution: Solution }) {
  const statusColor: Record<string, string> = {
    ok: "text-emerald-600",
    blocked: "text-red-600",
    skipped: "text-muted-foreground",
  };

  return (
    <div className="space-y-4 rounded-lg border bg-secondary/30 p-4">
      <div className="flex items-center gap-2">
        <Network className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-semibold">Knowledge-graph path</p>
        <Badge variant="outline" className="ml-auto">developer view</Badge>
      </div>

      {solution.steps.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Solution steps
          </p>
          <ol className="space-y-2">
            {solution.steps.map((step, i) => (
              <li key={i} className="rounded-md border bg-card p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{step.equation_node}</Badge>
                  <Badge variant="outline">{step.law_node}</Badge>
                </div>
                <code className="mt-2 block text-xs">{prettyEquation(step.equation)}</code>
                <p className="mt-1 text-xs text-muted-foreground">
                  {Object.entries(step.substitution).map(([k, v]) => `${k}=${v}`).join(", ")}
                  {" â†’ "}
                  <span className="font-medium text-foreground">
                    {step.solved_symbol} = {step.value} {prettyUnit(step.unit)}
                  </span>
                </p>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Phase trace
        </p>
        <ul className="space-y-1 font-mono text-xs">
          {solution.phase_trace.map((phase, i) => (
            <li key={i} className="flex gap-2">
              <span className={cn("w-16 shrink-0 font-semibold", statusColor[phase.status] ?? "")}>
                {phase.status}
              </span>
              <span className="w-44 shrink-0 text-muted-foreground">{phaseLabel(phase.phase)}</span>
              <span className="min-w-0 flex-1 break-words text-foreground/80">{phase.detail}</span>
            </li>
          ))}
        </ul>
      </div>

      {solution.retrieved_cases.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Retrieved cases
          </p>
          <div className="flex flex-wrap gap-2">
            {solution.retrieved_cases.map((c) => (
              <Badge key={c.case_id} variant="outline">
                {c.case_id} Â· {c.score.toFixed(2)}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {solution.unit_validation && (
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold">Verification: </span>
          {solution.unit_validation.message}
        </p>
      )}
    </div>
  );
}
