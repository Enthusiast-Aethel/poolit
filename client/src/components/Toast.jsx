import { createContext, useCallback, useContext, useState } from "react";
import Icon from "./Icon";

const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);

// const toast = useToast();  toast("Saved");  toast("Something failed", "error");
export function ToastProvider({ children }) {
  const [t, setT] = useState(null);
  const show = useCallback((message, tone = "ok") => {
    setT({ message, tone });
    setTimeout(() => setT(null), 4500);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {t && (
        <div role="status"
          className={`fixed bottom-20 lg:bottom-6 right-4 lg:right-6 z-[60] max-w-md px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 font-label-md text-label-md ${
            t.tone === "error" ? "bg-error text-on-error" : "bg-primary-container text-on-primary"}`}>
          <Icon name={t.tone === "error" ? "error" : "check_circle"} fill className={t.tone === "error" ? "" : "text-secondary-fixed"} />
          <span>{t.message}</span>
        </div>
      )}
    </ToastContext.Provider>
  );
}
