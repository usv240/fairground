"use client";

import { useEffect } from "react";

// One tool registered through the raw WebMCP API — document.modelContext.registerTool —
// alongside the app's main surface (which uses Chrome's `use-webmcp-tool` hook, a
// lifecycle-managed wrapper around this same call). Registered on every page.
export function PlatformTool() {
  useEffect(() => {
    const mc = (document as Document & {
      modelContext?: {
        registerTool: (
          def: {
            name: string;
            description: string;
            inputSchema?: object;
            annotations?: { readOnlyHint?: boolean };
            execute: (input: unknown) => Promise<{ content: { type: string; text: string }[] }>;
          },
          opts?: { signal?: AbortSignal },
        ) => void;
      };
    }).modelContext;
    if (!mc?.registerTool) return;

    const controller = new AbortController();
    mc.registerTool(
      {
        name: "about_fairground_platform",
        description:
          "Identify this platform: what Fairground is, the open standards it is built on, and where its source code lives.",
        inputSchema: { type: "object", properties: {} },
        annotations: { readOnlyHint: true },
        execute: async () => ({
          content: [
            {
              type: "text",
              text:
                "Fairground — a neutral settlement ground where two people and their AI agents resolve everyday disputes: " +
                "sealed offers, neutral mediation, and agreements only humans can sign. " +
                "Built on the open WebMCP standard (document.modelContext) with per-role, per-phase tool registration. " +
                "Open source (MIT): https://github.com/usv240/fairground. " +
                "On the landing page, start with the open_dispute tool; inside a case, start with get_case_status.",
            },
          ],
        }),
      },
      { signal: controller.signal },
    );
    return () => controller.abort();
  }, []);

  return null;
}
