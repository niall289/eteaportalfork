import { db } from "../db";
import { images, Consultation } from "@shared/schema";
import { inArray, asc } from "drizzle-orm";

export async function exportConsultationsToCSV(consultations: Consultation[]): Promise<string> {
  // Fetch images for all consultations, ordered by created_at ASC to get the first image
  const consultationIds = consultations.map(c => c.id);
  const allImages = consultationIds.length > 0
    ? await db.select()
        .from(images)
        .where(inArray(images.consultationId, consultationIds))
        .orderBy(asc(images.createdAt))
    : [];

  // Create map of consultation ID to first image URL (first by created_at ASC)
  const imageMap = new Map<number, string>();
  allImages.forEach(img => {
    if (!imageMap.has(img.consultationId)) {
      imageMap.set(img.consultationId, img.url);
    }
  });

  // CSV headers - keeping all existing columns and adding image_url
  const csvHeaders = 'ID,Name,Email,Phone,Preferred Clinic,Issue Category,Issue Specifics,Symptom Description,Previous Treatment,Has Image,Image Path,Image URL,Image Analysis,Calendar Booking,Booking Confirmation,Final Question,Additional Help,Emoji Survey,Survey Response,Created At\n';

  // Generate CSV data rows
  const csvData = consultations
    .map((c: Consultation) => {
      const firstImageUrl = imageMap.get(c.id) || '';
      return `${c.id},"${c.name}","${c.email || ''}","${c.phone || ''}","${c.preferred_clinic || ''}","${c.issue_category || ''}","${c.issue_specifics || ''}","${c.symptom_description || ''}","${c.previous_treatment || ''}","${c.has_image || ''}","${c.image_path || ''}","${c.image_url || ''}","${c.image_analysis || ''}","${c.calendar_booking || ''}","${c.booking_confirmation || ''}","${c.final_question || ''}","${c.additional_help || ''}","${c.emoji_survey || ''}","${c.survey_response || ''}","${c.createdAt}"`;
    })
    .join('\n');

  return csvHeaders + csvData;
}