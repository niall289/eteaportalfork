import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import StatsCard from "@/components/StatsCard";
import PatientTable from "@/components/PatientTable";
import PatientFilters from "@/components/PatientFilters";
import { ResponseTrendsChart, CommonConditionsChart } from "@/components/SimpleCharts";
import { Download, Filter } from "lucide-react";
import WebSocketStatus from "@/components/WebSocketStatus";
import { useClinicContext } from "@/App";
import { 
  Building2,
} from "lucide-react";

export default function Dashboard() {
  const { selectedClinicGroup } = useClinicContext();
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState("7");
  const [conditionsLimit, setConditionsLimit] = useState("5");

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: trends, isLoading: isLoadingTrends } = useQuery({
    queryKey: ["/api/dashboard/trends", { days: timeRange }],
  });

  const { data: conditions, isLoading: isLoadingConditions } = useQuery({
    queryKey: ["/api/dashboard/conditions", { limit: conditionsLimit }],
  });

  const { data: recentAssessments, isLoading: isLoadingAssessments } = useQuery({
    queryKey: ["/api/assessments/recent", { limit: 5 }],
  });

  const { data: patientsData } = useQuery<{
    assessments: any[];
    pagination: any;
  }>({
    queryKey: ["/api/patients"],
  });

  const filteredAssessments = patientsData?.assessments?.filter(assessment => {
    const patient = assessment.patient;
    if (!patient) return false;
    
    // Use clinic_group from patient record, fallback to clinicLocation mapping
    let patientClinicGroup = patient.clinic_group;
    
    if (!patientClinicGroup && assessment.clinicLocation) {
      const location = assessment.clinicLocation.toLowerCase();
      if (location.includes("nail") || location.includes("surgery")) {
        patientClinicGroup = "The Nail Surgery Clinic";
      } else if (location.includes("laser") || location.includes("care")) {
        patientClinicGroup = "The Laser Care Clinic";
      } else {
        patientClinicGroup = "FootCare Clinic";
      }
    }
    
    // Default to FootCare Clinic if no clinic group is set
    patientClinicGroup = patientClinicGroup || "FootCare Clinic";
    
    return patientClinicGroup === selectedClinicGroup;
  }) || [];

  const uniquePatients = filteredAssessments.reduce((acc, assessment) => {
    const patient = assessment.patient;
    if (patient && !acc.some((p: any) => p?.id === patient.id)) {
      acc.push(patient);
    }
    return acc;
  }, []);

  const totalPatients = uniquePatients.length;

  const handleFilterChange = (filters: any) => {
    toast({
      title: "Filters Applied",
      description: "The data has been filtered according to your selection.",
    });
  };

  const handleExportData = () => {
    const link = document.createElement("a");
    link.href = "/api/export/all";
    link.download = "etea-data-export.json";
    link.click();

    toast({
      title: "Export Started",
      description: "Your data export has been initiated.",
    });
  };

  return (
    <>
      <Helmet>
        <title>Dashboard | ETEA Healthcare</title>
        <meta name="description" content="Multi-clinic assessment dashboard for ETEA Healthcare." />
      </Helmet>

      <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Portal Header */}
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700 p-6 mb-6">
          <div className="md:flex md:items-center md:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-[hsl(186,100%,30%)] to-[hsl(186,100%,25%)] rounded-lg shadow-sm">
                  <span className="text-white text-xl">🩺</span>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-6 w-6 text-blue-600" />
                    <span className="text-lg font-semibold text-blue-600">{selectedClinicGroup}</span>
                  </div>
                  <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Clinical Dashboard</h1>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">Patient Assessment & Analytics Overview</p>
                </div>
                <WebSocketStatus />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-4 md:ml-4 md:mt-0">
              <Button
                variant="outline"
                onClick={handleExportData}
                className="border-[hsl(186,100%,30%)] text-[hsl(186,100%,30%)] hover:bg-[hsl(186,100%,30%)] hover:text-white"
              >
                <Download className="mr-2 h-4 w-4" />
                Export Report
              </Button>
              <Button className="bg-gradient-to-r from-[hsl(186,100%,30%)] to-[hsl(186,100%,25%)] hover:from-[hsl(186,100%,25%)] hover:to-[hsl(186,100%,20%)]">
                <Filter className="mr-2 h-4 w-4" />
                Advanced Filters
              </Button>
              <img
                src="/src/assets/elaine-avatar.png"
                alt="Etaine Avatar"
                className="w-10 h-10 rounded-full shadow-md border-2 border-white dark:border-gray-700"
              />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <StatsCard
            title="Total Patients"
            value={totalPatients}
            icon="ri-user-3-line"
            iconColor="text-primary-500"
            iconBgColor="bg-primary-50 dark:bg-primary-900/20"
            linkText="View all patients"
            linkHref="/patients"
            isLoading={isLoadingStats}
          />
          <StatsCard
            title="Completed Assessments"
            value={stats?.completedAssessments}
            icon="ri-chat-check-line"
            iconColor="text-green-500"
            iconBgColor="bg-green-50 dark:bg-green-900/20"
            linkText="View completed"
            linkHref="/chat-results"
            isLoading={isLoadingStats}
          />
          <StatsCard
            title="Assessments This Week"
            value={stats?.weeklyAssessments}
            icon="ri-calendar-check-line"
            iconColor="text-blue-500"
            iconBgColor="bg-blue-50 dark:bg-blue-900/20"
            linkText="View weekly data"
            linkHref="/analytics"
            isLoading={isLoadingStats}
          />
          <StatsCard
            title="Flagged Responses"
            value={stats?.flaggedResponses}
            icon="ri-flag-2-line"
            iconColor="text-red-500"
            iconBgColor="bg-red-50 dark:bg-red-900/20"
            linkText="Review flagged"
            linkHref="/chat-results?flagged=true"
            isLoading={isLoadingStats}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <ResponseTrendsChart
            data={trends}
            isLoading={isLoadingTrends}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
          />
          <CommonConditionsChart
            data={conditions}
            isLoading={isLoadingConditions}
            limit={conditionsLimit}
            onLimitChange={setConditionsLimit}
          />
        </div>

        {/* Filters */}
        <div className="mb-6">
          <PatientFilters 
            onFilterChange={handleFilterChange}
            onExportData={handleExportData}
          />
        </div>

        {/* Recent Patients */}
        <PatientTable 
          assessments={filteredAssessments.slice(0, 5)}
          isLoading={isLoadingAssessments}
        />
      </div>
    </>
  );
}
