
import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { useClinicContext } from "@/App";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Search,
  Filter,
  Download,
  Eye,
  Calendar,
  User,
  FileText,
  Building2,
  AlertTriangle,
  CheckCircle,
  Clock,
  MoreHorizontal
} from "lucide-react";

interface Assessment {
  id: number;
  patientId: number;
  completedAt: string;
  status: 'completed' | 'pending' | 'flagged';
  riskLevel: 'low' | 'medium' | 'high';
  primaryConcern: string;
  clinicLocation: string | null;
  patient: {
    id: number;
    name: string;
    email: string;
    phone: string;
    clinic_group?: string;
  };
}

interface Consultation {
   id: number;
   name: string;
   email: string;
   phone: string;
   preferred_clinic: string | null;
   issue_category: string | null;
   issue_specifics: string | null;
   symptom_description: string | null;
   previous_treatment: string | null;
   has_image: string | null;
   image_path: string | null;
   image_analysis: string | null;
   calendar_booking: string | null;
   booking_confirmation: string | null;
   final_question: string | null;
   additional_help: string | null;
   emoji_survey: string | null;
   survey_response: string | null;
   createdAt: string;
 }

const AssessmentItem = React.memo(({ assessment, onViewDetails }: { assessment: Assessment; onViewDetails: (assessment: Assessment) => void }) => (
   <Card key={assessment.id} className="hover:shadow-md transition-shadow">
     <CardContent className="p-6">
       <div className="flex items-center justify-between">
         <div className="flex-1">
           <div className="flex items-center gap-3 mb-2">
             <h3 className="font-semibold text-lg">{assessment.patient?.name}</h3>
             <Badge className={getRiskBadgeColor(assessment.riskLevel)}>
               {assessment.riskLevel} risk
             </Badge>
             <Badge className={getStatusBadgeColor(assessment.status)}>
               {assessment.status}
             </Badge>
           </div>
           <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
             <p><strong>Concern:</strong> {assessment.primaryConcern}</p>
             <p><strong>Email:</strong> {assessment.patient?.email}</p>
             <p><strong>Completed:</strong> {format(new Date(assessment.completedAt), 'PPp')}</p>
             {assessment.clinicLocation && (
               <p><strong>Location:</strong> {assessment.clinicLocation}</p>
             )}
           </div>
         </div>
         <div className="flex items-center gap-2">
           <Dialog>
             <DialogTrigger asChild>
               <Button
                 variant="outline"
                 size="sm"
                 onClick={() => onViewDetails(assessment)}
               >
                 <Eye className="h-4 w-4 mr-2" />
                 View Details
               </Button>
             </DialogTrigger>
             <DialogContent className="max-w-2xl">
               <DialogHeader>
                 <DialogTitle>Assessment Details</DialogTitle>
               </DialogHeader>
               <div className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="font-semibold">Patient:</label>
                     <p>{assessment.patient?.name}</p>
                   </div>
                   <div>
                     <label className="font-semibold">Email:</label>
                     <p>{assessment.patient?.email}</p>
                   </div>
                   <div>
                     <label className="font-semibold">Phone:</label>
                     <p>{assessment.patient?.phone}</p>
                   </div>
                   <div>
                     <label className="font-semibold">Status:</label>
                     <Badge className={getStatusBadgeColor(assessment.status)}>
                       {assessment.status}
                     </Badge>
                   </div>
                   <div>
                     <label className="font-semibold">Risk Level:</label>
                     <Badge className={getRiskBadgeColor(assessment.riskLevel)}>
                       {assessment.riskLevel}
                     </Badge>
                   </div>
                   <div>
                     <label className="font-semibold">Completed:</label>
                     <p>{format(new Date(assessment.completedAt), 'PPp')}</p>
                   </div>
                 </div>
                 <div>
                   <label className="font-semibold">Primary Concern:</label>
                   <p className="mt-1">{assessment.primaryConcern}</p>
                 </div>
                 {assessment.clinicLocation && (
                   <div>
                     <label className="font-semibold">Clinic Location:</label>
                     <p className="mt-1">{assessment.clinicLocation}</p>
                   </div>
                 )}
               </div>
             </DialogContent>
           </Dialog>
         </div>
       </div>
     </CardContent>
   </Card>
 ));

