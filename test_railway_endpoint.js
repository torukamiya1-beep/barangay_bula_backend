/**
 * Test Railway Backend Endpoint
 * Check if the document-fees endpoint exists
 */

const https = require('https');

const RAILWAY_URL = 'https://brgybulabackend-production.up.railway.app';

function testEndpoint(path) {
  return new Promise((resolve, reject) => {
    const url = `${RAILWAY_URL}${path}`;
    console.log(`\n🔍 Testing: ${url}`);
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`   Status: ${res.statusCode}`);
        console.log(`   Headers:`, res.headers);
        
        if (res.statusCode === 500) {
          console.log(`   ❌ 500 Error - Endpoint exists but has server error`);
          console.log(`   Response:`, data.substring(0, 500));
        } else if (res.statusCode === 404) {
          console.log(`   ❌ 404 - Endpoint does NOT exist (old code still deployed)`);
        } else if (res.statusCode === 200) {
          console.log(`   ✅ 200 - Endpoint works!`);
          try {
            const json = JSON.parse(data);
            console.log(`   Data:`, JSON.stringify(json, null, 2).substring(0, 500));
          } catch (e) {
            console.log(`   Raw:`, data.substring(0, 200));
          }
        }
        
        resolve({ status: res.statusCode, data });
      });
    }).on('error', (err) => {
      console.log(`   ❌ Network Error:`, err.message);
      reject(err);
    });
  });
}

async function main() {
  console.log('\n🚀 RAILWAY BACKEND ENDPOINT TEST');
  console.log('='.repeat(70));
  
  try {
    // Test health endpoint
    await testEndpoint('/health');
    
    // Test document-fees endpoint
    await testEndpoint('/api/document-fees');
    
    // Test specific fee endpoint
    await testEndpoint('/api/document-fees/2/current');
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ Test completed');
    console.log('\nIf you see 404 errors, Railway has NOT deployed the new code yet.');
    console.log('If you see 500 errors, the code is deployed but has a bug.');
    console.log('If you see 200, everything works!\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

main();
