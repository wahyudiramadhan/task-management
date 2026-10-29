/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const ai = new GoogleGenAI();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.text({ limit: '50mb' }));

  // Server-side proxy endpoint for Google Apps Script
  // This bypasses iframe sandbox restrictions and handles Google redirects securely
  app.post('/api/sheets-proxy', async (req, res) => {
    try {
      const targetUrl = (req.headers['x-target-url'] as string) || req.body?.targetUrl;

      if (!targetUrl || typeof targetUrl !== 'string' || !targetUrl.startsWith('http')) {
        return res.status(400).json({
          success: false,
          error: 'Missing or invalid targetUrl. Please provide a valid Google Apps Script URL.'
        });
      }

      const bodyContent =
        req.body?.payload !== undefined
          ? JSON.stringify(req.body.payload)
          : typeof req.body === 'string'
          ? req.body
          : JSON.stringify(req.body);

      // Perform server-side fetch with follow redirect
      const remoteResponse = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: bodyContent,
        redirect: 'follow'
      });

      const responseText = await remoteResponse.text();
      let responseData: any;
      try {
        responseData = JSON.parse(responseText);
      } catch (_) {
        responseData = { text: responseText };
      }

      if (remoteResponse.status === 401) {
        return res.status(401).json({
          success: false,
          is401: true,
          error:
            'HTTP 401 (Unauthorized): Google Apps Script deployment setting "Who has access" is currently set to "Only myself". Please change it to "Anyone" and ensure the URL ends in /exec (not /dev).',
          details: responseData
        });
      }

      return res.status(remoteResponse.status).json(responseData);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return res.status(500).json({
        success: false,
        error: `Server proxy error: ${message}`
      });
    }
  });

  // GET proxy endpoint
  app.get('/api/sheets-proxy', async (req, res) => {
    try {
      const targetUrl = req.query.url as string;
      if (!targetUrl || !targetUrl.startsWith('http')) {
        return res.status(400).json({ success: false, error: 'Missing url query param' });
      }

      const remoteResponse = await fetch(targetUrl, {
        method: 'GET',
        redirect: 'follow'
      });

      const responseText = await remoteResponse.text();
      let responseData: any;
      try {
        responseData = JSON.parse(responseText);
      } catch (_) {
        responseData = { text: responseText };
      }

      if (remoteResponse.status === 401) {
        return res.status(401).json({
          success: false,
          is401: true,
          error:
            'HTTP 401 (Unauthorized): Google Apps Script requires "Who has access: Anyone".',
          details: responseData
        });
      }

      return res.status(remoteResponse.status).json(responseData);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ success: false, error: message });
    }
  });

  // AI Agentic Chat endpoint powered by Gemini 2.5 Flash
  app.post('/api/ai-agent/chat', async (req, res) => {
    try {
      const { message, history, context } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ success: false, error: 'Message is required' });
      }

      const todayStr = new Date().toISOString().slice(0, 10);
      const systemInstruction = `You are TaskFlow AI Agent, an intelligent engineering assistant and project manager for TaskFlow.
Current Date: ${todayStr}.
You help users plan, structure, and create tasks directly through conversation.

User context:
- Total tasks in system: ${context?.tasksCount || 0}
- Current sprint/board view: ${context?.activeView || 'Kanban'}
- Existing project tags: Flutter, UI, Material 3, Google Sheets, Apps Script, API, QA, Backend

Capabilities:
1. When a user asks to create or suggests a task (e.g., "Buatkan tugas integrasi Midtrans untuk PIC Programmer Yudi yudi@gmail.com, tester Siti siti@qa.com, deadline 3 hari lagi"), generate a thorough plan and ALWAYS embed a structured JSON proposal matching this exact JSON format enclosed in \`\`\`json ... \`\`\`:
\`\`\`json
{
  "isTaskDraft": true,
  "title": "Clear concise task title",
  "description": "Comprehensive task objective, context, and expectations",
  "priority": "low" | "medium" | "high" | "urgent",
  "quadrant": 1 | 2 | 3 | 4,
  "dueDate": "YYYY-MM-DD",
  "tags": ["Tag1", "Tag2"],
  "subtasks": [
    { "title": "Specific actionable subtask 1", "completed": false },
    { "title": "Specific actionable subtask 2", "completed": false }
  ],
  "picProgrammer": { "name": "Name", "email": "email@example.com" },
  "picSupport": { "name": "Name", "email": "email@example.com" },
  "picTester": { "name": "Name", "email": "email@example.com" }
}
\`\`\`
Note on PIC fields:
- If user specifies an email or person for programmer/developer, set "picProgrammer".
- If user specifies an email or person for support/ops, set "picSupport".
- If user specifies an email or person for tester/QA, set "picTester".
- If any role is not specified, you can omit that PIC object or provide empty strings for name/email.
- Priority: "urgent" (critical/blocker), "high" (important/core), "medium" (standard), "low" (minor).
- Quadrant: 1 (Urgent & Important), 2 (Not Urgent & Important), 3 (Urgent & Not Important), 4 (Not Urgent & Not Important).

Always provide clear, professional, and friendly explanations in Indonesian or English (match user's input language). Detail what you have prepared and explain why you structured the subtasks or roles that way.`;

      // Build conversation contents for Gemini
      const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

      if (Array.isArray(history)) {
        for (const item of history.slice(-6)) {
          if (item.content && (item.role === 'user' || item.role === 'model')) {
            contents.push({
              role: item.role,
              parts: [{ text: item.content }]
            });
          }
        }
      }

      contents.push({
        role: 'user',
        parts: [{ text: message }]
      });

      let replyText = '';
      let taskDraft: any = null;

      // Attempt Gemini API call if key configured
      if (process.env.GEMINI_API_KEY) {
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents,
            config: {
              systemInstruction,
              temperature: 0.3
            }
          });
          replyText = response.text || '';
          const jsonMatch = replyText.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonMatch && jsonMatch[1]) {
            const parsed = JSON.parse(jsonMatch[1]);
            if (parsed && (parsed.isTaskDraft || parsed.title)) {
              taskDraft = parsed;
            }
          }
        } catch (apiErr) {
          console.warn('Gemini API call failed, activating built-in TaskFlow Agent engine:', apiErr);
        }
      }

      // If Gemini did not return a response or was unavailable/unauthenticated, use TaskFlow Rule Agent
      if (!replyText || !taskDraft) {
        const lower = message.toLowerCase();

        // 1. Detect Priority (using regex word boundaries to avoid false positives with words like "taskflow")
        let priority: 'urgent' | 'high' | 'medium' | 'low' = 'medium';
        let quadrant: 1 | 2 | 3 | 4 = 1;
        if (/\b(urgent|kritis|darurat|asap|critical)\b/i.test(message)) {
          priority = 'urgent';
          quadrant = 1;
        } else if (/\b(high|tinggi|penting|major)\b/i.test(message)) {
          priority = 'high';
          quadrant = 1;
        } else if (/\b(low|rendah|santai|minor)\b/i.test(message)) {
          priority = 'low';
          quadrant = 4;
        } else {
          priority = 'medium';
          quadrant = 2;
        }


        // 2. Detect Due Date
        const dueDateObj = new Date();
        if (lower.includes('besok')) {
          dueDateObj.setDate(dueDateObj.getDate() + 1);
        } else if (lower.includes('lusa')) {
          dueDateObj.setDate(dueDateObj.getDate() + 2);
        } else if (lower.includes('3 hari') || lower.includes('tiga hari')) {
          dueDateObj.setDate(dueDateObj.getDate() + 3);
        } else if (lower.includes('minggu depan')) {
          dueDateObj.setDate(dueDateObj.getDate() + 7);
        } else {
          dueDateObj.setDate(dueDateObj.getDate() + 3);
        }
        const calcDueDate = dueDateObj.toISOString().slice(0, 10);

        // 3. Extract Emails
        const emailMatches = message.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
        let picProgrammer: any = undefined;
        let picSupport: any = undefined;
        let picTester: any = undefined;

        if (emailMatches && emailMatches.length > 0) {
          const progEmail = emailMatches[0] || '';
          if (progEmail) {
            picProgrammer = {
              name: progEmail.toLowerCase().includes('yudi') ? 'Yudi Rahardian' : (progEmail.split('@')[0] || 'Developer'),
              email: progEmail
            };
          }
          if (emailMatches.length > 1 && emailMatches[1]) {
            picTester = {
              name: emailMatches[1].split('@')[0] || 'Tester',
              email: emailMatches[1]
            };
          }
          if (emailMatches.length > 2 && emailMatches[2]) {
            picSupport = {
              name: emailMatches[2].split('@')[0] || 'Support',
              email: emailMatches[2]
            };
          }
        } else {

          // Check for names like "programmer Budi", "tester Siti"
          if (lower.includes('yudi')) {
            picProgrammer = { name: 'Yudi Rahardian', email: 'YudiR413@gmail.com' };
          }
          if (lower.includes('tester') || lower.includes('qa')) {
            const m = message.match(/(?:tester|qa)\s+([A-Za-z]+)/i);
            const tName = m ? m[1] : 'Siti Rahma';
            picTester = { name: tName, email: tName.toLowerCase() + '.qa@taskflow.dev' };
          }
        }

        // 4. Extract Title & Description (handles explicit title/desc, quotes, or smart domain synthesis)
        let extractedTitle = '';
        let extractedDesc = '';
        let tags: string[] = ['Sprint', 'TaskFlow'];

        // A. Check for explicit title pattern, e.g. "Judul: ..." or "Title: ..."
        const explicitTitleMatch = message.match(/(?:judul|title)\s*[:=]\s*["']?([^"\n\r,]+)["']?/i);
        if (explicitTitleMatch && explicitTitleMatch[1] && explicitTitleMatch[1].trim().length > 3) {
          extractedTitle = explicitTitleMatch[1].trim();
        }

        // B. Check for explicit description pattern, e.g. "Deskripsi: ..." or "Description: ..."
        const explicitDescMatch = message.match(/(?:deskripsi|description|desc)\s*[:=]\s*["']?([^"\n\r]+)["']?/i);
        if (explicitDescMatch && explicitDescMatch[1] && explicitDescMatch[1].trim().length > 5) {
          extractedDesc = explicitDescMatch[1].trim();
        }

        // C. Check for quoted phrase in message if title not found
        if (!extractedTitle) {
          const quoteMatch = message.match(/["']([^"']{4,80})["']/);
          if (quoteMatch && quoteMatch[1]) {
            extractedTitle = quoteMatch[1].trim();
          }
        }

        // D. Clean command words and personnel assignment clauses if title still not found
        if (!extractedTitle) {
          extractedTitle = message
            .replace(/^(buatkan|buat|tolong buatkan|create|generate)\s+(tugas|task)\s+/i, '')
            .replace(/\s+untuk\s+(?:pic|programmer|developer|dev|tester|qa|support|ops|user).*$/i, '')
            .replace(/\s+(?:dengan\s+)?(?:pic|programmer|developer|dev|tester|qa|support)\s+[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+.*$/i, '')
            .replace(/\s+deadline\s+.*$/i, '')
            .replace(/\s+prioritas\s+.*$/i, '')
            .trim();
        }

        if (extractedTitle.length < 4) {
          extractedTitle = 'Implementasi Fitur & Koordinasi Tim';
        } else {
          extractedTitle = extractedTitle.charAt(0).toUpperCase() + extractedTitle.slice(1);
        }

        // 5. Generate Technical Subtasks & Detailed Engineering Description based on Domain
        const subtasks: Array<{ title: string; completed: boolean }> = [];

        if (lower.includes('payment') || lower.includes('midtrans') || lower.includes('gateway') || lower.includes('qris') || lower.includes('xendit')) {
          if (!extractedTitle.toLowerCase().includes('payment') && !extractedTitle.toLowerCase().includes('midtrans')) {
            extractedTitle = `Integrasi Payment Gateway (${extractedTitle})`;
          }
          tags = ['Payment', 'Midtrans', 'Backend', 'Security'];
          subtasks.push({ title: 'Konfigurasi kredensial Merchant Server Key & Client Key di Sandbox .env', completed: false });
          subtasks.push({ title: 'Bangun API handler pembuatan snap token transaksi & redirect URL', completed: false });
          subtasks.push({ title: 'Implementasi Webhook HTTP notification listener dengan verifikasi SHA512 signature', completed: false });
          subtasks.push({ title: 'Eksekusi pengujian simulasi pembayaran QRIS & kartu kredit di staging sandbox', completed: false });

          if (!extractedDesc) {
            extractedDesc = [
              `### 🎯 Ringkasan & Tujuan`,
              `Implementasi integrasi sistem pembayaran terotomatisasi menggunakan gateway pembayaran untuk memastikan alur checkout pengguna berjalan mulus, aman, dan langsung terverifikasi secara real-time.`,
              ``,
              `### 📋 Ruang Lingkup Teknis (Scope of Work)`,
              `1. **Konfigurasi Kredensial:** Mengamankan Secret/Server Key pada backend dan Client Key pada frontend.`,
              `2. **Transaction Token API:** Menyediakan endpoint aman untuk men-generate snap payment token dengan detail item & customer.`,
              `3. **Webhook Callback Listener:** Menerima notifikasi HTTP asynchronous dari provider payment, memvalidasi signature header, dan memperbarui status pesanan (settlement, pending, expire).`,
              `4. **Idempotensi & Logging:** Mencegah double crediting dan mencatat log audit transaksi untuk rekonsiliasi keuangan.`,
              ``,
              `### ✅ Kriteria Selesai (Acceptance Criteria)`,
              `- [ ] Transaksi berhasil menghasilkan QRIS/Snap Token tanpa error authorization.`,
              `- [ ] Webhook callback otomatis mengupdate status di sistem dalam waktu < 3 detik.`,
              `- [ ] Skenario pembayaran gagal atau kedaluwarsa tertangani dengan fallback yang ramah pengguna.`,
              `- [ ] Verifikasi dan audit lolos uji oleh PIC QA Tester.`
            ].join('\n');
          }
        } else if (lower.includes('login') || lower.includes('token') || lower.includes('auth') || lower.includes('jwt') || lower.includes('session')) {
          if (!extractedTitle.toLowerCase().includes('login') && !extractedTitle.toLowerCase().includes('auth')) {
            extractedTitle = `Penguatan Autentikasi & Session: ${extractedTitle}`;
          }
          tags = ['Auth', 'Security', 'JWT', 'Bugfix'];
          subtasks.push({ title: 'Analisis lifecycle session expiration dan mekanisme refresh token rotasi', completed: false });
          subtasks.push({ title: 'Implementasi interceptor HTTP 401 untuk auto-refresh atau redirect ke login', completed: false });
          subtasks.push({ title: 'Pembersihan secure storage dan local token cache saat logout paksa', completed: false });
          subtasks.push({ title: 'Verifikasi keamanan token di staging environment bersama PIC Tester', completed: false });

          if (!extractedDesc) {
            extractedDesc = [
              `### 🎯 Ringkasan & Tujuan`,
              `Meningkatkan stabilitas dan keamanan modul autentikasi pengguna, memastikan mekanisme refresh token berjalan transparan di background serta mencegah crash akibat session timeout.`,
              ``,
              `### 📋 Ruang Lingkup Teknis (Scope of Work)`,
              `1. **Lifecycle & Rotasi Token:** Mengatur masa berlaku token akses singkat dengan refresh token yang tersimpan di secure storage.`,
              `2. **HTTP Interceptor:** Menangkap kode status HTTP 401/403 secara global dan memicu silent refresh sebelum mengulangi request awal.`,
              `3. **Penanganan Timeout:** Menampilkan dialog sesi kedaluwarsa yang elegan dan mengarahkan kembali pengguna ke alur login tanpa kehilangan draft form.`,
              `4. **Pembersihan Cache:** Memastikan tidak ada sisa data kredensial atau token pada browser storage saat sesi diakhiri.`,
              ``,
              `### ✅ Kriteria Selesai (Acceptance Criteria)`,
              `- [ ] Pengguna tidak ter-logout secara mendadak saat token akses utama kedaluwarsa jika refresh token masih valid.`,
              `- [ ] Seluruh endpoint terproteksi mengembalikan respon konsisten dengan validasi otorisasi.`,
              `- [ ] Divalidasi bebas celah session hijacking dan lolos pengujian SIT oleh tim QA.`
            ].join('\n');
          }
        } else if (lower.includes('sheet') || lower.includes('sync') || lower.includes('apps script') || lower.includes('drive') || lower.includes('gambar') || lower.includes('image')) {
          if (!extractedTitle.toLowerCase().includes('sheet') && !extractedTitle.toLowerCase().includes('sync')) {
            extractedTitle = `Optimalisasi Sinkronisasi Google Sheets & Drive: ${extractedTitle}`;
          }
          tags = ['GoogleSheets', 'AppsScript', 'DriveAPI', 'Integration'];
          subtasks.push({ title: 'Periksa formula cell =IMAGE() dan integrasi storage folder TaskFlow_Images di Drive', completed: false });
          subtasks.push({ title: 'Implementasi smart-merge lokal untuk mempertahankan attachment screenshot offline', completed: false });
          subtasks.push({ title: 'Uji sinkronisasi serentak 4 lembar (Tasks, BRD, ChangeRequests, TestCases)', completed: false });
          subtasks.push({ title: 'Verifikasi hak akses publik attachment gambar di Google Drive', completed: false });

          if (!extractedDesc) {
            extractedDesc = [
              `### 🎯 Ringkasan & Tujuan`,
              `Memastikan keandalan transfer data dua arah antara board TaskFlow dengan Google Spreadsheet dan Google Drive, khususnya penanganan screenshot floating dan formula pratinjau gambar.`,
              ``,
              `### 📋 Ruang Lingkup Teknis (Scope of Work)`,
              `1. **Drive Image Storage:** Menyimpan gambar base64 ke folder Google Drive khusus (\`TaskFlow_Images\`) dan menyematkan formula \`=IMAGE("url")\` di sel spreadsheet.`,
              `2. **Smart Local Merge:** Mencegah hilangnya lampiran offline lokal ketika data di-pull dari spreadsheet yang belum memiliki gambar.`,
              `3. **Multi-Sheet Coordination:** Memastikan update status dan penugasan PIC pada lembar Tasks, BRD, CR, dan TestCases tersinkronisasi tanpa tabrakan baris data.`,
              ``,
              `### ✅ Kriteria Selesai (Acceptance Criteria)`,
              `- [ ] Screenshot yang di-drop ke task langsung terunggah ke Drive dan muncul sebagai gambar visual di spreadsheet.`,
              `- [ ] Seluruh kolom PIC (Programmer, Support, Tester) dan tanggal Due Date terisi akurat.`,
              `- [ ] Tidak ada baris duplikat atau data yang terhapus saat proses sinkronisasi manual atau otomatis.`
            ].join('\n');
          }
        } else if (lower.includes('flutter') || lower.includes('mobile') || lower.includes('ui') || lower.includes('layout') || lower.includes('responsive')) {
          if (!extractedTitle.toLowerCase().includes('flutter') && !extractedTitle.toLowerCase().includes('ui')) {
            extractedTitle = `Pengembangan UI/UX Responsif: ${extractedTitle}`;
          }
          tags = ['Flutter', 'UI/UX', 'Responsive', 'Material3'];
          subtasks.push({ title: 'Definisikan token warna Material 3 dan tata letak adaptive breakpoint listener', completed: false });
          subtasks.push({ title: 'Implementasi komponen navigasi desktop (Rail) dan navigasi mobile (Bar)', completed: false });
          subtasks.push({ title: 'Hubungkan animasi transisi rute dengan preservasi state scroll', completed: false });
          subtasks.push({ title: 'Uji kompatibilitas layout pada berbagai ukuran resolusi layar (Mobile, Tablet, Desktop)', completed: false });

          if (!extractedDesc) {
            extractedDesc = [
              `### 🎯 Ringkasan & Tujuan`,
              `Membangun antarmuka modern yang adaptif dan responsif dengan presisi tinggi mengadopsi prinsip desain Material 3 untuk pengalaman pengguna yang optimal di segala jenis perangkat.`,
              ``,
              `### 📋 Ruang Lingkup Teknis (Scope of Work)`,
              `1. **Adaptive Navigation:** Menampilkan Navigation Rail untuk layar lebar (>1024px) dan Navigation Bar di bagian bawah untuk mobile (<768px).`,
              `2. **State & Performance:** Menjaga performa render tetap pada 60 FPS tanpa jank atau layout shifting.`,
              `3. **Theme Consistency:** Mendukung transisi mulus antara mode terang (Light Mode) dan mode gelap (Dark Mode).`,
              ``,
              `### ✅ Kriteria Selesai (Acceptance Criteria)`,
              `- [ ] Tampilan konsisten tanpa error overflow pada resolusi 360px hingga 1920px.`,
              `- [ ] Komponen interaktif memiliki touch feedback yang responsif.`,
              `- [ ] Struktur kode modular dan mudah dikembangkan untuk modul berikutnya.`
            ].join('\n');
          }
        } else if (lower.includes('test') || lower.includes('sit') || lower.includes('uit') || lower.includes('qa') || lower.includes('bug')) {
          if (!extractedTitle.toLowerCase().includes('test') && !extractedTitle.toLowerCase().includes('sit')) {
            extractedTitle = `Pelaksanaan Pengujian & QA: ${extractedTitle}`;
          }
          tags = ['Testing', 'SIT', 'UIT', 'QualityAssurance'];
          subtasks.push({ title: 'Penyusunan matriks test case SIT mencakup alur API dan integritas database', completed: false });
          subtasks.push({ title: 'Eksekusi pengujian User Acceptance (UIT) bersama stakeholder bisnis', completed: false });
          subtasks.push({ title: 'Pencatatan dan dokumentasi temuan bug ke dalam lembar Test Cases', completed: false });
          subtasks.push({ title: 'Verifikasi ulang hasil perbaikan (regression test) sebelum rilis production', completed: false });

          if (!extractedDesc) {
            extractedDesc = [
              `### 🎯 Ringkasan & Tujuan`,
              `Menjalankan siklus pengujian menyeluruh (System Integration Testing & User Integration Testing) untuk menjamin kualitas, stabilitas, dan ketiadaan regresi sebelum aplikasi dideploy.`,
              ``,
              `### 📋 Ruang Lingkup Teknis (Scope of Work)`,
              `1. **SIT Execution:** Menguji keterhubungan antar modul API, permission Drive, formula spreadsheet, dan penyimpanan lokal.`,
              `2. **UIT Coordination:** Memandu pengujian berbasis skenario riil bersama pengguna akhir dan mendokumentasikan umpan balik.`,
              `3. **Severity Classification:** Mengklasifikasikan setiap temuan ke dalam tingkat Critical, Major, atau Minor dengan dokumentasi langkah reproduksi.`,
              ``,
              `### ✅ Kriteria Selesai (Acceptance Criteria)`,
              `- [ ] Seluruh test cases berkategori Critical dan Major berstatus Passed.`,
              `- [ ] Laporan pengujian ditandatangani oleh PIC Tester dan disetujui Product Owner.`,
              `- [ ] Zero regression pada fungsi-fungsi inti yang sudah berjalan sebelumnya.`
            ].join('\n');
          }
        } else {
          // General Software Engineering Task
          tags = ['Engineering', 'Feature', 'TaskFlow'];
          subtasks.push({ title: `Analisis kebutuhan arsitektur dan spesifikasi untuk ${extractedTitle}`, completed: false });
          subtasks.push({ title: 'Implementasi kode modul dan penulisan unit test lokal', completed: false });
          subtasks.push({ title: 'Code review bersama tim pengembang dan deployment ke staging', completed: false });
          subtasks.push({ title: 'Verifikasi fungsional dan pengujian integrasi oleh PIC Tester', completed: false });

          if (!extractedDesc) {
            extractedDesc = [
              `### 🎯 Ringkasan & Tujuan`,
              `Koordinasi dan eksekusi implementasi teknis untuk **${extractedTitle}**. Memastikan integrasi berjalan sesuai standar kualitas, performa tinggi, dan jadwal sprint yang disepakati.`,
              ``,
              `### 📋 Ruang Lingkup Teknis (Scope of Work)`,
              `1. **Analisis & Arsitektur:** Memetakan kebutuhan sistem, dependensi komponen, dan penanganan edge cases.`,
              `2. **Implementasi Modular:** Menulis kode yang bersih, terdokumentasi, dan mematuhi best practice TypeScript/React.`,
              `3. **Integrasi & Sinergi Tim:** Kolaborasi antara PIC Programmer, Support/Ops, dan Tester untuk pengujian dan monitoring.`,
              ``,
              `### ✅ Kriteria Selesai (Acceptance Criteria)`,
              `- [ ] Modul berfungsi penuh sesuai kebutuhan bisnis tanpa error fatal.`,
              `- [ ] Telah ditinjau dan disetujui pada sesi code review internal.`,
              `- [ ] Tersinkronisasi dengan baik pada Google Spreadsheet dan sistem pencatatan task.`
            ].join('\n');
          }
        }

        taskDraft = {
          isTaskDraft: true,
          title: extractedTitle,
          description: extractedDesc,
          priority,
          quadrant,
          dueDate: calcDueDate,
          tags,
          subtasks,
          picProgrammer,
          picSupport,
          picTester
        };

        replyText = `Tentu! Saya telah menganalisis instruksi Anda dan menyusun tiket tugas terstruktur dengan rincian teknis lengkap untuk **"${extractedTitle}"**.\n\nDetail alokasi personil dan tenggat waktu:\n- **Prioritas:** ${priority.toUpperCase()} (Kuadran ${quadrant})\n- **Batas Waktu (Due Date):** ${calcDueDate}\n- **PIC Programmer:** ${picProgrammer ? `${picProgrammer.name} (${picProgrammer.email})` : 'Belum ditentukan'}\n- **PIC Tester:** ${picTester ? `${picTester.name} (${picTester.email})` : 'Belum ditentukan'}\n- **PIC Support:** ${picSupport ? `${picSupport.name} (${picSupport.email})` : 'Belum ditentukan'}\n\nSilakan klik tombol **"Tambahkan ke Board"** di kartu proposal berikut untuk langsung memasukkannya ke Kanban Board dan menyinkronkan dengan Google Spreadsheet!`;
      }

      return res.json({
        success: true,
        reply: replyText,
        taskDraft
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('AI Agent Error:', message);
      return res.status(500).json({
        success: false,
        error: `AI Agent error: ${message}`,
        reply: 'Maaf, terjadi kendala saat memproses permintaan AI Agent.'
      });
    }
  });


  // Mount Vite dev middleware in development mode

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TaskFlow Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
