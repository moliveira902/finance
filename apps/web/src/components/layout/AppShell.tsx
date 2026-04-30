"use client";
import { Sidebar }           from "./Sidebar";
import { Topbar }            from "./Topbar";
import { MobileFrame, RealMobileLayout } from "./MobileFrame";
import { useAppContext }     from "@/contexts/AppContext";
import { useIngestPoller }   from "@/hooks/useIngestPoller";
import { useStoreSync }      from "@/hooks/useStoreSync";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { viewport, isSmallScreen } = useAppContext();
  useStoreSync();      // load from server on mount, save on changes
  useIngestPoller();

  // On an actual small screen (real phone/tablet) always use the mobile layout
  // regardless of the Desktop/Mobile toggle — the toggle is for desktop preview only.
  const onRealPhone     = isSmallScreen;
  const onMobilePreview = !isSmallScreen && viewport === "mobile";
  const isMobile        = onRealPhone || onMobilePreview;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      {/* Sidebar — desktop only */}
      {!isMobile && <Sidebar />}

      {/* Right column */}
      <div className={`flex flex-col flex-1 min-h-screen ${!isMobile ? "ml-[230px]" : ""}`}>
        {/* Topbar (viewport toggle + theme toggle) — only shown on desktop */}
        {!onRealPhone && <Topbar />}

        {onRealPhone ? (
          // Actual small screen → fill viewport, nav at top, no phone chrome
          <div className="flex-1 overflow-auto">
            <RealMobileLayout>{children}</RealMobileLayout>
          </div>
        ) : onMobilePreview ? (
          // Desktop "Mobile" preview → phone simulator, nav at top inside chrome
          <div className="flex-1 overflow-auto">
            <MobileFrame>{children}</MobileFrame>
          </div>
        ) : (
          // Desktop layout
          <main className="flex-1 px-8 py-7 max-w-[1200px] w-full mx-auto @container">
            {children}
          </main>
        )}
      </div>
    </div>
  );
}
