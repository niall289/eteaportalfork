CREATE TABLE "clinic_email_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"clinic_group" text NOT NULL,
	"email_from" varchar(255) NOT NULL,
	"email_from_name" varchar(255) NOT NULL,
	"smtp_host" varchar(255),
	"smtp_port" integer DEFAULT 587,
	"smtp_secure" boolean DEFAULT false,
	"smtp_user" varchar(255),
	"smtp_pass" text,
	"sendgrid_api_key" text,
	"email_service" varchar(50) DEFAULT 'sendgrid',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "clinic_email_settings_clinic_group_unique" UNIQUE("clinic_group")
);
--> statement-breakpoint
CREATE TABLE "treatment_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"treatments" jsonb,
	"status" varchar(50) DEFAULT 'draft',
	"created_by" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "consultations" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "consultations" ADD COLUMN "symptom_analysis" text;--> statement-breakpoint
ALTER TABLE "consultations" ADD COLUMN "pain_duration" text;--> statement-breakpoint
ALTER TABLE "consultations" ADD COLUMN "pain_severity" text;--> statement-breakpoint
ALTER TABLE "consultations" ADD COLUMN "additional_info" text;--> statement-breakpoint
ALTER TABLE "treatment_plans" ADD CONSTRAINT "treatment_plans_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clinic_email_settings_clinic_group_idx" ON "clinic_email_settings" USING btree ("clinic_group");