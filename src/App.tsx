/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Smartphone,
  Plus,
  Trash2,
  RotateCcw,
  Sparkles,
  Info
} from 'lucide-react';
import {
  Task,
  TaskPriority,
  TaskQuadrant,
  TaskStatus,
  SyncStatusState,
  INITIAL_DEMO_TASKS,
  BRDDocument,
  ChangeRequest,
  TestCase,
  CRStatus,
  TestStatus,
  INITIAL_DEMO_BRDS,
  INITIAL_DEMO_CRS,
  INITIAL_DEMO_TEST_CASES
} from './types/task';
import {
  APPS_SCRIPT_URL_KEY,
  LOCAL_TASKS_KEY,
  fetchAllDataFromSheets,
  syncAllDataToSheets,
  saveTaskToSheets,
  deleteTaskFromSheets
} from './services/appsScriptApi';
import { TopBar, ActiveTab } from './components/TopBar';
import { KanbanView } from './components/KanbanView';
import { EisenhowerMatrixView } from './components/EisenhowerMatrixView';
import { CalendarView } from './components/CalendarView';
import { SheetsSetupModal } from './components/SheetsSetupModal';
import { FlutterExportView } from './components/FlutterExportView';
import { TaskModal } from './components/TaskModal';
import { RequirementsManagerView } from './components/RequirementsManagerView';
import { TestingCenterView } from './components/TestingCenterView';
import { AIAgentChatDrawer } from './components/AIAgentChatDrawer';

const LOCAL_BRDS_KEY = 'taskflow_brds_v1';
const LOCAL_CRS_KEY = 'taskflow_crs_v1';
const LOCAL_TEST_CASES_KEY = 'taskflow_test_cases_v1';

