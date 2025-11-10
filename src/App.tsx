import React, { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import { ChatProvider } from "@/contexts/ChatContext";
import { TradeProvider } from "@/contexts/TradeContext";
import { TradeSessionProvider } from "@/contexts/TradeSessionContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import SignUp from "./pages/SignUp";
import About from "./pages/About";
import Features from "./pages/Features";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import Browse from "./pages/Browse";
import Categories from "./pages/Categories";
import ListService from "./pages/ListService";
import Dashboard from "./pages/Dashboard";
import TradeCenter from "./pages/TradeCenter";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ProfileSettings from "./pages/settings/ProfileSettings";
import ChangePassword from "./pages/settings/ChangePassword";
import NotificationSettings from "./pages/settings/NotificationSettings";
import PaymentMethods from "./pages/settings/PaymentMethods";
import TwoFactor from "./pages/settings/TwoFactor";

const queryClient = new QueryClient();

/**
 * GlobalErrorHandler attaches window-level listeners to gracefully handle
 * external script errors (e.g., content.js video element issues) without
 * disrupting the app. It logs and suppresses non-critical errors.
 */
const GlobalErrorHandler: React.FC = () => {
  useEffect(() => {
    const handler = (event: ErrorEvent) => {
      const msg = event?.message || "";
      const src = (event?.filename || "").toLowerCase();
      if (msg.includes("Video element not found") || src.includes("content.js")) {
        console.warn("[GlobalErrorHandler] Suppressed external video error:", msg);
        event.preventDefault();
        return false;
      }
      if (msg.includes("Could not establish connection")) {
        console.warn("[GlobalErrorHandler] Connection issue detected:", msg);
        // Let ChatProvider surface a gentle banner; do not hard-crash.
      }
      return true;
    };
    window.addEventListener("error", handler);
    return () => window.removeEventListener("error", handler);
  }, []);
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="ui-theme">
      <TooltipProvider>
        <GlobalErrorHandler />
        <AuthProvider>
          <ChatProvider>
            <TradeProvider>
              <TradeSessionProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <div className="min-h-screen w-full">
                  <main className="flex-1">
                    <Routes>
                      {/* Public Routes */}
                      <Route path="/" element={<Index />} />
                      <Route path="/login" element={<Login />} />
                      <Route path="/signup" element={<SignUp />} />
                      <Route path="/about" element={<About />} />
                      <Route path="/features" element={<Features />} />
                      <Route path="/contact" element={<Contact />} />
                      <Route path="/forgot-password" element={<ForgotPassword />} />
                      
                      {/* Settings */}
                      <Route path="/settings/profile" element={<ProtectedRoute><ProfileSettings /></ProtectedRoute>} />
                      <Route path="/settings/password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />
                      <Route path="/settings/notifications" element={<ProtectedRoute><NotificationSettings /></ProtectedRoute>} />
                      <Route path="/settings/payments" element={<ProtectedRoute><PaymentMethods /></ProtectedRoute>} />
                      <Route path="/settings/2fa" element={<ProtectedRoute><TwoFactor /></ProtectedRoute>} />
                      
                      {/* Protected Routes */}
                      <Route path="/browse" element={<ProtectedRoute><Browse /></ProtectedRoute>} />
                      <Route path="/categories" element={<ProtectedRoute><Categories /></ProtectedRoute>} />
                      <Route path="/list-service" element={<ProtectedRoute><ListService /></ProtectedRoute>} />
                      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                      <Route path="/trades" element={<ProtectedRoute><TradeCenter /></ProtectedRoute>} />
                      
                      {/* Catch-all route */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </main>
                </div>
              </BrowserRouter>
              </TradeSessionProvider>
            </TradeProvider>
          </ChatProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
