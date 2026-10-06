import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { AuthProvider, useAuth } from "@/lib/auth";
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import Solver from "@/pages/Solver";
import Subjects from "@/pages/Subjects";

/** Routes behind sign-in. Demo-only: it gates the UI, not any data. */
function Protected({ children }: { children: React.ReactNode }) {
  const { student } = useAuth();
  if (!student) return <Navigate to="/login" replace />;
  return <AppShell>{children}</AppShell>;
}

function Router() {
  const { student } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={student ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route path="/subjects" element={<Protected><Subjects /></Protected>} />
      <Route path="/solve" element={<Protected><Solver /></Protected>} />
      <Route path="*" element={<Navigate to={student ? "/dashboard" : "/login"} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}
