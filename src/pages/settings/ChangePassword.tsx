import React, { useState } from "react";
import { NavigationHeader } from "@/components/navigation-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const ChangePassword: React.FC = () => {
  const { toast } = useToast();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 800));
      toast({ title: 'Password changed', description: 'Your password has been updated.' });
      setOldPassword(""); setNewPassword(""); setConfirmPassword("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-background via-background to-primary/5">
      <NavigationHeader />
      <section className="relative pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-md">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-center">Change Password</CardTitle>
              <CardDescription className="text-center">Update your account password</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSave} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="old">Current Password</Label>
                  <Input id="old" type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new">New Password</Label>
                  <Input id="new" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm">Confirm New Password</Label>
                  <Input id="confirm" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={saving}>{saving ? 'Saving...' : 'Update Password'}</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default ChangePassword;
