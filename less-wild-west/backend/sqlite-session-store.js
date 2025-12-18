/*
    This sqlite-session-store.js file is for Session store implementation
    The session store implementation for express-session with automatic cleanup
*/
const { Store } = require('express-session');
const db = require('./database');

class SQLiteStore extends Store {
    constructor(options = {}) {
        super(options);
        this.table = 'sessions';
        
        // Sets up automatic session cleanup every 15 minutes to remove expired sessions
        setInterval(() => {
            this.cleanup();
        }, 15 * 60 * 1000);
    }
    
    // Retrieves a session from the database by session ID, checking expiration
    get(sid, callback) {
        try {
            const row = db.prepare(
                `SELECT sess FROM ${this.table} WHERE sid = ? AND expire > ?`
            ).get(sid, Date.now());
            
            if (row) {
                callback(null, JSON.parse(row.sess));
            } else {
                callback(null, null);
            }
        } catch (err) {
            callback(err);
        }
    }
    
    // Saves or updates a session in the database with 24-hour expiration
    set(sid, sess, callback) {
        try {
            const expire = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
            const sessData = JSON.stringify(sess);
            
            db.prepare(
                `INSERT OR REPLACE INTO ${this.table} (sid, sess, expire) VALUES (?, ?, ?)`
            ).run(sid, sessData, expire);
            
            callback(null);
        } catch (err) {
            callback(err);
        }
    }
    
    // Deletes a session from the database when user logs out or session is invalidated
    destroy(sid, callback) {
        try {
            db.prepare(`DELETE FROM ${this.table} WHERE sid = ?`).run(sid);
            callback(null);
        } catch (err) {
            callback(err);
        }
    }
    
    // Removes expired sessions from the database to maintain performance and storage
    cleanup() {
        try {
            const result = db.prepare(
                `DELETE FROM ${this.table} WHERE expire <= ?`
            ).run(Date.now());
            
            if (result.changes > 0) {
                console.log(`Cleaned up ${result.changes} expired session(s)`);
            }
        } catch (err) {
            console.error('Error cleaning up sessions:', err);
        }
    }
    
    // Placeholder close method for interface compatibility (SQLite doesn't require explicit closing)
    close() {

    }
}

module.exports = SQLiteStore;