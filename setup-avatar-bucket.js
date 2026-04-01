// setup-avatar-bucket.js
// Run this script to set up the avatars bucket in Supabase
// Usage: node setup-avatar-bucket.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // You need service role key for bucket operations

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables. Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupAvatarBucket() {
  try {
    console.log('Checking if avatars bucket exists...');

    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error('Error listing buckets:', listError);
      return;
    }

    const avatarsBucket = buckets.find(bucket => bucket.name === 'avatars');

    if (!avatarsBucket) {
      console.log('Creating avatars bucket...');

      // Create the bucket
      const { error: createError } = await supabase.storage.createBucket('avatars', {
        public: true, // Make it public so avatars can be accessed
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        fileSizeLimit: 5242880, // 5MB limit
      });

      if (createError) {
        console.error('Error creating bucket:', createError);
        return;
      }

      console.log('✅ Avatars bucket created successfully');
    } else {
      console.log('✅ Avatars bucket already exists');
    }

    console.log('🎉 Avatar bucket setup complete!');
    console.log('You can now upload avatar images in your app.');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

setupAvatarBucket();