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

// Handle alarm triggers
chrome.alarms.onAlarm.addListener(async (alarm) => {
  console.log('Alarm triggered:', alarm);

  try {
    let reminderData;
    if (alarm.name === 'test_reminder') {
      // Get the stored reminder data
      const result = await chrome.storage.local.get('test_reminder_data');
      reminderData = result.test_reminder_data;
      console.log('Retrieved reminder data:', reminderData);
    } else {
      reminderData = JSON.parse(alarm.name);
    }

    if (!reminderData) {
      console.error('No reminder data found');
      return;
    }

    console.log('Processing reminder data:', reminderData);

    // Send email using Resend
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

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request);
  if (request.action === 'updateContextMenu') {
    chrome.storage.local.set({ currentSelection: request.data });
  }
});