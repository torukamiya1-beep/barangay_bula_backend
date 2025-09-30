const { executeQuery } = require('../config/database');

class CedulaApplication {
  constructor(data) {
    this.id = data.id;
    this.request_id = data.request_id;
    this.occupation = data.occupation;
    this.employer_name = data.employer_name;
    this.employer_address = data.employer_address;
    this.monthly_income = data.monthly_income;
    this.annual_income = data.annual_income;
    this.business_name = data.business_name;
    this.business_address = data.business_address;
    this.business_type = data.business_type;
    this.business_income = data.business_income;
    this.business_gross_receipts = data.business_gross_receipts;
    this.personal_property_value = data.personal_property_value;
    this.has_real_property = data.has_real_property;
    this.has_personal_property = data.has_personal_property;
    this.property_assessed_value = data.property_assessed_value;
    this.property_location = data.property_location;
    this.tin_number = data.tin_number;
    this.previous_ctc_number = data.previous_ctc_number;
    this.previous_ctc_date_issued = data.previous_ctc_date_issued;
    this.previous_ctc_place_issued = data.previous_ctc_place_issued;
    this.computed_tax = data.computed_tax;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Find by request ID
  static async findByRequestId(requestId) {
    const query = 'SELECT * FROM cedula_applications WHERE request_id = ?';
    const results = await executeQuery(query, [requestId]);
    return results.length > 0 ? new CedulaApplication(results[0]) : null;
  }

  // Create new cedula application
  static async create(applicationData) {
    const {
      request_id,
      occupation,
      employer_name,
      employer_address,
      monthly_income,
      annual_income,
      business_name,
      business_address,
      business_type,
      business_income,
      business_gross_receipts,
      has_real_property = false,
      has_personal_property = false,
      personal_property_value,
      property_assessed_value,
      property_location,
      tin_number,
      previous_ctc_number,
      previous_ctc_date_issued,
      previous_ctc_place_issued,
      computed_tax
    } = applicationData;

    const query = `
      INSERT INTO cedula_applications (
        request_id, occupation, employer_name, employer_address,
        monthly_income, annual_income, business_name, business_address,
        business_type, business_income, business_gross_receipts, has_real_property,
        has_personal_property, personal_property_value, property_assessed_value,
        property_location, tin_number, previous_ctc_number, previous_ctc_date_issued,
        previous_ctc_place_issued, computed_tax
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      request_id, occupation, employer_name, employer_address,
      monthly_income, annual_income, business_name, business_address,
      business_type, business_income, business_gross_receipts, has_real_property,
      has_personal_property, personal_property_value, property_assessed_value,
      property_location, tin_number, previous_ctc_number, previous_ctc_date_issued,
      previous_ctc_place_issued, computed_tax
    ];

    const result = await executeQuery(query, values);
    return result.insertId;
  }

  // Calculate tax based on Philippine Community Tax Law (R.A. 7160)
  static calculateTax(annualIncome = 0, propertyAssessedValue = 0, personalPropertyValue = 0, businessGrossReceipts = 0) {
    // Basic community tax (minimum ₱5.00)
    const basicTax = 5.00;
    
    // Additional tax calculations (₱1.00 for every ₱1,000)
    const incomeTax = Math.floor(annualIncome / 1000) * 1.00;
    const realPropertyTax = Math.floor(propertyAssessedValue / 1000) * 1.00;
    const personalPropertyTax = Math.floor(personalPropertyValue / 1000) * 1.00;
    const businessTax = Math.floor(businessGrossReceipts / 1000) * 1.00;
    
    // Total additional tax (maximum ₱5,000 as per law)
    const totalAdditionalTax = Math.min(incomeTax + realPropertyTax + personalPropertyTax + businessTax, 5000);
    const totalPropertyTax = realPropertyTax + personalPropertyTax;
    const totalTax = basicTax + totalAdditionalTax;

    return {
      basic_tax: parseFloat(basicTax.toFixed(2)),
      income_tax: parseFloat(incomeTax.toFixed(2)),
      real_property_tax: parseFloat(realPropertyTax.toFixed(2)),
      personal_property_tax: parseFloat(personalPropertyTax.toFixed(2)),
      business_tax: parseFloat(businessTax.toFixed(2)),
      total_property_tax: parseFloat(totalPropertyTax.toFixed(2)),
      total_tax: parseFloat(totalTax.toFixed(2))
    };
  }

  // Calculate final fee including PayMongo minimum requirement
  static calculateFinalFee(taxAmount, processingFee = 5.00) {
    const baseTotal = taxAmount + processingFee;
    const paymongoMinimum = 100.00; // Confirmed by PayMongo API testing
    const convenienceFee = Math.max(0, paymongoMinimum - baseTotal);

    return {
      tax_amount: parseFloat(taxAmount.toFixed(2)),
      processing_fee: parseFloat(processingFee.toFixed(2)),
      convenience_fee: parseFloat(convenienceFee.toFixed(2)),
      total_document_fee: parseFloat((baseTotal + convenienceFee).toFixed(2)),
      breakdown: convenienceFee > 0
        ? `Tax: ₱${taxAmount.toFixed(2)} + Processing: ₱${processingFee.toFixed(2)} + Convenience: ₱${convenienceFee.toFixed(2)} = ₱${(baseTotal + convenienceFee).toFixed(2)}`
        : `Tax: ₱${taxAmount.toFixed(2)} + Processing: ₱${processingFee.toFixed(2)} = ₱${baseTotal.toFixed(2)}`
    };
  }

  // Convert to JSON
  toJSON() {
    return { ...this };
  }
}

module.exports = CedulaApplication;
