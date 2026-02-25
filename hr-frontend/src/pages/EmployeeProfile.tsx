import { useParams, useNavigate } from "react-router-dom";
import { employees, companies } from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, ArrowRightLeft, TrendingUp, FileText, Mail, Phone } from "lucide-react";

const typeIcons: Record<string, string> = {
  hire: "🟢",
  transfer: "🔄",
  promote: "⬆️",
};

const EmployeeProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const emp = employees.find((e) => e.id === id);

  if (!emp) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Employee not found</p>
      </div>
    );
  }

  const company = companies.find((c) => c.id === emp.companyId);

  return (
    <div className="space-y-6 animate-fade-in">
      <Button variant="ghost" size="sm" onClick={() => navigate("/employees")} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Back to List
      </Button>

      {/* Profile Header */}
      <Card className="shadow-card overflow-hidden">
        <div className="h-24 gradient-primary" />
        <CardContent className="relative pt-0 pb-6 px-6">
          <div className="flex flex-col sm:flex-row items-start gap-4 -mt-10">
            <div className="h-20 w-20 rounded-xl bg-card border-4 border-card flex items-center justify-center text-4xl shadow-card">
              {emp.avatar}
            </div>
            <div className="flex-1 pt-2 sm:pt-4">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-bold">{emp.firstName} {emp.lastName}</h2>
                <Badge variant="outline" className="text-xs">
                  {company?.logo} {company?.name}
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm mt-1">{emp.position} • {emp.department}</p>
              <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {emp.email}</span>
                <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {emp.phone}</span>
              </div>
            </div>
            <div className="flex gap-2 pt-2 sm:pt-4">
              <Button size="sm" variant="outline" className="gap-1.5">
                <ArrowRightLeft className="h-4 w-4" /> Transfer
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5">
                <TrendingUp className="h-4 w-4" /> Promote
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="history">
        <TabsList>
          <TabsTrigger value="history">Employment History</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="leave">Leave Quota</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="mt-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                {emp.history.map((h, i) => {
                  const toCompany = companies.find((c) => c.id === h.toCompany);
                  return (
                    <div key={i} className="relative">
                      <div className="absolute -left-6 top-1 h-5 w-5 rounded-full bg-card border-2 border-primary flex items-center justify-center text-xs">
                        {typeIcons[h.type]}
                      </div>
                      <div className="bg-muted/50 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-mono text-xs text-muted-foreground">{h.date}</span>
                          <Badge variant="secondary" className="text-xs capitalize">{h.type}</Badge>
                        </div>
                        <p className="text-sm mt-1.5">
                          {h.type === "hire" && `Hired at ${toCompany?.shortName} as ${h.toPosition}`}
                          {h.type === "transfer" && `Transfer → ${toCompany?.shortName} as ${h.toPosition}`}
                          {h.type === "promote" && `Promoted to ${h.toPosition}`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <FileText className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">Document management - click to upload</p>
                <Button variant="outline" size="sm" className="mt-3">Upload Document</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leave" className="mt-4">
          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { type: "Vacation", total: 10, used: 4 },
                  { type: "Sick Leave", total: 30, used: 2 },
                  { type: "Personal Leave", total: 3, used: 1 },
                ].map((q) => (
                  <div key={q.type} className="p-4 rounded-lg bg-muted/50 text-center">
                    <p className="text-sm text-muted-foreground">{q.type}</p>
                    <p className="text-2xl font-bold mt-1">{q.total - q.used}</p>
                    <p className="text-xs text-muted-foreground">remaining of {q.total}</p>
                    <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${((q.total - q.used) / q.total) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmployeeProfile;
