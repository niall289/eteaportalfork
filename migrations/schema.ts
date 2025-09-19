import { pgTable, unique, serial, varchar, text, timestamp, foreignKey, integer, boolean, jsonb, real, primaryKey, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const chatbotTone = pgEnum("chatbot_tone", ['Friendly', 'Professional', 'Clinical', 'Casual'])


export const conditions = pgTable("conditions", {
	id: serial().primaryKey().notNull(),
	name: varchar().notNull(),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("conditions_name_unique").on(table.name),
]);

export const chatbotSettings = pgTable("chatbot_settings", {
	id: serial().primaryKey().notNull(),
	welcomeMessage: text("welcome_message").default('Welcome to FootCare Clinic! Let\'s get started.'),
	botDisplayName: varchar("bot_display_name").default('Fiona - FootCare Assistant'),
	ctaButtonLabel: varchar("cta_button_label").default('Ask Fiona'),
	chatbotTone: chatbotTone("chatbot_tone").default('Friendly'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const followUps = pgTable("follow_ups", {
	id: serial().primaryKey().notNull(),
	patientId: integer("patient_id").notNull(),
	assessmentId: integer("assessment_id"),
	type: varchar({ length: 50 }).notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	scheduledFor: timestamp("scheduled_for", { mode: 'string' }).notNull(),
	status: varchar({ length: 50 }).default('pending'),
	assignedTo: varchar("assigned_to", { length: 100 }),
	createdBy: varchar("created_by", { length: 100 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.patientId],
			foreignColumns: [patients.id],
			name: "follow_ups_patient_id_patients_id_fk"
		}),
	foreignKey({
			columns: [table.assessmentId],
			foreignColumns: [assessments.id],
			name: "follow_ups_assessment_id_assessments_id_fk"
		}),
]);

export const communications = pgTable("communications", {
	id: serial().primaryKey().notNull(),
	patientId: integer("patient_id").notNull(),
	type: varchar({ length: 50 }).notNull(),
	subject: varchar({ length: 255 }),
	message: text().notNull(),
	sentBy: varchar("sent_by", { length: 100 }).notNull(),
	status: varchar({ length: 50 }).default('sent'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.patientId],
			foreignColumns: [patients.id],
			name: "communications_patient_id_patients_id_fk"
		}),
]);

export const clinics = pgTable("clinics", {
	id: serial().primaryKey().notNull(),
	name: varchar().notNull(),
	address: varchar().notNull(),
	city: varchar().notNull(),
	state: varchar(),
	zipCode: varchar("zip_code"),
	latitude: varchar().notNull(),
	longitude: varchar().notNull(),
	phone: varchar(),
	email: varchar(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	clinicMessage: text("clinic_message").default('),
});

export const assessments = pgTable("assessments", {
	id: serial().primaryKey().notNull(),
	patientId: integer("patient_id").notNull(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	status: varchar().default('in_progress').notNull(),
	riskLevel: varchar("risk_level"),
	primaryConcern: varchar("primary_concern"),
	score: integer(),
	clinicLocation: varchar("clinic_location"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.patientId],
			foreignColumns: [patients.id],
			name: "assessments_patient_id_patients_id_fk"
		}),
]);

export const consultations = pgTable("consultations", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	email: text().notNull(),
	phone: text().notNull(),
	preferredClinic: text("preferred_clinic"),
	issueCategory: text("issue_category"),
	issueSpecifics: text("issue_specifics"),
	symptomDescription: text("symptom_description"),
	previousTreatment: text("previous_treatment"),
	hasImage: text("has_image"),
	imagePath: text("image_path"),
	imageAnalysis: text("image_analysis"),
	calendarBooking: text("calendar_booking"),
	bookingConfirmation: text("booking_confirmation"),
	finalQuestion: text("final_question"),
	additionalHelp: text("additional_help"),
	emojiSurvey: text("emoji_survey"),
	surveyResponse: text("survey_response"),
	conversationLog: jsonb("conversation_log"),
	completedSteps: jsonb("completed_steps"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	clinic: text(),
	notes: text(),
});

export const questions = pgTable("questions", {
	id: serial().primaryKey().notNull(),
	text: text().notNull(),
	category: varchar(),
	order: integer(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const responses = pgTable("responses", {
	id: serial().primaryKey().notNull(),
	assessmentId: integer("assessment_id").notNull(),
	questionId: integer("question_id").notNull(),
	answer: text(),
	flagged: boolean().default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.assessmentId],
			foreignColumns: [assessments.id],
			name: "responses_assessment_id_assessments_id_fk"
		}),
	foreignKey({
			columns: [table.questionId],
			foreignColumns: [questions.id],
			name: "responses_question_id_questions_id_fk"
		}),
]);

export const patients = pgTable("patients", {
	id: serial().primaryKey().notNull(),
	name: varchar().notNull(),
	email: varchar(),
	phone: varchar(),
	age: integer(),
	gender: varchar(),
	insuranceType: varchar("insurance_type"),
	dateOfBirth: timestamp("date_of_birth", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	clinicGroup: text("clinic_group").default('FootCare Clinic'),
}, (table) => [
	unique("patients_email_unique").on(table.email),
]);

export const playingWithNeon = pgTable("playing_with_neon", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	value: real(),
});

export const assessmentConditions = pgTable("assessment_conditions", {
	assessmentId: integer("assessment_id").notNull(),
	conditionId: integer("condition_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.assessmentId],
			foreignColumns: [assessments.id],
			name: "assessment_conditions_assessment_id_assessments_id_fk"
		}),
	foreignKey({
			columns: [table.conditionId],
			foreignColumns: [conditions.id],
			name: "assessment_conditions_condition_id_conditions_id_fk"
		}),
	primaryKey({ columns: [table.assessmentId, table.conditionId], name: "assessment_conditions_assessment_id_condition_id_pk"}),
]);
