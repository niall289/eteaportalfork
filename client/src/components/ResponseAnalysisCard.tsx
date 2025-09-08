import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ResponseAnalysisCardProps {
  title: string;
  icon: string;
  value?: number;
  description?: string;
  isLoading?: boolean;
  color?: "blue" | "green" | "red" | "yellow" | "default";
}

export default function ResponseAnalysisCard({
  title,
  icon,
  value = 0,
  description,
  isLoading = false,
  color = "default",
}: ResponseAnalysisCardProps) {
  // Define color classes based on the color prop
  const getIconClasses = () => {
    switch (color) {
      case "blue":
        return "text-blue-500 bg-blue-50 dark:bg-blue-900/20";
      case "green":
        return "text-green-500 bg-green-50 dark:bg-green-900/20";
      case "red":
        return "text-red-500 bg-red-50 dark:bg-red-900/20";
      case "yellow":
        return "text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20";
      default:
        return "text-primary-500 bg-primary-50 dark:bg-primary-900/20";
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center">
          <div className={cn("flex-shrink-0 rounded-md p-3", getIconClasses())}>
            <i className={cn(icon, "text-xl")} />
          </div>
          <div className="ml-5 w-0 flex-1">
            <div className="text-sm font-medium text-neutral-500 dark:text-neutral-400 truncate">
              {title}
            </div>
            <div>
              {isLoading ? (
                <Skeleton className="h-7 w-16 mt-1" />
              ) : (
                <div className="text-lg font-medium text-neutral-900 dark:text-white">
                  {value.toLocaleString()}
                </div>
              )}
              {description && (
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  {description}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
