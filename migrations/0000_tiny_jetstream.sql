DO $enum$
BEGIN
    -- Create the enum type if it doesn't already exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chatbot_tone') THEN
        CREATE TYPE "public"."chatbot_tone" AS ENUM('Friendly', 'Professional', 'Clinical', 'Casual');
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        -- Enum already exists, do nothing
        NULL;
END $enum$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assessment_conditions" (
	"assessment_id" integer NOT NULL,
	"condition_id" integer NOT NULL,
	CONSTRAINT "assessment_conditions_assessment_id_condition_id_pk" PRIMARY KEY("assessment_id","condition_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assessments" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"completed_at" timestamp,
	"status" varchar DEFAULT 'in_progress' NOT NULL,
	"risk_level" varchar,
	"primary_concern" varchar,
	"score" integer,
	"clinic_location" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chatbot_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"welcome_message" text DEFAULT 'Welcome to FootCare Clinic! Let''''s get started.',
	"bot_display_name" varchar DEFAULT 'Fiona - FootCare Assistant',
	"cta_button_label" varchar DEFAULT 'Ask Fiona',
	"chatbot_tone" "chatbot_tone" DEFAULT 'Friendly',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "clinics" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"address" varchar NOT NULL,
	"city" varchar NOT NULL,
	"state" varchar,
	"zip_code" varchar,
	"latitude" varchar NOT NULL,
	"longitude" varchar NOT NULL,
	"phone" varchar,
	"email" varchar,
	"clinic_message" text DEFAULT '',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "communications" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"type" varchar(50) NOT NULL,
	"subject" varchar(255),
	"message" text NOT NULL,
	"sent_by" varchar(100) NOT NULL,
	"status" varchar(50) DEFAULT 'sent',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "conditions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "conditions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "consultations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"preferred_clinic" text,
	"issue_category" text,
	"issue_specifics" text,
	"symptom_description" text,
	"previous_treatment" text,
	"has_image" text,
	"image_path" text,
	"image_analysis" text,
	"calendar_booking" text,
	"booking_confirmation" text,
	"final_question" text,
	"additional_help" text,
	"emoji_survey" text,
	"survey_response" text,
	"conversation_log" jsonb,
	"completed_steps" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "follow_ups" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"assessment_id" integer,
	"type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"scheduled_for" timestamp NOT NULL,
	"status" varchar(50) DEFAULT 'pending',
	"assigned_to" varchar(100),
	"created_by" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"consultation_id" integer NOT NULL,
	"url" text NOT NULL,
	"source_type" text NOT NULL,
	"meta" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "patients" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"age" integer,
	"gender" text,
	"insurance_type" text,
	"date_of_birth" timestamp,
	"clinic_group" text DEFAULT 'FootCare Clinic',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "patients_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"category" varchar,
	"order" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "responses" (
	"id" serial PRIMARY KEY NOT NULL,
	"assessment_id" integer NOT NULL,
	"question_id" integer NOT NULL,
	"answer" text,
	"flagged" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"email" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$
BEGIN
  ALTER TABLE "assessment_conditions" ADD CONSTRAINT "assessment_conditions_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $$
BEGIN
  ALTER TABLE "assessment_conditions" ADD CONSTRAINT "assessment_conditions_condition_id_conditions_id_fk" FOREIGN KEY ("condition_id") REFERENCES "public"."conditions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
DO $ BEGIN
  ALTER TABLE "assessments" ADD CONSTRAINT "assessments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $;--> statement-breakpoint
DO $ BEGIN
  ALTER TABLE "communications" ADD CONSTRAINT "communications_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $;--> statement-breakpoint
DO $ BEGIN
  ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $;--> statement-breakpoint
DO $ BEGIN
  ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $;--> statement-breakpoint
DO $ BEGIN
  ALTER TABLE "images" ADD CONSTRAINT "images_consultation_id_consultations_id_fk" FOREIGN KEY ("consultation_id") REFERENCES "public"."consultations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $;--> statement-breakpoint
DO $ BEGIN
  ALTER TABLE "responses" ADD CONSTRAINT "responses_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $;--> statement-breakpoint
DO $ BEGIN
  ALTER TABLE "responses" ADD CONSTRAINT "responses_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "images_consultation_id_idx" ON "images" USING btree ("consultation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "images_created_at_idx" ON "images" USING btree ("created_at");