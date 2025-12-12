/*
    This sqlite-session-store.js file is used to create a session store using SQLite for the Less Wild West application.
*/

const { Store } = require('express-session');
const db = require('./database');

class SQLiteStore extends Store {
    constructor(options = {}) {
        super(options);
        this.table = 'sessions';
        
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 15 * 60 * 1000);
        
        process.on('SIGINT', () => {
            clearInterval(this.cleanupInterval);
        });
    }
    
    get(sid, callback) {
        try {
            const row = db.prepare(
                `SELECT sess FROM ${this.table} WHERE sid = ? AND expire > ?`
            ).get(sid, Date.now());
            
            if (row) {
                const session = JSON.parse(row.sess);
                callback(null, session);
            } else {
                callback(null, null);
            }
        } catch (err) {
            callback(err);
        }
    }
    
    set(sid, sess, callback) {
        try {
            const maxAge = sess.cookie?.maxAge;
            const expire = maxAge ? Date.now() + maxAge : Date.now() + (24 * 60 * 60 * 1000); // 24 hours default
            const sessData = JSON.stringify(sess);
            
            db.prepare(
                `INSERT OR REPLACE INTO ${this.table} (sid, sess, expire) VALUES (?, ?, ?)`
            ).run(sid, sessData, expire);
            
            callback(null);
        } catch (err) {
            callback(err);
        }
    }
    
    destroy(sid, callback) {
        try {
            db.prepare(`DELETE FROM ${this.table} WHERE sid = ?`).run(sid);
            callback(null);
        } catch (err) {
            callback(err);
        }
    }
    
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
    
    close() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
    }
}

module.exports = SQLiteStore;