"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { FileText, Clapperboard, Users, Shirt, Film, Video, ChevronLeft, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import { useState } from "react";

export default function CreativeHubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const params = useParams();
  const projectId = params.projectId as string;
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    { name: "Script", href: `/projects/${projectId}/creative-hub/script`, icon: FileText },
    { name: "Scenes", href: `/projects/${projectId}/creative-hub/scenes`, icon: Clapperboard },
    { name: "Characters", href: `/projects/${projectId}/creative-hub/characters`, icon: Users },
    { name: "Wardrobe", href: `/projects/${projectId}/creative-hub/wardrobe`, icon: Shirt },
    { name: "Storyboarding", href: `/projects/${projectId}/creative-hub/storyboard`, icon: Film },
  ];

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={clsx(
          "border-r border-[#1a1a1a] bg-[#0d0d0d] flex-shrink-0 flex flex-col transition-all duration-300",
          isCollapsed ? "w-16" : "w-56"
        )}
      >
        <div className="p-4 border-b border-[#1a1a1a] flex justify-between items-center">
          {!isCollapsed && (
            <Link href="/dashboard" className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Video className="h-5 w-5 text-emerald-500"/>
              Storyvord
            </Link>
          )}
          {isCollapsed && (
             <Link href="/dashboard" className="mx-auto text-emerald-500">
              <Video className="h-5 w-5"/>
            </Link>
          )}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-[#555] hover:text-white transition-colors"
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
        
        {!isCollapsed && (
          <div className="px-4 py-2">
             <p className="text-[10px] text-[#555] uppercase tracking-widest font-medium">Creative Hub</p>
          </div>
        )}

        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "text-[#888] hover:bg-[#161616] hover:text-white border border-transparent",
                  isCollapsed && "justify-center px-2"
                )}
                title={isCollapsed ? item.name : undefined}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-[#1a1a1a] flex justify-center">
           {!isCollapsed ? (
             <Link href="/dashboard" className="text-xs text-[#555] hover:text-white transition-colors flex items-center gap-1">
                ← Dashboard
             </Link>
           ) : (
             <Link href="/dashboard" className="text-xs text-[#555] hover:text-white transition-colors" title="Back to Dashboard">
                ← 
             </Link>
           )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-[#0a0a0a]">
        {children}
      </main>
    </div>
  );
}
