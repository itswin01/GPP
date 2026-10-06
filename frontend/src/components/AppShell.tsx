import { Link, useLocation, useNavigate } from "react-router-dom";
import { Atom, LayoutDashboard, LogOut, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/subjects", label: "Subjects", icon: Atom },
  { to: "/solve", label: "Solver", icon: MessageSquareText },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { student, signOut } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const initials = (student?.name ?? "?")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
          <Link to="/dashboard" className="flex items-center gap-2 font-bold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              C
            </span>
            CalcMate
          </Link>

          <nav className="flex items-center gap-1">
            {NAV.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  pathname === to
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">{student?.name}</p>
              <p className="text-xs text-muted-foreground">
                Class {student?.grade} · {student?.rollNumber}
              </p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-sm font-semibold">
              {initials}
            </span>
            <Button
              variant="ghost"
              size="icon"
              title="Sign out"
              onClick={() => {
                signOut();
                navigate("/login");
              }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
