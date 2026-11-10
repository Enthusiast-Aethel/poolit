import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { APP_NAME, CHAMA_NAME } from "../config";
import Icon from "../components/Icon";

export default function Login() {
  const { user, login } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Already signed in: send each role to its own portal
  if (user) return <Navigate to={user.role === "chairperson" ? "/admin" : "/app"} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(identifier, password);
    } catch (err) {
      setError(err.response?.data?.message || "Could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="relative w-full max-w-5xl">
        <div className="absolute -top-16 -left-16 w-96 h-96 bg-secondary-fixed/30 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute -bottom-16 -right-16 w-96 h-96 bg-primary-fixed/40 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="grid grid-cols-1 lg:grid-cols-12 rounded-xl bg-surface-container-lowest shadow-xl overflow-hidden">
          {/* Brand panel */}
          <div className="lg:col-span-5 bg-primary-container text-surface-container-lowest p-8 lg:p-10 flex flex-col relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 opacity-5 pointer-events-none">
              <svg fill="currentColor" height="280" viewBox="0 0 100 100" width="280">
                <polygon points="50,5 90,90 10,90" />
                <polygon points="50,25 78,85 22,85" />
              </svg>
            </div>
            <div className="relative z-10 flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-secondary-container flex items-center justify-center">
                <Icon name="account_balance" fill className="text-primary-container" />
              </div>
              <div>
                <p className="font-headline-sm text-headline-sm tracking-tight">{APP_NAME}</p>
                <p className="font-label-sm text-label-sm text-secondary-fixed tracking-wider uppercase">{CHAMA_NAME}</p>
              </div>
            </div>
            <div className="relative z-10 mt-10">
              <h1 className="font-headline-lg text-headline-lg leading-tight">Institutional Wealth, Communal Dignity.</h1>
              <p className="mt-3 font-body-md text-body-md text-surface-dim">
                Harambee solidarity with clear, accountable records of every contribution, loan and payout.
              </p>
            </div>
          </div>

          {/* Form panel */}
          <div className="lg:col-span-7 p-8 lg:p-12 bg-surface-container-lowest">
            <h2 className="font-display-lg-mobile lg:font-display-lg text-display-lg-mobile lg:text-display-lg text-on-surface tracking-tight">
              Access Portal
            </h2>
            <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
              Sign in to see your savings, loans and chama records.
            </p>

            <form onSubmit={submit} className="mt-8 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="identifier" className="font-label-md text-label-md text-on-surface">
                  Phone number, member number or email
                </label>
                <div className="flex items-center rounded-lg bg-surface-container-lowest shadow-sm ring-1 ring-outline-variant focus-within:ring-2 focus-within:ring-secondary">
                  <span className="pl-3.5 text-outline"><Icon name="person" className="text-xl" /></span>
                  <input
                    id="identifier" autoComplete="username" required
                    value={identifier} onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="0722 123 456"
                    className="w-full h-12 px-3 font-body-md text-body-md bg-transparent focus:outline-none placeholder:text-outline-variant"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="password" className="font-label-md text-label-md text-on-surface">Password</label>
                <div className="flex items-center rounded-lg bg-surface-container-lowest shadow-sm ring-1 ring-outline-variant focus-within:ring-2 focus-within:ring-secondary">
                  <span className="pl-3.5 text-outline"><Icon name="lock" className="text-xl" /></span>
                  <input
                    id="password" required autoComplete="current-password"
                    type={show ? "text" : "password"}
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-12 px-3 font-body-md text-body-md bg-transparent focus:outline-none"
                  />
                  <button type="button" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}
                    className="pr-3.5 text-outline hover:text-on-surface">
                    <Icon name={show ? "visibility_off" : "visibility"} className="text-xl" />
                  </button>
                </div>
              </div>

              {error && (
                <div role="alert" className="p-3 rounded-lg bg-error-container text-on-error-container font-body-sm text-body-sm flex items-center gap-2">
                  <Icon name="error" className="text-base" /> {error}
                </div>
              )}

              <button
                type="submit" disabled={loading}
                className="w-full min-h-[48px] py-3.5 px-6 rounded-lg bg-secondary-container hover:bg-secondary-fixed-dim text-on-secondary-fixed font-label-lg text-label-lg flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99] disabled:opacity-60"
              >
                <Icon name={loading ? "progress_activity" : "lock_open"} fill className={`text-xl ${loading ? "animate-spin" : ""}`} />
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <p className="mt-6 font-body-sm text-body-sm text-on-surface-variant">
              Forgot your password? Ask the chairperson to reset it for you.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}