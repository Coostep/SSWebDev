/**
 * Database initialization script for better-sqlite3
 * Run with: npm run init-db
 */

const database = require('../modules/database');

// Sample PDF data for initialization
const samplePDFs = [
    {
        filename: 'COS498-Homework1.pdf',
        display_title: 'Assignment 1: Static Webpage Development',
        description: 'Create your static webpage on one of the class servers (umainecos.org or toastcode.net).
Your site needs to be focused on a specific topic (not just about you) and must contain
the requirements listed below.',
        assignment_number: 1,
        due_date: '2024-09-17',
        category: 'Homework',
        file_size: 0,
        page_count: 2
    },
    {
        filename: 'COS498-Homework2.pdf',
        display_title: 'Assignment 2: Express Station',
        description: 'TFor this assignment, you will create a Node.js server using Express.js that serves static files
and provides a custom API endpoint. This assignment will server as the bridge between
serving static files and providing information after calculations are done on the server side.',
        assignment_number: 2,
        due_date: '2025-09-24',
        category: 'Homework',
        file_size: 0,
        page_count: 4
    },
    {
        filename: 'COS498-Homework3.pdf',
        display_title: 'Assignment 3: Secure PDF Server',
        description: 'For this assignment, you will create an Express + Nginx proxy manager server that serves
a front-facing website with PDF document management capabilities. You will implement
custom modules to handle routing, PDF discovery, and PDF validation. Additionally, you
will set up your site with a domain name and HTTPS support',
        assignment_number: 3,
        due_date: '2025-11-25',
        category: 'Homework',
        file_size: 0,
        page_count: 5
    },
];`

/*
const samplePDFs = [
    {
        filename: 'assignment1-guide.pdf',
        display_title: 'Assignment 1: Web Server Fundamentals',
        description: 'Complete guide for Assignment 1 covering Express.js setup, routing, and basic server configuration. Learn how to create a secure web server with custom modules.',
        assignment_number: 1,
        due_date: '2024-09-15',
        category: 'Homework',
        file_size: 1048576,
        page_count: 12
    },
    {
        filename: 'assignment2-guide.pdf',
        display_title: 'Assignment 2: Database Integration',
        description: 'Template and instructions for Assignment 2 focusing on SQLite3 integration and data modeling. Includes examples of CRUD operations and query optimization.',
        assignment_number: 2,
        due_date: '2024-09-29',
        category: 'Homework',
        file_size: 2097152,
        page_count: 18
    },
    {
        filename: 'final-project-rubric.pdf',
        display_title: 'Final Project: Evaluation Rubric',
        description: 'Detailed grading rubric and requirements for the final project submission. Covers security, performance, documentation, and code quality metrics.',
        assignment_number: 3,
        due_date: '2024-12-10',
        category: 'Project',
        file_size: 524288,
        page_count: 6
    },
];
*/
async function initializeDatabase() {
    console.log('🚀 Starting database initialization with better-sqlite3...\n');

    try {
        // Connect to database
        await database.connect();
        
        // Initialize tables and indexes
        await database.initialize();

        // Insert sample data
        console.log('📝 Inserting sample PDF data...');
        await database.insertMultiplePDFs(samplePDFs);

        // Verify data insertion
        const pdfCount = await database.getPDFCount();
        const categories = await database.getCategories();
        const stats = await database.getDatabaseStats();

        console.log('\n✅ Database initialization completed successfully!');
        console.log('📊 Initialization Summary:');
        console.log(`   • Total PDFs: ${pdfCount}`);
        console.log(`   • Categories: ${categories.map(c => `${c.category} (${c.count})`).join(', ')}`);
        console.log(`   • Database size: ${(stats.databaseSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   • Sample data: ${samplePDFs.length} PDF records inserted`);

    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        process.exit(1);
    } finally {
        // Close database connection
        database.close();
    }
}

// Run initialization if called directly
if (require.main === module) {
    initializeDatabase();
}

module.exports = { initializeDatabase, samplePDFs };
