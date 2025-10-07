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
ALTER TABLE "treatment_plans" ADD CONSTRAINT "treatment_plans_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;