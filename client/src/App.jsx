import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import ComingSoon from "./components/ComingSoon";
import Login from "./pages/Login";
import AdminLayout from "./layouts/AdminLayout";
import MemberLayout from "./layouts/MemberLayout";
const Overview = lazy(() => import("./pages/admin/Overview"));
const Members = lazy(() => import("./pages/admin/Members"));
const Contributions = lazy(() => import("./pages/admin/Contributions"));
const Loans = lazy(() => import("./pages/admin/Loans"));
const LoanDetail = lazy(() => import("./pages/admin/LoanDetail"));
const Fines = lazy(() => import("./pages/admin/Fines"));
const Welfare = lazy(() => import("./pages/admin/Welfare"));
const MerryGoRound = lazy(() => import("./pages/admin/MerryGoRound"));
const Meetings = lazy(() => import("./pages/admin/Meetings"));
const Dividends = lazy(() => import("./pages/admin/Dividends"));
const Finance = lazy(() => import("./pages/admin/Finance"));
const Settings = lazy(() => import("./pages/admin/Settings"));
const Messages = lazy(() => import("./pages/admin/Messages"));
import MemberHome from "./pages/member/Home";
import MySavings from "./pages/member/Savings";
import MyLoans from "./pages/member/Loans";
import MyWelfare from "./pages/member/Welfare";
import Statement from "./pages/member/Statement";

// Admin screens load on demand, so members on mobile data never download them
const page = (Page) => (
  <Suspense fallback={<p className="py-16 text-center text-on-surface-variant">Loading…</p>}>
    <Page />
  </Suspense>
);

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "chairperson" ? "/admin" : "/app"} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />

      {/* Chairperson portal */}
      <Route element={<ProtectedRoute admin />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={page(Overview)} />
          <Route path="members" element={page(Members)} />
          <Route path="contributions" element={page(Contributions)} />
          <Route path="loans" element={page(Loans)} />
          <Route path="loans/fines" element={page(Fines)} />
          <Route path="loans/:id" element={page(LoanDetail)} />
          <Route path="welfare" element={page(Welfare)} />
          <Route path="welfare/merry-go-round" element={page(MerryGoRound)} />
          <Route path="meetings" element={page(Meetings)} />
          <Route path="dividends" element={page(Dividends)} />
          <Route path="dividends/finance" element={page(Finance)} />
          <Route path="messages" element={page(Messages)} />
          <Route path="settings" element={page(Settings)} />
        </Route>
      </Route>

      {/* Member portal (the chairperson can view it too) */}
      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<MemberLayout />}>
          <Route index element={<MemberHome />} />
          <Route path="savings" element={<MySavings />} />
          <Route path="loans" element={<MyLoans />} />
          <Route path="welfare" element={<MyWelfare />} />
        </Route>
        {/* The statement is a plain page with no menus, so it prints cleanly */}
        <Route path="/app/statement" element={<Statement />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
