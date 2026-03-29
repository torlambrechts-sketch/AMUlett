export function HsePageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-bold tracking-tight text-[#111827] sm:text-3xl">{title}</h1>
      {subtitle ? <p className="mt-1 max-w-2xl text-sm text-[#6b7280]">{subtitle}</p> : null}
    </div>
  );
}
