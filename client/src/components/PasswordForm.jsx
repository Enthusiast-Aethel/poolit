import { useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "./Toast";
import Icon from "./Icon";

// Used on the account page and on the "choose your own password" page
export default function PasswordForm({ onDone, submitLabel = "Change password" }) {
  const { setSession } = useAuth();
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const rules = [
    ["At least 8 characters", next.length >= 8],
    ["Different from your current password", next.length > 0 && next !== current],
    ["Both new passwords match", next.length > 0 && next === again],
  ];
  const ready = current && rules.every(([, ok]) => ok);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const { data } = await api.patch("/auth/password", { currentPassword: current, newPassword: next });
      setSession(data.token, data.user);
      toast("Your password has been changed");
      onDone?.(data.user);
    } catch (err) {
      setError(err.response?.data?.message || "Could not change your password. Check your connection and try again.");
      setSaving(false);
    }
  };

  const field = (id, label, value, set, auto) => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-label-md text-label-md text-on-surface">{label}</label>
      <div className="flex items-center rounded-lg bg-surface-container-lowest shadow-sm ring-1 ring-outline-variant focus-within:ring-2 focus-within:ring-secondary">
        <span className="pl-3.5 text-outline"><Icon name="lock" className="text-xl" /></span>
        <input id={id} type={show ? "text" : "password"} autoComplete={auto} value={value} onChange={(e) => set(e.target.value)}
          className="w-full h-12 px-3 font-body-md text-body-md bg-transparent focus:outline-none" />
      </div>
    </div>
  );

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {field("current-password", "Current password", current, setCurrent, "current-password")}
      {field("new-password", "New password", next, setNext, "new-password")}
      {field("confirm-password", "New password again", again, setAgain, "new-password")}

      <label className="flex items-center gap-2 font-label-md text-label-md text-on-surface-variant cursor-pointer">
        <input type="checkbox" className="w-4 h-4 accent-primary-container" checked={show} onChange={(e) => setShow(e.target.checked)} /> Show passwords
      </label>

      <ul className="rounded-lg bg-surface-container-low p-3 flex flex-col gap-1.5">
        {rules.map(([text, ok]) => (
          <li key={text} className={`flex items-center gap-2 font-body-sm text-body-sm ${ok ? "text-on-tertiary-container" : "text-on-surface-variant"}`}>
            <Icon name={ok ? "check_circle" : "radio_button_unchecked"} fill={ok} className="text-[18px]" /> {text}
          </li>
        ))}
        <li className="font-body-sm text-body-sm text-on-surface-variant pl-6">Do not use your phone number. A short phrase of three or four words is easy to remember and hard to guess.</li>
      </ul>

      {error && (
        <div role="alert" className="p-3 rounded-lg bg-error-container text-on-error-container font-body-sm text-body-sm flex items-center gap-2">
          <Icon name="error" className="text-base" /> {error}
        </div>
      )}

      <button type="submit" disabled={!ready || saving}
        className="w-full min-h-[48px] rounded-lg bg-secondary-container text-on-secondary-container font-label-lg text-label-lg flex items-center justify-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
        <Icon name="key" fill className="text-xl" /> {saving ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
