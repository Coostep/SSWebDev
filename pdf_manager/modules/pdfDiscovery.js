/** 
 * PDF Discovery Module
 * Scans and caches available PDF documents
 */

const fs = require('fs').promises;
const path = require('path');

class PDFDiscovery {
  constructor(pdfDirectory = './pdfs') {
    this.pdfDirectory = pdfDirectory;
    this.pdfCache = null;
    this.lastScan = null;
    this.cacheTimeout = 300000; // 5 minutes
  }

  async scanPDFs() {
    const now = Date.now();
    
    // Return cached results if still valid
    if (this.pdfCache && this.lastScan && 
        (now - this.lastScan) < this.cacheTimeout) {
      return this.pdfCache;
    }

    try {
      const files = await fs.readdir(this.pdfDirectory);
      const pdfFiles = files.filter(file => 
        path.extname(file).toLowerCase() === '.pdf'
      );

      this.pdfCache = pdfFiles;
      this.lastScan = now;
      
      return pdfFiles;
    } catch (error) {
      console.error('Error scanning PDF directory:', error);
      throw new Error('Unable to scan PDF directory');
    }
  }

  async getPDFList() {
    return await this.scanPDFs();
  }

  clearCache() {
    this.pdfCache = null;
    this.lastScan = null;
  }
}

module.exports = new PDFDiscovery();
