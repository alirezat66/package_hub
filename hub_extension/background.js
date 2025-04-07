chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'previewPackage') {
    handlePackagePreview(request.packageName)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Required for async response
  }
});

async function handlePackagePreview(packageName) {
  try {
    // 1. Fetch package info from pub.dev
    const response = await fetch(`https://pub.dev/api/packages/${packageName}`);
    if (!response.ok) {
      throw new Error('Failed to fetch package info');
    }

    const packageInfo = await response.json();
    const latest = packageInfo.latest.pubspec;
    const repoUrl = latest.repository || latest.homepage;

    if (!repoUrl) {
      throw new Error('No repository URL found for package');
    }

    // 2. Create a new tab with the preview
    const previewUrl = `https://flutter-package-preview.web.app/?package=${packageName}&repo=${encodeURIComponent(repoUrl)}`;
    await chrome.tabs.create({ url: previewUrl });

  } catch (error) {
    console.error('Error processing package:', error);
    throw error;
  }
} 