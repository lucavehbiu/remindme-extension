// Create context menu items
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'remindMe',
    title: 'Remind me about this',
    contexts: ['selection', 'image']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
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
  const reminderData = JSON.parse(alarm.name);

  // Show notification
  chrome.notifications.create({
    type: 'basic',
    iconUrl: '/icons/hello_extensions.png',
    title: 'Reminder',
    message: reminderData.type === 'image' ?
      'Click to view your saved image' :
      `"${reminderData.content.substring(0, 100)}${reminderData.content.length > 100 ? '...' : ''}"`,
    priority: 2
  });

  // Send email using Resend (if configured)
  if (reminderData.email) {
    try {
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
    } catch (error) {
      console.error('Failed to send email:', error);
    }
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateContextMenu') {
    chrome.storage.local.set({ currentSelection: request.data });
  }
});