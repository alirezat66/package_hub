// Background service worker for Flutter Example Runner

// Initialize when the extension is installed
chrome.runtime.onInstalled.addListener(() => {
  console.log('Flutter Example Runner extension installed');
});

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle long-running tasks if needed
  if (message.action === 'trackBuildProgress') {
    // If we need to track build progress in the background
    trackBuildProgress(message.buildId)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Required for async response
  }
  
  return false;
});

// Track build progress (placeholder for potential background processing)
async function trackBuildProgress(buildId) {
  // This would implement any background processing required
  // Currently just a placeholder
  return { status: 'completed' };
}