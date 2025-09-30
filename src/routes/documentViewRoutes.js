const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const SupportingDocument = require('../models/SupportingDocument');
const { protect, authorize } = require('../middleware/auth');
const { ApiResponse } = require('../utils/response');

/**
 * @route   GET /api/documents/view/:documentId
 * @desc    View/serve uploaded document file
 * @access  Private (Admin/Employee only)
 */
router.get('/view/:documentId', protect, authorize('admin', 'employee', 'client'), async (req, res) => {
  try {
    const documentId = parseInt(req.params.documentId);

    if (!documentId || isNaN(documentId)) {
      return ApiResponse.badRequest(res, 'Invalid document ID');
    }

    // Get document record from database
    const document = await SupportingDocument.findById(documentId);
    
    if (!document) {
      return ApiResponse.notFound(res, 'Document not found');
    }

    // Check if file exists on disk
    if (!fs.existsSync(document.file_path)) {
      return ApiResponse.notFound(res, 'Document file not found on server');
    }

    // Get file stats
    const stats = fs.statSync(document.file_path);
    
    // Set appropriate headers
    res.setHeader('Content-Type', document.mime_type || 'application/octet-stream');
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Content-Disposition', `inline; filename="${document.document_name}"`);
    
    // Add cache headers for better performance
    res.setHeader('Cache-Control', 'private, max-age=3600'); // Cache for 1 hour
    res.setHeader('Last-Modified', stats.mtime.toUTCString());
    
    // Check if client has cached version
    const ifModifiedSince = req.headers['if-modified-since'];
    if (ifModifiedSince && new Date(ifModifiedSince) >= stats.mtime) {
      return res.status(304).end(); // Not Modified
    }

    // Stream the file
    const fileStream = fs.createReadStream(document.file_path);
    
    fileStream.on('error', (error) => {
      console.error('Error streaming file:', error);
      if (!res.headersSent) {
        return ApiResponse.serverError(res, 'Error reading file');
      }
    });

    fileStream.pipe(res);

  } catch (error) {
    console.error('Document view error:', error);
    return ApiResponse.serverError(res, 'Failed to serve document');
  }
});

/**
 * @route   GET /api/documents/download/:documentId
 * @desc    Download uploaded document file
 * @access  Private (Admin/Employee only)
 */
router.get('/download/:documentId', protect, authorize('admin', 'employee', 'client'), async (req, res) => {
  try {
    const documentId = parseInt(req.params.documentId);
    
    if (!documentId || isNaN(documentId)) {
      return ApiResponse.badRequest(res, 'Invalid document ID');
    }

    // Get document record from database
    const document = await SupportingDocument.findById(documentId);
    
    if (!document) {
      return ApiResponse.notFound(res, 'Document not found');
    }

    // Check if file exists on disk
    if (!fs.existsSync(document.file_path)) {
      return ApiResponse.notFound(res, 'Document file not found on server');
    }

    // Get file stats
    const stats = fs.statSync(document.file_path);
    
    // Set download headers
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Content-Disposition', `attachment; filename="${document.document_name}"`);
    
    // Stream the file for download
    const fileStream = fs.createReadStream(document.file_path);
    
    fileStream.on('error', (error) => {
      console.error('Error streaming file for download:', error);
      if (!res.headersSent) {
        return ApiResponse.serverError(res, 'Error reading file');
      }
    });

    fileStream.pipe(res);

  } catch (error) {
    console.error('Document download error:', error);
    return ApiResponse.serverError(res, 'Failed to download document');
  }
});

/**
 * @route   GET /api/documents/info/:documentId
 * @desc    Get document information without serving the file
 * @access  Private (Admin/Employee only)
 */
router.get('/info/:documentId', protect, authorize('admin', 'employee'), async (req, res) => {
  try {
    const documentId = parseInt(req.params.documentId);
    
    if (!documentId || isNaN(documentId)) {
      return ApiResponse.badRequest(res, 'Invalid document ID');
    }

    // Get document record from database
    const document = await SupportingDocument.findById(documentId);
    
    if (!document) {
      return ApiResponse.notFound(res, 'Document not found');
    }

    return ApiResponse.success(res, document.toJSON(), 'Document information retrieved successfully');

  } catch (error) {
    console.error('Document info error:', error);
    return ApiResponse.serverError(res, 'Failed to get document information');
  }
});

module.exports = router;
