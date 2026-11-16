import { useAuth } from "../../context/AuthContext";
import PasswordForm from "../../components/PasswordForm";
import Icon from "../../components/Icon";
import { ROLE_LABEL } from "../../utils/labels";
import { initials } from "../../utils/format";

export default function Account() {
  const { user, logout } = useAuth();

  return (
    <div className="px-margin-mobile flex flex-col gap-space-md pt-space-md pb-space-lg">
      <div>
        <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface font-extrabold tracking-tight">My account</h2>
        <p className="font-body-md text-body-md text-on-surface-variant">Your details and your password.</p>
      </div>

      <section className="rounded-xl bg-surface-container-lowest p-4 shadow-sm flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-primary-container text-secondary-fixed flex items-center justify-center font-headline-sm text-headline-sm font-extrabold shrink-0">{initials(user.name)}</div>
        <div className="min-w-0">
          <p className="font-headline-sm text-headline-sm font-bold text-primary-container truncate">{user.name}</p>
          <p className="font-body-sm text-body-sm text-on-surface-variant">{ROLE_LABEL[user.role]}{user.memberNo ? ` · #${user.memberNo}` : ""}</p>
          <p className="font-body-sm text-body-sm text-on-surface-variant">{user.phone}</p>
        </div>
      </section>

      <section className="rounded-xl bg-surface-container-lowest p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-1"><Icon name="key" className="text-secondary" /><h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">Change password</h3></div>
        <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">If you forget it, ask the chairperson to give you a new temporary one.</p>
        <PasswordForm />
      </section>

      <button onClick={logout} className="min-h-[48px] rounded-xl bg-surface-container text-on-surface-variant font-label-lg text-label-lg font-bold flex items-center justify-center gap-2">
        <Icon name="logout" className="text-[20px]" /> Sign out
      </button>
    </div>
  );
}
