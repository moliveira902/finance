"use client";
import { useEffect, useRef } from "react";
import { useFinanceStore } from "@/stores/financeStore";

const DEBOUNCE_MS = 1500;

export function useStoreSync() {
  const loaded = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  // On mount: pull from server and overwrite local store
  useEffect(() => {
    let alive = true;

    fetch("/api/store")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!alive) return;
        if (json?.data) {
          const { categories } = useFinanceStore.getState();
          useFinanceStore.setState({
            transactions: json.data.transactions ?? [],
            accounts:     json.data.accounts     ?? [],
            categories:   json.data.categories   ?? categories,
            profile:      json.data.profile       ?? { name: "", email: "" },
            members:      json.data.members       ?? [],
          });
        }
        loaded.current = true;
      })
      .catch(() => {
        loaded.current = true;
      });

    return () => {
      alive = false;
    };
  }, []);

  // Subscribe to store changes and debounce-save to server
  useEffect(() => {
    const unsub = useFinanceStore.subscribe((state) => {
      if (!loaded.current) return; // skip the initial hydration write

      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        const { transactions, accounts, categories, profile, members } = state;
        fetch("/api/store", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transactions, accounts, categories, profile, members }),
        }).catch(() => {});
      }, DEBOUNCE_MS);
    });

    return () => {
      unsub();
      clearTimeout(timer.current);
    };
  }, []);
}
