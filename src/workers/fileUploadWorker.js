const { parentPort, workerData } = require('worker_threads');
const mongoose = require('mongoose');
const XLSX = require('xlsx');

// Import models
const Agent = require('../models/Agent');
const User = require('../models/User');
const UserAccount = require('../models/UserAccount');
const PolicyCategory = require('../models/PolicyCategory');
const PolicyCarrier = require('../models/PolicyCarrier');
const Policy = require('../models/Policy');
const { parseAnyDate } = require('../utils/dateHelper');

// Flexible key finder to handle varied headers (e.g. 'First Name', 'firstname', 'first_name')
function getValue(row, keys) {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
      return String(row[k]).trim();
    }
    // Also check case-insensitive match
    const lowerK = k.toLowerCase().replace(/[\s_-]/g, '');
    for (const rowKey of Object.keys(row)) {
      if (rowKey.toLowerCase().replace(/[\s_-]/g, '') === lowerK) {
        if (row[rowKey] !== undefined && row[rowKey] !== null && String(row[rowKey]).trim() !== '') {
          return row[rowKey];
        }
      }
    }
  }
  return null;
}

async function processFile() {
  const { filePath, mongoUri } = workerData;

  try {
    // 1. Connect worker thread to MongoDB
    await mongoose.connect(mongoUri);

    // 2. Read spreadsheet / CSV file
    const workbook = XLSX.readFile(filePath, { cellDates: true });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (!rawRows || rawRows.length === 0) {
      throw new Error('The uploaded file contains no data.');
    }

    // In-memory caches to minimize redundant queries and enable fast batching
    const agentCache = new Map();     // agentName -> ObjectId
    const userCache = new Map();      // email || firstName -> ObjectId
    const accountCache = new Map();   // accountName -> ObjectId
    const categoryCache = new Map();  // category_name -> ObjectId
    const carrierCache = new Map();   // company_name -> ObjectId

    let processedCount = 0;
    const policiesToInsert = [];

    for (const row of rawRows) {
      // 1) Agent
      const rawAgentName = getValue(row, ['agent', 'agent_name', 'agentName', 'Agent Name']);
      const agentName = rawAgentName || 'General Agency';
      let agentId = agentCache.get(agentName);
      if (!agentId) {
        const agentDoc = await Agent.findOneAndUpdate(
          { agentName },
          { $setOnInsert: { agentName } },
          { upsert: true, new: true }
        );
        agentId = agentDoc._id;
        agentCache.set(agentName, agentId);
      }

      // 2) User
      const firstName = getValue(row, ['firstname', 'first_name', 'First Name', 'firstName', 'username', 'user_name', 'name']) || 'Unknown User';
      const email = (getValue(row, ['email', 'Email']) || '').toLowerCase();
      const dobRaw = getValue(row, ['dob', 'DOB', 'date_of_birth', 'Date of Birth']);
      const dob = dobRaw ? String(dobRaw) : '';
      const address = getValue(row, ['address', 'Address']) || '';
      const phoneNumber = getValue(row, ['phone', 'phoneNumber', 'phone_number', 'Phone']) || '';
      const state = getValue(row, ['state', 'State']) || '';
      const zipCode = getValue(row, ['zip', 'zipCode', 'zip_code', 'Zip Code', 'Zip']) || '';
      const gender = getValue(row, ['gender', 'Gender']) || '';
      const userType = getValue(row, ['userType', 'user_type', 'User Type']) || 'Customer';

      const userLookupKey = email || `${firstName}_${phoneNumber || zipCode}`;
      let userId = userCache.get(userLookupKey);
      if (!userId) {
        let userDoc;
        if (email) {
          userDoc = await User.findOneAndUpdate(
            { email },
            {
              $set: { firstName, dob, address, phoneNumber, state, zipCode, gender, userType }
            },
            { upsert: true, new: true }
          );
        } else {
          userDoc = await User.findOneAndUpdate(
            { firstName, phoneNumber },
            {
              $set: { dob, address, state, zipCode, email, gender, userType }
            },
            { upsert: true, new: true }
          );
        }
        userId = userDoc._id;
        userCache.set(userLookupKey, userId);
      }

      // 3) User's Account
      const rawAccountName = getValue(row, ['account_name', 'accountName', 'Account Name', 'account']);
      const accountName = rawAccountName || `${firstName}'s Account`;
      let accountId = accountCache.get(accountName);
      if (!accountId) {
        const accountDoc = await UserAccount.findOneAndUpdate(
          { accountName },
          {
            $setOnInsert: { accountName, userId }
          },
          { upsert: true, new: true }
        );
        accountId = accountDoc._id;
        accountCache.set(accountName, accountId);
      }

      // 4) Policy Category (LOB)
      const rawCategoryName = getValue(row, ['category_name', 'categoryName', 'Category Name', 'lob', 'LOB', 'Policy Category']);
      const categoryName = rawCategoryName || 'General Insurance';
      let categoryId = categoryCache.get(categoryName);
      if (!categoryId) {
        const categoryDoc = await PolicyCategory.findOneAndUpdate(
          { category_name: categoryName },
          { $setOnInsert: { category_name: categoryName } },
          { upsert: true, new: true }
        );
        categoryId = categoryDoc._id;
        categoryCache.set(categoryName, categoryId);
      }

      // 5) Policy Carrier
      const rawCompanyName = getValue(row, ['company_name', 'companyName', 'Company Name', 'carrier', 'Policy Carrier']);
      const companyName = rawCompanyName || 'Standard Mutual Insurance';
      let companyId = carrierCache.get(companyName);
      if (!companyId) {
        const carrierDoc = await PolicyCarrier.findOneAndUpdate(
          { company_name: companyName },
          { $setOnInsert: { company_name: companyName } },
          { upsert: true, new: true }
        );
        companyId = carrierDoc._id;
        carrierCache.set(companyName, companyId);
      }

      // 6) Policy Info
      const rawPolicyNum = getValue(row, ['policy_number', 'policyNumber', 'Policy Number', 'policy_no']);
      const policyNumber = rawPolicyNum || `POL-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

      const rawStartDate = getValue(row, ['policy_start_date', 'policyStartDate', 'Policy Start Date', 'start_date']);
      const rawEndDate = getValue(row, ['policy_end_date', 'policyEndDate', 'Policy End Date', 'end_date']);
      const policyStartDate = parseAnyDate(rawStartDate);
      const policyEndDate = parseAnyDate(rawEndDate);

      const rawPremium = getValue(row, ['premium_amount', 'premium', 'Premium Amount']);
      const premiumAmount = rawPremium ? parseFloat(rawPremium) || 0 : 0;
      const policyType = getValue(row, ['policy_type', 'policyType', 'Policy Type']) || 'Standard';

      policiesToInsert.push({
        policy_number: policyNumber,
        policy_start_date: policyStartDate,
        policy_end_date: policyEndDate,
        policy_category_id: categoryId,
        company_id: companyId,
        user_id: userId,
        agent_id: agentId,
        account_id: accountId,
        premium_amount: premiumAmount,
        policy_type: policyType
      });

      processedCount++;
    }

    // Bulk upsert policies to avoid duplicate errors on re-upload
    const policyBulkOps = policiesToInsert.map((p) => ({
      updateOne: {
        filter: { policy_number: p.policy_number },
        update: { $set: p },
        upsert: true
      }
    }));

    let insertedPolicies = 0;
    if (policyBulkOps.length > 0) {
      const bulkResult = await Policy.bulkWrite(policyBulkOps);
      insertedPolicies = (bulkResult.upsertedCount || 0) + (bulkResult.modifiedCount || 0);
    }

    // Disconnect mongoose in worker
    await mongoose.disconnect();

    // Send successful result back to parent thread
    parentPort.postMessage({
      success: true,
      stats: {
        totalRows: rawRows.length,
        processedRows: processedCount,
        uniqueAgents: agentCache.size,
        uniqueUsers: userCache.size,
        uniqueAccounts: accountCache.size,
        uniqueCategories: categoryCache.size,
        uniqueCarriers: carrierCache.size,
        policiesHandled: insertedPolicies || policiesToInsert.length
      }
    });
  } catch (error) {
    try {
      await mongoose.disconnect();
    } catch (_) {}
    parentPort.postMessage({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
}

processFile();
