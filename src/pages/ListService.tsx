import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { NavigationHeader } from "@/components/navigation-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import {
  Upload,
  Info,
  DollarSign,
  Calendar,
  Users,
  Shield,
  CheckCircle
} from "lucide-react";

const serviceSchema = z.object({
  title: z.string().trim().min(5, "Title must be at least 5 characters").max(100, "Title must be less than 100 characters"),
  description: z.string().trim().min(20, "Description must be at least 20 characters").max(1000, "Description must be less than 1000 characters"),
  category: z.string().min(1, "Please select a category"),
  price: z.number().min(1, "Price must be at least ₹1").max(50000, "Price must be less than ₹50,000"),
  originalPrice: z.number().min(1, "Original price is required"),
  slotsAvailable: z.number().min(1, "At least 1 slot required").max(10, "Maximum 10 slots allowed"),
  validTill: z.string().min(1, "Valid till date is required"),
  location: z.string().min(1, "Location is required"),
  whatsappContact: z
    .string()
    .transform((val) => val.replace(/\s|-/g, ''))
    .refine((val) => /^\+?[0-9]{10,15}$/.test(val), "Valid WhatsApp number required"),
  terms: z.boolean().refine(val => val === true, "Please accept the terms and conditions")
});

const categories = [
  "Streaming & Entertainment",
  "Fitness & Health", 
  "Education & Learning",
  "Music & Audio",
  "Gaming",
  "Software & Tools",
  "Mobile & Apps",
  "Transportation",
  "Food & Delivery",
  "Shopping & Retail",
  "Home & Lifestyle",
  "Travel & Hospitality"
];

type FormData = {
  title: string;
  description: string;
  category: string;
  price: string;
  originalPrice: string;
  slotsAvailable: string;
  validTill: string;
  location: string;
  whatsappContact: string;
  terms: boolean;
};

