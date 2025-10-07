#!/usr/bin/env node

const mysql = require('mysql2/promise');

const railwayConfig = {
  host: 'hopper.proxy.rlwy.net',
  port: 26646,
  user: 'root',
  password: 'dasVQZoBXReQsCsiaEsOQvPfMuyXwjNh',
  database: 'railway'
};

const createTriggerSQL = `CREATE TRIGGER tr_create_receipt_on_payment_success
AFTER UPDATE ON payment_transactions
FOR EACH ROW
BEGIN
  IF NEW.status = 'succeeded' AND OLD.status != 'succeeded' THEN
    IF NOT EXISTS (SELECT 1 FROM receipts WHERE transaction_id = NEW.id) THEN
      INSERT INTO receipts (
        transaction_id,
        client_id,
        request_id,
        receipt_number,
        client_name,
        client_email,
        client_phone,
        request_number,
        document_type,
        payment_method,
        payment_method_code,
        amount,
        processing_fee,
        net_amount,
        currency,
        external_transaction_id,
        paymongo_payment_intent_id,
        payment_status,
        receipt_date,
        payment_date,
        description
      )
      SELECT 
        NEW.id as transaction_id,
        dr.client_id,
        NEW.request_id,
        CONCAT('RCP-', LPAD(NEW.id, 8, '0')) as receipt_number,
        CONCAT(cp.first_name, ' ', cp.last_name) as client_name,
        cp.email as client_email,
        cp.phone_number as client_phone,
        dr.request_number,
        dt.type_name as document_type,
        pm.method_name as payment_method,
        pm.method_code as payment_method_code,
        NEW.amount,
        NEW.processing_fee,
        NEW.net_amount,
        NEW.currency,
        NEW.external_transaction_id,
        NEW.paymongo_payment_intent_id,
        NEW.status as payment_status,
        COALESCE(NEW.completed_at, NOW()) as receipt_date,
        NEW.completed_at as payment_date,
        NEW.payment_description as description
      FROM document_requests dr
      JOIN client_profiles cp ON dr.client_id = cp.account_id
      JOIN document_types dt ON dr.document_type_id = dt.id
      JOIN payment_methods pm ON NEW.payment_method_id = pm.id
      WHERE dr.id = NEW.request_id;
    END IF;
  END IF;
END`;

async function deployTrigger() {
  let connection;
  try {
    console.log('========================================');
    console.log('  DEPLOYING RECEIPT TRIGGER TO RAILWAY');
    console.log('========================================\n');
    
    console.log('🔄 Connecting to Railway MySQL...');
    connection = await mysql.createConnection(railwayConfig);
    console.log('✅ Connected successfully!\n');
    
    // Check if trigger exists
    console.log('🔄 Checking for existing trigger...');
    const [triggers] = await connection.query(`
      SELECT TRIGGER_NAME 
      FROM information_schema.TRIGGERS 
      WHERE TRIGGER_SCHEMA = 'railway' 
        AND TRIGGER_NAME = 'tr_create_receipt_on_payment_success'
    `);
    
    if (triggers.length > 0) {
      console.log('   Trigger already exists. Dropping...');
      await connection.query('DROP TRIGGER IF EXISTS tr_create_receipt_on_payment_success');
      console.log('   ✅ Dropped existing trigger\n');
    } else {
      console.log('   No existing trigger found.\n');
    }
    
    // Create trigger
    console.log('🔄 Creating receipt trigger...');
    await connection.query(createTriggerSQL);
    console.log('✅ Trigger created successfully!\n');
    
    // Verify trigger was created
    console.log('🔄 Verifying trigger...');
    const [newTriggers] = await connection.query(`
      SELECT 
        TRIGGER_NAME,
        EVENT_MANIPULATION,
        EVENT_OBJECT_TABLE,
        ACTION_TIMING
      FROM information_schema.TRIGGERS 
      WHERE TRIGGER_SCHEMA = 'railway' 
        AND TRIGGER_NAME = 'tr_create_receipt_on_payment_success'
    `);
    
    if (newTriggers.length > 0) {
      console.log('   Trigger details:');
      console.table(newTriggers);
      console.log('✅ Trigger verified!\n');
    } else {
      console.log('❌ Trigger not found after creation!\n');
    }
    
    // Check for any payments that need receipts
    console.log('🔄 Checking for payments without receipts...');
    const [paymentsWithoutReceipts] = await connection.query(`
      SELECT 
        pt.id,
        pt.request_id,
        pt.amount,
        pt.status,
        dr.request_number
      FROM payment_transactions pt
      JOIN document_requests dr ON pt.request_id = dr.id
      WHERE pt.status = 'succeeded'
        AND NOT EXISTS (SELECT 1 FROM receipts WHERE transaction_id = pt.id)
      LIMIT 5
    `);
    
    if (paymentsWithoutReceipts.length > 0) {
      console.log(`   Found ${paymentsWithoutReceipts.length} payments without receipts:`);
      console.table(paymentsWithoutReceipts);
      console.log('\n⚠️  These payments need receipts created manually.');
      console.log('   The trigger will only work for NEW payment updates.\n');
    } else {
      console.log('   ✅ All succeeded payments have receipts!\n');
    }
    
    console.log('========================================');
    console.log('  DEPLOYMENT COMPLETE!');
    console.log('========================================\n');
    console.log('✅ Receipt trigger deployed successfully!');
    console.log('✅ Future payments will automatically generate receipts!\n');
    console.log('Next steps:');
    console.log('1. Test payment flow in production');
    console.log('2. Verify receipts are created automatically');
    console.log('3. Check ClientTransactions.vue for receipt display\n');
    
  } catch (error) {
    console.error('\n========================================');
    console.error('  DEPLOYMENT FAILED!');
    console.error('========================================\n');
    console.error('❌ Error:', error.message);
    console.error('\nStack:', error.stack);
    console.error('\nTroubleshooting:');
    console.error('1. Verify Railway credentials');
    console.error('2. Check network connection');
    console.error('3. Ensure CREATE TRIGGER privilege');
    console.error('4. Check if receipts table exists\n');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Connection closed.\n');
    }
  }
}

deployTrigger();

