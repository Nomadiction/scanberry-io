import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';

interface ScanState {
  file: File | null;
  previewUrl: string | null;
}

interface ScanContextValue extends ScanState {
  setImage: (file: File) => void;
  clear: () => void;
}

const ScanContext = createContext<ScanContextValue | null>(null);

export function ScanProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ScanState>({ file: null, previewUrl: null });
  const previewUrlRef = useRef<string | null>(null);

  const setImage = useCallback((file: File) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const url = URL.createObjectURL(file);
    previewUrlRef.current = url;
    setState({ file, previewUrl: url });
  }, []);

  const clear = useCallback(() => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setState({ file: null, previewUrl: null });
  }, []);

  return (
    <ScanContext.Provider value={{ ...state, setImage, clear }}>
      {children}
    </ScanContext.Provider>
  );
}

export function useScan() {
  const ctx = useContext(ScanContext);
  if (!ctx) throw new Error('useScan must be used within <ScanProvider>');
  return ctx;
}
