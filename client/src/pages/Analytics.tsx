import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ResponseTrendsChart, CommonConditionsChart } from "@/components/SimpleCharts";
import { Download, FileBarChart } from "lucide-react";
import { BarChart, LineChart, PieChart } from "@/components/ui/charts-simplified";
import ExportButton from "@/components/ExportButton";
import FilterDateRange from "@/components/FilterDateRange";
import { Bar, Line } from "recharts";
import ClinicMap from "@/components/ClinicMapFixed";

export default function Analytics() {
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState("30");
  const [conditionsLimit, setConditionsLimit] = useState("10");
  const [activeTab, setActiveTab] = useState("trends");
  const [dateRange, setDateRange] = useState({
    startDate: undefined,
    endDate: undefined,
  });

  // Fetch dashboard stats
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });
  
  // Fetch response trends
  const { data: trends, isLoading: isLoadingTrends } = useQuery({
    queryKey: ["/api/dashboard/trends", { days: timeRange }],
  });
  
  // Fetch top conditions
  const { data: conditions, isLoading: isLoadingConditions } = useQuery({
    queryKey: ["/api/dashboard/conditions", { limit: conditionsLimit }],
  });

  // Risk level distribution data
  const riskLevelData = [
    { name: "Low", value: 42 },
    { name: "Medium", value: 35 },
    { name: "High", value: 23 }
  ];

  // Handle export data
  const handleExportData = (format: string) => {
    const exportType = format === 'csv' ? 'csv' : 'json';
    
    const link = document.createElement("a");
    link.href = `/api/export/analytics?format=${exportType}`;
    link.download = `foot-care-analytics-export.${exportType}`;
    link.click();
    
    toast({
      title: "Export Started",
      description: `Your analytics data is being exported as ${format.toUpperCase()}.`,
    });
  };

  // Handle date range changes
  const handleDateRangeChange = (range: any) => {
    setDateRange(range);
    
    toast({
      title: "Date Range Applied",
      description: "The analytics data has been filtered by your selected date range.",
    });
  };

  return (
    <>
      <Helmet>
        <title>Analytics | Foot Care Clinic</title>
        <meta name="description" content="Data analysis and visualization of patient chatbot interactions for Foot Care Clinic." />
      </Helmet>
      
      <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Page header */}
        <div className="md:flex md:items-center md:justify-between mb-6">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold leading-7 text-neutral-800 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight">
              Analytics
            </h2>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Data analysis and visualization of patient chatbot interactions
            </p>
          </div>
          <div className="mt-4 flex md:ml-4 md:mt-0 space-x-2">
            <FilterDateRange onChange={handleDateRangeChange} />
            <ExportButton onExport={handleExportData} />
          </div>
        </div>

        {/* Analytics Overview Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                Total Assessments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingStats ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">
                  {(stats?.completedAssessments || 0) + (stats?.weeklyAssessments || 0)}
                </div>
              )}
              <div className="flex items-center text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                <span className="flex items-center text-green-500">
                  <i className="ri-arrow-up-s-line mr-1"></i>
                  {stats?.weeklyAssessments || 0}
                </span>
                <span className="ml-1">this week</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                Completion Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingStats ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">
                  {stats?.completedAssessments && (stats?.completedAssessments + stats?.weeklyAssessments) > 0
                    ? Math.round((stats.completedAssessments / (stats.completedAssessments + stats.weeklyAssessments)) * 100)
                    : 0}%
                </div>
              )}
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Of all assessments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                Average Time to Complete
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">4:30</div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Minutes:Seconds
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                High Risk Patients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">23</div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Requiring immediate attention
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Tabs */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <Tabs defaultValue="trends" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-4 mb-4">
                <TabsTrigger value="trends">Response Trends</TabsTrigger>
                <TabsTrigger value="conditions">Conditions</TabsTrigger>
                <TabsTrigger value="demographics">Demographics</TabsTrigger>
                <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
              </TabsList>
              
              <TabsContent value="trends">
                <div className="mb-6">
                  <ResponseTrendsChart
                    data={trends}
                    isLoading={isLoadingTrends}
                    timeRange={timeRange}
                    onTimeRangeChange={setTimeRange}
                  />
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Completion Rates by Day</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <BarChart
                          data={[
                            { day: "Mon", completed: 12, abandoned: 4 },
                            { day: "Tue", completed: 18, abandoned: 2 },
                            { day: "Wed", completed: 15, abandoned: 3 },
                            { day: "Thu", completed: 10, abandoned: 5 },
                            { day: "Fri", completed: 14, abandoned: 2 },
                            { day: "Sat", completed: 8, abandoned: 1 },
                            { day: "Sun", completed: 6, abandoned: 1 }
                          ]}
                          index="day"
                          categories={["completed", "abandoned"]}
                          valueFormatter={(value) => `${value}`}
                        />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Response Time Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <LineChart
                          data={[
                            { minute: "1", count: 5 },
                            { minute: "2", count: 12 },
                            { minute: "3", count: 25 },
                            { minute: "4", count: 30 },
                            { minute: "5", count: 22 },
                            { minute: "6", count: 15 },
                            { minute: "7", count: 8 },
                            { minute: "8", count: 4 },
                            { minute: "9", count: 3 },
                            { minute: "10+", count: 6 }
                          ]}
                          index="minute"
                          categories={["count"]}
                          valueFormatter={(value) => `${value} patients`}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="conditions">
                <div className="mb-6">
                  <CommonConditionsChart
                    data={conditions}
                    isLoading={isLoadingConditions}
                    limit={conditionsLimit}
                    onLimitChange={setConditionsLimit}
                  />
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Condition Distribution by Age</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <BarChart
                          data={[
                            { age: "18-30", "Heel Pain": 8, "Numbness": 5, "Ingrown Toenail": 12 },
                            { age: "31-45", "Heel Pain": 15, "Numbness": 8, "Ingrown Toenail": 10 },
                            { age: "46-60", "Heel Pain": 25, "Numbness": 18, "Ingrown Toenail": 8 },
                            { age: "61+", "Heel Pain": 12, "Numbness": 22, "Ingrown Toenail": 5 }
                          ]}
                          index="age"
                          categories={["Heel Pain", "Numbness", "Ingrown Toenail"]}
                          colors={["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))"]}
                          valueFormatter={(value) => `${value}`}
                          showLegend={true}
                          showXGrid={false}
                          showYGrid={true}
                        >
                          <Bar dataKey="Heel Pain" />
                          <Bar dataKey="Numbness" />
                          <Bar dataKey="Ingrown Toenail" />
                        </BarChart>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Treatment Recommendations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <PieChart
                          data={[
                            { name: "Physical Therapy", value: 35 },
                            { name: "Medication", value: 25 },
                            { name: "Orthotics", value: 20 },
                            { name: "Surgery Consult", value: 10 },
                            { name: "Other", value: 10 }
                          ]}
                          nameKey="name"
                          valueKey="value"
                          valueFormatter={(value) => `${value}%`}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="demographics">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Age Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <BarChart
                          data={[
                            { range: "18-30", count: 42 },
                            { range: "31-45", count: 78 },
                            { range: "46-60", count: 95 },
                            { range: "61-75", count: 68 },
                            { range: "76+", count: 25 }
                          ]}
                          index="range"
                          categories={["count"]}
                          colors={["hsl(var(--chart-2))"]}
                          valueFormatter={(value) => `${value} patients`}
                          showLegend={false}
                          showXGrid={false}
                          showYGrid={true}
                        >
                          <Bar dataKey="count" />
                        </BarChart>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Gender Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <PieChart
                          data={[
                            { name: "Female", value: 58 },
                            { name: "Male", value: 41 },
                            { name: "Other", value: 1 }
                          ]}
                          index="name"
                          categories={["value"]}
                          valueFormatter={(value) => `${value}%`}
                          colors={[
                            "hsl(var(--chart-1))",
                            "hsl(var(--chart-2))",
                            "hsl(var(--chart-5))"
                          ]}
                        />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="lg:row-span-2">
                    <CardHeader>
                      <CardTitle className="text-lg">FootCare Clinic Locations</CardTitle>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        Patient assessment distribution across Dublin clinics
                      </p>
                    </CardHeader>
                    <CardContent>
                      <ClinicMap className="w-full" />
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Healthcare Coverage</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <PieChart
                          data={[
                            { name: "HSE Public", value: 52 },
                            { name: "Private Health Insurance", value: 35 },
                            { name: "DPS Medical Card", value: 8 },
                            { name: "Self-Pay", value: 5 }
                          ]}
                          index="name"
                          categories={["value"]}
                          valueFormatter={(value) => `${value}%`}
                          colors={[
                            "hsl(var(--chart-1))",
                            "hsl(var(--chart-2))",
                            "hsl(var(--chart-3))",
                            "hsl(var(--chart-4))"
                          ]}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="risk">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Risk Level Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <PieChart
                          data={riskLevelData}
                          index="name"
                          categories={["value"]}
                          valueFormatter={(value) => `${value}%`}
                          colors={[
                            "hsl(142 72% 29%)",
                            "hsl(43 96% 58%)",
                            "hsl(0 84% 60%)"
                          ]}
                        />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Risk Factors</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <BarChart
                          data={[
                            { factor: "Diabetes", count: 68 },
                            { factor: "Poor Circulation", count: 52 },
                            { factor: "Previous Foot Issues", count: 45 },
                            { factor: "Obesity", count: 38 },
                            { factor: "Improper Footwear", count: 35 }
                          ]}
                          index="factor"
                          categories={["count"]}
                          colors={["hsl(var(--chart-3))"]}
                          valueFormatter={(value) => `${value} patients`}
                          showLegend={false}
                          showXGrid={false}
                          showYGrid={true}
                        >
                          <Bar dataKey="count" />
                        </BarChart>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Risk Level by Age Group</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <BarChart
                          data={[
                            { age: "18-30", Low: 25, Medium: 12, High: 5 },
                            { age: "31-45", Low: 30, Medium: 28, High: 10 },
                            { age: "46-60", Low: 22, Medium: 35, High: 18 },
                            { age: "61-75", Low: 15, Medium: 25, High: 28 },
                            { age: "76+", Low: 8, Medium: 12, High: 15 }
                          ]}
                          index="age"
                          categories={["Low", "Medium", "High"]}
                          colors={[
                            "hsl(142 72% 29%)",
                            "hsl(43 96% 58%)",
                            "hsl(0 84% 60%)"
                          ]}
                          valueFormatter={(value) => `${value}`}
                          showLegend={true}
                          showXGrid={false}
                          showYGrid={true}
                        >
                          <Bar dataKey="Low" />
                          <Bar dataKey="Medium" />
                          <Bar dataKey="High" />
                        </BarChart>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Intervention Success Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <LineChart
                          data={[
                            { month: "Jan", rate: 72 },
                            { month: "Feb", rate: 75 },
                            { month: "Mar", rate: 78 },
                            { month: "Apr", rate: 82 },
                            { month: "May", rate: 85 },
                            { month: "Jun", rate: 86 },
                            { month: "Jul", rate: 88 }
                          ]}
                          index="month"
                          categories={["rate"]}
                          colors={["hsl(var(--chart-1))"]}
                          valueFormatter={(value) => `${value}%`}
                          showLegend={false}
                          showXGrid={false}
                          showYGrid={true}
                        >
                          <Line dataKey="rate" />
                        </LineChart>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
