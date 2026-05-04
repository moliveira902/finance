import { CoachChat } from "@/components/coach/CoachChat";
import { PageHeader } from "@/components/ui/PageHeader";

export default function CoachPage() {
  return (
    <div className="flex flex-col gap-5 h-[calc(100vh-8rem)]">
      <PageHeader
        title="Meu Consultor"
        subtitle="Análise financeira personalizada com IA"
      />
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden min-h-0">
        <CoachChat />
      </div>
    </div>
  );
}
