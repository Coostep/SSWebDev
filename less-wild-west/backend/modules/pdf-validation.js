/*
    pdf-validation.js
    Module for validating PDF files before serving them to clients
*/

const path = require('path');
const fs = require('fs').promises;
const db = require('../database');
const pdfDiscovery = require('./pdf-discovery');

/**
 * Validates if a requested PDF is safe to serve
 * Checks database existence, file existence, and path security
 * @param {string} slug - PDF slug
 * @returns {Promise<Object>} Validation result
 */
async function validatePdfRequest(slug) {
    try {
        // Validate slug format
        if (!slug || typeof slug !== 'string' || slug.length > 100) {
            return {
                valid: false,
                error: 'Invalid PDF identifier',
                statusCode: 400
            };
        }
        
        // Check for path traversal attempts
        if (slug.includes('..') || slug.includes('/') || slug.includes('\\')) {
            return {
                valid: false,
                error: 'Invalid PDF path',
                statusCode: 400
            };
        }
        
        // Get PDF metadata from database
        const pdfStmt = db.prepare(`
            SELECT filename, title FROM pdf_documents WHERE slug = ?
        `);
        
        const pdf = pdfStmt.get(slug);
        
        if (!pdf) {
            return {
                valid: false,
                error: 'PDF not found',
                statusCode: 404
            };
        }
        
        // Validate filename security
        const filename = pdf.filename;
        const sanitizedFilename = path.basename(filename);
        if (sanitizedFilename !== filename) {
            return {
                valid: false,
                error: 'Invalid filename',
                statusCode: 400
            };
        }
        
        // Check if file exists and is a PDF
        const filePath = path.join(pdfDiscovery.PDF_DIR, filename);
        
        try {
            const stats = await fs.stat(filePath);
            
            // Check if it's a file (not a directory)
            if (!stats.isFile()) {
                return {
                    valid: false,
                    error: 'Requested path is not a file',
                    statusCode: 400
                };
            }
            
            // Check file extension
            if (!filename.toLowerCase().endsWith('.pdf')) {
                return {
                    valid: false,
                    error: 'File is not a PDF',
                    statusCode: 400
                };
            }
            
            // Check file size (max 50MB)
            const maxSize = 50 * 1024 * 1024; // 50MB
            if (stats.size > maxSize) {
                return {
                    valid: false,
                    error: 'PDF file too large',
                    statusCode: 413
                };
            }
            
            // Check file permissions
            try {
                await fs.access(filePath, fs.constants.R_OK);
            } catch (accessError) {
                return {
                    valid: false,
                    error: 'PDF file not accessible',
                    statusCode: 403
                };
            }
            
            return {
                valid: true,
                filePath: filePath,
                filename: filename,
                title: pdf.title,
                fileSize: stats.size,
                mimeType: 'application/pdf'
            };
            
        } catch (fileError) {
            if (fileError.code === 'ENOENT') {
                return {
                    valid: false,
                    error: 'PDF file not found on server',
                    statusCode: 404
                };
            }
            throw fileError;
        }
        
    } catch (error) {
        console.error('PDF validation error:', error);
        return {
            valid: false,
            error: 'Internal validation error',
            statusCode: 500
        };
    }
}

/**
 * Gets a validated PDF file path for serving
 * @param {string} slug - PDF slug
 * @returns {Promise<string>} Validated file path
 */
async function getValidatedPdfPath(slug) {
    const validation = await validatePdfRequest(slug);
    
    if (!validation.valid) {
        throw new Error(validation.error);
    }
    
    return validation.filePath;
}

/**
 * Logs PDF access for analytics
 * @param {string} slug - PDF slug
 * @param {string} ip - Client IP address
 * @param {string} userAgent - Client user agent
 */
function logPdfAccess(slug, ip, userAgent) {
    try {
        // You can implement logging to a separate table if needed
        db.prepare(`
            UPDATE pdf_documents 
            SET downloads = downloads + 1 
            WHERE slug = ?
        `).run(slug);
        
        console.log(`PDF accessed: ${slug} from IP: ${ip}`);
    } catch (error) {
        console.error('Error logging PDF access:', error);
    }
}

/**
 * Checks if PDF directory is properly configured
 * @returns {Promise<Object>} Directory status
 */
async function checkPdfDirectory() {
    try {
        await fs.access(pdfDiscovery.PDF_DIR, fs.constants.R_OK | fs.constants.W_OK);
        
        const files = await fs.readdir(pdfDiscovery.PDF_DIR);
        const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));
        
        return {
            configured: true,
            accessible: true,
            path: pdfDiscovery.PDF_DIR,
            totalFiles: files.length,
            pdfCount: pdfFiles.length
        };
    } catch (error) {
        return {
            configured: false,
            accessible: false,
            path: pdfDiscovery.PDF_DIR,
            error: error.message
        };
    }
}

module.exports = {
    validatePdfRequest,
    getValidatedPdfPath,
    logPdfAccess,
    checkPdfDirectory
};