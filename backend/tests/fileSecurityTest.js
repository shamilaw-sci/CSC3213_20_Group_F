/**
 * @file fileSecurityTest.js
 * @description File Security Test Suite. Tests authorization checks and tokenized access permissions for private PDFs, assignments, and submissions.
 */

const path = require('path');
const fs = require('fs');
const http = require('http');
const fileStorage = require('../services/fileStorage');
const {
  authorizeLessonPdf,
  authorizeAssignment,
  authorizeSubmission,
  authorizeDirectMessage,
  authorizeLiveAttachment,
  authorizeQuizImage,
  authorizePaymentSlip
} = require('../utils/fileAuthorization');

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failedTests++;
  }
}

async function runTests() {
  console.log('\n=============================================');
  console.log('🧪 RUNNING LUMINALEARN FILE SECURITY TESTS');
  console.log('=============================================\n');

  // Test 1: Storage directories initialization
  console.log('1. Testing Physical Storage Directories:');
  fileStorage.initStorage();
  const rootExists = fs.existsSync(fileStorage.STORAGE_ROOT);
  const pubExists = fs.existsSync(fileStorage.PUBLIC_DIR);
  const privExists = fs.existsSync(fileStorage.PRIVATE_DIR);
  assert(rootExists && pubExists && privExists, 'Root, public, and private storage directories initialized');

  for (const catName of Object.keys(fileStorage.CATEGORIES)) {
    const catDir = fileStorage.getCategoryDir(catName);
    assert(fs.existsSync(catDir), `Storage category [${catName}] directory exists`);
  }

  // Test 2: Path Traversal Security
  console.log('\n2. Testing Path Traversal Defense:');
  let traversalCaught = false;
  try {
    fileStorage.resolveFilePath('lessons', '../../package.json');
  } catch (err) {
    traversalCaught = true;
  }
  const resolved = fileStorage.resolveFilePath('lessons', 'sample.pdf');
  assert(resolved.startsWith(fileStorage.getCategoryDir('lessons')), 'Path resolver correctly constrains files to category folder');

  // Test 3: HTTP Streaming & Partial Content (HTTP 206) with actual HTTP server
  console.log('\n3. Testing Stream & Range Handling via HTTP:');
  const dummyFilePath = path.join(fileStorage.getCategoryDir('lessons'), 'test-stream-doc.pdf');
  const dummyContent = 'LuminaLearn Protected File Content - ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  fs.writeFileSync(dummyFilePath, dummyContent);

  const server = http.createServer((req, res) => {
    if (req.url === '/test-full') {
      fileStorage.streamFile(dummyFilePath, req, res, { disposition: 'inline', downloadName: 'test.pdf' });
    } else if (req.url === '/test-range') {
      fileStorage.streamFile(dummyFilePath, req, res, { disposition: 'attachment', downloadName: 'test.pdf' });
    }
  });

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  // Test 3a: Full file request
  await new Promise((resolve, reject) => {
    http.get(`http://localhost:${port}/test-full`, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        assert(res.statusCode === 200, 'Full file returns HTTP 200 OK');
        assert(res.headers['x-content-type-options'] === 'nosniff', 'Header X-Content-Type-Options is nosniff');
        assert(res.headers['accept-ranges'] === 'bytes', 'Header Accept-Ranges is bytes');
        assert(res.headers['cache-control'] === 'private, no-store, max-age=0', 'Header Cache-Control is private, no-store, max-age=0');
        assert(res.headers['content-type'] === 'application/pdf', 'MIME Content-Type correctly resolved to application/pdf');
        assert(data === dummyContent, 'Transferred content matches original file content');
        resolve();
      });
    }).on('error', reject);
  });

  // Test 3b: Range request (bytes=0-9)
  await new Promise((resolve, reject) => {
    const req = http.request(`http://localhost:${port}/test-range`, {
      headers: { 'Range': 'bytes=0-9' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        assert(res.statusCode === 206, 'Range request returns HTTP 206 Partial Content');
        assert(res.headers['cache-control'] === 'private, no-store, max-age=0', 'Range header Cache-Control is private, no-store, max-age=0');
        assert(res.headers['content-range'] === `bytes 0-9/${dummyContent.length}`, 'Content-Range header matches requested range');
        assert(res.headers['content-length'] === '10', 'Content-Length header matches chunk size (10 bytes)');
        assert(data === dummyContent.substring(0, 10), 'Transferred chunk matches exact byte range (0-9)');
        resolve();
      });
    });
    req.on('error', reject);
    req.end();
  });

  server.close();

  // Clean up dummy file
  if (fs.existsSync(dummyFilePath)) {
    fs.unlinkSync(dummyFilePath);
  }

  // Test 4: Authorization Unit Checks
  console.log('\n4. Testing Granular Role Authorization:');
  const unauthPdf = await authorizeLessonPdf(null, 'dummyLessonId', 'dummyPdfId');
  assert(!unauthPdf.allowed && unauthPdf.status === 401, 'Unauthenticated user rejected with 401');

  const unauthSub = await authorizeSubmission(null, 'dummySubId');
  assert(!unauthSub.allowed && unauthSub.status === 401, 'Unauthenticated submission request rejected with 401');

  const unauthMsg = await authorizeDirectMessage(null, 'dummyMsgId');
  assert(!unauthMsg.allowed && unauthMsg.status === 401, 'Unauthenticated message request rejected with 401');

  const unauthQuiz = await authorizeQuizImage(null, 'dummyQuizId');
  assert(!unauthQuiz.allowed && unauthQuiz.status === 401, 'Unauthenticated quiz image request rejected with 401');

  const unauthSlip = await authorizePaymentSlip(null, 'dummyPaymentId');
  assert(!unauthSlip.allowed && unauthSlip.status === 401, 'Unauthenticated payment slip request rejected with 401');

  console.log('\n=============================================');
  console.log(`📊 TEST SUMMARY: ${passedTests} Passed, ${failedTests} Failed`);
  console.log('=============================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
