/*
    pdf-discovery.js
    Module for discovering and indexing PDF documents in the pdfs/ directory
*/

const fs = require('fs');  // Regular fs module
const path = require('path');
const db = require('../database');

const PDF_DIR = path.join(__dirname, '/pdfs');

// Cache for PDF discovery results
let pdfCache = {
    data: null,
    lastUpdated: null
};

/**
 * Scans the PDF directory and returns all PDF files
 * @returns {Array} Array of PDF filenames
 */
function discoverPdfFiles() {
    try {
        if (!fs.existsSync(PDF_DIR)) {
            fs.mkdirSync(PDF_DIR, { recursive: true });
            return [];
        }
        
        const files = fs.readdirSync(PDF_DIR);
        const pdfFiles = files.filter(file => 
            file.toLowerCase().endsWith('.pdf') && 
            !file.startsWith('.')
        );
        
        return pdfFiles;
    } catch (error) {
        console.error('Error discovering PDF files:', error);
        return [];
    }
}

/**
 * Gets file statistics for a PDF
 * @param {string} filename - PDF filename
 * @returns {Object} File stats object
 */
function getPdfStats(filename) {
    const filePath = path.join(PDF_DIR, filename);
    try {
        const stats = fs.statSync(filePath);
        return {
            fileSize: stats.size,
            modifiedDate: stats.mtime
        };
    } catch (error) {
        console.error(`Error getting stats for ${filename}:`, error);
        return null;
    }
}

/**
 * Generates a slug from a filename or title
 * @param {string} text - Text to convert to slug
 * @returns {string} URL-friendly slug
 */
function generateSlug(text) {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-')     // Replace spaces with hyphens
        .replace(/--+/g, '-')     // Replace multiple hyphens with single
        .trim();
}

/**
 * Indexes PDF files in the database
 * Updates metadata for existing PDFs and adds new ones
 * @returns {Object} Indexing results
 */
function indexPdfs() {
    try {
        // Check if database connection is available
        try {
            // Simple query to check if database is connected
            db.prepare('SELECT 1').get();
        } catch (dbError) {
            console.error('Database connection not available for PDF indexing:', dbError.message);
            return { total: 0, added: 0, updated: 0, errors: 1 };
        }
        
        const pdfFiles = discoverPdfFiles();
        const results = {
            total: pdfFiles.length,
            added: 0,
            updated: 0,
            errors: 0
        };
        
        for (const filename of pdfFiles) {
            try {
                const stats = getPdfStats(filename);
                if (!stats) continue;
                
                // Generate a slug from filename (without extension)
                const slug = generateSlug(path.parse(filename).name);
                
                // Check if PDF already exists in database
                const existingPdf = db.prepare(`
                    SELECT id FROM pdf_documents WHERE filename = ?
                `).get(filename);
                
                if (existingPdf) {
                    // Update existing record
                    db.prepare(`
                        UPDATE pdf_documents 
                        SET file_size = ?, updated_at = CURRENT_TIMESTAMP 
                        WHERE filename = ?
                    `).run(stats.fileSize, filename);
                    results.updated++;
                } else {
                    // Insert new record
                    const title = path.parse(filename).name
                        .replace(/_/g, ' ')
                        .replace(/-/g, ' ')
                        .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize each word
                    
                    db.prepare(`
                        INSERT INTO pdf_documents 
                        (filename, title, slug, file_size, upload_date)
                        VALUES (?, ?, ?, ?, ?)
                    `).run(filename, title, slug, stats.fileSize, new Date().toISOString());
                    results.added++;
                }
            } catch (error) {
                console.error(`Error indexing ${filename}:`, error);
                results.errors++;
            }
        }
        
        // Clear cache after indexing
        pdfCache.data = null;
        pdfCache.lastUpdated = null;
        
        return results;
    } catch (error) {
        console.error('Error in PDF indexing:', error);
        return { total: 0, added: 0, updated: 0, errors: 1 };
    }
}

/**
 * Gets all PDFs with caching
 * @param {boolean} forceRefresh - Force cache refresh
 * @returns {Array} Array of PDF metadata
 */
function getAllPdfs(forceRefresh = false) {
    // Return cached data if available and not forced to refresh
    if (pdfCache.data && !forceRefresh && 
        Date.now() - pdfCache.lastUpdated < 5 * 60 * 1000) { // 5 minute cache
        return pdfCache.data;
    }
    
    try {
        // Check if database connection is available
        try {
            db.prepare('SELECT 1').get();
        } catch (dbError) {
            console.error('Database connection not available for getAllPdfs:', dbError.message);
            return [];
        }
        
        const stmt = db.prepare(`
            SELECT pd.*, 
                   u.username, u.display_name,
                   pd.file_size as raw_file_size
            FROM pdf_documents pd
            LEFT JOIN users u ON pd.user_id = u.id
            ORDER BY pd.title
        `);
        
        const pdfs = stmt.all();
        
        // Format file sizes
        const formattedPdfs = pdfs.map(pdf => {
            let formatted_size;
            const size = pdf.raw_file_size;
            if (size < 1024) {
                formatted_size = size + ' B';
            } else if (size < 1048576) {
                formatted_size = (size / 1024).toFixed(1) + ' KB';
            } else {
                formatted_size = (size / 1048576).toFixed(1) + ' MB';
            }
            
            return {
                ...pdf,
                formatted_size: formatted_size
            };
        });
        
        // Update cache
        pdfCache.data = formattedPdfs;
        pdfCache.lastUpdated = Date.now();
        
        return formattedPdfs;
    } catch (error) {
        console.error('Error getting PDFs from database:', error);
        return [];
    }
}

/**
 * Validates if a PDF exists and is accessible
 * @param {string} slug - PDF slug
 * @returns {Object} Validation result with file path if valid
 */
function validatePdf(slug) {
    try {
        // Check if database connection is available
        try {
            db.prepare('SELECT 1').get();
        } catch (dbError) {
            console.error('Database connection not available for validatePdf:', dbError.message);
            return { valid: false, error: 'Database connection error' };
        }
        
        const pdfStmt = db.prepare(`
            SELECT filename FROM pdf_documents WHERE slug = ?
        `);
        
        const pdf = pdfStmt.get(slug);
        
        if (!pdf) {
            return { valid: false, error: 'PDF not found in database' };
        }
        
        const filePath = path.join(PDF_DIR, pdf.filename);
        
        if (fs.existsSync(filePath)) {
            return { valid: true, filePath: filePath, filename: pdf.filename };
        } else {
            return { valid: false, error: 'PDF file not accessible' };
        }
    } catch (error) {
        console.error('Error validating PDF:', error);
        return { valid: false, error: 'Validation error' };
    }
}

// Don't run indexing automatically on module load
// We'll call it from server.js after the database is ready

module.exports = {
    discoverPdfFiles,
    indexPdfs,
    getAllPdfs,
    validatePdf,
    generateSlug,
    PDF_DIR
};