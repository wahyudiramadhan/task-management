/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TaskStatus = 'backlog' | 'in_progress' | 'review' | 'done';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type TaskQuadrant = 1 | 2 | 3 | 4;
// 1 = Urgent & Important (Do First)
// 2 = Not Urgent & Important (Schedule)
// 3 = Urgent & Not Important (Delegate)
// 4 = Not Urgent & Not Important (Eliminate / Backlog)

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface TaskAttachment {
  id: string;
  name: string;
  dataUrl: string; // Base64 or image URL
  size: number;
  uploadedAt: string;
}

export interface PICPerson {
  name: string;
  email: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  quadrant: TaskQuadrant;
  dueDate: string; // YYYY-MM-DD or YYYY-MM-DD HH:mm
  tags: string[];
  subtasks: SubTask[];
  images?: TaskAttachment[];
  picProgrammer?: PICPerson;
  picSupport?: PICPerson;
  picTester?: PICPerson;
  linkedCrId?: string;
  linkedBrdId?: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  syncStatus?: 'synced' | 'pending' | 'error';
}

export interface AIChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  suggestedTask?: Partial<Task>;
  timestamp: string;
}


// BRD (Business Requirements Document)
export interface BRDRequirement {
  id: string;
  reqCode: string;
  title: string;
  description: string;
  priority: 'must' | 'should' | 'could';
  linkedTaskId?: string;
}

export interface BRDDocument {
  id: string;
  code: string; // e.g. BRD-2026-001
  title: string;
  version: string;
  status: 'draft' | 'in_review' | 'approved' | 'superseded';
  owner: string;
  targetRelease: string;
  summary: string;
  businessObjectives: string[];
  requirements: BRDRequirement[];
  createdAt: string;
  updatedAt: string;
}

// CR (Change Request)
export type CRImpact = 'scope' | 'timeline' | 'cost' | 'architecture';
export type CRStatus = 'submitted' | 'under_review' | 'approved' | 'rejected' | 'implemented';

export interface ChangeRequest {
  id: string;
  crNumber: string; // e.g. CR-042
  title: string;
  description: string;
  justification: string;
  impactArea: CRImpact;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: CRStatus;
  requestedBy: string;
  assignedTo: string;
  linkedTaskId?: string;
  linkedBrdId?: string;
  createdAt: string;
  updatedAt: string;
}

// SIT & UIT (System Integration Testing & User Integration / Acceptance Testing)
export type TestType = 'SIT' | 'UIT';
export type TestStatus = 'untested' | 'passed' | 'failed' | 'blocked';
export type TestSeverity = 'critical' | 'major' | 'minor';

export interface TestCase {
  id: string;
  caseCode: string; // e.g. SIT-001 or UIT-001
  type: TestType;
  title: string;
  description: string;
  preconditions: string;
  steps: string;
  expectedResult: string;
  actualResult?: string;
  status: TestStatus;
  severity: TestSeverity;
  testedBy?: string;
  testedAt?: string;
  linkedTaskId?: string;
  notes?: string;
}

export interface SyncStatusState {
  isConfigured: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  pendingCount: number;
  lastError: string | null;
}

