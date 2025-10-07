import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { useClinicContext } from "@/App";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Patient, TreatmentPlan } from "@shared/schema";
import { Helmet } from "react-helmet";
import {
  Send,
  MessageSquare,
  Calendar,
  Mail,
  Phone,
  Building2,
  Edit2,
  Copy,
  Settings
} from "lucide-react";

type FollowUpType = "appointment" | "check-in" | "call";

const followUpTypes: FollowUpType[] = ["appointment", "check-in", "call"];

export default function Communications() {
  const { selectedClinicGroup } = useClinicContext();
  const queryClient = useQueryClient();
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [messageType, setMessageType] = useState<"email" | "sms" | "message" | "portal">("email");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [followUpType, setFollowUpType] = useState<FollowUpType>("appointment");
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpNotes, setFollowUpNotes] = useState("");

  // Treatment Plans state
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>([]);
  const [selectedTreatmentPlan, setSelectedTreatmentPlan] = useState<TreatmentPlan | null>(null);
  const [treatmentPlanTitle, setTreatmentPlanTitle] = useState("");
  const [treatmentPlanDescription, setTreatmentPlanDescription] = useState("");
  const [treatmentItems, setTreatmentItems] = useState<{ name: string; description: string; duration?: string; frequency?: string; notes?: string }[]>([]);
  const [newTreatmentItem, setNewTreatmentItem] = useState({ name: "", description: "", duration: "", frequency: "", notes: "" });

  // Email Settings state
  const [emailSettings, setEmailSettings] = useState({
    emailFrom: "",
    emailFromName: "",
    smtpHost: "",
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: "",
    smtpPass: "",
    mailerSendApiKey: "",
    emailService: "mailersend" as "mailersend" | "smtp",
    isActive: true
  });

  const [templates, setTemplates] = useState([
    {
      title: "Thank You",
      content: "Hi [Patient Name], thank you for visiting our clinic today!",
      description: "Post-visit appreciation message"
    },
    {
      title: "Follow-Up",
      content: "Hello [Patient Name], just checking in to see how you're feeling.",
      description: "General follow-up check-in"
    },
    {
      title: "Booking Reminder",
      content: "Hi [Patient Name], this is a reminder of your upcoming appointment.",
      description: "Appointment reminder notification"
    },
  ]);

  const { data: patients, isLoading: loadingPatients } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
      const response = await apiRequest("/api/patients");
      return response.assessments.map((a: any) => a.patient).filter(Boolean);
    }
  });

  const filteredPatients = patients?.filter((p: Patient) => {
    return p?.clinic_group === selectedClinicGroup;
  });

  const { data: treatmentPlansData, isLoading: loadingTreatmentPlans } = useQuery({
    queryKey: ["treatment-plans"],
    queryFn: async () => {
      const response = await apiRequest("/api/treatment-plans");
      return response;
    }
  });

  const { data: clinicEmailSettings, isLoading: loadingEmailSettings } = useQuery({
    queryKey: ["clinic-email-settings", selectedClinicGroup],
    queryFn: async () => {
      const response = await apiRequest(`/api/clinic-email-settings/${selectedClinicGroup}`);
      return response;
    },
    enabled: !!selectedClinicGroup
  });

  // Populate email settings when data loads
  useEffect(() => {
    if (clinicEmailSettings) {
      setEmailSettings({
        emailFrom: clinicEmailSettings.emailFrom || "",
        emailFromName: clinicEmailSettings.emailFromName || "",
        smtpHost: clinicEmailSettings.smtpHost || "",
        smtpPort: clinicEmailSettings.smtpPort || 587,
        smtpSecure: clinicEmailSettings.smtpSecure || false,
        smtpUser: clinicEmailSettings.smtpUser || "",
        smtpPass: clinicEmailSettings.smtpPass || "",
        mailerSendApiKey: clinicEmailSettings.mailerSendApiKey || "",
        emailService: clinicEmailSettings.emailService || "mailersend",
        isActive: clinicEmailSettings.isActive ?? true
      });
    }
  }, [clinicEmailSettings]);

  const sendMessage = useMutation({
    mutationFn: async () => {
      if (!selectedPatient) throw new Error("No patient selected");
      await apiRequest("/api/communications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          sentBy: "Admin",
          type: messageType,
          subject,
          message: content,
          sentAt: new Date()
        })
      });
    },
    onSuccess: () => {
      toast({ title: "Message sent successfully", description: "Your message has been delivered." });
      setSubject("");
      setContent("");
      queryClient.invalidateQueries({ queryKey: ["communications"] });
    },
    onError: () => toast({
      title: "Failed to send message",
      description: "Please try again later.",
      variant: "destructive"
    })
  });

  const createFollowUp = useMutation({
    mutationFn: async () => {
      if (!selectedPatient) throw new Error("No patient selected");
      await apiRequest("/api/followups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          type: followUpType,
          scheduledFor: new Date(followUpDate),
          notes: followUpNotes,
          createdAt: new Date()
        })
      });
    },
    onSuccess: () => {
      toast({ title: "Follow-up scheduled", description: "Follow-up has been added to your calendar." });
      setFollowUpDate("");
      setFollowUpNotes("");
      queryClient.invalidateQueries({ queryKey: ["followups"] });
    },
    onError: () => toast({
      title: "Failed to schedule follow-up",
      description: "Please try again later.",
      variant: "destructive"
    })
  });

  const createTreatmentPlan = useMutation({
    mutationFn: async () => {
      if (!selectedPatient) throw new Error("No patient selected");
      await apiRequest("/api/treatment-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          title: treatmentPlanTitle,
          description: treatmentPlanDescription,
          treatments: treatmentItems,
          createdBy: "Admin"
        })
      });
    },
    onSuccess: () => {
      toast({ title: "Treatment plan created", description: "Treatment plan has been saved successfully." });
      setTreatmentPlanTitle("");
      setTreatmentPlanDescription("");
      setTreatmentItems([]);
      queryClient.invalidateQueries({ queryKey: ["treatment-plans"] });
    },
    onError: () => toast({
      title: "Failed to create treatment plan",
      description: "Please try again later.",
      variant: "destructive"
    })
  });

  const updateEmailSettings = useMutation({
    mutationFn: async () => {
      await apiRequest(`/api/clinic-email-settings/${selectedClinicGroup}`, {
        method: clinicEmailSettings ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicGroup: selectedClinicGroup,
          ...emailSettings,
          mailerSendApiKey: emailSettings.mailerSendApiKey
        })
      });
    },
    onSuccess: () => {
      toast({ title: "Email settings updated", description: "Clinic email settings have been saved successfully." });
      queryClient.invalidateQueries({ queryKey: ["clinic-email-settings", selectedClinicGroup] });
    },
    onError: () => toast({
      title: "Failed to update email settings",
      description: "Please try again later.",
      variant: "destructive"
    })
  });

  const personalizeTemplate = (template: string) => {
    if (!selectedPatient) return template;
    return template.replace(/\[Patient Name\]/g, selectedPatient.name);
  };

  const handleTemplateUse = (template: string) => {
    if (!selectedPatient) {
      toast({
        title: "Please select a patient first",
        description: "Choose a patient to personalize the template.",
        variant: "destructive"
      });
      return;
    }
    setContent(personalizeTemplate(template));
    toast({ title: "Template applied", description: "Message has been personalized for the selected patient." });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied to clipboard", description: "Template content copied successfully." });
    } catch (err) {
      toast({ title: "Failed to copy", description: "Could not copy to clipboard.", variant: "destructive" });
    }
  };

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case "email": return <Mail className="h-4 w-4" />;
      case "sms": return <MessageSquare className="h-4 w-4" />;
      case "message": return <MessageSquare className="h-4 w-4" />;
      case "portal": return <Phone className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  // Treatment Plan functions
  const addTreatmentItem = () => {
    if (newTreatmentItem.name && newTreatmentItem.description) {
      setTreatmentItems([...treatmentItems, newTreatmentItem]);
      setNewTreatmentItem({ name: "", description: "", duration: "", frequency: "", notes: "" });
    }
  };

  const removeTreatmentItem = (index: number) => {
    setTreatmentItems(treatmentItems.filter((_, i) => i !== index));
  };

  const editTreatmentPlan = (plan: TreatmentPlan) => {
    setSelectedTreatmentPlan(plan);
    setTreatmentPlanTitle(plan.title);
    setTreatmentPlanDescription(plan.description || "");
    setTreatmentItems(plan.treatments || []);
  };

  const resetTreatmentPlanForm = () => {
    setSelectedTreatmentPlan(null);
    setTreatmentPlanTitle("");
    setTreatmentPlanDescription("");
    setTreatmentItems([]);
    setNewTreatmentItem({ name: "", description: "", duration: "", frequency: "", notes: "" });
  };

  return (
    <>
      <Helmet>
        <title>Communication Hub | ETEA Healthcare</title>
        <meta name="description" content="Send messages, manage templates, and schedule follow-ups for all ETEA clinics." />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto p-8 max-w-6xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <Building2 className="h-6 w-6 text-blue-600" />
                <span className="text-lg font-semibold text-blue-600">{selectedClinicGroup}</span>
              </div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Communication Hub</h1>
              <p className="text-base text-gray-600 dark:text-gray-400">
                Send messages, manage templates, and schedule follow-ups with patients
              </p>
            </div>
            <img
              src="/src/assets/elaine-avatar.png"
              alt="Etaine Avatar"
              className="w-12 h-12 rounded-full shadow-md border-2 border-white dark:border-gray-700"
            />
          </div>

         <Tabs defaultValue="send" className="w-full">
           <TabsList className="grid w-full grid-cols-5">
             <TabsTrigger value="send">Send Message</TabsTrigger>
             <TabsTrigger value="templates">Templates</TabsTrigger>
             <TabsTrigger value="treatment-plans">Treatment Plans</TabsTrigger>
             <TabsTrigger value="followups">Follow-ups</TabsTrigger>
             <TabsTrigger value="email-settings">Email Settings</TabsTrigger>
           </TabsList>

           <TabsContent value="send" className="space-y-6">
             <Card>
               <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                   <Send className="h-5 w-5" />
                   Send Message
                 </CardTitle>
               </CardHeader>
               <CardContent className="space-y-4">
                 {/* Patient Selection */}
                 <div className="space-y-2">
                   <Label htmlFor="patient-select">Select Patient</Label>
                   <Select
                     value={selectedPatient?.id?.toString() || ""}
                     onValueChange={(value) => {
                       const patient = filteredPatients?.find((p: Patient) => p.id === parseInt(value));
                       setSelectedPatient(patient || null);
                     }}
                   >
                     <SelectTrigger>
                       <SelectValue placeholder="Choose a patient..." />
                     </SelectTrigger>
                     <SelectContent>
                       {loadingPatients ? (
                         <div className="p-2">Loading patients...</div>
                       ) : filteredPatients?.length ? (
                         filteredPatients.map((patient: Patient) => (
                           <SelectItem key={patient.id} value={patient.id.toString()}>
                             {patient.name} - {patient.email}
                           </SelectItem>
                         ))
                       ) : (
                         <div className="p-2">No patients found</div>
                       )}
                     </SelectContent>
                   </Select>
                 </div>

                 {/* Message Type */}
                 <div className="space-y-2">
                   <Label>Message Type</Label>
                   <Select value={messageType} onValueChange={(value: any) => setMessageType(value)}>
                     <SelectTrigger>
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="email">
                         <div className="flex items-center gap-2">
                           <Mail className="h-4 w-4" />
                           Email
                         </div>
                       </SelectItem>
                       <SelectItem value="sms">
                         <div className="flex items-center gap-2">
                           <MessageSquare className="h-4 w-4" />
                           SMS
                         </div>
                       </SelectItem>
                       <SelectItem value="message">
                         <div className="flex items-center gap-2">
                           <MessageSquare className="h-4 w-4" />
                           Portal Message
                         </div>
                       </SelectItem>
                       <SelectItem value="portal">
                         <div className="flex items-center gap-2">
                           <Phone className="h-4 w-4" />
                           Portal Notification
                         </div>
                       </SelectItem>
                     </SelectContent>
                   </Select>
                 </div>

                 {/* Subject (for email) */}
                 {messageType === "email" && (
                   <div className="space-y-2">
                     <Label htmlFor="subject">Subject</Label>
                     <Input
                       id="subject"
                       value={subject}
                       onChange={(e) => setSubject(e.target.value)}
                       placeholder="Enter email subject..."
                     />
                   </div>
                 )}

                 {/* Message Content */}
                 <div className="space-y-2">
                   <Label htmlFor="content">Message</Label>
                   <Textarea
                     id="content"
                     value={content}
                     onChange={(e) => setContent(e.target.value)}
                     placeholder="Type your message here..."
                     rows={6}
                   />
                 </div>

                 {/* Template Buttons */}
                 <div className="space-y-2">
                   <Label>Quick Templates</Label>
                   <div className="flex flex-wrap gap-2">
                     {templates.map((template, index) => (
                       <Button
                         key={index}
                         variant="outline"
                         size="sm"
                         onClick={() => handleTemplateUse(template.content)}
                         disabled={!selectedPatient}
                       >
                         {template.title}
                       </Button>
                     ))}
                   </div>
                 </div>

                 {/* Send Button */}
                 <Button
                   onClick={() => sendMessage.mutate()}
                   disabled={!selectedPatient || !content || sendMessage.isPending}
                   className="w-full"
                 >
                   {sendMessage.isPending ? "Sending..." : "Send Message"}
                 </Button>
               </CardContent>
             </Card>
           </TabsContent>

           <TabsContent value="templates" className="space-y-6">
             <Card>
               <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                   <Edit2 className="h-5 w-5" />
                   Message Templates
                 </CardTitle>
               </CardHeader>
               <CardContent>
                 <div className="grid gap-4 md:grid-cols-2">
                   {templates.map((template, index) => (
                     <Card key={index} className="relative">
                       <CardHeader className="pb-2">
                         <div className="flex items-center justify-between">
                           <CardTitle className="text-lg">{template.title}</CardTitle>
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => copyToClipboard(template.content)}
                           >
                             <Copy className="h-4 w-4" />
                           </Button>
                         </div>
                         <Badge variant="secondary">{template.description}</Badge>
                       </CardHeader>
                       <CardContent>
                         <p className="text-sm text-gray-600 dark:text-gray-400">
                           {template.content}
                         </p>
                       </CardContent>
                     </Card>
                   ))}
                 </div>
               </CardContent>
             </Card>
           </TabsContent>

           <TabsContent value="treatment-plans" className="space-y-6">
             <div className="grid gap-6 md:grid-cols-2">
               {/* Create/Edit Treatment Plan */}
               <Card>
                 <CardHeader>
                   <CardTitle className="flex items-center gap-2">
                     <Edit2 className="h-5 w-5" />
                     {selectedTreatmentPlan ? "Edit Treatment Plan" : "Create Treatment Plan"}
                   </CardTitle>
                 </CardHeader>
                 <CardContent className="space-y-4">
                   {/* Patient Selection */}
                   <div className="space-y-2">
                     <Label htmlFor="treatment-patient-select">Select Patient</Label>
                     <Select
                       value={selectedPatient?.id?.toString() || ""}
                       onValueChange={(value) => {
                         const patient = filteredPatients?.find((p: Patient) => p.id === parseInt(value));
                         setSelectedPatient(patient || null);
                       }}
                     >
                       <SelectTrigger>
                         <SelectValue placeholder="Choose a patient..." />
                       </SelectTrigger>
                       <SelectContent>
                         {loadingPatients ? (
                           <div className="p-2">Loading patients...</div>
                         ) : filteredPatients?.length ? (
                           filteredPatients.map((patient: Patient) => (
                             <SelectItem key={patient.id} value={patient.id.toString()}>
                               {patient.name} - {patient.email}
                             </SelectItem>
                           ))
                         ) : (
                           <div className="p-2">No patients found</div>
                         )}
                       </SelectContent>
                     </Select>
                   </div>

                   {/* Treatment Plan Title */}
                   <div className="space-y-2">
                     <Label htmlFor="treatment-title">Treatment Plan Title</Label>
                     <Input
                       id="treatment-title"
                       value={treatmentPlanTitle}
                       onChange={(e) => setTreatmentPlanTitle(e.target.value)}
                       placeholder="e.g., Ingrown Toenail Treatment Plan"
                     />
                   </div>

                   {/* Treatment Plan Description */}
                   <div className="space-y-2">
                     <Label htmlFor="treatment-description">Description</Label>
                     <Textarea
                       id="treatment-description"
                       value={treatmentPlanDescription}
                       onChange={(e) => setTreatmentPlanDescription(e.target.value)}
                       placeholder="Overall treatment plan description..."
                       rows={3}
                     />
                   </div>

                   {/* Treatment Items */}
                   <div className="space-y-4">
                     <Label>Treatment Items</Label>

                     {/* Add New Treatment Item */}
                     <Card className="p-4">
                       <div className="space-y-3">
                         <div className="grid grid-cols-2 gap-3">
                           <Input
                             placeholder="Treatment name"
                             value={newTreatmentItem.name}
                             onChange={(e) => setNewTreatmentItem({...newTreatmentItem, name: e.target.value})}
                           />
                           <Input
                             placeholder="Duration (e.g., 2 weeks)"
                             value={newTreatmentItem.duration}
                             onChange={(e) => setNewTreatmentItem({...newTreatmentItem, duration: e.target.value})}
                           />
                         </div>
                         <div className="grid grid-cols-2 gap-3">
                           <Input
                             placeholder="Frequency (e.g., daily)"
                             value={newTreatmentItem.frequency}
                             onChange={(e) => setNewTreatmentItem({...newTreatmentItem, frequency: e.target.value})}
                           />
                           <Input
                             placeholder="Notes"
                             value={newTreatmentItem.notes}
                             onChange={(e) => setNewTreatmentItem({...newTreatmentItem, notes: e.target.value})}
                           />
                         </div>
                         <Textarea
                           placeholder="Treatment description"
                           value={newTreatmentItem.description}
                           onChange={(e) => setNewTreatmentItem({...newTreatmentItem, description: e.target.value})}
                           rows={2}
                         />
                         <Button
                           onClick={addTreatmentItem}
                           disabled={!newTreatmentItem.name || !newTreatmentItem.description}
                           size="sm"
                           className="w-full"
                         >
                           Add Treatment Item
                         </Button>
                       </div>
                     </Card>

                     {/* Current Treatment Items */}
                     {treatmentItems.length > 0 && (
                       <div className="space-y-2">
                         <Label>Current Treatment Items</Label>
                         {treatmentItems.map((item, index) => (
                           <Card key={index} className="p-3">
                             <div className="flex items-start justify-between">
                               <div className="flex-1">
                                 <h4 className="font-medium">{item.name}</h4>
                                 <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                   {item.description}
                                 </p>
                                 {(item.duration || item.frequency || item.notes) && (
                                   <div className="flex gap-4 mt-2 text-xs text-gray-500">
                                     {item.duration && <span>Duration: {item.duration}</span>}
                                     {item.frequency && <span>Frequency: {item.frequency}</span>}
                                     {item.notes && <span>Notes: {item.notes}</span>}
                                   </div>
                                 )}
                               </div>
                               <Button
                                 variant="ghost"
                                 size="sm"
                                 onClick={() => removeTreatmentItem(index)}
                                 className="text-red-500 hover:text-red-700"
                               >
                                 Remove
                               </Button>
                             </div>
                           </Card>
                         ))}
                       </div>
                     )}
                   </div>

                   {/* Action Buttons */}
                   <div className="flex gap-2">
                     <Button
                       onClick={() => createTreatmentPlan.mutate()}
                       disabled={!selectedPatient || !treatmentPlanTitle || treatmentItems.length === 0 || createTreatmentPlan.isPending}
                       className="flex-1"
                     >
                       {createTreatmentPlan.isPending ? "Creating..." : selectedTreatmentPlan ? "Update Plan" : "Create Plan"}
                     </Button>
                     {selectedTreatmentPlan && (
                       <Button
                         variant="outline"
                         onClick={resetTreatmentPlanForm}
                       >
                         Cancel
                       </Button>
                     )}
                   </div>
                 </CardContent>
               </Card>

               {/* Existing Treatment Plans */}
               <Card>
                 <CardHeader>
                   <CardTitle className="flex items-center gap-2">
                     <Calendar className="h-5 w-5" />
                     Existing Treatment Plans
                   </CardTitle>
                 </CardHeader>
                 <CardContent>
                   {loadingTreatmentPlans ? (
                     <div className="text-center py-4">Loading treatment plans...</div>
                   ) : treatmentPlansData?.length ? (
                     <div className="space-y-4">
                       {treatmentPlansData.map((plan: TreatmentPlan) => (
                         <Card key={plan.id} className="p-4">
                           <div className="flex items-start justify-between">
                             <div className="flex-1">
                               <h4 className="font-medium">{plan.title}</h4>
                               <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                 {plan.description}
                               </p>
                               <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                 <span>Patient: {filteredPatients?.find((p: Patient) => p.id === plan.patientId)?.name || 'Unknown'}</span>
                                 <span>Items: {plan.treatments?.length || 0}</span>
                                 <Badge variant={plan.status === 'draft' ? 'secondary' : 'default'}>
                                   {plan.status}
                                 </Badge>
                               </div>
                             </div>
                             <Button
                               variant="outline"
                               size="sm"
                               onClick={() => editTreatmentPlan(plan)}
                             >
                               Edit
                             </Button>
                           </div>
                         </Card>
                       ))}
                     </div>
                   ) : (
                     <div className="text-center py-8 text-gray-500">
                       No treatment plans found. Create your first treatment plan to get started.
                     </div>
                   )}
                 </CardContent>
               </Card>
             </div>
           </TabsContent>

           <TabsContent value="followups" className="space-y-6">
             <Card>
               <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                   <Calendar className="h-5 w-5" />
                   Schedule Follow-up
                 </CardTitle>
               </CardHeader>
               <CardContent className="space-y-4">
                 {/* Patient Selection for Follow-up */}
                 <div className="space-y-2">
                   <Label htmlFor="followup-patient-select">Select Patient</Label>
                   <Select
                     value={selectedPatient?.id?.toString() || ""}
                     onValueChange={(value) => {
                       const patient = filteredPatients?.find((p: Patient) => p.id === parseInt(value));
                       setSelectedPatient(patient || null);
                     }}
                   >
                     <SelectTrigger>
                       <SelectValue placeholder="Choose a patient..." />
                     </SelectTrigger>
                     <SelectContent>
                       {loadingPatients ? (
                         <div className="p-2">Loading patients...</div>
                       ) : filteredPatients?.length ? (
                         filteredPatients.map((patient: Patient) => (
                           <SelectItem key={patient.id} value={patient.id.toString()}>
                             {patient.name} - {patient.email}
                           </SelectItem>
                         ))
                       ) : (
                         <div className="p-2">No patients found</div>
                       )}
                     </SelectContent>
                   </Select>
                 </div>

                 {/* Follow-up Type */}
                 <div className="space-y-2">
                   <Label>Follow-up Type</Label>
                   <Select value={followUpType} onValueChange={(value: any) => setFollowUpType(value)}>
                     <SelectTrigger>
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="appointment">Appointment Reminder</SelectItem>
                       <SelectItem value="check-in">Check-in Call</SelectItem>
                       <SelectItem value="call">General Follow-up Call</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>

                 {/* Follow-up Date */}
                 <div className="space-y-2">
                   <Label htmlFor="followup-date">Scheduled Date & Time</Label>
                   <Input
                     id="followup-date"
                     type="datetime-local"
                     value={followUpDate}
                     onChange={(e) => setFollowUpDate(e.target.value)}
                   />
                 </div>

                 {/* Follow-up Notes */}
                 <div className="space-y-2">
                   <Label htmlFor="followup-notes">Notes</Label>
                   <Textarea
                     id="followup-notes"
                     value={followUpNotes}
                     onChange={(e) => setFollowUpNotes(e.target.value)}
                     placeholder="Additional notes for the follow-up..."
                     rows={3}
                   />
                 </div>

                 {/* Schedule Button */}
                 <Button
                   onClick={() => createFollowUp.mutate()}
                   disabled={!selectedPatient || !followUpDate || createFollowUp.isPending}
                   className="w-full"
                 >
                   {createFollowUp.isPending ? "Scheduling..." : "Schedule Follow-up"}
                 </Button>
               </CardContent>
             </Card>
           </TabsContent>

           <TabsContent value="email-settings" className="space-y-6">
             <Card>
               <CardHeader>
                 <CardTitle className="flex items-center gap-2">
                   <Settings className="h-5 w-5" />
                   Email Settings for {selectedClinicGroup}
                 </CardTitle>
                 <p className="text-sm text-gray-600 dark:text-gray-400">
                   Configure email settings for this clinic. Emails sent from the Communications Hub will use these settings.
                 </p>
               </CardHeader>
               <CardContent className="space-y-6">
                 {loadingEmailSettings ? (
                   <div className="text-center py-4">Loading email settings...</div>
                 ) : (
                   <>
                     {/* Email Service Selection */}
                     <div className="space-y-2">
                       <Label>Email Service</Label>
                       <Select
                         value={emailSettings.emailService}
                         onValueChange={(value: "mailersend" | "smtp") =>
                           setEmailSettings({...emailSettings, emailService: value})
                         }
                       >
                         <SelectTrigger>
                           <SelectValue />
                         </SelectTrigger>
                         <SelectContent>
                           <SelectItem value="mailersend">MailerSend</SelectItem>
                           <SelectItem value="smtp">SMTP</SelectItem>
                         </SelectContent>
                       </Select>
                     </div>

                     {/* From Email and Name */}
                     <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                         <Label htmlFor="email-from">From Email Address</Label>
                         <Input
                           id="email-from"
                           type="email"
                           value={emailSettings.emailFrom}
                           onChange={(e) => setEmailSettings({...emailSettings, emailFrom: e.target.value})}
                           placeholder="noreply@yourclinic.com"
                         />
                       </div>
                       <div className="space-y-2">
                         <Label htmlFor="email-from-name">From Name</Label>
                         <Input
                           id="email-from-name"
                           value={emailSettings.emailFromName}
                           onChange={(e) => setEmailSettings({...emailSettings, emailFromName: e.target.value})}
                           placeholder="Your Clinic Name"
                         />
                       </div>
                     </div>

                     {/* MailerSend Settings */}
                     {emailSettings.emailService === "mailersend" && (
                       <div className="space-y-2">
                         <Label htmlFor="mailersend-api-key">MailerSend API Key</Label>
                         <Input
                           id="mailersend-api-key"
                           type="password"
                           value={emailSettings.mailerSendApiKey}
                           onChange={(e) => setEmailSettings({...emailSettings, mailerSendApiKey: e.target.value})}
                           placeholder="Your MailerSend API Key"
                         />
                         <p className="text-xs text-gray-500">
                           Get your API key from the MailerSend dashboard under Settings → API Keys.
                         </p>
                       </div>
                     )}

                     {/* SMTP Settings */}
                     {emailSettings.emailService === "smtp" && (
                       <>
                         <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                             <Label htmlFor="smtp-host">SMTP Host</Label>
                             <Input
                               id="smtp-host"
                               value={emailSettings.smtpHost}
                               onChange={(e) => setEmailSettings({...emailSettings, smtpHost: e.target.value})}
                               placeholder="smtp.gmail.com"
                             />
                           </div>
                           <div className="space-y-2">
                             <Label htmlFor="smtp-port">SMTP Port</Label>
                             <Input
                               id="smtp-port"
                               type="number"
                               value={emailSettings.smtpPort}
                               onChange={(e) => setEmailSettings({...emailSettings, smtpPort: parseInt(e.target.value) || 587})}
                               placeholder="587"
                             />
                           </div>
                         </div>

                         <div className="flex items-center space-x-2">
                           <input
                             type="checkbox"
                             id="smtp-secure"
                             checked={emailSettings.smtpSecure}
                             onChange={(e) => setEmailSettings({...emailSettings, smtpSecure: e.target.checked})}
                             className="rounded"
                           />
                           <Label htmlFor="smtp-secure">Use SSL/TLS (usually for port 465)</Label>
                         </div>

                         <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                             <Label htmlFor="smtp-user">SMTP Username</Label>
                             <Input
                               id="smtp-user"
                               value={emailSettings.smtpUser}
                               onChange={(e) => setEmailSettings({...emailSettings, smtpUser: e.target.value})}
                               placeholder="your-email@gmail.com"
                             />
                           </div>
                           <div className="space-y-2">
                             <Label htmlFor="smtp-pass">SMTP Password</Label>
                             <Input
                               id="smtp-pass"
                               type="password"
                               value={emailSettings.smtpPass}
                               onChange={(e) => setEmailSettings({...emailSettings, smtpPass: e.target.value})}
                               placeholder="your-app-password"
                             />
                           </div>
                         </div>
                       </>
                     )}

                     {/* Active Status */}
                     <div className="flex items-center space-x-2">
                       <input
                         type="checkbox"
                         id="email-active"
                         checked={emailSettings.isActive}
                         onChange={(e) => setEmailSettings({...emailSettings, isActive: e.target.checked})}
                         className="rounded"
                       />
                       <Label htmlFor="email-active">Enable email sending for this clinic</Label>
                     </div>

                     {/* Save Button */}
                     <Button
                       onClick={() => updateEmailSettings.mutate()}
                       disabled={updateEmailSettings.isPending}
                       className="w-full"
                     >
                       {updateEmailSettings.isPending ? "Saving..." : "Save Email Settings"}
                     </Button>

                     {/* Status Message */}
                     {clinicEmailSettings && (
                       <div className="text-sm text-gray-600 dark:text-gray-400">
                         Last updated: {new Date(clinicEmailSettings.updatedAt).toLocaleString()}
                       </div>
                     )}
                   </>
                 )}
               </CardContent>
             </Card>
           </TabsContent>
         </Tabs>
       </div>
     </div>
   </>
 );
}
