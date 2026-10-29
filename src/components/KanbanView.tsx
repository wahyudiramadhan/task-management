/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Plus, Inbox, Clock, CheckCircle2, Eye, Filter } from 'lucide-react';
import { Task, TaskPriority, TaskStatus } from '../types/task';
import { TaskCard } from './TaskCard';

interface KanbanViewProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onQuickAddTask: (status: TaskStatus) => void;
  searchQuery: string;
  selectedPriority: TaskPriority | 'all';
}

interface ColumnConfig {
  status: TaskStatus;
  title: string;
  icon: React.ReactNode;
  headerBorder: string;
}

const COLUMNS: ColumnConfig[] = [
  {
    status: 'backlog',
    title: 'Backlog',
    icon: <Inbox size={15} className="text-slate-500" />,
    headerBorder: 'border-slate-300 dark:border-slate-700'
  },
  {
    status: 'in_progress',
    title: 'In Progress',
    icon: <Clock size={15} className="text-indigo-500" />,
    headerBorder: 'border-indigo-400 dark:border-indigo-500'
  },
  {
    status: 'review',
    title: 'Review',
    icon: <Eye size={15} className="text-amber-500" />,
    headerBorder: 'border-amber-400 dark:border-amber-500'
  },
  {
    status: 'done',
    title: 'Done',
    icon: <CheckCircle2 size={15} className="text-emerald-500" />,
    headerBorder: 'border-emerald-400 dark:border-emerald-500'
  }
];

export const KanbanView: React.FC<KanbanViewProps> = ({
  tasks,
  onEditTask,
  onDeleteTask,
  onStatusChange,
  onToggleSubtask,
  onQuickAddTask,
  searchQuery,
  selectedPriority
}) => {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      searchQuery.trim() === '' ||
      t.title.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.tags.some((tag) => tag.toLowerCase().includes(q)) ||
      (t.picProgrammer?.name && t.picProgrammer.name.toLowerCase().includes(q)) ||
      (t.picProgrammer?.email && t.picProgrammer.email.toLowerCase().includes(q)) ||
      (t.picSupport?.name && t.picSupport.name.toLowerCase().includes(q)) ||
      (t.picSupport?.email && t.picSupport.email.toLowerCase().includes(q)) ||
      (t.picTester?.name && t.picTester.name.toLowerCase().includes(q)) ||
      (t.picTester?.email && t.picTester.email.toLowerCase().includes(q));


    const matchesPriority =
      selectedPriority === 'all' || t.priority === selectedPriority;

    return matchesSearch && matchesPriority;
  });

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== status) {
      setDragOverColumn(status);
    }
  };

  const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (taskId) {
      onStatusChange(taskId, status);
    }
    setDraggedTaskId(null);
    setDragOverColumn(null);
  };

  return (
    <div className="w-full">
      {/* 4-Column Responsive Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
        {COLUMNS.map((col) => {
          const colTasks = filteredTasks.filter((t) => t.status === col.status);
          const isDragTarget = dragOverColumn === col.status;

          return (
            <div
              key={col.status}
              onDragOver={(e) => handleDragOver(e, col.status)}
              onDragLeave={() => setDragOverColumn(null)}
              onDrop={(e) => handleDrop(e, col.status)}
              className={`flex flex-col rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border transition-all ${
                isDragTarget
                  ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/30 dark:bg-indigo-950/20'
                  : 'border-slate-200/80 dark:border-slate-800'
              }`}
            >
              {/* Column Header */}
              <div className="p-3.5 flex items-center justify-between border-b border-slate-200/70 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  {col.icon}
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                    {col.title}
                  </h3>
                  <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400 font-semibold ml-1">
                    ({colTasks.length})
                  </span>
                </div>

                <button
                  onClick={() => onQuickAddTask(col.status)}
                  title={`Add task to ${col.title}`}
                  className="p-1 rounded-md text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                >
                  <Plus size={15} />
                </button>
              </div>

              {/* Tasks List */}
              <div className="p-3 space-y-3 min-h-[360px] flex flex-col">
                {colTasks.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800/80">
                    <p className="text-xs text-slate-600 dark:text-slate-300">No tasks in {col.title}</p>
                    <button
                      onClick={() => onQuickAddTask(col.status)}
                      className="mt-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      + Add task
                    </button>
                  </div>
                ) : (
                  colTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      className="cursor-grab active:cursor-grabbing"
                    >
                      <TaskCard
                        task={task}
                        onEdit={onEditTask}
                        onDelete={onDeleteTask}
                        onStatusChange={onStatusChange}
                        onToggleSubtask={onToggleSubtask}
                      />
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
