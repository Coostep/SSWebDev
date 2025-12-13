const hbs = require('hbs');

hbs.registerHelper('formatDate', function(date) {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
});


hbs.registerHelper('formatTime', function(date) {
    if (!date) return '';
    return new Date(date).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
});

hbs.registerHelper('eq', function(a, b) {
    return a === b;
});