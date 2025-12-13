/*
    This comments.js file defines the routes for handling comment-related operations in the backend server.
*/

const express = require('express');
const router = express.Router();
const db = require('../database');
const { requireAuth } = require('../middleware/auth');
const markdownParser = require('../modules/markdown-parser');


router.get('/', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    try {
        const countStmt = db.prepare('SELECT COUNT(*) as total FROM comments WHERE parent_id IS NULL');
        const totalResult = countStmt.get();
        const total = totalResult.total;
        const totalPages = Math.ceil(total / limit);

        const commentsStmt = db.prepare(`
            SELECT c.*, 
                   u.username, u.display_name, u.profile_color, u.profile_icon,
                   (SELECT COUNT(*) FROM comments WHERE parent_id = c.id) as reply_count
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.parent_id IS NULL
            ORDER BY c.created_at DESC
            LIMIT ? OFFSET ?
        `);
        const comments = commentsStmt.all(limit, offset);
    
        const commentIds = comments.map(c => c.id);
        let replies = [];
        if (commentIds.length > 0) {
            const repliesStmt = db.prepare(`
                SELECT c.*, 
                       u.username, u.display_name, u.profile_color, u.profile_icon
                FROM comments c
                JOIN users u ON c.user_id = u.id
                WHERE c.parent_id IN (${commentIds.map(() => '?').join(',')})
                ORDER BY c.created_at ASC
            `);
            replies = repliesStmt.all(...commentIds);
        }
        
        const repliesByParent = {};
        replies.forEach(reply => {
            if (!repliesByParent[reply.parent_id]) {
                repliesByParent[reply.parent_id] = [];
            }
            repliesByParent[reply.parent_id].push(reply);
        });
        
        comments.forEach(comment => {
            comment.replies = repliesByParent[comment.id] || [];
        });
        
        res.render('comments', {
            title: 'Comments - Wild West Forum',
            comments: comments,
            pagination: {
                page: page,
                limit: limit,
                total: total,
                totalPages: totalPages,
                hasPrev: page > 1,
                hasNext: page < totalPages,
                prevPage: page - 1,
                nextPage: page + 1
            },
            currentUser: req.session.user
        });
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).render('error', {
            title: 'Error - Wild West Forum',
            message: 'Failed to load comments'
        });
    }
});

router.get('/new', requireAuth, (req, res) => {
    res.render('new-comment', {
        title: 'New Comment - Wild West Forum',
        parentId: req.query.parentId || null
    });
});

router.post('/', requireAuth, async (req, res) => {
    try {
        const { text, parentId } = req.body;
        const userId = req.session.user.id;
        
        if (!text || text.trim().length === 0) {
            return res.render('new-comment', {
                title: 'New Comment - Wild West Forum',
                error: 'Comment text is required',
                text: text,
                parentId: parentId
            });
        }
        
        const textHtml = markdownParser.parseMarkdown(text);
        
        const stmt = db.prepare(`
            INSERT INTO comments (user_id, text, text_html, parent_id)
            VALUES (?, ?, ?, ?)
        `);
        
        const result = stmt.run(userId, text.trim(), textHtml, parentId || null);
        
        res.redirect('/comments');
    } catch (error) {
        console.error('Error creating comment:', error);
        res.render('new-comment', {
            title: 'New Comment - Wild West Forum',
            error: 'Failed to create comment',
            text: req.body.text,
            parentId: req.body.parentId
        });
    }
});

