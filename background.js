// Create context menu items
chrome.runtime.onInstalled.addListener(() => {
  // Create context menu
  chrome.contextMenus.create({
    id: 'remindMe',
    title: 'Remind me about this',
    contexts: ['selection', 'image']
  });

  console.log('Extension installed, context menu created');
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log('Context menu clicked:', info);
  chrome.storage.local.set({
    pendingReminder: {
      type: info.mediaType === 'image' ? 'image' : 'text',
      content: info.mediaType === 'image' ? info.srcUrl : info.selectionText,
      pageUrl: info.pageUrl,
      timestamp: Date.now()
    }
  });

  // Open popup for time selection
  chrome.windows.create({
    url: 'popup.html',
    type: 'popup',
    width: 400,
    height: 600
  });
});

// Handle alarm triggers
chrome.alarms.onAlarm.addListener(async (alarm) => {
  console.log('Alarm triggered:', alarm);

  try {
    let reminderData;
    if (alarm.name === 'test_reminder') {
      // Get the stored reminder data
      const result = await chrome.storage.local.get('test_reminder_data');
      reminderData = result.test_reminder_data;
      console.log('Retrieved test reminder data:', reminderData);
    } else {
      reminderData = JSON.parse(alarm.name);
    }

    if (!reminderData) {
      console.error('No reminder data found');
      return;
    }

    console.log('Processing reminder data:', reminderData);

    // Show notification
    chrome.notifications.create(`reminder_${Date.now()}`, {
      type: 'basic',
      iconUrl: 'icons/icon.webp',
      title: 'Reminder',
      message: reminderData.type === 'image' ?
        'Click to view your saved image' :
        `"${reminderData.content.substring(0, 100)}${reminderData.content.length > 100 ? '...' : ''}"`,
      priority: 2,
      buttons: [
        { title: 'View Content' },
        { title: 'Dismiss' }
      ]
    });

    // Send email using Resend (if configured)
    if (reminderData.email) {
      try {
        console.log('Sending email to:', reminderData.email);
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'reminders@yourdomain.com',
            to: reminderData.email,
            subject: 'Your Web Reminder',
            html: `
              <h2>Here's your reminder</h2>
              <p>From page: <a href="${reminderData.pageUrl}">${reminderData.pageUrl}</a></p>
              ${reminderData.type === 'image' ?
                `<img src="${reminderData.content}" style="max-width: 100%;" />` :
                `<p>${reminderData.content}</p>`
              }
            `
          })
        });
        console.log('Email sent:', response.ok);
      } catch (error) {
        console.error('Failed to send email:', error);
      }
    }

    // Clean up
    await chrome.storage.local.remove('test_reminder_data');
  } catch (error) {
    console.error('Error handling alarm:', error);
  }
});

// Handle notification button clicks
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  console.log('Notification button clicked:', notificationId, buttonIndex);
  if (notificationId.startsWith('reminder_')) {
    chrome.storage.local.get(['reminderHistory'], (result) => {
      const reminderId = notificationId.split('_')[1];
      const reminder = result.reminderHistory.find(r => r.timestamp.toString() === reminderId);

      if (reminder && buttonIndex === 0) { // View Content button
        chrome.tabs.create({ url: reminder.pageUrl });
      }
    });
  }
  // Close the notification
  chrome.notifications.clear(notificationId);
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request);
  if (request.action === 'updateContextMenu') {
    chrome.storage.local.set({ currentSelection: request.data });
  }
});