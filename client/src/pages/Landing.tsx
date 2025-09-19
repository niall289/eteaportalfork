import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import logoImage from "../assets/etea-logo.png";

export default function Landing() {
  const { toast } = useToast();
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [, navigate] = useLocation();
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      toast({
        title: "Access token required",
        description: "Please enter the access token to continue.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // POST token to API login
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
        credentials: "include",
      });
      
      const data = await response.json().catch(() => ({} as any));
      
      if (!response.ok) {
        toast({
          title: "Login failed",
          description: data?.error || data?.message || "Invalid token",
          variant: "destructive",
        });
      } else {
        // Invalidate the auth query to fetch the new user data
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        toast({
          title: "Login successful",
          description: "Welcome to the ETEA Healthcare dashboard.",
        });
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description: "An error occurred during login. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <>
      <Helmet>
        <title>Welcome | ETEA Healthcare</title>
        <meta name="description" content="Welcome to the ETEA Healthcare patient portal. Log in to view your patient data and chatbot interactions." />
      </Helmet>
      
      <div className="min-h-screen w-full flex flex-col items-center bg-neutral-50 dark:bg-neutral-900">
        {/* Navbar */}
        <header className="w-full bg-white dark:bg-neutral-800 shadow-sm py-3">
          <div className="container mx-auto px-4 flex items-center justify-center">
            <div className="flex items-center">
              <img 
                src={logoImage} 
                alt="ETEA Healthcare Logo"
                className="h-10 w-auto"
              />
            </div>
          </div>
        </header>
        
        {/* Hero section */}
        <section className="flex-1 flex flex-col items-center justify-center w-full px-4 py-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-white mb-3">
              ETEA Healthcare Chatbots Admin Portal
            </h2>
            <p className="text-lg text-neutral-600 dark:text-neutral-300 mb-6">
              Access patient chatbot results, analyze data, and improve patient care with our dedicated dashboard.
            </p>
            
            <Card className="max-w-md mx-auto shadow-xl border-0 bg-white/80 dark:bg-neutral-800/80 backdrop-blur-sm">
              <CardContent className="pt-6 pb-6 px-6">
                <div className="text-center mb-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-[hsl(186,100%,30%)] to-[hsl(186,100%,25%)] rounded-full mb-3 shadow-lg">
                    <span className="text-white text-lg">🔐</span>
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-800 dark:text-white">Admin Access</h3>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">Enter your credentials to continue</p>
                </div>
                
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Input
                      type="password"
                      placeholder="Enter access token"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      className="text-center h-10 border-2 border-neutral-200 dark:border-neutral-600 focus:border-[hsl(186,100%,30%)] dark:focus:border-[hsl(186,100%,40%)] rounded-lg"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    size="lg" 
                    className="w-full h-10 font-medium bg-gradient-to-r from-[hsl(186,100%,30%)] to-[hsl(186,100%,25%)] hover:from-[hsl(186,100%,25%)] hover:to-[hsl(186,100%,20%)] border-0 shadow-lg" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Signing In...
                      </div>
                    ) : (
                      "Sign In to Dashboard"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </section>
        
        {/* Features section */}
        <section className="w-full py-4 bg-gradient-to-r from-[hsl(186,76%,97%)] to-[hsl(186,76%,95%)] dark:from-[hsl(186,30%,18%)] dark:to-[hsl(186,30%,15%)]">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap justify-center items-center gap-4 max-w-2xl mx-auto">
              <div className="flex items-center space-x-2 bg-white dark:bg-neutral-800 px-3 py-1 rounded-full shadow-sm">
                <div className="w-4 h-4 bg-[hsl(186,100%,30%)] rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">📊</span>
                </div>
                <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Dashboard</span>
              </div>
              <div className="flex items-center space-x-2 bg-white dark:bg-neutral-800 px-3 py-1 rounded-full shadow-sm">
                <div className="w-4 h-4 bg-[hsl(186,100%,30%)] rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">📈</span>
                </div>
                <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Analytics</span>
              </div>
              <div className="flex items-center space-x-2 bg-white dark:bg-neutral-800 px-3 py-1 rounded-full shadow-sm">
                <div className="w-4 h-4 bg-[hsl(186,100%,30%)] rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">👤</span>
                </div>
                <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Patient Data</span>
              </div>
            </div>
          </div>
        </section>
        
        {/* Footer */}
        <footer className="w-full bg-neutral-100 dark:bg-neutral-800/50 py-3">
          <div className="container mx-auto px-4 text-center">
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              © {new Date().getFullYear()} ETEA Healthcare. Built by EngageIOBots.com
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