const ConsultationItem = React.memo(({ consultation, onViewDetails }: { consultation: Consultation; onViewDetails: (consultation: Consultation) => void }) => (
   <Card key={consultation.id} className="hover:shadow-md transition-shadow">
     <CardContent className="p-6">
       <div className="flex items-center justify-between">
         <div className="flex-1">
           <div className="flex items-center gap-3 mb-2">
             <h3 className="font-semibold text-lg">{consultation.name}</h3>
             {consultation.issue_category && (
               <Badge variant="secondary">{consultation.issue_category}</Badge>
             )}
           </div>
           <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
             <p><strong>Email:</strong> {consultation.email}</p>
             <p><strong>Phone:</strong> {consultation.phone}</p>
             <p><strong>Created:</strong> {format(new Date(consultation.createdAt), 'PPp')}</p>
             {consultation.preferred_clinic && (
               <p><strong>Preferred Clinic:</strong> {consultation.preferred_clinic}</p>
             )}
           </div>
         </div>
         <div className="flex items-center gap-2">
           <Dialog>
             <DialogTrigger asChild>
               <Button
                 variant="outline"
                 size="sm"
                 onClick={() => onViewDetails(consultation)}
               >
                 <Eye className="h-4 w-4 mr-2" />
                 View Details
               </Button>
             </DialogTrigger>
             <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
               <DialogHeader>
                 <DialogTitle>Consultation Details</DialogTitle>
               </DialogHeader>
               <div className="space-y-6">
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                     <label className="font-semibold">Patient:</label>
                     <p>{consultation.name}</p>
                   </div>
                   <div>
                     <label className="font-semibold">Email:</label>
                     <p>{consultation.email}</p>
                   </div>
                   <div>
                     <label className="font-semibold">Phone:</label>
                     <p>{consultation.phone}</p>
                   </div>
                   <div>
                     <label className="font-semibold">Created:</label>
                     <p>{format(new Date(consultation.createdAt), 'PPp')}</p>
                   </div>
                 </div>

                 {consultation.preferred_clinic && (
                   <div>
                     <label className="font-semibold">Preferred Clinic:</label>
                     <p className="mt-1">{consultation.preferred_clinic}</p>
                   </div>
                 )}

                 {consultation.issue_category && (
                   <div>
                     <label className="font-semibold">Issue Category:</label>
                     <p className="mt-1">{consultation.issue_category}</p>
                   </div>
                 )}

                 {consultation.symptom_description && (
                   <div>
                     <label className="font-semibold">Symptom Description:</label>
                     <p className="mt-1 bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                       {consultation.symptom_description}
                     </p>
                   </div>
                 )}

                 {consultation.previous_treatment && (
                   <div>
                     <label className="font-semibold">Previous Treatment:</label>
                     <p className="mt-1 bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                       {consultation.previous_treatment}
                     </p>
                   </div>
                 )}

                 {consultation.issue_specifics && (
                   <div>
                     <label className="font-semibold">Issue Specifics:</label>
                     <p className="mt-1 bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                       {consultation.issue_specifics}
                     </p>
                   </div>
                 )}

                 {consultation.image_analysis && (
                   <div>
                     <label className="font-semibold">Image Analysis:</label>
                     <p className="mt-1 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
                       {consultation.image_analysis}
                     </p>
                   </div>
                 )}

                 {consultation.calendar_booking && (
                   <div>
                     <label className="font-semibold">Calendar Booking:</label>
                     <p className="mt-1 bg-green-50 dark:bg-green-900/20 p-3 rounded-md">
                       {consultation.calendar_booking}
                     </p>
                   </div>
                 )}

                 {consultation.survey_response && (
                   <div>
                     <label className="font-semibold">Survey Response:</label>
                     <p className="mt-1 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md">
                       {consultation.survey_response}
                     </p>
                   </div>
                 )}
               </div>
             </DialogContent>
           </Dialog>
         </div>
       </div>
     </CardContent>
   </Card>
 ));

