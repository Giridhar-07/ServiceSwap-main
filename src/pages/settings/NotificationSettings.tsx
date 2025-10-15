import React, { useEffect, useState } from "react";
import { NavigationHeader } from "@/components/navigation-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

const NotificationSettings: React.FC = () => {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState({
    email: true,
    push: true,
    tradeUpdates: true
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('serviceswap_notifications_prefs');
      if (stored) setPrefs(JSON.parse(stored));
    } catch {}
  }, []);

  const onSave = async () => {
    setSaving(true);
    try {
      localStorage.setItem('serviceswap_notifications_prefs', JSON.stringify(prefs));
      await new Promise((r) => setTimeout(r, 400));
      toast({ title: 'Notification preferences saved' });
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
              <CardTitle className="text-2xl text-center">Notifications</CardTitle>
              <CardDescription className="text-center">Choose how you want to be notified</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <label className="flex items-center gap-3">
                  <Checkbox checked={prefs.email} onCheckedChange={(c) => setPrefs(p => ({ ...p, email: Boolean(c) }))} />
                  <span>Email notifications</span>
                </label>
                <label className="flex items-center gap-3">
                  <Checkbox checked={prefs.push} onCheckedChange={(c) => setPrefs(p => ({ ...p, push: Boolean(c) }))} />
                  <span>Push notifications</span>
                </label>
                <label className="flex items-center gap-3">
                  <Checkbox checked={prefs.tradeUpdates} onCheckedChange={(c) => setPrefs(p => ({ ...p, tradeUpdates: Boolean(c) }))} />
                  <span>Trade updates</span>
                </label>
                <Button className="w-full" onClick={onSave} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Preferences'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default NotificationSettings;
