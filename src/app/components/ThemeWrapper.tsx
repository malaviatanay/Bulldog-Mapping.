"use client";

import { useTheme } from "@/context/ThemeContext";

export default function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();

  return (
    <div className={resolvedTheme === "dark" ? "dark" : ""} style={{ height: "100%", width: "100%" }}>
      {children}
    </div>
  );
}
