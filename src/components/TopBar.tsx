/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Plus, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { SyncStatusState } from '../types/task';

export type ActiveTab =
  | 'kanban'
  | 'matrix'
  | 'calendar'
  | 'requirements'
  | 'testing'
  | 'sheets'
  | 'flutter';

interface TopBarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenNewTaskModal: () => void;
  syncStatus: SyncStatusState;
  onTriggerSync: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onSelectTab,
  onOpenNewTaskModal,
  syncStatus,
  onTriggerSync
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-6 py-3.5 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
        {/* Zone 1: Brand Single Line Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onSelectTab('kanban')}
            className="flex items-center gap-2 text-left group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-xs group-hover:bg-indigo-700 transition-colors">
              TF
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0">
              TaskFlow
            </span>
          </button>
        </div>

        {/* Zone 2: Navigation Links (single-line, clean hover underline or active styling) */}
        <nav className="hidden lg:flex items-center gap-6 text-xs xl:text-sm font-medium text-slate-600 dark:text-slate-300 overflow-x-auto">
          <button
            onClick={() => onSelectTab('kanban')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 cursor-pointer ${
              activeTab === 'kanban'
                ? 'text-indigo-600 dark:text-indigo-400 font-semibold border-b-2 border-indigo-600 dark:border-indigo-400'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Kanban
          </button>
          <button
            onClick={() => onSelectTab('matrix')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 cursor-pointer ${
              activeTab === 'matrix'
                ? 'text-indigo-600 dark:text-indigo-400 font-semibold border-b-2 border-indigo-600 dark:border-indigo-400'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Eisenhower Matrix
          </button>
          <button
            onClick={() => onSelectTab('calendar')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 cursor-pointer ${
              activeTab === 'calendar'
                ? 'text-indigo-600 dark:text-indigo-400 font-semibold border-b-2 border-indigo-600 dark:border-indigo-400'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Calendar
          </button>
          <button
            onClick={() => onSelectTab('requirements')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 cursor-pointer ${
              activeTab === 'requirements'
                ? 'text-indigo-600 dark:text-indigo-400 font-semibold border-b-2 border-indigo-600 dark:border-indigo-400'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            BRD & CR Manager
          </button>
          <button
            onClick={() => onSelectTab('testing')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 cursor-pointer ${
              activeTab === 'testing'
                ? 'text-indigo-600 dark:text-indigo-400 font-semibold border-b-2 border-indigo-600 dark:border-indigo-400'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Testing (SIT/UIT)
          </button>
          <button
            onClick={() => onSelectTab('sheets')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'sheets'
                ? 'text-indigo-600 dark:text-indigo-400 font-semibold border-b-2 border-indigo-600 dark:border-indigo-400'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Sheets API
            {syncStatus.isConfigured ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500" title="Connected" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-400" title="Offline Mode" />
            )}
          </button>
          <button
            onClick={() => onSelectTab('flutter')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 cursor-pointer ${
              activeTab === 'flutter'
                ? 'text-indigo-600 dark:text-indigo-400 font-semibold border-b-2 border-indigo-600 dark:border-indigo-400'
                : 'hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Flutter Export
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action (plus sync quick action) */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onTriggerSync}
            disabled={syncStatus.isSyncing}
            title={
              syncStatus.isConfigured
                ? `Sync with Google Sheets (Last: ${syncStatus.lastSyncedAt || 'Never'})`
                : 'Connect Google Sheets'
            }
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw
              size={13}
              className={`${syncStatus.isSyncing ? 'animate-spin text-indigo-600 dark:text-indigo-400' : ''}`}
            />
            <span className="hidden sm:inline">
              {syncStatus.isSyncing ? 'Syncing...' : syncStatus.isConfigured ? 'Sync Sheets' : 'Offline'}
            </span>
            {syncStatus.isConfigured && !syncStatus.isSyncing && (
              <CheckCircle2 size={13} className="text-emerald-500" />
            )}
            {syncStatus.lastError && (
              <AlertCircle size={13} className="text-amber-500" />
            )}
          </button>

          <button
            onClick={onOpenNewTaskModal}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus size={15} />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Mobile/Tablet Secondary Nav Strip */}
      <div className="lg:hidden flex items-center gap-3 text-xs font-medium text-slate-600 dark:text-slate-300 overflow-x-auto pt-2.5 mt-2 border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={() => onSelectTab('kanban')}
          className={`whitespace-nowrap shrink-0 py-1 ${activeTab === 'kanban' ? 'text-indigo-600 font-bold' : ''}`}
        >
          Kanban
        </button>
        <button
          onClick={() => onSelectTab('matrix')}
          className={`whitespace-nowrap shrink-0 py-1 ${activeTab === 'matrix' ? 'text-indigo-600 font-bold' : ''}`}
        >
          Matrix
        </button>
        <button
          onClick={() => onSelectTab('calendar')}
          className={`whitespace-nowrap shrink-0 py-1 ${activeTab === 'calendar' ? 'text-indigo-600 font-bold' : ''}`}
        >
          Calendar
        </button>
        <button
          onClick={() => onSelectTab('requirements')}
          className={`whitespace-nowrap shrink-0 py-1 ${activeTab === 'requirements' ? 'text-indigo-600 font-bold' : ''}`}
        >
          BRD & CR
        </button>
        <button
          onClick={() => onSelectTab('testing')}
          className={`whitespace-nowrap shrink-0 py-1 ${activeTab === 'testing' ? 'text-indigo-600 font-bold' : ''}`}
        >
          Testing
        </button>
        <button
          onClick={() => onSelectTab('sheets')}
          className={`whitespace-nowrap shrink-0 py-1 ${activeTab === 'sheets' ? 'text-indigo-600 font-bold' : ''}`}
        >
          Sheets API
        </button>
        <button
          onClick={() => onSelectTab('flutter')}
          className={`whitespace-nowrap shrink-0 py-1 ${activeTab === 'flutter' ? 'text-indigo-600 font-bold' : ''}`}
        >
          Flutter
        </button>
      </div>
    </header>
  );
};
