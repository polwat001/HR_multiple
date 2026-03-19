import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiPost } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { Building2, Lock, User } from "lucide-react";

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

const Login = () => {
  const { language, setLanguage, t } = useLanguage();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const testAccounts = [
    { role: "Super Admin", username: "Super_Admin", password: "1234" },
    { role: "Central HR", username: "admin_central", password: "1234" },
    { role: "HR Company", username: "hr_tech", password: "1234" },
    { role: "Manager", username: "manager_it", password: "1234" },
    { role: "Employee", username: "emp_somchai", password: "1234" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      if (!username.trim() || !password.trim()) {
        throw new Error(t("auth.requiredFields"));
      }

      // 💡 เรียก API ไปที่เส้น Login ของเรา (คาดหวังว่าใน lib/api มีการตั้งค่า Base URL ไว้แล้ว)
      const response = await apiPost<LoginResponse>("/auth/login", {
        username: username.trim(),
        password: password.trim(),
      });

      // 💡 บันทึก token และข้อมูล user ลงใน localStorage
      localStorage.setItem("token", response.token);
      localStorage.setItem("userData", JSON.stringify(response.user)); 

      setSuccess(true);
      setUsername("");
      setPassword("");

      // Redirect แบบ hard navigation เพื่อให้ AuthProvider โหลด token ใหม่ทันที
      setTimeout(() => {
        window.location.replace("/dashboard");
      }, 1000);
    } catch (err: any) {
      // 💡 ดึงข้อความ Error จาก Backend มาแสดงผลถ้ามี
      const errorMessage =
        err?.response?.data?.message || (err instanceof Error ? err.message : "เข้าสู่ระบบไม่สำเร็จ");
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 border-b">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-primary/10 p-3 rounded-lg">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">HR System</CardTitle>
          <p className="text-center text-sm text-muted-foreground">
            {t("auth.loginSubtitle")}
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
                ✅ {t("auth.loginSuccess")}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Input */}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">
                {t("auth.username")}
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  placeholder={t("auth.usernamePlaceholder")}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                {t("auth.password")}
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder={t("auth.passwordPlaceholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-primary  bg-blue-500 hover:bg-blue-600 text-white hover:bg-primary/90"
            >
              {loading ? t("auth.loggingIn") : t("auth.loginButton")}
            </Button>
          </form>

          {/* Test Account Info */}
          <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
            <p className="text-xs font-medium text-blue-900">{t("auth.testAccounts")}</p>
            <div className="space-y-1">
              {testAccounts.map((acc) => (
                <button
                  key={acc.username}
                  type="button"
                  className="w-full text-left text-xs text-blue-800 bg-white/80 hover:bg-white px-2 py-1.5 rounded border border-blue-100"
                  onClick={() => {
                    setUsername(acc.username);
                    setPassword(acc.password);
                    setError("");
                  }}
                >
                  {acc.role}: <code className="bg-blue-50 px-1.5 py-0.5 rounded">{acc.username}</code>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-blue-700">{t("auth.commonPassword")}: <code className="bg-blue-50 px-1.5 py-0.5 rounded">1234</code></p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;