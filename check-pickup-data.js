const { executeQuery } = require('./src/config/database');

async function checkPickupData() {
  try {
    console.log('🔍 Checking authorized pickup data for request 156...');
    
    const query = `
      SELECT 
        id,
        request_id,
        first_name,
        last_name,
        id_image_path,
        id_image_name,
        authorization_letter_path
      FROM authorized_pickup_persons 
      WHERE request_id = 156
    `;
    
    const results = await executeQuery(query);
    
    if (results.length === 0) {
      console.log('❌ No authorized pickup person found for request 156');
    } else {
      console.log('✅ Authorized pickup data found:');
      results.forEach(pickup => {
        console.log({
          id: pickup.id,
          name: `${pickup.first_name} ${pickup.last_name}`,
          id_image_path: pickup.id_image_path,
          id_image_name: pickup.id_image_name,
          authorization_letter_path: pickup.authorization_letter_path,
          hasIdImage: !!pickup.id_image_path,
          hasAuthLetter: !!pickup.authorization_letter_path
        });
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking pickup data:', error);
    process.exit(1);
  }
}

checkPickupData();
