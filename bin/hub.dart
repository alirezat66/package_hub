import 'dart:io';
import 'package:http/http.dart' as http;
import 'dart:convert';

void main(List<String> args) async {
  // 1. Validate input
  if (args.isEmpty) {
    print('Usage: dart run bin/hub.dart <package_name>');
    exit(1);
  }

  final packageName = args[0];
  print('📦 Processing package: $packageName');

  try {
    // 2. Fetch package info from pub.dev
    print('🔍 Fetching package info...');
    final response = await http.get(
      Uri.parse('https://pub.dev/api/packages/$packageName'),
    );
    print(response.body);
    if (response.statusCode != 200) {
      print('❌ Failed to fetch package info');
      exit(1);
    }

    final packageInfo = json.decode(response.body);
    final latest = packageInfo['latest']['pubspec'] as Map<String, dynamic>;
    String? repoUrl;
    if (latest.containsKey('repository')) {
      repoUrl = packageInfo['latest']['pubspec']['repository'];
    } else {
      repoUrl = packageInfo['latest']['pubspec']['homepage'];
    }

    if (repoUrl == null) {
      print('❌ No repository URL found for package');
      exit(1);
    }

    // 3. Clone the repository
    print('📥 Cloning repository from $repoUrl...');
    final gitUrl =
        repoUrl.replaceAll('https://github.com/', 'https://github.com/');
    final cloneResult =
        await Process.run('git', ['clone', gitUrl, packageName]);

    if (cloneResult.exitCode != 0) {
      print('❌ Failed to clone repository: ${cloneResult.stderr}');
      exit(1);
    }

    // 4. Find example directory
    print('🔍 Looking for example directory...');
    final exampleDir = Directory('$packageName/example');

    if (!await exampleDir.exists()) {
      print('❌ No example directory found');
      exit(1);
    }

    // 5. Add device_preview to pubspec.yaml
    print('📝 Adding device_preview to pubspec.yaml...');
    final pubspecFile = File('${exampleDir.path}/pubspec.yaml');
    var pubspecContent = await pubspecFile.readAsString();
    if (!pubspecContent.contains('device_preview:')) {
      pubspecContent = pubspecContent.replaceFirst(
          'dependencies:', 'dependencies:\n  device_preview: ^1.1.0');
      await pubspecFile.writeAsString(pubspecContent);
    }

    // 6. Modify main.dart
    print('🔧 Modifying main.dart...');
    final mainFile = File('${exampleDir.path}/lib/main.dart');
    var mainContent = await mainFile.readAsString();

    // Add import
    if (!mainContent.contains('device_preview')) {
      mainContent =
          "import 'package:device_preview/device_preview.dart';\n$mainContent";
    }

    // Modify runApp
    mainContent = mainContent.replaceFirst(RegExp(r'runApp\(([\s\S]*?)\)'),
        'runApp(DevicePreview( builder: (context) => MyApp())');

    await mainFile.writeAsString(mainContent);
    print('✅ Successfully modified example with DevicePreview');

    // 7. Run flutter pub get
    print('\n📦 Running flutter pub get...');
    final pubGetResult = await Process.run(
      'flutter',
      ['pub', 'get'],
      workingDirectory: exampleDir.path,
    );

    if (pubGetResult.exitCode != 0) {
      print('❌ Flutter pub get failed: ${pubGetResult.stderr}');
      exit(1);
    }

    print('✅ Dependencies installed successfully');
    final webDir = Directory('${exampleDir.path}/web');
    if (!await webDir.exists()) {
      print('\n🌐 Creating web configuration...');
      final createWebResult = await Process.run(
        'flutter',
        ['create', '--platforms=web', '.'],
        workingDirectory: exampleDir.path,
      );

      if (createWebResult.exitCode != 0) {
        print(
            '❌ Failed to create web configuration: ${createWebResult.stderr}');
        exit(1);
      }
      print('✅ Web configuration created successfully');
    }
    // 8. Build for web
    print('\n🏗️ Building for web...');
    final buildResult = await Process.run(
      'flutter',
      ['build', 'web'],
      workingDirectory: exampleDir.path,
    );

    if (buildResult.exitCode != 0) {
      print('❌ Web build failed: ${buildResult.stderr}');
      exit(1);
    }

    print('✅ Web build completed successfully');

    // 9. Start the development server
    print('\n🚀 Starting development server...');

    // Create a server process
    final server = await Process.start(
      'flutter',
      ['run', '-d', 'chrome'],
      workingDirectory: exampleDir.path,
    );

    // Forward stdout and stderr to our console
    server.stdout.transform(utf8.decoder).listen(print);
    server.stderr.transform(utf8.decoder).listen(print);

    // Handle user input (for hot reload, etc.)
    stdin.listen(server.stdin.add);

    // Wait for the server process to complete
    final exitCode = await server.exitCode;
    if (exitCode != 0) {
      print('❌ Server process exited with code: $exitCode');
      exit(exitCode);
    }
  } catch (e) {
    print('❌ Error: $e');
    exit(1);
  }
}
