import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { useToast } from "@/hooks/use-toast";
import PatientFilters from "@/components/PatientFilters";
import PatientTable from "@/components/PatientTable";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AssessmentWithPatient } from "@shared/schema";

export default function Patients() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [filters, setFilters] = useState({
    search: "",
    condition: "",
    dateRange: "",
    startDate: undefined,
    endDate: undefined,
  });

  // Fetch patients with pagination and filters
  const { data, isLoading } = useQuery<{
    assessments: any[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }>({
    queryKey: [
      "/api/patients",
      {
        page,
        limit,
        search: filters.search,
        condition: filters.condition,
        startDate: filters.startDate ? filters.startDate.toISOString() : undefined,
        endDate: filters.endDate ? filters.endDate.toISOString() : undefined,
      },
    ],
    onSuccess: (data) => {
      console.log('Patients page - received data:', data);
      console.log('Patients page - assessments count:', data?.assessments?.length);
      console.log('Patients page - first few assessments:', data?.assessments?.slice(0, 3));
      if (data?.assessments?.length > 0) {
        console.log('Patients page - latest assessment details:', {
          id: data.assessments[0].id,
          patientName: data.assessments[0].patient?.name,
          primaryConcern: data.assessments[0].primaryConcern,
          createdAt: data.assessments[0].createdAt
        });
      }
    },
    onError: (error) => {
      console.error('Patients page - query error:', error);
    }
  });

  // Handle filter changes
  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page when filters change

    toast({
      title: "Filters Applied",
      description: "The patient list has been filtered according to your selection.",
    });
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  // Handle export data
  const handleExportData = () => {
    const link = document.createElement("a");
    link.href = "/api/export/all";
    link.download = "foot-care-patients-export.json";
    link.click();

    toast({
      title: "Export Started",
      description: "Your patient data export has been initiated.",
    });
  };

  return (
    <>
      <Helmet>
        <title>Patients | Foot Care Clinic</title>
        <meta name="description" content="View and manage patient data from the Foot Care Clinic chatbot." />
      </Helmet>

      <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Page header */}
        <div className="md:flex md:items-center md:justify-between mb-6">
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold leading-7 text-neutral-800 dark:text-white sm:truncate sm:text-3xl sm:tracking-tight">Patients</h2>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              View and manage patients who have completed the chatbot assessment
            </p>
          </div>
        </div>

        {/* Patient statistics cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
          {isLoading ? (
            <>
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </>
          ) : (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                    Total Patients
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data?.pagination?.total || 0}</div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    {data?.pagination?.total > 0 
                      ? `Showing ${(page - 1) * limit + 1} to ${Math.min(page * limit, data.pagination.total)} patients`
                      : "No patients found"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {data?.assessments?.[0]?.completedAt 
                      ? new Date(data.assessments[0].completedAt).toLocaleDateString() 
                      : "No recent activity"}
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    Last patient assessment
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                    Completed Assessments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {data?.assessments?.filter(a => a.status === 'completed').length || 0}
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    From current results
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Filters */}
        <div className="mb-6">
          <PatientFilters
            onFilterChange={handleFilterChange}
            onExportData={handleExportData}
          />
        </div>

        {/* Patient table */}
        <PatientTable
          assessments={data?.assessments}
          isLoading={isLoading}
          pagination={data?.pagination ? {
            total: data.pagination.total,
            page: data.pagination.page,
            limit: data.pagination.limit,
            pages: data.pagination.totalPages
          } : undefined}
          onPageChange={handlePageChange}
        />
      </div>
    </>
  );
}