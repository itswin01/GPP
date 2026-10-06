/**
 * ⚠️  DEMO AUTHENTICATION — NOT SECURE.
 *
 * There is no user model, no password store and no session handling in the
 * backend. This keeps a student's name and class in localStorage so the UI
 * has an identity to display and route on. Anyone can type anything.
 *
 * To make this real: add a users table, hash passwords, issue a session
 * cookie or JWT from FastAPI, and replace this provider with calls to it.
 */
import * as React from "react";

export interface Student {
  name: string;
  rollNumber: string;
  grade: number;
}

interface AuthValue {
  student: Student | null;
  signIn: (student: Student) => void;
  signOut: () => void;
}

const STORAGE_KEY = "calcmate.student";

const AuthContext = React.createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [student, setStudent] = React.useState<Student | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Student) : null;
    } catch {
      // Private browsing or blocked storage — start signed out.
      return null;
    }
  });

  const signIn = React.useCallback((next: Student) => {
    setStudent(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* non-fatal: the session just won't survive a reload */
    }
  }, []);

  const signOut = React.useCallback(() => {
    setStudent(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const value = React.useMemo(
    () => ({ student, signIn, signOut }),
    [student, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
