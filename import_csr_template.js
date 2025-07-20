import fs from 'fs';
import path from 'path';

// Read the CSR template data
const templateData = JSON.parse(fs.readFileSync('csr_template_data.json', 'utf8'));

// Define role mappings for different types of tasks
const roleAssignments = {
  'Confirm Meeting Date & Time with Client': 'client_service_member',
  'Enter Dates into ASANA': 'admin_assistant',
  'Submit Proposed Dates/Time for DRPM': 'admin_assistant',
  'Update New Meeting in ASANA and Create Meeting': 'admin_assistant',
  'Send Out Expectation Email #1 to Team Through Asana': 'admin_assistant',
  'Submit Your Items Still Needed & Initial Highest Priority Conversation Reports': 'client_service_member',
  'Consolidate Items Still Needed and Send to SMEs': 'client_service_member',
  'Consolidate Highest Priority Conversations & Update Meeting Agenda': 'client_service_member',
  'Request Account Values for Any Outside Accounts and Transactions': 'admin_assistant',
  'Request Actions Taken Since Last Meeting by Team and Client': 'admin_assistant',
  'Download Account Values & Transactions for Growth Accounts': 'admin_assistant',
  'Create Circle Chart': 'financial_planner',
  'Financial Planner Review Circle Chart': 'financial_planner',
  'Tax Planner Review Circle Chart': 'tax_planner',
  'Estate Attorney Review Circle Chart': 'estate_attorney',
  'Insurance Planner Review Circle Chart': 'insurance_life_ltc_disability',
  'Money Manager Review Circle Chart': 'money_manager',
  'Finalize Circle Chart': 'financial_planner',
  'Send Circle Chart to Team': 'admin_assistant',
  'DRPM Meeting': 'client_service_member',
  'Update Meeting Agenda Based on DRPM': 'client_service_member',
  'Send Final Meeting Agenda to Team': 'admin_assistant',
  'Prepare Meeting Materials': 'admin_assistant',
  'Send Meeting Materials to Client': 'admin_assistant',
  'Conduct Progress Meeting': 'client_service_member',
  'Create Meeting Notes': 'admin_assistant',
  'Send Meeting Summary to Client': 'admin_assistant',
  'Update Client Records': 'admin_assistant',
  'Schedule Follow-up Actions': 'admin_assistant'
};

// Define due date offsets (days from meeting date)
const dueDateOffsets = {
  'Confirming & Scheduling Meeting Dates & Times': {
    'Confirm Meeting Date & Time with Client': -80,
    'Enter Dates into ASANA': -78,
    'Submit Proposed Dates/Time for DRPM': -76,
    'Update New Meeting in ASANA and Create Meeting': -74,
    'Send Out Expectation Email #1 to Team Through Asana': -72
  },
  'Preparing for & Gathering Information for Meetings': {
    'Submit Your Items Still Needed & Initial Highest Priority Conversation Reports': -70,
    'Consolidate Items Still Needed and Send to SMEs': -65,
    'Consolidate Highest Priority Conversations & Update Meeting Agenda': -60,
    'Request Account Values for Any Outside Accounts and Transactions': -55,
    'Request Actions Taken Since Last Meeting by Team and Client': -50,
    'Download Account Values & Transactions for Growth Accounts': -45
  },
  'Preparing for DRPM': {
    'Create Circle Chart': -40,
    'Financial Planner Review Circle Chart': -35,
    'Tax Planner Review Circle Chart': -30,
    'Estate Attorney Review Circle Chart': -25,
    'Insurance Planner Review Circle Chart': -20,
    'Money Manager Review Circle Chart': -15,
    'Finalize Circle Chart': -10,
    'Send Circle Chart to Team': -8,
    'DRPM Meeting': -5,
    'Update Meeting Agenda Based on DRPM': -3,
    'Send Final Meeting Agenda to Team': -2,
    'Prepare Meeting Materials': -1
  },
  'Preparing for Progress Meeting': {
    'Send Meeting Materials to Client': -1,
    'Conduct Progress Meeting': 0
  },
  'After Progress Meeting': {
    'Create Meeting Notes': 1,
    'Send Meeting Summary to Client': 2,
    'Update Client Records': 3,
    'Schedule Follow-up Actions': 4
  }
};

// Convert priority text to numbers
const priorityMap = {
  'high': 40,
  'medium': 25,
  'low': 10
};

// Generate SQL insert statements
let sqlStatements = [];
let taskId = 300; // Starting task ID

// First, get the milestone IDs for the CSR template
const milestoneIds = {
  'Confirming & Scheduling Meeting Dates & Times': 26,
  'Preparing for & Gathering Information for Meetings': 27,
  'Preparing for DRPM': 28,
  'Preparing for Progress Meeting': 29,
  'After Progress Meeting': 30
};

// Generate tasks for each section
Object.entries(templateData.sections).forEach(([sectionName, tasks]) => {
  const milestoneId = milestoneIds[sectionName];
  if (!milestoneId) return;
  
  tasks.forEach(task => {
    const daysFromMeeting = dueDateOffsets[sectionName]?.[task.title] || 0;
    const assignedToRole = roleAssignments[task.title] || null;
    const priority = priorityMap[task.priority] || 25;
    
    const sql = `INSERT INTO tasks (id, title, description, milestone_id, assigned_to_role, priority, days_from_meeting, status, created_at, updated_at, created_by) VALUES (${taskId}, '${task.title.replace(/'/g, "''")}', '${task.description.replace(/'/g, "''")}', ${milestoneId}, ${assignedToRole ? `'${assignedToRole}'` : 'NULL'}, ${priority}, ${daysFromMeeting}, 'todo', NOW(), NOW(), '44905818');`;
    
    sqlStatements.push(sql);
    taskId++;
  });
});

// Write SQL to file
fs.writeFileSync('import_csr_tasks.sql', sqlStatements.join('\n'));

console.log(`Generated ${sqlStatements.length} SQL statements to import CSR template tasks.`);
console.log('Run the import_csr_tasks.sql file to import all tasks.');