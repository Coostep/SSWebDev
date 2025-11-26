/**
 * PDF Validation Module
 * Validates PDF existence and access permissions
 */

const fs = require('fs').promises;
const path = require('path');

class PDFValidation {
  constructor(pdfDirectory = './pdfs') {
    this.pdfDirectory = path.resolve(pdfDirectory);
  }

  async validatePDF(filename) {
    // Security: Prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return false;
    }

    // Ensure it's a PDF file
    if (!filename.toLowerCase().endsWith('.pdf')) {
      return false;
    }

    const filePath = path.join(this.pdfDirectory, filename);

    try {
      // Check if file exists and is within the designated directory
      const stats = await fs.stat(filePath);
      
      if (!stats.isFile()) {
        return false;
      }

      // Additional security: Verify the resolved path is within our pdf directory
      const resolvedPath = path.resolve(filePath);
      if (!resolvedPath.startsWith(this.pdfDirectory)) {
        return false;
      }

      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return false; // File doesn't exist
      }
      throw error; // Other errors should be handled by caller
    }
  }

  async getSafePDFs() {
    const pdfDiscovery = require('./pdf-discovery');
    const allPDFs = await pdfDiscovery.getPDFList();
    const validPDFs = [];

    for (const pdf of allPDFs) {
      if (await this.validatePDF(pdf)) {
        validPDFs.push(pdf);
      }
    }

    return validPDFs;
  }
}

module.exports = new PDFValidation();
