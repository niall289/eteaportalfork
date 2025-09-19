import {
  pgTable,
  text,
  serial,
  timestamp,
  varchar,
  jsonb,
  index,
  integer,
  boolean,
  primaryKey,
  pgEnum,
  uuid,
  check
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations, sql } from "drizzle-orm";

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  name: varchar("name").notNull(),
  email: varchar("email").unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Patient table
export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  age: integer("age"),
  gender: text("gender"),
  insuranceType: text("insurance_type"),
  dateOfBirth: timestamp("date_of_birth"),
  clinic_group: text("clinic_group").default("FootCare Clinic"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Assessment table
export const assessments = pgTable("assessments", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  completedAt: timestamp("completed_at"),
  status: varchar("status").default("in_progress").notNull(),
  riskLevel: varchar("risk_level"),
  primaryConcern: varchar("primary_concern"),
  score: integer("score"),
  clinicLocation: varchar("clinic_location"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Questions table
export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
  category: varchar("category"),
  order: integer("order"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Responses table
export const responses = pgTable("responses", {
  id: serial("id").primaryKey(),
  assessmentId: integer("assessment_id").notNull().references(() => assessments.id),
  questionId: integer("question_id").notNull().references(() => questions.id),
  answer: text("answer"),
  flagged: boolean("flagged").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Conditions table
export const conditions = pgTable("conditions", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Clinics table — ✅ updated with clinicMessage field
export const clinics = pgTable("clinics", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  address: varchar("address").notNull(),
  city: varchar("city").notNull(),
  state: varchar("state"),
  zipCode: varchar("zip_code"),
  latitude: varchar("latitude").notNull(),
  longitude: varchar("longitude").notNull(),
  phone: varchar("phone"),
  email: varchar("email"),
  clinicMessage: text("clinic_message").default(""), // ✅ added field
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Many-to-many: assessmentConditions
export const assessmentConditions = pgTable("assessment_conditions", {
  assessmentId: integer("assessment_id").notNull().references(() => assessments.id),
  conditionId: integer("condition_id").notNull().references(() => conditions.id),
}, (t) => ({
  pk: primaryKey(t.assessmentId, t.conditionId),
}));

// Communications
export const communications = pgTable("communications", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  type: varchar("type", { length: 50 }).notNull(),
  subject: varchar("subject", { length: 255 }),
  message: text("message").notNull(),
  sentBy: varchar("sent_by", { length: 100 }).notNull(),
  status: varchar("status", { length: 50 }).default("sent"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Follow-ups
export const followUps = pgTable("follow_ups", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  assessmentId: integer("assessment_id").references(() => assessments.id),
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  scheduledFor: timestamp("scheduled_for").notNull(),
  status: varchar("status", { length: 50 }).default("pending"),
  assignedTo: varchar("assigned_to", { length: 100 }),
  createdBy: varchar("created_by", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Consultations — mirrors chatbot output
export const consultations = pgTable("consultations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  preferred_clinic: text("preferred_clinic"),
  issue_category: text("issue_category"),
  issue_specifics: text("issue_specifics"),
  symptom_description: text("symptom_description"),
  previous_treatment: text("previous_treatment"),
  has_image: text("has_image"),
  image_path: text("image_path"),
  image_analysis: text("image_analysis"),
  calendar_booking: text("calendar_booking"),
  booking_confirmation: text("booking_confirmation"),
  final_question: text("final_question"),
  additional_help: text("additional_help"),
  emoji_survey: text("emoji_survey"),
  survey_response: text("survey_response"),
  conversation_log: jsonb("conversation_log"),
  completed_steps: jsonb("completed_steps"),
  raw_json: jsonb("raw_json"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Images table for storing consultation images
export const images = pgTable("images", {
  id: uuid("id").primaryKey().defaultRandom(),
  consultationId: integer("consultation_id").notNull().references(() => consultations.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  sourceType: text("source_type").notNull().$type<"upload" | "link">(),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  sourceTypeCheck: check("images_source_type_check", sql`${table.sourceType} in ('upload', 'link')`),
  compositeIdx: index("images_consultation_id_created_at_idx").on(table.consultationId, table.createdAt),
}));

// Chatbot tone enum
export const chatbotToneEnum = pgEnum('chatbot_tone', ['Friendly', 'Professional', 'Clinical', 'Casual']);

// Chatbot settings
export const chatbotSettings = pgTable("chatbot_settings", {
  id: serial("id").primaryKey(),
  clinicGroup: text("clinic_group").notNull(),
  welcomeMessage: text("welcome_message").default("Welcome to FootCare Clinic! Let''s get started."),
  botDisplayName: varchar("bot_display_name").default("Fiona - FootCare Assistant"),
  ctaButtonLabel: varchar("cta_button_label").default("Ask Fiona"),
  chatbotTone: chatbotToneEnum("chatbot_tone").default("Friendly"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  clinicGroupIdx: index("chatbot_settings_clinic_group_idx").on(table.clinicGroup),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  id: true, name: true, email: true
});
export const insertPatientSchema = createInsertSchema(patients).pick({
  name: true, email: true, phone: true, dateOfBirth: true
});
export const insertAssessmentSchema = createInsertSchema(assessments).pick({
  patientId: true, status: true, riskLevel: true, primaryConcern: true,
  completedAt: true, score: true, clinicLocation: true
});
export const insertResponseSchema = createInsertSchema(responses).pick({
  assessmentId: true, questionId: true, answer: true, flagged: true
});
export const insertQuestionSchema = createInsertSchema(questions).pick({
  text: true, category: true, order: true
});
export const insertConditionSchema = createInsertSchema(conditions).pick({
  name: true, description: true
});
export const insertClinicSchema = createInsertSchema(clinics).pick({
  name: true, address: true, city: true, state: true, zipCode: true,
  latitude: true, longitude: true, phone: true, email: true,
  clinicMessage: true, isActive: true
});
export const insertChatbotSettingsSchema = createInsertSchema(chatbotSettings, {
  welcomeMessage: z.string().min(10).optional(),
  botDisplayName: z.string().min(3).optional(),
  ctaButtonLabel: z.string().min(3).optional(),
}).pick({
  clinicGroup: true, welcomeMessage: true, botDisplayName: true, ctaButtonLabel: true, chatbotTone: true
});
export const insertConsultationSchema = createInsertSchema(consultations).extend({
  raw_json: z.any().optional(),
});
export const insertImageSchema = createInsertSchema(images).pick({
  consultationId: true,
  url: true,
  thumbnailUrl: true,
  sourceType: true,
  meta: true,
});

// Individual field validation schemas
export const nameSchema = z.string().min(2, "Name must be at least 2 characters");
export const phoneSchema = z.string().regex(/^[\+]?[0-9\s\-\(\)]{10,}$/, "Invalid phone number");
export const emailSchema = z.string().email("Invalid email address");

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = Partial<InsertUser> & { id: string };
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type InsertAssessment = z.infer<typeof insertAssessmentSchema>;
export type InsertResponse = z.infer<typeof insertResponseSchema>;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type InsertCondition = z.infer<typeof insertConditionSchema>;
export type InsertClinic = z.infer<typeof insertClinicSchema>;
export type InsertChatbotSettings = z.infer<typeof insertChatbotSettingsSchema>;
export type InsertConsultation = z.infer<typeof insertConsultationSchema>;
export type InsertImage = z.infer<typeof insertImageSchema>;
export type Image = typeof images.$inferSelect;
export type User = typeof users.$inferSelect;
export type Patient = typeof patients.$inferSelect;
export type Assessment = typeof assessments.$inferSelect;
export type Response = typeof responses.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type Condition = typeof conditions.$inferSelect;
export type Clinic = typeof clinics.$inferSelect;
export type ChatbotSettings = typeof chatbotSettings.$inferSelect;
export type Consultation = typeof consultations.$inferSelect & {
  firstImageUrl?: string | null;
  firstThumbnailUrl?: string | null;
};

// Relations (optional — same as before if needed)