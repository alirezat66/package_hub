// Initialize logger
let packageHubLogger;

// Since importScripts doesn't work well in newer Chrome versions with Manifest V3,
// we'll create a basic logger if the import fails
try {
  importScripts('logger.js');
  console.log('Logger imported successfully');
} catch (e) {
  console.error('Failed to import logger:', e);
  // Create a simple fallback logger
  packageHubLogger = {
    info: (step, message) => console.log(`[INFO][${step}] ${message}`),
    success: (step, message) => console.log(`[SUCCESS][${step}] ${message}`),
    warning: (step, message) => console.log(`[WARNING][${step}] ${message}`),
    error: (step, message) => console.log(`[ERROR][${step}] ${message}`),
  };
}

// Log that the background script has loaded
packageHubLogger.info('Background', 'Background script initialized');

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'previewPackage') {
    packageHubLogger.info('Background', `Received request to preview package: ${request.packageName}`);
    
    // Handle package preview
    handlePackagePreview(request.packageName)
      .then(() => {
        packageHubLogger.success('Background', 'Package preview process completed successfully');
        sendResponse({ success: true });
      })
      .catch(error => {
        packageHubLogger.error('Background', `Error processing package: ${error.message}`);
        sendResponse({ success: false, error: error.message });
      });
    
    return true; // Required for async response
  } else if (request.action === 'getLogs') {
    // Handle log requests if the logger supports it
    if (packageHubLogger.getLogs) {
      sendResponse({ success: true, logs: packageHubLogger.getLogs() });
    } else {
      sendResponse({ success: false, error: 'Logs not available' });
    }
    return true;
  }
});

// Function to handle package preview
async function handlePackagePreview(packageName) {
  try {
    // Log the start of the process
    packageHubLogger.info('API', `Fetching package info for: ${packageName}`);
    
    // Fetch package info from pub.dev
    const response = await fetch(`https://pub.dev/api/packages/${packageName}`);
    
    if (!response.ok) {
      packageHubLogger.error('API', `Failed to fetch package info: ${response.status} ${response.statusText}`);
      throw new Error('Failed to fetch package info');
    }

    packageHubLogger.success('API', 'Successfully fetched package info');
    
    // Parse the response
    const packageInfo = await response.json();
    packageHubLogger.info('API', 'Parsing package data');
    
    // Extract repository URL
    const latest = packageInfo.latest.pubspec;
    const repoUrl = latest.repository || latest.homepage;

    if (!repoUrl) {
      packageHubLogger.error('API', 'No repository URL found for package');
      throw new Error('No repository URL found for package');
    }

    packageHubLogger.info('API', `Found repository URL: ${repoUrl}`);

    // Create a new tab with the preview
    packageHubLogger.info('Preview', 'Creating new tab for preview');
    const previewUrl = `https://flutter-package-preview.web.app/?package=${packageName}&repo=${encodeURIComponent(repoUrl)}`;
    
    packageHubLogger.info('Preview', `Opening preview URL: ${previewUrl}`);
    await chrome.tabs.create({ url: previewUrl });
    packageHubLogger.success('Preview', 'Preview tab created successfully');
  } catch (error) {
    packageHubLogger.error('Error', `Error processing package: ${error.message}`);
    throw error;
  }
}