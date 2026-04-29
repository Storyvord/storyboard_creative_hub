"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

// Creative Hub root — redirect to Script (the primary entry point)
export default function CreativeHubRootPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  useEffect(() => {
    if (projectId) {
      router.replace(`/projects/${projectId}/creative-hub/script`);
    }
  }, [projectId, router]);

  return null;
}
