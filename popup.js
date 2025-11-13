// UUID generator
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Custom modal helper functions
function showConfirmModal(title, message) {
  return new Promise((resolve) => {
    const modal = document.getElementById('custom-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const modalButtons = document.getElementById('modal-buttons');

    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modalButtons.innerHTML = `
      <button id="modal-cancel" class="px-4 py-2 text-sm font-medium text-gray-700 backdrop-blur-sm bg-white/70 hover:bg-white rounded-lg transition-colors shadow-sm">
        Cancel
      </button>
      <button id="modal-confirm" class="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-md hover:shadow-lg">
        Delete
      </button>
    `;

    modal.classList.remove('hidden');

    const handleConfirm = () => {
      modal.classList.add('hidden');
      cleanup();
      resolve(true);
    };

    const handleCancel = () => {
      modal.classList.add('hidden');
      cleanup();
      resolve(false);
    };

    const cleanup = () => {
      document.getElementById('modal-confirm').removeEventListener('click', handleConfirm);
      document.getElementById('modal-cancel').removeEventListener('click', handleCancel);
    };

    document.getElementById('modal-confirm').addEventListener('click', handleConfirm);
    document.getElementById('modal-cancel').addEventListener('click', handleCancel);
  });
}

function showSnoozeModal() {
  return new Promise((resolve) => {
    const modal = document.getElementById('snooze-modal');
    modal.classList.remove('hidden');

    const handleChoice = (e) => {
      const button = e.target.closest('.snooze-option');
      if (button) {
        const minutes = parseInt(button.dataset.snoozeMinutes);
        modal.classList.add('hidden');
        cleanup();
        resolve(minutes);
      }
    };

    const handleCancel = () => {
      modal.classList.add('hidden');
      cleanup();
      resolve(null);
    };

    const cleanup = () => {
      modal.removeEventListener('click', handleChoice);
      document.getElementById('snooze-cancel').removeEventListener('click', handleCancel);
    };

    modal.addEventListener('click', handleChoice);
    document.getElementById('snooze-cancel').addEventListener('click', handleCancel);
  });
}

// Calculate urgency level based on scheduled time
function getUrgencyLevel(scheduledFor) {
  const now = Date.now();
  const scheduled = new Date(scheduledFor).getTime();
  const diffHours = (scheduled - now) / (1000 * 60 * 60);

  if (scheduled < now) return 'overdue';
  if (diffHours < 2) return 'soon';
  if (diffHours < 24) return 'today';
  return 'upcoming';
}

// Urgency configuration
const urgencyConfig = {
  overdue: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-l-4 border-red-500',
    dot: 'bg-red-500',
    label: 'Overdue',
    animate: 'overdue-pulse'
  },
  soon: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-l-4 border-amber-500',
    dot: 'bg-amber-500',
    label: 'Due soon',
    animate: ''
  },
  today: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-l-4 border-blue-500',
    dot: 'bg-blue-500',
    label: 'Today',
    animate: ''
  },
  upcoming: {
    bg: 'bg-slate-50',
    text: 'text-slate-600',
    border: '',
    dot: 'bg-slate-400',
    label: 'Scheduled',
    animate: ''
  }
};

// Get relative time display
function getRelativeTime(scheduledFor) {
  const now = Date.now();
  const diff = new Date(scheduledFor).getTime() - now;
  const diffMinutes = Math.round(diff / (1000 * 60));
  const diffHours = Math.round(diff / (1000 * 60 * 60));
  const diffDays = Math.round(diff / (1000 * 60 * 60 * 24));

  if (diff < 0) {
    const absDiff = Math.abs(diffMinutes);
    if (absDiff < 60) return `${absDiff}m ago`;
    if (absDiff < 1440) return `${Math.abs(diffHours)}h ago`;
    return `${Math.abs(diffDays)}d ago`;
  }

  if (diffMinutes < 60) return `in ${diffMinutes}m`;
  if (diffHours < 24) return `in ${diffHours}h`;
  if (diffDays < 7) return `in ${diffDays}d`;

  return new Date(scheduledFor).toLocaleDateString();
}

// Format absolute time nicely: "12th Nov 25, 8:15 PM"
function formatAbsoluteTime(timestamp) {
  const date = new Date(timestamp);

  // Get day with ordinal suffix (1st, 2nd, 3rd, 4th, etc.)
  const day = date.getDate();
  const suffix = ['th', 'st', 'nd', 'rd'][day % 10 > 3 ? 0 : (day % 100 - day % 10 != 10) * day % 10];

  // Get month short name
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];

  // Get year (last 2 digits)
  const year = String(date.getFullYear()).slice(-2);

  // Get time in 12-hour format
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;

  return `${day}${suffix} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
}

// Get favicon URL
function getFaviconUrl(pageUrl) {
  try {
    const url = new URL(pageUrl);
    return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=32`;
  } catch {
    return '';
  }
}

