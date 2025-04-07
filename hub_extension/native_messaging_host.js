#!/usr/bin/env node

// This script acts as a bridge between Chrome and your Dart script
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Setup message reading from Chrome
process.stdin.on('readable', () => {
  const input = [];
  let chunk;
  
  while ((chunk = process.stdin.read()) !== null) {
    input.push(chunk);
  }
  
  if (input.length > 0) {
    const buffer = Buffer.concat(input);
    const msgLen = buffer.readUInt32LE(0);
    const dataBuffer = buffer.slice(4, 4 + msgLen);
    const message = JSON.parse(dataBuffer.toString());
    
    // Process the message
    processMessage(message);
  }
});

function sendMessage(message) {
  // Chrome native messaging requires message length prefix
  const buffer = Buffer.from(JSON.stringify(message));
  const header = Buffer.alloc(4);
  header.writeUInt32LE(buffer.length, 0);
  process.stdout.write(Buffer.concat([header, buffer]));
}

function processMessage(message) {
  if (message.action === 'preview' && message.packageName) {
    const dartProcess = spawn('dart', ['run', 'bin/hub.dart', message.packageName], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true
    });
    
    let stdoutData = '';
    let stderrData = '';
    
    dartProcess.stdout.on('data', (data) => {
      stdoutData += data.toString();
      // You could parse intermediate status updates here and send them back to Chrome
    });
    
    dartProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
    });
    
    dartProcess.on('close', (code) => {
      if (code === 0) {
        sendMessage({
          success: true,
          packageName: message.packageName,
          message: "Package processed successfully",
          output: stdoutData
        });
      } else {
        sendMessage({
          success: false,
          packageName: message.packageName,
          error: `Process exited with code ${code}`,
          stderr: stderrData
        });
      }
    });
    
    dartProcess.on('error', (err) => {
      sendMessage({
        success: false,
        packageName: message.packageName,
        error: err.message
      });
    });
  } else {
    sendMessage({
      success: false,
      error: 'Invalid message format'
    });
  }
}

// Log startup
fs.writeFileSync(
  path.join(__dirname, 'native_host_log.txt'), 
  `Host started at ${new Date().toISOString()}\n`, 
  { flag: 'a' }
);