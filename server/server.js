const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { sendEmail, testConnection } = require('./emailService');
const { checkDailyReminders, checkWeeklyReminders, send5DayReminders, sendExpiringTodayReminders } = require('./reminderLogic');
const { startCronJobs } = require('./cronJobs');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000'
}));
app.use(express.json({ limit: '10mb' }));

// Store latest subscription data
let subscriptionData = [];

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Test SMTP connection
app.get('/api/test-email', async (req, res) => {
  try {
    const result = await testConnection();
    res.json({ success: true, message: 'SMTP connection successful', result });
  } catch (error) {
    console.error('Test email failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Sync subscription data from frontend
app.post('/api/sync-data', (req, res) => {
  try {
    const { subscriptions } = req.body;
    if (!Array.isArray(subscriptions)) {
      return res.status(400).json({ success: false, error: 'Invalid data format' });
    }
    
    subscriptionData = subscriptions;
    console.log(`✅ Synced ${subscriptions.length} subscriptions from frontend`);
    res.json({ success: true, count: subscriptions.length });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Manual reminder trigger
app.post('/api/send-reminder-manual', async (req, res) => {
  try {
    console.log('📧 Manual reminder triggered');
    
    // Use provided subscriptions or stored data
    const data = req.body.subscriptions || subscriptionData;
    
    if (!data.length) {
      return res.status(400).json({ 
        success: false, 
        error: 'No subscription data available. Sync data first.' 
      });
    }

    const results = await checkDailyReminders(data, true);
    
    res.json({ 
      success: true, 
      message: `Sent ${results.sent} reminder emails`,
      details: results
    });
  } catch (error) {
    console.error('Manual reminder error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Manual reminder trigger (GET version for easy browser testing)
app.get('/api/send-reminder-manual', async (req, res) => {
  try {
    console.log('📧 Manual reminder triggered (GET)');
    
    if (!subscriptionData.length) {
      return res.status(400).json({ 
        success: false, 
        error: 'No subscription data available. Sync data first.' 
      });
    }

    const results = await checkDailyReminders(subscriptionData, true);
    
    res.json({ 
      success: true, 
      message: `Sent ${results.sent} reminder emails`,
      details: results
    });
  } catch (error) {
    console.error('Manual reminder error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test weekly digest (GET version)
app.get('/api/send-weekly-digest', async (req, res) => {
  try {
    console.log('📊 Weekly digest triggered manually');
    
    if (!subscriptionData.length) {
      return res.status(400).json({ 
        success: false, 
        error: 'No subscription data available. Sync data first.' 
      });
    }

    const results = await checkWeeklyReminders(subscriptionData);
    
    res.json({ 
      success: true, 
      message: results.sent ? 'Weekly digest sent' : 'No actionable items',
      details: results
    });
  } catch (error) {
    console.error('Weekly digest error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send 5-day reminders
app.get('/api/send-5-day-reminders', async (req, res) => {
  try {
    console.log('🔔 5-day reminders triggered manually');
    
    if (!subscriptionData.length) {
      return res.status(400).json({ 
        success: false, 
        error: 'No subscription data available. Sync data first.' 
      });
    }

    const results = await send5DayReminders(subscriptionData, true);
    
    res.json({ 
      success: true, 
      message: results.message || `Sent ${results.sent} reminder email`,
      details: results
    });
  } catch (error) {
    console.error('5-day reminder error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send expiring today reminders
app.get('/api/send-expiring-today', async (req, res) => {
  try {
    console.log('⚠️ Expiring today reminders triggered manually');
    
    if (!subscriptionData.length) {
      return res.status(400).json({ 
        success: false, 
        error: 'No subscription data available. Sync data first.' 
      });
    }

    const results = await sendExpiringTodayReminders(subscriptionData, true);
    
    res.json({ 
      success: true, 
      message: results.message || `Sent ${results.sent} reminder email`,
      details: results
    });
  } catch (error) {
    console.error('Expiring today reminder error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get current subscription data (for debugging)
app.get('/api/subscriptions', (req, res) => {
  res.json({ 
    count: subscriptionData.length,
    lastUpdate: subscriptionData.length > 0 ? new Date().toISOString() : null
  });
});

// Start cron jobs
startCronJobs(() => subscriptionData);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 License Tracker Backend running on port ${PORT}`);
  console.log(`📧 Email reminders configured:`);
  console.log(`   - TO: ${process.env.EMAIL_TO}`);
  console.log(`   - CC: ${process.env.EMAIL_CC}`);
  console.log(`   - Daily checks: 9:00 AM`);
  console.log(`   - Weekly digest: Monday 10:00 AM`);
});
