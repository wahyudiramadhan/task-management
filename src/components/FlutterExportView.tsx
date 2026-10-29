/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Download,
  Copy,
  Check,
  FileCode,
  Smartphone,
  ExternalLink,
  Terminal,
  FolderGit2
} from 'lucide-react';
import {
  generateFlutterFiles,
  createFlutterZip,
  FlutterFile
} from '../services/flutterCodeGenerator';

interface FlutterExportViewProps {
  configuredAppsScriptUrl: string;
}

export const FlutterExportView: React.FC<FlutterExportViewProps> = ({
  configuredAppsScriptUrl
}) => {
  const files: FlutterFile[] = generateFlutterFiles(configuredAppsScriptUrl);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const activeFile = files[activeFileIndex] || files[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    setIsDownloading(true);
    try {
      const blob = await createFlutterZip(configuredAppsScriptUrl);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'taskflow_flutter.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate zip:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Smartphone size={26} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Flutter (Dart) Cross-Platform Project Center</span>
                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300">
                  Material 3
                </span>
              </h2>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                Ready-to-deploy Flutter mobile and desktop application. Automatically bundled with your
                Google Apps Script endpoint so you can run native Android, iOS, Windows, macOS, or Flutter Web apps.
              </p>
            </div>
          </div>

          <button
            onClick={handleDownloadZip}
            disabled={isDownloading}
            className="flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
          >
            <Download size={14} className={isDownloading ? 'animate-bounce' : ''} />
            <span>{isDownloading ? 'Bundling ZIP...' : 'Download Flutter Project (.zip)'}</span>
          </button>
        </div>
      </div>

      {/* Quick Setup Terminal Instructions */}
      <div className="p-4 rounded-xl bg-slate-950 text-slate-200 border border-slate-800 text-xs font-mono">
        <div className="flex items-center gap-2 pb-2 mb-2 border-b border-slate-800 text-slate-400">
          <Terminal size={14} />
          <span>Quick Run in Terminal</span>
        </div>
        <div className="space-y-1">
          <div className="text-slate-400"># 1. Unzip downloaded bundle and enter folder</div>
          <div className="text-emerald-400 font-bold">cd taskflow_flutter</div>
          <div className="text-slate-400 mt-1"># 2. Fetch packages (http, intl, uuid)</div>
          <div className="text-emerald-400 font-bold">flutter pub get</div>
          <div className="text-slate-400 mt-1"># 3. Launch on Android / Chrome / iOS</div>
          <div className="text-emerald-400 font-bold">flutter run -d chrome</div>
        </div>
      </div>

      {/* Code Viewer Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* File Navigator */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 shadow-xs">
          <div className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <FolderGit2 size={14} />
            <span>Project Files</span>
          </div>

          <div className="space-y-1 mt-1">
            {files.map((file, idx) => (
              <button
                key={file.path}
                onClick={() => setActiveFileIndex(idx)}
                className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                  activeFileIndex === idx
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileCode size={14} className="shrink-0" />
                  <span className="truncate font-mono">{file.filename}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* File Code Viewer */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          {/* File Header */}
          <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/70 flex items-center justify-between">
            <div>
              <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                {activeFile.path}
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">{activeFile.description}</p>
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check size={13} className="text-emerald-500" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={13} />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>

          {/* Code Body */}
          <pre className="p-4 text-xs font-mono text-slate-800 dark:text-slate-200 bg-slate-950/5 dark:bg-slate-950/80 max-h-[600px] overflow-auto leading-relaxed">
            {activeFile.content}
          </pre>
        </div>
      </div>
    </div>
  );
};
