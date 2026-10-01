const express = require('express');
const {
  searchPoliciesByUsername,
  getAggregatedPoliciesByUser,
  getAllPolicies
} = require('../controllers/policyController');

const router = express.Router();

// Task 1.2: Search API to find policy info with the help of the username
router.get('/search', searchPoliciesByUsername);

// Task 1.3: API to provide aggregated policy by each user
router.get('/aggregate-by-user', getAggregatedPoliciesByUser);

// Helper: list all policies
router.get('/', getAllPolicies);

module.exports = router;
