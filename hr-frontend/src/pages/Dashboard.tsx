import { useNavigate } from "react-router-dom";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users, FileWarning, Clock, TrendingUp,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import {
  headcountByCompany, headcountByDepartment, attendanceData,
  otCostData, contractExpiring, employees,
} from "@/data/mockData";

const ATTENDANCE_COLORS = [
  "hsl(145 60% 42%)", "hsl(38 92% 50%)", "hsl(0 72% 55%)", "hsl(205 80% 55%)",
];

const Dashboard = () => {
  const { selectedCompany } = useCompany();
  const navigate = useNavigate();
  const isAll = selectedCompany.id === "all";

  const barData = isAll
    ? headcountByCompany
    : (headcountByDepartment[selectedCompany.id as keyof typeof headcountByDepartment] || []);

  const totalHeadcount = isAll
    ? headcountByCompany.reduce((s, c) => s + c.count, 0)
    : (headcountByDepartment[selectedCompany.id as keyof typeof headcountByDepartment] || [])
        .reduce((s, d) => s + d.count, 0);

  const filteredContracts = isAll
    ? contractExpiring
    : contractExpiring.filter((c) => {
        const emp = employees.find((e) => e.id === c.employeeId);
        return emp?.companyId === selectedCompany.id;
      });

  const statCards = [
    { label: "Total Headcount", value: totalHeadcount, icon: Users, color: "text-primary" },
    { label: "Contract Expiring", value: filteredContracts.length, icon: FileWarning, color: "text-warning" },
    { label: "Attendance Today", value: "92%", icon: Clock, color: "text-success" },
    { label: "OT Cost (Month)", value: "฿198K", icon: TrendingUp, color: "text-accent" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="shadow-card hover:shadow-card-hover transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`h-10 w-10 rounded-lg bg-muted flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Headcount Bar Chart */}
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">
              {isAll ? "Headcount by Company" : `Headcount - ${selectedCompany.shortName}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 90%)" />
                <XAxis
                  dataKey={isAll ? "company" : "department"}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 12 }} tickLine={false} />
                <Tooltip />
                <Bar
                  dataKey="count"
                  fill="hsl(215 70% 45%)"
                  radius={[4, 4, 0, 0]}
                  cursor="pointer"
                  onClick={(data: any) => {
                    if (isAll && data?.companyId) {
                      navigate(`/employees?company=${data.companyId}`);
                    }
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Attendance Pie */}
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Daily Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={attendanceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {attendanceData.map((_, i) => (
                    <Cell key={i} fill={ATTENDANCE_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* OT Cost */}
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">OT Cost Summary (6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={otCostData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 20% 90%)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} tickLine={false} tickFormatter={(v) => `฿${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(v: number) => [`฿${v.toLocaleString()}`, "OT Cost"]} />
                <Line type="monotone" dataKey="amount" stroke="hsl(175 60% 40%)" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Contract Expiring */}
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Contract Expiring Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredContracts.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No expiring contracts</p>
              ) : (
                filteredContracts.map((c) => (
                  <div key={c.employeeId} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.company}</p>
                    </div>
                    <Badge variant={c.daysLeft <= 7 ? "destructive" : "secondary"} className="text-xs">
                      {c.daysLeft} days left
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
