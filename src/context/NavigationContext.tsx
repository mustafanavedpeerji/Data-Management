import React, { createContext, useContext, useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import UnsavedChangesModal from '../components/UnsavedChangesModal';

interface NavigationContextType {
  navigateWithConfirm: (path: string, message?: string) => void;
  setUnsavedChanges: (hasChanges: boolean) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};

interface NavigationProviderProps {
  children: React.ReactNode;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  const navigate = useNavigate();
  const hasUnsavedChangesRef = useRef(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<{ path: string; message: string } | null>(null);

  const setUnsavedChanges = useCallback((hasChanges: boolean) => {
    hasUnsavedChangesRef.current = hasChanges;
  }, []);

  const navigateWithConfirm = useCallback((path: string, message: string = 'You have unsaved changes that will be lost if you leave this page. Are you sure you want to continue?') => {
    if (hasUnsavedChangesRef.current) {
      // Show modal instead of browser confirm
      setPendingNavigation({ path, message });
      setIsModalOpen(true);
      return;
    }
    navigate(path);
  }, [navigate]);

  const handleConfirm = useCallback(() => {
    if (pendingNavigation) {
      // Reset unsaved changes flag since user confirmed
      hasUnsavedChangesRef.current = false;
      navigate(pendingNavigation.path);
    }
    setIsModalOpen(false);
    setPendingNavigation(null);
  }, [navigate, pendingNavigation]);

  const handleCancel = useCallback(() => {
    setIsModalOpen(false);
    setPendingNavigation(null);
  }, []);

  return (
    <NavigationContext.Provider value={{ navigateWithConfirm, setUnsavedChanges }}>
      {children}
      <UnsavedChangesModal
        isOpen={isModalOpen}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        message={pendingNavigation?.message}
      />
    </NavigationContext.Provider>
  );
};