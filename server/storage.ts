import {
  users,
  patients,
  assessments,
  questions,
  responses,
  conditions,
  clinics,
  assessmentConditions,
  communications,
  followUps,
  consultations,
  images,
  chatbotSettings,
  type UpsertUser,
  type User,
  type InsertPatient,
  type Patient,
  type InsertAssessment,
  type Assessment,
  type InsertResponse,
  type Response,
  type InsertQuestion,
  type Question,
  type InsertCondition,
  type Condition,
  type InsertClinic,
  type Clinic,
  type InsertConsultation,
  type Consultation,
  // ChatbotSettingsSchemaType, InsertChatbotSettingsSchemaType are not used from schema directly for ChatbotSettingsData
} from "@shared/schema";
import { db } from "./db"; // db can be null if DATABASE_URL is not set
import { eq, and, desc, sql, count, like, or, between, asc, inArray } from "drizzle-orm";

// Mock mode flag - only enable mock mode if MOCK_DB='1'
const isMockMode = process.env.MOCK_DB === '1';

// Define ChatbotSettings structure
export interface ChatbotSettingsData {
  id?: number;
  clinicGroup?: string;
  welcomeMessage?: string;
  botDisplayName?: string;
  ctaButtonLabel?: string;
  chatbotTone?: 'Friendly' | 'Professional' | 'Clinical' | 'Casual';
  createdAt?: Date;
  updatedAt?: Date;
}

// Interface for storage operations
export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getPatients(options?: { limit?: number; offset?: number; search?: string }): Promise<Patient[]>;
  getPatientById(id: number): Promise<Patient | undefined>;
  getPatientByEmail(email: string): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: number, patient: Partial<InsertPatient>): Promise<Patient | undefined>;
  getPatientsCount(search?: string): Promise<number>;
  getAssessments(options?: { limit?: number; offset?: number; patientId?: number; status?: string; riskLevel?: string; startDate?: Date; endDate?: Date; clinicLocation?: string; }): Promise<Assessment[]>;
  getAssessmentsCount(options?: { patientId?: number; status?: string; riskLevel?: string; startDate?: Date; endDate?: Date; clinicLocation?: string; }): Promise<number>;
  getAssessmentById(id: number): Promise<Assessment | undefined>;
  createAssessment(assessment: InsertAssessment): Promise<Assessment>;
  updateAssessment(id: number, assessment: Partial<InsertAssessment>): Promise<Assessment | undefined>;
  getAssessmentsByDateRange(startDate: Date, endDate: Date): Promise<Assessment[]>;
  getRecentAssessments(limit?: number): Promise<Assessment[]>;
  getResponsesByAssessmentId(assessmentId: number): Promise<Response[]>;
  createResponse(response: InsertResponse): Promise<Response>;
  updateResponse(id: number, response: Partial<InsertResponse>): Promise<Response | undefined>;
  getFlaggedResponses(): Promise<Response[]>;
  getFlaggedResponsesCount(): Promise<number>;
  getQuestions(): Promise<Question[]>;
  getQuestionById(id: number): Promise<Question | undefined>;
  createQuestion(question: InsertQuestion): Promise<Question>;
  getConditions(): Promise<Condition[]>;
  createCondition(condition: InsertCondition): Promise<Condition>;
  getConditionById(id: number): Promise<Condition | undefined>;
  getTopConditions(limit?: number): Promise<{ condition: string; count: number }[]>;
  getClinics(): Promise<Clinic[]>;
  getClinicById(id: number): Promise<Clinic | undefined>;
  createClinic(clinic: InsertClinic): Promise<Clinic>;
  updateClinic(id: number, clinic: Partial<InsertClinic>): Promise<Clinic | undefined>;
  getClinicAssessmentCounts(): Promise<{ clinic: Clinic; count: number }[]>;
  getCompletedAssessmentsCount(): Promise<number>;
  getWeeklyAssessmentsCount(): Promise<number>;
  getAssessmentsTrend(days?: number): Promise<{ date: string; count: number }[]>;
  getChatbotSettings(clinicGroup: string): Promise<ChatbotSettingsData | null>;
  updateChatbotSettings(clinicGroup: string, settings: Partial<ChatbotSettingsData>): Promise<ChatbotSettingsData>;
  createConsultation(consultationData: InsertConsultation): Promise<Consultation>;
  getConsultations(options?: { limit?: number; offset?: number; clinic_group?: string; startDate?: Date; endDate?: Date; q?: string }): Promise<Consultation[]>;
  getConsultationById(id: number): Promise<Consultation>;
}


