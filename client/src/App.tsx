import { Route, Router, Switch } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { WebSocketProvider } from "@/components/ui/websocket";
import Layout from "@/components/Layout";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Assessments from "@/pages/Assessments";
import Communications from "@/pages/Communications";
import ChatbotSettings from "@/pages/ChatbotSettings";
import NotFound from "@/pages/not-found";
import { useAuth } from "@/hooks/useAuth";
import { createContext, useContext, useState } from "react";

// ✅ Shared clinic context
interface ClinicContextType {
  selectedClinicGroup: string;
  setSelectedClinicGroup: (group: string) => void;
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

export const useClinicContext = () => {
  const context = useContext(ClinicContext);
  if (!context) {
    throw new Error("useClinicContext must be used within a ClinicProvider");
  }
  return context;
};

export function ClinicProvider({ children }: { children: React.ReactNode }) {
  const [selectedClinicGroup, setSelectedClinicGroup] = useState("FootCare Clinic");
  return (
    <ClinicContext.Provider value={{ selectedClinicGroup, setSelectedClinicGroup }}>
      {children}
    </ClinicContext.Provider>
  );
}

// ✅ Simple auth wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Landing />;
  }

  return <>{children}</>;
}

// ✅ Root component
function App() {
  return (
    <WebSocketProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <ClinicProvider>
              <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                <Router>
                  <Switch>
                    <Route path="/" component={Landing} />
                    <Route path="/login" component={Login} />
                    <Route path="/dashboard">
                      <ProtectedRoute>
                        <Layout>
                          <Dashboard />
                        </Layout>
                      </ProtectedRoute>
                    </Route>
                    <Route path="/assessments">
                      <ProtectedRoute>
                        <Layout>
                          <Assessments />
                        </Layout>
                      </ProtectedRoute>
                    </Route>
                    <Route path="/communications">
                      <ProtectedRoute>
                        <Layout>
                          <Communications />
                        </Layout>
                      </ProtectedRoute>
                    </Route>
                    <Route path="/settings">
                      <ProtectedRoute>
                        <Layout>
                          <ChatbotSettings />
                        </Layout>
                      </ProtectedRoute>
                    </Route>
                    <Route component={NotFound} />
                  </Switch>
                </Router>
              </div>
              <Toaster />
            </ClinicProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </WebSocketProvider>
  );
}

export default App;
