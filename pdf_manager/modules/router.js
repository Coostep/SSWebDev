/**
 * Custom Routing Module for PDF Document Manager
 * Uses Express Router for proper middleware handling
 * COS 498 - Assignment 3: Secure PDF Server
 */

const express = require('express');
const path = require('path');
const pdfValidation = require('./pdfValidation');
const pdfDiscovery = require('./pdfDiscovery');
const database = require('./database');

const router = express.Router();

/**
 * Homepage route
 */
router.get('/', async (req, res) => {
  try {
    const recentPDFs = await database.getRecentPDFs(3);
    const totalPDFs = await database.getPDFCount();
    
    res.render('index', {
      title: 'COS 498 - PDF Document Manager',
      recentPDFs,
      totalPDFs,
      active: 'home'
    });
  } catch (error) {
    console.error('Error rendering homepage:', error);
    res.status(500).render('error', {
      title: 'Server Error',
      message: 'Unable to load homepage content.'
    });
  }
});

/**
 * PDF Library route
 */
router.get('/library', async (req, res) => {
  try {
    const category = req.query.category;
    let pdfs;
    
    if (category && category !== 'all') {
      pdfs = await database.getPDFsByCategory(category);
    } else {
      pdfs = await database.getAllPDFMetadata();
    }

    const categories = await database.getCategories();
    const totalCount = await database.getPDFCount();
    
    res.render('library', {
      title: 'PDF Library - COS 498',
      pdfs,
      categories,
      currentCategory: category || 'all',
      totalCount,
      active: 'library'
    });
  } catch (error) {
    console.error('Error rendering library:', error);
    res.status(500).render('error', {
      title: 'Server Error',
      message: 'Unable to load PDF library.'
    });
  }
});

/**
 * PDF Detail route
 */
router.get('/pdf/:id', async (req, res) => {
  try {
    const pdfId = parseInt(req.params.id);
    
    if (isNaN(pdfId)) {
      return res.status(400).render('error', {
        title: 'Invalid PDF ID',
        message: 'The PDF ID must be a valid number.'
      });
    }

    const pdf = await database.getPDFMetadataById(pdfId);
    
    if (!pdf) {
      return res.status(404).render('error', {
        title: 'PDF Not Found',
        message: 'The requested PDF document was not found.'
      });
    }

    res.render('pdf-detail', {
      title: pdf.display_title,
      pdf,
      active: 'library'
    });
  } catch (error) {
    console.error('Error rendering PDF detail:', error);
    res.status(500).render('error', {
      title: 'Server Error',
      message: 'Unable to load PDF details.'
    });
  }
});

/**
 * PDF Download route
 */
router.get('/download/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    
    // Validate filename
    if (!filename || typeof filename !== 'string') {
      return res.status(400).render('error', {
        title: 'Invalid Filename',
        message: 'Please provide a valid PDF filename.'
      });
    }

    const isValid = await pdfValidation.validatePDF(filename);
    
    if (isValid) {
      const filePath = path.join(__dirname, '../pdfs', filename);
      res.download(filePath, filename, (err) => {
        if (err) {
          console.error('Download error:', err);
          if (!res.headersSent) {
            res.status(500).render('error', {
              title: 'Download Error',
              message: 'Unable to download the PDF file.'
            });
          }
        }
      });
    } else {
      res.status(404).render('error', {
        title: 'PDF Not Found',
        message: 'The requested PDF document was not found or is not accessible.'
      });
    }
  } catch (error) {
    console.error('Download route error:', error);
    res.status(500).render('error', {
      title: 'Server Error',
      message: 'Unable to process download request.'
    });
  }
});

/**
 * About route
 */
router.get('/about', (req, res) => {
  res.render('about', {
    title: 'About - COS 498 PDF Manager',
    active: 'about'
  });
});

/**
 * API Routes
 */

// Get all PDFs
router.get('/api/pdfs', async (req, res) => {
  try {
    const pdfs = await database.getAllPDFMetadata();
    res.json({
      success: true,
      data: pdfs,
      count: pdfs.length
    });
  } catch (error) {
    console.error('API error - get all PDFs:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch PDFs' 
    });
  }
});

// Get PDF by ID
router.get('/api/pdfs/:id', async (req, res) => {
  try {
    const pdfId = parseInt(req.params.id);
    
    if (isNaN(pdfId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid PDF ID'
      });
    }

    const pdf = await database.getPDFMetadataById(pdfId);
    
    if (!pdf) {
      return res.status(404).json({
        success: false,
        error: 'PDF not found'
      });
    }
    
    res.json({
      success: true,
      data: pdf
    });
  } catch (error) {
    console.error('API error - get PDF by ID:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch PDF' 
    });
  }
});

// Search PDFs
router.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q;
    
    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    const results = await database.searchPDFs(query.trim());
    
    res.json({
      success: true,
      data: results,
      count: results.length,
      query: query.trim()
    });
  } catch (error) {
    console.error('API error - search PDFs:', error);
    res.status(500).json({ 
      success: false,
      error: 'Search failed' 
    });
  }
});

// Get categories
router.get('/api/categories', async (req, res) => {
  try {
    const categories = await database.getCategories();
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('API error - get categories:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch categories' 
    });
  }
});

// Health check endpoint
router.get('/api/health', async (req, res) => {
  try {
    const dbStatus = database.getStatus();
    const pdfCount = await database.getPDFCount();
    
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: dbStatus,
      pdfCount: pdfCount
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message
    });
  }
});

/**
 * Error handling middleware for this router
 */
router.use((err, req, res, next) => {
  console.error('Router error:', err);
  res.status(500).render('error', {
    title: 'Application Error',
    message: 'An unexpected error occurred in the application.'
  });
});

module.exports = router;
