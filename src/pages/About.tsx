import { Globe2, Rocket, Users, Shield, TrendingUp, Heart } from "lucide-react";
import { NavigationHeader } from "@/components/navigation-header";

const About = () => {
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-background via-background to-primary/5">
      <NavigationHeader />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-primary to-primary-foreground bg-clip-text text-transparent animate-fade-in">
            About ServiceSwap
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            India's First Digital Services Marketplace
          </p>
          <p className="text-lg text-muted-foreground/80 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Discover our mission to revolutionize how Indians share and access digital services. From unused Netflix slots to gym memberships, we're building India's most trusted services exchange platform.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <h2 className="text-4xl md:text-5xl font-bold text-foreground">
                Our Mission
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                To create India's most trusted marketplace for second-hand digital services, making premium subscriptions and memberships accessible to everyone while helping people monetize their unused services.
              </p>
              <p className="text-base text-muted-foreground/70 leading-relaxed">
                We believe that no service should go unused. Whether it's an extra Netflix slot, unused gym membership, or course access, ServiceSwap connects service owners with those who need them, creating value for both parties.
              </p>
            </div>
            <div className="relative h-64 md:h-96 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 animate-fade-in" style={{ animationDelay: '0.4s' }}>
              <div className="absolute inset-0 flex items-center justify-center">
                <Globe2 className="w-32 h-32 text-primary/40 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 animate-fade-in">
            Core Values
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Shield, title: "Trust & Safety", description: "Secure escrow system and verified listings ensure safe transactions for everyone.", delay: '0.5s' },
              { icon: TrendingUp, title: "Value Creation", description: "Turn your unused services into income while helping others access premium services at lower costs.", delay: '0.6s' },
              { icon: Heart, title: "Community First", description: "Building a supportive community where Indians help each other access better digital services.", delay: '0.7s' }
            ].map((value, index) => {
              const Icon = value.icon;
              return (
                <div 
                  key={index} 
                  className="group p-8 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:-translate-y-1 animate-fade-in"
                  style={{ animationDelay: value.delay }}
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold mb-4 text-foreground">
                    {value.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {value.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