export const INITIAL_DEMO_TASKS: Task[] = [
  {
    id: 'task-1',
    title: 'Design Flutter Material 3 Navigation Rail',
    description: 'Implement adaptive navigation rail for tablet/desktop and navigation bar for mobile with smooth tab transitions.',
    status: 'in_progress',
    priority: 'high',
    quadrant: 1, // Urgent & Important
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
    tags: ['Flutter', 'UI', 'Material 3'],
    subtasks: [
      { id: 'st-1', title: 'Define theme color schemes', completed: true },
      { id: 'st-2', title: 'Add responsive breakpoint listener', completed: true },
      { id: 'st-3', title: 'Connect route animations', completed: false }
    ],
    picProgrammer: { name: 'Yudi Rahardian', email: 'YudiR413@gmail.com' },
    picSupport: { name: 'Alex Pratama', email: 'support@taskflow.dev' },
    picTester: { name: 'Siti Rahma', email: 'siti.qa@taskflow.dev' },
    images: [
      {
        id: 'img-demo-1',
        name: 'material3_nav_preview.png',
        dataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="180" viewBox="0 0 300 180"><rect width="300" height="180" fill="%234f46e5" rx="12"/><rect x="15" y="15" width="45" height="150" fill="%233730a3" rx="8"/><rect x="75" y="25" width="200" height="20" fill="%23ffffff" rx="4"/><rect x="75" y="60" width="90" height="90" fill="%236366f1" rx="8"/><rect x="180" y="60" width="90" height="90" fill="%23818cf8" rx="8"/><text x="95" y="165" font-family="sans-serif" font-size="11" fill="%23c7d2fe" font-weight="bold">Flutter Material 3 UI Mockup</text></svg>',
        size: 2800,
        uploadedAt: new Date().toISOString()
      }
    ],
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date().toISOString(),
    syncStatus: 'synced'
  },
  {
    id: 'task-2',
    title: 'Deploy Apps Script API Webhook',
    description: 'Paste Google Apps Script code to target Spreadsheet, authorize access and deploy as Web App (Anyone).',
    status: 'done',
    priority: 'urgent',
    quadrant: 1, // Urgent & Important
    dueDate: new Date().toISOString().slice(0, 10),
    tags: ['Google Sheets', 'Apps Script', 'API'],
    subtasks: [
      { id: 'st-4', title: 'Create spreadsheet header row', completed: true },
      { id: 'st-5', title: 'Configure doGet and doPost handlers', completed: true },
      { id: 'st-6', title: 'Test JSON response headers', completed: true }
    ],
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date().toISOString(),
    syncStatus: 'synced'
  },
  {
    id: 'task-3',
    title: 'Plan Q4 Architecture & Performance Milestones',
    description: 'Review database synchronization throughput, offline cache durability, and batch update latency.',
    status: 'backlog',
    priority: 'medium',
    quadrant: 2, // Important & Not Urgent
    dueDate: new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10),
    tags: ['Architecture', 'Planning'],
    subtasks: [
      { id: 'st-7', title: 'Profile HTTP latency for Google Apps Script', completed: false },
      { id: 'st-8', title: 'Write SQLite local caching benchmark', completed: false }
    ],
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date().toISOString(),
    syncStatus: 'synced'
  },
  {
    id: 'task-4',
    title: 'Coordinate team daily standup notes',
    description: 'Organize and distribute spreadsheet status updates to stakeholders via email digest.',
    status: 'review',
    priority: 'low',
    quadrant: 3, // Urgent & Not Important
    dueDate: new Date(Date.now() + 86400000 * 1).toISOString().slice(0, 10),
    tags: ['Coordination', 'Admin'],
    subtasks: [
      { id: 'st-9', title: 'Summarize blocked tickets', completed: true },
      { id: 'st-10', title: 'Draft update email', completed: false }
    ],
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    updatedAt: new Date().toISOString(),
    syncStatus: 'synced'
  },
  {
    id: 'task-5',
    title: 'Audit deprecated legacy assets',
    description: 'Clean up unused illustration assets and old sample spreadsheet rows from staging.',
    status: 'backlog',
    priority: 'low',
    quadrant: 4, // Not Urgent & Not Important
    dueDate: new Date(Date.now() + 86400000 * 14).toISOString().slice(0, 10),
    tags: ['Cleanup', 'Chore'],
    subtasks: [
      { id: 'st-11', title: 'Delete archived spreadsheet tabs', completed: false }
    ],
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    updatedAt: new Date().toISOString(),
    syncStatus: 'synced'
  }
];

export const INITIAL_DEMO_BRDS: BRDDocument[] = [
  {
    id: 'brd-1',
    code: 'BRD-2026-001',
    title: 'Google Sheets Integration & Mobile Sync Engine',
    version: '1.2.0',
    status: 'approved',
    owner: 'Product Lead & Enterprise Architecture',
    targetRelease: 'v2.0-Production',
    summary: 'Define requirements for using personal Google Spreadsheets as relational persistence with Google Apps Script as serverless Webhook API.',
    businessObjectives: [
      'Eliminate costly database cloud server hosting fees for internal task tracking',
      'Provide 100% data ownership within corporate Google Workspace drive',
      'Enable sub-500ms local optimistic UI with background synchronization'
    ],
    requirements: [
      { id: 'req-1', reqCode: 'REQ-01', title: 'Two-Way Apps Script CRUD Webhook', description: 'Web app must support doGet and doPost actions for getTasks, saveTask, and batch sync.', priority: 'must', linkedTaskId: 'task-2' },
      { id: 'req-2', reqCode: 'REQ-02', title: 'Task Image Attachments Storage', description: 'Enable users to upload screenshots, diagrams, and receipts with thumbnail previews.', priority: 'must', linkedTaskId: 'task-1' },
      { id: 'req-3', reqCode: 'REQ-03', title: 'Offline-First Local Storage Fallback', description: 'App must function seamlessly when disconnected with queued synchronization.', priority: 'should', linkedTaskId: 'task-3' }
    ],
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString()
  }
];

