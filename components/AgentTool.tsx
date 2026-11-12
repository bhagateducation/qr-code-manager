"use client";

import { useEffect } from "react";
import { publicInfoResult, publicInfoTool } from "@/lib/public-discovery";

type BrowserTool = typeof publicInfoTool & { execute: () => ReturnType<typeof publicInfoResult> };
type ModelContext = {
  registerTool: (tool: BrowserTool) => void;
  unregisterTool?: (name: string) => void;
};

let registered = false;

export default function AgentTool() {
  useEffect(() => {
    const context = (navigator as Navigator & { modelContext?: ModelContext }).modelContext;
    if (!context || registered) return;
    try {
      context.registerTool({ ...publicInfoTool, execute: publicInfoResult });
      registered = true;
    } catch {
      return;
    }
    return () => {
      if (context.unregisterTool) {
        context.unregisterTool(publicInfoTool.name);
        registered = false;
      }
    };
  }, []);

  return null;
}
