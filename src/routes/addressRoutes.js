const express = require('express');
const router = express.Router();
const addressController = require('../controllers/addressController');

/**
 * @route   GET /api/address/regions
 * @desc    Get all regions in the Philippines
 * @access  Public
 */
router.get('/regions', addressController.getRegions.bind(addressController));

/**
 * @route   GET /api/address/provinces
 * @desc    Get all provinces in the Philippines
 * @access  Public
 */
router.get('/provinces', addressController.getProvinces.bind(addressController));

/**
 * @route   GET /api/address/provinces/:regionCode
 * @desc    Get provinces by region code
 * @access  Public
 * @params  regionCode - The region code (e.g., "01", "02", etc.)
 */
router.get('/provinces/:regionCode', addressController.getProvincesByRegion.bind(addressController));

/**
 * @route   GET /api/address/cities
 * @desc    Get all cities/municipalities in the Philippines
 * @access  Public
 */
router.get('/cities', addressController.getCities.bind(addressController));

/**
 * @route   GET /api/address/cities/:provinceCode
 * @desc    Get cities/municipalities by province code
 * @access  Public
 * @params  provinceCode - The province code (e.g., "0128", "0129", etc.)
 */
router.get('/cities/:provinceCode', addressController.getCitiesByProvince.bind(addressController));

/**
 * @route   GET /api/address/barangays
 * @desc    Get all barangays in the Philippines
 * @access  Public
 */
router.get('/barangays', addressController.getBarangays.bind(addressController));

/**
 * @route   GET /api/address/barangays/:cityCode
 * @desc    Get barangays by city/municipality code
 * @access  Public
 * @params  cityCode - The city/municipality code (e.g., "012801", "012802", etc.)
 */
router.get('/barangays/:cityCode', addressController.getBarangaysByCity.bind(addressController));

/**
 * @route   GET /api/address/search/bula
 * @desc    Search for all Barangay Bula locations
 * @access  Public
 */
router.get('/search/bula', addressController.findBarangayBula.bind(addressController));

/**
 * @route   GET /api/address/complete/:barangayCode
 * @desc    Get complete address details for a barangay
 * @access  Public
 * @params  barangayCode - The barangay code (e.g., "012801001")
 */
router.get('/complete/:barangayCode', addressController.getCompleteAddress.bind(addressController));

/**
 * @route   POST /api/address/validate
 * @desc    Validate an address combination
 * @access  Public
 * @body    { regionCode, provinceCode, cityCode, barangayCode }
 */
router.post('/validate', addressController.validateAddress.bind(addressController));

/**
 * @route   DELETE /api/address/cache
 * @desc    Clear address data cache (Admin only)
 * @access  Private (Admin)
 */
router.delete('/cache', addressController.clearCache.bind(addressController));

module.exports = router;
