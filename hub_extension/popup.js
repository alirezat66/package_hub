document.addEventListener('DOMContentLoaded', function() {
  const packageNameInput = document.getElementById('packageName');
  const previewButton = document.getElementById('previewButton');
  const statusDiv = document.getElementById('status');

  previewButton.addEventListener('click', async () => {
    const packageName = packageNameInput.value.trim();
    if (!packageName) {
      showStatus('Please enter a package name', 'error');
      return;
    }

    try {
      showStatus('Processing package...', 'info');
      
      // Send message to background script
      chrome.runtime.sendMessage({
        action: 'previewPackage',
        packageName: packageName
      }, (response) => {
        if (response.success) {
          showStatus('Package preview started!', 'success');
        } else {
          showStatus(response.error || 'Failed to preview package', 'error');
        }
      });
    } catch (error) {
      showStatus('Error: ' + error.message, 'error');
    }
  });

  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = type;
  }
}); 