const request = require('supertest');
const mongoose = require('mongoose');
const path = require('path');
const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const schedulerService = require('../src/services/schedulerService');

// Models
const Agent = require('../src/models/Agent');
const User = require('../src/models/User');
const UserAccount = require('../src/models/UserAccount');
const PolicyCategory = require('../src/models/PolicyCategory');
const PolicyCarrier = require('../src/models/PolicyCarrier');
const Policy = require('../src/models/Policy');
const ScheduledMessage = require('../src/models/ScheduledMessage');
const Message = require('../src/models/Message');

const TEST_DB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/policy_assessment_test_db';

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.MONGODB_URI = TEST_DB_URI;
  await connectDB(TEST_DB_URI);
  await schedulerService.init();

  // Clear test DB collections
  await Promise.all([
    Agent.deleteMany({}),
    User.deleteMany({}),
    UserAccount.deleteMany({}),
    PolicyCategory.deleteMany({}),
    PolicyCarrier.deleteMany({}),
    Policy.deleteMany({}),
    ScheduledMessage.deleteMany({}),
    Message.deleteMany({})
  ]);
});

afterAll(async () => {
  schedulerService.stop();
  await disconnectDB();
});

describe('Task 1: Insurance Policy Management APIs', () => {
  test('Task 1.1 & 1.4: POST /api/upload - should upload XLSX/CSV via Worker Thread and populate 6 collections', async () => {
    const csvPath = path.resolve(__dirname, '../sample-data/sample_policies.csv');

    const response = await request(app)
      .post('/api/upload')
      .attach('file', csvPath);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.stats).toBeDefined();
    expect(response.body.stats.totalRows).toBe(50);
    expect(response.body.stats.policiesHandled).toBeGreaterThanOrEqual(1);

    // Verify 6 collections are populated
    const [agentCount, userCount, accountCount, categoryCount, carrierCount, policyCount] =
      await Promise.all([
        Agent.countDocuments(),
        User.countDocuments(),
        UserAccount.countDocuments(),
        PolicyCategory.countDocuments(),
        PolicyCarrier.countDocuments(),
        Policy.countDocuments()
      ]);

    expect(agentCount).toBeGreaterThan(0);
    expect(userCount).toBeGreaterThan(0);
    expect(accountCount).toBeGreaterThan(0);
    expect(categoryCount).toBeGreaterThan(0);
    expect(carrierCount).toBeGreaterThan(0);
    expect(policyCount).toBeGreaterThan(0);
  });

  test('Task 1.1: POST /api/upload - should upload XLSX file via Worker Thread and update collections', async () => {
    const xlsxPath = path.resolve(__dirname, '../sample-data/sample_policies.xlsx');

    const response = await request(app)
      .post('/api/upload')
      .attach('file', xlsxPath);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.stats.totalRows).toBe(50);
  });

  test('Task 1.2: GET /api/policies/search - find policy info with the help of username', async () => {
    const response = await request(app)
      .get('/api/policies/search')
      .query({ username: 'John' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.matchedUsersCount).toBeGreaterThanOrEqual(1);
    expect(response.body.data.length).toBeGreaterThan(0);

    const firstPolicy = response.body.data[0];
    expect(firstPolicy.policy_number).toBeDefined();
    expect(firstPolicy.user_id.firstName).toMatch(/john/i);
    expect(firstPolicy.policy_category_id.category_name).toBeDefined();
    expect(firstPolicy.company_id.company_name).toBeDefined();
  });

  test('Task 1.2: GET /api/policies/search - returns 404 for non-existent user', async () => {
    const response = await request(app)
      .get('/api/policies/search')
      .query({ username: 'NonExistentPersonXYZ123' });

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  test('Task 1.3: GET /api/policies/aggregate-by-user - provide aggregated policies grouped by user', async () => {
    const response = await request(app)
      .get('/api/policies/aggregate-by-user')
      .query({ page: 1, limit: 10 });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.pagination).toBeDefined();
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);

    const firstUserSummary = response.body.data[0];
    expect(firstUserSummary.userId).toBeDefined();
    expect(firstUserSummary.userName).toBeDefined();
    expect(firstUserSummary.totalPolicies).toBeGreaterThan(0);
    expect(firstUserSummary.policyNumbers.length).toBe(firstUserSummary.totalPolicies);
    expect(firstUserSummary.policies.length).toBe(firstUserSummary.totalPolicies);
  });
});

describe('Task 2: CPU Monitoring & Scheduled Message Service', () => {
  test('Task 2.1: GET /api/system/cpu-status - returns real-time CPU utilization metrics', async () => {
    const response = await request(app).get('/api/system/cpu-status');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.threshold).toBe(70);
    expect(typeof response.body.data.cpuPercentage).toBe('number');
    expect(response.body.data.cores).toBeGreaterThan(0);
  });

  test('Task 2.2: POST /api/messages/schedule - schedules message for specific day and time', async () => {
    const payload = {
      message: 'Policy annual premium due reminder',
      day: '2026-10-02',
      time: '15:30'
    };

    const response = await request(app)
      .post('/api/messages/schedule')
      .send(payload);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.message).toBe(payload.message);
    expect(response.body.data.status).toBe('pending');
    expect(response.body.data.targetExecutionTime).toBeDefined();
  });

  test('Task 2.2: POST /api/messages/schedule - immediate execution for past/now timestamp and inserts into DB', async () => {
    const payload = {
      message: 'Urgent immediate policy notification',
      day: 'today',
      time: '00:01' // Past time today -> executed immediately
    };

    const response = await request(app)
      .post('/api/messages/schedule')
      .send(payload);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);

    // Wait a brief moment for setImmediate / DB write
    await new Promise((r) => setTimeout(r, 600));

    // Verify message was inserted into messages collection
    const inserted = await Message.findOne({ message: payload.message });
    expect(inserted).not.toBeNull();
    expect(inserted.message).toBe(payload.message);
    expect(inserted.insertedAt).toBeDefined();
  });

  test('Task 2.2: GET /api/messages - returns inserted messages', async () => {
    const response = await request(app).get('/api/messages');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.count).toBeGreaterThan(0);
  });

  test('Frontend Dashboard: GET / - serves interactive HTML dashboard', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/html/);
    expect(response.text).toContain('PolicyHub');
    expect(response.text).toContain('Worker Thread File Ingestion');
  });

  test('API Info: GET /api/info - returns API documentation dictionary', async () => {
    const response = await request(app).get('/api/info');
    expect(response.status).toBe(200);
    expect(response.body.name).toBe('Insurance Policy Management API');
  });
});

