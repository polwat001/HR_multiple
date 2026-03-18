import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { apiGet, apiPost, apiPut } from "@/lib/api";

const SystemSettings = () => {
  const { t } = useLanguage();
  const [groupName, setGroupName] = useState("");
  const [defaultTimezone, setDefaultTimezone] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [runningAction, setRunningAction] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await apiGet<any>("/admin/system-settings");
        const data = res?.data || {};
        setGroupName(String(data.groupName || ""));
        setDefaultTimezone(String(data.defaultTimezone || "Asia/Bangkok"));
      } catch (error) {
        console.error("Failed to load system settings:", error);
      }
    };

    fetchSettings();
  }, []);

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      setMessage("");
      await apiPut("/admin/system-settings", {
        settings: {
          groupName,
          defaultTimezone,
        },
      });
      setMessage("Saved system settings");
    } catch (error: any) {
      setMessage(error?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSystemAction = async (actionKey: string) => {
    try {
      setRunningAction(actionKey);
      setMessage("");
      await apiPost(`/admin/system-actions/${actionKey}`, {});
      setMessage(`Executed action: ${actionKey}`);
    } catch (error: any) {
      setMessage(error?.message || `Failed action: ${actionKey}`);
    } finally {
      setRunningAction(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-6">
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-foreground mb-2">{t("systemSettings.tabs.general")}</h3>
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">{t("systemSettings.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
              <div>
                <Label htmlFor="groupName">{t("systemSettings.groupName")}</Label>
                <Input id="groupName" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="timezone">{t("systemSettings.defaultTimezone")}</Label>
                <Input id="timezone" value={defaultTimezone} onChange={(e) => setDefaultTimezone(e.target.value)} />
              </div>
              <Button onClick={handleSaveSettings} disabled={saving}>{saving ? "Saving..." : t("systemSettings.saveSettings")}</Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-4">
          <h3 className="text-sm font-semibold text-foreground mb-2">{t("systemSettings.tabs.dataFix")}</h3>
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">{t("systemSettings.dataCorrectionTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {t("systemSettings.dataCorrectionDesc")}
              </p>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" onClick={() => handleSystemAction("recalculate-leave")} disabled={runningAction !== null}>{runningAction === "recalculate-leave" ? "Running..." : t("systemSettings.recalculateLeave")}</Button>
                <Button variant="outline" onClick={() => handleSystemAction("reindex-attendance")} disabled={runningAction !== null}>{runningAction === "reindex-attendance" ? "Running..." : t("systemSettings.reindexAttendance")}</Button>
                <Button variant="destructive" onClick={() => handleSystemAction("delete-invalid")} disabled={runningAction !== null}>{runningAction === "delete-invalid" ? "Running..." : t("systemSettings.deleteInvalid")}</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-4">
          <h3 className="text-sm font-semibold text-foreground mb-2">{t("systemSettings.tabs.security")}</h3>
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">{t("systemSettings.securityTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{t("systemSettings.securityDesc")}</p>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" onClick={() => handleSystemAction("force-logout")} disabled={runningAction !== null}>{runningAction === "force-logout" ? "Running..." : t("systemSettings.forceLogout")}</Button>
                <Button variant="outline" onClick={() => handleSystemAction("rotate-api-keys")} disabled={runningAction !== null}>{runningAction === "rotate-api-keys" ? "Running..." : t("systemSettings.rotateApiKeys")}</Button>
                <Button onClick={() => handleSystemAction("apply-security-policy")} disabled={runningAction !== null}>{runningAction === "apply-security-policy" ? "Running..." : t("systemSettings.applyPolicy")}</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
