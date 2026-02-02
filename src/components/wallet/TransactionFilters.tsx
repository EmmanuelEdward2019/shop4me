import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, X } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

export type TransactionType = "all" | "credit" | "debit";

export interface TransactionFilters {
  type: TransactionType;
  dateRange: DateRange | undefined;
}

interface TransactionFiltersProps {
  filters: TransactionFilters;
  onFiltersChange: (filters: TransactionFilters) => void;
}

const PRESET_RANGES = [
  { label: "Today", getValue: () => ({ from: new Date(), to: new Date() }) },
  { label: "Last 7 days", getValue: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
  { label: "Last 30 days", getValue: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
  { label: "This month", getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: "Last month", getValue: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
];

const TransactionFiltersComponent = ({ filters, onFiltersChange }: TransactionFiltersProps) => {
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handleTypeChange = (type: TransactionType) => {
    onFiltersChange({ ...filters, type });
  };

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    onFiltersChange({ ...filters, dateRange: range });
  };

  const handlePresetClick = (preset: typeof PRESET_RANGES[0]) => {
    onFiltersChange({ ...filters, dateRange: preset.getValue() });
    setCalendarOpen(false);
  };

  const clearDateRange = () => {
    onFiltersChange({ ...filters, dateRange: undefined });
  };

  const clearAllFilters = () => {
    onFiltersChange({ type: "all", dateRange: undefined });
  };

  const hasActiveFilters = filters.type !== "all" || filters.dateRange !== undefined;

  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
      {/* Transaction Type Filter */}
      <Select value={filters.type} onValueChange={(v) => handleTypeChange(v as TransactionType)}>
        <SelectTrigger className="w-full sm:w-[140px]">
          <SelectValue placeholder="All types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          <SelectItem value="credit">Credits only</SelectItem>
          <SelectItem value="debit">Debits only</SelectItem>
        </SelectContent>
      </Select>

      {/* Date Range Filter */}
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full sm:w-auto justify-start text-left font-normal",
              !filters.dateRange && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {filters.dateRange?.from ? (
              filters.dateRange.to ? (
                <>
                  {format(filters.dateRange.from, "MMM d")} - {format(filters.dateRange.to, "MMM d, yyyy")}
                </>
              ) : (
                format(filters.dateRange.from, "MMM d, yyyy")
              )
            ) : (
              "Select dates"
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            {/* Preset ranges */}
            <div className="border-r border-border p-2 space-y-1">
              {PRESET_RANGES.map((preset) => (
                <Button
                  key={preset.label}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-sm"
                  onClick={() => handlePresetClick(preset)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            
            {/* Calendar */}
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={filters.dateRange?.from}
              selected={filters.dateRange}
              onSelect={handleDateRangeSelect}
              numberOfMonths={1}
              disabled={{ after: new Date() }}
            />
          </div>
        </PopoverContent>
      </Popover>

      {/* Clear date range button */}
      {filters.dateRange && (
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={clearDateRange}
        >
          <X className="h-4 w-4" />
        </Button>
      )}

      {/* Clear all filters */}
      {hasActiveFilters && (
        <Button
          variant="link"
          size="sm"
          className="text-muted-foreground"
          onClick={clearAllFilters}
        >
          Clear filters
        </Button>
      )}
    </div>
  );
};

export default TransactionFiltersComponent;
