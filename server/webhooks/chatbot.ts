// server/webhooks/chatbot.ts

export const chatStepToField: Record<string, string> = {
  "Welcome": "welcome_message",
  "Name": "name",
  "Email": "email", 
  "Phone": "phone",
  "Clinic Selection": "preferred_clinic",
  "Issue Category": "issue_category",
  "Issue Specifics": "issue_specifics",
  "Pain Duration": "pain_duration",
  "Pain Severity": "pain_severity",
  "Additional Info": "additional_info",
  "Previous Treatment": "previous_treatment",
  "Image Upload": "has_image",
  "Image Analysis": "image_analysis",
  "Symptom Description": "symptom_description",
  "Symptom Analysis": "symptom_analysis",
  "Calendar Booking": "calendar_booking",
  "Booking Confirmation": "booking_confirmation",
  "Final Question": "final_question",
  "Additional Help": "additional_help",
  "Emoji Survey": "emoji_survey",
  "Survey Response": "survey_response"
};

// Map clinic locations to clinic groups
function mapClinicLocationToGroup(clinicLocation: string): string {
  if (!clinicLocation) return "FootCare Clinic";

  const location = clinicLocation.toLowerCase();

  // Map nail surgery related clinics
  if (location.includes("nail") || location.includes("surgery")) {
    return "The Nail Surgery Clinic";
  }

  // Map laser care related clinics  
  if (location.includes("laser") || location.includes("care")) {
    return "The Laser Care Clinic";
  }

  // Default to FootCare Clinic
  return "FootCare Clinic";
}

export async function handleChatbotWebhook(req: any, res: any, storage: any) {
  try {
    console.log('🎯 Webhook received:', JSON.stringify(req.body, null, 2));

    const data = req.body;

    // Extract clinic group from preferred clinic
    const clinicGroup = mapClinicLocationToGroup(data.preferred_clinic || "");
    console.log('🏥 Mapped clinic group:', clinicGroup, 'from location:', data.preferred_clinic);

    // Find or create patient
    let patient = await storage.getPatientByEmail(data.email);

    if (!patient) {
      console.log('👤 Creating new patient for clinic group:', clinicGroup);
      patient = await storage.createPatient({
        name: data.name,
        email: data.email,
        phone: data.phone,
        clinic_group: clinicGroup
      });
    } else {
      // Update existing patient's clinic group
      console.log('👤 Updating existing patient clinic group to:', clinicGroup);
      await storage.updatePatient(patient.id, { 
        clinic_group: clinicGroup 
      });
      patient.clinic_group = clinicGroup;
    }

    // Create assessment
    const assessment = await storage.createAssessment({
      patientId: patient.id,
      status: 'completed',
      completedAt: new Date(),
      riskLevel: 'medium',
      primaryConcern: data.issue_category || 'general_consultation',
      clinicLocation: data.preferred_clinic
    });

    console.log('✅ Assessment created:', assessment.id, 'for clinic group:', clinicGroup);

    // Store consultation data
    const consultation = await storage.createConsultation({
      name: data.name,
      email: data.email,
      phone: data.phone,
      preferred_clinic: data.preferred_clinic,
      issue_category: data.issue_category,
      issue_specifics: data.issue_specifics,
      pain_duration: data.pain_duration,
      pain_severity: data.pain_severity,
      additional_info: data.additional_info,
      previous_treatment: data.previous_treatment,
      has_image: data.has_image,
      image_path: data.image_path,
      image_analysis: data.image_analysis,
      symptom_description: data.symptom_description,
      symptom_analysis: data.symptom_analysis,
      conversation_log: data.conversation_log || [],
      calendar_booking: data.calendar_booking,
      booking_confirmation: data.booking_confirmation,
      final_question: data.final_question,
      additional_help: data.additional_help,
      emoji_survey: data.emoji_survey,
      survey_response: data.survey_response
    });

    console.log('💾 Consultation stored:', consultation.id);

    res.json({ 
      success: true, 
      message: 'Consultation processed successfully',
      patientId: patient.id,
      assessmentId: assessment.id,
      consultationId: consultation.id,
      clinicGroup: clinicGroup
    });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to process consultation',
      error: error.message 
    });
  }
}