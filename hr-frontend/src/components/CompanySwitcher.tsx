"use client";

import { useEffect, useState } from "react";
import { useCompany } from "@/contexts/CompanyContexts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Permission } from "@/types/roles";

// สร้าง Interface ให้ตรงกับที่ API ส่งออกมา
interface Company {
  id: string;
  name: string;
  shortName: string;
  logo: string;
  color: string;
}

// 1. สร้างตัวเลือก "บริษัททั้งหมด" เตรียมไว้
const ALL_COMPANIES_OPTION: Company = {
  id: "all",
  name: "บริษัททั้งหมด",
  shortName: "ALL",
  logo: "🏢",
  color: "hsl(215 70% 45%)"
};

const CompanySwitcher = () => {
  const { selectedCompany, setSelectedCompany } = useCompany();
  const { hasPermission } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const canSeeAllCompanies =
    hasPermission(Permission.VIEW_HOLDING_DASHBOARD) ||
    hasPermission(Permission.VIEW_CONSOLIDATED_REPORTS);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const token = localStorage.getItem("token"); 
        const response = await fetch("http://localhost:5000/api/companies", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });

        if (response.status === 401) {
          console.error("Token หมดอายุ กรุณา Login ใหม่");
          return;
        }

        const data = await response.json();
        const apiCompanies = Array.isArray(data) ? data : data?.data || [];
        
        // Holding-level users can switch across companies; company-scoped users cannot.
        const normalizedCompanies = canSeeAllCompanies
          ? [ALL_COMPANIES_OPTION, ...apiCompanies]
          : apiCompanies;
        setCompanies(normalizedCompanies);

        if (normalizedCompanies.length > 0) {
          const hasCurrent = normalizedCompanies.some((c: Company) => c.id === selectedCompany.id);
          if (!selectedCompany.id || !hasCurrent || (!canSeeAllCompanies && selectedCompany.id === "all")) {
            setSelectedCompany(normalizedCompanies[0]);
          }
        }
      } catch (error) {
        console.error("Fetch error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompanies();
  }, [setSelectedCompany, selectedCompany.id, canSeeAllCompanies]);

  if (isLoading) return <div className="w-[220px] h-10 bg-muted animate-pulse rounded-md" />;

  return (
    <Select
      value={selectedCompany.id}
      onValueChange={(val) => {
        // หาบริษัทที่ตรงกับ id ที่เลือก (รวมถึง "all" ด้วย)
        const c = companies.find((c) => c.id === val);
        if (c) setSelectedCompany(c);
      }}
    >
      <SelectTrigger className="w-[220px] bg-card border-border">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          <SelectValue placeholder="เลือกบริษัท" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {/* เช็ค Array.isArray เพื่อความปลอดภัย 100% */}
        {Array.isArray(companies) && companies.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            <span className="flex items-center gap-2">
              <span>{c.logo}</span>
              <span>{c.name}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default CompanySwitcher;