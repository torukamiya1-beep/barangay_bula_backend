const path = require('path');
const fs = require('fs').promises;
const { ApiResponse } = require('../utils/response');
const logger = require('../utils/logger');

class AddressController {
  constructor() {
    this.logger = logger;
    this.dataPath = path.join(__dirname, '../data/ph-addresses');
    this.cache = new Map();
    this.cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  }

  // Load JSON data with caching
  async loadJsonData(filename) {
    const cacheKey = filename;
    const cached = this.cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
      return cached.data;
    }

    try {
      const filePath = path.join(this.dataPath, filename);
      const data = await fs.readFile(filePath, 'utf8');
      const jsonData = JSON.parse(data);
      
      // Cache the data
      this.cache.set(cacheKey, {
        data: jsonData,
        timestamp: Date.now()
      });
      
      return jsonData;
    } catch (error) {
      this.logger.error(`Failed to load ${filename}:`, error);
      throw new Error(`Failed to load address data: ${filename}`);
    }
  }

  // Get all regions
  async getRegions(req, res) {
    try {
      const regions = await this.loadJsonData('region.json');
      return ApiResponse.success(res, regions, 'Regions retrieved successfully');
    } catch (error) {
      this.logger.error('Failed to get regions:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }

  // Get all provinces
  async getProvinces(req, res) {
    try {
      const provinces = await this.loadJsonData('province.json');
      return ApiResponse.success(res, provinces, 'Provinces retrieved successfully');
    } catch (error) {
      this.logger.error('Failed to get provinces:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }

  // Get provinces by region
  async getProvincesByRegion(req, res) {
    try {
      const { regionCode } = req.params;
      const provinces = await this.loadJsonData('province.json');
      
      const filteredProvinces = provinces.filter(province => 
        province.region_code === regionCode
      ).sort((a, b) => a.province_name.localeCompare(b.province_name));

      return ApiResponse.success(res, filteredProvinces, 'Provinces retrieved successfully');
    } catch (error) {
      this.logger.error('Failed to get provinces by region:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }

  // Get all cities
  async getCities(req, res) {
    try {
      const cities = await this.loadJsonData('city.json');
      return ApiResponse.success(res, cities, 'Cities retrieved successfully');
    } catch (error) {
      this.logger.error('Failed to get cities:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }

  // Get cities by province
  async getCitiesByProvince(req, res) {
    try {
      const { provinceCode } = req.params;
      const cities = await this.loadJsonData('city.json');
      
      const filteredCities = cities.filter(city => 
        city.province_code === provinceCode
      ).sort((a, b) => a.city_name.localeCompare(b.city_name));

      return ApiResponse.success(res, filteredCities, 'Cities retrieved successfully');
    } catch (error) {
      this.logger.error('Failed to get cities by province:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }

  // Get all barangays
  async getBarangays(req, res) {
    try {
      const barangays = await this.loadJsonData('barangay.json');
      return ApiResponse.success(res, barangays, 'Barangays retrieved successfully');
    } catch (error) {
      this.logger.error('Failed to get barangays:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }

  // Get barangays by city
  async getBarangaysByCity(req, res) {
    try {
      const { cityCode } = req.params;
      const barangays = await this.loadJsonData('barangay.json');
      
      const filteredBarangays = barangays.filter(barangay => 
        barangay.city_code === cityCode
      ).sort((a, b) => a.brgy_name.localeCompare(b.brgy_name));

      return ApiResponse.success(res, filteredBarangays, 'Barangays retrieved successfully');
    } catch (error) {
      this.logger.error('Failed to get barangays by city:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }

  // Search for Barangay Bula
  async findBarangayBula(req, res) {
    try {
      const barangays = await this.loadJsonData('barangay.json');
      const cities = await this.loadJsonData('city.json');
      const provinces = await this.loadJsonData('province.json');
      const regions = await this.loadJsonData('region.json');
      
      const bulaBarangays = barangays.filter(barangay => 
        barangay.brgy_name.toLowerCase().includes('bula')
      );

      // Enrich with location details
      const enrichedResults = bulaBarangays.map(barangay => {
        const city = cities.find(c => c.city_code === barangay.city_code);
        const province = provinces.find(p => p.province_code === barangay.province_code);
        const region = regions.find(r => r.region_code === barangay.region_code);

        return {
          ...barangay,
          city_name: city?.city_name || 'Unknown City',
          province_name: province?.province_name || 'Unknown Province',
          region_name: region?.region_name || 'Unknown Region'
        };
      });

      return ApiResponse.success(res, enrichedResults, 'Barangay Bula locations found');
    } catch (error) {
      this.logger.error('Failed to find Barangay Bula:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }

  // Get complete address details
  async getCompleteAddress(req, res) {
    try {
      const { barangayCode } = req.params;
      
      const barangays = await this.loadJsonData('barangay.json');
      const cities = await this.loadJsonData('city.json');
      const provinces = await this.loadJsonData('province.json');
      const regions = await this.loadJsonData('region.json');

      const barangay = barangays.find(b => b.brgy_code === barangayCode);
      if (!barangay) {
        return ApiResponse.error(res, 'Barangay not found', 404);
      }

      const city = cities.find(c => c.city_code === barangay.city_code);
      const province = provinces.find(p => p.province_code === barangay.province_code);
      const region = regions.find(r => r.region_code === barangay.region_code);

      const completeAddress = {
        barangay: barangay.brgy_name,
        city: city?.city_name || 'Unknown City',
        province: province?.province_name || 'Unknown Province',
        region: region?.region_name || 'Unknown Region',
        codes: {
          barangay: barangayCode,
          city: barangay.city_code,
          province: barangay.province_code,
          region: barangay.region_code
        }
      };

      return ApiResponse.success(res, completeAddress, 'Complete address retrieved successfully');
    } catch (error) {
      this.logger.error('Failed to get complete address:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }

  // Validate address combination
  async validateAddress(req, res) {
    try {
      const { regionCode, provinceCode, cityCode, barangayCode } = req.body;

      if (!regionCode || !provinceCode || !cityCode || !barangayCode) {
        return ApiResponse.error(res, 'All address codes are required', 400);
      }

      const regions = await this.loadJsonData('region.json');
      const provinces = await this.loadJsonData('province.json');
      const cities = await this.loadJsonData('city.json');
      const barangays = await this.loadJsonData('barangay.json');

      // Validate region
      const region = regions.find(r => r.region_code === regionCode);
      if (!region) {
        return ApiResponse.error(res, 'Invalid region code', 400);
      }

      // Validate province
      const province = provinces.find(p => 
        p.province_code === provinceCode && p.region_code === regionCode
      );
      if (!province) {
        return ApiResponse.error(res, 'Invalid province code for selected region', 400);
      }

      // Validate city
      const city = cities.find(c => 
        c.city_code === cityCode && c.province_code === provinceCode
      );
      if (!city) {
        return ApiResponse.error(res, 'Invalid city code for selected province', 400);
      }

      // Validate barangay
      const barangay = barangays.find(b => 
        b.brgy_code === barangayCode && b.city_code === cityCode
      );
      if (!barangay) {
        return ApiResponse.error(res, 'Invalid barangay code for selected city', 400);
      }

      return ApiResponse.success(res, { valid: true }, 'Address combination is valid');
    } catch (error) {
      this.logger.error('Failed to validate address:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }

  // Clear cache
  async clearCache(req, res) {
    try {
      this.cache.clear();
      return ApiResponse.success(res, null, 'Address data cache cleared successfully');
    } catch (error) {
      this.logger.error('Failed to clear cache:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
}

module.exports = new AddressController();
