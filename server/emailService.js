const nodemailer = require('nodemailer');
require('dotenv').config();

// Create nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: {
    ciphers: 'SSLv3'
  }
});

/**
 * Test SMTP connection
 */
async function testConnection() {
  try {
    await transporter.verify();
    console.log('✅ SMTP connection verified');
    
    // Send test email
    const info = await transporter.sendMail({
      from: `"XOWN License Tracker" <${process.env.EMAIL_FROM}>`,
      to: process.env.EMAIL_TO,
      subject: 'Test Email - XOWN License Tracker',
      text: 'SMTP configuration is working correctly!',
      html: '<p><strong>SMTP configuration is working correctly!</strong></p><p>Email reminders are ready to send.</p>'
    });
    
    return { messageId: info.messageId, accepted: info.accepted };
  } catch (error) {
    console.error('❌ SMTP connection failed:', error.message);
    throw error;
  }
}

/**
 * Send email with HTML template
 */
async function sendEmail(subject, htmlContent, textContent) {
  const mailOptions = {
    from: `"XOWN License Tracker" <${process.env.EMAIL_FROM}>`,
    to: process.env.EMAIL_TO,
    cc: process.env.EMAIL_CC,
    subject: subject,
    text: textContent,
    html: htmlContent
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent: ${subject} (${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Failed to send email: ${subject}`, error.message);
    throw error;
  }
}

module.exports = {
  sendEmail,
  testConnection
};
