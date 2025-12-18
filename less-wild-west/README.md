# Wild West Forum

**COS 498 Server Side Web Development - Final Project**

# Overview

The Wild West Forum has evolved into a fully-featured web application with enhanced security and modern features! Built with Node.js and Express, this forum includes real-time chat, PDF document management, comprehensive user profiles, and robust security measures. The application features persistent SQLite3 storage for sessions and data, Argon2 password hashing for superior security, and a complete email system for password recovery and notifications.

# Features

**User Authentication:** Secure registration and login with Argon2 password hashing

**Session Management:** Persistent sessions stored in SQLite3 database

**Real-time Chat:** Live messaging system powered by Socket.io

**Comment System:** Nested comments with voting, editing, and deletion

**User Profiles:**Customizable profiles with colors, icons, and bios

**Profile Management:** Edit display name, email, password, and customization options

**Password Recovery:** Secure token-based password reset with email confirmation

**Account Protection:** Login attempt tracking with automatic lockout after 5 failed attempts

**PDF Document Management:** Automatic PDF discovery and indexing with metadata tracking

**Responsive UI:** Handlebars templating with partials and custom helpers

**Email Notifications:** Password reset and email change confirmation emails

**Pagination:** Paginated comment views for better performance

**Comment Voting:** Upvote/downvote system with user tracking

**Security Middleware:** Comprehensive authentication and rate limiting

# Technology Stack
**Runtime:** Node.js

**Web Framework:** Express

**Templating Engine:** Handlebars (hbs) with partials

**Database:** Better-sqlite3

**Session Management:** express-session with custom SQLite store

**Password Hashing:** Argon2

**Email Service:** Nodemailer with Gmail SMTP ***(NOT FUNCTIONING)***

**Real-time Communication:** Socket.io

**File Management:** PDF discovery and metadata extraction

**Security:** Custom middleware for authentication and rate limiting

**Development Tools:** Environment variable configuration

# Project Structure

   less-wild-west/backend
   ├── modules/                      # Utility modules and middleware
   │   ├── auth.js                   # Authentication middleware
   │   ├── login-tracker.js          # Login attempt tracking
   │   ├── password-utils.js         # Password utilities
   │   ├── email-service.js          # Email sending service
   │   ├── markdown-parser.js        # Markdown parsing
   │   ├── pdf-discovery.js          # PDF file management
   │   ├── pdf-routing.js            # PDF routing utilities
   │   └── pdf-validation.js         # PDF validation utilities
   ├── routes/                       # Route handlers
   │   ├── auth.js                   # Authentication routes
   │   ├── comments.js               # Comment routes
   │   ├── profile.js                # Profile management routes
   │   ├── password-recovery.js      # Password reset routes
   │   ├── chat.js                   # Chat routes
   │   └── pdfs.js                   # PDF document routes
   ├── views/                        # Handlebars templates
   │   ├── partials/                 # Reusable template components
   │   │   ├── comment.hbs           # Individual comment display
   │   │   ├── footer.hbs            # Page footer
   │   │   └── nav.hbs               # Navigation bar
   │   ├── 404.hbs                   # 404 error page
   │   ├── chat.hbs                  # Chat interface
   │   ├── comments.hbs              # Comments list view
   │   ├── edit-comment.hbs          # Comment editing form
   │   ├── error.hbs                 # Error page
   │   ├── forgot-password.hbs       # Forgot password form
   │   ├── home.hbs                  # Home page
   │   ├── login.hbs                 # Login form
   │   ├── new-comment.hbs           # New comment form
   │   ├── pdf-upload.hbs            # PDF upload form
   │   ├── pdf-view.hbs              # PDF view page
   │   ├── pdfs.hbs                  # PDF library
   │   ├── profile.hbs               # User profile page
   │   ├── register.hbs              # Registration form
   │   └── reset-password.hbs        # Password reset form
   ├── public/css/                   # Static assets
   │   └── styles.css                # Main stylesheet
   ├── pdfs/                         # PDF document storage
   │   ├── Frontier Fonts.pdf        # AI Generated PDF - Frontier Fonts
   │   ├── Sahara Storytime.pdf      # AI Generated PDF - Sahara Storytime
   │   └── Wild Western Wordage.pdf  # AI Generated PDF - Wild Western Wordage
   ├── node_modules/                 # npm dependencies (not tracked in git)
   ├── database.js                   # Database configuration and setup
   ├── server.js                     # Main server file
   ├── sqlite-session-store.js       # Custom SQLite session store
   ├── forum.db                      # SQLite database file
   ├── forum.db-shm                  # SQLite shared memory file
   ├── forum.db-wal                  # SQLite write-ahead log
   ├── package.json                  # Project dependencies and scripts
   ├── package-lock.json             # Locked dependency versions
   ├── Dockerfile                    # Docker container configuration
   docker-compose.yml                # Docker Compose configuration
   .env.example                      # Example environment variables
   README.md                         # Project documentation

