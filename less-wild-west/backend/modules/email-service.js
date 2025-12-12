/*
    This email-service.js file contains utility functions for sending emails using Node.js and Nodemailer.
*/

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    }
});


async function sendPasswordResetEmail(to, username, resetToken, resetUrl) {
    const expiryHours = 1; 
    // Technically this is html so I used AI
    const mailOptions = {
        from: `"Wild West Forum" <${process.env.GMAIL_USER}>`,
        to: to,
        subject: 'Password Reset Request - Wild West Forum',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #8B4513; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                    .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 5px 5px; }
                    .button { display: inline-block; padding: 12px 24px; background-color: #8B4513; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
                    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🤠 Wild West Forum</h1>
                        <h2>Password Reset Request</h2>
                    </div>
                    <div class="content">
                        <p>Hello ${username},</p>
                        <p>We received a request to reset your password for your Wild West Forum account.</p>
                        
                        <p><strong>Reset your password by clicking the button below:</strong></p>
                        
                        <a href="${resetUrl}" class="button">Reset Password</a>
                        
                        <p>Or copy and paste this link into your browser:</p>
                        <p><code>${resetUrl}</code></p>
                        
                        <div class="warning">
                            <p><strong>⚠️ Important:</strong></p>
                            <p>This password reset link will expire in ${expiryHours} hour.</p>
                            <p>If you didn't request this password reset, please ignore this email.</p>
                        </div>
                        
                        <p>Thanks,<br>The Wild West Forum Team</p>
                    </div>
                    <div class="footer">
                        <p>This email was sent to ${to}</p>
                        <p>© ${new Date().getFullYear()} Wild West Forum. All rights reserved.</p>
                        <p>This is an automated message, please do not reply to this email.</p>
                    </div>
                </div>
            </body>
            </html>
        `,
        text: `
            Wild West Forum - Password Reset Request
            
            Hello ${username},
            
            We received a request to reset your password for your Wild West Forum account.
            
            Reset your password by visiting this link:
            ${resetUrl}
            
            This password reset link will expire in 1 hour.
            
            If you didn't request this password reset, please ignore this email.
            
            Thanks,
            The Wild West Forum Team
        `
    };
    
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Password reset email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending password reset email:', error);
        return { success: false, error: error.message };
    }
}

async function sendEmailConfirmation(to, username) {
    // Same with this
    const mailOptions = {
        from: `"Wild West Forum" <${process.env.GMAIL_USER}>`,
        to: to,
        subject: 'Email Updated - Wild West Forum',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #8B4513; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                    .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 5px 5px; }
                    .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🤠 Wild West Forum</h1>
                        <h2>Email Address Updated</h2>
                    </div>
                    <div class="content">
                        <p>Hello ${username},</p>
                        <p>This email confirms that your email address has been successfully updated for your Wild West Forum account.</p>
                        
                        <div class="warning">
                            <p><strong>⚠️ Security Notice:</strong></p>
                            <p>If you did not make this change, please contact support immediately and secure your account.</p>
                        </div>
                        
                        <p>Thanks,<br>The Wild West Forum Team</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };
    
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email confirmation sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending email confirmation:', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    sendPasswordResetEmail,
    sendEmailConfirmation
};