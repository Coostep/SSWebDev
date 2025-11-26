**PDF Document Manager - COS 498 Assignment 3**

  A secure PDF document management system built with Express.js for COS 498 - Advanced Web Development at the University of Maine. This project demonstrates custom module development, secure file serving, and modern web application architecture using better-sqlite3 for high-performance database operations.

🎯 **Project Overview**
  This project fulfills all requirements for Assignment 3: Secure PDF Server by implementing a professional PDF management system that securely serves course materials and homework assignments.

**Current PDF Library**
  COS 498 - Homework 1 - First homework assignment

  COS 498 - Homework 2 - Second homework assignment

  COS 498 - Homework 3 - Third homework assignment

✨ **Features**

  Secure PDF Management: Custom validation and secure file serving

  PDF Discovery: Automatic scanning and caching of PDF documents

  Metadata Storage: Rich PDF information using better-sqlite3

  Professional UI: Responsive design with Handlebars templating

  Category Filtering: Organize PDFs by type (Homework, Projects, Exams)

**Security Features**
  🔒 Path traversal attack prevention

  ✅ File type validation and size limits

  🔍 Secure download handling

  🚫 Input sanitization and validation

  ⚡ HTTPS-ready configuration

**Technical Advantages**
  High Performance: better-sqlite3 with prepared statements

  Modular Architecture: Custom routing, discovery, and validation modules

  RESTful API: JSON endpoints for PDF data

  Professional Styling: Responsive CSS design

🛠️ Technology Stack
  Backend: Node.js, Express.js

  Database: better-sqlite3 (high-performance SQLite)

  Templating: Handlebars (hbs)

  Frontend: HTML5, CSS3, JavaScript

  Security: Custom validation modules, secure file serving

📁 Project Structure

    pdf-document-manager/
    ├── server.js                 # Main server entry point
    ├── package.json              # Dependencies and scripts
    ├── README.md                 # Project documentation
    ├── modules/                  # Custom modules
    │   ├── router.js            # Routing module
    │   ├── pdfDiscovery.js      # PDF discovery module
    │   ├── pdfValidation.js     # PDF validation module
    │   └── database.js          # Database module (better-sqlite3)
    ├── views/                   # Handlebars templates
    │   ├── index.hbs           # Homepage
    │   ├── library.hbs         # PDF library
    │   ├── pdf-detail.hbs      # PDF details
    │   ├── about.hbs           # About page
    │   ├── error.hbs           # Error page
    │   └── partials/           # Reusable components
    │       ├── header.hbs
    │       └── footer.hbs
    ├── public/                 # Static assets
    │   └── css/
    │       └── style.css       # Main stylesheet
    ├── pdfs/                   # PDF storage directory
    │   ├── COS498-Homework1.pdf
    │   ├── COS498-Homework2.pdf
    │   └── COS498-Homework3.pdf
    ├── data/                   # SQLite3 database files
    └── scripts/               # Utility scripts
        └── init-db.js         # Database initialization

🚀 **Quick Start**
Prerequisites
  Node.js (v14 or higher)

  npm package manager

**Installation & Setup **
Clone and Install Dependencies

  bash
  git clone <repository-url>
  cd pdf-manager
  npm install
  npm run dev

# Or production mode
  npm start
  Access the Application
  Open your browser and navigate to:
  http://localhost:3000

📖 **Usage**
Website Navigation
  Homepage (/): Project overview and recent PDFs

  PDF Library (/library): Browse all available PDF documents

  PDF Details (/pdf/:id): View detailed information about each PDF

  About Page (/about): Project documentation and technical details

  Managing PDFs
  Add New PDFs: Place PDF files in the pdfs/ directory

  Update Metadata: Modify database entries for display titles and descriptions

  Secure Downloads: All PDFs are validated before serving

🔧 **Custom Modules**
  Router Module (modules/router.js)
  Handles all URL routing and request processing

  Implements route definitions for pages and API endpoints

  Manages 404 errors and input validation

  Provides secure download routing

  PDF Discovery Module (modules/pdfDiscovery.js)
  Automatically scans the pdfs/ directory for PDF files

  Caches results to avoid repeated file system reads

  Provides file metadata extraction

  Includes automatic cache invalidation

  PDF Validation Module (modules/pdfValidation.js)
  Validates PDF file existence and accessibility

  Prevents path traversal attacks

  Ensures only PDF files within designated directory are served

  Implements security checks for file type and size

  Database Module (modules/database.js)
  Uses better-sqlite3 for high-performance operations

  Manages PDF metadata storage and retrieval

  Implements prepared statements for SQL injection protection

  Supports transactions for atomic operations

🗃️ **Database Schema**
sql
  CREATE TABLE pdf_metadata (
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
  );

👥 **API Documentation**

  Get All PDFs
  http
  GET /api/pdfs
  Response: { success: boolean, data: array, count: number }
  Get PDF by ID
  http
  GET /api/pdfs/:id
  Response: { success: boolean, data: object }
  Search PDFs
  http
  GET /api/search?q=searchTerm
  Response: { success: boolean, data: array, count: number, query: string }
  Health Check
  http
  GET /api/health
  Response: { success: boolean, status: string, database: object, pdfCount: number }



