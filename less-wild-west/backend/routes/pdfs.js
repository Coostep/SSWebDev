/*
    pdfs.js
    PDF document management routes for the Wild West Forum
    NOTE: Using built-in modules only (no multer)
*/

const express = require('express');
const router = express.Router();
const db = require('../database');
const { requireAuth } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');  // Regular fs module, not promises

// PDF directory
const PDF_DIR = path.join(__dirname, '../pdfs');

// Create PDFs directory if it doesn't exist
if (!fs.existsSync(PDF_DIR)) {
    fs.mkdirSync(PDF_DIR, { recursive: true });
}

// Helper function to check if database is connected
function isDatabaseConnected() {
    try {
        db.prepare('SELECT 1').get();
        return true;
    } catch (error) {
        console.error('Database connection error:', error.message);
        return false;
    }
}

// Helper function to format file size
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
}

// PDF Library page
router.get('/', (req, res) => {
    try {
        // Check if database is connected
        if (!isDatabaseConnected()) {
            return res.render('pdfs', {
                title: 'PDF Library - Wild West Forum',
                pdfs: [],
                error: 'Database connection error. Please try again later.',
                currentUser: req.session.user
            });
        }
        
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const offset = (page - 1) * limit;
        
        // Get total count
        const countStmt = db.prepare('SELECT COUNT(*) as total FROM pdf_documents');
        const totalResult = countStmt.get();
        const total = totalResult.total;
        const totalPages = Math.ceil(total / limit);
        
        // Get PDFs with metadata - fixed SQL query
        const pdfsStmt = db.prepare(`
            SELECT pd.*, 
                   u.username, u.display_name,
                   pd.file_size as raw_file_size
            FROM pdf_documents pd
            LEFT JOIN users u ON pd.user_id = u.id
            ORDER BY pd.upload_date DESC
            LIMIT ? OFFSET ?
        `);
        
        const pdfs = pdfsStmt.all(limit, offset);
        
        // Format file sizes and check file existence
        const pdfsWithExistence = pdfs.map(pdf => {
            const filePath = path.join(PDF_DIR, pdf.filename);
            return {
                ...pdf,
                formatted_size: formatFileSize(pdf.raw_file_size),
                fileExists: fs.existsSync(filePath)
            };
        });
        
        res.render('pdfs', {
            title: 'PDF Library - Wild West Forum',
            pdfs: pdfsWithExistence,
            pagination: {
                page: page,
                limit: limit,
                total: total,
                totalPages: totalPages,
                hasPrev: page > 1,
                hasNext: page < totalPages,
                prevPage: page - 1,
                nextPage: page + 1
            },
            currentUser: req.session.user
        });
    } catch (error) {
        console.error('Error loading PDF library:', error);
        res.status(500).render('error', {
            title: 'Error - Wild West Forum',
            message: 'Failed to load PDF library'
        });
    }
});

// Upload PDF form (admin only)
router.get('/upload', requireAuth, (req, res) => {
    res.render('pdf-upload', {
        title: 'Upload PDF - Wild West Forum',
        currentUser: req.session.user
    });
});

// View individual PDF
router.get('/:slug', (req, res) => {
    try {
        // Check if database is connected
        if (!isDatabaseConnected()) {
            return res.status(500).render('error', {
                title: 'Database Error - Wild West Forum',
                message: 'Database connection error. Please try again later.'
            });
        }
        
        const slug = req.params.slug;
        
        const pdfStmt = db.prepare(`
            SELECT pd.*, 
                   u.username, u.display_name,
                   pd.file_size as raw_file_size
            FROM pdf_documents pd
            LEFT JOIN users u ON pd.user_id = u.id
            WHERE pd.slug = ?
        `);
        
        const pdf = pdfStmt.get(slug);
        
        if (!pdf) {
            return res.status(404).render('error', {
                title: '404 - Not Found',
                message: 'PDF document not found'
            });
        }
        
        // Check if file exists
        const filePath = path.join(PDF_DIR, pdf.filename);
        const fileExists = fs.existsSync(filePath);
        
        // Format file size
        pdf.formatted_size = formatFileSize(pdf.raw_file_size);
        
        res.render('pdf-view', {
            title: `${pdf.title} - Wild West Forum`,
            pdf: pdf,
            fileExists: fileExists,
            currentUser: req.session.user
        });
    } catch (error) {
        console.error('Error loading PDF:', error);
        res.status(500).render('error', {
            title: 'Error - Wild West Forum',
            message: 'Failed to load PDF document'
        });
    }
});

// Download PDF
router.get('/:slug/download', (req, res) => {
    try {
        // Check if database is connected
        if (!isDatabaseConnected()) {
            return res.status(500).send('Database connection error');
        }
        
        const slug = req.params.slug;
        
        const pdfStmt = db.prepare(`
            SELECT filename, title FROM pdf_documents WHERE slug = ?
        `);
        
        const pdf = pdfStmt.get(slug);
        
        if (!pdf) {
            return res.status(404).send('PDF not found');
        }
        
        const filePath = path.join(PDF_DIR, pdf.filename);
        
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).send('PDF file not found on server');
        }
        
        // Increment download counter
        db.prepare('UPDATE pdf_documents SET downloads = downloads + 1 WHERE slug = ?')
          .run(slug);
        
        // Serve file with appropriate headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${pdf.title}.pdf"`);
        res.sendFile(filePath);
    } catch (error) {
        console.error('Error downloading PDF:', error);
        res.status(500).send('Error downloading PDF');
    }
});

// Inline view PDF
router.get('/:slug/view', (req, res) => {
    try {
        // Check if database is connected
        if (!isDatabaseConnected()) {
            return res.status(500).send('Database connection error');
        }
        
        const slug = req.params.slug;
        
        const pdfStmt = db.prepare(`
            SELECT filename, title FROM pdf_documents WHERE slug = ?
        `);
        
        const pdf = pdfStmt.get(slug);
        
        if (!pdf) {
            return res.status(404).send('PDF not found');
        }
        
        const filePath = path.join(PDF_DIR, pdf.filename);
        
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).send('PDF file not found on server');
        }
        
        // Serve file inline
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline');
        res.sendFile(filePath);
    } catch (error) {
        console.error('Error viewing PDF:', error);
        res.status(500).send('Error viewing PDF');
    }
});

module.exports = router;