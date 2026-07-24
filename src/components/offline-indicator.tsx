"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/**
 * A quiet, fixed banner shown while the browser reports no connection
 * (PRD §11: offline feedback). Announced politely so it does not steal focus,
 * and it simply disappears when the connection returns.
 */
export function OfflineIndicator() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-destructive text-destructive-foreground fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 px-4 py-2 text-sm"
    >
      <WifiOff aria-hidden className="size-4" />
      You are offline. Changes cannot be saved until the connection returns.
    </div>
  );
}
