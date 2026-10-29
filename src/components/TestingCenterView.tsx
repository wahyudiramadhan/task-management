/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertOctagon,
  Clock,
  Plus,
  Filter,
  Play,
  FileCheck,
  UserCheck,
  Cpu,
  Search,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { TestCase, TestType, TestStatus, TestSeverity, Task } from '../types/task';
import { formatFullDateTime, formatRelativeTime } from '../utils/dateFormatter';

interface TestingCenterViewProps {
  testCases: TestCase[];
  tasks: Task[];
  onSaveTestCase: (testCase: TestCase) => void;
  onDeleteTestCase: (caseId: string) => void;
  onUpdateExecutionStatus: (
    caseId: string,
    status: TestStatus,
    actualResult: string,
    testedBy: string,
    notes?: string
  ) => void;
}

export const TestingCenterView: React.FC<TestingCenterViewProps> = ({
  testCases,
  tasks,
  onSaveTestCase,
  onDeleteTestCase,
  onUpdateExecutionStatus
}) => {
  const [activeTypeFilter, setActiveTypeFilter] = useState<'all' | TestType>('all');
  const [activeStatusFilter, setActiveStatusFilter] = useState<'all' | TestStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Execution modal state
  const [executingCase, setExecutingCase] = useState<TestCase | null>(null);
  const [execStatus, setExecStatus] = useState<TestStatus>('passed');
  const [execActualResult, setExecActualResult] = useState('');
  const [execTester, setExecTester] = useState('QA Engineer');
  const [execNotes, setExecNotes] = useState('');

  // Create new test case modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newType, setNewType] = useState<TestType>('SIT');
  const [newCode, setNewCode] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPreconditions, setNewPreconditions] = useState('');
  const [newSteps, setNewSteps] = useState('');
  const [newExpectedResult, setNewExpectedResult] = useState('');
  const [newSeverity, setNewSeverity] = useState<TestSeverity>('critical');
  const [newLinkedTaskId, setNewLinkedTaskId] = useState('');
  const [formError, setFormError] = useState('');

  // Statistics calculation
  const totalCount = testCases.length;
  const passedCount = testCases.filter((tc) => tc.status === 'passed').length;
  const failedCount = testCases.filter((tc) => tc.status === 'failed').length;
  const blockedCount = testCases.filter((tc) => tc.status === 'blocked').length;
  const untestedCount = testCases.filter((tc) => tc.status === 'untested').length;
  const passRate = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0;

  const sitCount = testCases.filter((tc) => tc.type === 'SIT').length;
  const uitCount = testCases.filter((tc) => tc.type === 'UIT').length;

  // Filter test cases
  const filteredCases = testCases.filter((tc) => {
    const matchesType = activeTypeFilter === 'all' || tc.type === activeTypeFilter;
    const matchesStatus = activeStatusFilter === 'all' || tc.status === activeStatusFilter;
    const matchesSearch =
      searchQuery.trim() === '' ||
      tc.caseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tc.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesStatus && matchesSearch;
  });

  const handleOpenExecution = (tc: TestCase) => {
    setExecutingCase(tc);
    setExecStatus(tc.status === 'untested' ? 'passed' : tc.status);
    setExecActualResult(tc.actualResult || '');
    setExecTester(tc.testedBy || 'QA Lead');
    setExecNotes(tc.notes || '');
  };

  const handleSaveExecution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!executingCase) return;
    onUpdateExecutionStatus(
      executingCase.id,
      execStatus,
      execActualResult,
      execTester,
      execNotes
    );
    setExecutingCase(null);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setFormError('Test title is required');
      return;
    }

    const code = newCode.trim() || `${newType}-${String(testCases.length + 1).padStart(3, '0')}`;
    const newCase: TestCase = {
      id: 'tc-' + Date.now(),
      caseCode: code,
      type: newType,
      title: newTitle.trim(),
      description: newDescription.trim(),
      preconditions: newPreconditions.trim(),
      steps: newSteps.trim(),
      expectedResult: newExpectedResult.trim(),
      severity: newSeverity,
      status: 'untested',
      linkedTaskId: newLinkedTaskId || undefined
    };

    onSaveTestCase(newCase);
    setIsCreateModalOpen(false);
    setNewTitle('');
    setNewDescription('');
    setNewPreconditions('');
    setNewSteps('');
    setNewExpectedResult('');
    setNewCode('');
    setFormError('');
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <FileCheck size={26} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Integration Testing Center (SIT & UIT)
              </h2>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                Manage <strong>System Integration Testing (SIT)</strong> for API webhooks and data pipelines,
                and <strong>User Integration / Acceptance Testing (UIT)</strong> for end-to-end user workflows.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setNewCode(`${newType}-${String(testCases.length + 1).padStart(3, '0')}`);
              setIsCreateModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs transition-colors whitespace-nowrap cursor-pointer shrink-0"
          >
            <Plus size={15} />
            <span>Create Test Case</span>
          </button>
        </div>

        {/* Metric Strips (Tabular Figures) */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] text-slate-500 uppercase tracking-wider block">Pass Rate</span>
            <span className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
              {passRate}%
            </span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50">
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
              Passed
            </span>
            <span className="text-xl font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-300">
              {passedCount}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50">
            <span className="text-[11px] text-rose-700 dark:text-rose-400 uppercase tracking-wider block">
              Failed
            </span>
            <span className="text-xl font-bold font-mono tabular-nums text-rose-700 dark:text-rose-300">
              {failedCount}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50">
            <span className="text-[11px] text-amber-700 dark:text-amber-400 uppercase tracking-wider block">
              Blocked
            </span>
            <span className="text-xl font-bold font-mono tabular-nums text-amber-700 dark:text-amber-300">
              {blockedCount}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <span className="text-[11px] text-slate-500 uppercase tracking-wider block">Untested</span>
            <span className="text-xl font-bold font-mono tabular-nums text-slate-700 dark:text-slate-300">
              {untestedCount}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search test case code, title, or steps..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Test Type Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTypeFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              activeTypeFilter === 'all'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            All ({totalCount})
          </button>
          <button
            onClick={() => setActiveTypeFilter('SIT')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
              activeTypeFilter === 'SIT'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Cpu size={12} className="text-indigo-500" />
            <span>SIT ({sitCount})</span>
          </button>
          <button
            onClick={() => setActiveTypeFilter('UIT')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
              activeTypeFilter === 'UIT'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <UserCheck size={12} className="text-emerald-500" />
            <span>UIT ({uitCount})</span>
          </button>
        </div>

        {/* Status Dropdown */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">Status:</span>
          <select
            value={activeStatusFilter}
            onChange={(e) => setActiveStatusFilter(e.target.value as any)}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
          >
            <option value="all">All Statuses</option>
            <option value="passed">Passed</option>
            <option value="failed">Failed</option>
            <option value="blocked">Blocked</option>
            <option value="untested">Untested</option>
          </select>
        </div>
      </div>

      {/* Test Cases Table / List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        {filteredCases.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No test cases found matching your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-4">Test Title & Steps</th>
                  <th className="py-3 px-3">Severity</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4">Actual Result / Tester</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredCases.map((tc) => {
                  const linkedTask = tasks.find((t) => t.id === tc.linkedTaskId);

                  return (
                    <tr
                      key={tc.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Code */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {tc.caseCode}
                      </td>

                      {/* Type */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span
                          className={`font-semibold text-[11px] ${
                            tc.type === 'SIT'
                              ? 'text-indigo-600 dark:text-indigo-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {tc.type}
                        </span>
                      </td>

                      {/* Title & Steps */}
                      <td className="py-3.5 px-4 max-w-sm">
                        <p className="font-semibold text-slate-900 dark:text-white text-xs">
                          {tc.title}
                        </p>
                        {tc.description && (
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                            {tc.description}
                          </p>
                        )}
                        {linkedTask && (
                          <span className="text-[10px] text-indigo-500 hover:underline mt-1 inline-block">
                            Linked: {linkedTask.title}
                          </span>
                        )}
                      </td>

                      {/* Severity */}
                      <td className="py-3.5 px-3 uppercase text-[10px] font-bold tracking-wider">
                        <span
                          className={
                            tc.severity === 'critical'
                              ? 'text-rose-600 dark:text-rose-400'
                              : tc.severity === 'major'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-slate-500'
                          }
                        >
                          {tc.severity}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 font-semibold text-xs ${
                            tc.status === 'passed'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : tc.status === 'failed'
                              ? 'text-rose-600 dark:text-rose-400'
                              : tc.status === 'blocked'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {tc.status === 'passed' && <CheckCircle2 size={13} />}
                          {tc.status === 'failed' && <XCircle size={13} />}
                          {tc.status === 'blocked' && <AlertOctagon size={13} />}
                          {tc.status === 'untested' && <Clock size={13} />}
                          <span className="capitalize">{tc.status}</span>
                        </span>
                      </td>

                      {/* Actual Result & Tester */}
                      <td className="py-3.5 px-4 max-w-xs text-xs text-slate-600 dark:text-slate-300">
                        {tc.actualResult ? (
                          <div>
                            <p className="line-clamp-1 italic">"{tc.actualResult}"</p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5" title={tc.testedAt ? formatFullDateTime(tc.testedAt) : undefined}>
                              {tc.testedBy || 'Tester'} · {tc.testedAt ? formatRelativeTime(tc.testedAt) : 'N/A'}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">— Not executed —</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleOpenExecution(tc)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white transition-colors cursor-pointer mr-2"
                        >
                          Log Run
                        </button>
                        <button
                          onClick={() => onDeleteTestCase(tc.id)}
                          className="text-slate-400 hover:text-rose-500 text-xs cursor-pointer p-1"
                          title="Delete test case"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Execution Modal */}
      {executingCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {executingCase.caseCode} ({executingCase.type})
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {executingCase.title}
                </h3>
              </div>
              <button
                onClick={() => setExecutingCase(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {/* Steps & Expected Result Reference */}
            <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl text-xs space-y-1.5 text-slate-700 dark:text-slate-300">
              {executingCase.steps && (
                <div>
                  <strong className="text-[11px] uppercase tracking-wider text-slate-400 block">
                    Execution Steps:
                  </strong>
                  <pre className="font-sans whitespace-pre-wrap">{executingCase.steps}</pre>
                </div>
              )}
              {executingCase.expectedResult && (
                <div className="pt-1 border-t border-slate-200 dark:border-slate-700">
                  <strong className="text-[11px] uppercase tracking-wider text-slate-400 block">
                    Expected Result:
                  </strong>
                  <p>{executingCase.expectedResult}</p>
                </div>
              )}
            </div>

            <form onSubmit={handleSaveExecution} className="space-y-4">
              {/* Execution Status Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Test Execution Verdict
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setExecStatus('passed')}
                    className={`py-2 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1.5 cursor-pointer ${
                      execStatus === 'passed'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    <span>Passed</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExecStatus('failed')}
                    className={`py-2 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1.5 cursor-pointer ${
                      execStatus === 'failed'
                        ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <XCircle size={14} className="text-rose-500" />
                    <span>Failed</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExecStatus('blocked')}
                    className={`py-2 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1.5 cursor-pointer ${
                      execStatus === 'blocked'
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <AlertOctagon size={14} className="text-amber-500" />
                    <span>Blocked</span>
                  </button>
                </div>
              </div>

              {/* Actual Result Details */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Actual Result / Observed Behavior
                </label>
                <textarea
                  rows={2}
                  value={execActualResult}
                  onChange={(e) => setExecActualResult(e.target.value)}
                  placeholder="e.g., Response received 200 OK with expected payload structure..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Tester Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tested By (Sign-off)
                </label>
                <input
                  type="text"
                  value={execTester}
                  onChange={(e) => setExecTester(e.target.value)}
                  placeholder="e.g., Jane Doe (SIT Lead)"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setExecutingCase(null)}
                  className="px-4 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
                >
                  Save Test Result
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create New Test Case Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                New Integration Test Case
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-2.5 rounded-lg bg-rose-50 text-rose-600 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Test Category
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => {
                      const t = e.target.value as TestType;
                      setNewType(t);
                      setNewCode(`${t}-${String(testCases.length + 1).padStart(3, '0')}`);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="SIT">SIT - System Integration Testing</option>
                    <option value="UIT">UIT - User Integration / Acceptance Testing</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Case Code
                  </label>
                  <input
                    type="text"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder="e.g. SIT-005"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Test Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Validate Google Sheets batch synchronization"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description / Objective
                </label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Explain what is being validated..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Execution Steps
                </label>
                <textarea
                  rows={3}
                  value={newSteps}
                  onChange={(e) => setNewSteps(e.target.value)}
                  placeholder="1. Open Settings&#10;2. Click Sync&#10;3. Inspect response"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono resize-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Expected Result
                </label>
                <input
                  type="text"
                  value={newExpectedResult}
                  onChange={(e) => setNewExpectedResult(e.target.value)}
                  placeholder="e.g. All rows synced within 500ms without data loss."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Severity
                  </label>
                  <select
                    value={newSeverity}
                    onChange={(e) => setNewSeverity(e.target.value as TestSeverity)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="critical">Critical</option>
                    <option value="major">Major</option>
                    <option value="minor">Minor</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Link to Task
                  </label>
                  <select
                    value={newLinkedTaskId}
                    onChange={(e) => setNewLinkedTaskId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white truncate"
                  >
                    <option value="">None</option>
                    {tasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
                >
                  Create Test Case
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
