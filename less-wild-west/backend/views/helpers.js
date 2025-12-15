/*
    Handlebars helpers for Less Wild West application
    This file contains custom helper functions for use in Handlebars templates
*/

module.exports = {
    truncate: function(str, len) {
        if (typeof str !== 'string') return '';
        if (str.length <= len) return str;
        return str.substring(0, len) + '...';
    },

    formatDate: function(dateString) {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return dateString;
        }
    },

    formatSimpleDate: function(dateString) {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (e) {
            return dateString;
        }
    },

    eq: function(a, b, options) {
        if (a === b) {
            return options.fn(this);
        }
        return options.inverse(this);
    },

    if_eq: function(a, b, options) {
        if (a === b) {
            return options.fn(this);
        }
        return options.inverse(this);
    },

    gt: function(a, b) {
        return a > b;
    },
    
    lt: function(a, b) {
        return a < b;
    },

    substring: function(str, start, end) {
        if (typeof str !== 'string') return '';
        return str.substring(start, end);
    },

    inArray: function(value, array, options) {
        if (Array.isArray(array) && array.includes(value)) {
            return options.fn(this);
        }
        return options.inverse(this);
    },

    json: function(context) {
        return JSON.stringify(context);
    },

    isOwner: function(contentUserId, currentUserId, options) {
        if (contentUserId && currentUserId && contentUserId.toString() === currentUserId.toString()) {
            return options.fn(this);
        }
        return options.inverse(this);
    },
 
    add: function(a, b) {
        return a + b;
    },
 
    subtract: function(a, b) {
        return a - b;
    },

    multiply: function(a, b) {
        return a * b;
    },

    divide: function(a, b) {
        return a / b;
    },

    isDefined: function(value, options) {
        if (value !== undefined && value !== null) {
            return options.fn(this);
        }
        return options.inverse(this);
    },
    
    hasItems: function(array, options) {
        if (Array.isArray(array) && array.length > 0) {
            return options.fn(this);
        }
        return options.inverse(this);
    },
    
    length: function(array) {
        if (!Array.isArray(array)) return 0;
        return array.length;
    }
};