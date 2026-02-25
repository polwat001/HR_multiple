import { useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useCompany } from "@/contexts/CompanyContext";
import { employees, companies } from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter } from "lucide-react";

const statusStyles: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  probation: "bg-warning/10 text-warning border-warning/20",
  inactive: "bg-destructive/10 text-destructive border-destructive/20",
};

const EmployeeList = () => {
  const { selectedCompany } = useCompany();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");

  const companyFilter = searchParams.get("company") || selectedCompany.id;

  const filtered = useMemo(() => {
    return employees.filter((emp) => {
      if (companyFilter !== "all" && emp.companyId !== companyFilter) return false;
      if (deptFilter !== "all" && emp.department !== deptFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          emp.firstName.toLowerCase().includes(q) ||
          emp.lastName.toLowerCase().includes(q) ||
          emp.employeeCode.toLowerCase().includes(q) ||
          emp.position.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [companyFilter, deptFilter, search]);

  const departments = [...new Set(employees.map((e) => e.department))];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Filters */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employee..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground">
              {filtered.length} employee(s)
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="shadow-card overflow-hidden">
        <CardHeader className="pb-0">
          <CardTitle className="text-base">Employee List</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Code</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Company</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Department</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Position</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp) => {
                  const company = companies.find((c) => c.id === emp.companyId);
                  return (
                    <tr
                      key={emp.id}
                      className="border-b last:border-b-0 hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => navigate(`/employees/${emp.id}`)}
                    >
                      <td className="px-4 py-3 font-mono text-xs">{emp.employeeCode}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{emp.avatar}</span>
                          <span className="font-medium">{emp.firstName} {emp.lastName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5 text-xs">
                          {company?.logo} {company?.shortName}
                        </span>
                      </td>
                      <td className="px-4 py-3">{emp.department}</td>
                      <td className="px-4 py-3">{emp.position}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={statusStyles[emp.status]}>
                          {emp.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeList;
