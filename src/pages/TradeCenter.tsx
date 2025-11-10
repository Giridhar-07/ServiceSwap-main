import React, { useState } from "react";
import { NavigationHeader } from "@/components/navigation-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useTrade, TradeOffer } from "@/contexts/TradeContext";
import { useTradeSession } from "@/contexts/TradeSessionContext";
import { ChatPanel } from "@/components/ChatPanel";
import { useToast } from "@/hooks/use-toast";
import { 
  Clock,
  Shield,
  CheckCircle,
  XCircle,
  Eye,
  MessageCircle,
  AlertCircle,
  Bell,
  ArrowRightLeft,
  Timer,
  User,
  DollarSign,
  Calendar
} from "lucide-react";

const TradeCenter = () => {
  const { 
    pendingOffers, 
    sentOffers, 
    completedTrades, 
    notifications,
    unreadCount,
    acceptTradeOffer,
    declineTradeOffer,
    cancelTradeOffer,
    completeTrade,
    markNotificationAsRead,
    isLoading
  } = useTrade();
  const { toast } = useToast();

  // Trade Session hook and basic session state
  const { startSession, addItems, confirm, finalize, currentSessionId, setCurrentSessionId, getSession, isLoading: isSessionLoading } = useTradeSession();
  // Deprecated: command input for manual session open
  // const [commandInput, setCommandInput] = useState("");
  const [sessionItems, setSessionItems] = useState<{ code: string; type: 'card' | 'currency'; qty?: number }[]>([]);
  const [mfaA, setMfaA] = useState("");
  const [mfaB, setMfaB] = useState("");
  const [myMfaCode, setMyMfaCode] = useState<string | null>(null); // State to hold the user's MFA code
  
  const [activeTab, setActiveTab] = useState("received");
  const [selectedTrade, setSelectedTrade] = useState<TradeOffer | null>(null);
  const [completionCredentials, setCompletionCredentials] = useState({
    username: "",
    email: "",
    password: "",
    additionalInfo: ""
  });

  const handleAcceptTrade = async (tradeId: string) => {
    try {
      await acceptTradeOffer(tradeId);
      toast({
        title: "Trade Accepted!",
        description: "The trade has been accepted and moved to escrow.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to accept trade offer.",
        variant: "destructive"
      });
    }
  };

  const handleDeclineTrade = async (tradeId: string) => {
    try {
      await declineTradeOffer(tradeId);
      toast({
        title: "Trade Declined",
        description: "The trade offer has been declined.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to decline trade offer.",
        variant: "destructive"
      });
    }
  };

  const handleCompleteTrade = async (tradeId: string) => {
    try {
      await completeTrade(tradeId, completionCredentials);
      toast({
        title: "Trade Completed!",
        description: "Service credentials have been shared and payment released.",
      });
      setCompletionCredentials({ username: "", email: "", password: "", additionalInfo: "" });
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to complete trade.",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "accepted": return "bg-blue-100 text-blue-800 border-blue-200";
      case "completed": return "bg-green-100 text-green-800 border-green-200";
      case "declined": return "bg-red-100 text-red-800 border-red-200";
      case "expired": return "bg-gray-100 text-gray-800 border-gray-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getTimeRemaining = (expiresAt: Date) => {
    const now = new Date();
    const remaining = expiresAt.getTime() - now.getTime();
    if (remaining <= 0) return "Expired";
    
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  // Trade Session action handlers
  const onStartSession = async () => {
    try {
      const id = await startSession(commandInput.trim());
      const session = getSession(id);
      if (session?.mfa?.a) {
        setMyMfaCode(session.mfa.a); // Set the MFA code for the current user
        toast({ title: "Session opened", description: `Session ${id} created. Your MFA code: ${session.mfa.a}` });
      } else {
        toast({ title: "Session opened", description: `Session ${id} created.` });
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "An unknown error occurred.";
      toast({ title: "Could not start session", description: message || "Check command format: kmt @UserName", variant: "destructive" });
    }
  };

  const onPushItems = async () => {
    if (!currentSessionId) return toast({ title: "No session", description: "Start a session first" });
    try {
      await addItems(currentSessionId, sessionItems);
      toast({ title: "Items updated", description: `Pushed ${sessionItems.length} item(s)` });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "An unknown error occurred.";
      toast({ title: "Failed to update items", description: message || "Validation failed", variant: "destructive" });
    }
  };

  const onConfirm = async () => {
    if (!currentSessionId) return toast({ title: "No session", description: "Start a session first" });
    try {
      await confirm(currentSessionId);
      toast({ title: "Confirmed", description: "Your side is confirmed." });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "An unknown error occurred.";
      toast({ title: "Confirm failed", description: message || "Try again", variant: "destructive" });
    }
  };

  const onFinalize = async () => {
    if (!currentSessionId) return toast({ title: "No session", description: "Start a session first" });
    try {
      await finalize(currentSessionId, mfaA, mfaB);
      toast({ title: "Finalized", description: "Session is finalized." });
      setCurrentSessionId(null); // Clear the current session
      setMyMfaCode(null); // Clear the MFA code
      setMfaA(""); // Clear MFA input
      setMfaB(""); // Clear MFA input
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "An unknown error occurred.";
      toast({ title: "Finalize failed", description: message || "Check MFA codes", variant: "destructive" });
    }
  };

  const TradeCard = ({ trade, showActions = true }: { trade: TradeOffer; showActions?: boolean }) => (
    <Card className="hover:shadow-md transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-lg">{trade.serviceName}</h3>
              <Badge className={getStatusColor(trade.status)}>
                {trade.status}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {trade.fromUserId === "1" ? `To: ${trade.toUserName}` : `From: ${trade.fromUserName}`}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {trade.createdAt.toLocaleDateString()}
              </div>
              {trade.status === 'pending' && (
                <div className="flex items-center gap-1 text-orange-600">
                  <Timer className="w-3 h-3" />
                  {getTimeRemaining(trade.expiresAt)}
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">₹{trade.offerPrice}</p>
            <p className="text-xs text-muted-foreground line-through">₹{trade.originalPrice}</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="text-sm">
          <p className="text-muted-foreground mb-1">Service Details:</p>
          <p>{trade.tradeDetails.duration} • {trade.tradeDetails.accessType === 'share' ? 'Shared Access' : 'Full Transfer'}</p>
        </div>
        
        {trade.message && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm">{trade.message}</p>
          </div>
        )}

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <Shield className={`w-3 h-3 ${trade.verificationRequired ? 'text-green-600' : 'text-gray-400'}`} />
            <span>{trade.verificationRequired ? 'Verified' : 'Unverified'}</span>
          </div>
          <div className="flex items-center gap-1">
            <ArrowRightLeft className="w-3 h-3" />
            <span>Escrow: {trade.escrowStatus}</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {trade.tradeProtectionLevel}
          </Badge>
        </div>

        {showActions && trade.status === 'pending' && trade.toUserId === "1" && (
          <div className="flex gap-2 pt-2">
            <Button 
              onClick={() => handleAcceptTrade(trade.id)}
              className="flex-1"
              disabled={isLoading}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Accept
            </Button>
            <Button 
              variant="outline"
              onClick={() => handleDeclineTrade(trade.id)}
              className="flex-1"
              disabled={isLoading}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Decline
            </Button>
          </div>
        )}

        {showActions && trade.status === 'accepted' && trade.toUserId === "1" && (
          <Dialog>
            <DialogTrigger asChild>
              <Button className="w-full">
                <Shield className="w-4 h-4 mr-2" />
                Complete Trade
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Complete Trade</DialogTitle>
                <DialogDescription>
                  Share service credentials to complete the trade. Payment will be released from escrow.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Account Email</Label>
                  <Input
                    id="email"
                    value={completionCredentials.email}
                    onChange={(e) => setCompletionCredentials(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="account@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={completionCredentials.password}
                    onChange={(e) => setCompletionCredentials(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <Label htmlFor="additional">Additional Instructions</Label>
                  <Textarea
                    id="additional"
                    value={completionCredentials.additionalInfo}
                    onChange={(e) => setCompletionCredentials(prev => ({ ...prev, additionalInfo: e.target.value }))}
                    placeholder="Any additional setup instructions..."
                    rows={3}
                  />
                </div>
                <Button 
                  onClick={() => handleCompleteTrade(trade.id)}
                  className="w-full"
                  disabled={isLoading || !completionCredentials.email || !completionCredentials.password}
                >
                  Complete Trade
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {showActions && trade.status === 'pending' && trade.fromUserId === "1" && (
          <Button 
            variant="destructive"
            onClick={() => cancelTradeOffer(trade.id)}
            className="w-full"
            disabled={isLoading}
          >
            Cancel Offer
          </Button>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-background via-background to-primary/5">
      <NavigationHeader />
      
      {/* Header */}
      <section className="relative pt-32 pb-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-primary via-primary to-primary-foreground bg-clip-text text-transparent animate-fade-in">
                Trade Center
              </h1>
              <p className="text-lg text-muted-foreground animate-fade-in" style={{ animationDelay: '0.1s' }}>
                Manage your service trades like a pro
              </p>
            </div>
            
            {unreadCount > 0 && (
              <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <Bell className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">{unreadCount} new notifications</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Trade Chat */}
      {currentSessionId && (
        <section className="px-4 pb-6">
          <div className="container mx-auto max-w-6xl">
            <ChatPanel sessionId={currentSessionId} />
            <div className="mt-2 text-sm text-muted-foreground">
              Current session: {currentSessionId} • Status: {getSession(currentSessionId)?.status}
              {myMfaCode && <p className="font-semibold text-primary">Your MFA Code: {myMfaCode}</p>}
            </div>
          </div>
        </section>
      )}

      {currentSessionId && (
        <section className="px-4 pb-12">
          <div className="container mx-auto max-w-6xl">
            <Card>
              <CardHeader>
                <CardTitle>Session Wizard</CardTitle>
                <CardDescription>Propose items, confirm, then finalize with MFA.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                  <div>
                    <Label htmlFor="code">Item Code</Label>
                    <Input id="code" placeholder="ABC123" onChange={(e)=>{ const v = e.target.value.toUpperCase(); setSessionItems(prev => [{ code: v, type: prev[0]?.type || 'card', qty: prev[0]?.qty || 1 }]); }} />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <select className="border rounded h-9 px-2" onChange={(e)=>{ setSessionItems(prev => [{ code: prev[0]?.code || '', type: e.target.value as 'card'|'currency', qty: prev[0]?.qty || 1 }]); }}>
                      <option value="card">card</option>
                      <option value="currency">currency</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="qty">Qty</Label>
                    <Input id="qty" type="number" min={1} max={1000} defaultValue={1} onChange={(e)=>{ const q = parseInt(e.target.value || '1', 10); setSessionItems(prev => [{ code: prev[0]?.code || '', type: prev[0]?.type || 'card', qty: q }]); }} />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={()=>setSessionItems([])}>Clear</Button>
                    <Button onClick={onPushItems} disabled={isSessionLoading || sessionItems.length === 0}>Push Items</Button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={onConfirm} disabled={isSessionLoading}>Confirm My Items</Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
                  <div>
                    <Label htmlFor="mfaA">MFA A</Label>
                    <Input id="mfaA" value={mfaA} onChange={(e)=>setMfaA(e.target.value)} placeholder="6-digit" />
                  </div>
                  <div>
                    <Label htmlFor="mfaB">MFA B</Label>
                    <Input id="mfaB" value={mfaB} onChange={(e)=>setMfaB(e.target.value)} placeholder="6-digit" />
                  </div>
                  <div>
                    <Button onClick={onFinalize} disabled={isSessionLoading || mfaA.length!==6 || mfaB.length!==6}>Finalize</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* Trade Management */}
      <section className="pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="received" className="relative">
                Received
                {pendingOffers.length > 0 && (
                  <Badge className="ml-2 h-5 w-5 p-0 text-xs">{pendingOffers.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="sent" className="relative">
                Sent
                {sentOffers.length > 0 && (
                  <Badge variant="outline" className="ml-2 h-5 w-5 p-0 text-xs">{sentOffers.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="history">Trade History</TabsTrigger>
              <TabsTrigger value="notifications" className="relative">
                Notifications
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs">{unreadCount}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="received" className="space-y-6 mt-6">
              <div>
                <h2 className="text-2xl font-semibold mb-4">Received Trade Offers</h2>
                {pendingOffers.length === 0 ? (
                  <Card className="p-8 text-center">
                    <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                      <ArrowRightLeft className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No pending offers</h3>
                    <p className="text-muted-foreground">
                      When someone wants to trade with you, their offers will appear here.
                    </p>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {pendingOffers.map((trade) => (
                      <TradeCard key={trade.id} trade={trade} />
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="sent" className="space-y-6 mt-6">
              <div>
                <h2 className="text-2xl font-semibold mb-4">Sent Trade Offers</h2>
                {sentOffers.length === 0 ? (
                  <Card className="p-8 text-center">
                    <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                      <MessageCircle className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No sent offers</h3>
                    <p className="text-muted-foreground">
                      Trade offers you send will be tracked here.
                    </p>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {sentOffers.map((trade) => (
                      <TradeCard key={trade.id} trade={trade} />
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="history" className="space-y-6 mt-6">
              <div>
                <h2 className="text-2xl font-semibold mb-4">Trade History</h2>
                {completedTrades.length === 0 ? (
                  <Card className="p-8 text-center">
                    <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                      <CheckCircle className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No completed trades</h3>
                    <p className="text-muted-foreground">
                      Your completed trades will appear here for reference.
                    </p>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {completedTrades.map((trade) => (
                      <TradeCard key={trade.id} trade={trade} showActions={false} />
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-6 mt-6">
              <div>
                <h2 className="text-2xl font-semibold mb-4">Trade Notifications</h2>
                {notifications.length === 0 ? (
                  <Card className="p-8 text-center">
                    <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                      <Bell className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No notifications</h3>
                    <p className="text-muted-foreground">
                      Trade updates and notifications will appear here.
                    </p>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {notifications.map((notification) => (
                      <Card key={notification.id} className={`p-4 ${!notification.read ? 'bg-primary/5 border-primary/20' : ''}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{notification.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {notification.createdAt.toLocaleString()}
                            </p>
                          </div>
                          {!notification.read && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => markNotificationAsRead(notification.id)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </div>
  );
};

export default TradeCenter;