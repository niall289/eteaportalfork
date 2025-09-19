import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import PatientDetailsModal from "@/components/PatientDetailsModal";
import {
  Search,
  MapPin,
  Phone,
  Mail,
  Calendar,
  AlertCircle,
} from "lucide-react";

interface Consultation {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  preferredClinic: string | null;
  issueCategory: string | null;
  issueSpecifics: string | null;
  painDuration: string | null;
  painSeverity: string | null;
  additionalInfo: string | null;
  previousTreatment: string | null;
  hasImage: boolean | null;
  imagePath: string | null;
  images: string[];
  firstImageUrl?: string | null;
  firstThumbnailUrl?: string | null;
  imageAnalysis: string | null;
  symptomDescription: string | null;
  symptomAnalysis: string | null;
  conversationLog: string | null;
  createdAt: string;
}

export default function Consultations() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClinic, setSelectedClinic] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedConsultation, setSelectedConsultation] = useState<any>(null);

  const {
    data: consultations = [],
    isLoading,
  } = useQuery<Consultation[]>({
    queryKey: ["/api/consultations"],
    queryFn: async () => {
      const res = await fetch("/api/consultations");
      if (!res.ok) throw new Error("Failed to fetch consultations");
      return res.json();
    },
    enabled: true,
  });

  const filteredConsultations = consultations.filter((consultation) => {
    const matchesSearch =
      searchTerm === "" ||
      consultation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      consultation.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      consultation.issueCategory?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesClinic =
      selectedClinic === "all" || consultation.preferredClinic === selectedClinic;
    const matchesCategory =
      selectedCategory === "all" || consultation.issueCategory === selectedCategory;

    return matchesSearch && matchesClinic && matchesCategory;
  });

  const uniqueClinics = Array.from(
    new Set(consultations.map((c) => c.preferredClinic).filter(Boolean))
  );
  const uniqueCategories = Array.from(
    new Set(consultations.map((c) => c.issueCategory).filter(Boolean))
  );

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM dd, yyyy 'at' hh:mm a");
    } catch {
      return "Unknown date";
    }
  };

  const getPriorityBadge = (severity: string | null) => {
    if (!severity) return <Badge variant="outline">Unknown</Badge>;

    const severityNum = parseInt(severity.split("/")[0]) || 0;
    if (severityNum >= 8) return <Badge variant="destructive">High Priority</Badge>;
    if (severityNum >= 5) return <Badge variant="default">Medium Priority</Badge>;
    return <Badge variant="secondary">Low Priority</Badge>;
  };

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Live Consultations - FootCare Clinic Admin</title>
        <meta name="description" content="View and manage live consultations from your chatbot" />
      </Helmet>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Live Consultations</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Real-time consultations from your FootCare Clinic chatbot
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center text-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
            <span className="text-sm font-medium">Live Updates</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search consultations by name, email, or issue..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={selectedClinic} onValueChange={setSelectedClinic}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Clinics" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clinics</SelectItem>
            {uniqueClinics.map((clinic) => (
              <SelectItem key={clinic} value={clinic?.toString() || "unknown"}>
                {clinic || "Unknown Clinic"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {uniqueCategories.map((category) => (
              <SelectItem key={category} value={category?.toString() || "unknown"}>
                {category || "Unknown Category"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Consultations */}
      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))
        ) : filteredConsultations.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No consultations found
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {consultations.length === 0
                  ? "Waiting for the first consultation from your chatbot..."
                  : "Try adjusting your search criteria to find consultations."}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredConsultations.map((consultation) => (
            <Card key={consultation.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg text-gray-900 dark:text-white">
                      {consultation.name}
                    </CardTitle>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400 mt-1">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {formatDate(consultation.createdAt)}
                      </div>
                      {consultation.preferredClinic && (
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          {consultation.preferredClinic}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {consultation.painSeverity && getPriorityBadge(consultation.painSeverity)}
                    {(consultation.firstThumbnailUrl || consultation.firstImageUrl) && (
                      <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                        <a
                          href={consultation.firstImageUrl || consultation.firstThumbnailUrl || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full h-full"
                        >
                          <img
                            src={consultation.firstThumbnailUrl || consultation.firstImageUrl || ''}
                            alt="Consultation image"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback to icon if image fails to load
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = '<div class="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center"><span class="text-gray-400">📷</span></div>';
                              }
                            }}
                          />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                      Contact Information
                    </h4>
                    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      {consultation.email && (
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-2" />
                          {consultation.email}
                        </div>
                      )}
                      {consultation.phone && (
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 mr-2" />
                          {consultation.phone}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                      Issue Details
                    </h4>
                    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      {consultation.issueCategory && (
                        <div><strong>Category:</strong> {consultation.issueCategory}</div>
                      )}
                      {consultation.issueSpecifics && (
                        <div><strong>Details:</strong> {consultation.issueSpecifics}</div>
                      )}
                      {consultation.painDuration && (
                        <div><strong>Duration:</strong> {consultation.painDuration}</div>
                      )}
                      {consultation.painSeverity && (
                        <div><strong>Severity:</strong> {consultation.painSeverity}</div>
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                      Images
                    </h4>
                    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      {(consultation.firstThumbnailUrl || consultation.firstImageUrl) ? (
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                          <a
                            href={consultation.firstImageUrl || consultation.firstThumbnailUrl || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full h-full"
                          >
                            <img
                              src={consultation.firstThumbnailUrl || consultation.firstImageUrl || ''}
                              alt="Consultation image"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  parent.innerHTML = '<div class="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center"><span class="text-gray-400">📷</span></div>';
                                }
                              }}
                            />
                          </a>
                          {consultation.images && consultation.images.length > 1 && (
                            <div className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                              +{consultation.images.length - 1}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span>No images</span>
                      )}
                    </div>
                  </div>
                </div>

                {consultation.additionalInfo && (
                  <div className="mt-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                      Additional Information
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {consultation.additionalInfo}
                    </p>
                  </div>
                )}

                <div className="flex justify-end mt-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      // Create a fake assessment object for the modal
                      const fakeAssessment = {
                        id: consultation.id,
                        patientId: consultation.id,
                        status: 'completed' as const,
                        riskLevel: 'medium' as const,
                        primaryConcern: consultation.issueCategory || consultation.issueSpecifics || 'General consultation',
                        completedAt: consultation.createdAt,
                        clinicLocation: consultation.preferredClinic,
                        createdAt: consultation.createdAt,
                        patient: {
                          id: consultation.id,
                          name: consultation.name,
                          email: consultation.email || '',
                          phone: consultation.phone || ''
                        }
                      };
                      setSelectedConsultation(fakeAssessment);
                    }}
                  >
                    View Full Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {selectedConsultation && (
        <PatientDetailsModal
          assessment={selectedConsultation}
          onClose={() => setSelectedConsultation(null)}
        />
      )}

      {!isLoading && consultations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Consultation Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-[hsl(186,100%,30%)]">
                  {consultations.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Total Consultations
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[hsl(186,100%,30%)]">
                  {uniqueClinics.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Clinics Involved
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[hsl(186,100%,30%)]">
                  {uniqueCategories.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Issue Categories
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}