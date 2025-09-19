import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ChevronLeft, ChevronRight, Download, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import type { AssessmentWithPatient } from "@shared/schema";
import PatientDetailsModal from "./PatientDetailsModal";

interface PatientTableProps {
  assessments?: AssessmentWithPatient[];
  isLoading?: boolean;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  onPageChange?: (page: number) => void;
}

export default function PatientTable({
  assessments = [],
  isLoading = false,
  pagination,
  onPageChange,
}: PatientTableProps) {
  const [selectedAssessment, setSelectedAssessment] = useState<AssessmentWithPatient | null>(null);

  const openDetailsModal = (assessment: AssessmentWithPatient) => {
    setSelectedAssessment(assessment);
  };

  const closeDetailsModal = () => {
    setSelectedAssessment(null);
  };

  const formatDate = (dateString?: Date | string | null) => {
    if (!dateString) return "N/A";
    const date = typeof dateString === "string" ? new Date(dateString) : dateString;
    return date.toLocaleDateString();
  };

  const formatTime = (dateString?: Date | string | null) => {
    if (!dateString) return "";
    const date = typeof dateString === "string" ? new Date(dateString) : dateString;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getRiskLevelClass = (riskLevel?: string | null) => {
    if (!riskLevel) return "";
    return `risk-${riskLevel.toLowerCase()}`;
  };

  const getStatusClass = (status?: string | null) => {
    if (!status) return "";
    return `status-${status}`;
  };

  return (
    <>
      <div className="bg-white dark:bg-neutral-800 shadow rounded-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-neutral-200 dark:border-neutral-700">
          <h3 className="text-lg font-medium text-neutral-800 dark:text-white">Recent Patient Assessments</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-neutral-50 dark:bg-neutral-800/50">
              <TableRow>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Patient
                </TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Image
                </TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Date
                </TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Primary Concern
                </TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Risk Level
                </TableHead>
                <TableHead className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Status
                </TableHead>
                <TableHead className="px-6 py-3 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-white dark:bg-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-700">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="ml-4">
                          <Skeleton className="h-4 w-28" />
                          <Skeleton className="h-3 w-40 mt-1" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-center">
                        <Skeleton className="h-12 w-12 rounded-lg" />
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16 mt-1" />
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-right">
                      <Skeleton className="h-4 w-20 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : !assessments || assessments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="px-6 py-10 text-center text-neutral-500 dark:text-neutral-400">
                    <div className="text-center">
                      <div className="text-lg mb-2">📋 No consultations yet</div>
                      <div>Waiting for chatbot submissions...</div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                assessments.map((assessment) => (
                  <TableRow key={assessment.id}>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center">
                          <i className="ri-user-3-line text-neutral-500 dark:text-neutral-300" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-neutral-900 dark:text-white">
                            {assessment.patient.name}
                          </div>
                          <div className="text-sm text-neutral-500 dark:text-neutral-400">
                            {assessment.patient.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-center">
                        {assessment.consultationData?.firstImageUrl || assessment.consultationData?.imagePath ? (
                          <button
                            onClick={() => window.open(assessment.consultationData.firstImageUrl || assessment.consultationData.imagePath, '_blank')}
                            className="w-12 h-12 rounded-lg overflow-hidden border-2 border-neutral-200 dark:border-neutral-700 hover:border-primary-300 dark:hover:border-primary-600 transition-colors"
                          >
                            <img
                              src={assessment.consultationData.firstImageUrl || assessment.consultationData.imagePath}
                              alt="Consultation image"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  parent.innerHTML = '<div class="w-full h-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center"><span class="text-neutral-400 text-lg">📷</span></div>';
                                }
                              }}
                            />
                          </button>
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                            <span className="text-neutral-400 text-lg">📷</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-neutral-900 dark:text-white">
                        {formatDate(assessment.completedAt)}
                      </div>
                      <div className="text-sm text-neutral-500 dark:text-neutral-400">
                        {formatTime(assessment.completedAt)}
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-neutral-900 dark:text-white">
                        {assessment.consultationData?.issue_category || assessment.primaryConcern || "Not specified"}
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400 space-y-1">
                        <div>🏢 FootCare Clinic</div>
                        {assessment.consultationData?.preferred_clinic && (
                          <div>📍 {assessment.consultationData.preferred_clinic}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <span 
                        className={cn(
                          "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
                          getRiskLevelClass(assessment.riskLevel)
                        )}
                      >
                        {assessment.riskLevel ? assessment.riskLevel.charAt(0).toUpperCase() + assessment.riskLevel.slice(1) : "N/A"}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <span 
                        className={cn(
                          "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
                          getStatusClass(assessment.status)
                        )}
                      >
                        {assessment.status === "in_progress" 
                          ? "In Progress" 
                          : assessment.status === "in_review" 
                            ? "In Review" 
                            : assessment.status?.charAt(0).toUpperCase() + assessment.status?.slice(1) || "N/A"}
                      </span>
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 mr-2"
                        onClick={() => openDetailsModal(assessment)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <a 
                        href={`/api/export/patient/${assessment.patientId}`}
                        className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                        download={`patient-${assessment.patientId}-export.json`}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Export
                        </Button>
                      </a>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {pagination && pagination.pages > 1 && (
          <div className="bg-white dark:bg-neutral-800 px-4 py-3 border-t border-neutral-200 dark:border-neutral-700 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 flex justify-between sm:hidden">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === 1}
                  onClick={() => onPageChange?.(pagination.page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === pagination.pages}
                  onClick={() => onPageChange?.(pagination.page + 1)}
                >
                  Next
                </Button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-neutral-700 dark:text-neutral-300">
                    Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{" "}
                    <span className="font-medium">
                      {Math.min(pagination.page * pagination.limit, pagination.total)}
                    </span>{" "}
                    of <span className="font-medium">{pagination.total}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-l-md"
                      disabled={pagination.page === 1}
                      onClick={() => onPageChange?.(pagination.page - 1)}
                    >
                      <span className="sr-only">Previous</span>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    {Array.from({ length: pagination.pages }).map((_, index) => {
                      const pageNumber = index + 1;
                      const isActive = pageNumber === pagination.page;

                      // Show first, last, and pages around current page
                      if (
                        pageNumber === 1 ||
                        pageNumber === pagination.pages ||
                        (pageNumber >= pagination.page - 1 && pageNumber <= pagination.page + 1)
                      ) {
                        return (
                          <Button
                            key={pageNumber}
                            variant={isActive ? "default" : "outline"}
                            size="sm"
                            className="w-8 h-8 p-0"
                            onClick={() => onPageChange?.(pageNumber)}
                          >
                            {pageNumber}
                          </Button>
                        );
                      }

                      // Show ellipsis
                      if (
                        pageNumber === 2 ||
                        pageNumber === pagination.pages - 1
                      ) {
                        return (
                          <Button
                            key={`ellipsis-${pageNumber}`}
                            variant="outline"
                            size="sm"
                            className="w-8 h-8 p-0"
                            disabled
                          >
                            ...
                          </Button>
                        );
                      }

                      return null;
                    })}

                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-r-md"
                      disabled={pagination.page === pagination.pages}
                      onClick={() => onPageChange?.(pagination.page + 1)}
                    >
                      <span className="sr-only">Next</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedAssessment && (
        <PatientDetailsModal
          assessment={selectedAssessment}
          onClose={closeDetailsModal}
        />
      )}
    </>
  );
}