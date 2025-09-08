import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

interface FilterDateRangeProps {
  onChange: (range: { startDate?: Date; endDate?: Date }) => void;
}

export default function FilterDateRange({ onChange }: FilterDateRangeProps) {
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [open, setOpen] = useState(false);

  const handleStartDateChange = (date: Date | undefined) => {
    setStartDate(date);
    
    // If end date is set and is before the new start date, reset it
    if (date && endDate && endDate < date) {
      setEndDate(undefined);
    }
  };

  const handleEndDateChange = (date: Date | undefined) => {
    setEndDate(date);
  };

  const handleApply = () => {
    onChange({ startDate, endDate });
    setOpen(false);
  };

  const handleClear = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    onChange({ startDate: undefined, endDate: undefined });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal",
            !startDate && !endDate && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {startDate && endDate ? (
            <>
              {format(startDate, "MMM d, yyyy")} - {format(endDate, "MMM d, yyyy")}
            </>
          ) : (
            <span>Select date range</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex flex-col sm:flex-row">
          <div className="border-b sm:border-b-0 sm:border-r p-3">
            <div className="font-medium text-sm mb-2">Start Date</div>
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={handleStartDateChange}
              disabled={(date) => endDate ? date > endDate : false}
              initialFocus
            />
          </div>
          <div className="p-3">
            <div className="font-medium text-sm mb-2">End Date</div>
            <Calendar
              mode="single"
              selected={endDate}
              onSelect={handleEndDateChange}
              disabled={(date) => startDate ? date < startDate : false}
              initialFocus
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t p-3">
          <Button size="sm" variant="outline" onClick={handleClear}>
            Clear
          </Button>
          <Button size="sm" onClick={handleApply}>
            Apply Range
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
