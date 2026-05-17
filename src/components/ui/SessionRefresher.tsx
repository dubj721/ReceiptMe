"use client";

/**
 * SessionRefresher
 *
 * Supabase's autoRefreshToken uses setInterval. On iOS/Android PWAs, JavaScript
 * timers are paused when the app is backgrounded. When the user returns after
 * the 1-hour access token TTL, the token is expired and no auto-refresh fires —
 * the next Supabase call gets a 401, triggers SIGNED_OUT, and the user is logged out.
 *
 * This component listens for the page becoming visible again and forces a session
 * refresh. It also calls startAutoRefresh() to ensure the Supabase client's
 * internal timer is running after the page loads (important for PWAs added to
 * the home screen, which bypass normal browser tab lifecycle management).
 */

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SessionRefresher() {
  useEffect(() => {
    const supabase = createClient();

    // Kick off the internal refresh timer (safe to call even if already running)
    supabase.auth.startAutoRefresh();

    async function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        // Page came back to the foreground — refresh the session immediately.
        // getUser() triggers a server-side token validation + refresh if needed.
        await supabase.auth.getUser();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      supabase.auth.stopAutoRefresh();
    };
  }, []);

  return null;
}
