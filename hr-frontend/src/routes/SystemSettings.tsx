import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";

const SystemSettings = () => {
  const { t } = useLanguage();
  const [groupName, setGroupName] = useState("HR Group Holding");
  const [defaultTimezone, setDefaultTimezone] = useState("Asia/Bangkok");

  return (
    <div className="space-y-6 animate-fade-in">
      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">{t("systemSettings.tabs.general")}</TabsTrigger>
          <TabsTrigger value="data-fix">{t("systemSettings.tabs.dataFix")}</TabsTrigger>
          <TabsTrigger value="security">{t("systemSettings.tabs.security")}</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">{t("systemSettings.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="groupName">{t("systemSettings.groupName")}</Label>
                <Input id="groupName" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="timezone">{t("systemSettings.defaultTimezone")}</Label>
                <Input id="timezone" value={defaultTimezone} onChange={(e) => setDefaultTimezone(e.target.value)} />
              </div>
              <Button>{t("systemSettings.saveSettings")}</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data-fix" className="mt-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">{t("systemSettings.dataCorrectionTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {t("systemSettings.dataCorrectionDesc")}
              </p>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline">{t("systemSettings.recalculateLeave")}</Button>
                <Button variant="outline">{t("systemSettings.reindexAttendance")}</Button>
                <Button variant="destructive">{t("systemSettings.deleteInvalid")}</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">{t("systemSettings.securityTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{t("systemSettings.securityDesc")}</p>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline">{t("systemSettings.forceLogout")}</Button>
                <Button variant="outline">{t("systemSettings.rotateApiKeys")}</Button>
                <Button>{t("systemSettings.applyPolicy")}</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SystemSettings;
