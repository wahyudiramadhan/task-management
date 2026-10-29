/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Copy,
  Check,
  ExternalLink,
  Zap,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Table,
  Layers,
  FileText,
  GitPullRequest,
  FileCheck
} from 'lucide-react';
import {
  APPS_SCRIPT_CODE,
  testAppsScriptConnection,
  SPREADSHEET_URL_KEY
} from '../services/appsScriptApi';
import { SyncStatusState, Task, BRDDocument, ChangeRequest, TestCase } from '../types/task';

interface SheetsSetupModalProps {
  currentUrl: string;
  onSaveUrl: (url: string) => void;
  syncStatus: SyncStatusState;
  onManualSyncPush: () => Promise<void>;
  onManualSyncPull: () => Promise<void>;
  tasksCount: number;
  brdsCount: number;
  crsCount: number;
  testCasesCount: number;
}

export const SheetsSetupModal: React.FC<SheetsSetupModalProps> = ({
  currentUrl,
  onSaveUrl,
  syncStatus,
  onManualSyncPush,
  onManualSyncPull,
  tasksCount,
  brdsCount,
  crsCount,
  testCasesCount
}) => {
  const [urlInput, setUrlInput] = useState(currentUrl);
  const [spreadsheetDirectUrl, setSpreadsheetDirectUrl] = useState(() => {
    return localStorage.getItem(SPREADSHEET_URL_KEY) || '';
  });
  const [copied, setCopied] = useState(false);
  const [testResult, setTestResult] = useState<{
    tested: boolean;
    success: boolean;
    message: string;
    latencyMs: number;
    spreadsheetTitle?: string;
    spreadsheetUrl?: string;
  } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSaveAndTest = async () => {
    const trimmed = urlInput.trim();
    onSaveUrl(trimmed);
    if (!trimmed) {
      setTestResult({
        tested: true,
        success: false,
        message: 'Cleared Web App URL. TaskFlow is running in local storage cache.',
        latencyMs: 0
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    const res = await testAppsScriptConnection(trimmed);
    setIsTesting(false);

    if (res.spreadsheetUrl && !spreadsheetDirectUrl) {
      setSpreadsheetDirectUrl(res.spreadsheetUrl);
      localStorage.setItem(SPREADSHEET_URL_KEY, res.spreadsheetUrl);
    }

    setTestResult({
      tested: true,
      success: res.success,
      message: res.message,
      latencyMs: res.latencyMs,
      spreadsheetTitle: res.spreadsheetTitle,
      spreadsheetUrl: res.spreadsheetUrl
    });
  };

  const handleSaveSpreadsheetLink = (val: string) => {
    setSpreadsheetDirectUrl(val.trim());
    localStorage.setItem(SPREADSHEET_URL_KEY, val.trim());
  };

  const handlePush = async () => {
    setIsPushing(true);
    await onManualSyncPush();
    setIsPushing(false);
  };

  const handlePull = async () => {
    setIsPulling(true);
    await onManualSyncPull();
    setIsPulling(false);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Top Banner / Hero Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <FileSpreadsheet size={26} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Google Spreadsheet Enterprise Relational Database</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 font-semibold">
                  4 Database Tabs
                </span>
              </h2>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                <strong>Ya, seluruh data disimpan di Google Spreadsheet Anda!</strong> Google Apps Script otomatis
                membuat dan mengelola 4 tab sheet terpisah untuk <strong>Tasks</strong>, <strong>BRD</strong>,{' '}
                <strong>Change Requests (CR)</strong>, dan <strong>Test Cases (SIT & UIT)</strong>.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {spreadsheetDirectUrl ? (
              <a
                href={spreadsheetDirectUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors whitespace-nowrap shadow-xs"
              >
                <span>Open My Google Spreadsheet</span>
                <ExternalLink size={13} />
              </a>
            ) : (
              <a
                href="https://sheets.new"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors whitespace-nowrap"
              >
                <span>Create New Spreadsheet (sheets.new)</span>
                <ExternalLink size={13} />
              </a>
            )}
          </div>
        </div>

        {/* 4 Database Sheets Overview Grid */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50">
            <div className="flex items-center gap-1.5 font-bold text-indigo-700 dark:text-indigo-400">
              <Table size={14} />
              <span>1. Tasks Tab</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Planners, Checklists, Status, Priorities & Images.
            </p>
            <span className="font-mono text-xs font-bold text-indigo-600 mt-2 block">
              {tasksCount} rows
            </span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50">
            <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400">
              <FileText size={14} />
              <span>2. BRD Tab</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Business Objectives, Scope & Requirements matrix.
            </p>
            <span className="font-mono text-xs font-bold text-emerald-600 mt-2 block">
              {brdsCount} documents
            </span>
          </div>

          <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50">
            <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400">
              <GitPullRequest size={14} />
              <span>3. ChangeRequests Tab</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              CR Numbers, Impact analysis, and Approvals.
            </p>
            <span className="font-mono text-xs font-bold text-amber-600 mt-2 block">
              {crsCount} requests
            </span>
          </div>

          <div className="p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/50">
            <div className="flex items-center gap-1.5 font-bold text-purple-700 dark:text-purple-400">
              <FileCheck size={14} />
              <span>4. TestCases Tab</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              SIT & UIT test runs, verdicts, and tester logs.
            </p>
            <span className="font-mono text-xs font-bold text-purple-600 mt-2 block">
              {testCasesCount} cases
            </span>
          </div>
        </div>
      </div>

      {/* Connection Settings & Ping Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span>Google Apps Script Web App URL</span>
            {syncStatus.isConfigured ? (
              <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 size={13} /> Active & Connected
              </span>
            ) : (
              <span className="text-xs font-normal text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <AlertCircle size={13} /> Local Mode (No Webhook Configured)
              </span>
            )}
          </span>
        </h3>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://script.google.com/macros/s/AKfycb.../exec"
            className="flex-1 px-4 py-2.5 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />

          <button
            onClick={handleSaveAndTest}
            disabled={isTesting}
            className="flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
          >
            {isTesting ? (
              <>
                <RefreshCw size={13} className="animate-spin" />
                <span>Testing...</span>
              </>
            ) : (
              <>
                <Zap size={13} />
                <span>Save & Test Ping</span>
              </>
            )}
          </button>
        </div>

        {/* Optional: Spreadsheet Direct View URL */}
        <div className="pt-2">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Google Spreadsheet Direct URL (Untuk tautan pintas buka spreadsheet):
          </label>
          <input
            type="url"
            value={spreadsheetDirectUrl}
            onChange={(e) => handleSaveSpreadsheetLink(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFM.../edit"
            className="w-full px-4 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Test Result Feedback */}
        {testResult && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
              testResult.success
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={16} className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className="font-semibold">{testResult.message}</p>
              {testResult.spreadsheetTitle && (
                <p className="text-[11px] mt-0.5">
                  Spreadsheet: <strong>{testResult.spreadsheetTitle}</strong>
                </p>
              )}
              {testResult.latencyMs > 0 && (
                <p className="text-[11px] opacity-80 mt-0.5 font-mono">
                  Latency: {testResult.latencyMs}ms
                </p>
              )}
            </div>
          </div>
        )}

        {/* Full Synchronize Buttons */}
        {/* Full Synchronize Buttons with clear explanations */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              Total data in memory: <strong className="text-slate-800 dark:text-slate-200">{tasksCount + brdsCount + crsCount + testCasesCount}</strong> records
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePull}
                disabled={!syncStatus.isConfigured || isPulling}
                title="Tarik data terbaru dari Google Sheets tanpa menghapus screenshot lokal Anda"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-colors disabled:opacity-40 cursor-pointer"
              >
                <RefreshCw size={12} className={isPulling ? 'animate-spin' : ''} />
                <span>{isPulling ? 'Pulling All...' : 'Pull from Sheets (Tarik)'}</span>
              </button>

              <button
                onClick={handlePush}
                disabled={!syncStatus.isConfigured || isPushing}
                title="Kirim seluruh data lokal (termasuk screenshot gambar) ke Google Sheets"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors disabled:opacity-40 cursor-pointer shadow-xs"
              >
                <RefreshCw size={12} className={isPushing ? 'animate-spin' : ''} />
                <span>{isPushing ? 'Pushing All...' : 'Push All 4 Tables (Kirim ke Sheets)'}</span>
              </button>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            💡 <strong>Tips:</strong> Klik tombol hijau <strong>Push All 4 Tables (Kirim ke Sheets)</strong> untuk mengunggah semua screenshot gambar dan data task ke spreadsheet. Gambar screenshot tidak akan pernah terhapus saat melakukan sinkronisasi.
          </p>
        </div>
      </div>

      {/* Drive Authorization & Email Guide Banner */}
      <div className="bg-indigo-50/90 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 p-5 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 font-bold text-sm shadow-xs">
            🔑
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
              <span>Aktivasi Gambar Screenshot & Undangan Email Otomatis ke PIC</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 font-semibold">
                Fitur Baru
              </span>
            </h4>
            <p className="text-[11px] text-indigo-800/90 dark:text-indigo-300 leading-relaxed mt-1">
              Google Apps Script sekarang otomatis mendukung <strong>Multiple Images</strong> (semua gambar tersimpan di Google Drive & tampil di sel) serta <strong>Pengiriman Email Otomatis</strong> ke <strong>PIC Programmer</strong>, <strong>PIC Support</strong>, dan <strong>PIC Tester</strong>:
            </p>
            <ol className="list-decimal list-inside text-[11px] text-indigo-900 dark:text-indigo-200 space-y-1.5 mt-2 font-medium">
              <li>Di Google Spreadsheet Anda, buka <strong>Extensions (Ekstensi) &gt; Apps Script</strong>, salin kode terbaru di bawah ini ke <code>Code.gs</code> lalu klik Simpan.</li>
              <li>Di toolbar atas, klik dropdown fungsi lalu pilih <strong><code>authorizeDriveAndEmail</code></strong>.</li>
              <li>Klik tombol <strong>Run (Jalankan / ikon Play)</strong>.</li>
              <li>Google akan memunculkan popup: Klik <strong>Review permissions (Tinjau izin)</strong> &gt; pilih akun Google Anda &gt; klik <strong>Advanced (Lanjutan)</strong> &gt; klik <strong>Go to TaskFlow (tidak aman)</strong> &gt; klik <strong>Allow (Izinkan)</strong>.</li>
              <li>Klik <strong>Deploy &gt; Manage deployments &gt; Edit &gt; New version &gt; Deploy</strong>. Sekarang setiap tugas dengan PIC akan mengirim email otomatis dan gambar akan tampil langsung di spreadsheet!</li>
            </ol>
          </div>
        </div>
      </div>


      {/* Copyable Code Box */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
              Code.gs (Apps Script untuk 4 Sheets: Tasks, BRD, ChangeRequests, TestCases)
            </span>
          </div>

          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check size={13} />
                <span>Copied Code!</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                <span>Copy Script</span>
              </>
            )}
          </button>
        </div>

        <pre className="p-4 text-xs font-mono text-slate-800 dark:text-slate-200 bg-slate-950/5 dark:bg-slate-950/80 max-h-96 overflow-y-auto leading-relaxed">
          {APPS_SCRIPT_CODE}
        </pre>
      </div>
    </div>
  );
};
