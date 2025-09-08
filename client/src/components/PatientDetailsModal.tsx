import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { AssessmentWithPatient, ResponseWithQuestion } from "@shared/schema";
import { cn } from "@/lib/utils";

interface PatientDetailsModalProps {
  assessment: AssessmentWithPatient;
  onClose: () => void;
}

export default function PatientDetailsModal({
  assessment,
  onClose,
}: PatientDetailsModalProps) {
  const [isOpen, setIsOpen] = useState(true);

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(onClose, 300); // Wait for animation to complete
  };

  const { data, isLoading, error } = useQuery({
    queryKey: [`/api/assessments/${assessment.id}`],
    queryFn: () => apiRequest(`/api/assessments/${assessment.id}`),
    enabled: isOpen,
  });

  // Fetch consultation data
  const { data: consultationData } = useQuery({
    queryKey: [`/api/consultations`],
    queryFn: () => apiRequest(`/api/consultations`),
    enabled: isOpen,
    select: (consultations) => {
      console.log('🔍 All consultations:', consultations);
      console.log('🎯 Looking for patient:', assessment.patient.name, assessment.patient.email);

      // Find consultation for this patient - try multiple matching strategies
      const found = consultations.find((c: any) => {
        // Try ID match first (for direct consultation views)
        if (c.id === assessment.id || c.id === assessment.patientId) {
          return true;
        }
        // Try exact email match
        if (c.email && assessment.patient.email && c.email === assessment.patient.email) {
          return true;
        }
        // Try exact name match
        if (c.name && assessment.patient.name && c.name === assessment.patient.name) {
          return true;
        }
        // Try case-insensitive name match
        if (c.name && assessment.patient.name && 
            c.name.toLowerCase() === assessment.patient.name.toLowerCase()) {
          return true;
        }
        return false;
      });

      console.log('✅ Found consultation data:', found);
      return found;
    }
  });

  const formatDate = (dateString?: Date | string | null) => {
    if (!dateString) return "N/A";
    const date = typeof dateString === "string" ? new Date(dateString) : dateString;
    return date.toLocaleDateString() + " at " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getRiskLevelClass = (riskLevel?: string | null) => {
    if (!riskLevel) return "";
    return `risk-${riskLevel.toLowerCase()}`;
  };

  if (error) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Error Loading Assessment</DialogTitle>
          </DialogHeader>
          <p className="text-red-500">
            We were unable to load this patient's details. Please try again.
          </p>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Patient Assessment Details</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-6 mb-6 pb-6 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex-shrink-0 h-20 w-20 rounded-full bg-neutral-200 dark:bg-neutral-700 mx-auto sm:mx-0 flex items-center justify-center">
            <i className="ri-user-3-line text-3xl text-neutral-500 dark:text-neutral-300" />
          </div>
          <div className="sm:flex-1 text-center sm:text-left">
            <h4 className="text-xl font-medium text-neutral-900 dark:text-white">
              {assessment.patient.name}
            </h4>
            <p className="text-neutral-500 dark:text-neutral-400">
              {assessment.patient.email} {assessment.patient.phone && `• ${assessment.patient.phone}`}
            </p>
            <p className="text-neutral-500 dark:text-neutral-400">
              Assessment {assessment.completedAt ? "completed" : "started"} on{" "}
              {formatDate(assessment.completedAt || assessment.createdAt)}
            </p>
          </div>
          <div>
            <span
              className={cn(
                "px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full",
                getRiskLevelClass(assessment.riskLevel)
              )}
            >
              {assessment.riskLevel
                ? `${assessment.riskLevel.charAt(0).toUpperCase() + assessment.riskLevel.slice(1)} Risk`
                : "Risk Not Assessed"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 border-b pb-6 border-neutral-200 dark:border-neutral-700">
          <div className="bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg">
            <h5 className="font-medium text-neutral-700 dark:text-neutral-300 mb-2">Primary Concern</h5>
            <p className="text-neutral-900 dark:text-white">
              {assessment.primaryConcern || "Not specified"}
            </p>
          </div>
          <div className="bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg">
            <h5 className="font-medium text-neutral-700 dark:text-neutral-300 mb-2">Status</h5>
            <p className="text-neutral-900 dark:text-white">
              {assessment.status === "in_progress"
                ? "In Progress"
                : assessment.status === "in_review"
                ? "In Review"
                : assessment.status?.charAt(0).toUpperCase() + assessment.status?.slice(1) || "Unknown"}
            </p>
          </div>
          <div className="bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-lg">
            <h5 className="font-medium text-neutral-700 dark:text-neutral-300 mb-2">Assessment ID</h5>
            <p className="text-neutral-900 dark:text-white">#{assessment.id}</p>
          </div>
        </div>

        <h4 className="text-lg font-medium text-neutral-800 dark:text-white mb-4">Consultation Details</h4>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="border-b border-neutral-200 dark:border-neutral-700 pb-4">
                <Skeleton className="h-5 w-64 mb-1" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))
          ) : (consultationData || assessment.primaryConcern || assessment.patient.phone) ? (
            <>
              <div className="border-b border-neutral-200 dark:border-neutral-700 pb-4">
                <h5 className="font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Primary Concern / Issue Category
                </h5>
                <p className="text-neutral-900 dark:text-white">
                  {consultationData?.issue_category || assessment.primaryConcern || "Not specified"}
                </p>
              </div>

              {consultationData?.issue_specifics && (
                <div className="border-b border-neutral-200 dark:border-neutral-700 pb-4">
                  <h5 className="font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Issue Specifics
                  </h5>
                  <p className="text-neutral-900 dark:text-white">
                    {consultationData.issue_specifics}
                  </p>
                </div>
              )}

              {consultationData?.preferred_clinic && (
                <div className="border-b border-neutral-200 dark:border-neutral-700 pb-4">
                  <h5 className="font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Preferred Clinic
                  </h5>
                  <p className="text-neutral-900 dark:text-white">
                    {consultationData.preferred_clinic}
                  </p>
                </div>
              )}

              {consultationData?.phone && consultationData.phone !== assessment.patient.phone && (
                <div className="border-b border-neutral-200 dark:border-neutral-700 pb-4">
                  <h5 className="font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Phone Number
                  </h5>
                  <p className="text-neutral-900 dark:text-white">
                    {consultationData.phone}
                  </p>
                </div>
              )}

              {consultationData?.email && consultationData.email !== assessment.patient.email && (
                <div className="border-b border-neutral-200 dark:border-neutral-700 pb-4">
                  <h5 className="font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Email Address
                  </h5>
                  <p className="text-neutral-900 dark:text-white">
                    {consultationData.email}
                  </p>
                </div>
              )}

              {consultationData?.symptom_description && (
                <div className="border-b border-neutral-200 dark:border-neutral-700 pb-4">
                  <h5 className="font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Symptom Description
                  </h5>
                  <p className="text-neutral-900 dark:text-white">
                    {consultationData.symptom_description}
                  </p>
                </div>
              )}

              {consultationData?.previous_treatment && (
                <div className="border-b border-neutral-200 dark:border-neutral-700 pb-4">
                  <h5 className="font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Previous Treatment
                  </h5>
                  <p className="text-neutral-900 dark:text-white">
                    {consultationData.previous_treatment}
                  </p>
                </div>
              )}

              {consultationData?.has_image === 'Yes' && (
                <div className="border-b border-neutral-200 dark:border-neutral-700 pb-4">
                  <h5 className="font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Image Submitted
                  </h5>
                  <p className="text-neutral-900 dark:text-white">
                    Yes
                  </p>
                </div>
              )}

              {consultationData?.image_path && (
                <div className="border-b border-neutral-200 dark:border-neutral-700 pb-4">
                  <h5 className="font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Submitted Image
                  </h5>
                  <div className="mt-2">
                    <img 
                      src={consultationData.image_path} 
                      alt="Patient submitted image" 
                      className="max-w-48 max-h-48 rounded border object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              )}

              {consultationData?.image_analysis && (
                <div className="border-b border-neutral-200 dark:border-neutral-700 pb-4">
                  <h5 className="font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    AI Image Analysis
                  </h5>
                  <div className="max-h-48 overflow-y-auto bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded">
                    <p className="text-neutral-900 dark:text-white whitespace-pre-line">
                      {consultationData.image_analysis}
                    </p>
                  </div>
                </div>
              )}

              {consultationData?.pain_severity && (
                <div className="border-b border-neutral-200 dark:border-neutral-700 pb-4">
                  <h5 className="font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Pain Severity
                  </h5>
                  <p className="text-neutral-900 dark:text-white">
                    {consultationData.pain_severity}/10
                  </p>
                </div>
              )}

              {consultationData?.pain_duration && (
                <div className="border-b border-neutral-200 dark:border-neutral-700 pb-4">
                  <h5 className="font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Pain Duration
                  </h5>
                  <p className="text-neutral-900 dark:text-white">
                    {consultationData.pain_duration}
                  </p>
                </div>
              )}

              {consultationData?.additional_info && (
                <div className="border-b border-neutral-200 dark:border-neutral-700 pb-4">
                  <h5 className="font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Additional Information
                  </h5>
                  <p className="text-neutral-900 dark:text-white">
                    {consultationData.additional_info}
                  </p>
                </div>
              )}

              {consultationData?.medical_history && (
                <div className="border-b border-neutral-200 dark:border-neutral-700 pb-4">
                  <h5 className="font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Medical History
                  </h5>
                  <p className="text-neutral-900 dark:text-white">
                    {consultationData.medical_history}
                  </p>
                </div>
              )}

              {consultationData?.current_medications && (
                <div className="border-b border-neutral-200 dark:border-neutral-700 pb-4">
                  <h5 className="font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Current Medications
                  </h5>
                  <p className="text-neutral-900 dark:text-white">
                    {consultationData.current_medications}
                  </p>
                </div>
              )}

              {consultationData?.allergies && (
                <div className="border-b border-neutral-200 dark:border-neutral-700 pb-4">
                  <h5 className="font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Allergies
                  </h5>
                  <p className="text-neutral-900 dark:text-white">
                    {consultationData.allergies}
                  </p>
                </div>
              )}

              {consultationData?.lifestyle_factors && (
                <div className="border-b border-neutral-200 dark:border-neutral-700 pb-4">
                  <h5 className="font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Lifestyle Factors
                  </h5>
                  <p className="text-neutral-900 dark:text-white">
                    {consultationData.lifestyle_factors}
                  </p>
                </div>
              )}

              {consultationData?.created_at && (
                <div className="border-b border-neutral-200 dark:border-neutral-700 pb-4">
                  <h5 className="font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Consultation Submitted
                  </h5>
                  <p className="text-neutral-900 dark:text-white">
                    {formatDate(consultationData.created_at)}
                  </p>
                </div>
              )}

              {consultationData?.calendar_booking && (
                <div className="border-b border-neutral-200 dark:border-neutral-700 pb-4">
                  <h5 className="font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Booking Slot
                  </h5>
                  <p className="text-neutral-900 dark:text-white">
                    {typeof consultationData.calendar_booking === 'string' 
                      ? consultationData.calendar_booking 
                      : JSON.stringify(consultationData.calendar_booking, null, 2)}
                  </p>
                </div>
              )}

              {consultationData?.booking_confirmation && (
                <div className="border-b border-neutral-200 dark:border-neutral-700 pb-4">
                  <h5 className="font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Booking Confirmation
                  </h5>
                  <p className="text-neutral-900 dark:text-white">
                    {typeof consultationData.booking_confirmation === 'string' 
                      ? consultationData.booking_confirmation 
                      : JSON.stringify(consultationData.booking_confirmation, null, 2)}
                  </p>
                </div>
              )}

              {consultationData?.final_question && (
                <div className="border-b border-neutral-200 dark:border-neutral-700 pb-4">
                  <h5 className="font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Final Question
                  </h5>
                  <p className="text-neutral-900 dark:text-white">
                    {consultationData.final_question}
                  </p>
                </div>
              )}

              {consultationData?.additional_help && (
                <div className="border-b border-neutral-200 dark:border-neutral-700 pb-4">
                  <h5 className="font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Additional Help Requested?
                  </h5>
                  <p className="text-neutral-900 dark:text-white">
                    {consultationData.additional_help}
                  </p>
                </div>
              )}

              {consultationData?.emoji_survey && (
                <div className="border-b border-neutral-200 dark:border-neutral-700 pb-4">
                  <h5 className="font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Emoji Survey
                  </h5>
                  <p className="text-neutral-900 dark:text-white">
                    {consultationData.emoji_survey}
                  </p>
                </div>
              )}

              {consultationData?.survey_response && (
                <div className="border-b border-neutral-200 dark:border-neutral-700 pb-4">
                  <h5 className="font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Survey Response
                  </h5>
                  <p className="text-neutral-900 dark:text-white">
                    {consultationData.survey_response}
                  </p>
                </div>
              )}

              {consultationData?.conversation_log && Array.isArray(consultationData.conversation_log) && consultationData.conversation_log.length > 0 && (
                <div className="border-b border-neutral-200 dark:border-neutral-700 pb-4">
                  <h5 className="font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Conversation Log
                  </h5>
                  <div className="max-h-48 overflow-y-auto bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded text-sm">
                    {consultationData.conversation_log.map((entry: any, index: number) => (
                      <div key={index} className="mb-2 last:mb-0">
                        <div className="text-neutral-600 dark:text-neutral-400 text-xs">
                          {typeof entry === 'string' ? `Step ${index + 1}` : entry.timestamp || `Step ${index + 1}`}
                        </div>
                        <div className="text-neutral-900 dark:text-white">
                          {typeof entry === 'string' ? entry : entry.message || JSON.stringify(entry)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {assessment.patient.phone && (
                <div className="border-b border-neutral-200 dark:border-neutral-700 pb-4">
                  <h5 className="font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Contact Information
                  </h5>
                  <p className="text-neutral-900 dark:text-white">
                    Phone: {assessment.patient.phone}
                  </p>
                </div>
              )}

              </>
          ) : (
            <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
              <div className="text-lg mb-2">📝 Consultation Data</div>
              <div>Detailed consultation information will appear here when submitted by the chatbot.</div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
          <Button>Schedule Appointment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}