"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import PlatformTour, { PLATFORM_TOUR_DONE_KEY, PLATFORM_TOUR_PAGE_KEY, PlatformTourTrigger } from "@/components/creative-hub/PlatformTour";

// The outer sidebar is now provided by app/projects/[projectId]/layout.tsx.
// This layout only handles the PlatformTour overlay.
export default function CreativeHubLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const projectId = params.projectId as string;
  const [isTourVisible, setIsTourVisible] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem(PLATFORM_TOUR_DONE_KEY)) {
      if (!localStorage.getItem(PLATFORM_TOUR_PAGE_KEY)) {
        localStorage.setItem(PLATFORM_TOUR_PAGE_KEY, "script");
      }
      setIsTourVisible(true);
    }
  }, []);

  return (
    <div className="relative flex-1 h-full">
      {/* Tour trigger button in top-right corner */}
      <div className="absolute top-3 right-3 z-10">
        <PlatformTourTrigger onClick={() => {
          localStorage.removeItem(PLATFORM_TOUR_DONE_KEY);
          if (!localStorage.getItem(PLATFORM_TOUR_PAGE_KEY)) {
            localStorage.setItem(PLATFORM_TOUR_PAGE_KEY, "script");
          }
          setIsTourVisible(true);
        }} />
      </div>

      {children}

      {isTourVisible && (
        <PlatformTour
          projectId={projectId}
          onDone={() => setIsTourVisible(false)}
        />
      )}
    </div>
  );
}
