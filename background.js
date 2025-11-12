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

    // Create browser notification
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

    // Clean up
    await chrome.storage.local.remove('test_reminder_data');
  } catch (error) {
    console.error('Error handling alarm:', error);
  }
});

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