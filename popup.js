document.addEventListener('DOMContentLoaded', async () => {
  const newReminderView = document.getElementById('new-reminder-view');
  const remindersListView = document.getElementById('reminders-list-view');
  const remindersList = document.getElementById('reminders-list');
  const emptyState = document.getElementById('empty-state');

  // Check if we're setting a new reminder or viewing the list
  const { pendingReminder } = await chrome.storage.local.get('pendingReminder');

  if (pendingReminder) {
    // Show new reminder view
    newReminderView.classList.remove('hidden');
    remindersListView.classList.add('hidden');

    // Show preview
    const previewText = document.getElementById('preview-text');
    const previewImage = document.getElementById('preview-image');

    if (pendingReminder.type === 'image') {
      previewText.textContent = 'Selected Image:';
      previewImage.src = pendingReminder.content;
      previewImage.classList.remove('hidden');
    } else {
      previewText.textContent = `"${pendingReminder.content.substring(0, 150)}${pendingReminder.content.length > 150 ? '...' : ''}"`;
      previewImage.classList.add('hidden');
    }

    // Set minimum datetime-local to now
    const now = new Date();
    // FOR TESTING: Set default to 10 seconds from now
    now.setSeconds(now.getSeconds() + 10);
    const customTime = document.getElementById('custom-time');
    customTime.min = now.toISOString().slice(0, 16);
    customTime.value = now.toISOString().slice(0, 16);

    // Handle quick reminder buttons
    document.querySelectorAll('.quick-reminder').forEach(button => {
      button.addEventListener('click', () => {
        // FOR TESTING: All quick reminders set to 10 seconds
        const reminderTime = new Date(Date.now() + 10000);
        console.log('Setting reminder for:', reminderTime.toLocaleString());
        createReminder(reminderTime);
      });
    });

    // Handle custom time reminder
    document.getElementById('set-reminder').addEventListener('click', () => {
      // FOR TESTING: Set to 10 seconds from now
      const reminderTime = new Date(Date.now() + 10000);
      console.log('Setting reminder for:', reminderTime.toLocaleString());
      createReminder(reminderTime);
    });
  } else {
    // Show reminders list view
    newReminderView.classList.add('hidden');
    remindersListView.classList.remove('hidden');

    // Load and display reminders
    await loadReminders();

    // Handle clear all button
    document.getElementById('clear-all').addEventListener('click', async () => {
      if (confirm('Are you sure you want to clear all reminders?')) {
        await chrome.storage.local.set({ reminderHistory: [] });
        await loadReminders();
      }
    });
  }
});

async function createReminder(reminderTime) {
  console.log('Creating reminder for time:', reminderTime);
  const { pendingReminder } = await chrome.storage.local.get('pendingReminder');
  const email = document.getElementById('email').value.trim();

  if (!pendingReminder) {
    alert('No content selected for reminder');
    return;
  }

  // Create alarm with reminder data
  const alarmData = {
    type: pendingReminder.type,
    content: pendingReminder.content,
    pageUrl: pendingReminder.pageUrl,
    timestamp: Date.now(),
    email: email || null
  };

  try {
    console.log('Creating alarm with data:', alarmData);
    // Store the alarm data first
    await chrome.storage.local.set({
      'test_reminder_data': alarmData
    });

    // Create the alarm
    await chrome.alarms.create('test_reminder', {
      when: reminderTime.getTime()
    });

    // Store in history
    const { reminderHistory = [] } = await chrome.storage.local.get('reminderHistory');
    reminderHistory.push({
      ...alarmData,
      scheduledFor: reminderTime.getTime()
    });
    await chrome.storage.local.set({
      reminderHistory: reminderHistory.slice(-100) // Keep last 100 reminders
    });

    // Show success notification
    chrome.notifications.create('reminder_set', {
      type: 'basic',
      iconUrl: 'icons/icon.webp',
      title: 'Reminder Set',
      message: `Reminder will trigger in 10 seconds (${reminderTime.toLocaleString()})`,
      priority: 2
    });

    // Clear pending reminder
    await chrome.storage.local.remove('pendingReminder');

    // Close popup after 2 seconds to show the success message
    setTimeout(() => window.close(), 2000);
  } catch (error) {
    console.error('Error creating reminder:', error);
    alert('Failed to set reminder. Please try again.');
  }
}

async function loadReminders() {
  const { reminderHistory = [] } = await chrome.storage.local.get('reminderHistory');
  const remindersList = document.getElementById('reminders-list');
  const emptyState = document.getElementById('empty-state');

  if (reminderHistory.length === 0) {
    remindersList.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  remindersList.innerHTML = reminderHistory
    .sort((a, b) => b.scheduledFor - a.scheduledFor)
    .map(reminder => `
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 transition-all duration-200 hover:shadow-md">
        <div class="flex items-start justify-between">
          <div class="space-y-1">
            <p class="text-sm text-gray-900">
              ${reminder.type === 'image' ?
                '<span class="text-blue-600">Image reminder</span>' :
                `"${reminder.content.substring(0, 100)}${reminder.content.length > 100 ? '...' : ''}"` }
            </p>
            <p class="text-xs text-gray-500">
              Scheduled for: ${new Date(reminder.scheduledFor).toLocaleString()}
            </p>
            ${reminder.email ?
              `<p class="text-xs text-gray-400">Email notification: ${reminder.email}</p>` :
              ''}
          </div>
          <a href="${reminder.pageUrl}" target="_blank"
            class="text-blue-600 hover:text-blue-700">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
            </svg>
          </a>
        </div>
      </div>
    `).join('');
}