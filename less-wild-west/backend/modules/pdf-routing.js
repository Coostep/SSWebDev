/*
    pdf-routing.js
    Custom routing module for PDF document management
*/

const path = require('path');
const fs = require('fs');
const db = require('../database');

// PDF storage directory
const PDF_DIR = path.join(__dirname, '../pdfs');

// Ensure PDF directory exists
if (!fs.existsSync(PDF_DIR)) {
    fs.mkdirSync(PDF_DIR, { recursive: true });
}

//  Sets up PDF-related routes
function setupPdfRoutes(app) {
    /**
     * PDF Library page
     * Displays list of available PDFs with metadata
     */
    app.get('/pdfs', (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 12;
            const offset = (page - 1) * limit;
            
            // Get total count
            const countStmt = db.prepare('SELECT COUNT(*) as total FROM pdf_documents');
            const totalResult = countStmt.get();
            const total = totalResult.total;
            const totalPages = Math.ceil(total / limit);
            
            // Get PDFs with metadata
            const pdfsStmt = db.prepare(`
                SELECT pd.*, 
                       u.username, u.display_name,
                       CASE 
                           WHEN pd.file_size < 1024 THEN pd.file_size || ' B'
                           WHEN pd.file_size < 1048576 THEN (pd.file_size / 1024).toFixed(1) || ' KB'
                           ELSE (pd.file_size / 1048576).toFixed(1) || ' MB'
                       END as formatted_size
                FROM pdf_documents pd
                LEFT JOIN users u ON pd.user_id = u.id
                ORDER BY pd.upload_date DESC
                LIMIT ? OFFSET ?
            `);
            
            const pdfs = pdfsStmt.all(limit, offset);
            
            res.render('pdfs/library', {
                title: 'PDF Library - Wild West Forum',
                pdfs: pdfs,
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
    
    /**
     * Individual PDF viewing page
     * Uses slug-based URLs for better SEO
     */
    app.get('/pdfs/:slug', (req, res) => {
        try {
            const slug = req.params.slug;
            
            const pdfStmt = db.prepare(`
                SELECT pd.*, 
                       u.username, u.display_name,
                       CASE 
                           WHEN pd.file_size < 1024 THEN pd.file_size || ' B'
                           WHEN pd.file_size < 1048576 THEN (pd.file_size / 1024).toFixed(1) || ' KB'
                           ELSE (pd.file_size / 1048576).toFixed(1) || ' MB'
                       END as formatted_size
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
            
            res.render('pdfs/view', {
                title: `${pdf.title} - Wild West Forum`,
                pdf: pdf,
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
    
    /**
     * PDF file download endpoint
     * Validates file exists before serving with sendFile()
     */
    app.get('/pdfs/:slug/download', (req, res) => {
        try {
            const slug = req.params.slug;
            
            const pdfStmt = db.prepare(`
                SELECT filename, title FROM pdf_documents WHERE slug = ?
            `);
            
            const pdf = pdfStmt.get(slug);
            
            if (!pdf) {
                return res.status(404).send('PDF not found');
            }
            
            const filePath = path.join(PDF_DIR, pdf.filename);
            
            // Validate file exists
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
    
    /**
     * PDF file inline viewing endpoint
     */
    app.get('/pdfs/:slug/view', (req, res) => {
        try {
            const slug = req.params.slug;
            
            const pdfStmt = db.prepare(`
                SELECT filename FROM pdf_documents WHERE slug = ?
            `);
            
            const pdf = pdfStmt.get(slug);
            
            if (!pdf) {
                return res.status(404).send('PDF not found');
            }
            
            const filePath = path.join(PDF_DIR, pdf.filename);
            
            // Validate file exists
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
}

module.exports = { setupPdfRoutes };