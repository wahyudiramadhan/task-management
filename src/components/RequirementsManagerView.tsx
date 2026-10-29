/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  FileText,
  GitPullRequest,
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Layers,
  ArrowRight,
  User,
  Calendar,
  ExternalLink,
  Search,
  Check
} from 'lucide-react';
import {
  BRDDocument,
  ChangeRequest,
  CRStatus,
  CRImpact,
  Task
} from '../types/task';
import {
  formatDisplayDueDate,
  formatFullDateTime,
  formatRelativeTime
} from '../utils/dateFormatter';

interface RequirementsManagerViewProps {
  brds: BRDDocument[];
  changeRequests: ChangeRequest[];
  tasks: Task[];
  onSaveBrd: (brd: BRDDocument) => void;
  onSaveCr: (cr: ChangeRequest) => void;
  onUpdateCrStatus: (crId: string, status: CRStatus) => void;
}

export const RequirementsManagerView: React.FC<RequirementsManagerViewProps> = ({
  brds,
  changeRequests,
  tasks,
  onSaveBrd,
  onSaveCr,
  onUpdateCrStatus
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'brd' | 'cr'>('cr');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected BRD for detail view
  const [selectedBrdId, setSelectedBrdId] = useState<string>(brds[0]?.id || '');

  // CR Modal State
  const [isCrModalOpen, setIsCrModalOpen] = useState(false);
  const [crTitle, setCrTitle] = useState('');
  const [crDescription, setCrDescription] = useState('');
  const [crJustification, setCrJustification] = useState('');
  const [crImpact, setCrImpact] = useState<CRImpact>('scope');
  const [crPriority, setCrPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('high');
  const [crRequestedBy, setCrRequestedBy] = useState('');
  const [crAssignedTo, setCrAssignedTo] = useState('');
  const [crLinkedTaskId, setCrLinkedTaskId] = useState('');
  const [crLinkedBrdId, setCrLinkedBrdId] = useState('');
  const [crFormError, setCrFormError] = useState('');

  // BRD Modal State
  const [isBrdModalOpen, setIsBrdModalOpen] = useState(false);
  const [brdCode, setBrdCode] = useState('');
  const [brdTitle, setBrdTitle] = useState('');
  const [brdVersion, setBrdVersion] = useState('1.0.0');
  const [brdOwner, setBrdOwner] = useState('');
  const [brdTargetRelease, setBrdTargetRelease] = useState('');
  const [brdSummary, setBrdSummary] = useState('');
  const [brdObjectiveInput, setBrdObjectiveInput] = useState('');
  const [brdObjectives, setBrdObjectives] = useState<string[]>([]);

  // Filtered CRs
  const filteredCrs = changeRequests.filter((cr) => {
    return (
      searchQuery.trim() === '' ||
      cr.crNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cr.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cr.requestedBy.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const selectedBrd = brds.find((b) => b.id === selectedBrdId) || brds[0];

  const handleCreateCr = (e: React.FormEvent) => {
    e.preventDefault();
    if (!crTitle.trim()) {
      setCrFormError('Title is required');
      return;
    }

    const newCr: ChangeRequest = {
      id: 'cr-' + Date.now(),
      crNumber: `CR-${new Date().getFullYear()}-${String(changeRequests.length + 1).padStart(3, '0')}`,
      title: crTitle.trim(),
      description: crDescription.trim(),
      justification: crJustification.trim(),
      impactArea: crImpact,
      priority: crPriority,
      status: 'submitted',
      requestedBy: crRequestedBy.trim() || 'QA / Stakeholder',
      assignedTo: crAssignedTo.trim() || 'Engineering Lead',
      linkedTaskId: crLinkedTaskId || undefined,
      linkedBrdId: crLinkedBrdId || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSaveCr(newCr);
    setIsCrModalOpen(false);
    setCrTitle('');
    setCrDescription('');
    setCrJustification('');
    setCrFormError('');
  };

  const handleAddObjective = () => {
    if (brdObjectiveInput.trim()) {
      setBrdObjectives([...brdObjectives, brdObjectiveInput.trim()]);
      setBrdObjectiveInput('');
    }
  };

  const handleCreateBrd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brdTitle.trim()) return;

    const newDoc: BRDDocument = {
      id: 'brd-' + Date.now(),
      code: brdCode.trim() || `BRD-${new Date().getFullYear()}-${String(brds.length + 1).padStart(3, '0')}`,
      title: brdTitle.trim(),
      version: brdVersion.trim() || '1.0.0',
      status: 'draft',
      owner: brdOwner.trim() || 'Product Lead',
      targetRelease: brdTargetRelease.trim() || 'v1.0',
      summary: brdSummary.trim(),
      businessObjectives: brdObjectives,
      requirements: [
        {
          id: 'req-' + Date.now(),
          reqCode: 'REQ-01',
          title: 'Initial Core Capability',
          description: brdSummary.trim(),
          priority: 'must'
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSaveBrd(newDoc);
    setIsBrdModalOpen(false);
    setSelectedBrdId(newDoc.id);
    setBrdTitle('');
    setBrdSummary('');
    setBrdObjectives([]);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Top Banner Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Layers size={26} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Requirements & Change Request Manager (BRD & CR)
              </h2>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                Maintain formal enterprise traceability between <strong>Business Requirements Documents (BRD)</strong>,
                formal <strong>Change Requests (CR)</strong>, and live sprint execution tasks.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeSubTab === 'cr' ? (
              <button
                onClick={() => setIsCrModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors whitespace-nowrap cursor-pointer"
              >
                <Plus size={15} />
                <span>Submit Change Request</span>
              </button>
            ) : (
              <button
                onClick={() => setIsBrdModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors whitespace-nowrap cursor-pointer"
              >
                <Plus size={15} />
                <span>Create BRD Document</span>
              </button>
            )}
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('cr')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl transition-colors cursor-pointer ${
              activeSubTab === 'cr'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <GitPullRequest size={14} />
            <span>Change Requests (CR) ({changeRequests.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('brd')}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl transition-colors cursor-pointer ${
              activeSubTab === 'brd'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FileText size={14} />
            <span>Business Requirements (BRD) ({brds.length})</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: CHANGE REQUESTS (CR) */}
      {activeSubTab === 'cr' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search CR number, title, or requester..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="text-xs text-slate-500 font-mono tabular-nums">
              Total: {changeRequests.length} · Approved:{' '}
              <strong className="text-emerald-600">
                {changeRequests.filter((c) => c.status === 'approved' || c.status === 'implemented').length}
              </strong>
            </div>
          </div>

          {/* CR Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            {filteredCrs.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                No change requests found. Click "Submit Change Request" above.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold">
                      <th className="py-3 px-4">CR #</th>
                      <th className="py-3 px-4">Title & Justification</th>
                      <th className="py-3 px-3">Impact</th>
                      <th className="py-3 px-3">Priority</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-4">Requester / Assigned</th>
                      <th className="py-3 px-4 text-right">Approval Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredCrs.map((cr) => {
                      const linkedTask = tasks.find((t) => t.id === cr.linkedTaskId);

                      return (
                        <tr
                          key={cr.id}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          {/* CR Number */}
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                            {cr.crNumber}
                          </td>

                          {/* Title & Justification */}
                          <td className="py-3.5 px-4 max-w-sm">
                            <p className="font-semibold text-slate-900 dark:text-white text-xs">
                              {cr.title}
                            </p>
                            {cr.justification && (
                              <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1 italic">
                                "{cr.justification}"
                              </p>
                            )}
                            {linkedTask && (
                              <span className="text-[10px] text-indigo-500 mt-1 inline-block">
                                Task: {linkedTask.title}
                              </span>
                            )}
                          </td>

                          {/* Impact Area */}
                          <td className="py-3.5 px-3 uppercase text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                            {cr.impactArea}
                          </td>

                          {/* Priority */}
                          <td className="py-3.5 px-3 uppercase text-[10px] font-bold">
                            <span
                              className={
                                cr.priority === 'critical'
                                  ? 'text-rose-600'
                                  : cr.priority === 'high'
                                  ? 'text-amber-600'
                                  : 'text-slate-500'
                              }
                            >
                              {cr.priority}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 font-semibold text-xs capitalize ${
                                cr.status === 'approved' || cr.status === 'implemented'
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : cr.status === 'rejected'
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : cr.status === 'under_review'
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-slate-500'
                              }`}
                            >
                              {cr.status.replace('_', ' ')}
                            </span>
                          </td>

                          {/* Requester */}
                          <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300">
                            <p>{cr.requestedBy}</p>
                            <p className="text-[10px] text-slate-400">Assigned: {cr.assignedTo}</p>
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            {cr.status === 'submitted' || cr.status === 'under_review' ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => onUpdateCrStatus(cr.id, 'approved')}
                                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer transition-colors"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => onUpdateCrStatus(cr.id, 'rejected')}
                                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                                >
                                  Reject
                                </button>
                              </div>
                            ) : cr.status === 'approved' ? (
                              <button
                                onClick={() => onUpdateCrStatus(cr.id, 'implemented')}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer transition-colors"
                              >
                                Mark Implemented
                              </button>
                            ) : (
                              <span className="text-slate-400 text-[11px]">— Resolved —</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: BUSINESS REQUIREMENTS DOCUMENT (BRD) */}
      {activeSubTab === 'brd' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* BRD Documents Sidebar */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2">
              BRD Repository
            </h3>
            {brds.map((doc) => (
              <button
                key={doc.id}
                onClick={() => setSelectedBrdId(doc.id)}
                className={`w-full text-left p-3 rounded-xl transition-colors cursor-pointer border ${
                  selectedBrd?.id === doc.id
                    ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30'
                    : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-900 dark:text-white">
                  <span>{doc.code}</span>
                  <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    v{doc.version}
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1 line-clamp-1">
                  {doc.title}
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5 capitalize">Status: {doc.status}</p>
              </button>
            ))}
          </div>

          {/* BRD Active Document Reader */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
            {selectedBrd ? (
              <>
                <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {selectedBrd.code} · v{selectedBrd.version}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                      {selectedBrd.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                      <span>Owner: <strong>{selectedBrd.owner}</strong></span>
                      <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
                      <span>Target: <strong className="font-mono text-slate-700 dark:text-slate-200">{formatDisplayDueDate(selectedBrd.targetRelease)}</strong></span>
                      <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
                      <span title={selectedBrd.createdAt ? formatFullDateTime(selectedBrd.createdAt) : undefined}>
                        Created: {formatDisplayDueDate(selectedBrd.createdAt)}
                      </span>
                    </p>
                  </div>

                  <span className="text-xs font-semibold uppercase px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                    {selectedBrd.status}
                  </span>
                </div>

                {/* Summary */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">
                    Executive Summary
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {selectedBrd.summary}
                  </p>
                </div>

                {/* Business Objectives */}
                {selectedBrd.businessObjectives.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">
                      Business Objectives
                    </h4>
                    <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                      {selectedBrd.businessObjectives.map((obj, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                          <span>{obj}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Requirements Breakdown Table */}
                <div className="pt-2">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">
                    Requirements Specification Matrix
                  </h4>
                  <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-semibold border-b border-slate-100 dark:border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3">Req ID</th>
                          <th className="py-2.5 px-3">Requirement Title & Scope</th>
                          <th className="py-2.5 px-3">Priority</th>
                          <th className="py-2.5 px-3">Linked Task</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {selectedBrd.requirements.map((req) => {
                          const linkedTask = tasks.find((t) => t.id === req.linkedTaskId);
                          return (
                            <tr key={req.id}>
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                                {req.reqCode}
                              </td>
                              <td className="py-2.5 px-3">
                                <p className="font-semibold text-slate-900 dark:text-white">{req.title}</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">{req.description}</p>
                              </td>
                              <td className="py-2.5 px-3 uppercase text-[10px] font-bold text-indigo-600">
                                {req.priority}
                              </td>
                              <td className="py-2.5 px-3">
                                {linkedTask ? (
                                  <span className="text-indigo-500 text-[11px] font-medium">
                                    {linkedTask.title}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center p-12 text-slate-400 text-xs">
                Select a BRD from the left sidebar or create one.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Submit CR Modal */}
      {isCrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Submit Change Request (CR)
              </h3>
              <button
                onClick={() => setIsCrModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {crFormError && (
              <div className="p-2.5 rounded-lg bg-rose-50 text-rose-600 text-xs">
                {crFormError}
              </div>
            )}

            <form onSubmit={handleCreateCr} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Change Request Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={crTitle}
                  onChange={(e) => setCrTitle(e.target.value)}
                  placeholder="e.g. Add image attachment upload to task model"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Scope Description
                </label>
                <textarea
                  rows={2}
                  value={crDescription}
                  onChange={(e) => setCrDescription(e.target.value)}
                  placeholder="Detail the technical or business scope of the change..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Business Justification
                </label>
                <textarea
                  rows={2}
                  value={crJustification}
                  onChange={(e) => setCrJustification(e.target.value)}
                  placeholder="Why is this change necessary? What is the impact if not done?"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Impact Area
                  </label>
                  <select
                    value={crImpact}
                    onChange={(e) => setCrImpact(e.target.value as CRImpact)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="scope">Scope</option>
                    <option value="timeline">Timeline</option>
                    <option value="cost">Cost</option>
                    <option value="architecture">Architecture</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={crPriority}
                    onChange={(e) => setCrPriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Requester Name
                  </label>
                  <input
                    type="text"
                    value={crRequestedBy}
                    onChange={(e) => setCrRequestedBy(e.target.value)}
                    placeholder="e.g. Lead QA Engineer"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Link to Task
                  </label>
                  <select
                    value={crLinkedTaskId}
                    onChange={(e) => setCrLinkedTaskId(e.target.value)}
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
                  onClick={() => setIsCrModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
                >
                  Submit CR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create BRD Modal */}
      {isBrdModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Create Business Requirements Document (BRD)
              </h3>
              <button
                onClick={() => setIsBrdModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBrd} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    BRD Code
                  </label>
                  <input
                    type="text"
                    value={brdCode}
                    onChange={(e) => setBrdCode(e.target.value)}
                    placeholder="e.g. BRD-2026-002"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Version
                  </label>
                  <input
                    type="text"
                    value={brdVersion}
                    onChange={(e) => setBrdVersion(e.target.value)}
                    placeholder="1.0.0"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Document Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={brdTitle}
                  onChange={(e) => setBrdTitle(e.target.value)}
                  placeholder="e.g. Enterprise Task Sync & Quality Assurance Module"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Executive Summary
                </label>
                <textarea
                  rows={2}
                  value={brdSummary}
                  onChange={(e) => setBrdSummary(e.target.value)}
                  placeholder="Summarize the core business goal..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Business Objectives
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={brdObjectiveInput}
                    onChange={(e) => setBrdObjectiveInput(e.target.value)}
                    placeholder="Add an objective and click Add..."
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddObjective}
                    className="px-3 py-2 bg-slate-100 dark:bg-slate-800 font-semibold rounded-xl text-slate-700 dark:text-slate-200"
                  >
                    Add
                  </button>
                </div>
                {brdObjectives.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {brdObjectives.map((obj, i) => (
                      <li key={i} className="text-[11px] text-slate-500 flex items-center gap-1.5">
                        <Check size={12} className="text-emerald-500" />
                        <span>{obj}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBrdModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
                >
                  Save BRD
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
