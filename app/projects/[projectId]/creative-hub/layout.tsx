"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { FileText, Clapperboard, Users, Shirt, Film, BarChart2, Video, ChevronLeft, ChevronRight } from "lucide-react";
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
    <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden">
      {/* Sidebar */}
      {/* Sidebar */}
      <aside 
        className={clsx(
          "border-r border-gray-800 bg-gray-900 flex-shrink-0 flex flex-col transition-all duration-300",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
          {!isCollapsed && (
            <Link href="/dashboard" className="text-xl font-bold text-indigo-500 tracking-tight flex items-center gap-2">
              <Video className="h-6 w-6"/>
              Storyvord
            </Link>
          )}
          {isCollapsed && (
             <Link href="/dashboard" className="mx-auto text-indigo-500">
              <Video className="h-6 w-6"/>
            </Link>
          )}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-gray-500 hover:text-white transition-colors"
          >
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>
        
        {!isCollapsed && (
          <div className="px-6 py-2">
             <p className="text-xs text-gray-500">Creative Hub</p>
          </div>
        )}

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={clsx(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-indigo-600/10 text-indigo-400 border border-indigo-600/20"
                    : "text-gray-400 hover:bg-gray-800 hover:text-gray-200",
                  isCollapsed && "justify-center px-2"
                )}
                title={isCollapsed ? item.name : undefined}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-800 flex justify-center">
           {!isCollapsed ? (
             <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-2">
                ← Back to Dashboard
             </Link>
           ) : (
             <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-300 transition-colors" title="Back to Dashboard">
                ← 
             </Link>
           )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-gray-950">
        {children}
      </main>
    </div>
  );
}
