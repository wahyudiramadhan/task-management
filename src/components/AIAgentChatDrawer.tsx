/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  Plus,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Tag,
  CheckSquare,
  Users,
  Code2,
  LifeBuoy,
  FlaskConical,
  RefreshCw,
  Edit3
} from 'lucide-react';
import { Task, AIChatMessage, TaskPriority, TaskQuadrant } from '../types/task';

interface AIAgentChatDrawerProps {
  tasks: Task[];
  onAddTask: (task: Task, autoSync?: boolean) => void;
  onOpenEditModal: (taskDraft: Task) => void;
  appsScriptUrl?: string;
  userEmail?: string;
}

const QUICK_PROMPTS = [
  '⚡ Buatkan tugas perbaikan bug login token expired dengan PIC programmer YudiR413@gmail.com dan tester Siti',
  '🚀 Task integrasi payment gateway Midtrans Sandbox dengan 3 subtask teknis',
  '🧪 Buat tugas SIT & UIT regression testing sebelum rilis ke production',
  '🎯 Buat tugas optimasi database latency dan caching di Google Sheets'
];

export const AIAgentChatDrawer: React.FC<AIAgentChatDrawerProps> = ({
  tasks,
  onAddTask,
  onOpenEditModal,
  appsScriptUrl,
  userEmail = 'YudiR413@gmail.com'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<AIChatMessage[]>(() => [
    {
      id: 'welcome-1',
      role: 'model',
      content:
        'Halo! Saya **TaskFlow AI Agent**. Anda dapat mengobrol dengan saya untuk merancang tugas, memecah subtask, mengatur prioritas & kuadran Eisenhower, serta menugaskan **PIC Programmer**, **PIC Support**, dan **PIC Tester** dengan undangan email otomatis.\n\nCoba ketik kebutuhan tugas Anda di bawah ini!',
      timestamp: new Date().toISOString()
    }
  ]);
  const [addedDraftIds, setAddedDraftIds] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll chat to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      textareaRef.current?.focus();
    }
  }, [isOpen, messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMsg: AIChatMessage = {
      id: 'usr-' + Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai-agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
          context: {
            tasksCount: tasks.length,
            userEmail,
            recentTasks: tasks.slice(-5).map((t) => ({ title: t.title, status: t.status, priority: t.priority }))
          }
        })
      });

      const data = await response.json();

      if (data && data.success) {
        const botMsg: AIChatMessage = {
          id: 'bot-' + Date.now(),
          role: 'model',
          content: data.reply || 'Berikut rekomendasi tugas yang telah saya siapkan:',
          suggestedTask: data.taskDraft || undefined,
          timestamp: new Date().toISOString()
        };
        setMessages((prev) => [...prev, botMsg]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: 'err-' + Date.now(),
            role: 'model',
            content:
              '⚠️ ' + (data?.error || 'Tidak dapat terhubung ke AI Agent saat ini. Silakan coba lagi.'),
            timestamp: new Date().toISOString()
          }
        ]);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setMessages((prev) => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          role: 'model',
          content: `⚠️ Gagal mengirim pesan ke AI Agent: ${errorMsg}`,
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Action to immediately add the proposed task draft to Kanban
  const handleConfirmAddTask = (draft: Partial<Task>, msgId: string) => {
    const now = new Date().toISOString();
    const taskToAdd: Task = {
      id: 'task-' + Date.now(),
      title: draft.title || 'Tugas Baru dari AI',
      description: draft.description || '',
      status: 'backlog',
      priority: (draft.priority as TaskPriority) || 'medium',
      quadrant: (draft.quadrant as TaskQuadrant) || 1,
      dueDate: draft.dueDate || new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
      tags: draft.tags || ['AI Generated'],
      subtasks: (draft.subtasks || []).map((st: any, idx: number) => ({
        id: 'st-' + Date.now() + '-' + idx,
        title: typeof st === 'string' ? st : st.title || 'Subtask',
        completed: false
      })),
      picProgrammer: draft.picProgrammer?.email ? draft.picProgrammer : undefined,
      picSupport: draft.picSupport?.email ? draft.picSupport : undefined,
      picTester: draft.picTester?.email ? draft.picTester : undefined,
      images: [],
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending'
    };

    onAddTask(taskToAdd, true);
    setAddedDraftIds((prev) => ({ ...prev, [msgId]: true }));
  };

  // Open modal with drafted fields
  const handleOpenInModal = (draft: Partial<Task>) => {
    const now = new Date().toISOString();
    const fullDraft: Task = {
      id: 'task-' + Date.now(),
      title: draft.title || '',
      description: draft.description || '',
      status: 'backlog',
      priority: (draft.priority as TaskPriority) || 'medium',
      quadrant: (draft.quadrant as TaskQuadrant) || 1,
      dueDate: draft.dueDate || '',
      tags: draft.tags || ['AI Generated'],
      subtasks: (draft.subtasks || []).map((st: any, idx: number) => ({
        id: 'st-' + Date.now() + '-' + idx,
        title: typeof st === 'string' ? st : st.title || 'Subtask',
        completed: false
      })),
      picProgrammer: draft.picProgrammer,
      picSupport: draft.picSupport,
      picTester: draft.picTester,
      images: [],
      createdAt: now,
      updatedAt: now,
      syncStatus: 'pending'
    };
    onOpenEditModal(fullDraft);
  };

  return (
    <>
      {/* FLOATING ACTION BUTTON (FAB) */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Open AI Agent Chat"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 border border-indigo-400/40 cursor-pointer group"
      >
        <div className="relative">
          <Sparkles size={18} className="animate-spin-slow group-hover:rotate-12 transition-transform" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-indigo-700" />
        </div>
        <span className="font-semibold text-xs tracking-wide">AI Agent Chat</span>
      </button>

      {/* CHAT DRAWER MODAL */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in">
          <div className="w-full max-w-md md:max-w-lg bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 via-white to-indigo-50/20 dark:from-slate-900 dark:to-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                  <Bot size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      TaskFlow Agentic AI
                    </h3>
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium text-emerald-600 dark:text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Gemini 2.5 Flash
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Otomatisasi pembuatan tugas, subtask & PIC Email
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setMessages([
                      {
                        id: 'welcome-1',
                        role: 'model',
                        content:
                          'Halo! Ada tugas baru apa yang ingin Anda rancang hari ini? Ketik saja secara bebas!',
                        timestamp: new Date().toISOString()
                      }
                    ]);
                  }}
                  title="Clear chat"
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  <RefreshCw size={14} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Quick Prompt Chips */}
            <div className="px-4 py-2 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800/80 overflow-x-auto flex gap-1.5 text-xs no-scrollbar">
              {QUICK_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(prompt)}
                  disabled={isLoading}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-slate-600 dark:text-slate-300 text-[11px] whitespace-nowrap shrink-0 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {prompt.slice(0, 32)}...
                </button>
              ))}
            </div>

            {/* Chat Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'model' && (
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles size={14} />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-xs'
                    }`}
                  >
                    {/* Message Text with simple bold/newline support */}
                    <div className="space-y-1.5 whitespace-pre-wrap">
                      {msg.content
                        .replace(/```json[\s\S]*?```/g, '') // strip raw json block since rendered in card
                        .trim()}
                    </div>

                    {/* AI Structured Task Proposal Card */}
                    {msg.suggestedTask && (
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/80 space-y-2.5 text-slate-900 dark:text-slate-100">
                        <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-indigo-200 dark:border-indigo-900/60 shadow-xs space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-bold text-xs text-indigo-700 dark:text-indigo-400 leading-snug">
                              📌 {msg.suggestedTask.title || 'Usulan Tugas Baru'}
                            </h4>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 font-semibold uppercase">
                              {msg.suggestedTask.priority || 'medium'}
                            </span>
                          </div>

                          {msg.suggestedTask.description && (
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-3">
                              {msg.suggestedTask.description}
                            </p>
                          )}

                          {/* Task Meta: Due Date & Quadrant */}
                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 font-mono">
                            {msg.suggestedTask.dueDate && (
                              <span className="flex items-center gap-1">
                                <Calendar size={11} className="text-indigo-500" />
                                {msg.suggestedTask.dueDate}
                              </span>
                            )}
                            <span>·</span>
                            <span>Kuadran {msg.suggestedTask.quadrant || 1} (Eisenhower)</span>
                          </div>

                          {/* PIC Roles Display */}
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-[11px]">
                            {msg.suggestedTask.picProgrammer && (msg.suggestedTask.picProgrammer.name || msg.suggestedTask.picProgrammer.email) && (
                              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                                <Code2 size={12} className="text-indigo-500 shrink-0" />
                                <span className="font-semibold">PIC Programmer:</span>
                                <span className="truncate">
                                  {msg.suggestedTask.picProgrammer.name} {msg.suggestedTask.picProgrammer.email ? `(${msg.suggestedTask.picProgrammer.email})` : ''}
                                </span>
                              </div>
                            )}

                            {msg.suggestedTask.picSupport && (msg.suggestedTask.picSupport.name || msg.suggestedTask.picSupport.email) && (
                              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                                <LifeBuoy size={12} className="text-emerald-500 shrink-0" />
                                <span className="font-semibold">PIC Support:</span>
                                <span className="truncate">
                                  {msg.suggestedTask.picSupport.name} {msg.suggestedTask.picSupport.email ? `(${msg.suggestedTask.picSupport.email})` : ''}
                                </span>
                              </div>
                            )}

                            {msg.suggestedTask.picTester && (msg.suggestedTask.picTester.name || msg.suggestedTask.picTester.email) && (
                              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                                <FlaskConical size={12} className="text-amber-500 shrink-0" />
                                <span className="font-semibold">PIC Tester:</span>
                                <span className="truncate">
                                  {msg.suggestedTask.picTester.name} {msg.suggestedTask.picTester.email ? `(${msg.suggestedTask.picTester.email})` : ''}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Subtasks breakdown */}
                          {msg.suggestedTask.subtasks && msg.suggestedTask.subtasks.length > 0 && (
                            <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800">
                              <span className="text-[10px] font-semibold text-slate-500 block mb-1">
                                Subtasks ({msg.suggestedTask.subtasks.length}):
                              </span>
                              <div className="space-y-1">
                                {msg.suggestedTask.subtasks.map((st: any, i: number) => (
                                  <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                                    <CheckSquare size={11} className="text-indigo-400 shrink-0" />
                                    <span>{typeof st === 'string' ? st : st.title}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="pt-2 flex items-center gap-2">
                            {addedDraftIds[msg.id] ? (
                              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold text-xs py-1">
                                <CheckCircle2 size={14} />
                                <span>Tugas Berhasil Ditambahkan ke Board!</span>
                              </div>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleConfirmAddTask(msg.suggestedTask!, msg.id)}
                                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                                >
                                  <Plus size={13} />
                                  <span>Tambahkan ke Board</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenInModal(msg.suggestedTask!)}
                                  className="flex items-center gap-1 py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs transition-colors cursor-pointer"
                                  title="Sesuaikan di form"
                                >
                                  <Edit3 size={12} />
                                  <span>Edit</span>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <User size={14} />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-2.5 justify-start">
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center shrink-0">
                    <Sparkles size={14} className="animate-spin" />
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-3.5 text-xs text-slate-500 rounded-bl-xs flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" />
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]" />
                    <span className="font-mono text-[11px] text-slate-400 ml-1">
                      AI Agent sedang merancang tugas...
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-end gap-2 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 p-2 focus-within:ring-2 focus-within:ring-indigo-500 transition-all"
              >
                <textarea
                  ref={textareaRef}
                  rows={2}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Ketik tugas yang ingin dibuat (misal: PIC programmer Budi, tester Siti, deadline 3 hari)..."
                  className="flex-1 bg-transparent border-0 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden resize-none leading-relaxed"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isLoading}
                  className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white transition-colors cursor-pointer shrink-0"
                >
                  <Send size={14} />
                </button>
              </form>
              <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400 px-1">
                <span>Tekan <strong>Enter</strong> untuk mengirim</span>
                <span>Role: Programmer, Support, Tester</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
