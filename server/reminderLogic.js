const fs = require('fs');
const path = require('path');
const { sendEmail } = require('./emailService');
require('dotenv').config();

const HISTORY_FILE = path.join(__dirname, 'reminderHistory.json');

/**
 * Load reminder history from JSON file
 */
function loadHistory() {
  if (!fs.existsSync(HISTORY_FILE)) {
    return {};
  }
  try {
    const data = fs.readFileSync(HISTORY_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading reminder history:', error);
    return {};
  }
}

/**
 * Save reminder history to JSON file
 */
function saveHistory(history) {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
  } catch (error) {
    console.error('Error saving reminder history:', error);
  }
}

/**
 * Check if reminder was already sent today
 */
function wasReminderSentToday(subId, type) {
  const history = loadHistory();
  const today = new Date().toISOString().split('T')[0];
  
  if (history[subId] && history[subId][type]) {
    return history[subId][type] === today;
  }
  return false;
}

/**
 * Mark reminder as sent
 */
function markReminderSent(subId, type) {
  const history = loadHistory();
  const today = new Date().toISOString().split('T')[0];
  
  if (!history[subId]) {
    history[subId] = {};
  }
  history[subId][type] = today;
  history[subId].lastChecked = new Date().toISOString();
  
  saveHistory(history);
}

/**
 * Build HTML table for subscriptions
 */
function buildSubscriptionTable(subscriptions) {
  if (!subscriptions.length) return '';
  
  const rows = subscriptions.map(sub => `
    <tr style="border-bottom: 1px solid #e0e0e0;">
      <td style="padding: 12px 8px;">${sub.client}</td>
      <td style="padding: 12px 8px;">${sub.plan}</td>
      <td style="padding: 12px 8px; text-align: center;">${sub.seats}</td>
      <td style="padding: 12px 8px;">${sub.renewal || '—'}</td>
      <td style="padding: 12px 8px; text-align: center; font-weight: bold;">${sub.daysDisplay}</td>
    </tr>
  `).join('');
  
  const totalSeats = subscriptions.reduce((sum, sub) => sum + (sub.seats || 0), 0);
  
  return `
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
      <thead>
        <tr style="background: #f5f5f5; border-bottom: 2px solid #ddd;">
          <th style="padding: 12px 8px; text-align: left;">Client</th>
          <th style="padding: 12px 8px; text-align: left;">Plan</th>
          <th style="padding: 12px 8px; text-align: center;">Seats</th>
          <th style="padding: 12px 8px; text-align: left;">Renewal Date</th>
          <th style="padding: 12px 8px; text-align: center;">Days</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
      <tfoot>
        <tr style="background: #f9f9f9; font-weight: bold;">
          <td colspan="2" style="padding: 12px 8px;">Total</td>
          <td style="padding: 12px 8px; text-align: center;">${totalSeats}</td>
          <td colspan="2" style="padding: 12px 8px; text-align: center;">${subscriptions.length} licenses</td>
        </tr>
      </tfoot>
    </table>
  `;
}

/**
 * Check for daily reminders and send emails
 */
