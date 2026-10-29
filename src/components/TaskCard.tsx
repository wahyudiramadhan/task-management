/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Calendar,
  CheckSquare,
  Square,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Edit3,
  Image as ImageIcon,
  FileText,
  GitPullRequest,
  Clock,
  Code2,
  LifeBuoy,
  FlaskConical
} from 'lucide-react';

import { Task, TaskPriority, TaskStatus } from '../types/task';
import {
  formatDisplayDueDate,
  formatRelativeTime,
  formatFullDateTime
} from '../utils/dateFormatter';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  showMoveControls?: boolean;
}

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; textClass: string; dotClass: string }> = {
  urgent: { label: 'Urgent', textClass: 'text-rose-600 dark:text-rose-400', dotClass: 'bg-rose-500' },
  high: { label: 'High', textClass: 'text-amber-600 dark:text-amber-400', dotClass: 'bg-amber-500' },
  medium: { label: 'Medium', textClass: 'text-indigo-600 dark:text-indigo-400', dotClass: 'bg-indigo-500' },
  low: { label: 'Low', textClass: 'text-slate-500 dark:text-slate-400', dotClass: 'bg-slate-400' }
};

const STATUS_COLUMNS: TaskStatus[] = ['backlog', 'in_progress', 'review', 'done'];

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onEdit,
  onDelete,
  onStatusChange,
  onToggleSubtask,
  showMoveControls = true
}) => {
  const [expandedSubtasks, setExpandedSubtasks] = useState(false);

  const priorityMeta = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const currentStatusIndex = STATUS_COLUMNS.indexOf(task.status);
  const canMoveLeft = currentStatusIndex > 0;
  const canMoveRight = currentStatusIndex < STATUS_COLUMNS.length - 1;

  const completedSubtasksCount = task.subtasks.filter((st) => st.completed).length;
  const totalSubtasks = task.subtasks.length;
  const imageCount = task.images?.length || 0;

  const isOverdue =
    task.dueDate &&
    task.status !== 'done' &&
    new Date(task.dueDate).getTime() < new Date().setHours(0, 0, 0, 0);

  return (
    <div className="group relative bg-white dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700/80 p-4 hover:border-indigo-400 dark:hover:border-indigo-500/70 transition-all shadow-xs">
      {/* Header: Title and Actions */}
      <div className="flex items-start justify-between gap-2">
        <h4
          onClick={() => onEdit(task)}
          className={`text-sm font-semibold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer line-clamp-2 leading-snug transition-colors ${
            task.status === 'done' ? 'line-through text-slate-400 dark:text-slate-500' : ''
          }`}
        >
          {task.title}
        </h4>

        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={() => onEdit(task)}
            title="Edit Task"
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md transition-colors"
          >
            <Edit3 size={13} />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            title="Delete Task"
            className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Description */}
      {task.description && (
        <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Image Attachments Mini-strip */}
      {imageCount > 0 && (
        <div className="mt-2.5 flex items-center gap-2 overflow-x-auto pb-1">
          {task.images!.slice(0, 3).map((img) => (
            <img
              key={img.id}
              src={img.dataUrl}
              alt={img.name}
              onClick={() => onEdit(task)}
              className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-700 cursor-pointer hover:opacity-90 transition-opacity shrink-0"
            />
          ))}
          {imageCount > 3 && (
            <span
              onClick={() => onEdit(task)}
              className="text-[10px] font-mono tabular-nums text-slate-500 bg-slate-100 dark:bg-slate-700 px-1.5 py-2.5 rounded-lg cursor-pointer"
            >
              +{imageCount - 3}
            </span>
          )}
        </div>
      )}

      {/* Subtask Checklist Progress */}
      {totalSubtasks > 0 && (
        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/50">
          <div
            onClick={() => setExpandedSubtasks(!expandedSubtasks)}
            className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <CheckSquare size={12} className="text-indigo-500" />
              <span>Subtasks</span>
              <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300 font-medium">
                {completedSubtasksCount}/{totalSubtasks}
              </span>
            </div>
            <span className="text-[10px] text-indigo-500 underline">
              {expandedSubtasks ? 'Hide' : 'View'}
            </span>
          </div>

          {/* Expanded subtask checklist */}
          {expandedSubtasks && (
            <div className="mt-2 space-y-1.5 bg-slate-50 dark:bg-slate-900/40 p-2 rounded-lg">
              {task.subtasks.map((st) => (
                <div
                  key={st.id}
                  onClick={() => onToggleSubtask(task.id, st.id)}
                  className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 hover:text-indigo-600 cursor-pointer"
                >
                  {st.completed ? (
                    <CheckSquare size={13} className="text-emerald-500 shrink-0" />
                  ) : (
                    <Square size={13} className="text-slate-400 shrink-0" />
                  )}
                  <span className={st.completed ? 'line-through text-slate-400 dark:text-slate-500' : ''}>
                    {st.title}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Clean Unboxed Metadata Line (Zero-Pill Rule) */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        {/* Priority */}
        <span className={`inline-flex items-center gap-1 font-medium ${priorityMeta.textClass}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${priorityMeta.dotClass}`} />
          {priorityMeta.label}
        </span>

        <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>

        {/* Due Date */}
        {task.dueDate ? (
          <span
            title={`Due date: ${task.dueDate}`}
            className={`inline-flex items-center gap-1 font-mono tabular-nums ${
              isOverdue
                ? 'text-rose-600 dark:text-rose-400 font-semibold'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <Calendar size={11} />
            {formatDisplayDueDate(task.dueDate)}
            {isOverdue && ' (Overdue)'}
          </span>
        ) : (
          <span className="text-slate-400 dark:text-slate-500">No date</span>
        )}

        {/* Updated / Created Time */}
        {(task.updatedAt || task.createdAt) && (
          <>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
            <span
              title={`Dibuat: ${formatFullDateTime(task.createdAt)} | Terakhir diupdate: ${formatFullDateTime(task.updatedAt)}`}
              className="inline-flex items-center gap-1 font-mono tabular-nums text-slate-500 dark:text-slate-400"
            >
              <Clock size={11} className="text-slate-400" />
              <span>{formatRelativeTime(task.updatedAt || task.createdAt)}</span>
            </span>
          </>
        )}

        {/* Image Attachment indicator if exists */}
        {imageCount > 0 && (
          <>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
            <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400 font-mono tabular-nums">
              <ImageIcon size={11} className="text-indigo-500" />
              {imageCount} {imageCount === 1 ? 'image' : 'images'}
            </span>
          </>
        )}

        {/* Linked BRD or CR indicators */}
        {task.linkedBrdId && (
          <>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
            <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium">
              <FileText size={11} />
              BRD
            </span>
          </>
        )}

        {task.linkedCrId && (
          <>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
              <GitPullRequest size={11} />
              CR
            </span>
          </>
        )}

        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
            <span className="text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
              {task.tags.join(', ')}
            </span>
          </>
        )}
      </div>

      {/* PIC Assigned Badges */}
      {(task.picProgrammer || task.picSupport || task.picTester) && (
        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/50 flex flex-wrap items-center gap-1.5 text-[11px]">
          {task.picProgrammer && (task.picProgrammer.name || task.picProgrammer.email) && (
            <span
              title={`PIC Programmer: ${task.picProgrammer.name} <${task.picProgrammer.email}>`}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-medium border border-indigo-100 dark:border-indigo-900/40"
            >
              <Code2 size={11} className="text-indigo-500" />
              <span>Dev: {task.picProgrammer.name || task.picProgrammer.email}</span>
            </span>
          )}
          {task.picSupport && (task.picSupport.name || task.picSupport.email) && (
            <span
              title={`PIC Support: ${task.picSupport.name} <${task.picSupport.email}>`}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-medium border border-emerald-100 dark:border-emerald-900/40"
            >
              <LifeBuoy size={11} className="text-emerald-500" />
              <span>Ops: {task.picSupport.name || task.picSupport.email}</span>
            </span>
          )}
          {task.picTester && (task.picTester.name || task.picTester.email) && (
            <span
              title={`PIC Tester: ${task.picTester.name} <${task.picTester.email}>`}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-medium border border-amber-100 dark:border-amber-900/40"
            >
              <FlaskConical size={11} className="text-amber-500" />
              <span>QA: {task.picTester.name || task.picTester.email}</span>
            </span>
          )}
        </div>
      )}

      {/* Move Stage Quick Controls */}
      {showMoveControls && (

        <div className="mt-3 pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-700/50 text-[11px] text-slate-500">
          <button
            disabled={!canMoveLeft}
            onClick={() => onStatusChange(task.id, STATUS_COLUMNS[currentStatusIndex - 1])}
            className={`flex items-center gap-0.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors ${
              !canMoveLeft ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            <ChevronLeft size={12} />
            <span>Prev</span>
          </button>

          <span className="capitalize text-[10px] text-slate-400 dark:text-slate-500">
            {task.status.replace('_', ' ')}
          </span>

          <button
            disabled={!canMoveRight}
            onClick={() => onStatusChange(task.id, STATUS_COLUMNS[currentStatusIndex + 1])}
            className={`flex items-center gap-0.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors ${
              !canMoveRight ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            <span>Next</span>
            <ChevronRight size={12} />
          </button>
        </div>
      )}
    </div>
  );
};
