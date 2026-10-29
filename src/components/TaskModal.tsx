/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  Image as ImageIcon,
  UploadCloud,
  ExternalLink,
  FileText,
  GitPullRequest,
  ClipboardPaste,
  Scissors,
  Calendar,
  Clock,
  Code2,
  LifeBuoy,
  FlaskConical,
  Mail,
  Send,
  Users
} from 'lucide-react';
import {
  Task,
  TaskPriority,
  TaskQuadrant,
  TaskStatus,
  SubTask,
  TaskAttachment,
  BRDDocument,
  ChangeRequest,
  PICPerson
} from '../types/task';
import { formatFullDateTime } from '../utils/dateFormatter';
import { sendTaskInviteEmail } from '../services/appsScriptApi';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
  initialTask?: Task | null;
  defaultStatus?: TaskStatus;
  defaultQuadrant?: TaskQuadrant;
  defaultDueDate?: string;
  availableBrds?: BRDDocument[];
  availableCrs?: ChangeRequest[];
  appsScriptUrl?: string;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialTask,
  defaultStatus = 'backlog',
  defaultQuadrant = 1,
  defaultDueDate = '',
  availableBrds = [],
  availableCrs = [],
  appsScriptUrl = ''
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('backlog');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [quadrant, setQuadrant] = useState<TaskQuadrant>(1);
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [images, setImages] = useState<TaskAttachment[]>([]);
  const [picProgName, setPicProgName] = useState('');
  const [picProgEmail, setPicProgEmail] = useState('');
  const [picSuppName, setPicSuppName] = useState('');
  const [picSuppEmail, setPicSuppEmail] = useState('');
  const [picTestName, setPicTestName] = useState('');
  const [picTestEmail, setPicTestEmail] = useState('');
  const [sendingInviteRole, setSendingInviteRole] = useState<string | null>(null);
  const [inviteStatusMessage, setInviteStatusMessage] = useState<string | null>(null);
  const [linkedBrdId, setLinkedBrdId] = useState<string>('');
  const [linkedCrId, setLinkedCrId] = useState<string>('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [pasteSuccessNotice, setPasteSuccessNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Process image file or screenshot blob (with automatic compression and max 1280px dimension)
  const processImageFile = useCallback((file: File | Blob, customName?: string) => {
    if (file.size > 15 * 1024 * 1024) {
      setError(`Image exceeds 15MB limit.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const rawDataUrl = loadEvent.target?.result as string;
      if (!rawDataUrl) return;

      const fileName =
        customName ||
        ('name' in file ? file.name : `screenshot_${Date.now().toString().slice(-4)}.jpg`);

      // Compress and optimize resolution using canvas so sync is fast and never exceeds limits
      const img = new Image();
      img.onload = () => {
        const maxDim = 1280;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.88);

          const newAttachment: TaskAttachment = {
            id: 'img-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
            name: fileName.replace(/\.[^/.]+$/, "") + ".jpg",
            dataUrl: optimizedDataUrl,
            size: Math.round(optimizedDataUrl.length * 0.75),
            uploadedAt: new Date().toISOString()
          };
          setImages((prev) => [...prev, newAttachment]);
          setPasteSuccessNotice(`Attached screenshot: ${newAttachment.name}`);
          setTimeout(() => setPasteSuccessNotice(null), 3000);
          return;
        }

        // Fallback if canvas context unavailable
        const newAttachment: TaskAttachment = {
          id: 'img-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          name: fileName,
          dataUrl: rawDataUrl,
          size: file.size,
          uploadedAt: new Date().toISOString()
        };
        setImages((prev) => [...prev, newAttachment]);
        setPasteSuccessNotice(`Attached screenshot: ${fileName}`);
        setTimeout(() => setPasteSuccessNotice(null), 3000);
      };

      img.onerror = () => {
        // Fallback for non-renderable formats
        const newAttachment: TaskAttachment = {
          id: 'img-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          name: fileName,
          dataUrl: rawDataUrl,
          size: file.size,
          uploadedAt: new Date().toISOString()
        };
        setImages((prev) => [...prev, newAttachment]);
        setPasteSuccessNotice(`Attached screenshot: ${fileName}`);
        setTimeout(() => setPasteSuccessNotice(null), 3000);
      };

      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  }, []);

  // Global clipboard paste listener (Ctrl+V / Cmd+V)
  useEffect(() => {
    if (!isOpen) return;

    const handleWindowPaste = (e: ClipboardEvent) => {
      // Check if user is typing in an input/textarea and pasting regular text
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

      const items = e.clipboardData?.items;
      if (!items) return;

      let imageFound = false;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            imageFound = true;
            const timestamp = new Date().toISOString().slice(11, 19).replace(/:/g, '');
            processImageFile(file, `screenshot_${timestamp}.png`);
          }
        }
      }

      if (imageFound && !isInput) {
        e.preventDefault();
      }
    };

    window.addEventListener('paste', handleWindowPaste);
    return () => {
      window.removeEventListener('paste', handleWindowPaste);
    };
  }, [isOpen, processImageFile]);

  // Drag and drop handlers for floating screenshots and image files
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    if (!isDraggingOver) setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only deactivate if leaving target boundary
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    // 1. Check dataTransfer files (e.g. dragged from desktop or floating screenshot thumbnail)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach((file) => {
        if (file.type.startsWith('image/')) {
          processImageFile(file);
        }
      });
      return;
    }

    // 2. Check dataTransfer items (e.g. floating screenshot tool or browser drag)
    if (e.dataTransfer.items) {
      for (let i = 0; i < e.dataTransfer.items.length; i++) {
        const item = e.dataTransfer.items[i];
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            processImageFile(file);
          }
        }
      }
    }
  };

  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title);
      setDescription(initialTask.description);
      setStatus(initialTask.status);
      setPriority(initialTask.priority);
      setQuadrant(initialTask.quadrant);
      if (initialTask.dueDate) {
        const raw = initialTask.dueDate.trim();
        if (raw.includes(' ') || raw.includes('T')) {
          const parts = raw.replace('T', ' ').split(' ');
          setDueDate(parts[0] || '');
          setDueTime(parts[1]?.slice(0, 5) || '');
        } else {
          setDueDate(raw);
          setDueTime('');
        }
      } else {
        setDueDate('');
        setDueTime('');
      }
      setTags(initialTask.tags || []);
      setSubtasks(initialTask.subtasks || []);
      setImages(initialTask.images || []);
      setPicProgName(initialTask.picProgrammer?.name || '');
      setPicProgEmail(initialTask.picProgrammer?.email || '');
      setPicSuppName(initialTask.picSupport?.name || '');
      setPicSuppEmail(initialTask.picSupport?.email || '');
      setPicTestName(initialTask.picTester?.name || '');
      setPicTestEmail(initialTask.picTester?.email || '');
      setLinkedBrdId(initialTask.linkedBrdId || '');
      setLinkedCrId(initialTask.linkedCrId || '');
    } else {
      setTitle('');
      setDescription('');
      setStatus(defaultStatus);
      setPriority('medium');
      setQuadrant(defaultQuadrant);
      setDueDate(defaultDueDate || new Date().toISOString().slice(0, 10));
      setDueTime('17:00');
      setTags([]);
      setSubtasks([]);
      setImages([]);
      setPicProgName('');
      setPicProgEmail('');
      setPicSuppName('');
      setPicSuppEmail('');
      setPicTestName('');
      setPicTestEmail('');
      setLinkedBrdId('');
      setLinkedCrId('');
    }
    setError(null);
    setInviteStatusMessage(null);
    setPreviewImage(null);
    setIsDraggingOver(false);
  }, [initialTask, isOpen, defaultStatus, defaultQuadrant, defaultDueDate]);

  if (!isOpen) return null;

  const handleSendInvite = async (role: 'programmer' | 'support' | 'tester' | 'all') => {
    if (!appsScriptUrl) {
      setInviteStatusMessage('Perhatian: Hubungkan Google Apps Script di tab Sheets API terlebih dahulu untuk mengirim email otomatis.');
      return;
    }
    setSendingInviteRole(role);
    setInviteStatusMessage(null);

    const tempTask: Task = {
      id: initialTask?.id || 'task-' + Date.now(),
      title: title.trim() || 'Untitled Task',
      description: description.trim(),
      status,
      priority,
      quadrant,
      dueDate: dueDate.trim(),
      tags,
      subtasks,
      images,
      picProgrammer: (picProgName || picProgEmail) ? { name: picProgName.trim(), email: picProgEmail.trim() } : undefined,
      picSupport: (picSuppName || picSuppEmail) ? { name: picSuppName.trim(), email: picSuppEmail.trim() } : undefined,
      picTester: (picTestName || picTestEmail) ? { name: picTestName.trim(), email: picTestEmail.trim() } : undefined,
      createdAt: initialTask?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      const res = await sendTaskInviteEmail(appsScriptUrl, tempTask, role);
      if (res.success) {
        setInviteStatusMessage(`✅ Berhasil! Email undangan telah dikirim.`);
      } else {
        setInviteStatusMessage(`⚠️ Gagal mengirim email: ${res.error || 'Terjadi kesalahan'}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setInviteStatusMessage(`⚠️ Gagal: ${msg}`);
    } finally {
      setSendingInviteRole(null);
    }
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleAddSubtask = () => {
    const trimmed = newSubtaskTitle.trim();
    if (trimmed) {
      const newSt: SubTask = {
        id: 'st-' + Date.now(),
        title: trimmed,
        completed: false
      };
      setSubtasks([...subtasks, newSt]);
      setNewSubtaskTitle('');
    }
  };

  const handleToggleSubtask = (stId: string) => {
    setSubtasks(
      subtasks.map((st) =>
        st.id === stId ? { ...st, completed: !st.completed } : st
      )
    );
  };

  const handleRemoveSubtask = (stId: string) => {
    setSubtasks(subtasks.filter((st) => st.id !== stId));
  };

  // Standard File input handler
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => processImageFile(file));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (imgId: string) => {
    setImages(images.filter((img) => img.id !== imgId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required');
      return;
    }

    const cleanDueDate = dueDate.trim();
    const cleanDueTime = dueTime.trim();
    const formattedDueDate = cleanDueDate
      ? cleanDueTime
        ? `${cleanDueDate} ${cleanDueTime}`
        : cleanDueDate
      : '';

    const now = new Date().toISOString();
    const taskToSave: Task = {
      id: initialTask?.id || 'task-' + Date.now(),
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      quadrant,
      dueDate: formattedDueDate,
      tags,
      subtasks,
      images,
      picProgrammer: (picProgName || picProgEmail)
        ? { name: picProgName.trim(), email: picProgEmail.trim() }
        : undefined,
      picSupport: (picSuppName || picSuppEmail)
        ? { name: picSuppName.trim(), email: picSuppEmail.trim() }
        : undefined,
      picTester: (picTestName || picTestEmail)
        ? { name: picTestName.trim(), email: picTestEmail.trim() }
        : undefined,
      linkedBrdId: linkedBrdId || undefined,
      linkedCrId: linkedCrId || undefined,
      createdAt: initialTask?.createdAt || now,
      updatedAt: now,
      syncStatus: 'pending'
    };

    onSave(taskToSave);
    onClose();
  };


  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-xl border overflow-hidden flex flex-col max-h-[92vh] transition-all ${
            isDraggingOver
              ? 'border-indigo-500 ring-4 ring-indigo-500/20'
              : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          {/* Active Drag-and-Drop Overlay */}
          {isDraggingOver && (
            <div className="absolute inset-0 z-40 bg-indigo-600/90 backdrop-blur-xs flex flex-col items-center justify-center text-white p-6 pointer-events-none animate-in fade-in">
              <Scissors size={48} className="animate-bounce mb-3" />
              <h3 className="text-lg font-bold">Lepaskan Screenshot di Sini!</h3>
              <p className="text-xs opacity-90 mt-1">
                Drop your floating screenshot or image thumbnail to attach instantly.
              </p>
            </div>
          )}

          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {initialTask ? 'Edit Task' : 'Create New Task'}
              </h2>
              <span className="text-[11px] font-mono text-slate-400">
                · Ctrl+V Screenshot Supported
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Modal Body Form */}
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
            {/* Timestamp Meta (Created At & Updated At) */}
            {initialTask && (
              <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/60">
                <div className="flex items-center gap-1.5 font-mono tabular-nums">
                  <Calendar size={13} className="text-slate-400" />
                  <span>Dibuat (Created At): <strong className="text-slate-900 dark:text-white font-semibold">{formatFullDateTime(initialTask.createdAt)}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 font-mono tabular-nums">
                  <Clock size={13} className="text-indigo-500" />
                  <span>Diperbarui (Updated At): <strong className="text-slate-900 dark:text-white font-semibold">{formatFullDateTime(initialTask.updatedAt)}</strong></span>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/30 rounded-lg">
                {error}
              </div>
            )}

            {pasteSuccessNotice && (
              <div className="p-2.5 text-xs text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 rounded-xl flex items-center gap-2">
                <ClipboardPaste size={14} className="shrink-0" />
                <span>{pasteSuccessNotice}</span>
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Task Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Validate Google Sheets API Token Refresh"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Description / Technical Notes
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide task scope, test references, or acceptance criteria..."
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            {/* Row: Status, Priority, Quadrant */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Workflow Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="backlog">Backlog</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="done">Done</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Eisenhower Quadrant
                </label>
                <select
                  value={quadrant}
                  onChange={(e) => setQuadrant(Number(e.target.value) as TaskQuadrant)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={1}>Q1: Do First (Urgent & Important)</option>
                  <option value={2}>Q2: Schedule (Important)</option>
                  <option value={3}>Q3: Delegate (Urgent)</option>
                  <option value={4}>Q4: Eliminate (Backlog)</option>
                </select>
              </div>
            </div>

            {/* Row: Due Date, Due Time & Enterprise Linkage */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Calendar size={12} className="text-indigo-500" />
                  <span>Due Date (Batas Tanggal)</span>
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Clock size={12} className="text-indigo-500" />
                  <span>Due Time (Jam/Waktu)</span>
                </label>
                <input
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <FileText size={12} className="text-indigo-500" />
                  <span>Linked BRD</span>
                </label>
                <select
                  value={linkedBrdId}
                  onChange={(e) => setLinkedBrdId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 truncate"
                >
                  <option value="">None</option>
                  {availableBrds.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} - {b.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <GitPullRequest size={12} className="text-amber-500" />
                  <span>Linked CR</span>
                </label>
                <select
                  value={linkedCrId}
                  onChange={(e) => setLinkedCrId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 truncate"
                >
                  <option value="">None</option>
                  {availableCrs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.crNumber} - {c.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* PERSONNEL & PIC ASSIGNMENT (PROGRAMMER, SUPPORT, TESTER) */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Users size={14} className="text-indigo-500" />
                  <span>Personel & PIC Assignment (Undangan Email Otomatis)</span>
                </label>

                {(picProgEmail || picSuppEmail || picTestEmail) && (
                  <button
                    type="button"
                    disabled={sendingInviteRole !== null}
                    onClick={() => handleSendInvite('all')}
                    className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800/60 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Mail size={12} />
                    <span>{sendingInviteRole === 'all' ? 'Mengirim...' : 'Kirim Undangan ke Semua PIC'}</span>
                  </button>
                )}
              </div>

              {inviteStatusMessage && (
                <div className="mb-2.5 p-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
                  {inviteStatusMessage}
                </div>
              )}

              <div className="space-y-2.5 bg-slate-50/60 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
                {/* 1. PIC Programmer */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex items-center gap-1.5 sm:w-36 shrink-0 text-xs font-medium text-slate-700 dark:text-slate-300">
                    <Code2 size={13} className="text-indigo-500 shrink-0" />
                    <span>PIC Programmer</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Nama Developer"
                    value={picProgName}
                    onChange={(e) => setPicProgName(e.target.value)}
                    className="sm:w-36 px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                  <input
                    type="email"
                    placeholder="email@developer.com"
                    value={picProgEmail}
                    onChange={(e) => setPicProgEmail(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                  {picProgEmail && (
                    <button
                      type="button"
                      disabled={sendingInviteRole !== null}
                      onClick={() => handleSendInvite('programmer')}
                      title="Kirim email pemberitahuan ke Programmer"
                      className="px-2.5 py-1.5 text-[11px] font-medium bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center gap-1 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                    >
                      <Send size={11} />
                      <span>{sendingInviteRole === 'programmer' ? 'Kirim...' : 'Undang'}</span>
                    </button>
                  )}
                </div>

                {/* 2. PIC Support */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex items-center gap-1.5 sm:w-36 shrink-0 text-xs font-medium text-slate-700 dark:text-slate-300">
                    <LifeBuoy size={13} className="text-emerald-500 shrink-0" />
                    <span>PIC Support</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Nama Support / Ops"
                    value={picSuppName}
                    onChange={(e) => setPicSuppName(e.target.value)}
                    className="sm:w-36 px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                  <input
                    type="email"
                    placeholder="support@company.com"
                    value={picSuppEmail}
                    onChange={(e) => setPicSuppEmail(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                  {picSuppEmail && (
                    <button
                      type="button"
                      disabled={sendingInviteRole !== null}
                      onClick={() => handleSendInvite('support')}
                      title="Kirim email pemberitahuan ke Support"
                      className="px-2.5 py-1.5 text-[11px] font-medium bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center gap-1 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                    >
                      <Send size={11} />
                      <span>{sendingInviteRole === 'support' ? 'Kirim...' : 'Undang'}</span>
                    </button>
                  )}
                </div>

                {/* 3. PIC Tester */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex items-center gap-1.5 sm:w-36 shrink-0 text-xs font-medium text-slate-700 dark:text-slate-300">
                    <FlaskConical size={13} className="text-amber-500 shrink-0" />
                    <span>PIC Tester</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Nama QA / Tester"
                    value={picTestName}
                    onChange={(e) => setPicTestName(e.target.value)}
                    className="sm:w-36 px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                  <input
                    type="email"
                    placeholder="qa.tester@company.com"
                    value={picTestEmail}
                    onChange={(e) => setPicTestEmail(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                  {picTestEmail && (
                    <button
                      type="button"
                      disabled={sendingInviteRole !== null}
                      onClick={() => handleSendInvite('tester')}
                      title="Kirim email pemberitahuan ke Tester"
                      className="px-2.5 py-1.5 text-[11px] font-medium bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-amber-600 dark:text-amber-400 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center gap-1 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                    >
                      <Send size={11} />
                      <span>{sendingInviteRole === 'tester' ? 'Kirim...' : 'Undang'}</span>
                    </button>
                  )}
                </div>
              </div>
              <p className="mt-1.5 text-[10px] text-slate-400">
                Email otomatis akan dikirim ke PIC yang ditentukan saat tugas disimpan atau ketika tombol Undang diklik.
              </p>
            </div>

            {/* TASK IMAGE ATTACHMENTS (WITH FLOATING SS DROP & CTRL+V PASTE) */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <ImageIcon size={14} className="text-indigo-500" />
                  <span>Task Image Attachments ({images.length})</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    <UploadCloud size={13} />
                    <span>Browse File</span>
                  </button>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileInputChange}
                className="hidden"
              />

              {/* Floating Screenshot Drop Zone & Paste Target */}
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-4 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
                  isDraggingOver
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40'
                    : 'border-slate-200 dark:border-slate-700/80 hover:border-indigo-400 dark:hover:border-indigo-500 bg-slate-50/60 dark:bg-slate-800/40'
                }`}
              >
                <div className="flex flex-col items-center justify-center space-y-1">
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                    <Scissors size={20} />
                    <span className="text-xs font-bold">
                      Drop Floating Screenshot Di Sini atau Tekan Ctrl+V
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Tarik langsung thumbnail screenshot melayang (Snipping Tool, Mac screenshot, dll)
                    atau cukup <strong>Paste (Ctrl+V / Cmd+V)</strong> kapan saja.
                  </p>
                  <div className="flex items-center gap-2 pt-1 text-[10px] font-mono text-slate-400">
                    <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      ✂️ Floating Screenshot
                    </span>
                    <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      📋 Ctrl+V / Cmd+V
                    </span>
                    <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      📁 Drag & Drop File
                    </span>
                  </div>
                </div>
              </div>

              {/* Image previews grid */}
              {images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                  {images.map((img) => (
                    <div
                      key={img.id}
                      className="group relative rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-800 shadow-xs"
                    >
                      <img
                        src={img.dataUrl}
                        alt={img.name}
                        onClick={() => setPreviewImage(img.dataUrl)}
                        className="w-full h-24 object-cover cursor-pointer hover:scale-105 transition-transform"
                        title="Click to zoom preview"
                      />
                      <div className="p-1.5 flex items-center justify-between bg-white dark:bg-slate-900 text-[10px] text-slate-500">
                        <span className="truncate max-w-[85px]" title={img.name}>
                          {img.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(img.id)}
                          className="text-slate-400 hover:text-rose-500 p-0.5 cursor-pointer"
                          title="Hapus gambar"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tags / Categories
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Add tag and press Enter"
                  className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Add
                </button>
              </div>

              {tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-slate-400 hover:text-rose-500 cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Subtasks Checklist */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Subtasks Checklist ({subtasks.filter((s) => s.completed).length}/{subtasks.length})
              </label>

              <div className="space-y-2 mb-3">
                {subtasks.map((st) => (
                  <div
                    key={st.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-xs"
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleSubtask(st.id)}
                      className="flex items-center gap-2 text-left flex-1"
                    >
                      {st.completed ? (
                        <CheckSquare size={14} className="text-emerald-500 shrink-0" />
                      ) : (
                        <Square size={14} className="text-slate-400 shrink-0" />
                      )}
                      <span className={st.completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'}>
                        {st.title}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubtask(st.id)}
                      className="text-slate-400 hover:text-rose-500 p-0.5 cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSubtask();
                    }
                  }}
                  placeholder="Add checklist item and press Enter..."
                  className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleAddSubtask}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Add Subtask</span>
                </button>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                {initialTask ? 'Save Changes' : 'Create Task'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Lightbox Modal for enlarged image preview */}
      {previewImage && (
        <div
          className="fixed inset-0 z-60 bg-black/85 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img
              src={previewImage}
              alt="Enlarged attachment preview"
              className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl"
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-lg hover:bg-slate-800 cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
