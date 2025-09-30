const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env' });

async function comprehensiveBugAnalysis() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'barangay_management_system',
      port: process.env.DB_PORT || 3306
    });

    console.log('🔍 COMPREHENSIVE CEDULA FEE CALCULATION BUG ANALYSIS');
    console.log('=' .repeat(70));

    // User's exact test case
    const testValues = {
      annual_income: 30000,
      property_assessed_value: 1000000,
      personal_property_value: 1500000,
      business_gross_receipts: 100000
    };

    console.log('\n📊 USER TEST CASE VALUES:');
    console.log(`Annual income: ₱${testValues.annual_income.toLocaleString()}`);
    console.log(`Real property assessed value: ₱${testValues.property_assessed_value.toLocaleString()}`);
    console.log(`Personal property value: ₱${testValues.personal_property_value.toLocaleString()}`);
    console.log(`Business gross receipts: ₱${testValues.business_gross_receipts.toLocaleString()}`);

    // ========== FRONTEND CALCULATION SIMULATION ==========
    console.log('\n🖥️  FRONTEND CALCULATION SIMULATION:');
    console.log('=' .repeat(50));

    // Simulate frontend rate calculation methods
    function getIncomeRate(income) {
      if (income <= 10000) return 0.5;
      if (income <= 50000) return 1.0;
      if (income <= 100000) return 1.5;
      return 2.0;
    }

    function getPropertyRate(value) {
      if (value <= 100000) return 0.5;
      if (value <= 500000) return 1.0;
      return 1.5;
    }

    function getPersonalPropertyRate(value) {
      if (value <= 10000) return 0.25;
      if (value <= 50000) return 0.5;
      return 1.0;
    }

    function getBusinessRate(receipts) {
      if (receipts <= 50000) return 0.5;
      if (receipts <= 200000) return 1.0;
      if (receipts <= 500000) return 1.5;
      return 2.0;
    }

    // Frontend computed properties simulation
    const income = testValues.annual_income || 0;
    const incomeTax = Math.min(Math.floor(income / 1000) * 1.00, 5000);

    let propertyTax = 0;
    // Real property tax
    const realValue = testValues.property_assessed_value || 0;
    const realRate = getPropertyRate(realValue) / 100;
    const realPropertyTax = realValue * realRate;
    propertyTax += realPropertyTax;

    // Personal property tax
    const personalValue = testValues.personal_property_value || 0;
    const personalRate = getPersonalPropertyRate(personalValue) / 100;
    const personalPropertyTax = personalValue * personalRate;
    propertyTax += personalPropertyTax;

    propertyTax = Math.min(propertyTax, 5000); // Maximum property tax

    // Business tax
    const receipts = testValues.business_gross_receipts || 0;
    const businessRate = getBusinessRate(receipts) / 100;
    const businessTax = Math.min(receipts * businessRate, 5000);

    // Total tax
    const basicTax = 5.00;
    const totalTax = basicTax + incomeTax + propertyTax + businessTax;

    // Total fee
    const processingFee = 5.00;
    const baseTotal = totalTax + processingFee;
    const paymongoMinimum = 100.00;
    const convenienceFee = Math.max(0, paymongoMinimum - baseTotal);
    const totalFee = baseTotal + convenienceFee;

    console.log('Frontend Calculation Breakdown:');
    console.log(`Basic tax: ₱${basicTax.toFixed(2)}`);
    console.log(`Income tax: ₱${incomeTax.toFixed(2)} (₱${income} ÷ 1,000 × ₱1, max ₱5,000)`);
    console.log(`Real property tax: ₱${realPropertyTax.toFixed(2)} (₱${realValue} × ${getPropertyRate(realValue)}%)`);
    console.log(`Personal property tax: ₱${personalPropertyTax.toFixed(2)} (₱${personalValue} × ${getPersonalPropertyRate(personalValue)}%)`);
    console.log(`Total property tax: ₱${propertyTax.toFixed(2)} (capped at ₱5,000)`);
    console.log(`Business tax: ₱${businessTax.toFixed(2)} (₱${receipts} × ${getBusinessRate(receipts)}%, max ₱5,000)`);
    console.log(`TOTAL CEDULA TAX: ₱${totalTax.toFixed(2)}`);
    console.log(`Processing fee: ₱${processingFee.toFixed(2)}`);
    console.log(`Convenience fee: ₱${convenienceFee.toFixed(2)}`);
    console.log(`TOTAL DOCUMENT FEE: ₱${totalFee.toFixed(2)}`);

    // ========== BACKEND CALCULATION ==========
    console.log('\n🖥️  BACKEND CALCULATION:');
    console.log('=' .repeat(30));

    const CedulaApplication = require('./src/models/CedulaApplication');
    const backendCalculation = CedulaApplication.calculateTax(
      testValues.annual_income,
      testValues.property_assessed_value,
      testValues.personal_property_value,
      testValues.business_gross_receipts
    );

    const backendFinalFee = CedulaApplication.calculateFinalFee(backendCalculation.total_tax, 5.00);

    console.log('Backend Calculation Breakdown:');
    console.log(`Basic tax: ₱${backendCalculation.basic_tax}`);
    console.log(`Income tax: ₱${backendCalculation.income_tax}`);
    console.log(`Real property tax: ₱${backendCalculation.real_property_tax}`);
    console.log(`Personal property tax: ₱${backendCalculation.personal_property_tax}`);
    console.log(`Total property tax: ₱${backendCalculation.total_property_tax}`);
    console.log(`Business tax: ₱${backendCalculation.business_tax}`);
    console.log(`TOTAL CEDULA TAX: ₱${backendCalculation.total_tax}`);
    console.log(`Processing fee: ₱${backendFinalFee.processing_fee}`);
    console.log(`Convenience fee: ₱${backendFinalFee.convenience_fee}`);
    console.log(`TOTAL DOCUMENT FEE: ₱${backendFinalFee.total_document_fee}`);

    // ========== COMPARISON ==========
    console.log('\n⚖️  FRONTEND vs BACKEND COMPARISON:');
    console.log('=' .repeat(45));

    const frontendTotalTax = totalTax;
    const frontendTotalFee = totalFee;
    const backendTotalTax = backendCalculation.total_tax;
    const backendTotalFee = backendFinalFee.total_document_fee;

    console.log(`Frontend total tax: ₱${frontendTotalTax.toFixed(2)}`);
    console.log(`Backend total tax: ₱${backendTotalTax.toFixed(2)}`);
    console.log(`Tax difference: ₱${Math.abs(frontendTotalTax - backendTotalTax).toFixed(2)}`);
    console.log(`Tax calculations match: ${Math.abs(frontendTotalTax - backendTotalTax) < 0.01 ? '✅ YES' : '❌ NO'}`);

    console.log(`Frontend total fee: ₱${frontendTotalFee.toFixed(2)}`);
    console.log(`Backend total fee: ₱${backendTotalFee.toFixed(2)}`);
    console.log(`Fee difference: ₱${Math.abs(frontendTotalFee - backendTotalFee).toFixed(2)}`);
    console.log(`Fee calculations match: ${Math.abs(frontendTotalFee - backendTotalFee) < 0.01 ? '✅ YES' : '❌ NO'}`);

    // ========== SUBMISSION VALIDATION SIMULATION ==========
    console.log('\n🔍 SUBMISSION VALIDATION SIMULATION:');
    console.log('=' .repeat(45));

    // Simulate the backend validation logic from documentRequestService.js
    const frontendSentFee = frontendTotalFee; // What frontend would send
    const backendExpectedFee = backendTotalFee; // What backend calculates

    console.log(`Frontend sends: ₱${frontendSentFee.toFixed(2)}`);
    console.log(`Backend expects: ₱${backendExpectedFee.toFixed(2)}`);
    console.log(`Difference: ₱${Math.abs(frontendSentFee - backendExpectedFee).toFixed(2)}`);

    let finalStoredFee = frontendSentFee;
    if (Math.abs(frontendSentFee - backendExpectedFee) > 0.01) {
      console.log('⚠️  Backend would override frontend calculation');
      finalStoredFee = backendExpectedFee;
    } else {
      console.log('✅ Backend would accept frontend calculation');
    }

    console.log(`Final stored fee: ₱${finalStoredFee.toFixed(2)}`);

    // ========== DATABASE INVESTIGATION ==========
    console.log('\n💾 DATABASE INVESTIGATION:');
    console.log('=' .repeat(35));

    // Check existing requests with the user's test case values
    const [existingRequests] = await connection.execute(`
      SELECT 
        dr.id,
        dr.request_number,
        dr.total_document_fee,
        dr.created_at,
        ca.annual_income,
        ca.property_assessed_value,
        ca.personal_property_value,
        ca.business_gross_receipts,
        ca.computed_tax
      FROM document_requests dr
      JOIN cedula_applications ca ON dr.id = ca.request_id
      WHERE dr.document_type_id = 1 
        AND ca.annual_income = ?
        AND ca.property_assessed_value = ?
        AND ca.personal_property_value = ?
        AND ca.business_gross_receipts = ?
      ORDER BY dr.created_at DESC
    `, [
      testValues.annual_income,
      testValues.property_assessed_value,
      testValues.personal_property_value,
      testValues.business_gross_receipts
    ]);

    if (existingRequests.length > 0) {
      console.log(`Found ${existingRequests.length} existing request(s) with these exact values:`);
      existingRequests.forEach((req, index) => {
        console.log(`\n${index + 1}. Request ID: ${req.id}`);
        console.log(`   Request Number: ${req.request_number}`);
        console.log(`   Stored Total Fee: ₱${parseFloat(req.total_document_fee).toFixed(2)}`);
        console.log(`   Stored Computed Tax: ₱${parseFloat(req.computed_tax).toFixed(2)}`);
        console.log(`   Created: ${req.created_at}`);
        
        const storedFee = parseFloat(req.total_document_fee);
        if (Math.abs(storedFee - 2640) < 0.01) {
          console.log(`   🐛 This request has the BUGGY amount (₱2,640)`);
        } else if (Math.abs(storedFee - 6040) < 0.01) {
          console.log(`   ✅ This request has the CORRECT amount (₱6,040)`);
        } else {
          console.log(`   ❓ This request has an unexpected amount`);
        }
      });
    } else {
      console.log('No existing requests found with these exact values');
    }

    // ========== ROOT CAUSE ANALYSIS ==========
    console.log('\n🔍 ROOT CAUSE ANALYSIS:');
    console.log('=' .repeat(35));

    if (Math.abs(frontendTotalFee - backendTotalFee) > 0.01) {
      console.log('❌ DISCREPANCY FOUND:');
      console.log(`Frontend calculates: ₱${frontendTotalFee.toFixed(2)}`);
      console.log(`Backend calculates: ₱${backendTotalFee.toFixed(2)}`);
      console.log(`Difference: ₱${Math.abs(frontendTotalFee - backendTotalFee).toFixed(2)}`);
      
      // Detailed breakdown comparison
      console.log('\n📊 DETAILED BREAKDOWN COMPARISON:');
      console.log('Component | Frontend | Backend | Match');
      console.log('----------|----------|---------|------');
      console.log(`Basic Tax | ₱${basicTax.toFixed(2)} | ₱${backendCalculation.basic_tax} | ${Math.abs(basicTax - backendCalculation.basic_tax) < 0.01 ? '✅' : '❌'}`);
      console.log(`Income Tax | ₱${incomeTax.toFixed(2)} | ₱${backendCalculation.income_tax} | ${Math.abs(incomeTax - backendCalculation.income_tax) < 0.01 ? '✅' : '❌'}`);
      console.log(`Property Tax | ₱${propertyTax.toFixed(2)} | ₱${backendCalculation.total_property_tax} | ${Math.abs(propertyTax - backendCalculation.total_property_tax) < 0.01 ? '✅' : '❌'}`);
      console.log(`Business Tax | ₱${businessTax.toFixed(2)} | ₱${backendCalculation.business_tax} | ${Math.abs(businessTax - backendCalculation.business_tax) < 0.01 ? '✅' : '❌'}`);
      
    } else {
      console.log('✅ NO DISCREPANCY: Frontend and backend calculations match');
    }

    // ========== FINAL DIAGNOSIS ==========
    console.log('\n🎯 FINAL DIAGNOSIS:');
    console.log('=' .repeat(25));

    if (existingRequests.length > 0) {
      const buggyRequests = existingRequests.filter(req => Math.abs(parseFloat(req.total_document_fee) - 2640) < 0.01);
      const correctRequests = existingRequests.filter(req => Math.abs(parseFloat(req.total_document_fee) - 6040) < 0.01);
      
      if (buggyRequests.length > 0 && correctRequests.length === 0) {
        console.log('🐛 BUG CONFIRMED: All existing requests have the buggy ₱2,640 amount');
        console.log('📅 These requests were likely created before the fix was applied');
        console.log('🔧 SOLUTION: Submit a NEW request to verify the fix is working');
      } else if (correctRequests.length > 0) {
        console.log('✅ FIX CONFIRMED: Recent requests show the correct ₱6,040 amount');
        console.log('🎉 The bug has been resolved for new submissions');
      } else {
        console.log('❓ MIXED RESULTS: Requests show various amounts - needs investigation');
      }
    }

    if (Math.abs(frontendTotalFee - backendTotalFee) < 0.01) {
      console.log('✅ CALCULATION LOGIC: Frontend and backend are now synchronized');
      console.log('🚀 NEW SUBMISSIONS: Will correctly calculate and store ₱6,040');
    } else {
      console.log('❌ CALCULATION LOGIC: Frontend and backend still have discrepancies');
      console.log('🔧 NEEDS FIX: Backend calculation logic needs to be updated');
    }

  } catch (error) {
    console.error('❌ Error during comprehensive analysis:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (connection) await connection.end();
  }
}

comprehensiveBugAnalysis();
