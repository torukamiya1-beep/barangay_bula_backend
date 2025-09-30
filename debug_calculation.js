console.log('🔍 DEBUGGING CEDULA CALCULATION');

// Manual calculation to verify logic
const testValues = {
  annual_income: 30000,
  property_assessed_value: 1000000,
  personal_property_value: 1500000,
  business_gross_receipts: 100000
};

console.log('Test values:', testValues);

// Step by step calculation
console.log('\n📊 STEP BY STEP CALCULATION:');

// Basic tax
const basicTax = 5.00;
console.log(`1. Basic tax: ₱${basicTax}`);

// Income tax
const incomeTax = Math.min(Math.floor(testValues.annual_income / 1000) * 1.00, 5000);
console.log(`2. Income tax: Math.min(Math.floor(${testValues.annual_income} / 1000) * 1.00, 5000) = ₱${incomeTax}`);

// Real property tax
let realPropertyTax = 0;
if (testValues.property_assessed_value > 0) {
  let realRate;
  if (testValues.property_assessed_value <= 100000) realRate = 0.5;
  else if (testValues.property_assessed_value <= 500000) realRate = 1.0;
  else realRate = 1.5;
  realPropertyTax = testValues.property_assessed_value * (realRate / 100);
  console.log(`3. Real property tax: ₱${testValues.property_assessed_value} × ${realRate}% = ₱${realPropertyTax}`);
}

// Personal property tax
let personalPropertyTax = 0;
if (testValues.personal_property_value > 0) {
  let personalRate;
  if (testValues.personal_property_value <= 10000) personalRate = 0.25;
  else if (testValues.personal_property_value <= 50000) personalRate = 0.5;
  else personalRate = 1.0;
  personalPropertyTax = testValues.personal_property_value * (personalRate / 100);
  console.log(`4. Personal property tax: ₱${testValues.personal_property_value} × ${personalRate}% = ₱${personalPropertyTax}`);
}

// Property tax cap
const totalPropertyTaxBeforeCap = realPropertyTax + personalPropertyTax;
const propertyTax = Math.min(totalPropertyTaxBeforeCap, 5000);
console.log(`5. Total property tax: ₱${totalPropertyTaxBeforeCap} (capped at ₱5,000) = ₱${propertyTax}`);

// Business tax
let businessTax = 0;
if (testValues.business_gross_receipts > 0) {
  let businessRate;
  if (testValues.business_gross_receipts <= 50000) businessRate = 0.5;
  else if (testValues.business_gross_receipts <= 200000) businessRate = 1.0;
  else if (testValues.business_gross_receipts <= 500000) businessRate = 1.5;
  else businessRate = 2.0;
  businessTax = Math.min(testValues.business_gross_receipts * (businessRate / 100), 5000);
  console.log(`6. Business tax: ₱${testValues.business_gross_receipts} × ${businessRate}% = ₱${businessTax}`);
}

// Total tax
const totalTax = basicTax + incomeTax + propertyTax + businessTax;
console.log(`7. Total cedula tax: ₱${basicTax} + ₱${incomeTax} + ₱${propertyTax} + ₱${businessTax} = ₱${totalTax}`);

// Final fee
const processingFee = 5.00;
const baseTotal = totalTax + processingFee;
const paymongoMinimum = 100.00;
const convenienceFee = Math.max(0, paymongoMinimum - baseTotal);
const totalFee = baseTotal + convenienceFee;

console.log(`8. Processing fee: ₱${processingFee}`);
console.log(`9. Base total: ₱${baseTotal}`);
console.log(`10. Convenience fee: ₱${convenienceFee}`);
console.log(`11. TOTAL DOCUMENT FEE: ₱${totalFee}`);

console.log('\n✅ EXPECTED RESULTS:');
console.log(`Expected cedula tax: ₱6,035`);
console.log(`Expected total fee: ₱6,040`);
console.log(`Actual cedula tax: ₱${totalTax}`);
console.log(`Actual total fee: ₱${totalFee}`);

const taxCorrect = Math.abs(totalTax - 6035) < 0.01;
const feeCorrect = Math.abs(totalFee - 6040) < 0.01;

console.log(`Tax calculation correct: ${taxCorrect ? '✅ YES' : '❌ NO'}`);
console.log(`Fee calculation correct: ${feeCorrect ? '✅ YES' : '❌ NO'}`);

// Now test the actual model
console.log('\n🧪 TESTING ACTUAL MODEL:');
try {
  const CedulaApplication = require('./src/models/CedulaApplication');
  const result = CedulaApplication.calculateTax(
    testValues.annual_income,
    testValues.property_assessed_value,
    testValues.personal_property_value,
    testValues.business_gross_receipts
  );
  console.log('Model result:', result);
  
  const finalFee = CedulaApplication.calculateFinalFee(result.total_tax, 5.00);
  console.log('Final fee result:', finalFee);
  
} catch (error) {
  console.error('❌ Error with model:', error.message);
  console.error('Stack trace:', error.stack);
}
