
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ClinicContextType {
  selectedClinic: string | null;
  setSelectedClinic: (clinic: string | null) => void;
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

export const useClinicContext = (): ClinicContextType => {
  const context = useContext(ClinicContext);
  if (!context) {
    throw new Error('useClinicContext must be used within a ClinicProvider');
  }
  return context;
};

interface ClinicProviderProps {
  children: ReactNode;
}

export const ClinicProvider: React.FC<ClinicProviderProps> = ({ children }) => {
  const [selectedClinic, setSelectedClinic] = useState<string | null>(null);

  const value: ClinicContextType = {
    selectedClinic,
    setSelectedClinic,
  };

  return (
    <ClinicContext.Provider value={value}>
      {children}
    </ClinicContext.Provider>
  );
};
