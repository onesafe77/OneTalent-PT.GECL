import { useState, useEffect, useCallback, useRef } from "react";

interface UseSidakDraftOptions<T> {
  key: string;
  initialData: T;
  debounceMs?: number;
  onRestored?: (data: T) => void;
}

interface UseSidakDraftReturn<T> {
  hasDraft: boolean;
  draftTimestamp: string | null;
  saveDraft: (data: T) => void;
  clearDraft: () => void;
  restoreDraft: () => T | null;
  ignoreDraft: () => void;
  showRecoveryDialog: boolean;
  setShowRecoveryDialog: (show: boolean) => void;
  getSavedDraft: () => T | null;
}

export function useSidakDraft<T>({
  key,
  initialData,
  debounceMs = 1000
}: UseSidakDraftOptions<T>): UseSidakDraftReturn<T> {
  const storageKey = `sidak_draft_${key}`;
  const timestampKey = `sidak_draft_timestamp_${key}`;
  
  const [hasDraft, setHasDraft] = useState(false);
  const [draftTimestamp, setDraftTimestamp] = useState<string | null>(null);
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Selama dialog pemulihan terbuka, autosave DILARANG menimpa draft lama —
  // state form saat itu masih kosong (step 1) dan user belum memutuskan lanjut/hapus.
  const recoveryOpenRef = useRef(false);
  useEffect(() => {
    recoveryOpenRef.current = showRecoveryDialog;
  }, [showRecoveryDialog]);

  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(storageKey);
      const savedTimestamp = localStorage.getItem(timestampKey);
      
      if (savedDraft) {
        setHasDraft(true);
        setDraftTimestamp(savedTimestamp);
        setShowRecoveryDialog(true);
      }
    } catch (error) {
      console.error("Error checking draft:", error);
    }
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [storageKey, timestampKey]);

  const saveDraft = useCallback((data: T) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      try {
        if (recoveryOpenRef.current) return; // jangan timpa draft sebelum user menjawab dialog
        const hasData = JSON.stringify(data) !== JSON.stringify(initialData);
        if (hasData) {
          const iso = new Date().toISOString();
          localStorage.setItem(storageKey, JSON.stringify(data));
          localStorage.setItem(timestampKey, iso);
          setHasDraft(true);
          setDraftTimestamp(iso);
          // Broadcast ke MobileSidakLayout (penanda "Terakhir disimpan ...")
          try { window.dispatchEvent(new CustomEvent("sidak:draft-saved", { detail: { at: iso } })); } catch {}
        }
      } catch (error) {
        console.error("Error saving draft:", error);
      }
    }, debounceMs);
  }, [storageKey, timestampKey, debounceMs, initialData]);

  const getSavedDraft = useCallback((): T | null => {
    try {
      const savedDraft = localStorage.getItem(storageKey);
      if (savedDraft) {
        return JSON.parse(savedDraft) as T;
      }
    } catch (error) {
      console.error("Error getting draft:", error);
    }
    return null;
  }, [storageKey]);

  const clearDraft = useCallback(() => {
    try {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      localStorage.removeItem(storageKey);
      localStorage.removeItem(timestampKey);
      setHasDraft(false);
      setDraftTimestamp(null);
      try { window.dispatchEvent(new CustomEvent("sidak:draft-saved", { detail: { at: null } })); } catch {}
    } catch (error) {
      console.error("Error clearing draft:", error);
    }
  }, [storageKey, timestampKey]);

  const restoreDraft = useCallback((): T | null => {
    try {
      const savedDraft = localStorage.getItem(storageKey);
      if (savedDraft) {
        setShowRecoveryDialog(false);
        return JSON.parse(savedDraft) as T;
      }
    } catch (error) {
      console.error("Error restoring draft:", error);
    }
    setShowRecoveryDialog(false);
    return null;
  }, [storageKey]);

  const ignoreDraft = useCallback(() => {
    clearDraft();
    setShowRecoveryDialog(false);
  }, [clearDraft]);

  return {
    hasDraft,
    draftTimestamp,
    saveDraft,
    clearDraft,
    restoreDraft,
    ignoreDraft,
    showRecoveryDialog,
    setShowRecoveryDialog,
    getSavedDraft
  };
}

export function formatDraftTimestamp(isoString: string | null): string {
  if (!isoString) return "";
  
  try {
    const date = new Date(isoString);
    return date.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return "";
  }
}
