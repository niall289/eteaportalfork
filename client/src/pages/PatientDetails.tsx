import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import PatientDetailsModal from "@/components/PatientDetailsModal";
import { ArrowLeft, Download, FileBarChart, Calendar, Mail, Phone } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

interface PatientDetailsProps {
  id: number;
}

export default function PatientDetails({ id }: PatientDetailsProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  
  // Fetch patient details
  const { data, isLoading, error } = useQuery({
    queryKey: [`/api/patients/${id}`],
  });

  // Cliniko sync mutation
  const clinikoSyncMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/patients/${id}/cliniko-sync`, {
        method: 'POST',
      });
    },
    onSuccess: (result) => {
      toast({
        title: result.action === 'created' ? "Patient Added to Cliniko" : "Patient Synced with Cliniko",
        description: result.action === 'created' 
          ? `Patient ${data?.patient?.name} has been successfully added to Cliniko.`
          : `Patient ${data?.patient?.name} has been synced with their existing Cliniko record.`,
      });
      // Refresh patient data to show updated Cliniko status
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${id}`] });
    },
    onError: (error: any) => {
      toast({
        title: "Cliniko Sync Failed",
        description: error.message || "Failed to sync patient with Cliniko. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Handle error
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load patient details. Please try again.",
        variant: "destructive",
      });
      navigate("/patients");
    }
  }, [error, toast, navigate]);
  
  // View assessment details
  const handleViewAssessment = (assessmentId: number) => {
    setSelectedAssessmentId(assessmentId);
  };
  
  // Close modal
  const handleCloseModal = () => {
    setSelectedAssessmentId(null);
  };
  
  // Export patient data
  const handleExportData = () => {
    const link = document.createElement("a");
    link.href = `/api/export/patient/${id}`;
    link.download = `patient-${id}-export.json`;
    link.click();
    
    toast({
      title: "Export Started",
      description: "Patient data export has been initiated.",
    });
  };

  // Handle Cliniko sync
  const handleClinikoSync = () => {
    clinikoSyncMutation.mutate();
  };
  
  // Format date
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "MMM d, yyyy");
  };
  
  // Format time
  const formatTime = (dateString?: string | null) => {
    if (!dateString) return "";
    return format(new Date(dateString), "h:mm a");
  };
  
  // Get status badges
  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    
    const statusClasses = {
      completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
      in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
      in_review: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
      flagged: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
    };
    
    const statusText = {
      completed: "Completed",
      in_progress: "In Progress",
      in_review: "In Review",
      flagged: "Flagged",
    };
    
    const className = statusClasses[status as keyof typeof statusClasses] || "";
    const text = statusText[status as keyof typeof statusText] || status;
    
    return (
      <Badge className={className}>{text}</Badge>
    );
  };
  
  // Get risk level badge
  const getRiskBadge = (riskLevel?: string) => {
    if (!riskLevel) return null;
    
    const riskClasses = {
      low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
      medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
      high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
    };
    
    const className = riskClasses[riskLevel.toLowerCase() as keyof typeof riskClasses] || "";
    
    return (
      <Badge className={className}>
        {riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)} Risk
      </Badge>
    );
  };

  // Find selected assessment
  const selectedAssessment = selectedAssessmentId 
    ? data?.assessments?.find(a => a.id === selectedAssessmentId)
    : null;

  return (
    <>
      <Helmet>
        <title>
          {isLoading
            ? "Loading Patient..." 
            : data?.patient?.name
            ? `${data.patient.name} | Foot Care Clinic`
            : "Patient Details | Foot Care Clinic"}
        </title>
        <meta name="description" content="View detailed patient information and assessment history." />
      </Helmet>
      
      <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Back button and actions */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" size="sm" onClick={() => navigate("/patients")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Patients
          </Button>
          
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={handleExportData}>
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleClinikoSync}
              disabled={clinikoSyncMutation.isPending}
            >
              {clinikoSyncMutation.isPending ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[hsl(186,100%,30%)] mr-2"></div>
                  Syncing...
                </div>
              ) : (
                <>
                  <i className="ri-hospital-line text-sm mr-2" />
                  Add/Sync with Cliniko
                </>
              )}
            </Button>
            <Button size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Appointment
            </Button>
          </div>
        </div>
        
        {/* Patient profile card */}
        <Card className="mb-6">
          <CardContent className="p-6">
            {isLoading ? (
              <div className="flex items-center">
                <Skeleton className="h-20 w-20 rounded-full" />
                <div className="ml-6">
                  <Skeleton className="h-8 w-48 mb-2" />
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-4 w-32 mt-2" />
                </div>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row items-start md:items-center">
                <div className="flex-shrink-0 h-20 w-20 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center mb-4 md:mb-0">
                  <i className="ri-user-3-line text-3xl text-neutral-500 dark:text-neutral-300" />
                </div>
                <div className="md:ml-6">
                  <h2 className="text-2xl font-bold text-neutral-800 dark:text-white">
                    {data?.patient?.name || "Unknown Patient"}
                  </h2>
                  <div className="flex flex-col sm:flex-row sm:items-center mt-2 text-neutral-500 dark:text-neutral-400">
                    {data?.patient?.email && (
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 mr-1" />
                        <span>{data.patient.email}</span>
                      </div>
                    )}
                    {data?.patient?.phone && (
                      <div className="flex items-center sm:ml-4 mt-1 sm:mt-0">
                        <Phone className="h-4 w-4 mr-1" />
                        <span>{data.patient.phone}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-neutral-600 dark:text-neutral-300">
                      Patient since {formatDate(data?.patient?.createdAt)}
                    </Badge>
                    <Badge variant="outline" className="text-neutral-600 dark:text-neutral-300">
                      {data?.assessments?.length || 0} Assessments
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Assessment history */}
        <Card>
          <CardHeader>
            <CardTitle>Assessment History</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList className="mb-4">
                <TabsTrigger value="all">All Assessments</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
                <TabsTrigger value="flagged">Flagged</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all" className="space-y-4">
                {isLoading ? (
                  Array(3).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-24" />
                  ))
                ) : data?.assessments?.length ? (
                  data.assessments.map((assessment) => (
                    <Card key={assessment.id} className="overflow-hidden">
                      <CardContent className="p-0">
                        <div className="flex flex-col md:flex-row md:items-center justify-between p-4">
                          <div>
                            <div className="flex items-center">
                              <h3 className="text-lg font-semibold">
                                {assessment.primaryConcern || "General Assessment"}
                              </h3>
                              <div className="ml-3 flex gap-2">
                                {getStatusBadge(assessment.status)}
                                {getRiskBadge(assessment.riskLevel)}
                              </div>
                            </div>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                              {assessment.completedAt 
                                ? `Completed on ${formatDate(assessment.completedAt)} at ${formatTime(assessment.completedAt)}`
                                : `Started on ${formatDate(assessment.createdAt)}`}
                            </p>
                          </div>
                          <div className="mt-4 md:mt-0 flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleViewAssessment(assessment.id)}
                            >
                              <FileBarChart className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                    No assessments found for this patient.
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="completed" className="space-y-4">
                {isLoading ? (
                  <Skeleton className="h-24" />
                ) : data?.assessments?.filter(a => a.status === 'completed')?.length ? (
                  data.assessments
                    .filter(a => a.status === 'completed')
                    .map((assessment) => (
                      <Card key={assessment.id} className="overflow-hidden">
                        <CardContent className="p-0">
                          <div className="flex flex-col md:flex-row md:items-center justify-between p-4">
                            <div>
                              <div className="flex items-center">
                                <h3 className="text-lg font-semibold">
                                  {assessment.primaryConcern || "General Assessment"}
                                </h3>
                                <div className="ml-3 flex gap-2">
                                  {getStatusBadge(assessment.status)}
                                  {getRiskBadge(assessment.riskLevel)}
                                </div>
                              </div>
                              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                                Completed on {formatDate(assessment.completedAt)} at {formatTime(assessment.completedAt)}
                              </p>
                            </div>
                            <div className="mt-4 md:mt-0 flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleViewAssessment(assessment.id)}
                              >
                                <FileBarChart className="h-4 w-4 mr-2" />
                                View Details
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                ) : (
                  <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                    No completed assessments found for this patient.
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="flagged" className="space-y-4">
                {isLoading ? (
                  <Skeleton className="h-24" />
                ) : data?.assessments?.filter(a => a.status === 'flagged')?.length ? (
                  data.assessments
                    .filter(a => a.status === 'flagged')
                    .map((assessment) => (
                      <Card key={assessment.id} className="overflow-hidden">
                        <CardContent className="p-0">
                          <div className="flex flex-col md:flex-row md:items-center justify-between p-4">
                            <div>
                              <div className="flex items-center">
                                <h3 className="text-lg font-semibold">
                                  {assessment.primaryConcern || "General Assessment"}
                                </h3>
                                <div className="ml-3 flex gap-2">
                                  {getStatusBadge(assessment.status)}
                                  {getRiskBadge(assessment.riskLevel)}
                                </div>
                              </div>
                              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                                {assessment.completedAt 
                                  ? `Completed on ${formatDate(assessment.completedAt)}`
                                  : `Started on ${formatDate(assessment.createdAt)}`}
                              </p>
                            </div>
                            <div className="mt-4 md:mt-0 flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleViewAssessment(assessment.id)}
                              >
                                <FileBarChart className="h-4 w-4 mr-2" />
                                View Details
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                ) : (
                  <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                    No flagged assessments found for this patient.
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      
      {/* Assessment details modal */}
      {selectedAssessment && (
        <PatientDetailsModal
          assessment={selectedAssessment}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
}
