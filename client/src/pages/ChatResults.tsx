import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PatientTable from "@/components/PatientTable";
import PatientFilters from "@/components/PatientFilters";
import ResponseAnalysisCard from "@/components/ResponseAnalysisCard";

export default function ChatResults() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [filters, setFilters] = useState({
    search: "",
    condition: "",
    dateRange: "",
    startDate: undefined,
    endDate: undefined,
  });

  const statusFilter = activeTab === "all" 
    ? undefined 
    : activeTab === "flagged"
      ? "flagged"
      : activeTab === "completed"
        ? "completed"
        : activeTab === "in-progress"
          ? "in_progress"
          : undefined;

  // Fetch consultations and transform to display format
  const { data: consultations, isLoading } = useQuery<any[]>({
    queryKey: ["/api/consultations", { page, limit, ...filters, status: statusFilter }],
    queryFn: async () => {
      const res = await fetch("/api/consultations");
      const consultationData = await res.json();
      
      // Transform consultation data to match expected assessment format for display
      return consultationData.map((consultation: any) => ({
        id: consultation.id,
        patientId: consultation.id,
        status: 'completed',
        riskLevel: consultation.issue_category?.toLowerCase().includes('pain') ? 'medium' : 'low',
        primaryConcern: consultation.issue_category || consultation.issueCategory || consultation.symptom_description || 'General consultation',
        completedAt: consultation.createdAt,
        clinicLocation: consultation.preferred_clinic || consultation.preferredClinic,
        createdAt: consultation.createdAt,
        // Store full consultation data for detailed view
        consultationData: consultation,
        patient: {
          id: consultation.id,
          name: consultation.name,
          email: consultation.email,
          phone: consultation.phone
        }
      }));
    }
  });

  const { data: flaggedData, isLoading: isLoadingFlagged } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
    setPage(1);
    toast({
      title: "Filters Applied",
      description: "The chat results have been filtered according to your selection.",
    });
  };

  const handlePageChange = (newPage: number) => setPage(newPage);

  const handleExportData = () => {
    const link = document.createElement("a");
    link.href = "/api/export/all";
    link.download = "foot-care-responses-export.json";
    link.click();
    toast({ title: "Export Started", description: "Your chat results export has been initiated." });
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setPage(1);
  };

  const pagination = {
    total: consultations?.length || 0,
    page,
    limit,
    pages: 1
  };

  return (
    <>
      <Helmet>
        <title>Chat Results | Foot Care Clinic</title>
        <meta name="description" content="Review and analyze chatbot responses from Foot Care Clinic patients." />
      </Helmet>

      <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="md:flex md:items-center md:justify-between mb-6">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold leading-7 text-neutral-800 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight">
              Chat Results
            </h2>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Review and analyze patient responses from the chatbot
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <ResponseAnalysisCard 
            title="Total Responses"
            icon="ri-chat-3-line"
            value={consultations?.length || 0}
            description="All chatbot interactions"
            isLoading={isLoading}
          />
          <ResponseAnalysisCard 
            title="Completed Assessments"
            icon="ri-check-line"
            value={flaggedData?.completedAssessments?.count || 0}
            description="Fully answered sessions"
            isLoading={isLoadingFlagged}
            color="green"
          />
          <ResponseAnalysisCard 
            title="In Progress"
            icon="ri-time-line"
            value={consultations?.filter(a => a.status === 'in_progress')?.length || 0}
            description="Unfinished assessments"
            isLoading={isLoading}
            color="blue"
          />
          <ResponseAnalysisCard 
            title="Flagged Responses"
            icon="ri-flag-line"
            value={flaggedData?.flaggedResponses?.count || 0}
            description="Responses needing attention"
            isLoading={isLoadingFlagged}
            color="red"
          />
        </div>

        <Card className="mb-6 border-l-4 border-l-[hsl(186,100%,30%)]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <span className="mr-2">📊</span>
                Response Categories
              </CardTitle>
              <div className="flex items-center text-xs text-neutral-500 dark:text-neutral-400 bg-[hsl(186,76%,97%)] dark:bg-neutral-700 px-3 py-1 rounded-full">
                <span className="mr-1">💡</span>
                Filter by assessment status
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="grid grid-cols-4 mb-4 bg-white dark:bg-neutral-800 border border-[hsl(186,76%,90%)] dark:border-neutral-600">
                <TabsTrigger value="all" className="data-[state=active]:bg-[hsl(186,100%,30%)] data-[state=active]:text-white">
                  <span className="mr-1">📋</span>All Responses
                </TabsTrigger>
                <TabsTrigger value="completed" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
                  <span className="mr-1">✅</span>Completed
                </TabsTrigger>
                <TabsTrigger value="in-progress" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                  <span className="mr-1">⏳</span>In Progress
                </TabsTrigger>
                <TabsTrigger value="flagged" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">
                  <span className="mr-1">🚩</span>Flagged
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab}>
                <PatientFilters
                  onFilterChange={handleFilterChange}
                  onExportData={handleExportData}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <PatientTable
          assessments={consultations || []}
          isLoading={isLoading}
          pagination={pagination}
          onPageChange={handlePageChange}
        />
      </div>
    </>
  );
}
