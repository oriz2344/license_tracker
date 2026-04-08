const cron = require('node-cron');
const { checkDailyReminders, checkWeeklyReminders } = require('./reminderLogic');

function startCronJobs(getSubscriptionsData) {
  // Daily reminders at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('⏰ Running daily reminder check...');
    try {
      const subscriptions = getSubscriptionsData();
      if (subscriptions.length === 0) {
        console.log('⚠️ No subscription data available for daily check');
        return;
      }
      
      const results = await checkDailyReminders(subscriptions);
      console.log(`✅ Daily check complete: ${results.sent} emails sent, ${results.skipped} skipped`);
      
      if (results.errors.length > 0) {
        console.error(`❌ Errors during daily check:`, results.errors);
      }
    } catch (error) {
      console.error('❌ Daily reminder job failed:', error);
    }
  }, {
    timezone: "Africa/Lagos" // Adjust to your timezone
  });

  // Weekly digest on Monday at 10:00 AM
  cron.schedule('0 10 * * 1', async () => {
    console.log('⏰ Running weekly digest...');
    try {
      const subscriptions = getSubscriptionsData();
      if (subscriptions.length === 0) {
        console.log('⚠️ No subscription data available for weekly digest');
        return;
      }
      
      const results = await checkWeeklyReminders(subscriptions);
      console.log(`✅ Weekly digest complete: ${results.sent ? 'Email sent' : 'No actionable items'}`);
    } catch (error) {
      console.error('❌ Weekly digest job failed:', error);
    }
  }, {
    timezone: "Africa/Lagos" // Adjust to your timezone
  });

  console.log('⏰ Cron jobs scheduled:');
  console.log('   - Daily reminders: 9:00 AM every day');
  console.log('   - Weekly digest: 10:00 AM every Monday');
}

module.exports = { startCronJobs };
