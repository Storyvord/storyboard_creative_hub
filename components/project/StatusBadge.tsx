"use client";

interface StatusBadgeProps {
  status?: string;
}

const STATUS_STYLES: Record<string, string> = {
  PLANNING: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  IN_PROGRESS: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  COMPLETED: "bg-green-500/20 text-green-400 border-green-500/30",
  CANCELLED: "bg-red-500/20 text-red-400 border-red-500/30",
  PAUSED: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  DEVELOPMENT: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  PRE_PRODUCTION: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  POST_PRODUCTION: "bg-teal-500/20 text-teal-400 border-teal-500/30",
  RELEASED: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  if (!status) return null;
  const styles = STATUS_STYLES[status] ?? "bg-gray-500/20 text-gray-400 border-gray-500/30";
  const label = status.replace(/_/g, " ");
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${styles}`}>
      {label}
    </span>
  );
}
