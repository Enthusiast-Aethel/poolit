import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import ComingSoon from "./components/ComingSoon";
import Login from "./pages/Login";
import AdminLayout from "./layouts/AdminLayout";
import MemberLayout from "./layouts/MemberLayout";
import Overview from "./pages/admin/Overview";
import MemberHome from "./pages/member/Home";

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
          <Route index element={<Overview />} />
          <Route path="contributions" element={<ComingSoon title="Contributions" />} />
          <Route path="loans" element={<ComingSoon title="Loans & Fines" />} />
          <Route path="welfare" element={<ComingSoon title="Welfare & Chama Pool" />} />
          <Route path="meetings" element={<ComingSoon title="Meetings" />} />
          <Route path="members" element={<ComingSoon title="Members" />} />
          <Route path="dividends" element={<ComingSoon title="Dividends" />} />
          <Route path="settings" element={<ComingSoon title="Settings" />} />
        </Route>
      </Route>

      {/* Member portal (the chairperson can view it too) */}
      <Route element={<ProtectedRoute />}>
        <Route path="/app" element={<MemberLayout />}>
          <Route index element={<MemberHome />} />
          <Route path="savings" element={<div className="p-4"><ComingSoon title="My savings" /></div>} />
          <Route path="loans" element={<div className="p-4"><ComingSoon title="My loans" /></div>} />
          <Route path="welfare" element={<div className="p-4"><ComingSoon title="My welfare & governance" /></div>} />
          <Route path="statement" element={<div className="p-4"><ComingSoon title="My statement" /></div>} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}