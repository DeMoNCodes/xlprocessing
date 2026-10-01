const User = require('../models/User');
const Policy = require('../models/Policy');
const PolicyCategory = require('../models/PolicyCategory');
const PolicyCarrier = require('../models/PolicyCarrier');
const Agent = require('../models/Agent');
const UserAccount = require('../models/UserAccount');
const logger = require('../utils/logger');

/**
 * Task 1.2: Search API to find policy info with the help of the username
 * Query param: username (matches firstName or email)
 */
const searchPoliciesByUsername = async (req, res) => {
  try {
    const { username, name } = req.query;
    const searchTerm = username || name;

    if (!searchTerm || typeof searchTerm !== 'string' || searchTerm.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Please provide a username to search (e.g. ?username=John)'
      });
    }

    const trimmed = searchTerm.trim();
    // Search users matching username / firstName or email (case-insensitive regex)
    const users = await User.find({
      $or: [
        { firstName: { $regex: new RegExp(trimmed, 'i') } },
        { email: { $regex: new RegExp(trimmed, 'i') } }
      ]
    });

    if (!users || users.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No user found matching username "${trimmed}".`,
        results: []
      });
    }

    const userIds = users.map((u) => u._id);

    // Find all policies for matched users, populating category, carrier, agent, and user
    const policies = await Policy.find({ user_id: { $in: userIds } })
      .populate('user_id', 'firstName email phoneNumber address state zipCode gender userType')
      .populate('policy_category_id', 'category_name')
      .populate('company_id', 'company_name')
      .populate('agent_id', 'agentName')
      .populate('account_id', 'accountName');

    return res.status(200).json({
      success: true,
      searchTerm: trimmed,
      matchedUsersCount: users.length,
      policiesCount: policies.length,
      data: policies
    });
  } catch (error) {
    logger.error(`Search policies error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to search policies.',
      error: error.message
    });
  }
};

/**
 * Task 1.3: API to provide aggregated policy by each user
 */
const getAggregatedPoliciesByUser = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const pipeline = [
      {
        $group: {
          _id: '$user_id',
          totalPolicies: { $sum: 1 },
          totalPremiumAmount: { $sum: '$premium_amount' },
          policyNumbers: { $push: '$policy_number' },
          policies: {
            $push: {
              policy_number: '$policy_number',
              policy_type: '$policy_type',
              premium_amount: '$premium_amount',
              policy_start_date: '$policy_start_date',
              policy_end_date: '$policy_end_date',
              policy_category_id: '$policy_category_id',
              company_id: '$company_id',
              agent_id: '$agent_id'
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: {
          path: '$user',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          userName: '$user.firstName',
          email: '$user.email',
          phone: '$user.phoneNumber',
          userType: '$user.userType',
          state: '$user.state',
          totalPolicies: 1,
          totalPremiumAmount: { $round: ['$totalPremiumAmount', 2] },
          policyNumbers: 1,
          policies: 1
        }
      },
      {
        $sort: { totalPolicies: -1, userName: 1 }
      },
      {
        $facet: {
          metadata: [{ $count: 'totalUsersWithPolicies' }],
          data: [{ $skip: skip }, { $limit: limit }]
        }
      }
    ];

    const result = await Policy.aggregate(pipeline);
    const totalCount = result[0].metadata[0] ? result[0].metadata[0].totalUsersWithPolicies : 0;
    const data = result[0].data || [];

    return res.status(200).json({
      success: true,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit) || 1,
        totalUsers: totalCount
      },
      data
    });
  } catch (error) {
    logger.error(`Aggregation error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to aggregate policies by user.',
      error: error.message
    });
  }
};

/**
 * Helper: List all policies with pagination
 */
const getAllPolicies = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const [total, policies] = await Promise.all([
      Policy.countDocuments(),
      Policy.find()
        .skip(skip)
        .limit(limit)
        .populate('user_id', 'firstName email phoneNumber')
        .populate('policy_category_id', 'category_name')
        .populate('company_id', 'company_name')
        .populate('agent_id', 'agentName')
    ]);

    return res.status(200).json({
      success: true,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        total
      },
      data: policies
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  searchPoliciesByUsername,
  getAggregatedPoliciesByUser,
  getAllPolicies
};
