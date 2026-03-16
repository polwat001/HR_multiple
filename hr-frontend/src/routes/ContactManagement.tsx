import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Search, Download } from "lucide-react";
import { apiGet } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";

interface EmployeeContact {
  id: number;
  employee_code?: string;
  firstname_th?: string;
  lastname_th?: string;
  position_name?: string;
  department_name?: string;
  company_name?: string;
  email?: string;
  phone?: string;
  mobile?: string;
}

type ExportColumnKey =
  | "employee_code"
  | "firstname_th"
  | "lastname_th"
  | "position_name"
  | "department_name"
  | "company_name"
  | "email"
  | "phone";

const exportColumnKeys: ExportColumnKey[] = [
  "employee_code",
  "firstname_th",
  "lastname_th",
  "position_name",
  "department_name",
  "company_name",
  "email",
  "phone",
];

const ContactManagement = () => {
  const { t } = useLanguage();
  const [rows, setRows] = useState<EmployeeContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedColumns, setSelectedColumns] = useState<ExportColumnKey[]>(
    exportColumnKeys
  );

  const exportColumnOptions = useMemo(
    () => exportColumnKeys.map((key) => ({ key, label: t(`contacts.columns.${key}`) })),
    [t]
  );

  useEffect(() => {
    const fetchDirectory = async () => {
      try {
        setLoading(true);
        const res = await apiGet<any>("/employees");
        const list = Array.isArray(res) ? res : res?.data || [];
        setRows(list);
      } catch (error) {
        console.error("Failed to fetch contact directory:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDirectory();
  }, []);

  const filteredRows = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return rows;

    return rows.filter((row) => {
      const fullName = `${row.firstname_th || ""} ${row.lastname_th || ""}`.trim().toLowerCase();
      return [
        fullName,
        String(row.employee_code || "").toLowerCase(),
        String(row.position_name || "").toLowerCase(),
        String(row.department_name || "").toLowerCase(),
        String(row.company_name || "").toLowerCase(),
        String(row.email || "").toLowerCase(),
        String(row.phone || row.mobile || "").toLowerCase(),
      ].some((v) => v.includes(term));
    });
  }, [query, rows]);

  const handleExportCsv = () => {
    if (selectedColumns.length === 0) {
      alert(t("contacts.needAtLeastOneColumn"));
      return;
    }

    const headers = selectedColumns;

    const csvLines = [
      headers.join(","),
      ...filteredRows.map((row) =>
        headers
          .map((key) => {
            const record = row as unknown as Record<string, unknown>;
            const value = String(record[key] ?? "").replaceAll('"', '""');
            return `"${value}"`;
          })
          .join(",")
      ),
    ];

    const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `contact-directory-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleToggleColumn = (columnKey: ExportColumnKey) => {
    setSelectedColumns((prev) => {
      if (prev.includes(columnKey)) {
        return prev.filter((item) => item !== columnKey);
      }
      return [...prev, columnKey];
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> {t("contacts.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
            <div className="relative max-w-md w-full">
              <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("contacts.searchPlaceholder")}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              className="gap-1.5 w-full md:w-auto"
              onClick={handleExportCsv}
              disabled={loading || filteredRows.length === 0}
            >
              <Download className="h-4 w-4" /> {t("contacts.exportCsv")}
            </Button>
          </div>

          <div className="rounded-lg border bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground mb-2">{t("contacts.selectColumns")}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {exportColumnOptions.map((column) => (
                <label key={column.key} className="inline-flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedColumns.includes(column.key)}
                    onChange={() => handleToggleColumn(column.key)}
                  />
                  <span>{column.label}</span>
                </label>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="text-sm text-muted-foreground py-6 text-center">{t("contacts.loading")}</div>
          ) : filteredRows.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">{t("contacts.empty")}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("contacts.table.employee")}</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("contacts.table.positionDepartment")}</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("contacts.table.company")}</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t("contacts.table.contact")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => {
                    const fullName = `${row.firstname_th || ""} ${row.lastname_th || ""}`.trim() || "-";
                    return (
                      <tr key={row.id} className="border-b last:border-b-0">
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{fullName}</div>
                          <div className="text-xs text-muted-foreground">{row.employee_code || "-"}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div>{row.position_name || "-"}</div>
                          <div className="text-xs text-muted-foreground">{row.department_name || "-"}</div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">{row.company_name || "-"}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs text-muted-foreground">{row.email || "-"}</div>
                          <div>{row.phone || row.mobile || "-"}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ContactManagement;
