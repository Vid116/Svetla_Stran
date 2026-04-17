"use client";

import { useState } from "react";
import { InboxView } from "./inbox-view";
import { ProcessingView } from "./processing-view";
import { PublishedView } from "./published-view";
import { ThemeBalance } from "./theme-balance";

const TABS = [
  { id: "inbox", label: "Inbox" },
  { id: "processing", label: "V obdelavi" },
  { id: "published", label: "Objavljeni" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function EditorTabs({ defaultTab = "inbox" }: { defaultTab?: TabId }) {
  const [active, setActive] = useState<TabId>(defaultTab);

  return (
    <div>
      {/* Tab bar */}
      <div className="mb-8 flex items-center gap-1 rounded-full bg-secondary p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
              active === tab.id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Theme balance indicator */}
      {active === "inbox" && <ThemeBalance />}

      {/* Tab content */}
      {active === "inbox" && <InboxView />}
      {active === "processing" && <ProcessingView />}
      {active === "published" && <PublishedView />}
    </div>
  );
}
