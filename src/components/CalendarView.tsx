/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { Task, TaskPriority, TaskStatus } from '../types/task';
import { TaskCard } from './TaskCard';
import { formatDisplayDueDate } from '../utils/dateFormatter';

interface CalendarViewProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onAddTaskOnDate: (dateStr: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  tasks,
  onEditTask,
  onDeleteTask,
  onStatusChange,
  onToggleSubtask,
  onAddTaskOnDate
}) => {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    today.toISOString().slice(0, 10)
  );

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    setSelectedDateStr(now.toISOString().slice(0, 10));
  };

  // Calendar matrix calculations
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  const calendarDays: { dayNum: number; isCurrentMonth: boolean; dateStr: string }[] = [];

  // Previous month trailing days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const prevMonthIdx = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const dateStr = `${prevYear}-${String(prevMonthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    calendarDays.push({ dayNum: day, isCurrentMonth: false, dateStr });
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    calendarDays.push({ dayNum: day, isCurrentMonth: true, dateStr });
  }

  // Next month leading days to complete 35 or 42 grid cells
  const remainingCells = (7 - (calendarDays.length % 7)) % 7;
  for (let day = 1; day <= remainingCells; day++) {
    const nextMonthIdx = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    const dateStr = `${nextYear}-${String(nextMonthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    calendarDays.push({ dayNum: day, isCurrentMonth: false, dateStr });
  }

  // Tasks for selected date
  const selectedDateTasks = tasks.filter((t) => t.dueDate === selectedDateStr);

  return (
    <div className="w-full grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
      {/* Calendar Grid (2 Cols on desktop) */}
      <div className="xl:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
        {/* Calendar Navigation Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <CalendarIcon size={18} className="text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {monthNames[currentMonth]} {currentYear}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-md transition-colors"
            >
              Today
            </button>
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevMonth}
                className="p-1 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Previous Month"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Next Month"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Days of week */}
        <div className="grid grid-cols-7 gap-1 text-center py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        {/* Grid Cells */}
        <div className="grid grid-cols-7 gap-1.5 mt-1">
          {calendarDays.map((cell) => {
            const isSelected = cell.dateStr === selectedDateStr;
            const isToday = cell.dateStr === today.toISOString().slice(0, 10);
            const dayTasks = tasks.filter((t) => t.dueDate === cell.dateStr);
            const hasUrgent = dayTasks.some((t) => t.priority === 'urgent' && t.status !== 'done');
            const hasPending = dayTasks.some((t) => t.status !== 'done');

            return (
              <button
                key={cell.dateStr}
                onClick={() => setSelectedDateStr(cell.dateStr)}
                className={`relative min-h-[76px] p-2 rounded-xl text-left border flex flex-col justify-between transition-all cursor-pointer ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 ring-1 ring-indigo-500'
                    : isToday
                    ? 'border-indigo-300 dark:border-indigo-700 bg-slate-50 dark:bg-slate-800/40'
                    : cell.isCurrentMonth
                    ? 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                    : 'border-transparent text-slate-300 dark:text-slate-600 bg-slate-50/30 dark:bg-slate-950/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`font-mono tabular-nums text-xs font-bold ${
                      isSelected
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : isToday
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : cell.isCurrentMonth
                        ? 'text-slate-800 dark:text-slate-200'
                        : 'text-slate-400 dark:text-slate-600'
                    }`}
                  >
                    {cell.dayNum}
                  </span>

                  {dayTasks.length > 0 && (
                    <span className="text-[10px] font-mono tabular-nums font-semibold px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {dayTasks.length}
                    </span>
                  )}
                </div>

                {/* Task indicators preview */}
                <div className="mt-1 space-y-0.5 overflow-hidden">
                  {dayTasks.slice(0, 2).map((t) => (
                    <div
                      key={t.id}
                      className="truncate text-[10px] px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                    >
                      {t.title}
                    </div>
                  ))}
                  {dayTasks.length > 2 && (
                    <span className="text-[9px] text-slate-400 block">
                      +{dayTasks.length - 2} more
                    </span>
                  )}
                </div>

                {/* Status Dot */}
                {hasPending && (
                  <span
                    className={`absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full ${
                      hasUrgent ? 'bg-rose-500' : 'bg-indigo-500'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Agenda Column */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Agenda {formatDisplayDueDate(selectedDateStr)}
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              {selectedDateTasks.length} scheduled {selectedDateTasks.length === 1 ? 'task' : 'tasks'}
            </span>
          </div>

          <button
            onClick={() => onAddTaskOnDate(selectedDateStr)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer"
          >
            <Plus size={14} />
            <span>Add Task</span>
          </button>
        </div>

        {/* Selected Date Tasks List */}
        <div className="mt-4 space-y-3 max-h-[560px] overflow-y-auto">
          {selectedDateTasks.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
              <Clock size={28} className="text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-xs text-slate-600 dark:text-slate-300">
                No tasks scheduled for this day
              </p>
              <button
                onClick={() => onAddTaskOnDate(selectedDateStr)}
                className="mt-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                + Schedule a task
              </button>
            </div>
          ) : (
            selectedDateTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
                onStatusChange={onStatusChange}
                onToggleSubtask={onToggleSubtask}
                showMoveControls={true}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};
