/**
 * Database Module for PDF Metadata Storage
 * Uses better-sqlite3 for high-performance database operations
 * COS 498 - Assignment 3: Secure PDF Server
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class PDFDatabase {
    constructor() {
        this.db = null;
        this.dbPath = path.join(__dirname, '../data/pdf_metadata.db');
        this.preparedStatements = {};
        this.isInitialized = false;
        this.ensureDataDirectory();
    }

    /**
     * Ensure the data directory exists
     * @private
     */
    ensureDataDirectory() {
        try {
            const dataDir = path.dirname(this.dbPath);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
                console.log('✅ Created data directory:', dataDir);
            }
        } catch (error) {
            console.error('❌ Error creating data directory:', error);
            throw error;
        }
    }

    /**
     * Connect to the SQLite database
     * @returns {Promise<void>}
     */
    async connect() {
        try {
            // Create database connection with performance optimizations
            this.db = new Database(this.dbPath, {
                verbose: process.env.NODE_ENV === 'development' ? console.log : undefined
            });

            // Enable performance optimizations
            this.db.pragma('journal_mode = WAL');
            this.db.pragma('synchronous = NORMAL');
            this.db.pragma('foreign_keys = ON');
            this.db.pragma('cache_size = -64000'); // 64MB cache
            this.db.pragma('temp_store = memory');
            this.db.pragma('mmap_size = 30000000000'); // 30GB mmap

            console.log('✅ Connected to SQLite database with better-sqlite3');
            console.log('📊 Database path:', this.dbPath);

            // DON'T initialize prepared statements here - tables don't exist yet
            // They will be initialized after tables are created

        } catch (error) {
            console.error('❌ Database connection error:', error);
            throw error;
        }
    }

    /**
     * Initialize all prepared statements for better performance
     * @private
     */
    initializePreparedStatements() {
        try {
            console.log('📝 Initializing prepared statements...');

            // Insert/Update PDF metadata
            this.preparedStatements.insertPDF = this.db.prepare(`
                INSERT OR REPLACE INTO pdf_metadata 
                (filename, display_title, description, assignment_number, due_date, category, file_size, page_count)
                VALUES (@filename, @display_title, @description, @assignment_number, @due_date, @category, @file_size, @page_count)
            `);

            // Get all PDFs with ordering
            this.preparedStatements.getAllPDFs = this.db.prepare(`
                SELECT * FROM pdf_metadata 
                ORDER BY 
                    CASE WHEN due_date IS NULL THEN 1 ELSE 0 END,
                    due_date ASC,
                    assignment_number ASC,
                    created_at DESC
            `);

            // Get PDF by ID
            this.preparedStatements.getPDFById = this.db.prepare(`
                SELECT * FROM pdf_metadata WHERE id = ?
            `);

            // Get PDFs by category
            this.preparedStatements.getPDFsByCategory = this.db.prepare(`
                SELECT * FROM pdf_metadata 
                WHERE category = ? 
                ORDER BY due_date ASC, assignment_number ASC
            `);

            // Get recent PDFs
            this.preparedStatements.getRecentPDFs = this.db.prepare(`
                SELECT * FROM pdf_metadata 
                ORDER BY created_at DESC 
                LIMIT ?
            `);

            // Get categories with counts
            this.preparedStatements.getCategories = this.db.prepare(`
                SELECT category, COUNT(*) as count 
                FROM pdf_metadata 
                GROUP BY category 
                ORDER BY count DESC, category ASC
            `);

            // Update PDF metadata
            this.preparedStatements.updatePDF = this.db.prepare(`
                UPDATE pdf_metadata 
                SET display_title = @display_title,
                    description = @description,
                    assignment_number = @assignment_number,
                    due_date = @due_date,
                    category = @category,
                    file_size = @file_size,
                    page_count = @page_count,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = @id
            `);

            // Delete PDF by ID
            this.preparedStatements.deletePDF = this.db.prepare(`
                DELETE FROM pdf_metadata WHERE id = ?
            `);

            // Get PDF by filename
            this.preparedStatements.getPDFByFilename = this.db.prepare(`
                SELECT * FROM pdf_metadata WHERE filename = ?
            `);

            // Search PDFs by title or description
            this.preparedStatements.searchPDFs = this.db.prepare(`
                SELECT * FROM pdf_metadata 
                WHERE display_title LIKE @search OR description LIKE @search
                ORDER BY 
                    CASE WHEN due_date IS NULL THEN 1 ELSE 0 END,
                    due_date ASC
            `);

            // Get PDF count
            this.preparedStatements.getPDFCount = this.db.prepare(`
                SELECT COUNT(*) as count FROM pdf_metadata
            `);

            console.log('✅ Prepared statements initialized');
            this.isInitialized = true;
        } catch (error) {
            console.error('❌ Error initializing prepared statements:', error);
            throw error;
        }
    }

    /**
     * Initialize database tables and indexes
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            console.log('🏗️ Creating database tables and indexes...');

            // Create main table
            const createTableSQL = `
                CREATE TABLE IF NOT EXISTS pdf_metadata (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    filename TEXT UNIQUE NOT NULL,
                    display_title TEXT NOT NULL,
                    description TEXT,
                    assignment_number INTEGER,
                    due_date TEXT,
                    category TEXT DEFAULT 'General',
                    file_size INTEGER,
                    page_count INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `;

            this.db.exec(createTableSQL);

            // Create indexes for better performance
            const indexes = [
                'CREATE INDEX IF NOT EXISTS idx_pdf_category ON pdf_metadata(category)',
                'CREATE INDEX IF NOT EXISTS idx_pdf_assignment ON pdf_metadata(assignment_number)',
                'CREATE INDEX IF NOT EXISTS idx_pdf_due_date ON pdf_metadata(due_date)',
                'CREATE INDEX IF NOT EXISTS idx_pdf_created_at ON pdf_metadata(created_at)',
                'CREATE INDEX IF NOT EXISTS idx_pdf_filename ON pdf_metadata(filename)'
            ];

            indexes.forEach(indexSQL => {
                this.db.exec(indexSQL);
            });

            console.log('✅ Database tables and indexes created successfully');

            // NOW initialize prepared statements after tables exist
            this.initializePreparedStatements();

        } catch (error) {
            console.error('❌ Database initialization error:', error);
            throw error;
        }
    }

    /**
     * Check if database is ready for operations
     * @private
     */
    checkInitialized() {
        if (!this.isInitialized) {
            throw new Error('Database not initialized. Call initialize() first.');
        }
    }

    /**
     * Insert or update PDF metadata
     * @param {Object} metadata - PDF metadata object
     * @returns {Promise<Object>} Insertion result
     */
    async insertPDFMetadata(metadata) {
        this.checkInitialized();
        try {
            const result = this.preparedStatements.insertPDF.run({
                filename: metadata.filename,
                display_title: metadata.display_title,
                description: metadata.description,
                assignment_number: metadata.assignment_number || null,
                due_date: metadata.due_date || null,
                category: metadata.category || 'General',
                file_size: metadata.file_size || null,
                page_count: metadata.page_count || null
            });

            console.log(`✅ PDF metadata inserted: ${metadata.filename} (ID: ${result.lastInsertRowid})`);
            return { 
                id: result.lastInsertRowid, 
                changes: result.changes 
            };
        } catch (error) {
            console.error('❌ Error inserting PDF metadata:', error);
            throw error;
        }
    }

    /**
     * Get all PDF metadata with proper ordering
     * @returns {Promise<Array>} Array of PDF metadata objects
     */
    async getAllPDFMetadata() {
        this.checkInitialized();
        try {
            const pdfs = this.preparedStatements.getAllPDFs.all();
            console.log(`📊 Retrieved ${pdfs.length} PDF records`);
            return pdfs;
        } catch (error) {
            console.error('❌ Error fetching all PDF metadata:', error);
            throw error;
        }
    }

    /**
     * Get PDF metadata by ID
     * @param {number} id - PDF ID
     * @returns {Promise<Object|null>} PDF metadata object or null
     */
    async getPDFMetadataById(id) {
        this.checkInitialized();
        try {
            const pdf = this.preparedStatements.getPDFById.get(id);
            if (!pdf) {
                console.log(`📭 PDF not found with ID: ${id}`);
            }
            return pdf;
        } catch (error) {
            console.error(`❌ Error fetching PDF by ID (${id}):`, error);
            throw error;
        }
    }

    /**
     * Get PDFs by category
     * @param {string} category - Category name
     * @returns {Promise<Array>} Array of PDF metadata objects
     */
    async getPDFsByCategory(category) {
        this.checkInitialized();
        try {
            const pdfs = this.preparedStatements.getPDFsByCategory.all(category);
            console.log(`📂 Retrieved ${pdfs.length} PDFs in category: ${category}`);
            return pdfs;
        } catch (error) {
            console.error(`❌ Error fetching PDFs by category (${category}):`, error);
            throw error;
        }
    }

    /**
     * Get recent PDFs
     * @param {number} limit - Number of recent PDFs to return
     * @returns {Promise<Array>} Array of recent PDF metadata objects
     */
    async getRecentPDFs(limit = 5) {
        this.checkInitialized();
        try {
            const pdfs = this.preparedStatements.getRecentPDFs.all(limit);
            console.log(`🕒 Retrieved ${pdfs.length} recent PDFs`);
            return pdfs;
        } catch (error) {
            console.error('❌ Error fetching recent PDFs:', error);
            throw error;
        }
    }

    /**
     * Get all categories with PDF counts
     * @returns {Promise<Array>} Array of category objects with counts
     */
    async getCategories() {
        this.checkInitialized();
        try {
            const categories = this.preparedStatements.getCategories.all();
            console.log(`🏷️ Retrieved ${categories.length} categories`);
            return categories;
        } catch (error) {
            console.error('❌ Error fetching categories:', error);
            throw error;
        }
    }

    /**
     * Update PDF metadata
     * @param {number} id - PDF ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Update result
     */
    async updatePDFMetadata(id, updates) {
        this.checkInitialized();
        try {
            const updateData = { id, ...updates };
            const result = this.preparedStatements.updatePDF.run(updateData);
            
            console.log(`✏️ Updated PDF metadata for ID: ${id} (${result.changes} changes)`);
            return { changes: result.changes };
        } catch (error) {
            console.error(`❌ Error updating PDF metadata (ID: ${id}):`, error);
            throw error;
        }
    }

    /**
     * Delete PDF metadata
     * @param {number} id - PDF ID
     * @returns {Promise<Object>} Deletion result
     */
    async deletePDFMetadata(id) {
        this.checkInitialized();
        try {
            const result = this.preparedStatements.deletePDF.run(id);
            console.log(`🗑️ Deleted PDF metadata for ID: ${id} (${result.changes} changes)`);
            return { changes: result.changes };
        } catch (error) {
            console.error(`❌ Error deleting PDF metadata (ID: ${id}):`, error);
            throw error;
        }
    }

    /**
     * Get PDF by filename
     * @param {string} filename - PDF filename
     * @returns {Promise<Object|null>} PDF metadata object or null
     */
    async getPDFByFilename(filename) {
        this.checkInitialized();
        try {
            const pdf = this.preparedStatements.getPDFByFilename.get(filename);
            return pdf;
        } catch (error) {
            console.error(`❌ Error fetching PDF by filename (${filename}):`, error);
            throw error;
        }
    }

    /**
     * Search PDFs by title or description
     * @param {string} searchTerm - Search term
     * @returns {Promise<Array>} Array of matching PDF metadata objects
     */
    async searchPDFs(searchTerm) {
        this.checkInitialized();
        try {
            const searchPattern = `%${searchTerm}%`;
            const pdfs = this.preparedStatements.searchPDFs.all({ search: searchPattern });
            console.log(`🔍 Found ${pdfs.length} PDFs matching: "${searchTerm}"`);
            return pdfs;
        } catch (error) {
            console.error(`❌ Error searching PDFs for "${searchTerm}":`, error);
            throw error;
        }
    }

    /**
     * Get total PDF count
     * @returns {Promise<number>} Total number of PDFs
     */
    async getPDFCount() {
        this.checkInitialized();
        try {
            const result = this.preparedStatements.getPDFCount.get();
            return result.count;
        } catch (error) {
            console.error('❌ Error getting PDF count:', error);
            throw error;
        }
    }

    /**
     * Insert multiple PDFs in a transaction (for bulk operations)
     * @param {Array} pdfsArray - Array of PDF metadata objects
     * @returns {Promise<Object>} Transaction result
     */
    async insertMultiplePDFs(pdfsArray) {
        this.checkInitialized();
        try {
            const insert = this.db.transaction((pdfs) => {
                for (const pdf of pdfs) {
                    this.preparedStatements.insertPDF.run({
                        filename: pdf.filename,
                        display_title: pdf.display_title,
                        description: pdf.description,
                        assignment_number: pdf.assignment_number || null,
                        due_date: pdf.due_date || null,
                        category: pdf.category || 'General',
                        file_size: pdf.file_size || null,
                        page_count: pdf.page_count || null
                    });
                }
                return pdfs.length;
            });

            const count = insert(pdfsArray);
            console.log(`✅ Inserted ${count} PDF records in transaction`);
            return { count, changes: count };
        } catch (error) {
            console.error('❌ Error in bulk PDF insertion:', error);
            throw error;
        }
    }

    /**
     * Get database statistics
     * @returns {Promise<Object>} Database statistics
     */
    async getDatabaseStats() {
        this.checkInitialized();
        try {
            const stats = {
                totalPDFs: this.preparedStatements.getPDFCount.get().count,
                categories: this.preparedStatements.getCategories.all(),
                recentActivity: this.preparedStatements.getRecentPDFs.all(10)
            };

            // Get database size
            const dbSize = fs.existsSync(this.dbPath) ? fs.statSync(this.dbPath).size : 0;
            stats.databaseSize = dbSize;

            console.log('📈 Database statistics retrieved');
            return stats;
        } catch (error) {
            console.error('❌ Error getting database stats:', error);
            throw error;
        }
    }

    /**
     * Backup database
     * @param {string} backupPath - Path for backup file
     * @returns {Promise<string>} Backup file path
     */
    async backupDatabase(backupPath = null) {
        this.checkInitialized();
        try {
            if (!backupPath) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                backupPath = path.join(__dirname, '../backups', `pdf_metadata_backup_${timestamp}.db`);
            }

            // Ensure backup directory exists
            const backupDir = path.dirname(backupPath);
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }

            // Perform backup
            this.db.backup(backupPath)
                .then(() => {
                    console.log(`💾 Database backup created: ${backupPath}`);
                })
                .catch(backupError => {
                    console.error('❌ Database backup failed:', backupError);
                });

            return backupPath;
        } catch (error) {
            console.error('❌ Error initiating database backup:', error);
            throw error;
        }
    }

    /**
     * Close database connection
     */
    close() {
        try {
            if (this.db) {
                this.db.close();
                console.log('✅ Database connection closed');
            }
        } catch (error) {
            console.error('❌ Error closing database connection:', error);
        }
    }

    /**
     * Get database connection status
     * @returns {Object} Connection status information
     */
    getStatus() {
        return {
            connected: !!this.db,
            initialized: this.isInitialized,
            databasePath: this.dbPath,
            openStatements: Object.keys(this.preparedStatements).length,
            inTransaction: this.db ? this.db.inTransaction : false
        };
    }
}

// Create and export singleton instance
const database = new PDFDatabase();

// Handle application termination
process.on('SIGINT', () => {
    console.log('\n🛑 Application shutting down...');
    database.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Application terminating...');
    database.close();
    process.exit(0);
});

module.exports = database;
