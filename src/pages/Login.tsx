import React, { useState, useEffect } from "react";
import { NavigationHeader } from "@/components/navigation-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import { z } from "zod";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  Smartphone,
  Shield,
  ArrowRight
} from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean()
});

const Login = () => {
  const { toast } = useToast();
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginMode, setLoginMode] = useState<'email' | 'phone'>('email');

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    try {
      const validatedData = loginSchema.parse(formData);
      setIsSubmitting(true);
      
      await login(validatedData.email, validatedData.password);
      
      toast({
        title: "Login successful!",
        description: "Welcome back to ServiceSwap",
      });
      
      navigate('/dashboard');
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        const msg = (error as Error).message || 'Invalid credentials. Please try again.'
        toast({
          title: "Login failed",
          description: msg,
          variant: "destructive"
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const handleSocialLogin = (provider: string) => {
    toast({
      title: `${provider} Login`,
      description: `Redirecting to ${provider} authentication...`,
    });
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-background via-background to-primary/5">
      <NavigationHeader />
      
      <section className="relative pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-primary to-primary-foreground bg-clip-text text-transparent animate-fade-in">
              Welcome Back
            </h1>
            <p className="text-lg text-muted-foreground animate-fade-in" style={{ animationDelay: '0.1s' }}>
              Sign in to your ServiceSwap account
            </p>
          </div>

          <Card className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center">Sign In</CardTitle>
              <CardDescription className="text-center">
                Enter your credentials to access your account
              </CardDescription>
            </CardHeader>

            <CardContent>
              {/* Login Mode Toggle */}
              <div className="flex rounded-lg bg-muted p-1 mb-6">
                <Button
                  type="button"
                  variant={loginMode === 'email' ? 'default' : 'ghost'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setLoginMode('email')}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Email
                </Button>
                <Button
                  type="button"
                  variant={loginMode === 'phone' ? 'default' : 'ghost'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setLoginMode('phone')}
                >
                  <Smartphone className="w-4 h-4 mr-2" />
                  Phone
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {loginMode === 'email' ? (
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="your@email.com"
                        value={formData.email}
                        onChange={(e) => handleChange("email", e.target.value)}
                        className={`pl-10 ${errors.email ? "border-destructive" : ""}`}
                      />
                    </div>
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email}</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium">
                      Phone Number
                    </Label>
                    <div className="relative">
                      <Smartphone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+91 98765 43210"
                        className="pl-10"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={(e) => handleChange("password", e.target.value)}
                      className={`pl-10 pr-10 ${errors.password ? "border-destructive" : ""}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="rememberMe"
                      checked={formData.rememberMe}
                      onCheckedChange={(checked) => handleChange("rememberMe", checked)}
                    />
                    <Label htmlFor="rememberMe" className="text-sm font-medium">
                      Remember me
                    </Label>
                  </div>
                  <Button variant="link" className="p-0 text-sm" type="button" onClick={() => navigate('/forgot-password')}>
                    Forgot password?
                  </Button>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                  size="lg"
                >
                  {isSubmitting ? (
                    "Signing in..."
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or continue with
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => window.location.href = '/api/auth/facebook'}
                  >
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    Continue with Facebook
                  </Button>
                </div>
              </div>

              <div className="mt-6 text-center text-sm">
                <span className="text-muted-foreground">Don't have an account? </span>
                <Button variant="link" className="p-0" type="button" onClick={() => navigate('/signup')}>
                  Sign up now
                </Button>
              </div>

              {/* Security Notice */}
              <div className="mt-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <Shield className="w-4 h-4 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-blue-900 dark:text-blue-100 font-medium mb-1">
                      Secure Login
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Your data is protected with end-to-end encryption and secure authentication.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Login;