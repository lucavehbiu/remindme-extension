// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getSelectedText") {
    const selectedText = window.getSelection().toString().trim();
    sendResponse({ selectedText });
  }
  return true;
});

// Add context menu
chrome.runtime.sendMessage({ action: 'createContextMenu' });

// Handle context menu clicks
document.addEventListener('contextmenu', (event) => {
  const selectedText = window.getSelection().toString().trim();
  if (selectedText) {
    chrome.runtime.sendMessage({
      action: 'updateContextMenu',
      selectedText
    });
  }
});