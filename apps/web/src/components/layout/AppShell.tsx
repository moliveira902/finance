"use client";
import { Sidebar }     from "./Sidebar";
import { Topbar }      from "./Topbar";
import { MobileFrame } from "./MobileFrame";
import { useAppContext } from "@/contexts/AppContext";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { viewport } = useAppContext();
  const isMobile = viewport === "mobile";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      {/* Sidebar — desktop only */}
      {!isMobile && <Sidebar />}

      {/* Right column */}
      <div className={`flex flex-col flex-1 min-h-screen ${!isMobile ? "ml-[230px]" : ""}`}>
        <Topbar />

        {isMobile ? (
          <div className="flex-1 overflow-auto">
            <MobileFrame>{children}</MobileFrame>
          </div>
        ) : (
          <main className="flex-1 px-8 py-7 max-w-[1200px] w-full mx-auto">
            {children}
          </main>
        )}
      </div>
    </div>
  );
}
