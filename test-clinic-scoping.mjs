import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });
dotenv.config({ path: join(__dirname, 'server', '.env') });

import { storage } from './server/storage.js';

console.log('Testing clinic scoping functionality...');

async function testClinicScoping() {
  try {
    console.log('\n1. Testing FootCare Clinic data:');
    const footcareConsultations = await storage.getConsultations({ clinic_group: 'FootCare Clinic', limit: 3 });
    console.log(`Found ${footcareConsultations.length} consultations for FootCare Clinic`);
    
    const footcarePatients = await storage.getPatientsFromConsultations({ clinic_group: 'FootCare Clinic' });
    console.log(`Found ${footcarePatients.length} patients for FootCare Clinic`);

    console.log('\n2. Testing The Nail Surgery Clinic data:');
    const nailsurgeryConsultations = await storage.getConsultations({ clinic_group: 'The Nail Surgery Clinic', limit: 3 });
    console.log(`Found ${nailsurgeryConsultations.length} consultations for The Nail Surgery Clinic`);
    
    const nailsurgeryPatients = await storage.getPatientsFromConsultations({ clinic_group: 'The Nail Surgery Clinic' });
    console.log(`Found ${nailsurgeryPatients.length} patients for The Nail Surgery Clinic`);

    if (nailsurgeryConsultations.length > 0) {
      console.log('\nSample consultation from The Nail Surgery Clinic:');
      console.log({
        id: nailsurgeryConsultations[0].id,
        name: nailsurgeryConsultations[0].name,
        issue_category: nailsurgeryConsultations[0].issue_category,
        clinic_group: nailsurgeryConsultations[0].clinic_group,
        createdAt: nailsurgeryConsultations[0].createdAt
      });
    }

    console.log('\n3. Testing all clinic groups in database:');
    const allConsultations = await storage.getConsultations({ limit: 100 });
    const clinicGroups = [...new Set(allConsultations.map(c => c.clinic_group))];
    console.log('Clinic groups found:', clinicGroups);
    
    // Check exact clinic_group values and lengths
    console.log('\nDetailed clinic group analysis:');
    allConsultations.forEach((c, i) => {
      if (i < 3) {
        console.log(`Consultation ${c.id}: clinic_group = "${c.clinic_group}" (length: ${c.clinic_group?.length || 'null'})`);
      }
    });
    
    // Test exact match
    console.log('\n4. Testing exact clinic_group match:');
    const exactMatch = allConsultations.filter(c => c.clinic_group === 'The Nail Surgery Clinic');
    console.log(`Exact match for "The Nail Surgery Clinic": ${exactMatch.length} consultations`);
    
    if (exactMatch.length > 0) {
      console.log('Sample exact match:', {
        id: exactMatch[0].id,
        name: exactMatch[0].name,
        clinic_group: `"${exactMatch[0].clinic_group}"`,
        issue_category: exactMatch[0].issue_category
      });
    }
    
  } catch (error) {
    console.error('Error testing clinic scoping:', error);
  }
}

testClinicScoping();