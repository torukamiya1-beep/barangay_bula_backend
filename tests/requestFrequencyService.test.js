const RequestFrequencyService = require('../src/services/requestFrequencyService');
const { executeQuery } = require('../src/config/database');

// Mock the database module
jest.mock('../src/config/database');
jest.mock('../src/utils/logger');

describe('RequestFrequencyService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('canMakeRequest - Self Requests', () => {
    it('should allow request when no previous requests exist', async () => {
      executeQuery.mockResolvedValue([]);

      const result = await RequestFrequencyService.canMakeRequest(1, 'Cedula');

      expect(result.canRequest).toBe(true);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Request allowed.');
    });

    it('should block request when recent request exists for same document type', async () => {
      const mockRequest = {
        id: 1,
        request_number: 'CED-2024-001',
        requested_at: new Date(),
        status_name: 'pending',
        type_name: 'Cedula'
      };
      executeQuery.mockResolvedValue([mockRequest]);

      const result = await RequestFrequencyService.canMakeRequest(1, 'Cedula');

      expect(result.canRequest).toBe(false);
      expect(result.success).toBe(false);
      expect(result.message).toContain('already requested');
    });

    it('should allow different document types for same user', async () => {
      // Mock no previous Barangay Clearance requests
      executeQuery.mockResolvedValue([]);

      const result = await RequestFrequencyService.canMakeRequest(1, 'Barangay Clearance');

      expect(result.canRequest).toBe(true);
      expect(result.success).toBe(true);
    });
  });

  describe('canMakeRequestEnhanced - Third Party Requests', () => {
    it('should allow third-party request for family member with no previous requests', async () => {
      executeQuery.mockResolvedValue([]);

      const beneficiaryData = {
        first_name: 'John',
        last_name: 'Doe',
        birth_date: '1990-01-01'
      };

      const result = await RequestFrequencyService.canMakeRequestEnhanced(
        1, 'Cedula', true, beneficiaryData
      );

      expect(result.canRequest).toBe(true);
      expect(result.success).toBe(true);
    });

    it('should block third-party request when beneficiary already has recent request', async () => {
      const mockRequest = {
        id: 2,
        request_number: 'CED-2024-002',
        requested_at: new Date(),
        status_name: 'approved',
        type_name: 'Cedula',
        first_name: 'John',
        last_name: 'Doe',
        birth_date: '1990-01-01'
      };
      executeQuery.mockResolvedValue([mockRequest]);

      const beneficiaryData = {
        first_name: 'John',
        last_name: 'Doe',
        birth_date: '1990-01-01'
      };

      const result = await RequestFrequencyService.canMakeRequestEnhanced(
        1, 'Cedula', true, beneficiaryData
      );

      expect(result.canRequest).toBe(false);
      expect(result.message).toContain('John Doe');
    });

    it('should allow account owner and family member to have separate limits', async () => {
      // Mock that account owner has a cedula but family member doesn't
      executeQuery.mockImplementation((query, params) => {
        // If checking for family member (third-party), return no results
        if (params.includes('John') && params.includes('Doe')) {
          return Promise.resolve([]);
        }
        // If checking for account owner self-request, return existing request
        return Promise.resolve([{
          id: 1,
          request_number: 'CED-2024-001',
          requested_at: new Date(),
          status_name: 'completed',
          type_name: 'Cedula'
        }]);
      });

      const beneficiaryData = {
        first_name: 'John',
        last_name: 'Doe',
        birth_date: '1990-01-01'
      };

      // Family member request should be allowed
      const familyResult = await RequestFrequencyService.canMakeRequestEnhanced(
        1, 'Cedula', true, beneficiaryData
      );

      expect(familyResult.canRequest).toBe(true);
    });
  });

  describe('Document Type Separation', () => {
    it('should allow both Cedula and Barangay Clearance for same user', async () => {
      // Mock that user has a Cedula but no Barangay Clearance
      executeQuery.mockImplementation((query, params) => {
        if (params.includes('Barangay Clearance')) {
          return Promise.resolve([]); // No Barangay Clearance requests
        }
        return Promise.resolve([{
          id: 1,
          request_number: 'CED-2024-001',
          requested_at: new Date(),
          status_name: 'completed',
          type_name: 'Cedula'
        }]);
      });

      // Should allow Barangay Clearance even if user has Cedula
      const bcResult = await RequestFrequencyService.canMakeRequest(1, 'Barangay Clearance');
      expect(bcResult.canRequest).toBe(true);

      // Should block another Cedula
      const cedulaResult = await RequestFrequencyService.canMakeRequest(1, 'Cedula');
      expect(cedulaResult.canRequest).toBe(false);
    });
  });

  describe('Frequency Limits', () => {
    it('should use correct frequency limits for different document types', () => {
      const cedulaLimit = RequestFrequencyService.getFrequencyLimit('Cedula');
      const bcLimit = RequestFrequencyService.getFrequencyLimit('Barangay Clearance');
      const defaultLimit = RequestFrequencyService.getFrequencyLimit('Unknown Type');

      expect(cedulaLimit.days).toBe(365);
      expect(bcLimit.days).toBe(180);
      expect(defaultLimit.days).toBe(90);
    });
  });
});
