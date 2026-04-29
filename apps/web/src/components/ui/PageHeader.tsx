import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title:     string;
  subtitle?: string;
  actions?:  React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-3 @sm:flex-row @sm:items-start @sm:justify-between", className)}>
      <div>
        <h1 className="text-xl @sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0 flex-wrap">{actions}</div>
      )}
    </div>
  );
}
