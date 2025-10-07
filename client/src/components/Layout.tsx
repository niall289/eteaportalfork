// client/src/components/Layout.tsx

import { ReactNode } from "react";
import AppSidebar from "@/components/ui/sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2 } from "lucide-react";
import { useClinicContext, ClinicProvider } from "@/App";

interface LayoutProps {
  children: ReactNode;
}

const CLINIC_GROUPS = [
  "FootCare Clinic",
  "The Nail Surgery Clinic",
  "The Laser Care Clinic",
];

function InnerLayout({ children }: LayoutProps) {
  const { selectedClinicGroup, setSelectedClinicGroup } = useClinicContext();

  return (
    <div className="flex min-h-screen overflow-hidden">
      <AppSidebar className="w-56 flex-shrink-0" />
      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b bg-white dark:bg-gray-900 px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-500">
                Active Clinic Group:
              </span>
            </div>
            <Select
              value={selectedClinicGroup}
              onValueChange={setSelectedClinicGroup}
            >
              <SelectTrigger className="w-64" data-testid="header-clinic-selector">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CLINIC_GROUPS.map((group) => (
                  <SelectItem key={group} value={group}>
                    {group}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <main className="flex-1 p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

function Layout({ children }: LayoutProps) {
  return <InnerLayout>{children}</InnerLayout>;
}

export default Layout;
