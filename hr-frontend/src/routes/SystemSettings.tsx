import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SystemSettings = () => {
  const [groupName, setGroupName] = useState("HR Group Holding");
  const [defaultTimezone, setDefaultTimezone] = useState("Asia/Bangkok");

  return (
    <div className="space-y-6 animate-fade-in">
      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="data-fix">Data Fix</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">System Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="groupName">Group Name</Label>
                <Input id="groupName" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="timezone">Default Timezone</Label>
                <Input id="timezone" value={defaultTimezone} onChange={(e) => setDefaultTimezone(e.target.value)} />
              </div>
              <Button>Save Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data-fix" className="mt-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Data Correction Tools</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                สำหรับทีม IT/Implementation: ใช้แก้ข้อมูลผิดพลาดในระบบส่วนกลาง
              </p>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline">Recalculate Leave Balance</Button>
                <Button variant="outline">Reindex Attendance</Button>
                <Button variant="destructive">Delete Invalid Transactions</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Security Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">กำหนดนโยบายความปลอดภัยระดับระบบ</p>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline">Force Logout All Users</Button>
                <Button variant="outline">Rotate API Keys</Button>
                <Button>Apply Policy</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SystemSettings;
