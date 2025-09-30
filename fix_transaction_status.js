require('dotenv').config();
const { executeQuery, connectDatabase, closeDatabase } = require('./src/config/database');
const Receipt = require('./src/models/Receipt');

async function fixTransactionStatus() {
  try {
    console.log('🔧 Fixing transaction status and creating receipt...\n');
    
    await connectDatabase();
    
    // Get the transaction with empty status
    const transaction = await executeQuery(`
      SELECT * FROM payment_transactions 
      WHERE status = '' OR status IS NULL
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    if (transaction.length === 0) {
      console.log('❌ No transactions with empty status found');
      return;
    }
    
    const tx = transaction[0];
    console.log(`📋 Found transaction ID: ${tx.id}, Request ID: ${tx.request_id}`);
    
    // Update the transaction status to 'paid'
    await executeQuery(`
      UPDATE payment_transactions 
      SET status = 'paid', completed_at = NOW()
      WHERE id = ?
    `, [tx.id]);
    
    console.log('✅ Transaction status updated to "paid"');
    
    // Check if receipt already exists
    const existingReceipt = await executeQuery(
      'SELECT id FROM receipts WHERE transaction_id = ?',
      [tx.id]
    );
    
    if (existingReceipt.length > 0) {
      console.log('✅ Receipt already exists');
      return;
    }
    
    // Get complete payment transaction data for receipt creation
    const receiptQuery = `
      SELECT
        pt.id as transaction_id,
        dr.client_id,
        pt.request_id,
        CONCAT(cp.first_name, ' ', cp.last_name) as client_name,
        cp.email as client_email,
        cp.phone_number as client_phone,
        dr.request_number,
        dt.type_name as document_type,
        pm.method_name as payment_method,
        pm.method_code as payment_method_code,
        pt.amount,
        pt.processing_fee,
        pt.net_amount,
        pt.currency,
        pt.external_transaction_id,
        pt.paymongo_payment_intent_id,
        pt.payment_description
      FROM payment_transactions pt
      JOIN document_requests dr ON pt.request_id = dr.id
      JOIN client_profiles cp ON dr.client_id = cp.account_id
      JOIN document_types dt ON dr.document_type_id = dt.id
      JOIN payment_methods pm ON pt.payment_method_id = pm.id
      WHERE pt.id = ?
    `;
    
    const receiptData = await executeQuery(receiptQuery, [tx.id]);
    
    if (receiptData.length === 0) {
      console.log('❌ Could not get complete transaction data for receipt');
      return;
    }
    
    const data = receiptData[0];
    console.log(`📋 Creating receipt for client: ${data.client_name}`);
    
    // Generate receipt number
    const receiptNumber = Receipt.generateReceiptNumber(data.transaction_id);
    
    // Create receipt with proper null handling
    const receipt = await Receipt.create({
      transaction_id: data.transaction_id,
      client_id: data.client_id,
      request_id: data.request_id,
      receipt_number: receiptNumber,
      client_name: data.client_name || 'Unknown Client',
      client_email: data.client_email || null,
      client_phone: data.client_phone || null,
      request_number: data.request_number || 'N/A',
      document_type: data.document_type || 'Unknown Document',
      payment_method: data.payment_method || 'Online Payment',
      payment_method_code: data.payment_method_code || 'ONLINE',
      amount: parseFloat(data.amount) || 0,
      processing_fee: parseFloat(data.processing_fee) || 0,
      net_amount: parseFloat(data.net_amount) || parseFloat(data.amount) || 0,
      currency: data.currency || 'PHP',
      external_transaction_id: data.external_transaction_id || null,
      paymongo_payment_intent_id: data.paymongo_payment_intent_id || null,
      payment_status: 'succeeded',
      receipt_date: new Date(),
      payment_date: new Date(),
      description: data.payment_description || 'Payment for document request',
      notes: null
    });
    
    console.log(`✅ Receipt created successfully: ${receiptNumber}`);
    console.log(`📋 Receipt ID: ${receipt.id}`);
    
    // Update document request status to payment_confirmed
    await executeQuery(`
      UPDATE document_requests
      SET
        payment_status = 'paid',
        paid_at = NOW(),
        status_id = 11,
        updated_at = NOW()
      WHERE id = ?
    `, [tx.request_id]);
    
    console.log('✅ Document request status updated to payment_confirmed');
    
    await closeDatabase();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
}

fixTransactionStatus();
