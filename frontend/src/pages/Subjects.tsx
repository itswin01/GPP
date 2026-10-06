import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Atom, ArrowRight, FlaskConical, Leaf, Lock, Sigma } from "lucide-react";
import {
  Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Select,
} from "@/components/ui/primitives";
import { useAuth } from "@/lib/auth";
import { CHAPTERS, GRADES, SUBJECTS } from "@/lib/mock-analytics";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  atom: Atom,
  flask: FlaskConical,
  sigma: Sigma,
  leaf: Leaf,
};

export default function Subjects() {
  const { student } = useAuth();
  const navigate = useNavigate();
  const [grade, setGrade] = React.useState(student?.grade ?? 11);
  const [subject, setSubject] = React.useState<string | null>(null);

  const chapters = CHAPTERS.filter((c) => c.grade === grade);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Choose a subject</h1>
          <p className="mt-1 text-muted-foreground">
            Pick your class, then the subject you want to practise.
          </p>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="grade" className="text-xs font-medium text-muted-foreground">Class</label>
          <Select id="grade" value={grade} onChange={(e) => setGrade(Number(e.target.value))} className="w-32">
            {GRADES.map((g) => (
              <option key={g} value={g}>Class {g}</option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SUBJECTS.map((s) => {
          const Icon = ICONS[s.icon] ?? Atom;
          const selected = subject === s.id;
          return (
            <button
              key={s.id}
              disabled={!s.available}
              onClick={() => setSubject(s.id)}
              className={`group relative flex flex-col items-start gap-3 rounded-lg border p-5 text-left transition-all ${
                !s.available
                  ? "cursor-not-allowed opacity-55"
                  : selected
                    ? "border-primary bg-accent/50 shadow-sm ring-1 ring-primary"
                    : "hover:border-primary/40 hover:bg-accent/30"
              }`}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="flex items-center gap-2 font-semibold">
                  {s.name}
                  {!s.available && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                </p>
                <p className="text-xs text-muted-foreground">
                  {s.available ? `${s.chapters} chapter available` : "Coming soon"}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {subject === "physics" && (
        <Card className="animate-fade-up">
          <CardHeader>
            <CardTitle>Physics · Class {grade}</CardTitle>
            <CardDescription>Select a chapter to open the solver.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {chapters.map((chapter) => (
              <div
                key={chapter.id}
                className={`flex items-center gap-4 rounded-lg border p-4 ${
                  chapter.available ? "" : "opacity-55"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-medium">
                    {chapter.name}
                    {chapter.available ? (
                      <Badge variant="success">Ready</Badge>
                    ) : (
                      <Badge variant="outline">Not in graph</Badge>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {chapter.available
                      ? "9 equations · 7 constraints · 3 concepts"
                      : "Needs knowledge-graph nodes before it can be solved"}
                  </p>
                </div>
                <Button
                  disabled={!chapter.available}
                  onClick={() => navigate("/solve")}
                  size="sm"
                >
                  Open solver
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {chapters.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No chapters configured for Class {grade}. Try Class 11.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
