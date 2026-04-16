"use client";

interface MemberAvatarProps {
  name?: string;
  email: string;
  size?: "sm" | "md" | "lg";
}

function hashColor(str: string): string {
  const colors = [
    "bg-emerald-500",
    "bg-blue-500",
    "bg-purple-500",
    "bg-orange-500",
    "bg-pink-500",
    "bg-teal-500",
    "bg-yellow-500",
    "bg-red-500",
    "bg-indigo-500",
    "bg-cyan-500",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

const SIZE_CLASSES = {
  sm: "h-7 w-7 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-11 w-11 text-base",
};

export default function MemberAvatar({ name, email, size = "md" }: MemberAvatarProps) {
  const label = name?.trim() || email;
  const initials = label
    .split(/\s+/)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
  const color = hashColor(email);
  return (
    <div
      className={`rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0 ${color} ${SIZE_CLASSES[size]}`}
      title={name || email}
    >
      {initials || "?"}
    </div>
  );
}
