import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables validation
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_BUCKET',
];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`⚠️ Missing required environment variable: ${varName}`);
  }
});

// Create a single instance of the Supabase client with service role key (for server-side operations)
console.log("🔌 Initializing Supabase admin client with URL:", process.env.SUPABASE_URL);
console.log("🔑 Using service role key (redacted):", process.env.SUPABASE_SERVICE_ROLE_KEY ? `${process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 5)}...${process.env.SUPABASE_SERVICE_ROLE_KEY.substring(process.env.SUPABASE_SERVICE_ROLE_KEY.length - 5)}` : "MISSING");
console.log("🪣 Using bucket:", process.env.SUPABASE_BUCKET || "triageimages");

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Test the Supabase connection on startup
(async () => {
  try {
    const { data, error } = await supabaseAdmin.from('consultations').select('count').limit(1);
    if (error) {
      console.error("❌ Supabase connection test failed:", error.message);
    } else {
      console.log("✅ Supabase connection test successful!");
    }
  } catch (e) {
    console.error("❌ Supabase connection test exception:", e);
  }
})();

// Create a single instance of the Supabase client with anon key (for client-side operations)
export const supabaseClient = process.env.SUPABASE_ANON_KEY ? createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY
) : null;

// Bucket name from env variable
const BUCKET_NAME = process.env.SUPABASE_BUCKET || 'triageimages';

/**
 * Helper function to upload a file to Supabase Storage
 * @param filePath Path within the bucket where the file should be stored
 * @param fileContent Buffer or readable stream with the file content
 * @param contentType MIME type of the file
 * @returns Object with status and data/error information
 */
export async function uploadFile(
  filePath: string,
  fileContent: Buffer | File | Blob,
  contentType: string
) {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(filePath, fileContent, {
        contentType,
        upsert: false
      });

    if (error) {
      console.error('❌ Supabase storage upload error:', error);
      return { success: false, error };
    }

    // Get public URL for the uploaded file
    const { data: urlData } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);
      
    console.log(`📋 Generated public URL: ${urlData.publicUrl}`);

    return {
      success: true,
      data: {
        path: data.path,
        publicUrl: urlData.publicUrl
      }
    };
  } catch (error) {
    console.error('❌ Error in uploadFile:', error);
    return { success: false, error };
  }
}

/**
 * Helper function to delete a file from Supabase Storage
 * @param filePath Full path to the file within the bucket
 * @returns Object with status and error information if applicable
 */
export async function deleteFile(filePath: string) {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error('❌ Supabase storage delete error:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('❌ Error in deleteFile:', error);
    return { success: false, error };
  }
}

/**
 * Helper function to list files in a directory within Supabase Storage
 * @param directory Directory path within the bucket
 * @returns Array of files in the directory
 */
export async function listFiles(directory: string) {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .list(directory);

    if (error) {
      console.error('❌ Supabase storage list error:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('❌ Error in listFiles:', error);
    return { success: false, error };
  }
}

/**
 * Helper function to generate a public URL for a file in Supabase Storage
 * @param filePath Path to the file within the bucket
 * @returns Public URL for the file
 */
export function getPublicUrl(filePath: string) {
  const { data } = supabaseAdmin.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);
  
  return data.publicUrl;
}

/**
 * Helper function to upload a consultation image to Supabase Storage
 * @param consultationId ID of the consultation
 * @param file File object from multer
 * @param clinic Clinic identifier (footcare, nailsurgery, lasercare)
 * @returns Object with status and data/error information
 */
export async function uploadConsultationImage(
  consultationId: number, 
  file: Express.Multer.File, 
  clinic: string
) {
  try {
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      console.warn(`⚠️ Unsupported MIME type: ${file.mimetype}`);
      return { success: false, error: 'Unsupported file type' };
    }

    // Check file size
    if (file.buffer.length > MAX_FILE_SIZE) {
      console.warn(`⚠️ Image too large: ${file.buffer.length} bytes (max: ${MAX_FILE_SIZE})`);
      return { success: false, error: 'File too large' };
    }

    // Generate path in the format: <clinic>/<YYYY>/<MM>/<consultationId>/original.<ext>
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const ext = file.mimetype.split('/')[1];
    const filename = `${clinic}/${year}/${month}/${consultationId}/original.${ext}`;
    
    console.log(`🔍 Uploading image to Supabase bucket '${BUCKET_NAME}' at path: ${filename}`);

    const result = await uploadFile(filename, file.buffer, file.mimetype);
    
    if (result.success) {
      console.log(`✅ Successfully uploaded image to Supabase: ${result.data?.publicUrl}`);
    } else {
      console.error(`❌ Failed to upload image to Supabase: ${JSON.stringify(result.error)}`);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error in uploadConsultationImage:', error);
    return { success: false, error };
  }
}

export default {
  supabaseAdmin,
  supabaseClient,
  uploadFile,
  deleteFile,
  listFiles,
  getPublicUrl,
  uploadConsultationImage
};