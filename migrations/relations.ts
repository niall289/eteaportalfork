import { relations } from "drizzle-orm/relations";
import { patients, followUps, assessments, communications, responses, questions, assessmentConditions, conditions } from "./schema";

export const followUpsRelations = relations(followUps, ({one}) => ({
	patient: one(patients, {
		fields: [followUps.patientId],
		references: [patients.id]
	}),
	assessment: one(assessments, {
		fields: [followUps.assessmentId],
		references: [assessments.id]
	}),
}));

export const patientsRelations = relations(patients, ({many}) => ({
	followUps: many(followUps),
	communications: many(communications),
	assessments: many(assessments),
}));

export const assessmentsRelations = relations(assessments, ({one, many}) => ({
	followUps: many(followUps),
	patient: one(patients, {
		fields: [assessments.patientId],
		references: [patients.id]
	}),
	responses: many(responses),
	assessmentConditions: many(assessmentConditions),
}));

export const communicationsRelations = relations(communications, ({one}) => ({
	patient: one(patients, {
		fields: [communications.patientId],
		references: [patients.id]
	}),
}));

export const responsesRelations = relations(responses, ({one}) => ({
	assessment: one(assessments, {
		fields: [responses.assessmentId],
		references: [assessments.id]
	}),
	question: one(questions, {
		fields: [responses.questionId],
		references: [questions.id]
	}),
}));

export const questionsRelations = relations(questions, ({many}) => ({
	responses: many(responses),
}));

export const assessmentConditionsRelations = relations(assessmentConditions, ({one}) => ({
	assessment: one(assessments, {
		fields: [assessmentConditions.assessmentId],
		references: [assessments.id]
	}),
	condition: one(conditions, {
		fields: [assessmentConditions.conditionId],
		references: [conditions.id]
	}),
}));

export const conditionsRelations = relations(conditions, ({many}) => ({
	assessmentConditions: many(assessmentConditions),
}));