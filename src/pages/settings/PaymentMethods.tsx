import React, { useEffect, useState } from "react";
import { NavigationHeader } from "@/components/navigation-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface PaymentMethod {
  type: 'upi' | 'card';
  label: string;
  details: string;
}

const PaymentMethods: React.FC = () => {
  const { toast } = useToast();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [type, setType] = useState<'upi' | 'card'>('upi');
  const [label, setLabel] = useState("");
  const [details, setDetails] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem('serviceswap_payment_methods');
      if (stored) setMethods(JSON.parse(stored));
    } catch {}
  }, []);

  const save = () => {
    const next = [...methods, { type, label: label || (type === 'upi' ? 'UPI' : 'Card'), details }];
    setMethods(next);
    localStorage.setItem('serviceswap_payment_methods', JSON.stringify(next));
    setLabel(""); setDetails("");
    toast({ title: 'Payment method saved' });
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-background via-background to-primary/5">
      <NavigationHeader />
      <section className="relative pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-md">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-center">Payment Methods</CardTitle>
              <CardDescription className="text-center">Manage your saved payment methods (demo)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <div className="flex gap-2">
                    <Button type="button" variant={type === 'upi' ? 'default' : 'outline'} onClick={() => setType('upi')}>UPI</Button>
                    <Button type="button" variant={type === 'card' ? 'default' : 'outline'} onClick={() => setType('card')}>Card</Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="label">Label</Label>
                  <Input id="label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g., My UPI" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="details">{type === 'upi' ? 'UPI ID' : 'Card Last 4'}</Label>
                  <Input id="details" value={details} onChange={(e) => setDetails(e.target.value)} placeholder={type === 'upi' ? 'name@bank' : '1234'} />
                </div>
                <Button type="button" className="w-full" onClick={save} disabled={!details}>Save Method</Button>

                <div className="space-y-3">
                  <h3 className="font-semibold">Saved Methods</h3>
                  {methods.length === 0 && <p className="text-sm text-muted-foreground">No methods saved yet.</p>}
                  {methods.map((m, i) => (
                    <div key={i} className="p-3 rounded-lg border flex items-center justify-between">
                      <div>
                        <p className="font-medium">{m.label} • {m.type.toUpperCase()}</p>
                        <p className="text-sm text-muted-foreground">{m.details}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default PaymentMethods;
