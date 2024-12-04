document.addEventListener('DOMContentLoaded', async () => {
  // Get the pending reminder data
  const { pendingReminder } = await chrome.storage.local.get('pendingReminder');

  if (pendingReminder) {
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
  }

  // Set minimum datetime-local to now
  const now = new Date();
  now.setMinutes(now.getMinutes() + 5); // Add 5 minutes minimum
  const customTime = document.getElementById('custom-time');
  customTime.min = now.toISOString().slice(0, 16);
  customTime.value = now.toISOString().slice(0, 16);

  // Handle quick reminder buttons
  document.querySelectorAll('.quick-reminder').forEach(button => {
    button.addEventListener('click', () => {
      const minutes = parseInt(button.dataset.minutes);
      const reminderTime = new Date(Date.now() + minutes * 60000);
      createReminder(reminderTime);
    });
  });

  // Handle custom time reminder
  document.getElementById('set-reminder').addEventListener('click', () => {
    const customDateTime = new Date(document.getElementById('custom-time').value);
    if (customDateTime > now) {
      createReminder(customDateTime);
    } else {
      alert('Please select a future time');
    }
  });
});

async function createReminder(reminderTime) {
  const { pendingReminder } = await chrome.storage.local.get('pendingReminder');
  const email = document.getElementById('email').value.trim();

  if (!pendingReminder) {
    alert('No content selected for reminder');
    return;
  }

  // Create alarm with reminder data
  const alarmData = {
    ...pendingReminder,
    email: email || null
  };

  await chrome.alarms.create(JSON.stringify(alarmData), {
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

  // Clear pending reminder
  await chrome.storage.local.remove('pendingReminder');

  // Close popup
  window.close();
}