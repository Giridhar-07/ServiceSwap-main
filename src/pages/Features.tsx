import { Shield, Search, DollarSign, Users } from "lucide-react";
import { NavigationHeader } from "@/components/navigation-header";

const Features = () => {
  const features = [
    {
      icon: Shield,
      title: "Secure Escrow System",
      description: "Advanced payment protection ensuring safe transactions between buyers and sellers.",
      delay: '0.3s'
    },
    {
      icon: Search,
      title: "Smart Discovery",
      description: "AI-powered search and recommendation system to find exactly what you need.",
      delay: '0.4s'
    },
    {
      icon: DollarSign,
      title: "Transparent Pricing",
      description: "No hidden fees. Clear commission structure with competitive rates.",
      delay: '0.5s'
    },
    {
      icon: Users,
      title: "Verified Community",
      description: "Identity verification and user ratings ensure a trusted marketplace experience.",
      delay: '0.6s'
    }
  ];

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-background via-background to-primary/5">
      <NavigationHeader />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-primary to-primary-foreground bg-clip-text text-transparent animate-fade-in">
            Platform Features
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground animate-fade-in" style={{ animationDelay: '0.1s' }}>
            Discover what makes ServiceSwap the most trusted marketplace in India
          </p>
        </div>
      </section>

      {/* Features List */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="space-y-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              const isEven = index % 2 === 0;
              
              return (
                <div
                  key={index}
                  className={`group flex flex-col ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'} gap-8 items-center p-8 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:-translate-y-1 animate-fade-in`}
                  style={{ animationDelay: feature.delay }}
                >
                  <div className="flex-shrink-0 w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center group-hover:from-primary/30 group-hover:to-primary/10 transition-all duration-300">
                    <Icon className="w-12 h-12 text-primary" />
                  </div>
                  <div className={`flex-1 ${isEven ? 'md:text-left' : 'md:text-right'} text-center`}>
                    <h3 className="text-3xl font-bold mb-3 text-foreground">
                      {feature.title}
                    </h3>
                    <p className="text-lg text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 animate-fade-in" style={{ animationDelay: '0.7s' }}>
            Ready to get started?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 animate-fade-in" style={{ animationDelay: '0.8s' }}>
            Join thousands of Indians who are already saving money and earning from their unused services
          </p>
          <a
            href="/browse"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all duration-300 hover:scale-105 animate-fade-in"
            style={{ animationDelay: '0.9s' }}
          >
            <Search className="w-5 h-5" />
            Browse Services
          </a>
        </div>
      </section>
    </div>
  );
};

export default Features;