const ListService = () => {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  // Map detailed category names to canonical keys used across Browse
  const mapToBrowseKey = (name: string) => {
    const n = (name || '').toLowerCase();
    if (n.includes('streaming')) return 'streaming';
    if (n.includes('fitness')) return 'fitness';
    if (n.includes('education')) return 'education';
    if (n.includes('music')) return 'music';
    if (n.includes('gaming')) return 'gaming';
    if (n.includes('software') || n.includes('mobile') || n.includes('apps')) return 'software';
    // Fallback: keep lowercase original for categories not yet mapped
    return n;
  };
  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    category: "",
    price: "",
    originalPrice: "",
    slotsAvailable: "1",
    validTill: "",
    location: "",
    whatsappContact: "",
    terms: false
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    console.log('[list-service] submit clicked');
    
    try {
      const token = localStorage.getItem('serviceswap_token');
      if (!isAuthenticated || !token) {
        toast({ title: 'Please log in to publish a service', variant: 'destructive' });
        console.warn('[list-service] blocked: not authenticated or missing token');
        return;
      }
      const validatedData = serviceSchema.parse({
        ...formData,
        price: Number(formData.price),
        originalPrice: Number(formData.originalPrice),
        slotsAvailable: Number(formData.slotsAvailable)
      });
      console.log('[list-service] validation ok', validatedData);
      
      setIsSubmitting(true);
      
      // Submit to backend with authentication token for real-time updates
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: validatedData.title,
          description: validatedData.description,
          // Store canonical category to ensure Browse filters and real-time updates match
          category: mapToBrowseKey(validatedData.category),
          price: validatedData.price,
          originalPrice: validatedData.originalPrice,
          users: validatedData.slotsAvailable,
          location: validatedData.location,
          // Server will populate seller info from authenticated user
        })
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error('[list-service] publish failed', res.status, text);
        throw new Error(`Failed to save (${res.status})`);
      }
      console.log('[list-service] publish success');

      toast({
        title: "Service listed successfully!",
        description: "Your service is now visible in Browse.",
      });
      
      // Reset form
      setFormData({
        title: "",
        description: "",
        category: "",
        price: "",
        originalPrice: "",
        slotsAvailable: "1",
        validTill: "",
        location: "",
        whatsappContact: "",
        terms: false
      });
      setCurrentStep(1);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(fieldErrors);
        console.warn('[list-service] validation errors', fieldErrors);
      } else {
        console.error('[list-service] unexpected error', error);
        toast({ title: 'Failed to save service', description: (error as Error)?.message, variant: 'destructive' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  type FormField = keyof FormData;
  const handleChange = <K extends FormField>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 3));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-background via-background to-primary/5">
      <NavigationHeader />
      
      {/* Header Section */}
      <section className="relative pt-32 pb-12 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-primary to-primary-foreground bg-clip-text text-transparent animate-fade-in">
            List Your Service
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            Turn your unused subscriptions into income
          </p>
          <p className="text-base text-muted-foreground/80 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Share your unused Netflix slots, gym memberships, course access and more with our trusted community.
          </p>
        </div>
      </section>

      {/* Progress Steps */}
      <section className="pb-8 px-4">
        <div className="container mx-auto max-w-2xl">
          <div className="flex items-center justify-center mb-8">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                    currentStep >= step 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {currentStep > step ? <CheckCircle className="w-4 h-4" /> : step}
                </div>
                {step < 3 && (
                  <div 
                    className={`w-16 h-1 mx-2 transition-all duration-300 ${
                      currentStep > step ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-center text-sm text-muted-foreground">
            <span>{currentStep === 1 ? "Service Details" : currentStep === 2 ? "Pricing & Availability" : "Contact & Review"}</span>
          </div>
        </div>
      </section>

      {/* Form Section */}
      <section className="pb-20 px-4">
        <div className="container mx-auto max-w-2xl">
          <form onSubmit={handleSubmit} noValidate>
            <Card className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-primary" />
                  {currentStep === 1 && "Tell us about your service"}
                  {currentStep === 2 && "Set your price and availability"}
                  {currentStep === 3 && "Contact details and terms"}
                </CardTitle>
                <CardDescription>
                  {currentStep === 1 && "Provide clear and detailed information about the service you want to share"}
                  {currentStep === 2 && "Set competitive pricing and let buyers know how many slots are available"}
                  {currentStep === 3 && "Final step - add your contact details and review everything"}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Step 1: Service Details */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-base font-semibold">Service Title *</Label>
                      <Input
                        id="title"
                        placeholder="e.g., Netflix Premium Family Plan - 2 slots available"
                        value={formData.title}
                        onChange={(e) => handleChange("title", e.target.value)}
                        className={errors.title ? "border-destructive" : ""}
                      />
                      {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category" className="text-base font-semibold">Category *</Label>
                      <Select value={formData.category} onValueChange={(value) => handleChange("category", value)}>
                        <SelectTrigger className={errors.category ? "border-destructive" : ""}>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.category && <p className="text-sm text-destructive">{errors.category}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-base font-semibold">Description *</Label>
                      <Textarea
                        id="description"
                        placeholder="Describe your service in detail. Include validity, features, and any important terms..."
                        value={formData.description}
                        onChange={(e) => handleChange("description", e.target.value)}
                        className={`min-h-[120px] ${errors.description ? "border-destructive" : ""}`}
                      />
                      <p className="text-xs text-muted-foreground">{formData.description.length}/1000 characters</p>
                      {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
                    </div>
                  </div>
                )}

                {/* Step 2: Pricing & Availability */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="price" className="text-base font-semibold flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          Your Price *
                        </Label>
                        <Input
                          id="price"
                          type="number"
                          placeholder="199"
                          value={formData.price}
                          onChange={(e) => handleChange("price", e.target.value)}
                          className={errors.price ? "border-destructive" : ""}
                        />
                        {errors.price && <p className="text-sm text-destructive">{errors.price}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="originalPrice" className="text-base font-semibold">Original Price *</Label>
                        <Input
                          id="originalPrice"
                          type="number"
                          placeholder="649"
                          value={formData.originalPrice}
                          onChange={(e) => handleChange("originalPrice", e.target.value)}
                          className={errors.originalPrice ? "border-destructive" : ""}
                        />
                        {errors.originalPrice && <p className="text-sm text-destructive">{errors.originalPrice}</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="slotsAvailable" className="text-base font-semibold flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Slots Available *
                        </Label>
                        <Select value={formData.slotsAvailable} onValueChange={(value) => handleChange("slotsAvailable", value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1,2,3,4,5,6,7,8,9,10].map(num => (
                              <SelectItem key={num} value={num.toString()}>{num} slot{num > 1 ? 's' : ''}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="validTill" className="text-base font-semibold flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Valid Till *
                        </Label>
                        <Input
                          id="validTill"
                          type="date"
                          value={formData.validTill}
                          onChange={(e) => handleChange("validTill", e.target.value)}
                          className={errors.validTill ? "border-destructive" : ""}
                        />
                        {errors.validTill && <p className="text-sm text-destructive">{errors.validTill}</p>}
                      </div>
                    </div>

                    {formData.price && formData.originalPrice && (
                      <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                        <p className="text-sm text-green-700 dark:text-green-300">
                          💰 Buyers save ₹{Number(formData.originalPrice) - Number(formData.price)} ({Math.round(((Number(formData.originalPrice) - Number(formData.price)) / Number(formData.originalPrice)) * 100)}% discount)
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 3: Contact & Terms */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="location" className="text-base font-semibold">Your Location *</Label>
                      <Input
                        id="location"
                        placeholder="e.g., Mumbai, Maharashtra"
                        value={formData.location}
                        onChange={(e) => handleChange("location", e.target.value)}
                        className={errors.location ? "border-destructive" : ""}
                      />
                      {errors.location && <p className="text-sm text-destructive">{errors.location}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="whatsappContact" className="text-base font-semibold">WhatsApp Number *</Label>
                      <Input
                        id="whatsappContact"
                        placeholder="9876543210"
                        value={formData.whatsappContact}
                        onChange={(e) => handleChange("whatsappContact", e.target.value)}
                        className={errors.whatsappContact ? "border-destructive" : ""}
                      />
                      <p className="text-xs text-muted-foreground">This will be shared with interested buyers for communication</p>
                      {errors.whatsappContact && <p className="text-sm text-destructive">{errors.whatsappContact}</p>}
                    </div>

                    <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-start gap-3">
                        <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Safety Tips</h4>
                          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                            <li>• Only share account credentials after payment confirmation</li>
                            <li>• Use our escrow system for secure transactions</li>
                            <li>• Report any suspicious activity to our support team</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <Checkbox 
                        id="terms" 
                        checked={formData.terms}
                        onCheckedChange={(checked) => handleChange("terms", checked === true)}
                      />
                      <div className="space-y-1">
                        <Label 
                          htmlFor="terms" 
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          I agree to the Terms & Conditions and Privacy Policy *
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          By listing your service, you agree to our marketplace guidelines and terms of use.
                        </p>
                      </div>
                    </div>
                    {errors.terms && <p className="text-sm text-destructive">{errors.terms}</p>}
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-6">
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    disabled={currentStep === 1}
                  >
                    Previous
                  </Button>
                  
                  {currentStep < 3 ? (
                    <Button type="button" onClick={nextStep}>
                      Next Step
                    </Button>
                  ) : (
                    <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
                      {isSubmitting ? "Publishing..." : "Publish Service"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </form>
        </div>
      </section>
    </div>
  );
};

export default ListService;