async function checkDailyReminders(subscriptions, force = false) {
  const results = {
    checked: subscriptions.length,
    sent: 0,
    skipped: 0,
    errors: []
  };

  // Group subscriptions by reminder type
  const fiveDayReminders = [];
  const expiringToday = [];

  subscriptions.forEach(sub => {
    const days = sub.days;
    const status = sub.status;
    const subId = sub._subId || sub.id;

    // Licenses expiring within the next 5 days (0-5 days)
    if (days !== null && days !== undefined && days >= 0 && days <= 5 && (!wasReminderSentToday(subId, 'reminder5d') || force)) {
      fiveDayReminders.push({ ...sub, daysDisplay: days === 0 ? 'TODAY' : days.toString() });
    }

    // Expiring today (also included in 5-day check, but kept separate for tracking)
    if (days !== null && days !== undefined && days === 0 && (!wasReminderSentToday(subId, 'expiringToday') || force)) {
      expiringToday.push({ ...sub, daysDisplay: 'TODAY' });
    }
  });

  // Send 5-day reminders
  if (fiveDayReminders.length > 0) {
    try {
      const table = buildSubscriptionTable(fiveDayReminders);
      const totalSeats = fiveDayReminders.reduce((sum, s) => sum + s.seats, 0);
      const dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:3000';
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 900px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 8px 8px 0 0; color: white;">
            <h1 style="margin: 0; font-size: 24px;">Licenses Expiring Within 5 Days</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Action Required</p>
          </div>
          
          <div style="background: #fafafa; padding: 30px; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; margin-top: 0;">Hi Team,</p>
            <p>The following <strong>${fiveDayReminders.length} licenses</strong> will expire <strong>within the next 5 days</strong>. Please follow up with clients for renewal:</p>
            
            ${table}
            
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0;"><strong>Summary:</strong> ${fiveDayReminders.length} licenses, ${totalSeats} seats</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${dashboardUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">View in Dashboard →</a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #666; margin: 0;">
              <strong>XOWN MS365 License Tracker</strong><br>
              Sent: ${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}
            </p>
          </div>
        </body>
        </html>
      `;
      
      const text = `5 Day Warning: ${fiveDayReminders.length} licenses expiring within 5 days\n\n${fiveDayReminders.map(s => `${s.client} - ${s.plan} (${s.seats} seats) - ${s.renewal} (${s.daysDisplay} days)`).join('\n')}`;
      
      await sendEmail(
        `[Action Required] ${fiveDayReminders.length} License${fiveDayReminders.length > 1 ? 's' : ''} Expiring Within 5 Days`,
        html,
        text
      );
      
      fiveDayReminders.forEach(sub => markReminderSent(sub._subId || sub.id, 'reminder5d'));
      results.sent++;
    } catch (error) {
      results.errors.push({ type: 'reminder5d', error: error.message });
    }
  }

  // Send expiring today emails
  if (expiringToday.length > 0) {
    try {
      const table = buildSubscriptionTable(expiringToday);
      const totalSeats = expiringToday.reduce((sum, s) => sum + s.seats, 0);
      const dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:3000';
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 900px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; border-radius: 8px 8px 0 0; color: white;">
            <h1 style="margin: 0; font-size: 24px;">URGENT: Licenses Expiring TODAY</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Immediate Action Required</p>
          </div>
          
          <div style="background: #fafafa; padding: 30px; border-radius: 0 0 8px 8px;">
            <p style="font-size: 16px; margin-top: 0;">Hi Team,</p>
            <p><strong style="color: #d32f2f;">URGENT:</strong> The following <strong>${expiringToday.length} licenses</strong> expire <strong>TODAY</strong>. Immediate action required:</p>
            
            ${table}
            
            <div style="background: #ffebee; border-left: 4px solid #f44336; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0;"><strong>Warning:</strong> These subscriptions will enter grace period at midnight.</p>
              <p style="margin: 10px 0 0 0;"><strong>Summary:</strong> ${expiringToday.length} licenses, ${totalSeats} seats</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${dashboardUrl}" style="display: inline-block; background: #f44336; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">View in Dashboard →</a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #666; margin: 0;">
              <strong>XOWN MS365 License Tracker</strong><br>
              Sent: ${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}
            </p>
          </div>
        </body>
        </html>
      `;
      
      const text = `URGENT - Expiring Today: ${expiringToday.length} licenses expire today\n\n${expiringToday.map(s => `${s.client} - ${s.plan} (${s.seats} seats) - ${s.renewal}`).join('\n')}`;
      
      await sendEmail(
        `[URGENT] ${expiringToday.length} License${expiringToday.length > 1 ? 's' : ''} Expiring TODAY`,
        html,
        text
      );
      
      expiringToday.forEach(sub => markReminderSent(sub._subId || sub.id, 'expiringToday'));
      results.sent++;
    } catch (error) {
      results.errors.push({ type: 'expiringToday', error: error.message });
    }
  }

  results.skipped = results.checked - (fiveDayReminders.length + expiringToday.length);
  
  return results;
}

/**
 * Check for weekly reminders (Monday digest)
 */
