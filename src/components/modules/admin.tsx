"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Shield, UserCog, Settings, Lock } from "lucide-react"

export function AdminModule() {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <header>
        <h2 className="text-3xl font-headline font-bold text-primary">Administration</h2>
        <p className="text-muted-foreground">Manage teams, permissions, and security settings.</p>
      </header>

      <Tabs defaultValue="teams" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6 bg-white border border-accent/10">
          <TabsTrigger value="teams" className="gap-2"><UserCog className="w-4 h-4" /> Team Settings</TabsTrigger>
          <TabsTrigger value="roles" className="gap-2"><Shield className="w-4 h-4" /> Permissions</TabsTrigger>
          <TabsTrigger value="security" className="gap-2"><Lock className="w-4 h-4" /> Security</TabsTrigger>
        </TabsList>

        <TabsContent value="teams">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Team Organization</CardTitle>
              <CardDescription>Configure how your team is structured within the app.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Allow Team Sub-groups</Label>
                  <p className="text-sm text-muted-foreground">Enable departments to create their own isolated workspaces.</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between border-b pb-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Public Directory</Label>
                  <p className="text-sm text-muted-foreground">Show all members in the contact list by default.</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Button className="w-full sm:w-auto bg-primary">Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Role Definitions</CardTitle>
              <CardDescription>Assign and define user access levels.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {['Administrator', 'Editor', 'Viewer', 'External Guest'].map((role) => (
                  <div key={role} className="flex items-center justify-between p-3 rounded-lg border bg-secondary/20">
                    <span className="font-medium text-sm">{role}</span>
                    <Button variant="outline" size="sm" className="h-8">Configure</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Enterprise Security</CardTitle>
              <CardDescription>Configure high-level security protocols.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
               <div className="flex items-center justify-between border-b pb-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">Require 2FA for all team members.</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between border-b pb-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Remote Wipe Access</Label>
                  <p className="text-sm text-muted-foreground">Admins can wipe app data from stolen devices.</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between border-b pb-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Data Retention Policy</Label>
                  <p className="text-sm text-muted-foreground">Keep messages and files for 2 years (HIPAA/GDPR).</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}