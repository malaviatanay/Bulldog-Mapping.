"use client";

import { useEffect } from "react";
import { useTheme } from "@/context/ThemeContext";

export default function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (resolvedTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [resolvedTheme]);

  return <>{children}</>;
}