export default function App() {
  // State: Tasks (Respects saved state even if empty array)
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_TASKS_KEY);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (_) {}
    return INITIAL_DEMO_TASKS;
  });

  // State: BRDs (Respects saved state even if empty array)
  const [brds, setBrds] = useState<BRDDocument[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_BRDS_KEY);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (_) {}
    return INITIAL_DEMO_BRDS;
  });

  // State: CRs (Respects saved state even if empty array)
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_CRS_KEY);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (_) {}
    return INITIAL_DEMO_CRS;
  });

  // State: Test Cases (Respects saved state even if empty array)
  const [testCases, setTestCases] = useState<TestCase[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_TEST_CASES_KEY);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (_) {}
    return INITIAL_DEMO_TEST_CASES;
  });

  // State: Apps Script URL
  const [appsScriptUrl, setAppsScriptUrl] = useState<string>(() => {
    return localStorage.getItem(APPS_SCRIPT_URL_KEY) || '';
  });

  // State: Active Navigation Tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('kanban');

  // State: Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<TaskPriority | 'all'>('all');

  // State: Sync Status
  const [syncStatus, setSyncStatus] = useState<SyncStatusState>({
    isConfigured: !!appsScriptUrl,
    isSyncing: false,
    lastSyncedAt: null,
    pendingCount: 0,
    lastError: null
  });

  // State: Task Modal
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [modalDefaultStatus, setModalDefaultStatus] = useState<TaskStatus>('backlog');
  const [modalDefaultQuadrant, setModalDefaultQuadrant] = useState<TaskQuadrant>(1);
  const [modalDefaultDueDate, setModalDefaultDueDate] = useState<string>('');

  // Persist tasks locally on change
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(tasks));
    } catch (_) {}
  }, [tasks]);

  // Persist BRDs locally
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_BRDS_KEY, JSON.stringify(brds));
    } catch (_) {}
  }, [brds]);

  // Persist CRs locally
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_CRS_KEY, JSON.stringify(changeRequests));
    } catch (_) {}
  }, [changeRequests]);

  // Persist Test Cases locally
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_TEST_CASES_KEY, JSON.stringify(testCases));
    } catch (_) {}
  }, [testCases]);

  // Handle URL change
  const handleSaveAppsScriptUrl = (url: string) => {
    const trimmed = url.trim();
    setAppsScriptUrl(trimmed);
    localStorage.setItem(APPS_SCRIPT_URL_KEY, trimmed);
    setSyncStatus((prev) => ({
      ...prev,
      isConfigured: !!trimmed,
      lastError: null
    }));
  };

  // Sync task to Google Sheets in background
  const syncTaskToRemote = useCallback(
    async (task: Task) => {
      if (!appsScriptUrl) return;
      try {
        const res = await saveTaskToSheets(appsScriptUrl, task);
        if (res.success) {
          setSyncStatus((prev) => ({
            ...prev,
            lastSyncedAt: new Date().toLocaleTimeString(),
            lastError: null
          }));
        } else {
          setSyncStatus((prev) => ({
            ...prev,
            lastError: res.error || 'Failed to sync task'
          }));
        }
      } catch (err: unknown) {
        setSyncStatus((prev) => ({
          ...prev,
          lastError: err instanceof Error ? err.message : String(err)
        }));
      }
    },
    [appsScriptUrl]
  );

  // Sync deletion in background
  const syncDeleteToRemote = useCallback(
    async (taskId: string) => {
      if (!appsScriptUrl) return;
      try {
        await deleteTaskFromSheets(appsScriptUrl, taskId);
      } catch (_) {}
    },
    [appsScriptUrl]
  );

  // Trigger manual sync: Pull from Sheets (All 4 tables) with Safe Image & Task Merge
  const handlePullFromSheets = async () => {
    if (!appsScriptUrl) return;
    setSyncStatus((prev) => ({ ...prev, isSyncing: true, lastError: null }));

    try {
      const res = await fetchAllDataFromSheets(appsScriptUrl);
      if (res.success) {
        if (res.tasks && res.tasks.length > 0) {
          // Smart merge: NEVER wipe out local image attachments or un-synced tasks
          setTasks((prevTasks) => {
            const remoteMap = new Map(res.tasks!.map((rt) => [rt.id, rt]));
            const merged: Task[] = [];

            // Merge incoming remote tasks
            for (const remoteTask of res.tasks!) {
              const localTask = prevTasks.find((lt) => lt.id === remoteTask.id);
              if (localTask) {
                // If remote has no images, but local task already has image attachments, preserve local images!
                const preservedImages =
                  (!remoteTask.images || remoteTask.images.length === 0) &&
                  localTask.images &&
                  localTask.images.length > 0
                    ? localTask.images
                    : remoteTask.images || [];

                merged.push({
                  ...remoteTask,
                  images: preservedImages
                });
              } else {
                merged.push(remoteTask);
              }
            }

            // Also preserve any local tasks not yet on Google Sheets
            for (const localTask of prevTasks) {
              if (!remoteMap.has(localTask.id)) {
                merged.push(localTask);
              }
            }

            return merged;
          });
        }
        if (res.brds && res.brds.length > 0) setBrds(res.brds);
        if (res.changeRequests && res.changeRequests.length > 0) setChangeRequests(res.changeRequests);
        if (res.testCases && res.testCases.length > 0) setTestCases(res.testCases);

        setSyncStatus((prev) => ({
          ...prev,
          isSyncing: false,
          lastSyncedAt: new Date().toLocaleTimeString(),
          lastError: null
        }));
      } else {
        setSyncStatus((prev) => ({
          ...prev,
          isSyncing: false,
          lastError: res.error || 'Could not fetch data from Google Sheets'
        }));
      }
    } catch (err: unknown) {
      setSyncStatus((prev) => ({
        ...prev,
        isSyncing: false,
        lastError: err instanceof Error ? err.message : String(err)
      }));
    }
  };

  // Trigger manual sync: Push All to Sheets (All 4 tables)
  const handlePushAllToSheets = async () => {
    if (!appsScriptUrl) return;
    setSyncStatus((prev) => ({ ...prev, isSyncing: true, lastError: null }));

    try {
      const res = await syncAllDataToSheets(appsScriptUrl, {
        tasks,
        brds,
        changeRequests,
        testCases
      });
      if (res.success) {
        setSyncStatus((prev) => ({
          ...prev,
          isSyncing: false,
          lastSyncedAt: new Date().toLocaleTimeString(),
          lastError: null
        }));
      } else {
        setSyncStatus((prev) => ({
          ...prev,
          isSyncing: false,
          lastError: res.error || 'Batch push to Google Sheets failed'
        }));
      }
    } catch (err: unknown) {
      setSyncStatus((prev) => ({
        ...prev,
        isSyncing: false,
        lastError: err instanceof Error ? err.message : String(err)
      }));
    }
  };

  // Global Sync button in TopBar: Push local changes (tasks, images, BRD, CR, tests) to Sheets
  const handleTopBarSync = async () => {
    if (!appsScriptUrl) {
      setActiveTab('sheets');
      return;
    }
    await handlePushAllToSheets();
  };

  // Task Actions
  const handleSaveTask = (task: Task) => {
    setTasks((prev) => {
      const existsIndex = prev.findIndex((t) => t.id === task.id);
      if (existsIndex >= 0) {
        const next = [...prev];
        next[existsIndex] = task;
        return next;
      } else {
        return [task, ...prev];
      }
    });
    syncTaskToRemote(task);
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    syncDeleteToRemote(taskId);
  };

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const updated = {
            ...t,
            status: newStatus,
            updatedAt: new Date().toISOString()
          };
          syncTaskToRemote(updated);
          return updated;
        }
        return t;
      })
    );
  };

  const handleMoveQuadrant = (taskId: string, newQuadrant: TaskQuadrant) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const updated = {
            ...t,
            quadrant: newQuadrant,
            updatedAt: new Date().toISOString()
          };
          syncTaskToRemote(updated);
          return updated;
        }
        return t;
      })
    );
  };

  const handleToggleSubtask = (taskId: string, subtaskId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const updatedSubtasks = t.subtasks.map((st) =>
            st.id === subtaskId ? { ...st, completed: !st.completed } : st
          );
          const updated = {
            ...t,
            subtasks: updatedSubtasks,
            updatedAt: new Date().toISOString()
          };
          syncTaskToRemote(updated);
          return updated;
        }
        return t;
      })
    );
  };

  // BRD actions
  const handleSaveBrd = (brd: BRDDocument) => {
    setBrds((prev) => {
      const idx = prev.findIndex((b) => b.id === brd.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = brd;
        return next;
      }
      return [brd, ...prev];
    });
  };

  // CR actions
  const handleSaveCr = (cr: ChangeRequest) => {
    setChangeRequests((prev) => {
      const idx = prev.findIndex((c) => c.id === cr.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = cr;
        return next;
      }
      return [cr, ...prev];
    });
  };

  const handleUpdateCrStatus = (crId: string, status: CRStatus) => {
    setChangeRequests((prev) =>
      prev.map((c) =>
        c.id === crId ? { ...c, status, updatedAt: new Date().toISOString() } : c
      )
    );
  };

  // Test Case actions (SIT / UIT)
  const handleSaveTestCase = (testCase: TestCase) => {
    setTestCases((prev) => {
      const idx = prev.findIndex((tc) => tc.id === testCase.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = testCase;
        return next;
      }
      return [testCase, ...prev];
    });
  };

  const handleDeleteTestCase = (caseId: string) => {
    setTestCases((prev) => prev.filter((tc) => tc.id !== caseId));
  };

  const handleUpdateExecutionStatus = (
    caseId: string,
    status: TestStatus,
    actualResult: string,
    testedBy: string,
    notes?: string
  ) => {
    setTestCases((prev) =>
      prev.map((tc) => {
        if (tc.id === caseId) {
          return {
            ...tc,
            status,
            actualResult,
            testedBy,
            notes,
            testedAt: new Date().toISOString().slice(0, 10)
          };
        }
        return tc;
      })
    );
  };

  // Open Task Modal in various contexts
  const openNewTaskModal = (
    defaultStatus: TaskStatus = 'backlog',
    defaultQuadrant: TaskQuadrant = 1,
    defaultDueDate = ''
  ) => {
    setEditingTask(null);
    setModalDefaultStatus(defaultStatus);
    setModalDefaultQuadrant(defaultQuadrant);
    setModalDefaultDueDate(defaultDueDate);
    setIsTaskModalOpen(true);
  };

  const openEditTaskModal = (task: Task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  // Check if board currently has pre-seeded demo tasks
  const hasDemoTasks = tasks.some((t) => t.id === 'task-1' || t.id === 'task-2' || t.id === 'task-3');
  const [showDemoNotice, setShowDemoNotice] = useState(true);

  // Clear all tasks to start with a fresh clean board
  const handleClearAllTasks = () => {
    if (tasks.length === 0) return;
    if (window.confirm('Kosongkan seluruh tugas di board untuk mulai mencatat tugas riil Anda dari nol?')) {
      setTasks([]);
      localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify([]));
    }
  };

  // Restore initial demo tasks for demonstration / testing
  const handleRestoreDemoTasks = () => {
    setTasks(INITIAL_DEMO_TASKS);
    localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(INITIAL_DEMO_TASKS));
  };

  // Calculate high level metrics (tabular figures)
  const completedCount = tasks.filter((t) => t.status === 'done').length;
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;
  const urgentCount = tasks.filter((t) => t.priority === 'urgent' && t.status !== 'done').length;

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Top Navigation Bar with 3-Zone Contract */}
      <TopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenNewTaskModal={() => openNewTaskModal()}
        syncStatus={syncStatus}
        onTriggerSync={handleTopBarSync}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Informative Demo Data Banner (Visible when pre-seeded demo tasks exist) */}
        {hasDemoTasks && showDemoNotice && ['kanban', 'matrix', 'calendar'].includes(activeTab) && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 rounded-2xl text-xs text-indigo-950 dark:text-indigo-200 shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-md bg-indigo-200/80 dark:bg-indigo-900/70 text-indigo-900 dark:text-indigo-200 text-[11px] shrink-0">
                <Sparkles size={12} className="text-indigo-600 dark:text-indigo-400" />
                Data Demo Bawaan
              </span>
              <span>
                Board saat ini memuat tugas contoh. Anda dapat langsung mengeditnya, menarik tugas riil dari Google Spreadsheet, atau mengosongkan board untuk mulai dari nol.
              </span>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                onClick={handleClearAllTasks}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/60 rounded-xl transition-colors cursor-pointer"
                title="Hapus semua tugas demo dan mulai dari board kosong"
              >
                <Trash2 size={13} />
                <span>Kosongkan Board</span>
              </button>
              {syncStatus.isConfigured && (
                <button
                  onClick={handlePullFromSheets}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 rounded-xl transition-colors cursor-pointer"
                  title="Ambil data dari Google Spreadsheet"
                >
                  <RotateCcw size={13} />
                  <span>Tarik dari Sheet</span>
                </button>
              )}
              <button
                onClick={() => setShowDemoNotice(false)}
                className="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200 p-1 cursor-pointer"
                title="Tutup pemberitahuan"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Workspace Toolbar & Filter Bar (shown on Kanban, Matrix, and Calendar) */}
        {['kanban', 'matrix', 'calendar'].includes(activeTab) && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks, descriptions, or tags..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Segmented Controls for Priority Filter & Board Management */}
            <div className="flex items-center gap-3 overflow-x-auto pb-1 sm:pb-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 mr-1">
                  <Filter size={13} />
                  <span>Priority:</span>
                </span>
                {(['all', 'urgent', 'high', 'medium', 'low'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setSelectedPriority(p)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize whitespace-nowrap transition-colors cursor-pointer ${
                      selectedPriority === p
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              {/* Board Clear / Restore quick actions */}
              <div className="border-l border-slate-200 dark:border-slate-800 pl-3 flex items-center gap-2 shrink-0">
                {tasks.length > 0 ? (
                  <button
                    onClick={handleClearAllTasks}
                    title="Kosongkan seluruh tugas untuk mulai dari nol"
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 size={13} />
                    <span className="hidden md:inline">Kosongkan</span>
                  </button>
                ) : (
                  <button
                    onClick={handleRestoreDemoTasks}
                    title="Muat data contoh demo"
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer"
                  >
                    <RotateCcw size={13} />
                    <span>Muat Demo</span>
                  </button>
                )}
              </div>
            </div>

            {/* Clean Unboxed Metrics Strip (Tabular Figures) */}
            <div className="hidden lg:flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 border-l border-slate-200 dark:border-slate-800 pl-4 shrink-0 font-mono tabular-nums">
              <span>
                Total: <strong className="text-slate-800 dark:text-slate-200">{tasks.length}</strong>
              </span>
              <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
              <span>
                Active: <strong className="text-indigo-600 dark:text-indigo-400">{inProgressCount}</strong>
              </span>
              <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
              <span>
                Done: <strong className="text-emerald-600 dark:text-emerald-400">{completedCount}</strong>
              </span>
              {urgentCount > 0 && (
                <>
                  <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                  <span className="text-rose-600 dark:text-rose-400 font-semibold">
                    {urgentCount} Urgent
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {/* View Routing */}
        {activeTab === 'kanban' && (
          <KanbanView
            tasks={tasks}
            onEditTask={openEditTaskModal}
            onDeleteTask={handleDeleteTask}
            onStatusChange={handleStatusChange}
            onToggleSubtask={handleToggleSubtask}
            onQuickAddTask={(colStatus) => openNewTaskModal(colStatus)}
            searchQuery={searchQuery}
            selectedPriority={selectedPriority}
          />
        )}

        {activeTab === 'matrix' && (
          <EisenhowerMatrixView
            tasks={tasks}
            onEditTask={openEditTaskModal}
            onDeleteTask={handleDeleteTask}
            onStatusChange={handleStatusChange}
            onToggleSubtask={handleToggleSubtask}
            onQuickAddToQuadrant={(quadrant) => openNewTaskModal('backlog', quadrant)}
            onMoveQuadrant={handleMoveQuadrant}
            searchQuery={searchQuery}
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarView
            tasks={tasks}
            onEditTask={openEditTaskModal}
            onDeleteTask={handleDeleteTask}
            onStatusChange={handleStatusChange}
            onToggleSubtask={handleToggleSubtask}
            onAddTaskOnDate={(dateStr) => openNewTaskModal('backlog', 1, dateStr)}
          />
        )}

        {activeTab === 'requirements' && (
          <RequirementsManagerView
            brds={brds}
            changeRequests={changeRequests}
            tasks={tasks}
            onSaveBrd={handleSaveBrd}
            onSaveCr={handleSaveCr}
            onUpdateCrStatus={handleUpdateCrStatus}
          />
        )}

        {activeTab === 'testing' && (
          <TestingCenterView
            testCases={testCases}
            tasks={tasks}
            onSaveTestCase={handleSaveTestCase}
            onDeleteTestCase={handleDeleteTestCase}
            onUpdateExecutionStatus={handleUpdateExecutionStatus}
          />
        )}

        {activeTab === 'sheets' && (
          <SheetsSetupModal
            currentUrl={appsScriptUrl}
            onSaveUrl={handleSaveAppsScriptUrl}
            syncStatus={syncStatus}
            onManualSyncPush={handlePushAllToSheets}
            onManualSyncPull={handlePullFromSheets}
            tasksCount={tasks.length}
            brdsCount={brds.length}
            crsCount={changeRequests.length}
            testCasesCount={testCases.length}
          />
        )}

        {activeTab === 'flutter' && (
          <FlutterExportView configuredAppsScriptUrl={appsScriptUrl} />
        )}
      </main>

      {/* FAB AI Agentic Chat Drawer */}
      <AIAgentChatDrawer
        tasks={tasks}
        onAddTask={(task) => {
          setTasks((prev) => [task, ...prev]);
          syncTaskToRemote(task);
        }}
        onOpenEditModal={(draft) => {
          setEditingTask(draft);
          setIsTaskModalOpen(true);
        }}
        appsScriptUrl={appsScriptUrl}
        userEmail="YudiR413@gmail.com"
      />

      {/* Task Creation & Editing Modal with Image Uploads, PIC Assignment and Email Invites */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSave={handleSaveTask}
        initialTask={editingTask}
        defaultStatus={modalDefaultStatus}
        defaultQuadrant={modalDefaultQuadrant}
        defaultDueDate={modalDefaultDueDate}
        availableBrds={brds}
        availableCrs={changeRequests}
        appsScriptUrl={appsScriptUrl}
      />
    </div>
  );
}

