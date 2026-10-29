/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  AlertTriangle,
  CalendarCheck,
  Users,
  Archive,
  Plus,
  ArrowRight
} from 'lucide-react';
import { Task, TaskQuadrant, TaskStatus } from '../types/task';
import { TaskCard } from './TaskCard';

interface EisenhowerMatrixViewProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onQuickAddToQuadrant: (quadrant: TaskQuadrant) => void;
  onMoveQuadrant: (taskId: string, newQuadrant: TaskQuadrant) => void;
  searchQuery: string;
}

interface QuadrantInfo {
  quadrant: TaskQuadrant;
  name: string;
  tagline: string;
  action: string;
  icon: React.ReactNode;
  accentBorder: string;
  badgeClass: string;
  bgLight: string;
}

const QUADRANTS: QuadrantInfo[] = [
  {
    quadrant: 1,
    name: 'Do First',
    tagline: 'Urgent & Important',
    action: 'Crisis, immediate deadlines & critical blockers',
    icon: <AlertTriangle size={16} className="text-rose-500" />,
    accentBorder: 'border-rose-400 dark:border-rose-600/70',
    badgeClass: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40',
    bgLight: 'from-rose-50/20 to-transparent'
  },
  {
    quadrant: 2,
    name: 'Schedule',
    tagline: 'Important, Not Urgent',
    action: 'Strategic planning, deep work & growth',
    icon: <CalendarCheck size={16} className="text-amber-500" />,
    accentBorder: 'border-amber-400 dark:border-amber-600/70',
    badgeClass: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40',
    bgLight: 'from-amber-50/20 to-transparent'
  },
  {
    quadrant: 3,
    name: 'Delegate',
    tagline: 'Urgent, Not Important',
    action: 'Standup notes, interruptions & routine requests',
    icon: <Users size={16} className="text-sky-500" />,
    accentBorder: 'border-sky-400 dark:border-sky-600/70',
    badgeClass: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40',
    bgLight: 'from-sky-50/20 to-transparent'
  },
  {
    quadrant: 4,
    name: 'Eliminate',
    tagline: 'Neither Urgent nor Important',
    action: 'Low-impact chores, backlog cleanup & distractions',
    icon: <Archive size={16} className="text-slate-400" />,
    accentBorder: 'border-slate-300 dark:border-slate-700',
    badgeClass: 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800',
    bgLight: 'from-slate-50/20 to-transparent'
  }
];

export const EisenhowerMatrixView: React.FC<EisenhowerMatrixViewProps> = ({
  tasks,
  onEditTask,
  onDeleteTask,
  onStatusChange,
  onToggleSubtask,
  onQuickAddToQuadrant,
  onMoveQuadrant,
  searchQuery
}) => {
  const filteredTasks = tasks.filter((t) => {
    return (
      searchQuery.trim() === '' ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  return (
    <div className="w-full space-y-4">
      {/* 2x2 Matrix Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {QUADRANTS.map((q) => {
          const qTasks = filteredTasks.filter((t) => t.quadrant === q.quadrant);

          return (
            <div
              key={q.quadrant}
              className={`flex flex-col rounded-2xl bg-white dark:bg-slate-900 border ${q.accentBorder} shadow-xs overflow-hidden transition-all`}
            >
              {/* Quadrant Header */}
              <div className={`p-4 border-b border-slate-100 dark:border-slate-800/80 bg-gradient-to-r ${q.bgLight}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {q.icon}
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                      Q{q.quadrant}: {q.name}
                    </h3>
                    <span className="text-xs text-slate-600 dark:text-slate-300">
                      ({q.tagline})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono tabular-nums text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {qTasks.length} {qTasks.length === 1 ? 'task' : 'tasks'}
                    </span>
                    <button
                      onClick={() => onQuickAddToQuadrant(q.quadrant)}
                      className="p-1 rounded-md text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title={`Add task to Q${q.quadrant}`}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {q.action}
                </p>
              </div>

              {/* Tasks List */}
              <div className="p-4 space-y-3 min-h-[220px] max-h-[500px] overflow-y-auto">
                {qTasks.length === 0 ? (
                  <div className="h-32 flex flex-col items-center justify-center text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                    <p className="text-xs text-slate-600 dark:text-slate-300">No tasks in this quadrant</p>
                    <button
                      onClick={() => onQuickAddToQuadrant(q.quadrant)}
                      className="mt-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      + Add to Q{q.quadrant}
                    </button>
                  </div>
                ) : (
                  qTasks.map((task) => (
                    <div key={task.id} className="relative">
                      <TaskCard
                        task={task}
                        onEdit={onEditTask}
                        onDelete={onDeleteTask}
                        onStatusChange={onStatusChange}
                        onToggleSubtask={onToggleSubtask}
                        showMoveControls={true}
                      />
                      {/* Quadrant Quick Reassign Selector */}
                      <div className="mt-1.5 flex items-center justify-end gap-1 text-[11px] text-slate-600 dark:text-slate-300 px-1">
                        <span>Move:</span>
                        {[1, 2, 3, 4]
                          .filter((targetQ) => targetQ !== q.quadrant)
                          .map((targetQ) => (
                            <button
                              key={targetQ}
                              onClick={() => onMoveQuadrant(task.id, targetQ as TaskQuadrant)}
                              className="px-1.5 py-0.5 rounded text-[10px] font-mono hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                            >
                              Q{targetQ}
                            </button>
                          ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
