document.addEventListener('DOMContentLoaded', async () => {
  const newReminderView = document.getElementById('new-reminder-view');
  const remindersListView = document.getElementById('reminders-list-view');
  const remindersList = document.getElementById('reminders-list');
  const emptyState = document.getElementById('empty-state');
  const customTime = document.getElementById('custom-time');
  const setToNowButton = document.getElementById('set-to-now');
  const emailInput = document.getElementById('email');

  // Load last used email
  const { lastUsedEmail, savedEmails = [] } = await chrome.storage.local.get(['lastUsedEmail', 'savedEmails']);
  if (lastUsedEmail) {
    emailInput.value = lastUsedEmail;
  }

  // Set up email autocomplete
  emailInput.setAttribute('list', 'email-suggestions');
  const datalist = document.createElement('datalist');
  datalist.id = 'email-suggestions';
  savedEmails.forEach(email => {
    const option = document.createElement('option');
    option.value = email;
    datalist.appendChild(option);
  });
  emailInput.parentNode.appendChild(datalist);

  // Save email when it changes
  emailInput.addEventListener('change', async () => {
    const email = emailInput.value.trim();
    if (email && email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      await chrome.storage.local.set({ lastUsedEmail: email });

      // Add to saved emails if not already present
      if (!savedEmails.includes(email)) {
        savedEmails.push(email);
        await chrome.storage.local.set({
          savedEmails: savedEmails.slice(-5) // Keep last 5 emails
        });
      }
    }
  });

  // Function to format date for datetime-local input
  const formatDateForInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Function to set the datetime input to current time
  const setToNow = () => {
    const now = new Date();
    // Add 1 minute to give user time to set the reminder
    now.setMinutes(now.getMinutes() + 1);
    customTime.value = formatDateForInput(now);
  };

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
    customTime.min = formatDateForInput(now);
    setToNow();

    // Handle Set to Now button
    setToNowButton.addEventListener('click', setToNow);

    // Handle quick reminder buttons
    document.querySelectorAll('.quick-reminder').forEach(button => {
      button.addEventListener('click', () => {
        const minutes = parseInt(button.dataset.minutes);
        const futureDate = new Date();
        futureDate.setMinutes(futureDate.getMinutes() + minutes);

        // Update the custom time field with local timezone
        customTime.value = formatDateForInput(futureDate);

        // Scroll the custom time field into view
        customTime.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        // Add a subtle highlight effect
        customTime.classList.add('ring-2', 'ring-blue-500/20');
        setTimeout(() => {
          customTime.classList.remove('ring-2', 'ring-blue-500/20');
        }, 1000);
      });
    });

    // Handle custom time reminder
    document.getElementById('set-reminder').addEventListener('click', () => {
      const selectedTime = new Date(customTime.value);
      const now = new Date();

      if (selectedTime <= now) {
        alert('Please select a future time for the reminder');
        return;
      }

      // Validate email field
      const email = document.getElementById('email').value.trim();
      if (!email) {
        alert('Please enter an email address to receive the reminder');
        return;
      }
      if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        alert('Please enter a valid email address');
        return;
      }

      console.log('Setting reminder for:', selectedTime.toLocaleString());
      createReminder(selectedTime);
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
  const email = document.getElementById('email').value.trim();
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
    email: email || null,
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
        <p class="text-gray-600">You'll receive an email reminder on:</p>
        <p class="text-gray-800 font-medium">${reminderTime.toLocaleString(undefined, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short'
        })}</p>
        <p class="text-gray-500 text-sm">at ${email}</p>
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