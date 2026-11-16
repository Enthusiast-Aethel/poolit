import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { APP_NAME, CHAMA_NAME } from "../config";
import PasswordForm from "../components/PasswordForm";
import Icon from "../components/Icon";

// Shown after signing in with a temporary password. Nothing else works until this is done.
export default function ChangePassword() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.mustChangePassword) return <Navigate to={user.role === "chairperson" ? "/admin" : "/app"} replace />;

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl bg-surface-container-lowest shadow-xl overflow-hidden">
        <div className="bg-primary-container text-on-primary p-6 flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-secondary-container flex items-center justify-center">
            <Icon name="key" fill className="text-on-secondary-container" />
          </div>
          <div>
            <p className="font-headline-sm text-headline-sm font-bold">Choose your own password</p>
            <p className="font-label-sm text-label-sm text-secondary-fixed uppercase tracking-wider">{APP_NAME} · {CHAMA_NAME}</p>
          </div>
        </div>
        <div className="p-6 flex flex-col gap-5">
          <p className="font-body-md text-body-md text-on-surface-variant">
            Welcome, {user.name.split(" ")[0]}. The password you were given is only temporary. Enter it once more below, then choose a password that only you know.
          </p>
          <PasswordForm submitLabel="Save and continue" onDone={(u) => navigate(u.role === "chairperson" ? "/admin" : "/app", { replace: true })} />
          <button onClick={logout} className="font-label-md text-label-md font-bold text-on-surface-variant hover:text-on-surface">Sign out</button>
        </div>
      </div>
    </main>
  );
}