export const INITIAL_DEMO_CRS: ChangeRequest[] = [
  {
    id: 'cr-1',
    crNumber: 'CR-2026-042',
    title: 'Add Inline Image Attachment Support for Task Execution',
    description: 'Allow stakeholders and testers to upload screenshot proof and diagram attachments directly to tasks.',
    justification: 'Critical for SIT & UIT defect reporting where visual evidence is required by QA.',
    impactArea: 'architecture',
    priority: 'high',
    status: 'approved',
    requestedBy: 'Senior QA Engineer',
    assignedTo: 'Lead Frontend Developer',
    linkedTaskId: 'task-1',
    linkedBrdId: 'brd-1',
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString()
  },
  {
    id: 'cr-2',
    crNumber: 'CR-2026-043',
    title: 'Automated SIT / UIT Test Run Matrix and Pass Rate Reporting',
    description: 'Provide dedicated test management console with execution tracking for System Integration Testing (SIT) and User Acceptance Testing (UIT).',
    justification: 'Ensure compliance before releasing changes to production.',
    impactArea: 'scope',
    priority: 'critical',
    status: 'implemented',
    requestedBy: 'Test Automation Lead',
    assignedTo: 'Full-Stack Engineer',
    linkedTaskId: 'task-2',
    linkedBrdId: 'brd-1',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const INITIAL_DEMO_TEST_CASES: TestCase[] = [
  {
    id: 'tc-1',
    caseCode: 'SIT-001',
    type: 'SIT',
    title: 'Verify Google Apps Script POST Webhook JSON Serialization',
    description: 'Ensure payload sent with action: "createTask" inserts row accurately into the Google Sheet.',
    preconditions: 'Apps Script deployed as Web App with access set to Anyone.',
    steps: '1. Navigate to Sheets Setup tab\n2. Enter Web App URL\n3. Click Save & Test Ping\n4. Dispatch createTask payload',
    expectedResult: 'HTTP 200 returned with { success: true, taskId: ... } and row appended in Sheets.',
    actualResult: 'Tested in dev environment: 200 OK received in 420ms.',
    status: 'passed',
    severity: 'critical',
    testedBy: 'DevOps / QA Engineer',
    testedAt: new Date(Date.now() - 86400000 * 1).toISOString().slice(0, 10),
    linkedTaskId: 'task-2',
    notes: 'Latency averaged 410ms over 5 test runs.'
  },
  {
    id: 'tc-2',
    caseCode: 'SIT-002',
    type: 'SIT',
    title: 'Validate Task Image Upload & Base64 Attachment Preview',
    description: 'Verify uploading a PNG/JPEG file stores base64 dataUrl, renders thumbnail, and opens in lightbox.',
    preconditions: 'Task modal open.',
    steps: '1. Click New Task\n2. In Attachments section, select image file\n3. Check thumbnail and preview\n4. Save task and re-open',
    expectedResult: 'Image persists in task, shows thumbnail on card, and expands on click.',
    actualResult: 'Image successfully rendered and stored in local cache & task attachments.',
    status: 'passed',
    severity: 'major',
    testedBy: 'Frontend QA',
    testedAt: new Date().toISOString().slice(0, 10),
    linkedTaskId: 'task-1'
  },
  {
    id: 'tc-3',
    caseCode: 'UIT-001',
    type: 'UIT',
    title: 'User Acceptance: Kanban Drag-and-Drop Workflow Transition',
    description: 'User moves task from In Progress to Done and verifies subtask checklist completion status.',
    preconditions: 'Task exists with 3 subtasks.',
    steps: '1. Open Kanban view\n2. Drag card to Done column\n3. Confirm visual status updates\n4. Verify sync status badge',
    expectedResult: 'Card moves smoothly, shows completion styling, and syncs.',
    actualResult: 'Smooth transition observed on desktop and touch devices.',
    status: 'passed',
    severity: 'major',
    testedBy: 'Product Stakeholder',
    testedAt: new Date().toISOString().slice(0, 10),
    linkedTaskId: 'task-1'
  },
  {
    id: 'tc-4',
    caseCode: 'UIT-002',
    type: 'UIT',
    title: 'User Acceptance: Change Request Approval to Task Execution Flow',
    description: 'Business sponsor approves CR-2026-042 and associates requirement REQ-02 with development task.',
    preconditions: 'CR in status under_review.',
    steps: '1. Open CR Manager\n2. Click Approve CR\n3. Verify status changes to approved\n4. Verify linked task indicator',
    expectedResult: 'Status updates to approved with audit log and linked task reference.',
    actualResult: '',
    status: 'untested',
    severity: 'critical',
    testedBy: 'Business Sponsor',
    linkedTaskId: 'task-1'
  }
];
