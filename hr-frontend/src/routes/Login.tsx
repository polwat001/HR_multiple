import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiPost } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { Building2 } from "lucide-react";
import { UserRole } from "@/types/roles";

// 💡 ปรับ Interface ให้ตรงกับที่ Node.js ของเราส่งมา
interface LoginResponse {
  message: string;
  token: string;
  user: {
    user_id: number;
    username: string;
    role: string;
    company_id: number | null;
  };
}

interface MockRolePreset {
  role: UserRole;
  username: string;
  password: string;
  description: string;
}

const Login = () => {
  const { language, setLanguage, t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  const rolePresets: MockRolePreset[] = [
    {
      role: UserRole.SUPER_ADMIN,
      username: "Super_Admin",
      password: "1234",
      description: "Full access",
    },
    {
      role: UserRole.CENTRAL_HR,
      username: "admin_central",
      password: "1234",
      description: "Cross-company HR",
    },
    {
      role: UserRole.HR_COMPANY,
      username: "hr_tech",
      password: "1234",
      description: "Company HR operations",
    },
    {
      role: UserRole.MANAGER,
      username: "manager_it",
      password: "1234",
      description: "Team approvals",
    },
    {
      role: UserRole.EMPLOYEE,
      username: "emp_somchai",
      password: "1234",
      description: "Self-service",
    },
  ];

  const handleRoleLogin = async (preset: MockRolePreset) => {
    setError("");
    setSuccess(false);
    setLoading(true);
    setSelectedRole(preset.role);

    try {
      const response = await apiPost<LoginResponse>("/auth/login", {
        username: preset.username,
        password: preset.password,
      });

      // Keep auth flow compatible with existing role guards.
      const simulatedUser = {
        ...response.user,
        role: preset.role,
        role_name: preset.role,
        roles: [preset.role],
      };

      localStorage.setItem("token", response.token);
      localStorage.setItem("userData", JSON.stringify(simulatedUser));

      setSuccess(true);

      setTimeout(() => {
        window.location.replace("/dashboard");
      }, 500);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : t("auth.loginFailed", "เข้าสู่ระบบไม่สำเร็จ");
      setError(errorMessage);
    } finally {
      setLoading(false);
      setSelectedRole(null);
    }
  };

  return (
    <div className="min-h-screen  flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 border-b">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-primary/10 p-3 rounded-lg">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">HR System</CardTitle>
          <p className="text-center text-sm text-muted-foreground">
            {t("auth.loginSubtitle", "เลือกบทบาทเพื่อเข้าสู่ระบบจำลอง")}
          </p>
        </CardHeader>

        <CardContent className="pt-6">
          <div className="mb-4 flex justify-end">
            <select
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              value={language}
              onChange={(e) => setLanguage(e.target.value as "th" | "en")}
            >
              <option value="th">{t("app.thai")}</option>
              <option value="en">{t("app.english")}</option>
            </select>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4 bg-green-50 border-green-200">
              <AlertDescription className="text-green-800">
                {t("auth.loginSuccess", "เข้าสู่ระบบสำเร็จ")}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            {rolePresets.map((preset) => (
              <Button
                key={preset.role}
                type="button"
                disabled={loading}
                onClick={() => handleRoleLogin(preset)}
                className="w-full h-auto bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 px-4 py-3"
                variant="outline"
              >
                <div className="w-full flex items-center justify-between text-left">
                  <div>
                    <div className="font-semibold">{preset.role}</div>
                    <div className="text-xs text-slate-500">{preset.description}</div>
                  </div>
                  <div className="text-xs text-slate-500">
                    {loading && selectedRole === preset.role
                      ? t("auth.loggingIn", "กำลังเข้าสู่ระบบ...")
                      : t("auth.loginButton", "เข้าสู่ระบบ")}
                  </div>
                </div>
              </Button>
            ))}
          </div>

          {/* Test Account Info */}
          <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
            <p className="text-xs font-medium text-blue-900">{t("auth.testAccounts", "บัญชีจำลอง")}</p>
            <div className="space-y-1">
              {rolePresets.map((preset) => (
                <div
                  key={preset.username}
                  className="w-full text-left text-xs text-blue-800 bg-white/80 px-2 py-1.5 rounded border border-blue-100"
                >
                  {preset.role}: <code className="bg-blue-50 px-1.5 py-0.5 rounded">{preset.username}</code>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-blue-700">{t("auth.commonPassword", "รหัสผ่านร่วม")}: <code className="bg-blue-50 px-1.5 py-0.5 rounded">1234</code></p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;