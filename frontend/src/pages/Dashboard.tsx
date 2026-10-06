import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  Area, AreaChart, CartesianGrid, Cell, PolarAngleAxis, PolarGrid, Radar, RadarChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart,
} from "recharts";
import { AlertTriangle, ArrowRight, Flame, Lock, Target, TrendingUp } from "lucide-react";
import {
  Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Progress, Select,
} from "@/components/ui/primitives";
import { MockDataBadge } from "@/components/MockDataBadge";
import { useAuth } from "@/lib/auth";
import {
  CHAPTERS, CONCEPT_SCORES, GRADES, PROGRESS, SUMMARY, WEAK_SPOTS,
} from "@/lib/mock-analytics";

const SEVERITY = (rate: number) =>
  rate >= 35 ? "danger" : rate >= 20 ? "warning" : "success";

export default function Dashboard() {
  const { student } = useAuth();
  const navigate = useNavigate();
  const [grade, setGrade] = React.useState(student?.grade ?? 11);

  const chapters = CHAPTERS.filter((c) => c.grade === grade);

  return (
    <div className="space-y-6">
      {/* Header + grade toggle */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Hello, {student?.name?.split(" ")[0] ?? "student"}
          </h1>
          <p className="mt-1 text-muted-foreground">
            Here is where you stand across your chapters.
          </p>
        </div>
        <div className="flex items-end gap-3">
          <div className="space-y-1.5">
            <label htmlFor="grade-toggle" className="text-xs font-medium text-muted-foreground">
              Class
            </label>
            <Select
              id="grade-toggle"
              value={grade}
              onChange={(e) => setGrade(Number(e.target.value))}
              className="w-32"
            >
              {GRADES.map((g) => (
                <option key={g} value={g}>Class {g}</option>
              ))}
            </Select>
          </div>
          <Button onClick={() => navigate("/subjects")}>
            Start solving
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <MockDataBadge />

      {/* Summary tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={Target} label="Problems solved" value={SUMMARY.problemsSolved} hint="all time" />
        <StatTile icon={TrendingUp} label="Accuracy" value={`${SUMMARY.accuracy}%`} hint="last 30 days" />
        <StatTile icon={Flame} label="Streak" value={`${SUMMARY.streakDays} days`} hint="keep it going" />
        <StatTile
          icon={Target}
          label="Concepts mastered"
          value={`${SUMMARY.conceptsMastered}/${SUMMARY.totalConcepts}`}
          hint="in kinematics"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Progress over time */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Progress</CardTitle>
              <CardDescription>Accuracy and volume, week by week</CardDescription>
            </div>
            <MockDataBadge compact />
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={PROGRESS} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="accuracyFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="week" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid hsl(var(--border))",
                    fontSize: 12,
                  }}
                  formatter={(value, name) =>
                    name === "accuracy"
                      ? [`${value}%`, "Accuracy"]
                      : [String(value), "Solved"]
                  }
                />
                <Area
                  type="monotone" dataKey="accuracy" stroke="hsl(var(--primary))"
                  strokeWidth={2.5} fill="url(#accuracyFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Concept radar */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>By concept</CardTitle>
              <CardDescription>Mastery across the graph</CardDescription>
            </div>
            <MockDataBadge compact />
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              {/* outerRadius leaves room for the axis labels — at 72% the
                  longer concept names ("Relative motion") get clipped. */}
              <RadarChart data={CONCEPT_SCORES} outerRadius="60%">
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="concept" fontSize={10} tick={{ width: 90 }} />
                <Radar
                  dataKey="score" stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))" fillOpacity={0.3} strokeWidth={2}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }}
                  formatter={(v) => [`${v}%`, "Mastery"]}
                />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Weak spot detection */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Weak spot detection
            </CardTitle>
            <CardDescription>
              Where mistakes cluster — grouped by the constraint or equation involved
            </CardDescription>
          </div>
          <MockDataBadge compact />
        </CardHeader>
        <CardContent className="space-y-5">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={WEAK_SPOTS} layout="vertical" margin={{ left: 10, right: 24 }}>
              <XAxis type="number" domain={[0, 50]} hide />
              <YAxis
                type="category" dataKey="label" width={190}
                tickLine={false} axisLine={false} fontSize={12}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))" }}
                contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }}
                formatter={(v) => [`${v}% error rate`, ""]}
              />
              <Bar dataKey="errorRate" radius={[0, 6, 6, 0]} barSize={18}>
                {WEAK_SPOTS.map((spot) => (
                  <Cell
                    key={spot.id}
                    fill={
                      spot.errorRate >= 35 ? "#ef4444"
                      : spot.errorRate >= 20 ? "#f59e0b"
                      : "#10b981"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className="space-y-2">
            {WEAK_SPOTS.slice(0, 3).map((spot) => (
              <div key={spot.id} className="flex items-start gap-3 rounded-lg border bg-secondary/40 p-3">
                <Badge variant={SEVERITY(spot.errorRate) as "danger" | "warning" | "success"}>
                  {spot.errorRate}%
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{spot.label}</p>
                  <p className="text-sm text-muted-foreground">{spot.hint}</p>
                </div>
                <Badge variant="outline" className="shrink-0 capitalize">{spot.kind}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Chapters */}
      <Card>
        <CardHeader>
          <CardTitle>Chapters</CardTitle>
          <CardDescription>
            Only chapters present in the knowledge graph can be solved today.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {chapters.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No chapters configured for Class {grade} yet.
            </p>
          )}
          {chapters.map((chapter) => (
            <button
              key={chapter.id}
              disabled={!chapter.available}
              onClick={() => navigate("/solve")}
              className={`flex items-center gap-4 rounded-lg border p-4 text-left transition-colors ${
                chapter.available
                  ? "hover:border-primary/40 hover:bg-accent/40"
                  : "cursor-not-allowed opacity-55"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium">{chapter.name}</p>
                  {!chapter.available && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                </div>
                {chapter.available ? (
                  <>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {chapter.correct}/{chapter.attempted} correct · {chapter.mastery}% mastery
                    </p>
                    <Progress value={chapter.mastery} className="mt-2" />
                  </>
                ) : (
                  <p className="mt-0.5 text-xs text-muted-foreground">Not in the knowledge graph yet</p>
                )}
              </div>
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  hint: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold leading-tight">{value}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
      </CardContent>
    </Card>
  );
}
