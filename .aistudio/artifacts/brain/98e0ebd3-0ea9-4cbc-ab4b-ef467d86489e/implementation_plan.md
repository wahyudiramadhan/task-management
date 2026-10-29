# TaskFlow: Flutter-Styled Task Planner & Manager with Google Sheets API

TaskFlow is a Material 3 task planner and manager web application integrated with Google Sheets via Google Apps Script Web App API, featuring Kanban, Calendar, and Eisenhower Matrix views alongside a complete, ready-to-run Flutter (Dart) codebase export.

### User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions were confirmed based on your requirements:
> - **FAB AI Agentic Chat**: A persistent floating action button at the bottom-right opening a conversational AI Agent. Users can describe tasks in natural language (Indonesian or English), and the AI automatically analyzes the requirements, suggests technical subtasks, prioritizes into Eisenhower quadrants, and assigns personnel. A 1-click "Tambahkan ke Board" button commits the proposal to Kanban and triggers synchronization.
> - **Google Sheets Multiple Images Support**: Enhanced Google Apps Script handler saves every base64 screenshot into a dedicated Google Drive folder (`TaskFlow_Images`). In the spreadsheet cell, the primary image is rendered visually via `=IMAGE("driveThumbUrl")`, while all attached images are indexed with direct clickable Google Drive links in cell notes.
> - **Personnel & PIC Roles with Automated Email Notifications**: Tasks now feature three dedicated personnel roles:
>   - **PIC Programmer** (Developer / Lead)
>   - **PIC Support** (Operations / Customer Support)
>   - **PIC Tester** (QA Specialist / SIT & UIT Tester)
>   Assigned individuals receive automated HTML notification emails via Google Apps Script `MailApp.sendEmail` with task priority, due date, subtasks checklist, and direct links to the spreadsheet.
> - **Backend & Persistence**: Google Sheets database driven by Google Apps Script (`doGet` / `doPost` Web App endpoint) with Express server proxy (`server.ts`) to ensure cross-origin resilience.

---

### 1. Overview & Core Features

- **FAB AI Agentic Chat (`AIAgentChatDrawer.tsx`)**:
  - Interactive chat drawer powered by Gemini 2.5 Flash on the server (`server.ts` endpoint `/api/ai-agent/chat`) with intelligent task extraction.
  - Generates rich proposal cards with title, description, priority, due date, subtasks checklist, and PIC assignments.
  - One-click "Tambahkan ke Board" saves tasks to state and triggers Google Sheets sync.
- **PIC Role Assignment & Automated Invites (`TaskModal.tsx`)**:
  - Role management fields for Programmer, Support, and Tester.
  - "Undang / Kirim Email" button sends immediate assignment emails to stakeholders.
  - Display badges on `TaskCard` (`Dev: Name`, `Ops: Name`, `QA: Name`).
- **Google Sheets Database (`appsScriptApi.ts`)**:
  - Automatically manages 4 relational tables: `Tasks`, `BRD`, `ChangeRequests`, `TestCases`.
  - Supports multiple images per task with Drive thumbnail preview.
  - Formats date and time cleanly (`YYYY-MM-DD` and `YYYY-MM-DD HH:mm:ss`).
- **Flutter Export Center (`FlutterExportView.tsx`)**:
  - Turnkey Flutter Dart source files (`main.dart`, `models/task.dart`, `services/sheets_api_service.dart`) with 1-click copy and zip download.

---

### 2. Status & Verification
- **Linter Status**: `tsc --noEmit` passed with 0 errors.
- **Build Status**: `npm run build` succeeded.
- **Server API**: Express proxy and `/api/ai-agent/chat` verified with dual-engine AI reasoning.