export default function Assessments() {
   const { selectedClinicGroup } = useClinicContext();
   const [searchTerm, setSearchTerm] = useState("");
   const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
   const [statusFilter, setStatusFilter] = useState("all");
   const [riskFilter, setRiskFilter] = useState("all");
   const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
   const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);

   // Debounce search term
   useEffect(() => {
     const timer = setTimeout(() => {
       setDebouncedSearchTerm(searchTerm);
     }, 300);
     return () => clearTimeout(timer);
   }, [searchTerm]);

  const { data: patientsData, isLoading: loadingAssessments } = useQuery<{
    assessments: Assessment[];
    pagination: any;
  }>({
    queryKey: ["/api/patients"],
  });

  const { data: consultations, isLoading: loadingConsultations } = useQuery<Consultation[]>({
    queryKey: ["/api/consultations"],
  });

  // Filter assessments by selected clinic group
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

  // Filter consultations by selected clinic group
  const filteredConsultations = consultations?.filter(consultation => {
    const preferredClinic = consultation.preferred_clinic;
    let consultationClinicGroup = "FootCare Clinic"; // default
    
    if (preferredClinic) {
      const location = preferredClinic.toLowerCase();
      if (location.includes("nail") || location.includes("surgery")) {
        consultationClinicGroup = "The Nail Surgery Clinic";
      } else if (location.includes("laser") || location.includes("care")) {
        consultationClinicGroup = "The Laser Care Clinic";
      }
    }
    
    return consultationClinicGroup === selectedClinicGroup;
  }) || [];

  // Apply search and filters to assessments
  const displayAssessments = useMemo(() => {
    return filteredAssessments.filter(assessment => {
      const matchesSearch = assessment.patient?.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                            assessment.primaryConcern.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || assessment.status === statusFilter;
      const matchesRisk = riskFilter === "all" || assessment.riskLevel === riskFilter;

      return matchesSearch && matchesStatus && matchesRisk;
    });
  }, [filteredAssessments, debouncedSearchTerm, statusFilter, riskFilter]);

  // Apply search to consultations
  const displayConsultations = useMemo(() => {
    return filteredConsultations.filter(consultation => {
      return consultation.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
             (consultation.issue_category || "").toLowerCase().includes(debouncedSearchTerm.toLowerCase());
    });
  }, [filteredConsultations, debouncedSearchTerm]);

  const getRiskBadgeColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'flagged': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleViewAssessment = useCallback((assessment: Assessment) => {
    setSelectedAssessment(assessment);
  }, []);

  const handleViewConsultation = useCallback((consultation: Consultation) => {
    setSelectedConsultation(consultation);
  }, []);

  const exportData = () => {
    const dataToExport = {
      clinic: selectedClinicGroup,
      assessments: displayAssessments,
      consultations: displayConsultations,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedClinicGroup.replace(/\s+/g, '-').toLowerCase()}-assessments-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Export Complete",
      description: `Exported ${displayAssessments.length} assessments and ${displayConsultations.length} consultations.`
    });
  };

  return (
    <>
      <Helmet>
        <title>Assessments | ETEA Healthcare</title>
        <meta name="description" content="View and manage patient assessments for your clinic." />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto p-8 max-w-7xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <Building2 className="h-6 w-6 text-blue-600" />
                <span className="text-lg font-semibold text-blue-600">{selectedClinicGroup}</span>
              </div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Patient Assessments</h1>
              <p className="text-base text-gray-600 dark:text-gray-400">
                Manage assessments and consultations for your clinic
              </p>
            </div>
            <img
              src="/src/assets/elaine-avatar.png"
              alt="Etaine Avatar"
              className="w-12 h-12 rounded-full shadow-md border-2 border-white dark:border-gray-700"
            />
          </div>

          {/* Filters */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-6 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search patients or conditions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="assessments-search-input"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40" data-testid="assessments-status-filter">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="flagged">Flagged</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={riskFilter} onValueChange={setRiskFilter}>
                  <SelectTrigger className="w-40" data-testid="assessments-risk-filter">
                    <SelectValue placeholder="Risk Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Risk</SelectItem>
                    <SelectItem value="low">Low Risk</SelectItem>
                    <SelectItem value="medium">Medium Risk</SelectItem>
                    <SelectItem value="high">High Risk</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={exportData} variant="outline" data-testid="assessments-export-button">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="assessments" className="space-y-8" data-testid="assessments-tabs">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="assessments" className="flex items-center gap-2" data-testid="assessments-tab">
                <FileText className="h-4 w-4" />
                Assessments ({displayAssessments.length})
              </TabsTrigger>
              <TabsTrigger value="consultations" className="flex items-center gap-2" data-testid="consultations-tab">
                <User className="h-4 w-4" />
                Consultations ({displayConsultations.length})
              </TabsTrigger>
            </TabsList>

            {/* Assessments Tab */}
            <TabsContent value="assessments">
              <div className="grid gap-4">
                {loadingAssessments ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p>Loading assessments...</p>
                  </div>
                ) : displayAssessments.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-8">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        No assessments found
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        {searchTerm || statusFilter !== "all" || riskFilter !== "all"
                          ? "Try adjusting your filters"
                          : `No assessments available for ${selectedClinicGroup}`}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  displayAssessments.map((assessment) => (
                    <AssessmentItem key={assessment.id} assessment={assessment} onViewDetails={handleViewAssessment} />
                  ))
                )}
              </div>
            </TabsContent>

            {/* Consultations Tab */}
            <TabsContent value="consultations">
              <div className="grid gap-4">
                {loadingConsultations ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p>Loading consultations...</p>
                  </div>
                ) : displayConsultations.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-8">
                      <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        No consultations found
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        {searchTerm
                          ? "Try adjusting your search"
                          : `No consultations available for ${selectedClinicGroup}`}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  displayConsultations.map((consultation) => (
                    <ConsultationItem key={consultation.id} consultation={consultation} onViewDetails={handleViewConsultation} />
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
