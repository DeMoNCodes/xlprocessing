const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const agents = ['Alex Johnson', 'Sarah Connor', 'Michael Scott', 'Jessica Pearson', 'Harvey Specter'];
const carriers = ['Progressive Insurance', 'State Farm', 'Geico', 'Allstate Corp', 'Liberty Mutual', 'Travelers'];
const categories = ['Auto Insurance', 'Health Insurance', 'Life Insurance', 'Homeowners Insurance', 'Commercial Property'];
const policyTypes = ['Comprehensive', 'Standard', 'Premium Care', 'Collision & Liability', 'Term Life 20yr'];

const users = [
  { firstname: 'John', email: 'john.doe@example.com', phone: '555-0101', state: 'CA', zip: '90210', gender: 'Male', dob: '1988-04-12', address: '123 Elm St, Beverly Hills', userType: 'Individual' },
  { firstname: 'Jane', email: 'jane.smith@example.com', phone: '555-0102', state: 'NY', zip: '10001', gender: 'Female', dob: '1992-09-23', address: '456 Broadway, New York', userType: 'Individual' },
  { firstname: 'Robert', email: 'robert.brown@example.com', phone: '555-0103', state: 'TX', zip: '75001', gender: 'Male', dob: '1975-11-05', address: '789 Lone Star Way, Dallas', userType: 'Commercial' },
  { firstname: 'Emily', email: 'emily.davis@example.com', phone: '555-0104', state: 'FL', zip: '33101', gender: 'Female', dob: '1995-02-18', address: '321 Ocean Drive, Miami', userType: 'Individual' },
  { firstname: 'Michael', email: 'michael.wilson@example.com', phone: '555-0105', state: 'IL', zip: '60601', gender: 'Male', dob: '1983-07-30', address: '654 Michigan Ave, Chicago', userType: 'Individual' },
  { firstname: 'Sophia', email: 'sophia.taylor@example.com', phone: '555-0106', state: 'WA', zip: '98101', gender: 'Female', dob: '1990-12-14', address: '987 Pine St, Seattle', userType: 'Commercial' },
  { firstname: 'David', email: 'david.miller@example.com', phone: '555-0107', state: 'CO', zip: '80201', gender: 'Male', dob: '1986-05-22', address: '147 Mountain View, Denver', userType: 'Individual' },
  { firstname: 'Olivia', email: 'olivia.martinez@example.com', phone: '555-0108', state: 'AZ', zip: '85001', gender: 'Female', dob: '1993-08-09', address: '258 Desert Bloom, Phoenix', userType: 'Individual' },
  { firstname: 'Daniel', email: 'daniel.anderson@example.com', phone: '555-0109', state: 'MA', zip: '02101', gender: 'Male', dob: '1979-03-17', address: '369 Beacon St, Boston', userType: 'Commercial' },
  { firstname: 'Ava', email: 'ava.thomas@example.com', phone: '555-0110', state: 'GA', zip: '30301', gender: 'Female', dob: '1996-10-25', address: '741 Peachtree Rd, Atlanta', userType: 'Individual' }
];

const rows = [];
let policyCounter = 10001;

// Generate 50 realistic records
for (let i = 0; i < 50; i++) {
  const user = users[i % users.length];
  const agent = agents[i % agents.length];
  const carrier = carriers[i % carriers.length];
  const category = categories[i % categories.length];
  const policyType = policyTypes[i % policyTypes.length];
  const policyNumber = `POL-${policyCounter++}`;

  const startYear = 2024 + (i % 2);
  const startMonth = String((i % 12) + 1).padStart(2, '0');
  const startDate = `${startYear}-${startMonth}-01`;
  const endDate = `${startYear + 1}-${startMonth}-01`;
  const premium = Math.round((500 + (i * 47.75) % 2500) * 100) / 100;
  const accountName = `${user.firstname} ${user.userType === 'Commercial' ? 'Holdings LLC' : 'Primary Account'}`;

  rows.push({
    agent: agent,
    userType: user.userType,
    policy_number: policyNumber,
    premium_amount: premium,
    policy_type: policyType,
    company_name: carrier,
    category_name: category,
    policy_start_date: startDate,
    policy_end_date: endDate,
    account_name: accountName,
    email: user.email,
    gender: user.gender,
    firstname: user.firstname,
    phone: user.phone,
    address: user.address,
    state: user.state,
    zip: user.zip,
    dob: user.dob
  });
}

const sampleDir = path.resolve(__dirname, '../sample-data');
if (!fs.existsSync(sampleDir)) {
  fs.mkdirSync(sampleDir, { recursive: true });
}

// 1. Create XLSX file
const worksheet = XLSX.utils.json_to_sheet(rows);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'PolicyData');
const xlsxPath = path.join(sampleDir, 'sample_policies.xlsx');
XLSX.writeFile(workbook, xlsxPath);
console.log(`[Success] Generated sample Excel file: ${xlsxPath} (${rows.length} rows)`);

// 2. Create CSV file
const csvContent = XLSX.utils.sheet_to_csv(worksheet);
const csvPath = path.join(sampleDir, 'sample_policies.csv');
fs.writeFileSync(csvPath, csvContent, 'utf-8');
console.log(`[Success] Generated sample CSV file: ${csvPath} (${rows.length} rows)`);
