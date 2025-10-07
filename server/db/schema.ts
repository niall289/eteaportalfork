import { pgTable, bigserial, text, boolean, timestamp, jsonb, index } from "drizzle-orm/pg-core";

export const consultations = pgTable("consultations", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  clinic: text("clinic").notNull(),
  name: text("name"),
  email: text("email"),
  phone: text("phone").notNull(),
  preferred_clinic: text("preferred_clinic"),
  issue_category: text("issue_category"),
  symptom_description: text("symptom_description"),
  previous_treatment: text("previous_treatment"),
  has_image: boolean("has_image").default(false),
  image_url: text("image_url"),
  created_at: timestamp("created_at").defaultNow(),
  extras: jsonb("extras"),
}, (table) => ({
  clinicCreatedAtIdx: index("consultations_clinic_created_at_idx").on(table.clinic, table.created_at.desc()),
  emailIdx: index("consultations_email_idx").on(table.email),
}));