import React, { useEffect, useMemo, useState, useRef } from "react";
import { NavigationHeader } from "@/components/navigation-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useTrade } from "@/contexts/TradeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "react-router-dom";
// Using direct CDN import for Socket.IO client to avoid bundling issues with typing from ambient declarations
const io = window.io;
import { 
  Search, 
  Heart, 
  Star, 
  Clock, 
  Users, 
  Tv, 
  Dumbbell, 
  BookOpen, 
  Music, 
  Gamepad2,
  Smartphone,
  Car,
  Coffee,
  Filter
, 
  ArrowRightLeft
} from "lucide-react";

// Services fetched from API
type Service = {
  _id: string;
  title: string;
  description: string;
  price: number;
  originalPrice: number;
  category: string;
  users: number;
  sellerName?: string;
  location?: string;
  rating?: number;
  verified?: boolean;
  createdAt?: string;
};

const categories = [
  { value: "all", label: "All Categories" },
  { value: "streaming", label: "Streaming" },
  { value: "fitness", label: "Fitness & Health" },
  { value: "education", label: "Education" },
  { value: "music", label: "Music" },
  { value: "gaming", label: "Gaming" },
  { value: "software", label: "Software" }
];

const Browse = () => {
  const normalizeCategory = (name: string) => {
    const n = (name || '').toLowerCase();
    if (n.includes('stream')) return 'streaming';
    if (n.includes('fit')) return 'fitness';
    if (n.includes('educat')) return 'education';
    if (n.includes('music')) return 'music';
    if (n.includes('game')) return 'gaming';
    if (n.includes('soft') || n.includes('app') || n.includes('mobile')) return 'software';
    return n;
  };
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [tradeOffer, setTradeOffer] = useState({
    offerPrice: "",
    message: ""
  });
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const socketRef = useRef<Socket | null>(null);
  
  const { sendTradeOffer, isLoading, canUserTrade, getTradeTimeRemaining } = useTrade();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  // Initialize socket connection
  useEffect(() => {
    if (isAuthenticated && user) {
      const token = localStorage.getItem('serviceswap_token');
      socketRef.current = io('http://localhost:5000', {
        auth: { token },
        transports: ['websocket'],
      });
      
      // Join the services room to receive updates
      socketRef.current.on('connect', () => {
        console.log('Socket connected in Browse');
      });
      
      // Handle new service event
      socketRef.current.on('new_service', (newService: Service) => {
        // Only add if it matches current category filter (canonical lowercase)
        const incomingCat = normalizeCategory(newService.category);
        if (selectedCategory === 'all' || incomingCat === selectedCategory) {
          setServices(prev => [newService, ...prev]);
          toast({
            title: "New Service Available",
            description: `${newService.title} was just listed!`,
          });
        }
      });
      
      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
      };
    }
  }, [isAuthenticated, user, selectedCategory, toast]);

  useEffect(() => {
    const categoryParam = (searchParams.get('category') || 'all').toLowerCase();
    const valid = ["all","streaming","fitness","education","music","gaming","software"];
    if (valid.includes(categoryParam)) {
      setSelectedCategory(categoryParam);
    }
  }, [searchParams]);

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    if (value === 'all') {
      setSearchParams({}, { replace: true });
    } else {
      setSearchParams({ category: value }, { replace: true });
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      setLoadingServices(true);
      try {
        const params = new URLSearchParams();
        if (selectedCategory && selectedCategory !== 'all') params.set('category', selectedCategory);
        if (searchTerm) params.set('search', searchTerm);
        const res = await fetch(`/api/services?${params.toString()}`, { signal: controller.signal });
        const data: Service[] = await res.json();
        setServices(data);
      } catch (e) {
        if (!(e instanceof DOMException) || e.name !== 'AbortError') {
          toast({ title: 'Failed to load services', variant: 'destructive' });
        }
      } finally {
        setLoadingServices(false);
      }
    };
    run();
    return () => controller.abort();
  }, [selectedCategory, searchTerm]);

  const handleSendTradeOffer = async () => {
    if (!user || !selectedService) return;
    
    if (!canUserTrade(user.id)) {
      const timeRemaining = getTradeTimeRemaining(user.id);
      toast({
        title: "Trade Cooldown Active",
        description: `Please wait ${timeRemaining} minutes before sending another trade offer.`,
        variant: "destructive"
      });
      return;
    }

    try {
      await sendTradeOffer({
        fromUserId: user.id,
        fromUserName: user.name,
        toUserId: "seller_id", // In real app, this would be the actual seller's ID
        toUserName: selectedService.sellerName || 'Seller',
        serviceId: selectedService._id,
        serviceName: selectedService.title,
        serviceCategory: selectedService.category,
        offerPrice: Number(tradeOffer.offerPrice),
        originalPrice: selectedService.originalPrice,
        message: tradeOffer.message,
        tradeDetails: {
          duration: "Duration from service details",
          accessType: "share"
        },
        verificationRequired: true,
        tradeProtectionLevel: "premium"
      });

      toast({
        title: "Trade Offer Sent!",
        description: `Your offer for ${selectedService.title} has been sent.`,
      });
      
      setTradeOffer({ offerPrice: "", message: "" });
      setSelectedService(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send trade offer. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-background via-background to-primary/5">
      <NavigationHeader />
      
      {/* Header Section */}
      <section className="relative pt-32 pb-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-primary via-primary to-primary-foreground bg-clip-text text-transparent animate-fade-in">
              Browse Services
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground animate-fade-in" style={{ animationDelay: '0.1s' }}>
              Discover amazing deals on premium services and subscriptions
            </p>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={handleCategoryChange}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loadingServices && (
              <div className="col-span-full text-center text-muted-foreground">Loading services...</div>
            )}
            {!loadingServices && services.length === 0 && (
              <div className="col-span-full text-center text-muted-foreground">No services found</div>
            )}
            {!loadingServices && services.map((service, index) => {
              return (
                <Card 
                  key={service._id} 
                  className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 animate-fade-in border-border/60 hover:border-primary/30"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          {/* Optional icon per category could be added here */}
                        </div>
                        <div>
                          <Badge variant="secondary" className="text-xs mb-1">
                            {service.category}
                          </Badge>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center">
                              <Star className="h-3 w-3 text-yellow-500 fill-current" />
                              <span className="text-xs text-muted-foreground ml-1">
                                {service.rating ?? 0}
                              </span>
                            </div>
                            {service.verified ? (
                              <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                                Verified
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="p-1" type="button" onClick={() => toast({ title: 'Saved', description: 'Added to your wishlist (demo).' })}>
                        <Heart className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div>
                          <CardTitle className="text-lg mb-2 group-hover:text-primary transition-colors">
                        {service.title}
                      </CardTitle>
                      <CardDescription className="text-sm line-clamp-3">
                        {service.description}
                      </CardDescription>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Users className="h-3 w-3" />
                        <span>{service.users} slots</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        <span>{service.createdAt ? new Date(service.createdAt).toLocaleDateString() : ''}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold text-primary">
                            ₹{service.price}
                          </span>
                          <span className="text-sm text-muted-foreground line-through">
                            ₹{service.originalPrice}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          by {service.sellerName || 'Seller'} • {service.location || 'India'}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button className="flex-1" size="sm" variant="outline">
                            View Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>{service.title}</DialogTitle>
                            <DialogDescription>{service.category} • by {service.sellerName || 'Seller'}</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-3 text-sm">
                            <p>{service.description}</p>
                            <div className="flex items-center gap-3 text-muted-foreground">
                              <span className="font-medium text-foreground">Price:</span> ₹{service.price}
                              <span className="line-through">₹{service.originalPrice}</span>
                              <span>•</span>
                              <span>{service.users} slots</span>
                              <span>•</span>
                              <span>{service.location || 'India'}</span>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            className="flex-1" 
                            size="sm"
                            onClick={() => {
                              setSelectedService(service);
                              setTradeOffer({ offerPrice: service.price.toString(), message: "" });
                            }}
                          >
                            <ArrowRightLeft className="w-4 h-4 mr-2" />
                            Trade
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Send Trade Offer</DialogTitle>
                            <DialogDescription>
                              Send a trade offer to {service.sellerName || 'Seller'} for {service.title}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="offerPrice">Your Offer (₹)</Label>
                              <Input
                                id="offerPrice"
                                type="number"
                                value={tradeOffer.offerPrice}
                                onChange={(e) => setTradeOffer(prev => ({ ...prev, offerPrice: e.target.value }))}
                                placeholder={service.price.toString()}
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Suggested: ₹{service.price} (Original: ₹{service.originalPrice})
                              </p>
                            </div>
                            <div>
                              <Label htmlFor="message">Message (Optional)</Label>
                              <Textarea
                                id="message"
                                value={tradeOffer.message}
                                onChange={(e) => setTradeOffer(prev => ({ ...prev, message: e.target.value }))}
                                placeholder="Hi! I'm interested in this service..."
                                rows={3}
                              />
                            </div>
                            <Button 
                              onClick={handleSendTradeOffer}
                              className="w-full"
                              disabled={isLoading || !tradeOffer.offerPrice}
                            >
                              {isLoading ? "Sending..." : "Send Trade Offer"}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {services.length === 0 && (
            <div className="text-center py-12">
              <div className="max-w-md mx-auto">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No services found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search or filter criteria
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Browse;