async function checkWeeklyReminders(subscriptions) {
  // Get subscriptions expiring/disabled this week (next 7 days)
  const expiring = subscriptions.filter(s => s.days !== null && s.days !== undefined && s.days >= 0 && s.days <= 7);
  const grace = subscriptions.filter(s => s.status === 'grace');
  const disabled = subscriptions.filter(s => s.status === 'disabled');

  if (expiring.length === 0 && grace.length === 0 && disabled.length === 0) {
    console.log('📊 Weekly digest: No actionable items this week');
    return { sent: 0 };
  }

  try {
    const expiringTable = expiring.length > 0 ? buildSubscriptionTable(expiring.map(s => ({...s, daysDisplay: s.days.toString()}))) : '<p style="color: #666;">No licenses expiring this week</p>';
    const graceTable = grace.length > 0 ? buildSubscriptionTable(grace.map(s => ({...s, daysDisplay: `${Math.abs(s.days)} overdue`}))) : '<p style="color: #666;">No licenses in grace period</p>';
    const disabledTable = disabled.length > 0 ? buildSubscriptionTable(disabled.map(s => ({...s, daysDisplay: `${Math.abs(s.days)} overdue`}))) : '<p style="color: #666;">No disabled licenses</p>';
    
    const totalSeats = [...expiring, ...grace, ...disabled].reduce((sum, s) => sum + s.seats, 0);
    const totalCount = expiring.length + grace.length + disabled.length;
    const dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:3000';
    
    const today = new Date();
    const nextWeek = new Date(Date.now() + 7*24*60*60*1000);
    const dateRange = `${today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${nextWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 900px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 8px 8px 0 0; color: white;">
          <h1 style="margin: 0; font-size: 24px;">Weekly License Report</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">${totalCount} Licenses Need Attention (${dateRange})</p>
        </div>
        
        <div style="background: #fafafa; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; margin-top: 0;">Hi Team,</p>
          <p>Here's your weekly license status report:</p>
          
          <div style="background: white; padding: 20px; margin: 20px 0; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="margin: 0 0 15px 0; color: #d97706; font-size: 18px; border-bottom: 2px solid #fbbf24; padding-bottom: 10px;">Expiring This Week (${expiring.length} licenses)</h2>
            ${expiringTable}
          </div>
          
          <div style="background: white; padding: 20px; margin: 20px 0; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="margin: 0 0 15px 0; color: #3b82f6; font-size: 18px; border-bottom: 2px solid #60a5fa; padding-bottom: 10px;">Grace Period (${grace.length} licenses)</h2>
            ${graceTable}
          </div>
          
          <div style="background: white; padding: 20px; margin: 20px 0; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="margin: 0 0 15px 0; color: #dc2626; font-size: 18px; border-bottom: 2px solid #ef4444; padding-bottom: 10px;">Disabled (${disabled.length} licenses)</h2>
            ${disabledTable}
          </div>
          
          <div style="background: #e0e7ff; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 4px;">
            <h3 style="margin: 0 0 10px 0;">Summary</h3>
            <ul style="margin: 0; padding-left: 20px;">
              <li><strong>Expiring This Week:</strong> ${expiring.length} licenses (${expiring.reduce((sum, s) => sum + s.seats, 0)} seats)</li>
              <li><strong>Grace Period:</strong> ${grace.length} licenses (${grace.reduce((sum, s) => sum + s.seats, 0)} seats)</li>
              <li><strong>Disabled:</strong> ${disabled.length} licenses (${disabled.reduce((sum, s) => sum + s.seats, 0)} seats)</li>
              <li style="margin-top: 10px; font-size: 16px;"><strong>Total Action Required:</strong> ${totalCount} licenses (${totalSeats} seats)</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">View in Dashboard →</a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #666; margin: 0;">
            <strong>XOWN MS365 License Tracker</strong><br>
            Weekly Report • Sent: ${new Date().toLocaleString('en-US', { weekday: 'long', dateStyle: 'full', timeStyle: 'short' })}
          </p>
        </div>
      </body>
      </html>
    `;
    
    const text = `Weekly License Report\n\nExpiring: ${expiring.length}, Grace: ${grace.length}, Disabled: ${disabled.length}\nTotal: ${totalCount} licenses, ${totalSeats} seats`;
    
    await sendEmail(
      `Weekly License Report: ${totalCount} Licenses Need Attention (${dateRange})`,
      html,
      text
    );
    
    return { sent: 1 };
  } catch (error) {
    console.error('Weekly digest error:', error);
    return { sent: 0, error: error.message };
  }
}

/**
 * Send 5-day reminders only
 */
