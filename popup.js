document.addEventListener('DOMContentLoaded', async () => {
  const newReminderView = document.getElementById('new-reminder-view');
  const remindersListView = document.getElementById('reminders-list-view');
  const remindersList = document.getElementById('reminders-list');
  const emptyState = document.getElementById('empty-state');
  const customTime = document.getElementById('custom-time');
  const setToNowButton = document.getElementById('set-to-now');
  const cancelButton = document.getElementById('cancel-reminder');
  const reminderCount = document.getElementById('reminder-count');

  // Function to set custom time
  function setCustomTime(minutes) {
    const date = new Date();
    date.setMinutes(date.getMinutes() + minutes);
    fp.setDate(date);
  }

  // Function to clear pending reminder and show list view
  const cancelReminder = async () => {
    await chrome.storage.local.remove('pendingReminder');
    newReminderView.classList.add('hidden');
    remindersListView.classList.remove('hidden');
    loadReminders(); // Refresh the list
  };

  // Handle cancel button click
  cancelButton.addEventListener('click', cancelReminder);

  // Initialize Flatpickr
  const fp = flatpickr(customTime, {
    enableTime: true,
    dateFormat: "Y-m-d H:i",
    minDate: "today",
    defaultHour: new Date().getHours(),
    defaultMinute: new Date().getMinutes() + 1,
    animate: true,
    time_24hr: false,
    position: "right",
    static: true,
    monthSelectorType: "static",
    showMonths: 1,
    disableMobile: true,
    confirmDate: {
      enable: true,
      showAlways: true
    },
    onClose: function(selectedDates, dateStr) {
      if (selectedDates.length > 0) {
        const selected = selectedDates[0];
        const now = new Date();
        if (selected.getHours() === now.getHours() &&
            selected.getMinutes() === now.getMinutes()) {
          selected.setHours(now.getHours() + 1);
          selected.setMinutes(0);
          fp.setDate(selected);
        }
      }
    }
  });


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

    // Set to now by default
    setCustomTime(1);

    // Handle Set to Now button
    setToNowButton.addEventListener('click', () => {
      setCustomTime(1);
    });

    // Handle quick reminder buttons
    document.querySelectorAll('.quick-reminder').forEach(button => {
      button.addEventListener('click', () => {
        const minutes = parseInt(button.dataset.minutes);
        setCustomTime(minutes);
      });
    });

    // Handle custom time reminder
    document.getElementById('set-reminder').addEventListener('click', () => {
      const selectedDate = fp.selectedDates[0];
      if (!selectedDate) {
        alert('Please select a date and time');
        return;
      }

      const now = new Date();
      if (selectedDate <= now) {
        alert('Please select a future time for the reminder');
        return;
      }

      console.log('Setting reminder for:', selectedDate.toLocaleString());
      createReminder(selectedDate);
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
  console.log('Creating reminder for:', reminderTime.toLocaleString());
  const { pendingReminder } = await chrome.storage.local.get('pendingReminder');
  const description = document.getElementById('reminder-description').value.trim();

  if (!pendingReminder) {
    alert('No content selected for reminder');
    return;
  }

  // Create alarm with reminder data
  const alarmData = {
    type: pendingReminder.type,
    content: pendingReminder.content,
    pageUrl: pendingReminder.pageUrl,
    description: description || null, // Include description if provided
    timestamp: Date.now(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
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

    // Show success message by updating the UI
    const container = document.querySelector('.max-w-md');
    container.innerHTML = `
      <div class="text-center py-8 space-y-4">
        <div class="text-green-500 mb-4">
          <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-gray-800">Reminder Set!</h2>
        <p class="text-gray-600">You'll receive a browser notification on:</p>
        <p class="text-gray-800 font-medium">${reminderTime.toLocaleString(undefined, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short'
        })}</p>
        ${description ? `<p class="text-gray-600 text-sm mt-2">Note: ${description}</p>` : ''}
      </div>
    `;

    // Clear pending reminder
    await chrome.storage.local.remove('pendingReminder');

    // Close popup after 3 seconds
    setTimeout(() => window.close(), 3000);
  } catch (error) {
    console.error('Error creating reminder:', error);
    alert('Failed to set reminder. Please try again.');
  }
}

async function loadReminders() {
  const { reminderHistory = [] } = await chrome.storage.local.get('reminderHistory');
  const remindersList = document.getElementById('reminders-list');
  const emptyState = document.getElementById('empty-state');
  const reminderCount = document.getElementById('reminder-count');

  if (reminderHistory.length === 0) {
    remindersList.innerHTML = '';
    emptyState.classList.remove('hidden');
    reminderCount.textContent = '';
    return;
  }

  emptyState.classList.add('hidden');
  reminderCount.textContent = `${reminderHistory.length} reminder${reminderHistory.length === 1 ? '' : 's'}`;

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