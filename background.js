// Create context menu when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'remindMe',
    title: 'Remind me about "%s"',
    contexts: ['selection']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'remindMe') {
    // Store the selected text temporarily
    chrome.storage.local.set({
      'tempSelectedText': info.selectionText,
      'tempSourceUrl': tab.url
    }, () => {
      // Open the popup
      chrome.windows.create({
        url: 'popup.html',
        type: 'popup',
        width: 400,
        height: 600,
        left: info.x,
        top: info.y
      });
    });
  }
});

// Handle alarm creation
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'createAlarm') {
    createAlarm(request.reminder);
  }
});

// Create alarm for reminder
function createAlarm(reminder) {
  const alarmName = `reminder_${reminder.created}`;
  chrome.alarms.create(alarmName, {
    when: reminder.time
  });
}

// Handle alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name.startsWith('reminder_')) {
    const reminderId = parseInt(alarm.name.split('_')[1]);

    chrome.storage.local.get(['reminders'], (result) => {
      const reminder = result.reminders.find(r => r.created === reminderId);
      if (reminder) {
        // Show browser notification
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: 'Reminder',
          message: reminder.content,
          contextMessage: reminder.note || '',
          buttons: [
            { title: 'View Original Page' }
          ]
        });

        // Send email if configured
        if (reminder.email) {
          sendEmailNotification(reminder);
        }

        // Remove completed reminder
        const updatedReminders = result.reminders.filter(r => r.created !== reminderId);
        chrome.storage.local.set({ reminders: updatedReminders });
      }
    });
  }
});

// Send email notification
async function sendEmailNotification(reminder) {
  try {
    // Replace YOUR_VERCEL_URL with the URL you get after deploying to Vercel
    const response = await fetch('YOUR_VERCEL_URL/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: reminder.email,
        content: reminder.content,
        note: reminder.note,
        url: reminder.url
      })
    });

    if (!response.ok) {
      console.error('Failed to send email notification');
    }
  } catch (error) {
    console.error('Error sending email notification:', error);
  }
}

// Handle notification button clicks
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (buttonIndex === 0) { // "View Original Page" button
    chrome.storage.local.get(['reminders'], (result) => {
      const reminder = result.reminders.find(r => r.created === parseInt(notificationId));
      if (reminder) {
        chrome.tabs.create({ url: reminder.url });
      }
    });
  }
});