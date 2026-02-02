import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";
import { format, startOfMonth, subMonths, isWithinInterval, endOfMonth } from "date-fns";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  reference: string | null;
  created_at: string;
}

interface MonthlySpendingSummaryProps {
  transactions: Transaction[];
}

interface MonthlyData {
  month: string;
  monthShort: string;
  credits: number;
  debits: number;
}

const MonthlySpendingSummary = ({ transactions }: MonthlySpendingSummaryProps) => {
  const { chartData, currentMonthStats, trend } = useMemo(() => {
    // Get last 6 months of data
    const months: MonthlyData[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = endOfMonth(subMonths(now, i));
      
      const monthTransactions = transactions.filter((tx) =>
        isWithinInterval(new Date(tx.created_at), { start: monthStart, end: monthEnd })
      );

      const credits = monthTransactions
        .filter((tx) => tx.type === "credit")
        .reduce((sum, tx) => sum + tx.amount, 0);
      
      const debits = monthTransactions
        .filter((tx) => tx.type === "debit")
        .reduce((sum, tx) => sum + tx.amount, 0);

      months.push({
        month: format(monthStart, "MMMM yyyy"),
        monthShort: format(monthStart, "MMM"),
        credits,
        debits,
      });
    }

    // Calculate current month stats
    const currentMonth = months[months.length - 1];
    const previousMonth = months[months.length - 2];

    let trendDirection: "up" | "down" | "neutral" = "neutral";
    let trendPercentage = 0;

    if (previousMonth && previousMonth.credits > 0) {
      const change = ((currentMonth.credits - previousMonth.credits) / previousMonth.credits) * 100;
      trendPercentage = Math.abs(Math.round(change));
      trendDirection = change > 5 ? "up" : change < -5 ? "down" : "neutral";
    }

    return {
      chartData: months,
      currentMonthStats: currentMonth,
      trend: { direction: trendDirection, percentage: trendPercentage },
    };
  }, [transactions]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount);
  };

  const formatTooltipValue = (value: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground mb-2">{payload[0]?.payload?.month}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatTooltipValue(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (transactions.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="font-display">Monthly Summary</CardTitle>
            <CardDescription>Credits vs debits over the last 6 months</CardDescription>
          </div>
          
          {/* Current Month Stats */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">This Month</p>
              <p className="text-lg font-semibold text-primary">
                {formatCurrency(currentMonthStats.credits)}
              </p>
            </div>
            {trend.direction !== "neutral" && (
              <div
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                  trend.direction === "up"
                    ? "bg-primary/10 text-primary"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {trend.direction === "up" ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {trend.percentage}%
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barCategoryGap="20%">
              <XAxis
                dataKey="monthShort"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => formatCurrency(value)}
                width={70}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: 16 }}
                formatter={(value) => (
                  <span className="text-sm text-foreground capitalize">{value}</span>
                )}
              />
              <Bar
                dataKey="credits"
                name="Credits"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="debits"
                name="Debits"
                fill="hsl(var(--destructive))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Breakdown */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="p-3 bg-primary/5 rounded-lg">
            <p className="text-xs text-muted-foreground">Total Credits (6mo)</p>
            <p className="text-lg font-semibold text-primary">
              {formatCurrency(chartData.reduce((sum, m) => sum + m.credits, 0))}
            </p>
          </div>
          <div className="p-3 bg-destructive/5 rounded-lg">
            <p className="text-xs text-muted-foreground">Total Debits (6mo)</p>
            <p className="text-lg font-semibold text-destructive">
              {formatCurrency(chartData.reduce((sum, m) => sum + m.debits, 0))}
            </p>
          </div>
          <div className="p-3 bg-muted rounded-lg col-span-2 sm:col-span-1">
            <p className="text-xs text-muted-foreground">Net Flow (6mo)</p>
            <p className="text-lg font-semibold text-foreground">
              {formatCurrency(
                chartData.reduce((sum, m) => sum + m.credits - m.debits, 0)
              )}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MonthlySpendingSummary;
