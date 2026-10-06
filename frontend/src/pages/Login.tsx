import * as React from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, ArrowRight, ShieldAlert } from "lucide-react";
import { RobotHero } from "@/components/ui/robot-hero";
import { Button, Card, Input, Label, Select } from "@/components/ui/primitives";
import { useAuth } from "@/lib/auth";
import { GRADES } from "@/lib/mock-analytics";

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = React.useState("");
  const [rollNumber, setRollNumber] = React.useState("");
  const [grade, setGrade] = React.useState(11);
  const [error, setError] = React.useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Enter your name to continue.");
      return;
    }
    signIn({ name: name.trim(), rollNumber: rollNumber.trim() || "—", grade });
    navigate("/dashboard");
  }

  return (
    <RobotHero backgroundText="CALCMATE">
      <div className="pointer-events-auto flex h-full items-center justify-end px-6 md:px-16">
        <Card className="w-full max-w-sm border-black/10 bg-white/85 shadow-2xl backdrop-blur-md animate-fade-up">
          <form onSubmit={handleSubmit} className="space-y-5 p-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-primary">
                <GraduationCap className="h-5 w-5" />
                <span className="text-sm font-semibold uppercase tracking-wider">Student sign in</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Welcome to CalcMate</h1>
              <p className="text-sm text-zinc-600">
                A physics tutor that shows its working — and refuses to guess.
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-zinc-700">Full name</Label>
                <Input
                  id="name"
                  value={name}
                  autoComplete="off"
                  placeholder="Tejaswin Bhola"
                  onChange={(e) => {
                    setName(e.target.value);
                    setError("");
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="roll" className="text-zinc-700">Roll number <span className="text-zinc-400">(optional)</span></Label>
                <Input
                  id="roll"
                  value={rollNumber}
                  autoComplete="off"
                  placeholder="11A-24"
                  onChange={(e) => setRollNumber(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="grade" className="text-zinc-700">Class</Label>
                <Select id="grade" value={grade} onChange={(e) => setGrade(Number(e.target.value))}>
                  {GRADES.map((g) => (
                    <option key={g} value={g}>Class {g}</option>
                  ))}
                </Select>
              </div>
            </div>

            {error && <p className="text-sm font-medium text-destructive">{error}</p>}

            <Button type="submit" size="lg" className="w-full">
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>

            {/* Honesty about what this screen is. No password field is shown
                because there is nothing to check it against. */}
            <div className="flex items-start gap-2 rounded-md bg-amber-500/10 px-3 py-2">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
              <p className="text-[11px] leading-relaxed text-amber-800">
                Demo sign-in. No password, no account, nothing verified — your name is
                kept in this browser only.
              </p>
            </div>
          </form>
        </Card>
      </div>
    </RobotHero>
  );
}
