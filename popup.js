document.addEventListener('DOMContentLoaded', () => {
  const createReminderBtn = document.getElementById('createReminder');
  const reminderForm = document.getElementById('reminderForm');
  const cancelReminderBtn = document.getElementById('cancelReminder');
  const saveReminderBtn = document.getElementById('saveReminder');
  const remindersList = document.getElementById('remindersList');
  const selectedContentDiv = document.getElementById('selectedContent');

  // Initialize with default values
  document.getElementById('reminderTime').value = 30; // Default 30 minutes
  document.getElementById('timeUnit').value = 'minutes';

  // Check for text selected via context menu
  chrome.storage.local.get(['tempSelectedText', 'tempSourceUrl'], (result) => {
    if (result.tempSelectedText) {
      selectedContentDiv.textContent = result.tempSelectedText;
      document.getElementById('reminderTime').focus();
      reminderForm.classList.remove('hidden');
      // Clear the temporary storage
      chrome.storage.local.remove(['tempSelectedText', 'tempSourceUrl']);
    } else {
      // If no context menu selection, get the current selected content from the active tab
      chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
        if (tabs[0]) {
          try {
            const response = await chrome.tabs.sendMessage(tabs[0].id, {action: "getSelectedText"});
            if (response && response.selectedText) {
              selectedContentDiv.textContent = response.selectedText;
            }
          } catch (error) {
            console.log('No content script available on this page');
          }
        }
      });
    }
  });

  // Add input validation for reminder time
  document.getElementById('reminderTime').addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    if (value < 1) {
      e.target.value = 1;
    } else if (value > 999) {
      e.target.value = 999;
    }
  });

  createReminderBtn.addEventListener('click', () => {
    reminderForm.classList.remove('hidden');
    document.getElementById('reminderTime').focus();
  });

  cancelReminderBtn.addEventListener('click', () => {
    reminderForm.classList.add('hidden');
    selectedContentDiv.textContent = '';
    document.getElementById('note').value = '';
    if (window.opener) {
      window.close();
    }
  });

  saveReminderBtn.addEventListener('click', async () => {
    const selectedContent = selectedContentDiv.textContent;
    const reminderTime = document.getElementById('reminderTime').value;
    const timeUnit = document.getElementById('timeUnit').value;
    const note = document.getElementById('note').value;

    if (!selectedContent) {
      showError('Please select some text to be reminded about');
      return;
    }
    if (!reminderTime || reminderTime < 1) {
      showError('Please enter a valid reminder time');
      return;
    }

    const reminder = {
      content: selectedContent,
      time: calculateReminderTime(reminderTime, timeUnit),
      note: note,
      url: (await chrome.tabs.query({active: true, currentWindow: true}))[0]?.url || '',
      created: Date.now(),
      status: 'pending'
    };

    try {
      // Save reminder
      chrome.storage.local.get(['reminders'], (result) => {
        const reminders = result.reminders || [];
        reminders.push(reminder);
        chrome.storage.local.set({ reminders }, () => {
          createReminderElement(reminder);
          reminderForm.classList.add('hidden');
          selectedContentDiv.textContent = '';
          document.getElementById('note').value = '';
          showSuccess('Reminder set successfully!');

          // Create alarm
          chrome.runtime.sendMessage({
            action: 'createAlarm',
            reminder: reminder
          });

          if (window.opener) {
            setTimeout(() => window.close(), 1500); // Give time to see success message
          }
        });
      });
    } catch (error) {
      showError('Failed to save reminder. Please try again.');
    }
  });

  // Load existing reminders
  loadReminders();
});

function calculateReminderTime(value, unit) {
  const now = Date.now();
  const multiplier = {
    minutes: 60 * 1000,
    hours: 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000
  };
  return now + (parseInt(value) * multiplier[unit]);
}

function createReminderElement(reminder) {
  const div = document.createElement('div');
  div.className = 'bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow duration-200';

  const timeLeft = getTimeLeft(reminder.time);
  const isOverdue = reminder.time < Date.now();

  div.innerHTML = `
    <div class="flex justify-between items-start">
      <div class="flex-1">
        <p class="text-sm text-gray-900 font-medium line-clamp-2">${reminder.content}</p>
        <p class="text-xs ${isOverdue ? 'text-red-500' : 'text-gray-500'} mt-1">
          ${timeLeft}
        </p>
        ${reminder.note ? `<p class="text-xs text-gray-600 mt-1 line-clamp-1">${reminder.note}</p>` : ''}
        <p class="text-xs text-gray-400 mt-1">
          ${new Date(reminder.time).toLocaleString()}
        </p>
      </div>
      <div class="flex flex-col space-y-2">
        <button class="delete-reminder text-gray-400 hover:text-red-500 transition-colors"
                title="Delete reminder" data-id="${reminder.created}">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
        ${reminder.url ? `
          <button class="view-source text-gray-400 hover:text-indigo-500 transition-colors"
                  title="View source page" data-url="${reminder.url}">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
            </svg>
          </button>
        ` : ''}
      </div>
    </div>
  `;

  // Add event listeners
  div.querySelector('.delete-reminder').addEventListener('click', () => {
    if (confirm('Are you sure you want to delete this reminder?')) {
      chrome.storage.local.get(['reminders'], (result) => {
        const reminders = result.reminders.filter(r => r.created !== reminder.created);
        chrome.storage.local.set({ reminders }, () => {
          div.classList.add('opacity-0');
          setTimeout(() => div.remove(), 200);
        });
      });
    }
  });

  if (reminder.url) {
    div.querySelector('.view-source').addEventListener('click', () => {
      chrome.tabs.create({ url: reminder.url });
    });
  }

  document.getElementById('remindersList').prepend(div);
}

function getTimeLeft(timestamp) {
  const now = Date.now();
  const diff = timestamp - now;

  if (diff < 0) {
    return 'Overdue';
  }

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} left`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} left`;
  } else {
    return `${minutes} minute${minutes > 1 ? 's' : ''} left`;
  }
}

function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded shadow-lg';
  errorDiv.textContent = message;
  document.body.appendChild(errorDiv);
  setTimeout(() => {
    errorDiv.classList.add('opacity-0');
    setTimeout(() => errorDiv.remove(), 300);
  }, 3000);
}

function showSuccess(message) {
  const successDiv = document.createElement('div');
  successDiv.className = 'fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded shadow-lg';
  successDiv.textContent = message;
  document.body.appendChild(successDiv);
  setTimeout(() => {
    successDiv.classList.add('opacity-0');
    setTimeout(() => successDiv.remove(), 300);
  }, 3000);
}

function loadReminders() {
  chrome.storage.local.get(['reminders'], (result) => {
    const reminders = result.reminders || [];
    const remindersList = document.getElementById('remindersList');
    remindersList.innerHTML = '';

    if (reminders.length === 0) {
      remindersList.innerHTML = `
        <div class="text-center py-8 text-gray-500">
          <p>No reminders yet</p>
          <p class="text-sm mt-2">Create a reminder by selecting text on any webpage</p>
        </div>
      `;
      return;
    }

    reminders
      .sort((a, b) => b.created - a.created)
      .forEach(reminder => createReminderElement(reminder));
  });
}