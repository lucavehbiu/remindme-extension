// Create context menu items
chrome.runtime.onInstalled.addListener(() => {
  // Create context menu
  chrome.contextMenus.create({
    id: 'remindMe',
    title: 'Remind me about this',
    contexts: ['selection', 'image', 'link']
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

  // Clear any existing pending reminder first
  chrome.storage.local.remove('pendingReminder', () => {
    // Then set the new pending reminder
    chrome.storage.local.set({
      pendingReminder: {
        type: type,
        content: content,
        pageUrl: url,
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
});

// Handle alarm triggers
chrome.alarms.onAlarm.addListener(async (alarm) => {
  console.log('Alarm triggered:', alarm);

  try {
    // Get reminder data using UUID
    const reminderId = alarm.name;
    const storageKey = `reminder_${reminderId}`;
    const result = await chrome.storage.local.get(storageKey);
    const reminderData = result[storageKey];

    // Fallback for old test_reminder format
    if (!reminderData && alarm.name === 'test_reminder') {
      const oldResult = await chrome.storage.local.get('test_reminder_data');
      const oldData = oldResult.test_reminder_data;
      if (oldData) {
        console.log('Using legacy reminder format');
        await handleReminderNotification(oldData);
        await chrome.storage.local.remove('test_reminder_data');
        return;
      }
    }

    if (!reminderData) {
      console.error('No reminder data found for:', reminderId);
      return;
    }

    console.log('Processing reminder data:', reminderData);
    await handleReminderNotification(reminderData);

    // Clean up
    await chrome.storage.local.remove(storageKey);
  } catch (error) {
    console.error('Error handling alarm:', error);
  }
});

// Handle reminder notification (browser + optional email)
async function handleReminderNotification(reminderData) {
  // Always create browser notification
  const notificationOptions = {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'Reminder: Time to check this out!',
    message: reminderData.type === 'image'
      ? 'Your saved image reminder'
      : reminderData.content.substring(0, 150) + (reminderData.content.length > 150 ? '...' : ''),
    priority: 2,
    requireInteraction: true,
    buttons: [
      { title: 'Open' },
      { title: 'Dismiss' }
    ]
  };

  // Add description if present
  if (reminderData.description) {
    notificationOptions.message = `${reminderData.description}\n\n${notificationOptions.message}`;
  }

  // Create notification and store URL for click handling
  chrome.notifications.create(reminderData.pageUrl, notificationOptions);

    // Send email if user opted in
    if (reminderData.email) {
      try {
        console.log('Sending email to:', reminderData.email);

        // Build email HTML
        const emailHtml = `
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
              ${reminderData.description ? `
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
                  <p style="color: #4a5568; font-size: 14px; margin: 0;">
                    <strong>Your note:</strong><br>
                    ${reminderData.description}
                  </p>
                </div>
              ` : ''}
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
        `;

        // Send via Make.com webhook (API key secured server-side)
        const response = await fetch('https://hook.eu2.make.com/bxaz7jukh2q45r02ttilkf23eel1ppfo', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: reminderData.email,
            subject: 'Your Web Reminder is Here!',
            html: emailHtml
          })
        });

        if (!response.ok) {
          throw new Error(`Email webhook responded with status: ${response.status}`);
        }

        console.log('Email sent successfully via Make.com');
      } catch (error) {
        console.error('Failed to send email:', error);
      }
    }
}

// Handle notification clicks
chrome.notifications.onClicked.addListener((notificationId) => {
  // notificationId is the pageUrl we stored
  chrome.tabs.create({ url: notificationId });
  chrome.notifications.clear(notificationId);
});

// Handle notification button clicks
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (buttonIndex === 0) {
    // Open button clicked
    chrome.tabs.create({ url: notificationId });
  }
  chrome.notifications.clear(notificationId);
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request);
  if (request.action === 'updateContextMenu') {
    chrome.storage.local.set({ currentSelection: request.data });
  }
});