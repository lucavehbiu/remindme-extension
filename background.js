// Create context menu items
chrome.runtime.onInstalled.addListener(() => {
  // Create context menu
  chrome.contextMenus.create({
    id: 'remindMe',
    title: 'Remind me about this',
    contexts: ['selection', 'image', 'link']
  });

  // Request notification permission
  chrome.notifications.getPermissionLevel((level) => {
    console.log('Notification permission level:', level);
  });

  console.log('Extension installed, context menu created');
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log('Context menu clicked:', info);

  let content, type, url;

  if (info.mediaType === 'image') {
    type = 'image';
    content = info.srcUrl;
    url = info.pageUrl;
  } else if (info.linkUrl) {
    // This is a link click
    type = 'link';
    content = info.selectionText || info.linkText || new URL(info.linkUrl).pathname;
    url = info.linkUrl; // Use the actual clicked link URL
  } else {
    // This is a text selection
    type = 'text';
    content = info.selectionText;
    url = info.pageUrl;
  }

  console.log('Creating reminder with:', { type, content, url });

  chrome.storage.local.set({
    pendingReminder: {
      type: type,
      content: content,
      pageUrl: url, // Use our determined URL
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
    const notificationId = `reminder_${Date.now()}`;
    const notificationOptions = {
      type: 'basic',
      iconUrl: 'icons/icon.webp',
      title: 'Web Reminder',
      message: reminderData.type === 'image' ?
        'Click to view your saved image' :
        reminderData.type === 'link' ?
        `${reminderData.content} (${new URL(reminderData.pageUrl).hostname})` :
        `"${reminderData.content.substring(0, 100)}${reminderData.content.length > 100 ? '...' : ''}"`,
      priority: 2,
      requireInteraction: true,
      buttons: [
        { title: reminderData.type === 'link' ? '🔗 Open Link' : '👁 View Content' },
        { title: '❌ Dismiss' }
      ],
      silent: false
    };

    // Create notification with retry
    const createNotificationWithRetry = async (retries = 3) => {
      try {
        await new Promise((resolve, reject) => {
          chrome.notifications.create(notificationId, notificationOptions, (notificationId) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(notificationId);
            }
          });
        });
        console.log('Notification created successfully');
      } catch (error) {
        console.error('Error creating notification:', error);
        if (retries > 0) {
          console.log(`Retrying... (${retries} attempts left)`);
          setTimeout(() => createNotificationWithRetry(retries - 1), 1000);
        }
      }
    };

    await createNotificationWithRetry();

    // Send email using Resend (if configured)
    if (reminderData.email) {
      try {
        console.log('Sending email to:', reminderData.email);
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer re_Se7TVdSp_2fMCw9eRaKBsbmqQzUPohfXh',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            from: 'onboarding@resend.dev',
            to: reminderData.email,
            subject: 'Your Web Reminder is Here!',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #1a202c; margin-bottom: 20px;">Here's your reminder!</h2>
                <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                  ${reminderData.type === 'image' ?
                    `<img src="${reminderData.content}" style="max-width: 100%; border-radius: 4px;" />` :
                    `<p style="color: #1a202c; font-size: 16px; line-height: 1.6;">
                      ${reminderData.content}
                      ${reminderData.type === 'link' ?
                        `<br><span style="color: #718096; font-size: 14px;">
                          ${new URL(reminderData.pageUrl).hostname}
                        </span>` :
                        ''}
                    </p>`
                  }
                </div>
                <p style="margin-top: 20px;">
                  <a href="${reminderData.pageUrl}"
                     style="background: linear-gradient(to right, #2563eb, #4f46e5);
                            color: white;
                            text-decoration: none;
                            padding: 10px 20px;
                            border-radius: 6px;
                            display: inline-block;">
                    ${reminderData.type === 'link' ? '🔗 Open Link' : '👁 View Original Page'}
                  </a>
                </p>
                <p style="color: #718096; font-size: 12px; margin-top: 30px;">
                  Sent from your Remind Me Chrome Extension
                </p>
              </div>
            `
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`Email API responded with status: ${response.status}. Details: ${JSON.stringify(errorData)}`);
        }

        const result = await response.json();
        console.log('Email sent successfully:', result);
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

// Handle notification clicks
chrome.notifications.onClicked.addListener((notificationId) => {
  console.log('Notification clicked:', notificationId);
  if (notificationId.startsWith('reminder_')) {
    chrome.storage.local.get(['reminderHistory'], (result) => {
      const reminderId = notificationId.split('_')[1];
      const reminder = result.reminderHistory.find(r => r.timestamp.toString() === reminderId);

      if (reminder) {
        chrome.tabs.create({ url: reminder.pageUrl });
      }
    });
    chrome.notifications.clear(notificationId);
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request);
  if (request.action === 'updateContextMenu') {
    chrome.storage.local.set({ currentSelection: request.data });
  }
});