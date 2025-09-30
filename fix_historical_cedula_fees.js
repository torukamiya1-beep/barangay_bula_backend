/**
 * Application-Level Fix for Historical Cedula Fees
 * 
 * This script recalculates total_document_fee for existing cedula records
 * using the same codebase logic (no SQL calculations).
 */

const { executeQuery } = require('./src/config/database');
const CedulaApplication = require('./src/models/CedulaApplication');

async function fixHistoricalCedulaFees() {
  console.log('🔧 FIXING HISTORICAL CEDULA FEES');
  console.log('=' .repeat(50));

  try {
    // Get all cedula records that need fixing
    const query = `
      SELECT 
        dr.id,
        dr.request_number,
        dr.total_document_fee as current_fee,
        ca.annual_income,
        ca.property_assessed_value,
        ca.personal_property_value,
        ca.business_gross_receipts
      FROM document_requests dr
      JOIN cedula_applications ca ON dr.id = ca.request_id
      WHERE dr.document_type_id = 1
      ORDER BY dr.created_at DESC
    `;

    const records = await executeQuery(query);
    console.log(`📊 Found ${records.length} cedula records to process`);

    let fixedCount = 0;
    let alreadyCorrectCount = 0;

    for (const record of records) {
      // Use the same codebase calculation logic
      const taxCalculation = CedulaApplication.calculateTax(
        parseFloat(record.annual_income || 0),
        parseFloat(record.property_assessed_value || 0),
        parseFloat(record.personal_property_value || 0),
        parseFloat(record.business_gross_receipts || 0)
      );

      const finalFee = CedulaApplication.calculateFinalFee(taxCalculation.total_tax, 5.00);
      const correctTotalFee = finalFee.total_document_fee;
      const currentFee = parseFloat(record.current_fee);

      // Check if fee needs updating (allow small rounding differences)
      if (Math.abs(currentFee - correctTotalFee) > 0.01) {
        console.log(`🔄 Fixing ${record.request_number}: ₱${currentFee} → ₱${correctTotalFee}`);
        
        // Update using codebase calculation
        const updateQuery = `
          UPDATE document_requests 
          SET total_document_fee = ?, updated_at = NOW()
          WHERE id = ?
        `;
        
        await executeQuery(updateQuery, [correctTotalFee, record.id]);
        
        // Also update computed_tax in cedula_applications
        const updateTaxQuery = `
          UPDATE cedula_applications 
          SET computed_tax = ?
          WHERE request_id = ?
        `;
        
        await executeQuery(updateTaxQuery, [taxCalculation.total_tax, record.id]);
        
        fixedCount++;
      } else {
        alreadyCorrectCount++;
      }
    }

    console.log('\n✅ FIX COMPLETED');
    console.log(`📊 Records processed: ${records.length}`);
    console.log(`🔧 Records fixed: ${fixedCount}`);
    console.log(`✅ Already correct: ${alreadyCorrectCount}`);

    // Verification
    console.log('\n🔍 VERIFICATION:');
    const verificationQuery = `
      SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN total_document_fee < 3000 THEN 1 END) as potentially_buggy,
        COUNT(CASE WHEN total_document_fee >= 6000 THEN 1 END) as likely_correct,
        MIN(total_document_fee) as min_fee,
        MAX(total_document_fee) as max_fee,
        AVG(total_document_fee) as avg_fee
      FROM document_requests 
      WHERE document_type_id = 1
    `;
    
    const verification = await executeQuery(verificationQuery);
    console.table(verification);

  } catch (error) {
    console.error('❌ Error fixing historical fees:', error);
    throw error;
  }
}

// Run the fix
if (require.main === module) {
  fixHistoricalCedulaFees()
    .then(() => {
      console.log('🎉 Historical cedula fees fixed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Failed to fix historical fees:', error);
      process.exit(1);
    });
}

module.exports = { fixHistoricalCedulaFees };
