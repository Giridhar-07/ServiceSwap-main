import React, { useEffect, useRef, useState } from "react";
import { NavigationHeader } from "@/components/navigation-header";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import DashboardModals from "./DashboardModals";
import { 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  Star,
  TrendingUp,
  DollarSign,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  MessageCircle,
  Heart,
  Settings
} from "lucide-react";

// Socket.IO client via global (same pattern used in Browse)
const io = (window as any).io;

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const socketRef = useRef<any>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<any | null>(null);
  const [editData, setEditData] = useState<any>({
    title: "",
    description: "",
    category: "streaming",
    price: 0,
    originalPrice: 0,
    users: 1,
    location: "",
    status: "active",
  });

  // Real data
  const [myListings, setMyListings] = useState<any[]>([]);
  const userStats = {
    totalListings: myListings.length,
    activeListings: myListings.filter(s => s.status === 'active').length,
    soldServices: myListings.filter(s => s.status === 'sold').length,
    totalEarnings: 0,
    rating: 0,
    reviews: 0
  };

  // Fetch current user's listings
  useEffect(() => {
    const run = async () => {
      try {
        if (!isAuthenticated) return;
        const token = localStorage.getItem('serviceswap_token');
        if (!token) return;
        const res = await fetch('/api/services/my', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
          let msg = 'Failed to fetch your services';
          if (res.status === 401) {
            msg = 'Your session has expired. Please log in again.';
          } else if (res.status === 403) {
            msg = 'Not authorized to fetch your services.';
          } else if (res.status === 500) {
            msg = 'Server error while fetching your services.';
          }
          throw new Error(msg);
        }
        const docs = await res.json();
        const mapped = docs.map((d: any) => ({
          id: d._id,
          title: d.title,
          category: d.category,
          price: d.price,
          originalPrice: d.originalPrice,
          status: d.status,
          views: d.views ?? 0,
          interested: Array.isArray(d.interestedUsers) ? d.interestedUsers.length : 0,
          slotsLeft: d.users ?? 0,
          createdAt: d.createdAt,
          description: d.description,
          location: d.location ?? "",
          users: d.users ?? 1,
        }));
        setMyListings(mapped);
      } catch (err) {
        const message = (err as Error)?.message || 'Failed to load your listings';
        console.error('[dashboard:my:error]', err);
        toast({ title: 'Error', description: message, variant: 'destructive' });
        // Optional: auto-redirect on auth failure
        if ((err as Error)?.message?.includes('session') || (err as Error)?.message?.includes('log in')) {
          setTimeout(() => navigate('/login'), 800);
        }
      }
    };
    run();
  }, [isAuthenticated]);

  // Socket real-time updates for new listings and status changes
  useEffect(() => {
    if (isAuthenticated && user) {
      const token = localStorage.getItem('serviceswap_token');
      socketRef.current = io('http://localhost:5000', {
        auth: { token },
        transports: ['websocket'],
      });

      socketRef.current.on('connect', () => {
        console.log('Socket connected in Dashboard');
      });

      socketRef.current.on('new_service', (doc: any) => {
        if (doc?.seller?.toString?.() === user.id || doc?.seller === user.id) {
          setMyListings(prev => [{
            id: doc._id,
            title: doc.title,
            category: doc.category,
            price: doc.price,
            originalPrice: doc.originalPrice,
            status: doc.status,
            views: doc.views ?? 0,
            interested: Array.isArray(doc.interestedUsers) ? doc.interestedUsers.length : 0,
            slotsLeft: doc.users ?? 0,
            createdAt: doc.createdAt,
          }, ...prev]);
          toast({ title: 'Listing published', description: `${doc.title} is now live.` });
        }
      });

      socketRef.current.on('service_status_updated', (evt: any) => {
        const { id, status } = evt || {};
        setMyListings(prev => prev.map(item => item.id === id ? { ...item, status } : item));
      });

      socketRef.current.on('service_updated', (evt: any) => {
        const { id, service } = evt || {};
        if (!id || !service) return;
        setMyListings(prev => prev.map(item => item.id === id ? {
          ...item,
          title: service.title ?? item.title,
          category: service.category ?? item.category,
          price: service.price ?? item.price,
          originalPrice: service.originalPrice ?? item.originalPrice,
          status: service.status ?? item.status,
          views: service.views ?? item.views,
          interested: Array.isArray(service.interestedUsers) ? service.interestedUsers.length : item.interested,
          slotsLeft: service.users ?? item.slotsLeft,
          createdAt: service.createdAt ?? item.createdAt,
          description: service.description ?? item.description,
          location: service.location ?? item.location,
          users: service.users ?? item.users,
        } : item));
      });

      socketRef.current.on('service_deleted', (evt: any) => {
        const { id } = evt || {};
        if (!id) return;
        setMyListings(prev => prev.filter(item => item.id !== id));
      });

      return () => {
        if (socketRef.current) socketRef.current.disconnect();
      };
    }
  }, [isAuthenticated, user]);

  const purchasedServices = [
    {
      id: 1,
      title: "Spotify Premium Family",
      seller: "Priya S.",
      price: 49,
      status: "active",
      purchasedOn: "2024-10-05",
      validTill: "2025-02-05",
      accessDetails: "Login shared via WhatsApp"
    },
    {
      id: 2,
      title: "Coursera Plus Annual",
      seller: "Amit T.",
      price: 3500,
      status: "completed",
      purchasedOn: "2024-08-15",
      validTill: "2025-01-15",
      accessDetails: "Course completion certificate received"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800 border-green-200";
      case "pending": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "sold": return "bg-blue-100 text-blue-800 border-blue-200";
      case "rejected": return "bg-red-100 text-red-800 border-red-200";
      case "completed": return "bg-gray-100 text-gray-800 border-gray-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active": return <CheckCircle className="w-3 h-3" />;
      case "pending": return <Clock className="w-3 h-3" />;
      case "sold": return <DollarSign className="w-3 h-3" />;
      case "rejected": return <XCircle className="w-3 h-3" />;
      default: return <Clock className="w-3 h-3" />;
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-background via-background to-primary/5">
      <NavigationHeader />
      
      {/* Header Section */}
      <section className="relative pt-32 pb-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-primary via-primary to-primary-foreground bg-clip-text text-transparent animate-fade-in">
                Welcome back, {user?.name || 'User'}!
              </h1>
              <p className="text-lg text-muted-foreground animate-fade-in" style={{ animationDelay: '0.1s' }}>
                Manage your services and track your earnings
              </p>
            </div>
            <Button size="lg" className="animate-fade-in" style={{ animationDelay: '0.2s' }} type="button" onClick={() => navigate('/list-service')}>
              <Plus className="w-4 h-4 mr-2" />
              List New Service
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Overview */}
      <section className="pb-8 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: "Total Listings", value: userStats.totalListings, icon: Plus, color: "text-blue-600" },
              { label: "Active", value: userStats.activeListings, icon: CheckCircle, color: "text-green-600" },
              { label: "Sold", value: userStats.soldServices, icon: TrendingUp, color: "text-purple-600" },
              { label: "Earnings", value: `₹${userStats.totalEarnings}`, icon: DollarSign, color: "text-emerald-600" },
              { label: "Rating", value: userStats.rating, icon: Star, color: "text-yellow-600" },
              { label: "Reviews", value: userStats.reviews, icon: MessageCircle, color: "text-pink-600" }
            ].map((stat, index) => {
              const IconComponent = stat.icon;
              return (
                <Card key={stat.label} className="animate-fade-in" style={{ animationDelay: `${index * 0.05}s` }}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                        <p className="text-lg font-bold">{stat.value}</p>
                      </div>
                      <IconComponent className={`w-5 h-5 ${stat.color}`} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Dashboard Content */}
      <section className="pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-8">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="my-listings">My Listings</TabsTrigger>
              <TabsTrigger value="purchases">Purchases</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Your latest marketplace activities</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { action: "New inquiry", service: "Netflix Premium Plan", time: "2 hours ago", type: "inquiry" },
                        { action: "Service sold", service: "Adobe Creative Cloud", time: "1 day ago", type: "sale" },
                        { action: "New listing", service: "Cult.fit Membership", time: "2 days ago", type: "listing" },
                        { action: "Payment received", service: "Spotify Family", time: "3 days ago", type: "payment" }
                      ].map((activity, index) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                          <div>
                            <p className="text-sm font-medium">{activity.action}</p>
                            <p className="text-xs text-muted-foreground">{activity.service}</p>
                          </div>
                          <span className="text-xs text-muted-foreground">{activity.time}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Earnings Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Earnings</CardTitle>
                    <CardDescription>Your earnings over the last few months</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { month: "October", amount: 5420, progress: 85 },
                        { month: "September", amount: 3200, progress: 60 },
                        { month: "August", amount: 4800, progress: 75 },
                        { month: "July", amount: 2000, progress: 40 }
                      ].map((earning) => (
                        <div key={earning.month} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>{earning.month}</span>
                            <span className="font-medium">₹{earning.amount}</span>
                          </div>
                          <Progress value={earning.progress} className="h-2" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="my-listings" className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold">My Service Listings</h3>
                <Button type="button" onClick={() => navigate('/list-service')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Listing
                </Button>
              </div>

              <div className="grid gap-4">
                {myListings.map((listing) => (
                  <Card key={listing.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-lg font-semibold">{listing.title}</h4>
                            <Badge className={getStatusColor(listing.status)}>
                              {getStatusIcon(listing.status)}
                              <span className="ml-1 capitalize">{listing.status}</span>
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                            <span>Listed {listing.listed}</span>
                            <span>•</span>
                            <span>{listing.category}</span>
                            <span>•</span>
                            <span>Listed on {listing.createdAt ? new Date(listing.createdAt).toLocaleDateString() : '-'}</span>
                          </div>
                          <div className="flex items-center gap-6 text-sm">
                            <div className="flex items-center gap-1">
                              <Eye className="w-4 h-4" />
                              {listing.views} views
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {listing.interested} interested
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {listing.slotsLeft} slots left
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-2xl font-bold text-primary">₹{listing.price}</p>
                            <p className="text-sm text-muted-foreground line-through">₹{listing.originalPrice}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              type="button"
                              onClick={() => {
                                setSelectedListing(listing);
                                setEditData({
                                  title: listing.title ?? "",
                                  description: listing.description ?? "",
                                  category: listing.category ?? "streaming",
                                  price: listing.price ?? 0,
                                  originalPrice: listing.originalPrice ?? 0,
                                  users: listing.users ?? listing.slotsLeft ?? 1,
                                  location: listing.location ?? "",
                                  status: listing.status ?? "active",
                                });
                                setEditOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm" type="button" onClick={() => navigate('/browse')}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              type="button"
                              onClick={() => { setSelectedListing(listing); setDeleteOpen(true); }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="purchases" className="space-y-6">
              <h3 className="text-2xl font-bold">My Purchases</h3>
              
              <div className="grid gap-4">
                {purchasedServices.map((service) => (
                  <Card key={service.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold mb-2">{service.title}</h4>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                            <span>Purchased on {new Date(service.purchasedOn).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>Seller: {service.seller}</span>
                            <span>•</span>
                          <span>Valid till {new Date(service.validTill).toLocaleDateString()}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{service.accessDetails}</p>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-xl font-bold text-primary">₹{service.price}</p>
                            <Badge className={getStatusColor(service.status)}>
                              {getStatusIcon(service.status)}
                              <span className="ml-1 capitalize">{service.status}</span>
                            </Badge>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <MessageCircle className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Star className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Account Settings
                    </CardTitle>
                    <CardDescription>Manage your account preferences</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button variant="outline" className="w-full justify-start" type="button" onClick={() => navigate('/settings/profile')}>
                      Edit Profile Information
                    </Button>
                    <Button variant="outline" className="w-full justify-start" type="button" onClick={() => navigate('/settings/password')}>
                      Change Password
                    </Button>
                    <Button variant="outline" className="w-full justify-start" type="button" onClick={() => navigate('/settings/notifications')}>
                      Notification Preferences
                    </Button>
                    <Button variant="outline" className="w-full justify-start" type="button" onClick={() => navigate('/settings/payments')}>
                      Payment Methods
                    </Button>
                    <Button variant="outline" className="w-full justify-start" type="button" onClick={() => navigate('/settings/2fa')}>
                      Two-Factor Authentication
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>Frequently used features</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button className="w-full" type="button" onClick={() => navigate('/list-service')}>
                      <Plus className="w-4 h-4 mr-2" />
                      List New Service
                    </Button>
                    <Button variant="outline" className="w-full" type="button" onClick={() => navigate('/browse')}>
                      Browse Services
                    </Button>
                    <Button variant="outline" className="w-full">
                      Contact Support
                    </Button>
                    <Button variant="outline" className="w-full">
                      View Help Center
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>
      <DashboardModals
        editOpen={editOpen}
        onEditOpenChange={setEditOpen}
        deleteOpen={deleteOpen}
        onDeleteOpenChange={setDeleteOpen}
        selectedListing={selectedListing}
        editData={editData}
        setEditData={setEditData}
        setMyListings={setMyListings}
        toast={toast}
      />
    </div>
  );
};

export default Dashboard;