import { cn } from "@/lib/utils";

const PALETTES = [
  ["#36C5F0", "#2EB67D", "#ECB22E"],
  ["#E01E5A", "#611F69", "#36C5F0"],
  ["#2EB67D", "#ECB22E", "#E01E5A"],
  ["#FF8A00", "#E01E5A", "#611F69"],
  ["#36C5F0", "#4A154B", "#ECB22E"],
  ["#7C3AED", "#06B6D4", "#84CC16"],
  ["#F97316", "#EC4899", "#8B5CF6"],
  ["#10B981", "#3B82F6", "#F59E0B"],
];

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function getInitial(name?: string | null, userId?: string | null) {
  const source = (name || userId || "?").trim();
  return source.charAt(0).toUpperCase();
}

type UserAvatarProps = {
  userId?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
  avatarColors?: string[] | null;
  className?: string;
  textClassName?: string;
};

export function UserAvatar({
  userId,
  name,
  avatarUrl,
  avatarColors,
  className,
  textClassName,
}: UserAvatarProps) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name ?? userId ?? "ユーザー"}
        className={cn("rounded-full object-cover", className)}
      />
    );
  }

  const hash = hashString(`${userId ?? ""}:${name ?? ""}`);
  const [primary, secondary, accent] =
    avatarColors && avatarColors.length >= 3
      ? avatarColors
      : PALETTES[hash % PALETTES.length];
  const rotation = hash % 360;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-full flex items-center justify-center text-white shadow-sm",
        className,
      )}
      style={{
        background: `linear-gradient(${rotation}deg, ${primary}, ${secondary})`,
      }}
      aria-label={name ?? userId ?? "ユーザー"}
    >
      <span
        className="absolute -right-1 -top-1 h-1/2 w-1/2 rounded-full opacity-90"
        style={{ backgroundColor: accent }}
      />
      <span
        className="absolute -bottom-2 left-1 h-2/3 w-2/3 rounded-full opacity-70"
        style={{ backgroundColor: primary }}
      />
      <span
        className={cn(
          "relative z-10 font-bold leading-none drop-shadow-sm",
          textClassName,
        )}
      >
        {getInitial(name, userId)}
      </span>
    </div>
  );
}
