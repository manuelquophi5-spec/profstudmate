"use client";
import React, { useState } from "react";
import {
  ComposedChart,
  Bar,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/hooks/useTranslation";
import { getDirection } from "@/utils/helpers";

interface CustomTooltipProps extends TooltipProps<number, string> {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
}

export interface AcademicMetricPoint {
  name: string;
  completionRate: number; // Percentage (0 - 100)
  mockPassRate: number; // Percentage (0 - 100)
  submissions: number; // Count of submitted assignments
}

export interface AcademicChartData {
  yearly: AcademicMetricPoint[];
  monthly: AcademicMetricPoint[];
  weekly: AcademicMetricPoint[];
}

// Deterministic default academic metrics for ICAG/ICAT curriculum tracking
const defaultAcademicChartData: AcademicChartData = {
  yearly: [
    { name: "2023", completionRate: 72, mockPassRate: 78, submissions: 180 },
    { name: "2024", completionRate: 75, mockPassRate: 81, submissions: 240 },
    { name: "2025", completionRate: 77, mockPassRate: 83, submissions: 310 },
    { name: "2026", completionRate: 79, mockPassRate: 85, submissions: 380 },
  ],
  monthly: [
    { name: "Jan", completionRate: 65, mockPassRate: 76, submissions: 25 },
    { name: "Feb", completionRate: 68, mockPassRate: 78, submissions: 30 },
    { name: "Mar", completionRate: 71, mockPassRate: 80, submissions: 34 },
    { name: "Apr", completionRate: 74, mockPassRate: 82, submissions: 38 },
    { name: "May", completionRate: 76, mockPassRate: 83, submissions: 42 },
    { name: "Jun", completionRate: 78, mockPassRate: 84, submissions: 40 },
    { name: "Jul", completionRate: 80, mockPassRate: 85, submissions: 45 },
    { name: "Aug", completionRate: 81, mockPassRate: 86, submissions: 48 },
    { name: "Sep", completionRate: 83, mockPassRate: 87, submissions: 52 },
    { name: "Oct", completionRate: 85, mockPassRate: 88, submissions: 55 },
    { name: "Nov", completionRate: 86, mockPassRate: 89, submissions: 50 },
    { name: "Dec", completionRate: 88, mockPassRate: 91, submissions: 48 },
  ],
  weekly: [
    { name: "Week 1", completionRate: 75, mockPassRate: 82, submissions: 10 },
    { name: "Week 2", completionRate: 77, mockPassRate: 83, submissions: 14 },
    { name: "Week 3", completionRate: 79, mockPassRate: 84, submissions: 12 },
    { name: "Week 4", completionRate: 82, mockPassRate: 86, submissions: 16 },
  ],
};

interface AcademicPerformanceChartProps {
  data?: AcademicChartData;
}

const AcademicPerformanceChart: React.FC<AcademicPerformanceChartProps> = ({
  data = defaultAcademicChartData,
}) => {
  const { t } = useTranslation();
  const direction = getDirection();
  const isRTL = direction === "rtl";
  const [period, setPeriod] = useState<"yearly" | "monthly" | "weekly">("monthly");

  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div
          className="bg-white border-none shadow-lg rounded-lg overflow-hidden min-w-[170px]"
          dir={isRTL ? "rtl" : "ltr"}
        >
          <div className="bg-slate-100 px-3 py-1.5 border-b border-gray-100">
            <p className="text-gray-900 font-semibold text-sm">{label}</p>
          </div>
          <div className="p-3 space-y-2">
            {payload.map((entry, index) => (
              <div key={`item-${index}`} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  ></span>
                  <span className="text-xs text-gray-600 font-medium">
                    {entry.name}:
                  </span>
                </div>
                <span className="text-sm font-bold text-gray-900">
                  {entry.name === "Submissions"
                    ? entry.value
                    : `${entry.value}%`}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const chartSeries = period === "yearly" ? data.yearly : period === "monthly" ? data.monthly : data.weekly;

  return (
    <Card className="bg-white rounded-xl shadow-sm">
      <CardHeader className="pb-0">
        <CardTitle className="text-base font-medium flex items-center justify-between border-b borderColor pb-4">
          <div>
            <span className="font-semibold text-gray-900">
              {t("academic_performance_trends") || "Academic Progress & Exam Readiness"}
            </span>
            <p className="text-xs text-gray-500 font-normal mt-0.5">
              Syllabus completion rate, ICAG mock exam pass rate &amp; submission frequency
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Select value={period} onValueChange={(val) => setPeriod(val as any)}>
              <SelectTrigger className="w-[110px] md:w-[160px] text-sm bg-[#F8F8F9]">
                <SelectValue placeholder={t("period")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">{t("weekly")}</SelectItem>
                <SelectItem value="monthly">{t("monthly")}</SelectItem>
                <SelectItem value="yearly">{t("yearly")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardTitle>
        <CardDescription>
          <div
            className={`flex items-center gap-4 ${
              isRTL ? "justify-start" : "justify-end"
            } py-4 px-4 overflow-x-auto`}
            dir={isRTL ? "rtl" : "ltr"}
          >
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="h-2.5 w-2.5 rounded-full bg-[#83B807]"></span>
              <span className="text-xs font-medium text-gray-600">
                {t("completion_rate") || "Completion Rate (%)"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="h-2.5 w-2.5 rounded-full bg-[#0186D8]"></span>
              <span className="text-xs font-medium text-gray-600">
                {t("icag_mock_pass_rate") || "Mock Pass Rate (%)"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="h-2.5 w-2.5 rounded-full bg-[#FEB019]"></span>
              <span className="text-xs font-medium text-gray-600">
                {t("assignment_submissions") || "Submissions"}
              </span>
            </div>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartSeries}
              margin={{
                top: 10,
                right: isRTL ? 40 : 20,
                bottom: 10,
                left: isRTL ? 20 : 0,
              }}
            >
              <defs>
                <linearGradient id="colorCompletion" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#83B807" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#83B807" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                horizontal={true}
                vertical={false}
                stroke="#F1F1F1"
                strokeDasharray="3 3"
              />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                interval={period === "monthly" ? "preserveStartEnd" : 0}
                minTickGap={15}
                tick={{ fontSize: 11, fill: "#666" }}
                height={40}
                reversed={isRTL}
              />
              <YAxis
                yAxisId="left"
                orientation={isRTL ? "right" : "left"}
                axisLine={false}
                tickLine={false}
                domain={[0, 100]}
                tick={{ fontSize: 12, fill: "#333" }}
                tickFormatter={(val) => `${val}%`}
              />
              <YAxis
                yAxisId="right"
                orientation={isRTL ? "left" : "right"}
                axisLine={false}
                tickLine={false}
                domain={[0, "auto"]}
                tick={{ fontSize: 11, fill: "#888" }}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "#E2F2FF", opacity: 0.3 }}
              />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="completionRate"
                stroke="#83B807"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorCompletion)"
                name="Completion Rate"
              />
              <Bar
                yAxisId="left"
                dataKey="mockPassRate"
                fill="#0186D8"
                radius={[4, 4, 0, 0]}
                barSize={14}
                name="Mock Pass Rate"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="submissions"
                stroke="#FEB019"
                strokeWidth={2}
                dot={{ r: 3, fill: "#FEB019" }}
                name="Submissions"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default AcademicPerformanceChart;
