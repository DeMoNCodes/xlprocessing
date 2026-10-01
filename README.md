# Insurance Policy Management Backend Assessment

A production-ready Node.js backend application fulfilling all technical assessment requirements using **JavaScript**, **Worker Threads**, **MongoDB (Mongoose)**, **Cluster Process Supervision**, and **Scheduled Task Management**.

---

## 📋 Table of Contents
1. [Overview & Requirements Coverage](#overview--requirements-coverage)
2. [Database Collections & Schemas](#database-collections--schemas)
3. [Architecture & Key Highlights](#architecture--key-highlights)
4. [Project Structure](#project-structure)
5. [Installation & Setup](#installation--setup)
6. [API Endpoints Documentation](#api-endpoints-documentation)
   - [Task 1: Policy Management APIs](#task-1-policy-management-apis)
   - [Task 2: CPU Monitoring & Scheduled Messages](#task-2-cpu-monitoring--scheduled-messages)
7. [Testing & Verification](#testing--verification)
8. [Postman Collection](#postman-collection)

---

## 🎯 Overview & Requirements Coverage

| Task | Requirement | Status | Implementation Details |
|---|---|---|---|
| **Frontend UI** | Interactive Web Dashboard |  Completed | Responsive SPA dashboard served directly at `http://localhost:5000/` with live CPU meter, file upload, search, aggregation, and message scheduler. |
| **Task 1.1** | Upload XLSX/CSV into MongoDB using Worker Threads |  Completed | Dedicated isolated `worker_threads` script (`fileUploadWorker.js`) parses spreadsheets and performs bulk upserts into MongoDB without blocking Node's main event loop. |
| **Task 1.2** | Search API to find policy info with help of username |  Completed | `GET /api/policies/search?username=...` queries users by name/email (case-insensitive regex) and returns populated policy records. |
| **Task 1.3** | API to provide aggregated policy by each user |  Completed | `GET /api/policies/aggregate-by-user` executes a MongoDB `$facet` & `$group` aggregation pipeline with pagination and user lookups. |
| **Task 1.4** | Separate MongoDB collections for Agent, User, User's Account, LOB, Carrier, Policy |  Completed | 6 distinct Mongoose schemas and collections with relational references (`ObjectId`). |
| **Task 2.1** | Track real-time CPU utilization and restart on 70% usage |  Completed | Real-time CPU delta tracking via `os.cpus()` in `cpuMonitorService.js`. When CPU reaches or exceeds 70%, the server executes a graceful shutdown, and the Primary Cluster Supervisor in `index.js` immediately respawns a clean server worker. |
| **Task 2.2** | Post-service to schedule and insert message at day and time |  Completed | `POST /api/messages/schedule` parses `message`, `day`, and `time`, stores scheduled tasks in DB, and inserts into the `messages` collection at that exact moment. Includes DB recovery so pending jobs survive server restarts. |

---

## 🗄️ Database Collections & Schemas

The assessment mandates 6 separate MongoDB collections for Task 1, plus 2 auxiliary collections for Task 2:

1. **`agents` (Agent)**:
   - `agentName`: String (required, indexed)
   - `createdAt`, `updatedAt`

2. **`users` (User)**:
   - `firstName`: String (required, indexed)
   - `dob`: String
   - `address`: String
   - `phoneNumber`: String
   - `state`: String
   - `zipCode`: String
   - `email`: String (indexed)
   - `gender`: String
   - `userType`: String
   - `createdAt`, `updatedAt`

3. **`user_accounts` (User's Account)**:
   - `accountName`: String (required, indexed)
   - `userId`: ObjectId (ref: `User`)
   - `createdAt`, `updatedAt`

4. **`policy_categories` (Policy Category / LOB)**:
   - `category_name`: String (required, unique, indexed)
   - `createdAt`, `updatedAt`

5. **`policy_carriers` (Policy Carrier / Company)**:
   - `company_name`: String (required, unique, indexed)
   - `createdAt`, `updatedAt`

6. **`policies` (Policy Info)**:
   - `policy_number`: String (required, unique, indexed)
   - `policy_start_date`: Date
   - `policy_end_date`: Date
   - `policy_category_id`: ObjectId (ref: `PolicyCategory`, required, indexed)
   - `company_id`: ObjectId (ref: `PolicyCarrier`, required, indexed)
   - `user_id`: ObjectId (ref: `User`, required, indexed)
   - `agent_id`: ObjectId (ref: `Agent`, indexed)
   - `account_id`: ObjectId (ref: `UserAccount`, indexed)
   - `premium_amount`: Number
   - `policy_type`: String

7. **`scheduled_messages` & `messages` (Task 2.2)**:
   - Stores scheduled messages and the resulting inserted messages upon target date/time execution.

---

## 🏗️ Architecture & Key Highlights

### 1. Multi-threaded File Ingestion (`worker_threads`)
Large file parsing and relational database operations can freeze the Node.js event loop.
- When an XLSX or CSV file is uploaded to `POST /api/upload`, Express receives the file via `multer` and delegates execution to `src/workers/fileUploadWorker.js` through a `Worker` instance.
- The worker runs on an isolated thread, establishes a connection to MongoDB, parses spreadsheet rows, resolves/creates relational IDs using in-memory caches, and executes bulk database writes.
- Once finished, the worker sends back execution stats and terminates cleanly.

### 2. Real-Time CPU Monitoring & Native Auto-Restart
- `src/services/cpuMonitorService.js` samples CPU ticks using `os.cpus()` every 2 seconds.
- If real-time CPU utilization reaches or exceeds **70%**, an alert is triggered.
- `src/index.js` implements a native Node.js **Cluster Supervisor**:
  - The supervisor runs as the Primary process and manages the server worker.
  - Upon receiving the restart event (or worker exit with status `100`), the supervisor gracefully forks a fresh server worker.
  - This guarantees self-healing and zero downtime without relying on external third-party daemons.

### 3. Persistent Scheduled Message Service
- Messages scheduled for future execution are persisted in MongoDB (`scheduled_messages`).
- If the server restarts due to the 70% CPU threshold or machine maintenance, the `SchedulerService` automatically queries and restores all pending jobs upon server startup, guaranteeing that scheduled messages are never lost.

---

## 📁 Project Structure

```
interview/
├── package.json               # Dependencies and scripts
├── .env.example               # Environment variables template
├── .env                       # Local environment configuration
├── postman_collection.json    # Postman test collection
├── sample-data/
│   ├── sample_policies.xlsx   # Realistic sample Excel file (50 records)
│   └── sample_policies.csv    # Realistic sample CSV file (50 records)
├── scripts/
│   └── generateSampleData.js  # Script to generate mock data files
├── tests/
│   ├── api.test.js            # Automated integration test suite (Jest + Supertest)
│   └── cpu-test.js            # Standalone test for CPU monitoring and auto-restart
├── src/
│   ├── index.js               # Primary Cluster Supervisor (manages worker lifecycle)
│   ├── server.js              # Express server lifecycle & graceful restart
│   ├── app.js                 # Express application & route configuration
│   ├── config/
│   │   └── db.js              # MongoDB connection via Mongoose
│   ├── models/
│   │   ├── Agent.js
│   │   ├── User.js
│   │   ├── UserAccount.js
│   │   ├── PolicyCategory.js
│   │   ├── PolicyCarrier.js
│   │   ├── Policy.js
│   │   ├── ScheduledMessage.js
│   │   └── Message.js
│   ├── workers/
│   │   └── fileUploadWorker.js# Worker thread for XLSX/CSV processing
│   ├── services/
│   │   ├── fileUploadService.js
│   │   ├── cpuMonitorService.js
│   │   └── schedulerService.js
│   ├── controllers/
│   │   ├── uploadController.js
│   │   ├── policyController.js
│   │   ├── messageController.js
│   │   └── systemController.js
│   ├── routes/
│   │   ├── uploadRoutes.js
│   │   ├── policyRoutes.js
│   │   ├── messageRoutes.js
│   │   ├── systemRoutes.js
│   │   └── index.js
│   └── utils/
│       ├── dateHelper.js
│       └── logger.js
└── uploads/                   # Temporary upload buffer
```

---

## 🚀 Installation & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.x, v20.x, or v22.x)
- [MongoDB](https://www.mongodb.com/) (Running locally on `mongodb://127.0.0.1:27017` or MongoDB Atlas URI)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment
Copy `.env.example` to `.env` (already configured for local MongoDB):
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/policy_assessment_db
CPU_RESTART_THRESHOLD=70
CPU_CHECK_INTERVAL_MS=2000
NODE_ENV=development
```

### Step 3: Generate Sample Data (Optional)
Generates `sample_policies.xlsx` and `sample_policies.csv` with 50 realistic records:
```bash
npm run generate-data
```

### Step 4: Start the Server
```bash
npm start
```
*The server will start at `http://localhost:5000` under the Cluster Supervisor.*

---

## 📡 API Endpoints Documentation

### Task 1: Policy Management APIs

#### 1. Upload XLSX / CSV Data (Worker Threads)
- **Method**: `POST`
- **URL**: `/api/upload`
- **Body**: `multipart/form-data` with field `file` (`.xlsx` or `.csv`)
- **Example Response (200 OK)**:
```json
{
  "success": true,
  "message": "File successfully processed and ingested into MongoDB via Worker Thread.",
  "file": "sample_policies.xlsx",
  "stats": {
    "totalRows": 50,
    "processedRows": 50,
    "uniqueAgents": 5,
    "uniqueUsers": 10,
    "uniqueAccounts": 10,
    "uniqueCategories": 5,
    "uniqueCarriers": 6,
    "policiesHandled": 50
  }
}
```

#### 2. Search Policy Info by Username
- **Method**: `GET`
- **URL**: `/api/policies/search?username=John`
- **Query Parameters**:
  - `username` (required): First name or email of user (case-insensitive)
- **Example Response (200 OK)**:
```json
{
  "success": true,
  "searchTerm": "John",
  "matchedUsersCount": 1,
  "policiesCount": 5,
  "data": [
    {
      "_id": "6abe674f0e5b5c9d19f5e231",
      "policy_number": "POL-10001",
      "policy_start_date": "2024-01-01T00:00:00.000Z",
      "policy_end_date": "2025-01-01T00:00:00.000Z",
      "premium_amount": 500,
      "policy_type": "Comprehensive",
      "user_id": {
        "_id": "6abe674f0e5b5c9d19f5e201",
        "firstName": "John",
        "email": "john.doe@example.com",
        "phoneNumber": "555-0101",
        "address": "123 Elm St, Beverly Hills",
        "state": "CA",
        "zipCode": "90210"
      },
      "policy_category_id": {
        "_id": "6abe674f0e5b5c9d19f5e215",
        "category_name": "Auto Insurance"
      },
      "company_id": {
        "_id": "6abe674f0e5b5c9d19f5e220",
        "company_name": "Progressive Insurance"
      },
      "agent_id": {
        "_id": "6abe674f0e5b5c9d19f5e210",
        "agentName": "Alex Johnson"
      }
    }
  ]
}
```

#### 3. Aggregated Policy by Each User
- **Method**: `GET`
- **URL**: `/api/policies/aggregate-by-user?page=1&limit=20`
- **Query Parameters**:
  - `page` (optional, default: 1)
  - `limit` (optional, default: 50)
- **Example Response (200 OK)**:
```json
{
  "success": true,
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalPages": 1,
    "totalUsers": 10
  },
  "data": [
    {
      "userId": "6abe674f0e5b5c9d19f5e201",
      "userName": "John",
      "email": "john.doe@example.com",
      "phone": "555-0101",
      "userType": "Individual",
      "state": "CA",
      "totalPolicies": 5,
      "totalPremiumAmount": 4250.75,
      "policyNumbers": ["POL-10001", "POL-10011", "POL-10021", "POL-10031", "POL-10041"],
      "policies": [...]
    }
  ]
}
```

---

### Task 2: CPU Monitoring & Scheduled Messages

#### 1. Real-time CPU Utilization Status
- **Method**: `GET`
- **URL**: `/api/system/cpu-status`
- **Example Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "cpuPercentage": 12,
    "threshold": 70,
    "cores": 16,
    "freeMemoryMB": 2480,
    "totalMemoryMB": 15691,
    "processUptimeSeconds": 145,
    "systemUptimeSeconds": 23890
  }
}
```

#### 2. Simulate High CPU (Test Auto-Restart)
- **Method**: `POST`
- **URL**: `/api/system/simulate-high-cpu`
- **Body**:
```json
{
  "targetUsage": 85,
  "durationMs": 3000
}
```
*Triggers high CPU simulation. When usage hits >= 70%, the server worker gracefully restarts, and the cluster supervisor immediately spins up a new worker process.*

#### 3. Post-Service for Scheduled Message Insertion
- **Method**: `POST`
- **URL**: `/api/messages/schedule`
- **Body**:
```json
{
  "message": "Policy premium renewal notice for John Doe",
  "day": "2026-10-02",
  "time": "14:30"
}
```
- **Example Response (201 Created)**:
```json
{
  "success": true,
  "message": "Message successfully scheduled for insertion at specified day and time.",
  "data": {
    "id": "6abe677e0e5b5c9d19f5e277",
    "message": "Policy premium renewal notice for John Doe",
    "day": "2026-10-02",
    "time": "14:30",
    "targetExecutionTime": "2026-10-02T09:00:00.000Z",
    "status": "pending"
  }
}
```
*At the scheduled day and time, this message will be automatically inserted into the `messages` collection in MongoDB.*

#### 4. List Inserted Messages
- **Method**: `GET`
- **URL**: `/api/messages`
- **Description**: Returns all messages that have been inserted into DB by the scheduled job runner.

---

## 🧪 Testing & Verification

### Run Automated Integration Tests (Jest + Supertest)
```bash
npm test
```
**Test Results:**
```
PASS tests/api.test.js
  Task 1: Insurance Policy Management APIs
    √ Task 1.1 & 1.4: POST /api/upload - should upload XLSX/CSV via Worker Thread and populate 6 collections
    √ Task 1.1: POST /api/upload - should upload XLSX file via Worker Thread and update collections
    √ Task 1.2: GET /api/policies/search - find policy info with the help of username
    √ Task 1.2: GET /api/policies/search - returns 404 for non-existent user
    √ Task 1.3: GET /api/policies/aggregate-by-user - provide aggregated policies grouped by user
  Task 2: CPU Monitoring & Scheduled Message Service
    √ Task 2.1: GET /api/system/cpu-status - returns real-time CPU utilization metrics
    √ Task 2.2: POST /api/messages/schedule - schedules message for specific day and time
    √ Task 2.2: POST /api/messages/schedule - immediate execution for past/now timestamp and inserts into DB
    √ Task 2.2: GET /api/messages - returns inserted messages

Test Suites: 1 passed, 1 total
Tests:       9 passed, 9 total
```

### Run Standalone CPU Auto-Restart Test
```bash
node tests/cpu-test.js
```

---

## 📦 Postman Collection
Import `postman_collection.json` directly into [Postman](https://www.postman.com/) to test all routes interactively with pre-configured requests, bodies, and query parameters.
