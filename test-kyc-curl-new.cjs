// test-kyc-curl.cjs
// Test script to simulate curl request to KYC endpoint

async function testKYCEndpoint() {
  console.log('🧪 Testing KYC Endpoint with realistic user data...\n');
  
  const userData = {
    id: "P987654321", // Different passport number to test new user
    full_name: "Jane Doe",
    date_of_birth: "1985-03-22",
    contact_number: "+1555666777",
    email: "jane.doe@example.com",
    emergency_contact_1: "+1444555666",
    emergency_contact_2: "+1333444555",
    nationality: "Canadian",
    trip_start: "2025-11-01",
    trip_end: "2025-11-20"
  };
  
  try {
    console.log('📤 Sending POST request to /api/kyc/verify...');
    console.log('📋 User Data:', JSON.stringify(userData, null, 2));
    
    const response = await fetch('http://localhost:3000/api/kyc/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });
    
    console.log('\\n✅ KYC Response Status:', response.status);
    
    const responseData = await response.json();
    console.log('📦 Response Data:', JSON.stringify(responseData, null, 2));
    
    // Check if DTID was generated
    if (responseData.data && responseData.data.dtid) {
      console.log('\\n🆔 Generated DTID:', responseData.data.dtid);
    }
    
    // Check if QR code was generated and uploaded to Supabase
    if (responseData.data && responseData.data.onchain && responseData.data.onchain.qrResult) {
      const qrResult = responseData.data.onchain.qrResult;
      console.log('📱 QR Code Details:');
      console.log('   File Name:', qrResult.fileName);
      console.log('   Public URL:', qrResult.publicUrl);
      console.log('   Uploaded to Supabase:', qrResult.uploadedToSupabase);
      console.log('   Database Stored:', qrResult.databaseStored);
      
      if (qrResult.uploadedToSupabase) {
        console.log('🎉 QR code successfully uploaded to Supabase Storage!');
      }
    }
    
    // Check if blockchain transaction was successful
    if (responseData.data && responseData.data.onchain && responseData.data.onchain.blockchain) {
      const blockchain = responseData.data.onchain.blockchain;
      console.log('⛓️  Blockchain Result:');
      console.log('   Success:', blockchain.success);
      console.log('   Transaction Hash:', blockchain.transactionHash);
      console.log('   Network:', blockchain.network);
      console.log('   Real blockchain:', blockchain.real);
      
      if (blockchain.success && blockchain.transactionHash !== 'ALREADY_REGISTERED') {
        console.log('🌐 View on Etherscan:', `https://sepolia.etherscan.io/tx/${blockchain.transactionHash}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing KYC endpoint:', error.message);
  }
  
  console.log('\\n🎉 KYC endpoint test completed!');
}

// Check if server is running first
async function checkServerHealth() {
  try {
    const response = await fetch('http://localhost:3000/');
    if (response.ok) {
      console.log('✅ Server is running on port 3000');
      return true;
    } else {
      console.error('❌ Server responded with status:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Server is not running on port 3000');
    console.log('💡 Please start the server with: node server.cjs');
    return false;
  }
}

async function runTest() {
  const serverIsRunning = await checkServerHealth();
  
  if (serverIsRunning) {
    await testKYCEndpoint();
  }
}

runTest();