// Global state for filtering
let currentTab = 'active';
let currentSort = 'scheduled';
let searchQuery = '';
let selectedPriority = 'high'; // Default priority

document.addEventListener('DOMContentLoaded', async () => {
  const newReminderView = document.getElementById('new-reminder-view');
  const remindersListView = document.getElementById('reminders-list-view');
  const remindersList = document.getElementById('reminders-list');
  const emptyState = document.getElementById('empty-state');
  const customTime = document.getElementById('custom-time');
  const setToNowButton = document.getElementById('set-to-now');
  const emailInput = document.getElementById('email');
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

      if (!savedEmails.includes(email)) {
        savedEmails.push(email);
        await chrome.storage.local.set({
          savedEmails: savedEmails.slice(-5)
        });
      }
    }
  });

  // Set up list view event listeners (always, regardless of pendingReminder)
  // Handle tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTab = btn.dataset.tab;
      loadReminders();
    });
  });

  // Handle search
  const searchInput = document.getElementById('search-reminders');
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase();
    loadReminders();
  });

  // Handle sort
  document.getElementById('sort-reminders').addEventListener('change', (e) => {
    currentSort = e.target.value;
    loadReminders();
  });

  // Handle clear all button
  document.getElementById('clear-all').addEventListener('click', async () => {
    const confirmed = await showConfirmModal('Clear All Reminders', 'Are you sure you want to clear all reminders? This action cannot be undone.');
    if (confirmed) {
      await chrome.storage.local.set({ reminderHistory: [] });
      await loadReminders();
    }
  });

  // Handle reminder action buttons (snooze, complete, delete) - single event listener for all
  remindersList.addEventListener('click', async (e) => {
    const button = e.target.closest('button[data-action]');
    if (!button) return;

    const action = button.dataset.action;
    const reminderId = button.dataset.reminderId;

    if (action === 'snooze') {
      await snoozeReminder(reminderId);
    } else if (action === 'complete') {
      await completeReminder(reminderId);
    } else if (action === 'delete') {
      await deleteReminder(reminderId);
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

    // Handle priority selection
    document.querySelectorAll('.priority-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.priority-btn').forEach(b => {
          b.classList.remove('active');
          // Remove all possible priority colors
          b.classList.remove('border-green-500', 'border-yellow-500', 'border-gray-900', 'border-red-500');
          b.classList.remove('text-green-700', 'text-yellow-700', 'text-gray-900', 'text-red-700');
          b.classList.remove('bg-white');
          // Reset to default glass style
          b.classList.add('border-gray-200/50', 'text-gray-700', 'bg-white/70');
        });
        btn.classList.add('active');
        btn.classList.remove('border-gray-200/50', 'text-gray-700', 'bg-white/70');
        selectedPriority = btn.dataset.priority;

        // Add color based on priority
        const colors = {
          low: ['border-green-500', 'text-green-700', 'bg-green-50/50'],
          medium: ['border-yellow-500', 'text-yellow-700', 'bg-yellow-50/50'],
          high: ['border-gray-900', 'text-gray-900', 'bg-white'],
          urgent: ['border-red-500', 'text-red-700', 'bg-red-50/50']
        };
        btn.classList.add(...colors[selectedPriority]);
      });
    });

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

  // Validate email if provided
  if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    alert('Please enter a valid email address or leave it blank');
    return;
  }

  // Generate UUID for this reminder
  const reminderId = generateUUID();

  // Create alarm with reminder data
  const alarmData = {
    id: reminderId,
    type: pendingReminder.type,
    content: pendingReminder.content,
    pageUrl: pendingReminder.pageUrl,
    description: description || null,
    email: email || null,
    priority: selectedPriority || 'high',
    timestamp: Date.now(),
    scheduledFor: reminderTime.getTime(),
    status: 'pending',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };

  try {
    console.log('Creating alarm with data:', alarmData);

    // Store the reminder data with UUID key
    const storageKey = `reminder_${reminderId}`;
    await chrome.storage.local.set({
      [storageKey]: alarmData
    });

    // Create the alarm with UUID as name
    await chrome.alarms.create(reminderId, {
      when: reminderTime.getTime()
    });

    // Store in history
    const { reminderHistory = [] } = await chrome.storage.local.get('reminderHistory');
    reminderHistory.push(alarmData);
    await chrome.storage.local.set({
      reminderHistory: reminderHistory.slice(-100) // Keep last 100 reminders
    });

    // Hide the form and show success message
    const newReminderView = document.getElementById('new-reminder-view');
    newReminderView.innerHTML = `
      <div class="h-screen flex flex-col items-center justify-center px-6" style="background: linear-gradient(to bottom, #fafafa 0%, #f5f5f5 100%);">
        <div class="max-w-md w-full space-y-6">
          <!-- Success Icon -->
          <div class="relative flex justify-center">
            <div class="absolute inset-0 bg-gray-200 rounded-full blur-xl opacity-30"></div>
            <div class="relative w-20 h-20 rounded-xl flex items-center justify-center shadow-lg" style="background: linear-gradient(135deg, #f5f5f5 0%, #e5e5e5 100%);">
              <img src="unnamed.webp" alt="Remind Me" class="w-12 h-12">
            </div>
          </div>

          <!-- Title -->
          <div class="text-center space-y-2">
            <h2 class="text-2xl font-semibold text-gray-900">All Set!</h2>
            <p class="text-sm text-gray-500">Your reminder has been created</p>
          </div>

          <!-- Details Card -->
          <div class="backdrop-blur-md bg-white/80 border border-gray-200/50 rounded-2xl p-5 space-y-3 shadow-lg">
            <div class="flex items-start gap-3">
              <svg class="w-5 h-5 text-gray-900 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <div class="flex-1 text-sm">
                <p class="text-gray-500 mb-1">Scheduled for</p>
                <p class="text-gray-900 font-medium">${formatAbsoluteTime(reminderTime.getTime())}</p>
              </div>
            </div>

            ${email ? `
              <div class="flex items-start gap-3 pt-3 border-t border-gray-100">
                <svg class="w-5 h-5 text-gray-900 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
                <div class="flex-1 text-sm">
                  <p class="text-gray-500 mb-1">Email backup</p>
                  <p class="text-gray-900 font-medium">${email}</p>
                  <p class="text-amber-600 text-xs mt-1">📫 Check spam folder if not received</p>
                </div>
              </div>
            ` : ''}

            ${description ? `
              <div class="flex items-start gap-3 pt-3 border-t border-gray-100">
                <svg class="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/>
                </svg>
                <div class="flex-1 text-sm">
                  <p class="text-gray-500 mb-1">Your note</p>
                  <p class="text-gray-900">${description}</p>
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Action Button -->
          <button id="view-reminders-btn"
            class="w-full py-3 bg-gray-900 hover:bg-gray-800
            text-white font-medium rounded-lg text-sm
            focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2
            transition-all duration-200 shadow-md hover:shadow-lg">
            View All Reminders
          </button>
        </div>
      </div>
    `;

    // Add click handler for the button
    document.getElementById('view-reminders-btn').addEventListener('click', () => {
      window.location.href = 'popup.html';
    });

    // Clear pending reminder
    await chrome.storage.local.remove('pendingReminder');
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

  // Filter by tab
  const now = Date.now();
  let filtered = reminderHistory.filter(r => {
    const scheduledTime = new Date(r.scheduledFor).getTime();
    if (currentTab === 'active') {
      // Active = future notifications that aren't completed
      return scheduledTime > now && r.status !== 'completed';
    } else {
      // Past = completed OR already fired/overdue
      return r.status === 'completed' || scheduledTime <= now;
    }
  });

  // Filter by search query
  if (searchQuery) {
    filtered = filtered.filter(r => {
      const searchText = `${r.content} ${r.description || ''}`.toLowerCase();
      return searchText.includes(searchQuery);
    });
  }

  // Sort
  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
  filtered.sort((a, b) => {
    if (currentSort === 'scheduled') {
      return a.scheduledFor - b.scheduledFor;
    } else if (currentSort === 'priority') {
      return priorityOrder[a.priority || 'high'] - priorityOrder[b.priority || 'high'];
    } else if (currentSort === 'created') {
      return b.timestamp - a.timestamp;
    }
    return 0;
  });

  if (filtered.length === 0) {
    remindersList.innerHTML = '';
    emptyState.classList.remove('hidden');
    reminderCount.textContent = '';
    return;
  }

  emptyState.classList.add('hidden');
  reminderCount.textContent = `${filtered.length} reminder${filtered.length === 1 ? '' : 's'}`;

  // Helper function to render a reminder card
  const renderReminderCard = (reminder) => {
    const urgency = getUrgencyLevel(reminder.scheduledFor);
    const config = urgencyConfig[urgency];
    const relativeTime = getRelativeTime(reminder.scheduledFor);
    const absoluteTime = formatAbsoluteTime(reminder.scheduledFor);
    const faviconUrl = getFaviconUrl(reminder.pageUrl);
    const hostname = new URL(reminder.pageUrl).hostname;

    return `
      <div class="reminder-card group backdrop-blur-md bg-white/80 border border-gray-200/50 rounded-xl shadow-md hover:shadow-lg
                  transition-all duration-200 hover:scale-[1.01] transform-gpu ${config.border} card-enter"
           data-reminder-id="${reminder.id}">

          <!-- Header Section -->
          <div class="p-4 space-y-3">

            <!-- Top Row: Urgency + Priority + External Link -->
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-2">
                <!-- Urgency Indicator -->
                <div class="inline-flex items-center gap-1.5 ${config.bg} ${config.text} px-2.5 py-1 rounded-full text-xs font-medium ${config.animate}">
                  <span class="w-2 h-2 ${config.dot} rounded-full"></span>
                  ${config.label}
                </div>

                <!-- Priority Badge -->
                ${(() => {
                  const priorityConfig = {
                    low: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500', label: 'Low' },
                    medium: { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500', label: 'Med' },
                    high: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500', label: 'High' },
                    urgent: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500', label: 'Urgent' }
                  };
                  const pConfig = priorityConfig[reminder.priority || 'high'];
                  return `
                    <div class="inline-flex items-center gap-1.5 ${pConfig.bg} ${pConfig.text} px-2.5 py-1 rounded-full text-xs font-medium">
                      <span class="w-2 h-2 ${pConfig.dot} rounded-full"></span>
                      ${pConfig.label}
                    </div>
                  `;
                })()}
              </div>

              <!-- External Link Button -->
              <a href="${reminder.pageUrl}" target="_blank"
                 class="flex-shrink-0 p-1.5 hover:bg-gray-100 rounded-lg transition-colors group/link">
                <svg class="w-4 h-4 text-gray-400 group-hover/link:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                </svg>
              </a>
            </div>

            <!-- Content Section -->
            <div class="space-y-2">

              <!-- Favicon + URL (clickable) -->
              <a href="${reminder.pageUrl}" target="_blank" class="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-blue-600 transition-colors group/hostname">
                <img src="${faviconUrl}"
                     alt="favicon"
                     class="w-3.5 h-3.5 rounded-sm"
                     onerror="this.style.display='none'">
                <span class="truncate group-hover/hostname:underline">${hostname}</span>
                <svg class="w-2.5 h-2.5 opacity-0 group-hover/hostname:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                </svg>
              </a>

              <!-- Content Preview -->
              <div class="content-preview">
                ${reminder.type === 'image'
                  ? `<div class="flex items-center gap-2 text-xs font-medium text-blue-700">
                       <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                       </svg>
                       Image reminder
                     </div>`
                  : `<p class="text-xs text-gray-900 leading-relaxed">${reminder.content.substring(0, 100)}${reminder.content.length > 100 ? '...' : ''}</p>`}
              </div>

              <!-- Description (if exists) -->
              ${reminder.description
                ? `<div class="flex items-start gap-1.5 text-[11px] text-gray-600 bg-gray-50 p-2 rounded-lg">
                     <svg class="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                     </svg>
                     <span>${reminder.description}</span>
                   </div>`
                : ''}

              <!-- Time Display -->
              <div class="flex items-center gap-1.5 text-[11px] ${config.text}">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span class="font-medium">${relativeTime}</span>
                <span class="text-gray-400">•</span>
                <span class="text-gray-500">${absoluteTime}</span>
              </div>

              <!-- Status Badge (if snoozed) -->
              ${reminder.status === 'snoozed'
                ? `<div class="inline-flex items-center gap-1.5 bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full text-xs font-medium">
                     <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                     </svg>
                     Snoozed
                   </div>`
                : ''}
            </div>
          </div>

          <!-- Action Buttons -->
          ${reminder.status === 'completed'
            ? `<!-- Completed - show only delete -->
               <div class="px-4 pb-4 pt-3 border-t border-gray-100 flex gap-2">
                 <div class="flex-1 flex items-center gap-2 text-emerald-700 text-sm">
                   <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                   </svg>
                   Completed
                 </div>
                 <button data-action="delete" data-reminder-id="${reminder.id}"
                         class="flex items-center justify-center px-3 py-2
                                bg-rose-50 text-rose-700 hover:bg-rose-100
                                rounded-lg text-xs font-medium
                                transition-all duration-200 hover:scale-105 active:scale-95 button-lift">
                   <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                   </svg>
                 </button>
               </div>`
            : `<!-- Active - show all actions -->
               <div class="px-4 pb-4 pt-3 border-t border-gray-100 flex gap-2">
                 <button data-action="snooze" data-reminder-id="${reminder.id}"
                         class="flex-1 flex items-center justify-center gap-1.5 px-3 py-2
                                bg-violet-50 text-violet-700 hover:bg-violet-100
                                rounded-lg text-xs font-medium
                                transition-all duration-200 hover:scale-105 active:scale-95 button-lift">
                   <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                   </svg>
                   Snooze
                 </button>

                 <button data-action="complete" data-reminder-id="${reminder.id}"
                         class="flex-1 flex items-center justify-center gap-1.5 px-3 py-2
                                bg-emerald-50 text-emerald-700 hover:bg-emerald-100
                                rounded-lg text-xs font-medium
                                transition-all duration-200 hover:scale-105 active:scale-95 button-lift">
                   <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                   </svg>
                   Done
                 </button>

                 <button data-action="delete" data-reminder-id="${reminder.id}"
                         class="flex items-center justify-center px-3 py-2
                                bg-rose-50 text-rose-700 hover:bg-rose-100
                                rounded-lg text-xs font-medium
                                transition-all duration-200 hover:scale-105 active:scale-95 button-lift">
                   <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                   </svg>
                 </button>
               </div>`
          }
        </div>
      `;
  };

  // Render all reminders in a simple list
  remindersList.innerHTML = `<div class="space-y-2">${filtered.map(renderReminderCard).join('')}</div>`;
}

// Snooze reminder function
async function snoozeReminder(reminderId) {
  const snoozeMinutes = await showSnoozeModal();

  if (!snoozeMinutes) return;
  const newTime = new Date();
  newTime.setMinutes(newTime.getMinutes() + snoozeMinutes);

  try {
    // Get reminder data
    const { reminderHistory = [] } = await chrome.storage.local.get('reminderHistory');
    const reminderIndex = reminderHistory.findIndex(r => r.id === reminderId);

    if (reminderIndex === -1) return;

    const reminder = reminderHistory[reminderIndex];

    // Update reminder
    reminder.scheduledFor = newTime.getTime();
    reminder.status = 'snoozed';

    // Update storage
    reminderHistory[reminderIndex] = reminder;
    await chrome.storage.local.set({ reminderHistory });
    await chrome.storage.local.set({ [`reminder_${reminderId}`]: reminder });

    // Update alarm
    await chrome.alarms.clear(reminderId);
    await chrome.alarms.create(reminderId, { when: newTime.getTime() });

    // Reload list
    await loadReminders();

    console.log(`Reminder snoozed until ${newTime.toLocaleString()}`);
  } catch (error) {
    console.error('Error snoozing reminder:', error);
    alert('Failed to snooze reminder');
  }
}

// Complete reminder function
async function completeReminder(reminderId) {
  try {
    // Get reminder data
    const { reminderHistory = [] } = await chrome.storage.local.get('reminderHistory');
    const reminderIndex = reminderHistory.findIndex(r => r.id === reminderId);

    if (reminderIndex === -1) return;

    // Update reminder status
    reminderHistory[reminderIndex].status = 'completed';
    reminderHistory[reminderIndex].completedAt = Date.now();

    // Update storage
    await chrome.storage.local.set({ reminderHistory });

    // Clear alarm
    await chrome.alarms.clear(reminderId);
    await chrome.storage.local.remove(`reminder_${reminderId}`);

    // Reload list
    await loadReminders();

    console.log('Reminder marked as completed');
  } catch (error) {
    console.error('Error completing reminder:', error);
    alert('Failed to mark reminder as complete');
  }
}

// Delete reminder function
async function deleteReminder(reminderId) {
  const confirmed = await showConfirmModal('Delete Reminder', 'Are you sure you want to delete this reminder? This action cannot be undone.');
  if (!confirmed) return;

  try {
    // Get reminder data
    const { reminderHistory = [] } = await chrome.storage.local.get('reminderHistory');
    const updatedHistory = reminderHistory.filter(r => r.id !== reminderId);

    // Update storage
    await chrome.storage.local.set({ reminderHistory: updatedHistory });
    await chrome.storage.local.remove(`reminder_${reminderId}`);

    // Clear alarm
    await chrome.alarms.clear(reminderId);

    // Reload list
    await loadReminders();

    console.log('Reminder deleted');
  } catch (error) {
    console.error('Error deleting reminder:', error);
    alert('Failed to delete reminder');
  }
}