router.post('/:id/vote', requireAuth, (req, res) => {
    try {
        const { vote } = req.body;
        const commentId = req.params.id;
        const userId = req.session.user.id;
        
        if (!vote || (vote !== 'up' && vote !== 'down')) {
            return res.status(400).json({ error: 'Invalid vote' });
        }
        
        const voteValue = vote === 'up' ? 1 : -1;
        
        const existingVote = db.prepare(`
            SELECT vote FROM comment_votes 
            WHERE comment_id = ? AND user_id = ?
        `).get(commentId, userId);
        
        let newVoteValue = voteValue;
        
        if (existingVote) {
            if (existingVote.vote === voteValue) {
                db.prepare(`
                    DELETE FROM comment_votes 
                    WHERE comment_id = ? AND user_id = ?
                `).run(commentId, userId);
                newVoteValue = -existingVote.vote;
            } else {
                db.prepare(`
                    UPDATE comment_votes 
                    SET vote = ?
                    WHERE comment_id = ? AND user_id = ?
                `).run(voteValue, commentId, userId);
                newVoteValue = voteValue - existingVote.vote;
            }
        } else {
            db.prepare(`
                INSERT INTO comment_votes (comment_id, user_id, vote)
                VALUES (?, ?, ?)
            `).run(commentId, userId, voteValue);
        }
        
        db.prepare(`
            UPDATE comments 
            SET votes = votes + ?
            WHERE id = ?
        `).run(newVoteValue, commentId);
        
        const updatedComment = db.prepare(`
            SELECT votes FROM comments WHERE id = ?
        `).get(commentId);
        
        res.json({ 
            success: true, 
            votes: updatedComment.votes,
            userVote: existingVote ? (existingVote.vote === voteValue ? 0 : voteValue) : voteValue
        });
    } catch (error) {
        console.error('Error voting:', error);
        res.status(500).json({ error: 'Failed to process vote' });
    }
});

router.get('/:id/edit', requireAuth, (req, res) => {
    try {
        const commentId = req.params.id;
        const userId = req.session.user.id;
        
        const comment = db.prepare(`
            SELECT c.*, u.username 
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.id = ?
        `).get(commentId);
        
        if (!comment) {
            return res.status(404).render('error', {
                title: 'Not Found - Wild West Forum',
                message: 'Comment not found'
            });
        }
        
        if (comment.user_id !== userId) {
            return res.status(403).render('error', {
                title: 'Forbidden - Wild West Forum',
                message: 'You can only edit your own comments'
            });
        }
        
        res.render('edit-comment', {
            title: 'Edit Comment - Wild West Forum',
            comment: comment
        });
    } catch (error) {
        console.error('Error loading edit form:', error);
        res.status(500).render('error', {
            title: 'Error - Wild West Forum',
            message: 'Failed to load edit form'
        });
    }
});

router.post('/:id/edit', requireAuth, async (req, res) => {
    try {
        const commentId = req.params.id;
        const userId = req.session.user.id;
        const { text } = req.body;
        
        const comment = db.prepare(`
            SELECT user_id FROM comments WHERE id = ?
        `).get(commentId);
        
        if (!comment || comment.user_id !== userId) {
            return res.status(403).render('error', {
                title: 'Forbidden - Wild West Forum',
                message: 'You can only edit your own comments'
            });
        }
        
        if (!text || text.trim().length === 0) {
            return res.render('edit-comment', {
                title: 'Edit Comment - Wild West Forum',
                comment: { id: commentId, text: text },
                error: 'Comment text is required'
            });
        }
        
        const textHtml = markdownParser.parseMarkdown(text);
        

        db.prepare(`
            UPDATE comments 
            SET text = ?, text_html = ?, edited_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(text.trim(), textHtml, commentId);
        
        res.redirect('/comments');
    } catch (error) {
        console.error('Error updating comment:', error);
        res.render('edit-comment', {
            title: 'Edit Comment - Wild West Forum',
            comment: { id: req.params.id, text: req.body.text },
            error: 'Failed to update comment'
        });
    }
});

router.post('/:id/delete', requireAuth, (req, res) => {
    try {
        const commentId = req.params.id;
        const userId = req.session.user.id;
        

        const comment = db.prepare(`
            SELECT user_id FROM comments WHERE id = ?
        `).get(commentId);
        
        if (!comment || comment.user_id !== userId) {
            return res.status(403).json({ error: 'You can only delete your own comments' });
        }
        
        db.prepare('DELETE FROM comments WHERE id = ?').run(commentId);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ error: 'Failed to delete comment' });
    }
});

module.exports = router;