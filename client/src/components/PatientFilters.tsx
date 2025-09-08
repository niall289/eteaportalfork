import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Search, Filter, Download } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface FilterValues {
  search?: string;
  condition?: string;
  dateRange?: string;
  startDate?: Date;
  endDate?: Date;
}

interface PatientFiltersProps {
  onFilterChange: (filters: FilterValues) => void;
  onExportData: () => void;
}

export default function PatientFilters({
  onFilterChange,
  onExportData,
}: PatientFiltersProps) {
  const [search, setSearch] = useState("");
  const [condition, setCondition] = useState("");
  const [dateRange, setDateRange] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Apply filters
  const applyFilters = () => {
    onFilterChange({
      search: search || undefined,
      condition: condition || undefined,
      dateRange: dateRange || undefined,
      startDate,
      endDate,
    });
  };

  // Handle date range selection
  useEffect(() => {
    if (dateRange === "custom") {
      setDatePickerOpen(true);
    } else if (dateRange) {
      setDatePickerOpen(false);

      // Set start and end dates based on selection
      const today = new Date();
      let start = new Date();
      let end = new Date();

      switch (dateRange) {
        case "today":
          // Start and end are already today
          break;
        case "this-week":
          // Start is beginning of week (Sunday)
          start.setDate(today.getDate() - today.getDay());
          break;
        case "this-month":
          // Start is first day of month
          start.setDate(1);
          break;
        case "last-month":
          // Start is first day of last month
          start.setMonth(today.getMonth() - 1);
          start.setDate(1);
          // End is last day of last month
          end.setDate(0);
          break;
        default:
          // Reset dates if no valid range
          start = undefined as unknown as Date;
          end = undefined as unknown as Date;
      }

      if (start && end) {
        // Reset time to start/end of day
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        setStartDate(start);
        setEndDate(end);
      }
    }
  }, [dateRange]);

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-y-0 md:space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input
                placeholder="Search patients by name, email, or phone"
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
            <Select value={condition || "all"} onValueChange={setCondition}>
              <SelectTrigger>
              <SelectValue placeholder="Filter by condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Conditions</SelectItem>
                <SelectItem value="diabetic-neuropathy">Diabetic Neuropathy</SelectItem>
                <SelectItem value="plantar-fasciitis">Plantar Fasciitis</SelectItem>
                <SelectItem value="bunions">Bunions</SelectItem>
                <SelectItem value="ingrown-toenails">Ingrown Toenails</SelectItem>
                <SelectItem value="other">Other Conditions</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex space-x-2">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                <SelectValue placeholder="Select date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="this-week">This Week</SelectItem>
                <SelectItem value="this-month">This Month</SelectItem>
                <SelectItem value="last-month">Last Month</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

              {dateRange === "custom" && (
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full sm:w-[240px] justify-start text-left font-normal",
                        !startDate && !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate && endDate ? (
                        <>
                          {format(startDate, "PPP")} - {format(endDate, "PPP")}
                        </>
                      ) : (
                        <span>Select date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <div className="flex flex-col sm:flex-row">
                      <div className="space-y-2 p-3">
                        <h4 className="text-sm font-semibold">Start Date</h4>
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          initialFocus
                        />
                      </div>
                      <div className="space-y-2 border-t sm:border-t-0 sm:border-l p-3">
                        <h4 className="text-sm font-semibold">End Date</h4>
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          initialFocus
                        />
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>

            <Button onClick={applyFilters}>
              <Filter className="h-4 w-4 mr-2" />
              Apply Filters
            </Button>

            <Button variant="outline" onClick={onExportData}>
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}