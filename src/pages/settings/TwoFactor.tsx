import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { NavigationHeader } from '@/components/navigation-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

/**
 * TwoFactor settings page to setup, verify, and disable TOTP-based 2FA.
 */
const TwoFactor: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [secret, setSecret] = useState<string | null>(null);
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const token = typeof window !== 'undefined' ? localStorage.getItem('serviceswap_token') : null;

  /**
   * Requests a new TOTP secret from backend and displays it.
   */
  const setup = async () => {
    try {
      const res = await fetch('/api/auth/2fa/setup', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to setup 2FA');
      const data = await res.json();
      setSecret(data.secret_ascii);
      setOtpauthUrl(data.otpauth_url);
      toast({ title: '2FA Secret Generated', description: 'Add the secret to your authenticator app.' });
    } catch (e) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' });
    }
  };

  /**
   * Verifies a provided TOTP code and enables 2FA.
   */
  const verify = async () => {
    try {
      const res = await fetch('/api/auth/2fa/verify', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ code }) });
      const ok = res.ok;
      const data = await res.json().catch(() => ({}));
      if (!ok) throw new Error(data.error || 'Invalid 2FA code');
      setEnabled(true);
      toast({ title: '2FA Enabled', description: 'Two-factor authentication is now active.' });
    } catch (e) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' });
    }
  };

  /**
   * Disables 2FA when a valid TOTP code is provided.
   */
  const disable = async () => {
    try {
      const res = await fetch('/api/auth/2fa/disable', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ code }) });
      const ok = res.ok;
      const data = await res.json().catch(() => ({}));
      if (!ok) throw new Error(data.error || 'Invalid 2FA code');
      setEnabled(false);
      setSecret(null);
      setOtpauthUrl(null);
      toast({ title: '2FA Disabled', description: 'Two-factor authentication has been turned off.' });
    } catch (e) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-b from-background via-background to-primary/5">
        <NavigationHeader />
        <section className="relative pt-32 pb-20 px-4">
          <div className="container mx-auto max-w-md">
            <Card>
              <CardHeader>
                <CardTitle>Two-Factor Authentication</CardTitle>
                <CardDescription>Please log in to manage 2FA.</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-background via-background to-primary/5">
      <NavigationHeader />
      <section className="relative pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-lg">
          <Card>
            <CardHeader>
              <CardTitle>Two-Factor Authentication (TOTP)</CardTitle>
              <CardDescription>Protect your account with an extra layer of security.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Button type="button" onClick={setup}>Generate 2FA Secret</Button>
                {secret && (
                  <div className="mt-2">
                    <p className="text-sm">Secret:</p>
                    <p className="font-mono break-words text-xs">{secret}</p>
                  </div>
                )}
                {otpauthUrl && (
                  <div className="mt-2">
                    <p className="text-sm">Add to your authenticator app using this URL:</p>
                    <p className="font-mono break-words text-xs">{otpauthUrl}</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="code" className="text-sm">Enter 6-digit code</label>
                <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="000000" />
                <div className="flex gap-2">
                  <Button type="button" onClick={verify}>Verify & Enable</Button>
                  <Button type="button" variant="outline" onClick={disable}>Disable 2FA</Button>
                </div>
              </div>

              {enabled !== null && (
                <div className="text-sm">Status: {enabled ? 'Enabled' : 'Disabled'}</div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default TwoFactor;