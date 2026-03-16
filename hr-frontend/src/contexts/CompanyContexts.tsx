import { useState, createContext, useContext, type ReactNode } from "react";

export interface Company {
  id: string;
  name: string;
  shortName: string;
  logo: string;
  color: string;
}

const DEFAULT_COMPANY: Company = {
  id: "all",
  name: "All Companies",
  shortName: "ALL",
  logo: "🏢",
  color: "hsl(215 70% 45%)",
};

interface CompanyContextType {
  selectedCompany: Company;
  setSelectedCompany: (company: Company) => void;
}

const CompanyContext = createContext<CompanyContextType | null>(null);

export const useCompany = () => {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error("useCompany must be used within CompanyProvider");
  return ctx;
};

export const CompanyProvider = ({ children }: { children: ReactNode }) => {
  const [selectedCompany, setSelectedCompany] = useState<Company>(DEFAULT_COMPANY);
  return (
    <CompanyContext.Provider value={{ selectedCompany, setSelectedCompany }}>
      {children}
    </CompanyContext.Provider>
  );
};
