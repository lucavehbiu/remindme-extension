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

        // Build email HTML - professional design to avoid spam filters
        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Your Reminder</title>
          </head>
          <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f3f4f6;">
              <tr>
                <td style="padding: 40px 20px;">
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

                    <!-- Header -->
                    <tr>
                      <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #e5e7eb;">
                        <div style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 12px; border-radius: 12px; margin-bottom: 16px;">
                          <div style="font-size: 24px;">⏰</div>
                        </div>
                        <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #111827;">Reminder Notification</h1>
                        <p style="margin: 8px 0 0; font-size: 14px; color: #6b7280;">You asked to be reminded about this</p>
                      </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                      <td style="padding: 32px;">
                        ${reminderData.description ? `
                          <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
                            <p style="margin: 0; font-size: 14px; font-weight: 600; color: #1e40af; margin-bottom: 4px;">Your Note:</p>
                            <p style="margin: 0; font-size: 14px; color: #1e3a8a; line-height: 1.6;">${reminderData.description}</p>
                          </div>
                        ` : ''}

                        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px;">
                          ${reminderData.type === 'image' ?
                            `<img src="${reminderData.content}" alt="Reminder image" style="max-width: 100%; height: auto; border-radius: 6px; display: block;" />` :
                            `<p style="margin: 0; font-size: 15px; line-height: 1.7; color: #374151; white-space: pre-wrap;">${reminderData.content}</p>`
                          }

                          ${reminderData.type === 'link' || reminderData.pageUrl ?
                            `<div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
                              <p style="margin: 0 0 8px; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Source</p>
                              <p style="margin: 0; font-size: 14px; color: #4b5563;">${new URL(reminderData.pageUrl).hostname}</p>
                            </div>` :
                            ''}
                        </div>

                        <!-- CTA Button -->
                        <div style="text-align: center; margin-top: 32px;">
                          <a href="${reminderData.pageUrl}"
                             style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
                                    color: #ffffff; text-decoration: none; padding: 14px 32px;
                                    border-radius: 8px; font-weight: 600; font-size: 15px;">
                            ${reminderData.type === 'link' ? 'Open Link' : 'View Original Page'}
                          </a>
                        </div>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="padding: 24px 32px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 12px 12px;">
                        <p style="margin: 0; font-size: 12px; color: #6b7280; text-align: center; line-height: 1.6;">
                          This reminder was sent by your <strong>Remind Me</strong> browser extension.<br>
                          You scheduled this notification to help you remember important web content.
                        </p>
                      </td>
                    </tr>
                  </table>

                  <!-- Bottom text -->
                  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 20px auto 0;">
                    <tr>
                      <td style="text-align: center; padding: 0 20px;">
                        <p style="margin: 0; font-size: 12px; color: #9ca3af; line-height: 1.6;">
                          To stop receiving email reminders, simply don't enter your email when creating reminders in the extension.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `;

        // Build plain text version (important for spam filters)
        const emailText = `
REMINDER NOTIFICATION

${reminderData.description ? `Your Note: ${reminderData.description}\n\n` : ''}

${reminderData.type === 'image' ? '[Image Reminder]' : reminderData.content}

${reminderData.pageUrl ? `\nSource: ${new URL(reminderData.pageUrl).hostname}` : ''}

View the original: ${reminderData.pageUrl}

---
This reminder was sent by your Remind Me browser extension.
You scheduled this notification to help you remember important web content.
        `.trim();

        // Send via Make.com webhook (API key secured server-side)
        const response = await fetch('https://hook.eu2.make.com/bxaz7jukh2q45r02ttilkf23eel1ppfo', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: reminderData.email,
            subject: 'Reminder: Your scheduled notification',
            html: emailHtml,
            text: emailText
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