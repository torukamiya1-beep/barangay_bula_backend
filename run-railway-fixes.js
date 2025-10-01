require('dotenv').config();
const fixRailwayDeployment = require('./scripts/fix-railway-deployment');

console.log('🔧 Running Railway deployment fixes...');
console.log('📊 Environment:', process.env.NODE_ENV || 'development');
console.log('🗄️  Database:', process.env.DB_HOST + ':' + process.env.DB_PORT + '/' + process.env.DB_NAME);
console.log('');

fixRailwayDeployment()
  .then(() => {
    console.log('\n✅ All fixes completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fixes failed:', error.message);
    process.exit(1);
  });
