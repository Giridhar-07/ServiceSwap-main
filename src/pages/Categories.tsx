import React from "react";
import { NavigationHeader } from "@/components/navigation-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Tv, 
  Dumbbell, 
  BookOpen, 
  Music, 
  Gamepad2,
  Smartphone,
  Car,
  Coffee,
  Laptop,
  ShoppingBag,
  Home,
  Plane
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const categories = [
  {
    id: 1,
    name: "Streaming & Entertainment",
    description: "Netflix, Amazon Prime, Disney+, YouTube Premium and more",
    icon: Tv,
    count: 245,
    color: "text-red-500",
    bgColor: "bg-red-500/10"
  },
  {
    id: 2,
    name: "Fitness & Health",
    description: "Gym memberships, fitness apps, wellness subscriptions",
    icon: Dumbbell,
    count: 123,
    color: "text-green-500",
    bgColor: "bg-green-500/10"
  },
  {
    id: 3,
    name: "Education & Learning",
    description: "Online courses, skill development, language learning",
    icon: BookOpen,
    count: 189,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10"
  },
  {
    id: 4,
    name: "Music & Audio",
    description: "Spotify, Apple Music, podcast subscriptions",
    icon: Music,
    count: 167,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10"
  },
  {
    id: 5,
    name: "Gaming",
    description: "PlayStation Plus, Xbox Game Pass, gaming subscriptions",
    icon: Gamepad2,
    count: 98,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10"
  },
  {
    id: 6,
    name: "Software & Tools",
    description: "Adobe Creative Cloud, Microsoft Office, productivity tools",
    icon: Laptop,
    count: 156,
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10"
  },
  {
    id: 7,
    name: "Mobile & Apps",
    description: "Premium app subscriptions, cloud storage",
    icon: Smartphone,
    count: 78,
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/10"
  },
  {
    id: 8,
    name: "Transportation",
    description: "Uber, Ola passes, metro cards, fuel subscriptions",
    icon: Car,
    count: 45,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10"
  },
  {
    id: 9,
    name: "Food & Delivery",
    description: "Zomato Pro, Swiggy One, restaurant memberships",
    icon: Coffee,
    count: 89,
    color: "text-pink-500",
    bgColor: "bg-pink-500/10"
  },
  {
    id: 10,
    name: "Shopping & Retail",
    description: "Amazon Prime, Flipkart Plus, loyalty programs",
    icon: ShoppingBag,
    count: 134,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10"
  },
  {
    id: 11,
    name: "Home & Lifestyle",
    description: "Home services, maintenance subscriptions",
    icon: Home,
    count: 67,
    color: "text-teal-500",
    bgColor: "bg-teal-500/10"
  },
  {
    id: 12,
    name: "Travel & Hospitality",
    description: "Hotel memberships, travel passes, booking benefits",
    icon: Plane,
    count: 52,
    color: "text-violet-500",
    bgColor: "bg-violet-500/10"
  }
];

const Categories = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const mapToBrowseKey = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('streaming')) return 'streaming';
    if (n.includes('fitness')) return 'fitness';
    if (n.includes('education')) return 'education';
    if (n.includes('music')) return 'music';
    if (n.includes('gaming')) return 'gaming';
    if (n.includes('software') || n.includes('mobile') || n.includes('apps')) return 'software';
    return 'all';
  };

  const goToCategory = (name: string) => {
    const key = mapToBrowseKey(name);
    if (key === 'all') {
      toast({ title: 'Browsing all services', description: 'Category-specific browsing coming soon.' });
      navigate('/browse');
    } else {
      navigate(`/browse?category=${key}`);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-background via-background to-primary/5">
      <NavigationHeader />
      
      {/* Header Section */}
      <section className="relative pt-32 pb-12 px-4">
        <div className="container mx-auto max-w-6xl text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-primary to-primary-foreground bg-clip-text text-transparent animate-fade-in">
            Service Categories
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            Explore services by category
          </p>
          <p className="text-base text-muted-foreground/80 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.2s' }}>
            From entertainment subscriptions to fitness memberships, find exactly what you're looking for in our organized categories.
          </p>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {categories.map((category, index) => {
              const IconComponent = category.icon;
              return (
                <Card 
                  key={category.id} 
                  className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer animate-fade-in border-border/60 hover:border-primary/30"
                  style={{ animationDelay: `${index * 0.05}s` }}
                  onClick={() => goToCategory(category.name)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`p-3 rounded-xl ${category.bgColor} group-hover:scale-110 transition-transform duration-300`}>
                        <IconComponent className={`h-6 w-6 ${category.color}`} />
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {category.count} services
                      </Badge>
                    </div>
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">
                      {category.name}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {category.description}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    <Button 
                      variant="outline" 
                      className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300"
                      type="button"
                      onClick={(e) => { e.stopPropagation(); goToCategory(category.name); }}
                    >
                      Browse Category
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Popular Categories Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-8 animate-fade-in">
            Most Popular Categories
          </h2>
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            {categories
              .sort((a, b) => b.count - a.count)
              .slice(0, 6)
              .map((category, index) => (
                <Badge 
                  key={category.id}
                  variant="outline" 
                  className="px-4 py-2 text-sm hover:bg-primary hover:text-primary-foreground cursor-pointer transition-all duration-300 animate-fade-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                  onClick={() => goToCategory(category.name)}
                >
                  {category.name}
                </Badge>
              ))}
          </div>
          <p className="text-muted-foreground animate-fade-in" style={{ animationDelay: '0.6s' }}>
            Can't find what you're looking for? Try our search feature or browse all services.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
            <Button size="lg" className="animate-fade-in" style={{ animationDelay: '0.7s' }} type="button" onClick={() => navigate('/browse')}>
              Browse All Services
            </Button>
            <Button variant="outline" size="lg" className="animate-fade-in" style={{ animationDelay: '0.8s' }} type="button" onClick={() => navigate('/contact')}>
              Request Category
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Categories;