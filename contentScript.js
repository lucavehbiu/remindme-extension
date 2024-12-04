// Handle text selection and image right-clicks
let lastRightClickedElement = null;

document.addEventListener('mousedown', (event) => {
  if (event.button === 2) { // Right click
    lastRightClickedElement = event.target;
    const selectedText = window.getSelection().toString().trim();
    const isImage = event.target.tagName === 'IMG';

    chrome.runtime.sendMessage({
      action: 'updateContextMenu',
      data: {
        type: isImage ? 'image' : 'text',
        content: isImage ? event.target.src : selectedText,
        pageUrl: window.location.href,
        pageTitle: document.title
      }
    });
  }
});

// Listen for messages from the popup/background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getSelectedContent") {
    const selectedText = window.getSelection().toString().trim();
    const response = {
      type: lastRightClickedElement?.tagName === 'IMG' ? 'image' : 'text',
      content: lastRightClickedElement?.tagName === 'IMG' ?
        lastRightClickedElement.src : selectedText,
      pageUrl: window.location.href,
      pageTitle: document.title
    };
    sendResponse(response);
  }
  return true;
});