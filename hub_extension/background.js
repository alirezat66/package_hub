// Background script with direct API access (requires host permissions)
console.log('Background script started');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'previewPackage') {
    console.log('Package preview requested:', request.packageName);
    
    handlePackage(request.packageName)
      .then(result => sendResponse({success: true}))
      .catch(error => sendResponse({success: false, error: error.message}));
    
    return true;
  }
});

async function handlePackage(packageName) {
  try {
    // Direct API call (works with host permissions)
    const apiUrl = `https://pub.dev/api/packages/${packageName}`;
    console.log('Fetching package info:', apiUrl);
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      console.error('API request failed:', response.status, response.statusText);
      throw new Error(`Failed to fetch package info: ${response.status}`);
    }
    
    // Parse response
    const packageInfo = await response.json();
    console.log('Package info received:', packageInfo);
    
    const latest = packageInfo.latest.pubspec;
    const repoUrl = latest.repository || latest.homepage;
    
    if (!repoUrl) {
      console.error('No repository URL found');
      throw new Error('No repository URL found');
    }
    
    console.log('Repository URL:', repoUrl);
    
    // For now, just open the pub.dev page
    const pubDevUrl = `https://pub.dev/packages/${packageName}`;
    await chrome.tabs.create({url: pubDevUrl});
    
    return true;
  } catch (error) {
    console.error('Error processing package:', error);
    
    // Fallback: Open pub.dev page directly
    const pubDevUrl = `https://pub.dev/packages/${packageName}`;
    await chrome.tabs.create({url: pubDevUrl});
    
    throw error;
  }
}