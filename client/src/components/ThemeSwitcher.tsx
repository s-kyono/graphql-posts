import { type Theme, useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";

const THEMES: { value: Theme; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "dark", label: "Dark" },
  { value: "cartoon", label: "Cartoon" },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex gap-2">
      {THEMES.map((t) => (
        <Button
          key={t.value}
          variant={theme === t.value ? "default" : "outline"}
          size="sm"
          onClick={() => setTheme(t.value)}
        >
          {t.label}
        </Button>
      ))}
    </div>
  );
}
