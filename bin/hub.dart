import 'dart:io';
import 'package:http/http.dart' as http;
import 'dart:convert';

// Logger class for detailed step tracking
class Logger {
  final bool verbose;

  Logger({this.verbose = true});

  void info(String step, String message) {
    print('ℹ️ [$step] $message');
  }

  void success(String step, String message) {
    print('✅ [$step] $message');
  }

  void warning(String step, String message) {
    print('⚠️ [$step] $message');
  }

  void error(String step, String message) {
    print('❌ [$step] $message');
  }

  void debug(String step, String message) {
    if (verbose) {
      print('🔍 [$step] $message');
    }
  }
}

void main(List<String> args) async {
  final logger = Logger();

  // Start timer to track performance
  final stopwatch = Stopwatch()..start();

  // 1. Validate input
  logger.info('Init', 'Starting Flutter Package Hub');
  if (args.isEmpty) {
    logger.error('Validation', 'No package name provided');
    print('Usage: dart run bin/hub.dart <package_name>');
    exit(1);
  }

  final packageName = args[0];
  logger.info('Package', 'Processing package: $packageName');
  logger.debug('System',
      'Running on ${Platform.operatingSystem} ${Platform.operatingSystemVersion}');

  try {
    // 2. Fetch package info from pub.dev
    logger.info('API', 'Fetching package info from pub.dev');
    logger.debug(
        'API', 'Request URL: https://pub.dev/api/packages/$packageName');

    final response = await http.get(
      Uri.parse('https://pub.dev/api/packages/$packageName'),
    );

    if (response.statusCode != 200) {
      logger.error('API',
          'Failed to fetch package info (Status: ${response.statusCode})');
      logger.debug('API', 'Response body: ${response.body}');
      exit(1);
    }

    logger.success('API', 'Successfully fetched package info');
    logger.debug('API', 'Response time: ${stopwatch.elapsedMilliseconds}ms');

    // Parse package info
    logger.info('Parse', 'Parsing package information');
    final packageInfo = json.decode(response.body);
    final latest = packageInfo['latest']['pubspec'] as Map<String, dynamic>;

    // Extract repository URL
    logger.info('Parse', 'Extracting repository URL');
    String? repoUrl;
    if (latest.containsKey('repository')) {
      repoUrl = packageInfo['latest']['pubspec']['repository'];
      logger.debug('Parse', 'Found repository URL: $repoUrl');
    } else {
      repoUrl = packageInfo['latest']['pubspec']['homepage'];
      logger.debug('Parse', 'Using homepage URL as fallback: $repoUrl');
    }

    if (repoUrl == null) {
      logger.error('Parse', 'No repository or homepage URL found for package');
      exit(1);
    }
    logger.success('Parse', 'Repository URL extracted: $repoUrl');

    // 3. Clone the repository
    logger.info('Git', 'Cloning repository');
    final gitUrl =
        repoUrl.replaceAll('https://github.com/', 'https://github.com/');
    logger.debug('Git', 'Git URL: $gitUrl');
    logger.debug('Git', 'Target directory: $packageName');

    final cloneResult =
        await Process.run('git', ['clone', gitUrl, packageName]);

    if (cloneResult.exitCode != 0) {
      logger.error('Git', 'Failed to clone repository');
      logger.debug('Git', 'Error: ${cloneResult.stderr}');
      exit(1);
    }
    logger.success('Git', 'Repository cloned successfully');
    logger.debug('Git', 'Clone time: ${stopwatch.elapsedMilliseconds}ms');

    // 4. Find example directory
    logger.info('Files', 'Looking for example directory');
    final exampleDir = Directory('$packageName/example');

    if (!await exampleDir.exists()) {
      logger.error('Files', 'No example directory found');
      exit(1);
    }
    logger.success('Files', 'Example directory found: ${exampleDir.path}');

    // 5. Add device_preview to pubspec.yaml
    logger.info('Modify', 'Adding device_preview to pubspec.yaml');
    final pubspecFile = File('${exampleDir.path}/pubspec.yaml');
    logger.debug('Modify', 'Pubspec file path: ${pubspecFile.path}');

    if (!await pubspecFile.exists()) {
      logger.error('Modify', 'Pubspec file not found');
      exit(1);
    }

    var pubspecContent = await pubspecFile.readAsString();
    logger.debug(
        'Modify', 'Original pubspec size: ${pubspecContent.length} bytes');

    if (!pubspecContent.contains('device_preview:')) {
      logger.info('Modify', 'Adding device_preview dependency');
      pubspecContent = pubspecContent.replaceFirst(
          'dependencies:', 'dependencies:\n  device_preview: ^1.1.0');
      await pubspecFile.writeAsString(pubspecContent);
      logger.success('Modify', 'Added device_preview dependency');
    } else {
      logger.warning('Modify', 'device_preview already in pubspec, skipping');
    }

    // 6. Modify main.dart
    logger.info('Modify', 'Modifying main.dart');
    final mainFile = File('${exampleDir.path}/lib/main.dart');
    logger.debug('Modify', 'Main file path: ${mainFile.path}');

    if (!await mainFile.exists()) {
      logger.error('Modify', 'Main file not found');
      exit(1);
    }

    var mainContent = await mainFile.readAsString();
    logger.debug(
        'Modify', 'Original main.dart size: ${mainContent.length} bytes');

    // Add import for device_preview
    if (!mainContent.contains('device_preview')) {
      logger.info('Modify', 'Adding device_preview import');
      mainContent =
          "import 'package:device_preview/device_preview.dart';\n$mainContent";
    } else {
      logger.warning(
          'Modify', 'device_preview import already exists, skipping');
    }

    // Modify runApp call
    final RegExp runAppRegex = RegExp(r'runApp\(([\s\S]*?)\)');
    if (runAppRegex.hasMatch(mainContent)) {
      logger.info('Modify', 'Wrapping app with DevicePreview');
      mainContent = mainContent.replaceFirst(
          runAppRegex, 'runApp(DevicePreview(builder: (context) => MyApp())');
      logger.success('Modify', 'Modified runApp call');
    } else {
      logger.warning('Modify', 'Could not find runApp call to modify');
    }

    await mainFile.writeAsString(mainContent);
    logger.success('Modify', 'Successfully modified main.dart');

    // 7. Run flutter pub get
    logger.info('Flutter', 'Running flutter pub get');
    logger.debug('Flutter', 'Working directory: ${exampleDir.path}');

    final pubGetResult = await Process.run(
      'flutter',
      ['pub', 'get'],
      workingDirectory: exampleDir.path,
    );

    if (pubGetResult.exitCode != 0) {
      logger.error('Flutter', 'Flutter pub get failed');
      logger.debug('Flutter', 'Error: ${pubGetResult.stderr}');
      exit(1);
    }
    logger.success('Flutter', 'Dependencies installed successfully');
    logger.debug('Flutter', 'pub get time: ${stopwatch.elapsedMilliseconds}ms');

    // Check and create web configuration if needed
    logger.info('Web', 'Checking web configuration');
    final webDir = Directory('${exampleDir.path}/web');
    if (!await webDir.exists()) {
      logger.info('Web', 'Web configuration not found, creating');
      final createWebResult = await Process.run(
        'flutter',
        ['create', '--platforms=web', '.'],
        workingDirectory: exampleDir.path,
      );

      if (createWebResult.exitCode != 0) {
        logger.error('Web', 'Failed to create web configuration');
        logger.debug('Web', 'Error: ${createWebResult.stderr}');
        exit(1);
      }
      logger.success('Web', 'Web configuration created successfully');
    } else {
      logger.success('Web', 'Web configuration already exists');
    }

    // 8. Build for web
    logger.info('Build', 'Building for web');
    final buildResult = await Process.run(
      'flutter',
      ['build', 'web'],
      workingDirectory: exampleDir.path,
    );

    if (buildResult.exitCode != 0) {
      logger.error('Build', 'Web build failed');
      logger.debug('Build', 'Error: ${buildResult.stderr}');
      exit(1);
    }
    logger.success('Build', 'Web build completed successfully');
    logger.debug('Build', 'Build time: ${stopwatch.elapsedMilliseconds}ms');

    // 9. Start the development server
    logger.info('Server', 'Starting development server');

    // Create a server process
    final server = await Process.start(
      'flutter',
      ['run', '-d', 'chrome'],
      workingDirectory: exampleDir.path,
    );

    logger.success('Server', 'Development server started');
    logger.info(
        'Complete', 'Total setup time: ${stopwatch.elapsedMilliseconds}ms');

    // Forward stdout and stderr to our console
    server.stdout.transform(utf8.decoder).listen((data) {
      print('[Server] $data');
    });

    server.stderr.transform(utf8.decoder).listen((data) {
      print('[Server Error] $data');
    });

    // Handle user input (for hot reload, etc.)
    stdin.listen(server.stdin.add);

    // Wait for the server process to complete
    final exitCode = await server.exitCode;
    if (exitCode != 0) {
      logger.error('Server', 'Server process exited with code: $exitCode');
      exit(exitCode);
    }
  } catch (e) {
    logger.error('Error', 'Unhandled exception: $e');
    exit(1);
  }
}
