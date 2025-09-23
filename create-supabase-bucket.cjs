// create-supabase-bucket.cjs
// Script to create the qrcodes bucket in Supabase Storage

const { createClient } = require('@supabase/supabase-js');

async function createQRCodesBucket() {
  console.log('🧪 Creating qrcodes bucket in Supabase Storage...\n');
  
  require('dotenv').config();
  
  // Check if we have the required environment variables
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
    console.error('❌ Missing Supabase credentials in .env file');
    console.log('💡 Required variables: SUPABASE_URL, SUPABASE_KEY');
    return;
  }
  
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  
  try {
    // Try to create the bucket
    console.log('📦 Creating qrcodes bucket...');
    const { data, error } = await supabase.storage.createBucket('qrcodes', {
      public: true,
      allowedMimeTypes: ['image/png', 'image/jpeg'],
      fileSizeLimit: 5242880 // 5MB
    });
    
    if (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ qrcodes bucket already exists');
      } else {
        console.error('❌ Error creating bucket:', error);
        console.log('\n💡 You may need to create the bucket manually in Supabase Dashboard:');
        console.log('1. Go to Storage section in Supabase Dashboard');
        console.log('2. Click "New Bucket"');
        console.log('3. Name: qrcodes');
        console.log('4. Set as Public bucket');
        console.log('5. Allow file uploads up to 5MB');
        console.log('6. Set allowed MIME types: image/png, image/jpeg');
        return;
      }
    } else {
      console.log('✅ qrcodes bucket created successfully');
      console.log('📋 Bucket data:', data);
    }
    
    // Verify bucket exists
    console.log('\n🔍 Verifying bucket creation...');
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError);
      return;
    }
    
    const qrcodesBucket = buckets.find(bucket => bucket.name === 'qrcodes');
    if (qrcodesBucket) {
      console.log('✅ Bucket verification successful');
      console.log('📋 Bucket details:', qrcodesBucket);
      
      // Test upload permissions
      console.log('\n🧪 Testing upload permissions...');
      const testData = Buffer.from('test file content');
      const testFileName = `test-${Date.now()}.txt`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('qrcodes')
        .upload(testFileName, testData, {
          contentType: 'text/plain'
        });
        
      if (uploadError) {
        console.error('❌ Upload test failed:', uploadError);
        console.log('\n💡 You may need to set up storage policies manually:');
        console.log(`
-- Create storage policies for public access
CREATE POLICY "Allow public uploads" ON storage.objects 
FOR INSERT TO public 
WITH CHECK (bucket_id = 'qrcodes');

CREATE POLICY "Allow public downloads" ON storage.objects 
FOR SELECT TO public 
USING (bucket_id = 'qrcodes');

CREATE POLICY "Allow public updates" ON storage.objects 
FOR UPDATE TO public 
USING (bucket_id = 'qrcodes');
        `);
      } else {
        console.log('✅ Upload test successful');
        
        // Clean up test file
        await supabase.storage.from('qrcodes').remove([testFileName]);
        console.log('🧹 Test file cleaned up');
      }
      
    } else {
      console.log('❌ Bucket verification failed - bucket not found');
    }
    
  } catch (error) {
    console.error('💥 Script failed with error:', error);
  }
  
  console.log('\n🎉 Bucket setup completed!');
}

createQRCodesBucket();