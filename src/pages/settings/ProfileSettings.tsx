import React, { useEffect, useState } from "react";
import { NavigationHeader } from "@/components/navigation-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const ProfileSettings: React.FC = () => {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('serviceswap_user');
      if (stored) {
        const u = JSON.parse(stored);
        setName(u.name || "");
        setEmail(u.email || "");
        setAvatar(u.avatar || "");
      }
    } catch {}
  }, []);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const stored = localStorage.getItem('serviceswap_user');
      const u = stored ? JSON.parse(stored) : {};
      const updated = { ...u, name, email, avatar };
      localStorage.setItem('serviceswap_user', JSON.stringify(updated));
      toast({ title: 'Profile updated', description: 'Your profile has been saved.' });
      // Refresh to let AuthContext pick up updated user
      setTimeout(() => window.location.reload(), 400);
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
              <CardTitle className="text-2xl text-center">Edit Profile</CardTitle>
              <CardDescription className="text-center">Update your profile details</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSave} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="avatar">Avatar URL (optional)</Label>
                  <Input id="avatar" value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="https://..." />
                </div>
                <Button type="submit" className="w-full" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default ProfileSettings;
