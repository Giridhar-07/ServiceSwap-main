import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTradeSession } from '@/contexts/TradeSessionContext';

interface SessionWizardProps {
  sessionId: string;
}

type WizardStep = 'items' | 'confirm' | 'mfa';

/**
 * SessionWizard guides the user through trade session steps:
 * 1) Add items, 2) Confirm, 3) Finalize with MFA.
 * Provides clear labels, instructions, and progress indicators.
 */
export const SessionWizard: React.FC<SessionWizardProps> = ({ sessionId }) => {
  const { addItems, confirm, finalize, getSession, mfaCodeForYou } = useTradeSession();
  const session = getSession(sessionId);
  const [step, setStep] = useState<WizardStep>('items');
  const [itemsInput, setItemsInput] = useState('');
  const [mfaA, setMfaA] = useState('');
  const [mfaB, setMfaB] = useState('');

  useEffect(() => {
    // Prefill current user's MFA code if known
    if (mfaCodeForYou && !mfaA) {
      setMfaA(mfaCodeForYou);
    }
  }, [mfaCodeForYou]);

  const progress = useMemo(() => {
    switch (step) {
      case 'items': return 33;
      case 'confirm': return 66;
      case 'mfa': return 100;
    }
  }, [step]);

  const onAddItems = async () => {
    const tokens = itemsInput.split(',').map(s => s.trim()).filter(Boolean);
    const payload = tokens.map(code => ({ code, type: 'card' as const }));
    try {
      await addItems(sessionId, payload);
      setStep('confirm');
    } catch (e) {
      // Errors surfaced via context; keep UX simple here
    }
  };

  const onConfirm = async () => {
    try {
      await confirm(sessionId);
      setStep('mfa');
    } catch (e) {
      // Error messaging handled in context
    }
  };

  const onFinalize = async () => {
    try {
      await finalize(sessionId, mfaA, mfaB);
    } catch (e) {
      // Error messaging handled in context
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Session Wizard</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-3">
          <div className="text-xs text-muted-foreground">Progress: {progress}%</div>
          <div className="h-2 bg-muted rounded">
            <div className="h-2 bg-primary rounded" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {step === 'items' && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Step 1: Add Your Items</div>
            <div className="text-xs text-muted-foreground">Enter item codes separated by commas. Example: CODE123, CODE456</div>
            <Input value={itemsInput} onChange={e => setItemsInput(e.target.value)} placeholder="Item codes (comma-separated)" />
            <Button onClick={onAddItems}>Save Items</Button>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Step 2: Confirm</div>
            <div className="text-xs text-muted-foreground">Review both sides. Click confirm to proceed.</div>
            <Button onClick={onConfirm}>Confirm My Items</Button>
          </div>
        )}

        {step === 'mfa' && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Step 3: Finalize with MFA</div>
            <div className="text-xs text-muted-foreground">Your MFA Code (share with partner):</div>
            <Input value={mfaA} onChange={e => setMfaA(e.target.value)} placeholder="Your MFA code (6 digits)" />
            <div className="text-xs text-muted-foreground">Partner's MFA Code (ask your partner):</div>
            <Input value={mfaB} onChange={e => setMfaB(e.target.value)} placeholder="Partner MFA code (6 digits)" />
            <Button onClick={onFinalize}>Finalize Trade</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SessionWizard;