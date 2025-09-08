// ClinicEngage Admin Dashboard Template Configuration
// Customize these settings for each new clinic client

export const CLINIC_CONFIG = {
  // Clinic Branding
  clinic: {
    name: "FootCare Clinic",
    tagline: "Professional Foot Care Services",
    logo: "/assets/clinic-logo.png",
    website: "https://footcareclinic.ie",
    domain: "footcareclinicadmin.engageiobots.com"
  },

  // Color Scheme (CSS custom properties)
  theme: {
    primary: "174 100% 29%", // Teal for FootCare Clinic
    primaryForeground: "0 0% 98%",
    secondary: "174 30% 41%",
    accent: "174 84% 60%",
    background: "0 0% 100%",
    foreground: "224 71% 4%"
  },

  // Clinic Locations
  locations: [
    {
      id: 1,
      name: "FootCare Clinic Donnycarney",
      address: "123 Collins Avenue",
      city: "Donnycarney",
      state: "Dublin",
      zipCode: "D05 X1Y2",
      latitude: "53.3751",
      longitude: "-6.2000",
      phone: "+353 1 234 5678",
      email: "donnycarney@footcareclinic.ie",
      isActive: true
    },
    {
      id: 2,
      name: "FootCare Clinic Palmerstown",
      address: "456 Kennelsfort Road",
      city: "Palmerstown",
      state: "Dublin",
      zipCode: "D20 A1B2",
      latitude: "53.3526",
      longitude: "-6.3789",
      phone: "+353 1 234 5679",
      email: "palmerstown@footcareclinic.ie",
      isActive: true
    },
    {
      id: 3,
      name: "FootCare Clinic Baldoyle",
      address: "789 Main Street",
      city: "Baldoyle",
      state: "Dublin",
      zipCode: "D13 C3D4",
      latitude: "53.3967",
      longitude: "-6.1261",
      phone: "+353 1 234 5680",
      email: "baldoyle@footcareclinic.ie",
      isActive: true
    }
  ],

  // Authentication
  auth: {
    adminPassword: "footcare2025", // Change for each client
    sessionSecret: process.env.SESSION_SECRET || "clinic-admin-secret"
  },

  // Chatbot Integration
  chatbot: {
    webhookPath: "/api/webhook/chatbot",
    chatbotUrl: "footcareclinic-chat-assistant.replit.app",
    personaName: "Fiona" // Chatbot persona name
  },

  // Communication Templates
  templates: {
    thankYou: `Dear {patientName},

Thank you for using our foot care assessment service. We've received your responses and our team will review them shortly.

Best regards,
{clinicName} Team`,

    treatmentPlan: `Dear {patientName},

Based on your assessment, we recommend the following treatment plan:

{treatmentDetails}

Please contact us at {clinicPhone} to schedule your appointment.

Best regards,
{clinicName} Team`,

    satisfactionSurvey: `Dear {patientName},

We hope you found our service helpful. Please take a moment to rate your experience:

{surveyLink}

Thank you for choosing {clinicName}.

Best regards,
{clinicName} Team`
  },

  // Dashboard Settings
  dashboard: {
    defaultTimeRange: "30days",
    refreshInterval: 30000, // 30 seconds
    maxRecentAssessments: 10
  }
};

// Environment-specific overrides
export const ENV_CONFIG = {
  development: {
    database: process.env.DATABASE_URL,
    debugMode: true
  },
  production: {
    database: process.env.DATABASE_URL,
    debugMode: false
  }
};