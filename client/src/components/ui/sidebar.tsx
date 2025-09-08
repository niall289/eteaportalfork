import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";
import { MoonIcon, SunIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import eteaLogo from "@/assets/etea-logo.png";
import etaineAvatar from "@/assets/elaine-avatar.png";

interface SidebarProps {
  className?: string;
  user?: any;
  onClose?: () => void;
}

function Sidebar({ className, user, onClose }: SidebarProps) {
  const [location] = useLocation();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  const handleLogout = () => {
    fetch("/api/logout", { method: "POST" })
      .then(() => {
        queryClient.clear();
        localStorage.removeItem("theme");
        window.location.href = "/login";
      })
      .catch(() =>
        toast({
          title: "Logout failed",
          description: "An error occurred during logout. Please try again.",
          variant: "destructive",
        })
      );
  };

  const navigation = [
    { name: "Dashboard", href: "/dashboard", emoji: "🩺" },
    { name: "Assessments", href: "/assessments", emoji: "👥" },
    { name: "Communication Hub", href: "/communications", emoji: "📧" },
    { name: "Chatbot Settings", href: "/settings", emoji: "🔍" },
  ];

  return (
    <aside className={cn("w-56 bg-white dark:bg-neutral-900 shadow-xl border-r border-neutral-200 dark:border-neutral-700", className)}>
      <div className="flex flex-col h-full overflow-y-auto">
        <div className="flex items-center justify-center h-24 px-4 border-b-2 border-[hsl(186,100%,30%)] bg-gradient-to-r from-[hsl(186,76%,97%)] to-white dark:from-neutral-800 dark:to-neutral-700">
          <div className="flex items-center">
            <div className="relative mr-3">
              <div className="w-16 h-16 rounded-xl bg-white dark:bg-neutral-700 border-2 border-[hsl(186,100%,30%)] flex items-center justify-center shadow-lg overflow-hidden">
                <img src={etaineAvatar} alt="Etaine - ETEA Assistant" className="w-full h-full object-cover" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gradient-to-br from-[hsl(186,100%,30%)] to-[hsl(186,100%,25%)] rounded-full flex items-center justify-center shadow-md">
                <span className="text-white text-xs">💡</span>
              </div>
            </div>
            <div className="flex flex-col items-start">
              <img src={eteaLogo} alt="ETEA Healthcare Logo" className="h-10 w-auto mb-1" />
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                <p className="text-xs text-[hsl(186,76%,40%)] dark:text-[hsl(186,76%,75%)] font-medium">AI Assistant Active</p>
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-6 px-3">
          <div className="space-y-2">
            {navigation.map((item) => {
              const isActive = location === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group border",
                    isActive
                      ? "bg-gradient-to-r from-[hsl(186,100%,30%)] to-[hsl(186,100%,25%)] text-white shadow-lg border-[hsl(186,100%,25%)]"
                      : "text-neutral-700 dark:text-neutral-300 hover:bg-white dark:hover:bg-neutral-700 hover:shadow-md border-transparent hover:border-[hsl(186,100%,30%)]"
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-lg mr-3 transition-all duration-200",
                      isActive
                        ? "bg-white/20"
                        : "bg-[hsl(186,76%,95%)] dark:bg-neutral-600 group-hover:bg-[hsl(186,100%,30%)] group-hover:text-white"
                    )}
                  >
                    <span className={cn("text-lg", isActive ? "text-white" : "group-hover:text-white")}>
                      {item.emoji}
                    </span>
                  </div>
                  <span className="font-medium">{item.name}</span>
                  {isActive && (
                    <div className="ml-auto">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="border-t-2 border-[hsl(186,100%,30%)] bg-gradient-to-r from-[hsl(186,76%,97%)] to-white dark:from-neutral-800 dark:to-neutral-700 p-4">
          <div className="flex flex-col space-y-4">
            <Button
              variant="outline"
              size="sm"
              className="justify-start text-[hsl(186,100%,30%)] border-[hsl(186,100%,30%)] hover:bg-[hsl(186,100%,30%)] hover:text-white transition-all duration-200"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              {theme === "light" ? (
                <>
                  <MoonIcon className="h-4 w-4 mr-2" />
                  <span>Dark Mode</span>
                </>
              ) : (
                <>
                  <SunIcon className="h-4 w-4 mr-2" />
                  <span>Light Mode</span>
                </>
              )}
            </Button>

            <div className="flex items-center bg-white dark:bg-neutral-600 rounded-lg p-3 shadow-sm border border-[hsl(186,76%,90%)] dark:border-neutral-500">
              <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-gradient-to-br from-[hsl(186,100%,30%)] to-[hsl(186,100%,25%)] flex items-center justify-center shadow-sm overflow-hidden">
                {user && user.profileImageUrl ? (
                  <img src={user.profileImageUrl} alt="User profile" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-white text-lg">👩‍⚕️</span>
                )}
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-semibold text-neutral-800 dark:text-white">
                  {user?.firstName && user?.lastName
                    ? `Dr. ${user.firstName} ${user.lastName}`
                    : "Medical Professional"}
                </p>
                <button
                  onClick={handleLogout}
                  className="text-xs text-[hsl(186,100%,30%)] hover:text-[hsl(186,100%,25%)] dark:hover:text-[hsl(186,76%,85%)] font-medium flex items-center group"
                >
                  <span>Sign out</span>
                  <i className="ri-logout-box-line ml-1 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
export { Sidebar as AppSidebar };
