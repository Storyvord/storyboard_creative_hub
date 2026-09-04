import type { Metadata } from "next";

// page.tsx is a client component and cannot export metadata, so the route's
// title and description live here. Kept separate from the site-wide copy in the
// root layout: this page has its own argument and should be found by it.
export const metadata: Metadata = {
  title: "Storyvord. One set, every department.",
  description:
    "An AI co-producer for film units. Script breakdown, storyboards, call sheets, budget and compliance, in one workspace for every department on the floor.",
};

export default function AltLandingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