// In-memory store for chatbot settings
let chatbotSettingsStore: ChatbotSettingsData = {
  id: 1,
  welcomeMessage: "Hello! How can I help you with your foot care needs today?",
  botDisplayName: "Fiona - FootCare Assistant",
  ctaButtonLabel: "Ask Fiona",
  chatbotTone: "Friendly",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const DB_UNAVAILABLE_WARNING = "Database not available. Operating in mock/limited mode. Data will not be persisted.";

// In-memory stores for mock data when db is not available
let mockPatients: Patient[] = [];
let mockAssessments: Assessment[] = [];
let mockConsultations: Consultation[] = [];
let mockConditions: Condition[] = [];
let mockIdCounter = 1;

export class DatabaseStorage implements IStorage {
  private logMockWarning(methodName: string, data?: any) {
    console.warn(`[${methodName}] ${DB_UNAVAILABLE_WARNING}`);
    if (data) {
      console.log(`[${methodName}] Mock operation with data:`, JSON.stringify(data, null, 2));
    }
  }

  // Clinic operations (Original - will fail if db is null)
  async getClinics(): Promise<Clinic[]> {
    if (!db) throw new Error(DB_UNAVAILABLE_WARNING + " (getClinics)");
    return db.select().from(clinics).orderBy(asc(clinics.name));
  }

  async getClinicById(id: number): Promise<Clinic | undefined> {
    if (!db) throw new Error(DB_UNAVAILABLE_WARNING + " (getClinicById)");
    const [clinic] = await db.select().from(clinics).where(eq(clinics.id, id));
    return clinic;
  }

  async createClinic(clinicData: InsertClinic): Promise<Clinic> {
    if (!db) throw new Error(DB_UNAVAILABLE_WARNING + " (createClinic)");
    const [clinic] = await db.insert(clinics).values(clinicData).returning();
    return clinic;
  }

  async updateClinic(id: number, clinicData: Partial<InsertClinic>): Promise<Clinic | undefined> {
    if (!db) throw new Error(DB_UNAVAILABLE_WARNING + " (updateClinic)");
    const [updatedClinic] = await db
      .update(clinics)
      .set({ ...clinicData, updatedAt: new Date() })
      .where(eq(clinics.id, id))
      .returning();
    return updatedClinic;
  }

  async getClinicAssessmentCounts(): Promise<{ clinic: Clinic; count: number }[]> {
    if (!db) throw new Error(DB_UNAVAILABLE_WARNING + " (getClinicAssessmentCounts)");
    const result = await db
      .select({
        clinic: clinics,
        count: sql<number>`count(${assessments.id})::int`.as('assessmentCount'),
      })
      .from(clinics)
      .leftJoin(assessments, eq(sql`${clinics.id}::text`, assessments.clinicLocation))
      .groupBy(clinics.id)
      .orderBy(desc(sql`assessmentCount`));

    return result.map(row => ({
      clinic: row.clinic,
      count: row.count ?? 0
    }));
  }

  // User operations (Original - will fail if db is null)
  async getUser(id: string): Promise<User | undefined> {
    if (!db) throw new Error(DB_UNAVAILABLE_WARNING + " (getUser)");
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    if (!db) throw new Error(DB_UNAVAILABLE_WARNING + " (upsertUser)");
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: { ...userData, updatedAt: new Date() },
      })
      .returning();
    return user;
  }

  // Patient operations
  async getPatients(options?: { limit?: number; offset?: number; search?: string }): Promise<Patient[]> {
    if (isMockMode) { this.logMockWarning('getPatients', options); return []; }
    if (!db) throw new Error(DB_UNAVAILABLE_WARNING + " (getPatients)");

    let queryBuilder = db.select().from(patients).$dynamic();

    if (options?.search) {
      const searchTerm = `%${options.search}%`;
      queryBuilder = queryBuilder.where(or(like(patients.name, searchTerm), like(patients.email, searchTerm), like(patients.phone, searchTerm)));
    }

    queryBuilder = queryBuilder.orderBy(desc(patients.createdAt));

    if (options?.limit !== undefined) { // Check for undefined to allow 0
      queryBuilder = queryBuilder.limit(options.limit);
    }
    if (options?.offset !== undefined) { // Check for undefined to allow 0
      queryBuilder = queryBuilder.offset(options.offset);
    }
    return queryBuilder;
  }

  async getPatientsCount(search?: string): Promise<number> {
    if (isMockMode) { this.logMockWarning('getPatientsCount', { search }); return 0; }
    if (!db) throw new Error(DB_UNAVAILABLE_WARNING + " (getPatientsCount)");

    let queryBuilder = db.select({ count: count() }).from(patients).$dynamic();

     if (search) {
      const searchTerm = `%${search}%`;
      queryBuilder = queryBuilder.where(or(like(patients.name, searchTerm), like(patients.email, searchTerm), like(patients.phone, searchTerm)));
    }
    const [result] = await queryBuilder;
    return result?.count || 0;
  }

  async getPatientById(id: number): Promise<Patient | undefined> {
    if (isMockMode) { this.logMockWarning('getPatientById', { id }); return undefined; } // Mock for safety
    if (!db) throw new Error(DB_UNAVAILABLE_WARNING + " (getPatientById)");
    const [patient] = await db.select().from(patients).where(eq(patients.id, id));
    return patient;
  }

  async getPatientByEmail(email: string): Promise<Patient | undefined> {
     if (isMockMode) { this.logMockWarning('getPatientByEmail', { email }); return undefined; } // Mock for safety
     if (!db) throw new Error(DB_UNAVAILABLE_WARNING + " (getPatientByEmail)");
     const [patient] = await db.select().from(patients).where(eq(patients.email, email));
     return patient;
   }

  async createPatient(patientData: InsertPatient): Promise<Patient> {
    if (!db) { 
      this.logMockWarning('createPatient', patientData);
      const now = new Date();
      const patient: Patient = { 
        id: mockIdCounter++, 
        name: patientData.name, 
        email: patientData.email || null, 
        phone: patientData.phone || null, 
        age: null, 
        gender: null, 
        insuranceType: null, 
        dateOfBirth: patientData.dateOfBirth || null, 
        createdAt: now, 
        updatedAt: now 
      };
      mockPatients.push(patient);
      console.log('âœ… Mock patient added to store. Total patients:', mockPatients.length);
      return patient;
    }
    const [patient] = await db.insert(patients).values(patientData).returning();
    return patient;
  }

  async updatePatient(id: number, patientData: Partial<InsertPatient>): Promise<Patient | undefined> {
    if (!db) throw new Error(DB_UNAVAILABLE_WARNING + " (updatePatient)");
    const [patient] = await db
      .update(patients)
      .set({ ...patientData, updatedAt: new Date() })
      .where(eq(patients.id, id))
      .returning();
    return patient;
  }

  // Assessment operations
  async getAssessments(options?: { limit?: number; offset?: number; patientId?: number; status?: string; riskLevel?: string; startDate?: Date; endDate?: Date; clinicLocation?: string; }): Promise<AssessmentWithPatient[]> {
    if (!db) { 
      this.logMockWarning('getAssessments', options); 

      // Return mock assessments with patient data joined
      const assessmentsWithPatients: AssessmentWithPatient[] = mockAssessments.map(assessment => {
        const patient = mockPatients.find(p => p.id === assessment.patientId);
        return {
          ...assessment,
          patient: patient || {
            id: assessment.patientId,
            name: 'Unknown Patient',
            email: null,
            phone: null,
            age: null,
            gender: null,
            insuranceType: null,
            dateOfBirth: null,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        };
      });

      // Apply basic filtering
      let filtered = assessmentsWithPatients;
      if (options?.patientId) {
        filtered = filtered.filter(a => a.patientId === options.patientId);
      }
      if (options?.status) {
        filtered = filtered.filter(a => a.status === options.status);
      }

      // Apply pagination
      if (options?.offset !== undefined) {
        filtered = filtered.slice(options.offset);
      }
      if (options?.limit !== undefined) {
        filtered = filtered.slice(0, options.limit);
      }

      console.log('ðŸ“Š Mock assessments returned:', filtered.length, 'of', mockAssessments.length, 'total');
      return filtered;
    }
    let queryBuilder = db.select({
      assessment: assessments,
      patient: patients,
    })
    .from(assessments)
    .innerJoin(patients, eq(assessments.patientId, patients.id))
    .$dynamic();

    const queryConditions: any[] = [];
    if (options?.patientId) { queryConditions.push(eq(assessments.patientId, options.patientId));}
    if (options?.status) { queryConditions.push(eq(assessments.status, options.status));}
    if (options?.riskLevel) { queryConditions.push(eq(assessments.riskLevel, options.riskLevel));}
    if (options?.clinicLocation) { queryConditions.push(eq(assessments.clinicLocation, options.clinicLocation));}
    if (options?.startDate && options?.endDate) { queryConditions.push(between(assessments.completedAt, options.startDate, options.endDate));}

    if (queryConditions.length > 0) {
      queryBuilder = queryBuilder.where(and(...queryConditions));
    }

    queryBuilder = queryBuilder.orderBy(desc(assessments.completedAt));

    if (options?.limit !== undefined) {
      queryBuilder = queryBuilder.limit(options.limit);
    }
    if (options?.offset !== undefined) {
      queryBuilder = queryBuilder.offset(options.offset);
    }
    const results = await queryBuilder;
    return results.map(({ assessment, patient }) => ({ ...assessment, patient, }));
  }

  async getAssessmentsCount(options?: { patientId?: number; status?: string; riskLevel?: string; startDate?: Date; endDate?: Date; clinicLocation?: string; }): Promise<number> {
    if (!db) { this.logMockWarning('getAssessmentsCount', options); return 0; }

    let queryBuilder = db.select({ count: count() }).from(assessments).$dynamic();

    const queryConditions: any[] = [];
    if (options?.patientId) { queryConditions.push(eq(assessments.patientId, options.patientId));}
    if (options?.status) { queryConditions.push(eq(assessments.status, options.status));}
    if (options?.riskLevel) { queryConditions.push(eq(assessments.riskLevel, options.riskLevel));}
    if (options?.clinicLocation) { queryConditions.push(eq(assessments.clinicLocation, options.clinicLocation));}
    if (options?.startDate && options?.endDate) { queryConditions.push(between(assessments.completedAt, options.startDate, options.endDate));}

    if (queryConditions.length > 0) {
      queryBuilder = queryBuilder.where(and(...queryConditions));
    }
    const [result] = await queryBuilder;
    return result?.count || 0;
  }

  async getAssessmentById(id: number): Promise<Assessment | undefined> {
    if (!db) { this.logMockWarning('getAssessmentById', { id }); return undefined; } // Mock for safety
    const [assessment] = await db.select().from(assessments).where(eq(assessments.id, id));
    return assessment;
  }

  async createAssessment(assessmentData: InsertAssessment): Promise<Assessment> {
    if (!db) { 
      this.logMockWarning('createAssessment', assessmentData);
      const now = new Date();
      const assessment: Assessment = { 
        id: mockIdCounter++, 
        patientId: assessmentData.patientId, 
        status: assessmentData.status || 'completed',
        completedAt: assessmentData.completedAt || now,
        riskLevel: assessmentData.riskLevel || 'medium',
        primaryConcern: assessmentData.primaryConcern || null,
        score: assessmentData.score || null,
        clinicLocation: assessmentData.clinicLocation || null,
        createdAt: now, 
        updatedAt: now
      };
      mockAssessments.push(assessment);
      console.log('âœ… Mock assessment added to store. Total assessments:', mockAssessments.length);
      return assessment;
    }
    const [assessment] = await db.insert(assessments).values(assessmentData).returning();
    return assessment;
  }

  async updateAssessment(id: number, assessmentData: Partial<InsertAssessment>): Promise<Assessment | undefined> {
    if (!db) throw new Error(DB_UNAVAILABLE_WARNING + " (updateAssessment)");
    const [assessment] = await db
      .update(assessments)
      .set({ ...assessmentData, updatedAt: new Date() })
      .where(eq(assessments.id, id))
      .returning();
    return assessment;
  }

  async getAssessmentsByDateRange(startDate: Date, endDate: Date): Promise<Assessment[]> {
    if (!db) throw new Error(DB_UNAVAILABLE_WARNING + " (getAssessmentsByDateRange)");
    return db
      .select()
      .from(assessments)
      .where(
        and(
          sql`${assessments.completedAt} >= ${startDate}`,
          sql`${assessments.completedAt} <= ${endDate}`
        )
      );
  }

  async getRecentAssessments(limit = 5): Promise<AssessmentWithPatient[]> {
    if (!db) { 
      this.logMockWarning('getRecentAssessments', { limit }); 

      // Return recent mock assessments sorted by completedAt
      const assessmentsWithPatients: AssessmentWithPatient[] = mockAssessments
        .sort((a, b) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime())
        .slice(0, limit)
        .map(assessment => {
          const patient = mockPatients.find(p => p.id === assessment.patientId);
          return {
            ...assessment,
            patient: patient || {
              id: assessment.patientId,
              name: 'Unknown Patient',
              email: null,
              phone: null,
              age: null,
              gender: null,
              insuranceType: null,
              dateOfBirth: null,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          };
        });

      console.log('ðŸ“Š Mock recent assessments returned:', assessmentsWithPatients.length);
      return assessmentsWithPatients;
    }
    try {
      const results = await db
        .select({
          assessment: {
            id: assessments.id,
            patientId: assessments.patientId,
            completedAt: assessments.completedAt,
            status: assessments.status,
            riskLevel: assessments.riskLevel,
            primaryConcern: assessments.primaryConcern,
            createdAt: assessments.createdAt,
            updatedAt: assessments.updatedAt,
            score: assessments.score, 
            clinicLocation: assessments.clinicLocation 
          },
          patient: patients
        })
        .from(assessments)
        .innerJoin(patients, eq(assessments.patientId, patients.id))
        .orderBy(desc(assessments.completedAt))
        .limit(limit);

      return results.map(({ assessment, patient }) => ({
        ...assessment,
        patient,
      }));
    } catch (error) {
      console.error("Error in getRecentAssessments:", error);
      return [];
    }
  }

  // Response operations (Original - will fail if db is null)
  async getAssessmentResponsesByAssessmentId(assessmentId: number): Promise<ResponseWithQuestion[]> {
    return this.getResponsesByAssessmentId(assessmentId);
  }

  async getResponsesByAssessmentId(assessmentId: number): Promise<ResponseWithQuestion[]> {
    if (!db) throw new Error(DB_UNAVAILABLE_WARNING + " (getResponsesByAssessmentId)");
    const results = await db
      .select({
        response: responses,
        question: questions,
      })
      .from(responses)
      .innerJoin(questions, eq(responses.questionId, questions.id))
      .where(eq(responses.assessmentId, assessmentId))
      .orderBy(asc(questions.order));

    return results.map(({ response, question }) => ({
      ...response,
      question,
    }));
  }

  async createResponse(responseData: InsertResponse): Promise<Response> {
    if (!db) throw new Error(DB_UNAVAILABLE_WARNING + " (createResponse)");
    const [response] = await db.insert(responses).values(responseData).returning();
    return response;
  }

  async updateResponse(id: number, responseData: Partial<InsertResponse>): Promise<Response | undefined> {
    if (!db) throw new Error(DB_UNAVAILABLE_WARNING + " (updateResponse)");
    const [response] = await db
      .update(responses)
      .set(responseData)
      .where(eq(responses.id, id))
      .returning();
    return response;
  }

  async getFlaggedResponses(): Promise<ResponseWithQuestion[]> {
    if (!db) throw new Error(DB_UNAVAILABLE_WARNING + " (getFlaggedResponses)");
    const results = await db
      .select({
        response: responses,
        question: questions,
      })
      .from(responses)
      .innerJoin(questions, eq(responses.questionId, questions.id))
      .where(eq(responses.flagged, true))
      .orderBy(desc(responses.createdAt));

    return results.map(({ response, question }) => ({
      ...response,
      question,
    }));
  }

  async getFlaggedResponsesCount(): Promise<number> {
    if (!db) { this.logMockWarning('getFlaggedResponsesCount'); return 0; }
    try {
        const [result] = await db
          .select({ count: count() })
          .from(responses)
          .where(eq(responses.flagged, true));
        return result?.count || 0;
    } catch (error) {
        console.error('Error getting flagged responses count:', error);
        return 0;
    }
  }

  // Question operations (Original - will fail if db is null)
  async getQuestions(): Promise<Question[]> {
    if (!db) throw new Error(DB_UNAVAILABLE_WARNING + " (getQuestions)");
    return db.select().from(questions).orderBy(asc(questions.order));
  }

  async getQuestionById(id: number): Promise<Question | undefined> {
    if (!db) throw new Error(DB_UNAVAILABLE_WARNING + " (getQuestionById)");
    const [question] = await db.select().from(questions).where(eq(questions.id, id));
    return question;
  }

  async createQuestion(questionData: InsertQuestion): Promise<Question> {
    if (!db) throw new Error(DB_UNAVAILABLE_WARNING + " (createQuestion)");
    const [question] = await db.insert(questions).values(questionData).returning();
    return question;
  }

  // Condition operations (Original - will fail if db is null)
  async getConditions(): Promise<Condition[]> {
    if (!db) throw new Error(DB_UNAVAILABLE_WARNING + " (getConditions)");
    return db.select().from(conditions).orderBy(asc(conditions.name));
  }

  async createCondition(conditionData: InsertCondition): Promise<Condition> {
    if (!db) throw new Error(DB_UNAVAILABLE_WARNING + " (createCondition)");
    const [condition] = await db.insert(conditions).values(conditionData).returning();
    return condition;
  }

  async getConditionById(id: number): Promise<Condition | undefined> {
    if (!db) throw new Error(DB_UNAVAILABLE_WARNING + " (getConditionById)");
    const [condition] = await db.select().from(conditions).where(eq(conditions.id, id));
    return condition;
  }

  async getTopConditions(limit = 5): Promise<{ condition: string; count: number }[]> {
    if (!db) throw new Error(DB_UNAVAILABLE_WARNING + " (getTopConditions)");
    const results = await db
      .select({
        condition: conditions.name,
        count: count(assessmentConditions.assessmentId),
      })
      .from(assessmentConditions)
      .innerJoin(conditions, eq(assessmentConditions.conditionId, conditions.id))
      .groupBy(conditions.name)
      .orderBy(desc(count(assessmentConditions.assessmentId)))
      .limit(limit);

    return results;
  }

  // Dashboard data (Original - will fail if db is null)
  async getCompletedAssessmentsCount(): Promise<number> {
    if (!db) { this.logMockWarning('getCompletedAssessmentsCount'); return 0; }
    try {
        const [result] = await db
          .select({ count: count() })
          .from(assessments)
          .where(eq(assessments.status, 'completed'));
        return result?.count || 0;
    } catch (error) {
        console.error('Error getting completed assessments count:', error);
        return 0;
    }
  }

  async getWeeklyAssessmentsCount(): Promise<number> {
    if (!db) { this.logMockWarning('getWeeklyAssessmentsCount'); return 0; }
    try {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const [result] = await db
          .select({ count: count() })
          .from(assessments)
          .where(
            and(
              sql`${assessments.completedAt} >= ${oneWeekAgo}`,
              sql`${assessments.completedAt} <= ${new Date()}`
            )
          );
        return result?.count || 0;
    } catch (error) {
        console.error('Error getting weekly assessments count:', error);
        return 0;
    }
  }

  async getAssessmentsTrend(days = 7): Promise<{ date: string; count: number }[]> {
    if (!db) throw new Error(DB_UNAVAILABLE_WARNING + " (getAssessmentsTrend)");
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const results = await db
      .select({
        date: sql<string>`DATE(${assessments.completedAt})`,
        count: count(),
      })
      .from(assessments)
      .where(sql`${assessments.completedAt} >= ${startDate}`)
      .groupBy(sql`DATE(${assessments.completedAt})`)
      .orderBy(asc(sql`DATE(${assessments.completedAt})`));

    return results.map(({ date, count }) => ({
      date: new Date(date as string).toISOString().split('T')[0],
      count,
    }));
  }


  async createConsultation(consultationData: InsertConsultation): Promise<Consultation> {
    if (!db) {
      this.logMockWarning('createConsultation', consultationData);
      const now = new Date();
      const mockConsultation: Consultation = {
        id: mockIdCounter++,
        name: consultationData.name || 'Mock User',
        email: consultationData.email, 
        phone: consultationData.phone, 
        preferred_clinic: consultationData.preferred_clinic || null,
        issue_category: consultationData.issue_category || null,
        issue_specifics: consultationData.issue_specifics || null,
        pain_duration: consultationData.pain_duration || null,
        pain_severity: consultationData.pain_severity || null,
        additional_info: consultationData.additional_info || null,
        previous_treatment: consultationData.previous_treatment || null,
        has_image: consultationData.has_image || null,
        image_path: consultationData.image_path || null,
        image_analysis: consultationData.image_analysis || null,
        symptom_description: consultationData.symptom_description || null,
        symptom_analysis: consultationData.symptom_analysis || null,
        conversation_log: consultationData.conversation_log || [],
        createdAt: consultationData.createdAt || now,
      };
      mockConsultations.push(mockConsultation);
      console.log('âœ… Mock consultation added to store. Total consultations:', mockConsultations.length);
      return Promise.resolve(mockConsultation);
    }
    console.log('ðŸ”µ Storage: Creating consultation with data:', consultationData);
    console.log('ðŸ” Storage: Individual field values:');
    console.log('  - issue_specifics:', consultationData.issue_specifics);
    console.log('  - symptom_description:', consultationData.symptom_description);
    console.log('  - previous_treatment:', consultationData.previous_treatment);
    console.log('  - image_analysis:', consultationData.image_analysis);
    console.log('  - calendar_booking:', consultationData.calendar_booking);
    console.log('  - booking_confirmation:', consultationData.booking_confirmation);
    console.log('  - final_question:', consultationData.final_question);
    console.log('  - additional_help:', consultationData.additional_help);
    console.log('  - emoji_survey:', consultationData.emoji_survey);
    console.log('  - survey_response:', consultationData.survey_response);

    // Temporarily exclude raw_json to work around database schema issue
    const { raw_json, ...dataWithoutRawJson } = consultationData;
    const [consultation] = await db
      .insert(consultations)
      .values(dataWithoutRawJson)
      .returning();
    console.log('âœ… Storage: Successfully created consultation ID:', consultation.id);
    return consultation;
  }

  async getConsultations(options?: { limit?: number; offset?: number; clinic_group?: string; startDate?: Date; endDate?: Date; q?: string }): Promise<Consultation[]> {
    console.log('🔍 getConsultations called with options:', options);
    if (!db) { this.logMockWarning('getConsultations', options); return []; } // Mock for safety

    try {
      // First get consultations with filters
      let consultationsQuery = db.select().from(consultations).$dynamic();

      const queryConditions: any[] = [];
      if (options?.clinic_group) {
        queryConditions.push(eq(consultations.preferred_clinic, options.clinic_group));
      }
      if (options?.startDate && options?.endDate) {
        queryConditions.push(between(consultations.createdAt, options.startDate, options.endDate));
      }
      if (options?.q) {
        const searchTerm = `%${options.q}%`;
        queryConditions.push(or(
          like(consultations.name, searchTerm),
          like(consultations.email, searchTerm),
          like(consultations.phone, searchTerm),
          like(consultations.issue_category, searchTerm),
          like(consultations.symptom_description, searchTerm)
        ));
      }

      if (queryConditions.length > 0) {
        consultationsQuery = consultationsQuery.where(and(...queryConditions));
      }

      consultationsQuery = consultationsQuery.orderBy(desc(consultations.createdAt));

      if (options?.limit !== undefined) {
        consultationsQuery = consultationsQuery.limit(options.limit);
      }
      if (options?.offset !== undefined) {
        consultationsQuery = consultationsQuery.offset(options.offset);
      }

      const consultationResults = await consultationsQuery;
      console.log('✅ getConsultations query executed, results count:', consultationResults.length);

      // Get first image and thumbnail for each consultation
      const consultationIds = consultationResults.map(c => c.id);
      const imagesMap = new Map<number, string>();
      const thumbnailsMap = new Map<number, string>();

      if (consultationIds.length > 0) {
        const imagesResult = await db
          .select({
            consultationId: images.consultationId,
            url: images.url,
            thumbnailUrl: images.thumbnailUrl
          })
          .from(images)
          .where(inArray(images.consultationId, consultationIds))
          .orderBy(asc(images.createdAt));

        // Group by consultationId and take first image
        const groupedImages = new Map<number, { url: string; thumbnailUrl: string | null }[]>();
        imagesResult.forEach(img => {
          if (!groupedImages.has(img.consultationId)) {
            groupedImages.set(img.consultationId, []);
          }
          groupedImages.get(img.consultationId)!.push({
            url: img.url,
            thumbnailUrl: img.thumbnailUrl
          });
        });

        // Take first image for each consultation
        groupedImages.forEach((images, consultationId) => {
          if (images.length > 0) {
            imagesMap.set(consultationId, images[0].url);
            if (images[0].thumbnailUrl) {
              thumbnailsMap.set(consultationId, images[0].thumbnailUrl);
            }
          }
        });
      }

      const finalResults = consultationResults.map(consultation => ({
        ...consultation,
        firstImageUrl: imagesMap.get(consultation.id) || null,
        firstThumbnailUrl: thumbnailsMap.get(consultation.id) || null
      }));
      console.log('✅ getConsultations completed successfully, returning', finalResults.length, 'consultations');
      return finalResults;
    } catch (error) {
      console.error('❌ Error in getConsultations:', error);
      throw error;
    }
  }

  async getConsultationById(id: number): Promise<Consultation> {
    if (!db) {
      throw new Error("Database not available");
    }
    try {
      const consultation = await db.select().from(consultations).where(eq(consultations.id, id)).limit(1);
      if (consultation.length === 0) {
        throw new Error("Consultation not found");
      }
      return consultation[0];
    } catch (error) {
      console.error(`Error fetching consultation ${id}:`, error);
      throw error;
    }
  }

  // Chatbot Settings operations (database-based with clinic groups)
  async getChatbotSettings(clinicGroup: string): Promise<ChatbotSettingsData | null> {
    if (!db) {
      this.logMockWarning('getChatbotSettings', { clinicGroup });
      return null;
    }

    try {
      const [settings] = await db
        .select()
        .from(chatbotSettings)
        .where(eq(chatbotSettings.clinicGroup, clinicGroup))
        .limit(1);

      if (!settings) {
        return null;
      }

      return {
        id: settings.id,
        clinicGroup: settings.clinicGroup || undefined,
        welcomeMessage: settings.welcomeMessage || undefined,
        botDisplayName: settings.botDisplayName || undefined,
        ctaButtonLabel: settings.ctaButtonLabel || undefined,
        chatbotTone: settings.chatbotTone || undefined,
        createdAt: settings.createdAt || undefined,
        updatedAt: settings.updatedAt || undefined,
      };
    } catch (error) {
      console.error('Error fetching chatbot settings:', error);
      return null;
    }
  }

  async updateChatbotSettings(clinicGroup: string, settingsToUpdate: Partial<ChatbotSettingsData>): Promise<ChatbotSettingsData> {
    if (!db) {
      this.logMockWarning('updateChatbotSettings', { clinicGroup, settingsToUpdate });
      // Return mock updated settings
      return {
        id: 1,
        clinicGroup,
        welcomeMessage: settingsToUpdate.welcomeMessage || "Default Welcome",
        botDisplayName: settingsToUpdate.botDisplayName || "Bot",
        ctaButtonLabel: settingsToUpdate.ctaButtonLabel || "Chat",
        chatbotTone: settingsToUpdate.chatbotTone || "Friendly",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    try {
      // Check if settings exist for this clinic group
      const existingSettings = await this.getChatbotSettings(clinicGroup);

      if (!existingSettings) {
        // Create new settings for this clinic group
        const [newSettings] = await db
          .insert(chatbotSettings)
          .values({
            clinicGroup,
            welcomeMessage: settingsToUpdate.welcomeMessage || "Welcome to FootCare Clinic! Let's get started.",
            botDisplayName: settingsToUpdate.botDisplayName || "Fiona - FootCare Assistant",
            ctaButtonLabel: settingsToUpdate.ctaButtonLabel || "Ask Fiona",
            chatbotTone: settingsToUpdate.chatbotTone || "Friendly",
          })
          .returning();

        return {
          id: newSettings.id,
          clinicGroup: newSettings.clinicGroup,
          welcomeMessage: newSettings.welcomeMessage,
          botDisplayName: newSettings.botDisplayName,
          ctaButtonLabel: newSettings.ctaButtonLabel,
          chatbotTone: newSettings.chatbotTone,
          createdAt: newSettings.createdAt,
          updatedAt: newSettings.updatedAt,
        };
      } else {
        // Update existing settings
        const updateData: Partial<typeof chatbotSettings.$inferInsert> = {};
        if (settingsToUpdate.welcomeMessage !== undefined) {
          updateData.welcomeMessage = settingsToUpdate.welcomeMessage;
        }
        if (settingsToUpdate.botDisplayName !== undefined) {
          updateData.botDisplayName = settingsToUpdate.botDisplayName;
        }
        if (settingsToUpdate.ctaButtonLabel !== undefined) {
          updateData.ctaButtonLabel = settingsToUpdate.ctaButtonLabel;
        }
        if (settingsToUpdate.chatbotTone !== undefined) {
          updateData.chatbotTone = settingsToUpdate.chatbotTone;
        }

        const [updatedSettings] = await db
          .update(chatbotSettings)
          .set({ ...updateData, updatedAt: new Date() })
          .where(eq(chatbotSettings.clinicGroup, clinicGroup))
          .returning();

        return {
          id: updatedSettings.id,
          clinicGroup: updatedSettings.clinicGroup,
          welcomeMessage: updatedSettings.welcomeMessage,
          botDisplayName: updatedSettings.botDisplayName,
          ctaButtonLabel: updatedSettings.ctaButtonLabel,
          chatbotTone: updatedSettings.chatbotTone,
          createdAt: updatedSettings.createdAt,
          updatedAt: updatedSettings.updatedAt,
        };
      }
    } catch (error) {
      console.error('Error updating chatbot settings:', error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();

export class ChatbotService {
  async findPatientByEmail(email: string) {
    try {
      const [patient] = await db.select().from(patients).where(eq(patients.email, email));
      return patient;
    } catch (error) {
      console.error("Error finding patient by email:", error);
      return null;
    }
  }

  async createConsultation(data: any) {
    try {
      console.log('ðŸ’¾ Creating consultation with data:', data);

      // First, find or create the patient
      let patient = await this.findPatientByEmail(data.email);

      if (!patient) {
        console.log('ðŸ‘¤ Creating new patient:', data.name);
        const [newPatient] = await db.insert(patients).values({
          name: data.name,
          email: data.email,
          phone: data.phone,
          clinic_group: data.preferred_clinic || 'FootCare Clinic',
        }).returning();
        patient = newPatient;
      } else {
        // Update existing patient's clinic group if provided
        if (data.preferred_clinic) {
          await db.update(patients)
            .set({ clinic_group: data.preferred_clinic })
            .where(eq(patients.id, patient.id));
          patient.clinic_group = data.preferred_clinic;
        }
      }

      // Now create the consultation
      const [newConsultation] = await db.insert(consultations).values({
        patientId: patient.id,
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
        conversation_log: data.conversation_log,
        calendar_booking: data.calendar_booking,
        booking_confirmation: data.booking_confirmation,
        final_question: data.final_question,
        additional_help: data.additional_help,
        emoji_survey: data.emoji_survey,
        survey_response: data.survey_response
      }).returning();

      console.log('âœ… Successfully created consultation ID:', newConsultation.id);
      return newConsultation;
    } catch (error) {
      console.error('ðŸ”¥ Error creating consultation:', error);
      throw error;
    }
  }
}

export const chatbotService = new ChatbotService();
