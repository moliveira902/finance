"use client";
import { useEffect, useState, useCallback } from "react";
import type { HealthScore, HealthScoreHistoryEntry, BadgeItem } from "@/lib/healthScore";

export function useHealthScore() {
  const [data, setData]       = useState<HealthScore | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(() => {
    setLoading(true);
    fetch("/api/health-score")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: HealthScore | null) => {
        // API returns the HealthScore object directly
        if (d && typeof d.total === "number") setData(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { data, loading, refetch };
}

export function useHealthScoreHistory(months = 12) {
  const [data, setData] = useState<HealthScoreHistoryEntry[]>([]);

  useEffect(() => {
    fetch(`/api/health-score/history?months=${months}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: unknown) => {
        // API returns the array directly
        if (Array.isArray(d)) setData(d as HealthScoreHistoryEntry[]);
      })
      .catch(() => {});
  }, [months]);

  return data;
}

export function useBadges() {
  const [data, setData] = useState<BadgeItem[]>([]);

  useEffect(() => {
    fetch("/api/badges")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: unknown) => {
        // API returns the array directly
        if (Array.isArray(d)) setData(d as BadgeItem[]);
      })
      .catch(() => {});
  }, []);

  return data;
}

export interface AppNotification {
  id:        string;
  type:      string;
  message:   string;
  status:    "unread" | "read" | "pending" | "sent" | "failed";
  createdAt: string;
}

export function useNotifications() {
  const [data, setData]     = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);

  const refetch = useCallback(() => {
    fetch("/api/notifications?page=1&pageSize=20")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { data?: AppNotification[] } | null) => {
        // API returns { data: AppNotification[], total, page, ... }
        if (d?.data && Array.isArray(d.data)) {
          setData(d.data);
          setUnread(d.data.filter((n) => n.status !== "read").length);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  const markRead = useCallback((id: string) => {
    fetch(`/api/notifications/${id}/read`, { method: "PUT" })
      .then(() => refetch())
      .catch(() => {});
  }, [refetch]);

  return { data, unread, markRead, refetch };
}

export function useStreakFreeze(onSuccess: () => void) {
  const [loading, setLoading] = useState(false);

  const use_ = useCallback(() => {
    setLoading(true);
    fetch("/api/health-score/streak-freeze", { method: "POST" })
      .then((r) => r.json())
      .then((d: { ok?: boolean }) => { if (d.ok) onSuccess(); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [onSuccess]);

  return { use: use_, loading };
}

export interface NotificationPrefsData {
  telegramConnected:   boolean;
  telegramConnectedAt: string | null;
  prefs: {
    telegram_enabled:  boolean;
    quiet_hours_start: string;
    quiet_hours_end:   string;
    max_per_day:       number;
    types:             Record<string, boolean>;
  };
}

export function useNotificationPrefs() {
  const [data, setData]       = useState<NotificationPrefsData | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(() => {
    fetch("/api/notifications/preferences")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: NotificationPrefsData | null) => {
        // API returns { prefs, telegramConnected, telegramConnectedAt }
        if (d && typeof d.telegramConnected === "boolean") setData(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  const update = useCallback((patch: { types?: Record<string, boolean>; telegram_enabled?: boolean }) => {
    fetch("/api/notifications/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).then(() => refetch()).catch(() => {});
  }, [refetch]);

  return { data, loading, update, refetch };
}