async function send5DayReminders(subscriptions, force = false) {
  const fiveDayReminders = [];
  
  subscriptions.forEach(sub => {
    const days = sub.days;
    const subId = sub._subId || sub.id;
    
    // Check for licenses expiring within the next 5 days (0-5 days)
    if (days !== null && days !== undefined && days >= 0 && days <= 5 && (!wasReminderSentToday(subId, 'reminder5d') || force)) {
      fiveDayReminders.push({ ...sub, daysDisplay: days === 0 ? 'TODAY' : days.toString() });
    }
  });
  
  if (fiveDayReminders.length === 0) {
    return { sent: 0, checked: subscriptions.length, message: 'No licenses expiring within 5 days' };
  }
  
  try {
    const table = buildSubscriptionTable(fiveDayReminders);
    const totalSeats = fiveDayReminders.reduce((sum, s) => sum + s.seats, 0);
    const dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:3000';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 900px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 8px 8px 0 0; color: white;">
          <h1 style="margin: 0; font-size: 24px;">Licenses Expiring Within 5 Days</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Action Required</p>
        </div>
        
        <div style="background: #fafafa; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; margin-top: 0;">Hi Team,</p>
          <p>The following <strong>${fiveDayReminders.length} licenses</strong> will expire <strong>within the next 5 days</strong>. Please follow up with clients for renewal:</p>
          
          ${table}
          
          <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0;"><strong>Summary:</strong> ${fiveDayReminders.length} licenses, ${totalSeats} seats</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">View in Dashboard →</a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #666; margin: 0;">
            <strong>XOWN MS365 License Tracker</strong><br>
            Sent: ${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}
          </p>
        </div>
      </body>
      </html>
    `;
    
    const text = `5 Day Warning: ${fiveDayReminders.length} licenses expiring within 5 days\n\n${fiveDayReminders.map(s => `${s.client} - ${s.plan} (${s.seats} seats) - ${s.renewal} (${s.daysDisplay} days)`).join('\n')}`;
    
    await sendEmail(
      `[Action Required] ${fiveDayReminders.length} License${fiveDayReminders.length > 1 ? 's' : ''} Expiring Within 5 Days`,
      html,
      text
    );
    
    fiveDayReminders.forEach(sub => markReminderSent(sub._subId || sub.id, 'reminder5d'));
    
    return { sent: 1, checked: subscriptions.length, count: fiveDayReminders.length };
  } catch (error) {
    console.error('5-day reminder error:', error);
    throw error;
  }
}

/**
 * Send expiring today reminders only
 */
async function sendExpiringTodayReminders(subscriptions, force = false) {
  const expiringToday = [];
  
  subscriptions.forEach(sub => {
    const days = sub.days;
    const subId = sub._subId || sub.id;
    
    if (days !== null && days !== undefined && days === 0 && (!wasReminderSentToday(subId, 'expiringToday') || force)) {
      expiringToday.push({ ...sub, daysDisplay: 'TODAY' });
    }
  });
  
  if (expiringToday.length === 0) {
    return { sent: 0, checked: subscriptions.length, message: 'No licenses expiring today' };
  }
  
  try {
    const table = buildSubscriptionTable(expiringToday);
    const totalSeats = expiringToday.reduce((sum, s) => sum + s.seats, 0);
    const dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:3000';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 900px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 30px; border-radius: 8px 8px 0 0; color: white;">
          <h1 style="margin: 0; font-size: 24px;">URGENT: Licenses Expiring TODAY</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Immediate Action Required</p>
        </div>
        
        <div style="background: #fafafa; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; margin-top: 0;">Hi Team,</p>
          <p><strong style="color: #d32f2f;">URGENT:</strong> The following <strong>${expiringToday.length} licenses</strong> expire <strong>TODAY</strong>. Immediate action required:</p>
          
          ${table}
          
          <div style="background: #ffebee; border-left: 4px solid #f44336; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0;"><strong>Warning:</strong> These subscriptions will enter grace period at midnight.</p>
            <p style="margin: 10px 0 0 0;"><strong>Summary:</strong> ${expiringToday.length} licenses, ${totalSeats} seats</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}" style="display: inline-block; background: #f44336; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">View in Dashboard →</a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #666; margin: 0;">
            <strong>XOWN MS365 License Tracker</strong><br>
            Sent: ${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}
          </p>
        </div>
      </body>
      </html>
    `;
    
    const text = `URGENT - Expiring Today: ${expiringToday.length} licenses expire today\n\n${expiringToday.map(s => `${s.client} - ${s.plan} (${s.seats} seats) - ${s.renewal}`).join('\n')}`;
    
    await sendEmail(
      `[URGENT] ${expiringToday.length} License${expiringToday.length > 1 ? 's' : ''} Expiring TODAY`,
      html,
      text
    );
    
    expiringToday.forEach(sub => markReminderSent(sub._subId || sub.id, 'expiringToday'));
    
    return { sent: 1, checked: subscriptions.length, count: expiringToday.length };
  } catch (error) {
    console.error('Expiring today reminder error:', error);
    throw error;
  }
}

module.exports = {
  checkDailyReminders,
  checkWeeklyReminders,
  send5DayReminders,
  sendExpiringTodayReminders
};