# Run Instructions

# Environment Setup
**Clone the repository:**

   bash
   git clone <repository-url>
   cd wild-west-forum

**Install dependencies:**
   bash
   npm install
   
# Running the Application

**Start the server:**
   bash
   npm start
**Access the application:**

   Open your browser and navigate to http://localhost:3000

# Database Schema Documentation
**users**
   id INTEGER PRIMARY KEY AUTOINCREMENT
   username TEXT UNIQUE NOT NULL
   email TEXT UNIQUE NOT NULL
   display_name TEXT NOT NULL
   password_hash TEXT NOT NULL
   profile_color TEXT DEFAULT '#8B4513'
   profile_icon TEXT DEFAULT '🤠'
   bio TEXT DEFAULT ''
   account_locked_until DATETIME
   failed_login_attempts INTEGER DEFAULT 0
   created_at DATETIME DEFAULT CURRENT_TIMESTAMP
   updated_at DATETIME DEFAULT CURRENT_TIMESTAMP

**comments**
   id INTEGER PRIMARY KEY AUTOINCREMENT
   user_id INTEGER NOT NULL
   text TEXT NOT NULL
   text_html TEXT NOT NULL
   edited_at DATETIME
   parent_id INTEGER DEFAULT NULL
   votes INTEGER DEFAULT 0
   created_at DATETIME DEFAULT CURRENT_TIMESTAMP
   updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
   FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
   FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE

**comment_votes**
   id INTEGER PRIMARY KEY AUTOINCREMENT
   comment_id INTEGER NOT NULL
   user_id INTEGER NOT NULL
   vote INTEGER CHECK(vote IN (-1, 1))
   created_at DATETIME DEFAULT CURRENT_TIMESTAMP
   UNIQUE(comment_id, user_id)
   FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE
   FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE

**login_attempts**
   id INTEGER PRIMARY KEY AUTOINCREMENT
   ip_address TEXT NOT NULL
   username TEXT NOT NULL
   success INTEGER DEFAULT 0
   attempt_time DATETIME DEFAULT CURRENT_TIMESTAMP
   
**password_reset_tokens**
   id INTEGER PRIMARY KEY AUTOINCREMENT
   user_id INTEGER NOT NULL
   token TEXT UNIQUE NOT NULL
   expires_at DATETIME NOT NULL
   used INTEGER DEFAULT 0
   created_at DATETIME DEFAULT CURRENT_TIMESTAMP
   FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE

**chat_messages**
   id INTEGER PRIMARY KEY AUTOINCREMENT
   user_id INTEGER NOT NULL
   message TEXT NOT NULL
   created_at DATETIME DEFAULT CURRENT_TIMESTAMP
   FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE

**pdf_documents**
   id INTEGER PRIMARY KEY AUTOINCREMENT
   filename TEXT UNIQUE NOT NULL
   title TEXT NOT NULL
   description TEXT
   slug TEXT UNIQUE NOT NULL
   file_size INTEGER
   page_count INTEGER
   upload_date DATETIME DEFAULT CURRENT_TIMESTAMP
   updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
   downloads INTEGER DEFAULT 0
   user_id INTEGER
   FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL

**sessions**
   sid TEXT PRIMARY KEY
   sess TEXT NOT NULL
   expire INTEGER NOT NULL

## Available Routes

# Public Routes
   GET / - Home page with feature overview

   GET /comments - View all comments with pagination

   GET /comments?page=N - Paginated comments view

   GET /login - User login form

   GET /register - User registration form

   GET /password/forgot - Forgot password form

   GET /password/reset/:token - Password reset form

   GET /chat - Real-time chat interface

   GET /pdfs - PDF document library

# Authentication Routes

   POST /login - Authenticate user and create session

   POST /register - Create new user account

   POST /logout - Clear session and logout

# Comment Routes

   GET /comments/new - Create new comment form

   POST /comments - Create new comment

   GET /comments/:id/edit - Edit comment form

   POST /comments/:id/edit - Update comment

   POST /comments/:id/vote - Vote on comment

   POST /comments/:id/delete - Delete comment

# Profile Routes

   GET /profile - User profile page

   POST /profile/password - Change password

   POST /profile/email - Update email address

   POST /profile/display-name - Update display name

   POST /profile/customization - Update profile customization

# Password Recovery Routes

   POST /password/forgot - Request password reset email

   POST /password/reset/:token - Submit new password

# Chat Routes

   GET /chat/history - Get chat history

   GET /chat/online - Get online users

# PDF Routes

   GET /pdfs - Browse PDF documents

   GET /pdfs/:slug - View PDF details

   GET /pdfs/:slug/download - Download PDF file

