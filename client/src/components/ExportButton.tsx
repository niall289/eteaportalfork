import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, ChevronDown } from "lucide-react";

interface ExportButtonProps {
  onExport: (format: string) => void;
}

export default function ExportButton({ onExport }: ExportButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleExport = (format: string) => {
    setIsLoading(true);
    
    try {
      onExport(format);
    } finally {
      // In a real app, this might be in a callback or promise resolution
      setTimeout(() => {
        setIsLoading(false);
      }, 1000);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button disabled={isLoading}>
          <Download className="mr-2 h-4 w-4" />
          {isLoading ? "Exporting..." : "Export"}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport("json")}>
          Export as JSON
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("csv")}>
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("pdf")}>
          Export as PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("excel")}>
          Export as Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
