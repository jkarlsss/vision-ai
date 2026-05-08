"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

export type CanvasSaveStatus = "error" | "saved" | "saving";

interface CanvasSaveStatusContextValue {
  manualSaveRequestId: number;
  requestManualSave: () => void;
  saveStatus: CanvasSaveStatus;
  setSaveStatus: Dispatch<SetStateAction<CanvasSaveStatus>>;
}

interface CanvasSaveStatusProviderProps {
  children: ReactNode;
}

const CanvasSaveStatusContext =
  createContext<CanvasSaveStatusContextValue | null>(null);

export function CanvasSaveStatusProvider({
  children,
}: CanvasSaveStatusProviderProps) {
  const [saveStatus, setSaveStatus] = useState<CanvasSaveStatus>("saved");
  const [manualSaveRequestId, setManualSaveRequestId] = useState(0);
  const requestManualSave = useCallback(() => {
    setManualSaveRequestId((requestId) => requestId + 1);
  }, []);
  const value = useMemo(
    () => ({
      manualSaveRequestId,
      requestManualSave,
      saveStatus,
      setSaveStatus,
    }),
    [manualSaveRequestId, requestManualSave, saveStatus],
  );

  return (
    <CanvasSaveStatusContext.Provider value={value}>
      {children}
    </CanvasSaveStatusContext.Provider>
  );
}

export function useCanvasSaveStatus() {
  const context = useContext(CanvasSaveStatusContext);

  if (!context) {
    throw new Error(
      "useCanvasSaveStatus must be used within CanvasSaveStatusProvider.",
    );
  }

  return context;
}
