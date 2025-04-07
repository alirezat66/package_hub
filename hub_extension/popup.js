// Wait for all scripts to be loaded
window.addEventListener('load', () => {
  // Initialize filesystem using the global LightningFS
  const fs = new window.LightningFS('fs');

  // UI Elements
  const packageNameInput = document.getElementById('package-name');
  const runButton = document.getElementById('run-button');
  const statusMessage = document.getElementById('status-message');
  const progressBar = document.getElementById('progress-bar');
  const resultSection = document.getElementById('result-section');
  const restartButton = document.getElementById('restart-button');
  const openTabButton = document.getElementById('open-tab-button');
  const resultFrameContainer = document.getElementById('result-frame-container');

  // State
  let currentPackageName = '';
  let currentPreviewUrl = '';

  // Event Listeners
  runButton.addEventListener('click', handleRunPackage);
  restartButton.addEventListener('click', () => {
    if (currentPackageName) {
      handleRunPackage();
    }
  });
  openTabButton.addEventListener('click', () => {
    if (currentPreviewUrl) {
      chrome.tabs.create({ url: currentPreviewUrl });
    }
  });

  async function handleRunPackage() {
    const packageName = packageNameInput.value.trim();
    if (!packageName) {
      showStatus('Please enter a package name', 'error');
      return;
    }

    if (!/^[a-z0-9_]+$/.test(packageName)) {
      showStatus('Package name can only contain lowercase letters, numbers, and underscores', 'error');
      return;
    }

    currentPackageName = packageName;
    showStatus('Fetching package info...', 'info');
    showProgress(10);

    try {
      // 1. Fetch package info
      const packageInfo = await fetchPackageInfo(packageName);
      showProgress(20);

      // 2. Clone repository
      showStatus('Cloning repository...', 'info');
      const repoPath = await cloneRepository(packageInfo.repository);
      showProgress(40);

      // 3. Modify files
      showStatus('Modifying files...', 'info');
      await modifyExampleFiles(repoPath);
      showProgress(60);

      // 4. Compile and run
      showStatus('Compiling and running...', 'info');
      const previewUrl = await compileAndRun(repoPath);
      showProgress(100);

      // 5. Show preview
      currentPreviewUrl = previewUrl;
      showPreview(previewUrl);
      showStatus('Preview ready!', 'success');
    } catch (error) {
      showStatus(error.message, 'error');
      hideProgress();
    }
  }

  async function fetchPackageInfo(packageName) {
    const response = await fetch(`https://pub.dev/api/packages/${packageName}`);
    if (!response.ok) {
      throw new Error('Package not found');
    }

    const data = await response.json();
    const repoUrl = data.latest?.pubspec?.repository || data.latest?.pubspec?.homepage;
    
    if (!repoUrl) {
      throw new Error('Repository URL not found');
    }

    return {
      repository: repoUrl,
      version: data.latest?.version
    };
  }

  async function cloneRepository(repoUrl) {
    const dir = `/tmp/${currentPackageName}`;
    await window.isomorphicGit.clone({
      fs,
      dir,
      url: repoUrl,
      corsProxy: 'https://cors.isomorphic-git.org'
    });
    return dir;
  }

  async function modifyExampleFiles(repoPath) {
    const exampleDir = `${repoPath}/example`;
    
    // Check if example directory exists
    if (!await fs.exists(exampleDir)) {
      throw new Error('No example directory found');
    }

    // Modify pubspec.yaml
    const pubspecPath = `${exampleDir}/pubspec.yaml`;
    let pubspecContent = await fs.readFile(pubspecPath, 'utf8');
    if (!pubspecContent.includes('device_preview:')) {
      pubspecContent = pubspecContent.replace(
        'dependencies:',
        'dependencies:\n  device_preview: ^1.1.0'
      );
      await fs.writeFile(pubspecPath, pubspecContent);
    }

    // Modify main.dart
    const mainPath = `${exampleDir}/lib/main.dart`;
    let mainContent = await fs.readFile(mainPath, 'utf8');
    if (!mainContent.includes('device_preview')) {
      mainContent = `import 'package:device_preview/device_preview.dart';\n${mainContent}`;
      mainContent = mainContent.replace(
        /runApp\(([\s\S]*?)\)/,
        'runApp(DevicePreview(enabled: true, builder: (context) => $1))'
      );
      await fs.writeFile(mainPath, mainContent);
    }
  }

  async function compileAndRun(repoPath) {
    try {
      // Initialize Zapp SDK
      const zapp = new window.Zapp.SDK({
        apiKey: 'YOUR_ZAPP_API_KEY' // Replace with your actual API key
      });

      // Create a new project
      const project = await zapp.createProject({
        name: currentPackageName,
        framework: 'flutter'
      });

      // Upload the modified files
      const exampleDir = `${repoPath}/example`;
      const files = await fs.readdir(exampleDir);
      
      for (const file of files) {
        const content = await fs.readFile(`${exampleDir}/${file}`, 'utf8');
        await project.uploadFile(file, content);
      }

      // Build and deploy
      const build = await project.build();
      const url = await build.deploy();

      return url;
    } catch (error) {
      throw new Error(`Failed to compile and run: ${error.message}`);
    }
  }

  function showPreview(url) {
    resultSection.style.display = 'block';
    restartButton.style.display = 'inline-block';
    openTabButton.style.display = 'inline-block';
    
    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.style.width = '100%';
    iframe.style.height = '400px';
    iframe.style.border = 'none';
    
    resultFrameContainer.innerHTML = '';
    resultFrameContainer.appendChild(iframe);
  }

  function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status-${type}`;
    statusMessage.style.display = 'block';
  }

  function showProgress(percent) {
    progressBar.style.width = `${percent}%`;
  }

  function hideProgress() {
    progressBar.style.width = '0%';
  }
}); 