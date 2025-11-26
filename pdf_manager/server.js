/**
 * PDF Document Manager - Main Server File
 * COS 498 Assignment 3: Secure PDF Server
 * Uses Express.js with better-sqlite3 for high performance
 */

const express = require('express');
const path = require('path');
const hbs = require('hbs');

// Custom modules
const router = require('./modules/router');
const database = require('./modules/database');
const pdfDiscovery = require('./modules/pdfDiscovery');

const app = express();
const PORT = process.env.PORT || 3000;

// Set up Handlebars as view engine
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
hbs.registerPartials(path.join(__dirname, 'views/partials'));

// Register Handlebars helpers
hbs.registerHelper('formatDate', (dateString) => {
  if (!dateString) return 'No due date';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    return 'Invalid date';
  }
});

hbs.registerHelper('eq', (a, b) => a === b);

hbs.registerHelper('json', (context) => {
  return JSON.stringify(context);
});

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Initialize application
async function initializeApp() {
  try {
    console.log('🚀 Initializing PDF Document Manager...');
    
    // Connect to database
    await database.connect();
    console.log('✅ Database connected successfully');
    
    // Initialize database tables (this now also initializes prepared statements)
    await database.initialize();
    console.log('✅ Database initialized successfully');
    
    // Check if we have any PDFs, if not insert sample data
    const pdfCount = await database.getPDFCount();
    if (pdfCount === 0) {
      console.log('📝 No PDFs found, inserting sample data...');
      const samplePDFs = [
          {
              filename: 'COS498-Homework1.pdf',
              display_title: 'Assignment 1: Static Webpage Development',
              description: 'Create your static webpage on one of the class servers (umainecos.org or toastcode.net). Your site needs to be focused on a specific topic (not just about you) and must contain the requirements listed below.',
              assignment_number: 1,
              due_date: '2024-09-17',
              category: 'Homework',
              file_size: 0,
              page_count: 2
          },
          {
              filename: 'COS498-Homework2.pdf',
              display_title: 'Assignment 2: Express Station',
              description: 'TFor this assignment, you will create a Node.js server using Express.js that serves static files and provides a custom API endpoint. This assignment will server as the bridge between serving static files and providing information after calculations are done on the server side.',
              assignment_number: 2,
              due_date: '2025-09-24',
              category: 'Homework',
              file_size: 0,
              page_count: 4
          },
          {
              filename: 'COS498-Homework3.pdf',
              display_title: 'Assignment 3: Secure PDF Server',
              description: 'For this assignment, you will create an Express + Nginx proxy manager server that serves a front-facing website with PDF document management capabilities. You will implement custom modules to handle routing, PDF discovery, and PDF validation. Additionally, youvwill set up your site with a domain name and HTTPS support',
              assignment_number: 3,
              due_date: '2025-11-25',
              category: 'Homework',
              file_size: 0,
              page_count: 5
          },
      ];
      await database.insertMultiplePDFs(samplePDFs);
      console.log(`✅ Inserted ${samplePDFs.length} sample PDF records`);
    }
    
    // Initialize PDF discovery
    await pdfDiscovery.scanPDFs();
    console.log('✅ PDF discovery initialized');
    
    console.log('🎉 Application initialization completed successfully');
  } catch (error) {
    console.error('❌ Error initializing application:', error);
    process.exit(1);
  }
}

// Use the router - THIS MUST BE A FUNCTION (Express Router)
app.use('/', router);

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('💥 Unhandled application error:', err);
  
  // If headers already sent, delegate to default error handler
  if (res.headersSent) {
    return next(err);
  }
  
  // Render error page
  res.status(500).render('error', {
    title: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' 
      ? err.message 
      : 'An unexpected error occurred. Please try again later.'
  });
});

// 404 handler - must be last
app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Page Not Found',
    message: 'The page you are looking for does not exist.'
  });
});

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT. Shutting down gracefully...');
  await gracefulShutdown();
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM. Shutting down gracefully...');
  await gracefulShutdown();
});

async function gracefulShutdown() {
  try {
    console.log('📦 Closing database connections...');
    database.close();
    
    console.log('👋 Server shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

// Start server
async function startServer() {
  try {
    await initializeApp();
    
    app.listen(PORT, () => {
      console.log('\n✨ ========================================');
      console.log('🚀 PDF Document Manager is running!');
      console.log(`📍 Local: http://localhost:${PORT}`);
      console.log('📚 COS 498 - Assignment 3: Secure PDF Server');
      console.log('💾 Database: better-sqlite3 (High Performance)');
      console.log('✨ ========================================\n');
      
      // Log available routes in development
      if (process.env.NODE_ENV === 'development') {
        console.log('🛣️  Available Routes:');
        console.log('   GET  /                 - Homepage');
        console.log('   GET  /library          - PDF Library');
        console.log('   GET  /pdf/:id          - PDF Details');
        console.log('   GET  /download/:file   - Download PDF');
        console.log('   GET  /about            - About Page');
        console.log('   GET  /api/pdfs         - API: All PDFs');
        console.log('   GET  /api/health       - API: Health Check');
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Only start server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = app;
