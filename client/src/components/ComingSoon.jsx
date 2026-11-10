import Icon from "./Icon";

export default function ComingSoon({ title }) {
  return (
    <div className="rounded-xl bg-surface-container-lowest p-8 shadow-sm flex flex-col items-center text-center gap-2">
      <Icon name="construction" className="text-secondary text-[32px]" />
      <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">{title}</h2>
      <p className="font-body-md text-body-md text-on-surface-variant">This screen is built in the next step.</p>
    </div>
  );
}