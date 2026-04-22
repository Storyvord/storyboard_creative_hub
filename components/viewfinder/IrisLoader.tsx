"use client";

import React from "react";

// Wraps children in a 280ms iris-in reveal. Used at app mount / major route
// transitions. No idle animation — runs once then stays static.
export default function IrisLoader({ children }: { children: React.ReactNode }) {
  return <div className="vf-iris-in">{children}</div>;
}
