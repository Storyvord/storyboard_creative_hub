import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ToastProvider from "@/context/ToastProvider";
import { ThemeProvider } from "@/context/ThemeContext";
import { ViewfinderProvider } from "@/context/ViewfinderContext";
import ViewfinderFrame from "@/components/viewfinder/ViewfinderFrame";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Creative Hub",
  description: "Storyvord Creative Hub Frontend",
};

const themeScript = `
(function() {
  try {
    // Viewfinder mode default ON; only explicit 'off' disables.
    var vfMode = localStorage.getItem('vf-mode');
    var vfActive = vfMode !== 'off';
    if (vfActive) {
      document.documentElement.setAttribute('data-viewfinder', 'on');
    }

    // Theme respects the user's choice regardless of Viewfinder mode.
    // Viewfinder has both dark and light palettes.
    var stored = localStorage.getItem('ch-theme');
    if (stored === 'light' || stored === 'dark') {
      document.documentElement.setAttribute('data-theme', stored);
    } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
    }

    var vfGel = localStorage.getItem('vf-gel');
    if (vfGel) {
      document.documentElement.style.setProperty('--vf-project', vfGel);
    }
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.setAttribute('data-viewfinder', 'on');
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <ViewfinderProvider>
            <ToastProvider>
              <ViewfinderFrame>{children}</ViewfinderFrame>
            </ToastProvider>
          </ViewfinderProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
