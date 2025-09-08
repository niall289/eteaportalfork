import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface StatsCardProps {
  title: string;
  value?: number;
  icon: string;
  iconColor: string;
  iconBgColor: string;
  linkText?: string;
  linkHref?: string;
  isLoading?: boolean;
}

export default function StatsCard({
  title,
  value,
  icon,
  iconColor,
  iconBgColor,
  linkText,
  linkHref,
  isLoading = false,
}: StatsCardProps) {
  return (
    <Card className="overflow-hidden border-l-4 border-l-[hsl(186,100%,30%)] hover:shadow-md transition-all duration-200 bg-gradient-to-r from-white to-[hsl(186,76%,99%)] dark:from-neutral-800 dark:to-neutral-800/80">
      <CardContent className="p-0">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className={cn("flex-shrink-0 rounded-lg p-3 shadow-sm", iconBgColor)}>
                <i className={cn(icon, "text-xl", iconColor)} />
              </div>
              <div className="ml-4">
                <div className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  {title}
                </div>
                <div>
                  {isLoading ? (
                    <Skeleton className="h-8 w-20 mt-2" />
                  ) : (
                    <div className="text-2xl font-bold text-neutral-900 dark:text-white mt-1">
                      {value?.toLocaleString() || 0}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="text-2xl opacity-10">
              <i className={icon} />
            </div>
          </div>
        </div>
        {linkText && linkHref && (
          <div className="bg-gradient-to-r from-[hsl(186,76%,97%)] to-[hsl(186,76%,95%)] dark:from-neutral-700/30 dark:to-neutral-700/50 px-6 py-3 border-t border-neutral-100 dark:border-neutral-700">
            <div className="text-sm">
              <a
                href={linkHref}
                className="font-medium text-[hsl(186,100%,30%)] hover:text-[hsl(186,100%,25%)] dark:text-[hsl(186,76%,70%)] dark:hover:text-[hsl(186,76%,85%)] flex items-center group"
              >
                {linkText}
                <i className="ri-arrow-right-line ml-2 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
