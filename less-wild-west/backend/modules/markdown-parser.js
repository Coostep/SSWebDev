/*
    This markdown-parser.js file contains utility functions for parsing and rendering Markdown content.
    It includes functions for converting Markdown to HTML and sanitizing the output.
*/

const marked = require('marked');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

// Configure marked for safe parsing
marked.setOptions({
    breaks: true,
    gfm: true,
    headerIds: false,
    mangle: false
});

// Create a window object for DOMPurify
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

// Allowed HTML tags and attributes for DOMPurify
const DOMPURIFY_CONFIG = {
    ALLOWED_TAGS: [
        'p', 'br', 'b', 'i', 'strong', 'em', 'a', 'code', 'pre',
        'blockquote', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'hr', 'img', 'div', 'span'
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id', 'target'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick'],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
};

/**
 * Sanitizes and converts markdown to HTML
 * @param {string} markdown - Markdown text
 * @param {boolean} allowLinks - Whether to allow links
 * @returns {string} Sanitized HTML
 */
function parseMarkdown(markdown, allowLinks = true) {
    if (!markdown || typeof markdown !== 'string') {
        return '';
    }
    
    // Convert markdown to HTML
    let html = marked.parse(markdown);
    
    // Configure DOMPurify based on whether links are allowed
    const config = { ...DOMPURIFY_CONFIG };
    if (!allowLinks) {
        config.ALLOWED_TAGS = config.ALLOWED_TAGS.filter(tag => tag !== 'a');
        config.ALLOWED_ATTR = config.ALLOWED_ATTR.filter(attr => attr !== 'href');
    }
    
    // Sanitize HTML to prevent XSS
    html = DOMPurify.sanitize(html, config);
    
    return html;
}

/**
 * Truncates markdown text for preview
 * @param {string} markdown - Markdown text
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
function truncateMarkdown(markdown, maxLength = 200) {
    if (!markdown) return '';
    
    // Remove markdown formatting for preview
    const plainText = markdown
        .replace(/#{1,6}\s*/g, '') // Headers
        .replace(/(\*\*|__)(.*?)\1/g, '$2') // Bold
        .replace(/(\*|_)(.*?)\1/g, '$2') // Italic
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
        .replace(/`([^`]+)`/g, '$1') // Inline code
        .replace(/```[\s\S]*?```/g, '') // Code blocks
        .replace(/\n+/g, ' '); // New lines
    
    if (plainText.length <= maxLength) {
        return plainText;
    }
    
    return plainText.substring(0, maxLength) + '...';
}

module.exports = {
    parseMarkdown,
    truncateMarkdown
};