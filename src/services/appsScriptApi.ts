/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Task, BRDDocument, ChangeRequest, TestCase } from '../types/task';

export const APPS_SCRIPT_URL_KEY = 'taskflow_apps_script_url';
export const SPREADSHEET_URL_KEY = 'taskflow_spreadsheet_direct_url';
export const LOCAL_TASKS_KEY = 'taskflow_local_tasks_v1';

export const APPS_SCRIPT_CODE = `/**
 * =========================================================================
 * TaskFlow Enterprise API - Google Apps Script Backend for Google Sheets
 * =========================================================================
 * Manages 4 relational tables in your Google Spreadsheet:
 * 1. "Tasks" - Task Planner, Kanban, Checklist, Attachments & PIC Roles
 * 2. "BRD" - Business Requirements Documents
 * 3. "ChangeRequests" - Change Request Management & Approvals
 * 4. "TestCases" - SIT (System Integration) & UIT (User Integration) Testing
 *
 * Automatic Features:
 * - Direct image rendering (=IMAGE) & multiple images support via Google Drive
 * - Automated email notifications to PIC Programmer, PIC Support, and PIC Tester via MailApp
 *
 * How to deploy:
 * 1. Open your Google Spreadsheet (e.g. at https://sheets.new).
 * 2. Click Extensions > Apps Script.
 * 3. Delete any code in Code.gs and paste this entire script.
 * 4. In the toolbar, select 'authorizeDriveAndEmail' and click Run (Play icon) once to grant Drive & Mail permissions.
 * 5. Click "Deploy" > "New deployment" > Select type: "Web app".
 * 6. Set:
 *    - Description: "TaskFlow Enterprise API v2"
 *    - Execute as: "Me"
 *    - Who has access: "Anyone" (Required for web & mobile sync)
 * 7. Click "Deploy", Authorize access, and copy the Web App URL.
 * 8. Paste the Web App URL into TaskFlow!
 * =========================================================================
 */

const SHEET_TASKS = "Tasks";
const SHEET_BRD = "BRD";
const SHEET_CRS = "ChangeRequests";
const SHEET_TESTS = "TestCases";

const HEADERS_TASKS = [
  "id", "title", "description", "status", "priority", "quadrant",
  "dueDate", "tags", "subtasks", "createdAt", "updatedAt", "images",
  "picProgrammer", "picSupport", "picTester", "linkedCrId", "linkedBrdId"
];

const HEADERS_BRD = [
  "id", "code", "title", "version", "status", "owner",
  "targetRelease", "summary", "businessObjectives", "requirements", "createdAt", "updatedAt"
];

const HEADERS_CRS = [
  "id", "crNumber", "title", "description", "justification", "impactArea",
  "priority", "status", "requestedBy", "assignedTo", "linkedTaskId", "linkedBrdId", "createdAt", "updatedAt"
];

const HEADERS_TESTS = [
  "id", "caseCode", "type", "title", "description", "preconditions",
  "steps", "expectedResult", "actualResult", "status", "severity", "testedBy", "testedAt", "linkedTaskId", "notes"
];

/**
 * PENTING UNTUK SCREENSHOT & EMAIL NOTIFIKASI:
 * Jalankan fungsi 'authorizeDriveAndEmail' INI SATU KALI di editor Apps Script:
 * 1. Di toolbar atas, pilih dropdown fungsi 'authorizeDriveAndEmail'
 * 2. Klik tombol 'Run' / 'Jalankan' (ikon Play)
 * 3. Klik 'Review permissions' -> Pilih akun Google -> 'Advanced' -> 'Go to TaskFlow (unsafe)' -> 'Allow'
 * Setelah itu screenshot Anda otomatis masuk ke Google Drive dan PIC akan menerima email notifikasi tugas!
 */
function authorizeDriveAndEmail() {
  var folders = DriveApp.getFoldersByName("TaskFlow_Images");
  var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder("TaskFlow_Images");
  var email = Session.getActiveUser().getEmail();
  Logger.log("Drive & Mail authorized! Folder: " + folder.getUrl() + " | Active User: " + email);
  return "SUCCESS: Google Drive & MailApp authorized! Ready for images and automated emails.";
}

function authorizeDrive() {
  return authorizeDriveAndEmail();
}

function getOrCreateSheet(sheetName, headers, headerColor) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground(headerColor || "#4F46E5");
    headerRange.setFontColor("#FFFFFF");
    headerRange.setFontWeight("bold");
    sheet.setFrozenRows(1);
  } else {
    // Check if headers match length, if older schema, ensure missing headers are added
    const currentHeaders = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
    if (sheetName === SHEET_TASKS && currentHeaders.length < headers.length) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground(headerColor || "#4F46E5");
      headerRange.setFontColor("#FFFFFF");
      headerRange.setFontWeight("bold");
    }
  }
  return sheet;
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function parseJsonSafe(val, fallback) {
  if (!val || val === "[]" || val === "") return fallback;
  try {
    return JSON.parse(val);
  } catch (_) {
    return fallback;
  }
}

function parsePicFromCell(val) {
  if (!val) return undefined;
  var str = String(val).trim();
  if (!str || str === '""' || str === "null") return undefined;
  if (str.startsWith("{")) {
    try {
      var parsed = JSON.parse(str);
      if (parsed && (parsed.name || parsed.email)) return parsed;
    } catch (_) {}
  }
  // Try pattern: "Name (email)" or "Name <email>"
  var match = str.match(/^(.*?)\s*[\(<]([^\)>]+)[\)>]$/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  // If only email
  if (str.indexOf("@") !== -1) {
    var namePart = str.split("@")[0].replace(/[._-]/g, " ");
    return { name: namePart.charAt(0).toUpperCase() + namePart.slice(1), email: str };
  }
  return { name: str, email: "" };
}

function formatPicForCell(pic) {
  if (!pic) return "";
  if (typeof pic === "string") return pic;
  var name = (pic.name || "").trim();
  var email = (pic.email || "").trim();
  if (name && email) return name + " (" + email + ")";
  if (email) return email;
  if (name) return name;
  return "";
}

/**
 * Clean Date & Time Formatter for Google Spreadsheet
 */
function formatDateTimeForSheet(val) {
  if (!val) return "";
  try {
    var d = val instanceof Date ? val : new Date(val);
    if (isNaN(d.getTime())) return String(val);
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1);
    if (m.length < 2) m = "0" + m;
    var day = String(d.getDate());
    if (day.length < 2) day = "0" + day;
    var h = String(d.getHours());
    if (h.length < 2) h = "0" + h;
    var min = String(d.getMinutes());
    if (min.length < 2) min = "0" + min;
    var s = String(d.getSeconds());
    if (s.length < 2) s = "0" + s;
    return y + "-" + m + "-" + day + " " + h + ":" + min + ":" + s;
  } catch (_) {
    return String(val);
  }
}

function formatDateForSheet(val) {
  if (!val) return "";
  try {
    if (typeof val === "string") {
      var trimmed = val.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
      if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(trimmed)) return trimmed;
    }
    var d = val instanceof Date ? val : new Date(val);
    if (isNaN(d.getTime())) return String(val);
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1);
    if (m.length < 2) m = "0" + m;
    var day = String(d.getDate());
    if (day.length < 2) day = "0" + day;
    return y + "-" + m + "-" + day;
  } catch (_) {
    return String(val);
  }
}

/**
 * Format images so they appear DIRECTLY inside Google Sheet cells using =IMAGE("...")
 * Base64 screenshots are automatically saved to Google Drive "TaskFlow_Images" folder!
 * Supports MULTIPLE images by storing drive links and generating rich notes + formulas.
 */
function processImagesForSheet(images) {
  if (!images || !Array.isArray(images) || images.length === 0) {
    return { formula: "", note: "", allImages: [] };
  }

  var processed = [];
  var folder = null;

  for (var i = 0; i < images.length; i++) {
    var img = images[i];
    var url = img.dataUrl || img.url || "";
    if (!url) continue;

    if (url.startsWith("http")) {
      processed.push({
        id: img.id || ("img-" + i),
        name: img.name || ("Image " + (i + 1)),
        thumbUrl: url,
        viewUrl: url
      });
    } else if (url.startsWith("data:")) {
      try {
        if (!folder) {
          var folders = DriveApp.getFoldersByName("TaskFlow_Images");
          folder = folders.hasNext() ? folders.next() : DriveApp.createFolder("TaskFlow_Images");
        }
        var base64Data = "";
        var mime = "image/png";

        if (url.indexOf(";base64,") !== -1) {
          var parts = url.split(";base64,");
          mime = parts[0].replace("data:", "") || "image/png";
          base64Data = parts[1];
        } else if (url.indexOf(",") !== -1) {
          var parts = url.split(",");
          mime = parts[0].split(";")[0].replace("data:", "") || "image/png";
          base64Data = parts[1];
        }

        if (base64Data) {
          var decoded = Utilities.base64Decode(base64Data);
          var ext = mime.indexOf("jpeg") !== -1 || mime.indexOf("jpg") !== -1 ? ".jpg" : ".png";
          var filename = img.name ? img.name : ("screenshot_" + Date.now() + "_" + (i + 1) + ext);
          var blob = Utilities.newBlob(decoded, mime, filename);
          var file = folder.createFile(blob);
          file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

          var thumbUrl = "https://drive.google.com/thumbnail?id=" + file.getId() + "&sz=w600";
          var viewUrl = file.getUrl();

          processed.push({
            id: img.id || ("img-" + file.getId()),
            name: filename,
            thumbUrl: thumbUrl,
            viewUrl: viewUrl
          });
        }
      } catch (e) {
        Logger.log("Drive upload error: " + e);
      }
    }
  }

  if (processed.length === 0) {
    return { formula: "", note: "", allImages: [] };
  }

  var primary = processed[0];
  var primaryFormula = '=IMAGE("' + primary.thumbUrl + '")';
  var noteText = "";

  if (processed.length === 1) {
    noteText = "🖼️ 1 Image Attachment:\\n" + primary.viewUrl;
  } else {
    noteText = "🖼️ Multiple Attachments (" + processed.length + " gambar):\\n" +
      processed.map(function(p, idx) {
        return (idx + 1) + ". " + p.name + ":\\n   " + p.viewUrl;
      }).join("\\n\\n");
  }

  return {
    formula: primaryFormula,
    note: noteText,
    allImages: processed
  };
}

/**
 * Automated Email Notifications for PIC Programmer, PIC Support, and PIC Tester
 */
function sendTaskAssignmentEmails(task, targetRole) {
  if (!task) return { sentCount: 0 };
  var recipients = [];

  if ((!targetRole || targetRole === "all" || targetRole === "programmer") &&
      task.picProgrammer && task.picProgrammer.email && task.picProgrammer.email.indexOf("@") !== -1) {
    recipients.push({
      role: "PIC Programmer / Developer",
      roleCode: "Programmer",
      name: task.picProgrammer.name || "Programmer",
      email: task.picProgrammer.email.trim()
    });
  }

  if ((!targetRole || targetRole === "all" || targetRole === "support") &&
      task.picSupport && task.picSupport.email && task.picSupport.email.indexOf("@") !== -1) {
    recipients.push({
      role: "PIC Support & Operations",
      roleCode: "Support",
      name: task.picSupport.name || "Support",
      email: task.picSupport.email.trim()
    });
  }

  if ((!targetRole || targetRole === "all" || targetRole === "tester") &&
      task.picTester && task.picTester.email && task.picTester.email.indexOf("@") !== -1) {
    recipients.push({
      role: "PIC Tester / QA Specialist",
      roleCode: "Tester",
      name: task.picTester.name || "Tester",
      email: task.picTester.email.trim()
    });
  }

  if (recipients.length === 0) return { sentCount: 0 };

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetUrl = ss ? ss.getUrl() : "";

  var priorityBadge = (task.priority || "medium").toUpperCase();
  var priorityColor = "#4F46E5";
  if (task.priority === "urgent") priorityColor = "#E11D48";
  else if (task.priority === "high") priorityColor = "#D97706";
  else if (task.priority === "low") priorityColor = "#64748B";

  var subtasksHtml = "";
  if (task.subtasks && task.subtasks.length > 0) {
    subtasksHtml = "<div style='margin-top:16px;background:#F8FAFC;padding:14px;border-radius:8px;border:1px solid #E2E8F0;'>" +
      "<h4 style='margin:0 0 10px 0;font-size:13px;color:#1E293B;'>Subtasks Checklist (" + task.subtasks.length + "):</h4>" +
      "<ul style='margin:0;padding-left:18px;font-size:13px;color:#334155;line-height:1.6;'>";
    task.subtasks.forEach(function(st) {
      subtasksHtml += "<li>" + (st.completed ? "<strike style='color:#94A3B8;'>" + st.title + "</strike> (Selesai)" : st.title) + "</li>";
    });
    subtasksHtml += "</ul></div>";
  }

  var sentCount = 0;
  recipients.forEach(function(r) {
    try {
      var subject = "[TaskFlow] Penugasan: " + (task.title || "Tugas Baru") + " (" + r.roleCode + ")";
      var htmlBody =
        "<div style='font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:620px;margin:0 auto;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;background:#FFFFFF;'>" +
          "<div style='background:#4F46E5;padding:22px;color:#FFFFFF;'>" +
            "<span style='background:rgba(255,255,255,0.2);padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600;letter-spacing:0.5px;'>TASKFLOW ENTERPRISE</span>" +
            "<h2 style='margin:8px 0 0 0;font-size:19px;font-weight:700;'>Pemberitahuan Penugasan Tugas</h2>" +
            "<p style='margin:4px 0 0 0;font-size:13px;opacity:0.9;'>Anda telah ditambahkan sebagai personil yang bertanggung jawab.</p>" +
          "</div>" +
          "<div style='padding:24px;color:#0F172A;'>" +
            "<p style='font-size:14px;margin:0 0 16px 0;'>Halo <strong>" + r.name + "</strong>,</p>" +
            "<p style='font-size:14px;margin:0 0 16px 0;'>Anda ditugaskan sebagai <strong>" + r.role + "</strong> untuk menyelesaikan tiket berikut:</p>" +
            "<div style='background:#F8FAFC;border-left:4px solid " + priorityColor + ";padding:16px;border-radius:6px;margin-bottom:16px;border:1px solid #E2E8F0;border-left-width:4px;'>" +
              "<h3 style='margin:0 0 8px 0;font-size:16px;color:#0F172A;'>" + (task.title || "Untitled Task") + "</h3>" +
              (task.description ? "<p style='margin:0 0 12px 0;font-size:13px;color:#475569;white-space:pre-line;line-height:1.5;'>" + task.description + "</p>" : "") +
              "<div style='display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;color:#475569;'>" +
                "<div><strong>Prioritas:</strong> <span style='color:" + priorityColor + ";font-weight:700;'>" + priorityBadge + "</span></div>" +
                "<div><strong>Batas Waktu (Due Date):</strong> " + (task.dueDate || "Belum ditentukan") + "</div>" +
                "<div><strong>PIC Programmer:</strong> " + (task.picProgrammer ? task.picProgrammer.name || task.picProgrammer.email : "-") + "</div>" +
                "<div><strong>PIC Tester:</strong> " + (task.picTester ? task.picTester.name || task.picTester.email : "-") + "</div>" +
              "</div>" +
            "</div>" +
            subtasksHtml +
            (sheetUrl ? "<div style='margin-top:24px;text-align:center;'><a href='" + sheetUrl + "' style='display:inline-block;background:#4F46E5;color:#FFFFFF;padding:11px 22px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px;box-shadow:0 2px 4px rgba(79,70,229,0.25);'>Buka Spreadsheet Tugas</a></div>" : "") +
            "<div style='margin-top:24px;padding-top:16px;border-top:1px solid #E2E8F0;font-size:11px;color:#94A3B8;text-align:center;'>" +
              "Email otomatis dihasilkan dari sistem TaskFlow Enterprise." +
            "</div>" +
          "</div>" +
        "</div>";

      MailApp.sendEmail({
        to: r.email,
        subject: subject,
        htmlBody: htmlBody
      });
      sentCount++;
    } catch (err) {
      Logger.log("Failed to send email to " + r.email + ": " + err);
    }
  });

  return { sentCount: sentCount };
}

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || "getAllData";
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === "ping") {
      getOrCreateSheet(SHEET_TASKS, HEADERS_TASKS, "#4F46E5");
      getOrCreateSheet(SHEET_BRD, HEADERS_BRD, "#059669");
      getOrCreateSheet(SHEET_CRS, HEADERS_CRS, "#D97706");
      getOrCreateSheet(SHEET_TESTS, HEADERS_TESTS, "#7C3AED");

      return createJsonResponse({
        success: true,
        message: "Connected to Google Sheets Enterprise Database!",
        spreadsheetTitle: ss.getName(),
        spreadsheetUrl: ss.getUrl(),
        sheets: [SHEET_TASKS, SHEET_BRD, SHEET_CRS, SHEET_TESTS],
        timestamp: new Date().toISOString()
      });
    }

    if (action === "getAllData" || action === "getTasks") {
      // 1. Fetch Tasks
      const taskSheet = getOrCreateSheet(SHEET_TASKS, HEADERS_TASKS, "#4F46E5");
      const taskRows = taskSheet.getDataRange().getValues();
      const taskFormulas = taskSheet.getDataRange().getFormulas();
      const tasks = [];
      const colCount = taskSheet.getLastColumn();

      for (let i = 1; i < taskRows.length; i++) {
        const row = taskRows[i];
        if (!row[0]) continue;

        // Parse images from cell & notes
        let formulaCell = (taskFormulas && taskFormulas[i] && taskFormulas[i][11]) || "";
        let valueCell = String((row && row[11]) || "");
        let noteCell = "";
        try {
          noteCell = taskSheet.getRange(i + 1, 12).getNote() || "";
        } catch (_) {}

        let parsedImages = [];
        // First check note for multiple attachments
        if (noteCell && noteCell.indexOf("http") !== -1) {
          var lines = noteCell.split("\\n");
          for (var l = 0; l < lines.length; l++) {
            var line = lines[l].trim();
            if (line.indexOf("http") !== -1) {
              var startIdx = line.indexOf("http");
              var candidate = line.substring(startIdx).trim();
              var spaceIdx = candidate.search(/[\s\r\n]/);
              var foundUrl = spaceIdx !== -1 ? candidate.substring(0, spaceIdx) : candidate;
              if (foundUrl && foundUrl.length > 8) {
                parsedImages.push({
                  id: "img-" + i + "-" + parsedImages.length,
                  name: "Attachment " + (parsedImages.length + 1),
                  dataUrl: foundUrl,
                  size: 0,
                  uploadedAt: String(row[9] || new Date().toISOString())
                });
              }
            }
          }
        }

        // If no multiple images from note, parse formula
        if (parsedImages.length === 0) {
          let rawImage = formulaCell || valueCell;
          if (typeof rawImage === "string" && rawImage.trim() !== "" && rawImage !== "[]") {
            let cleanUrl = rawImage.trim();
            if (cleanUrl.toLowerCase().indexOf("=image(") !== -1) {
              const q1 = cleanUrl.indexOf('"');
              const q2 = cleanUrl.lastIndexOf('"');
              if (q1 !== -1 && q2 > q1) {
                cleanUrl = cleanUrl.substring(q1 + 1, q2).trim();
              }
            }
            if (cleanUrl.indexOf("http") === 0 || cleanUrl.indexOf("data:") === 0) {
              parsedImages = [{
                id: "img-" + i,
                name: "Screenshot",
                dataUrl: cleanUrl,
                size: 0,
                uploadedAt: String(row[9] || new Date().toISOString())
              }];
            } else if (cleanUrl.charAt(0) === "[" || cleanUrl.charAt(0) === "{") {
              parsedImages = parseJsonSafe(cleanUrl, []);
            }
          }
        }

        // Check if row has PIC columns (columns 13, 14, 15) or older row format
        let picProgrammer = undefined;
        let picSupport = undefined;
        let picTester = undefined;
        let linkedCrId = undefined;
        let linkedBrdId = undefined;

        if (colCount >= 17) {
          picProgrammer = parsePicFromCell(row[12]);
          picSupport = parsePicFromCell(row[13]);
          picTester = parsePicFromCell(row[14]);
          linkedCrId = row[15] ? String(row[15]) : undefined;
          linkedBrdId = row[16] ? String(row[16]) : undefined;
        } else {
          // Backward compatibility for older 14-column sheet
          linkedCrId = row[12] ? String(row[12]) : undefined;
          linkedBrdId = row[13] ? String(row[13]) : undefined;
        }

        tasks.push({
          id: String(row[0]),
          title: String(row[1] || ""),
          description: String(row[2] || ""),
          status: String(row[3] || "backlog"),
          priority: String(row[4] || "medium"),
          quadrant: Number(row[5] || 1),
          dueDate: formatDateForSheet(row[6]),
          tags: parseJsonSafe(row[7], []),
          subtasks: parseJsonSafe(row[8], []),
          createdAt: formatDateTimeForSheet(row[9]),
          updatedAt: formatDateTimeForSheet(row[10]),
          images: parsedImages,
          picProgrammer: picProgrammer,
          picSupport: picSupport,
          picTester: picTester,
          linkedCrId: linkedCrId,
          linkedBrdId: linkedBrdId
        });
      }

      // 2. Fetch BRDs
      const brdSheet = getOrCreateSheet(SHEET_BRD, HEADERS_BRD, "#059669");
      const brdRows = brdSheet.getDataRange().getValues();
      const brds = [];
      for (let i = 1; i < brdRows.length; i++) {
        const row = brdRows[i];
        if (!row[0]) continue;
        brds.push({
          id: String(row[0]),
          code: String(row[1] || ""),
          title: String(row[2] || ""),
          version: String(row[3] || "1.0"),
          status: String(row[4] || "draft"),
          owner: String(row[5] || ""),
          targetRelease: formatDateForSheet(row[6]),
          summary: String(row[7] || ""),
          businessObjectives: parseJsonSafe(row[8], []),
          requirements: parseJsonSafe(row[9], []),
          createdAt: formatDateTimeForSheet(row[10]),
          updatedAt: formatDateTimeForSheet(row[11])
        });
      }

      // 3. Fetch CRs
      const crSheet = getOrCreateSheet(SHEET_CRS, HEADERS_CRS, "#D97706");
      const crRows = crSheet.getDataRange().getValues();
      const changeRequests = [];
      for (let i = 1; i < crRows.length; i++) {
        const row = crRows[i];
        if (!row[0]) continue;
        changeRequests.push({
          id: String(row[0]),
          crNumber: String(row[1] || ""),
          title: String(row[2] || ""),
          description: String(row[3] || ""),
          justification: String(row[4] || ""),
          impactArea: String(row[5] || "scope"),
          priority: String(row[6] || "medium"),
          status: String(row[7] || "submitted"),
          requestedBy: String(row[8] || ""),
          assignedTo: String(row[9] || ""),
          linkedTaskId: row[10] ? String(row[10]) : undefined,
          linkedBrdId: row[11] ? String(row[11]) : undefined,
          createdAt: formatDateTimeForSheet(row[12]),
          updatedAt: formatDateTimeForSheet(row[13])
        });
      }

      // 4. Fetch Test Cases
      const testSheet = getOrCreateSheet(SHEET_TESTS, HEADERS_TESTS, "#7C3AED");
      const testRows = testSheet.getDataRange().getValues();
      const testCases = [];
      for (let i = 1; i < testRows.length; i++) {
        const row = testRows[i];
        if (!row[0]) continue;
        testCases.push({
          id: String(row[0]),
          caseCode: String(row[1] || ""),
          type: String(row[2] || "SIT"),
          title: String(row[3] || ""),
          description: String(row[4] || ""),
          preconditions: String(row[5] || ""),
          steps: String(row[6] || ""),
          expectedResult: String(row[7] || ""),
          actualResult: String(row[8] || ""),
          status: String(row[9] || "untested"),
          severity: String(row[10] || "critical"),
          testedBy: String(row[11] || ""),
          testedAt: formatDateTimeForSheet(row[12]),
          linkedTaskId: row[13] ? String(row[13]) : undefined,
          notes: String(row[14] || "")
        });
      }

      return createJsonResponse({
        success: true,
        spreadsheetTitle: ss.getName(),
        spreadsheetUrl: ss.getUrl(),
        tasks: tasks,
        brds: brds,
        changeRequests: changeRequests,
        testCases: testCases
      });
    }

    return createJsonResponse({ success: false, error: "Unknown GET action: " + action });
  } catch (err) {
    return createJsonResponse({ success: false, error: err.toString() });
  }
}

function doPost(e) {
  try {
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    }

    const action = payload.action || "getAllData";

    if (action === "ping") {
      return doGet(e);
    }

    if (action === "getAllData" || action === "getTasks") {
      return doGet(e);
    }

    // Explicit Action: Send email invitation to PIC
    if (action === "sendEmailInvite") {
      const task = payload.task;
      const targetRole = payload.targetRole || "all";
      const result = sendTaskAssignmentEmails(task, targetRole);
      return createJsonResponse({
        success: true,
        message: "Email undangan berhasil dikirim kepada " + result.sentCount + " PIC yang terlibat!",
        sentCount: result.sentCount
      });
    }

    // Comprehensive Batch Sync for All 4 Sheets
    if (action === "syncAllData") {
      const tasks = payload.tasks || [];
      const brds = payload.brds || [];
      const crs = payload.changeRequests || [];
      const testCases = payload.testCases || [];

      // 1. Sync Tasks Sheet
      const taskSheet = getOrCreateSheet(SHEET_TASKS, HEADERS_TASKS, "#4F46E5");
      taskSheet.clearContents();
      taskSheet.appendRow(HEADERS_TASKS);
      taskSheet.setColumnWidth(12, 130);
      taskSheet.setColumnWidth(13, 160);
      taskSheet.setColumnWidth(14, 160);
      taskSheet.setColumnWidth(15, 160);

      if (tasks.length > 0) {
        const processedImagesMap = [];
        const taskRows = tasks.map((t, idx) => {
          const imgResult = processImagesForSheet(t.images);
          processedImagesMap.push(imgResult);
          return [
            String(t.id),
            String(t.title || ""),
            String(t.description || ""),
            String(t.status || "backlog"),
            String(t.priority || "medium"),
            Number(t.quadrant || 1),
            formatDateForSheet(t.dueDate),
            JSON.stringify(t.tags || []),
            JSON.stringify(t.subtasks || []),
            formatDateTimeForSheet(t.createdAt || new Date()),
            formatDateTimeForSheet(t.updatedAt || new Date()),
            imgResult.formula || "",
            formatPicForCell(t.picProgrammer),
            formatPicForCell(t.picSupport),
            formatPicForCell(t.picTester),
            String(t.linkedCrId || ""),
            String(t.linkedBrdId || "")
          ];
        });

        taskSheet.getRange(2, 1, taskRows.length, HEADERS_TASKS.length).setValues(taskRows);
        taskSheet.getRange(2, 7, taskRows.length, 1).setNumberFormat("yyyy-mm-dd");
        taskSheet.getRange(2, 10, taskRows.length, 2).setNumberFormat("yyyy-mm-dd hh:mm:ss");

        // Set image formulas, notes for multiple images, and row heights
        for (let r = 0; r < tasks.length; r++) {
          const rowIndex = r + 2;
          const imgInfo = processedImagesMap[r];
          if (imgInfo && imgInfo.formula && imgInfo.formula.startsWith("=")) {
            taskSheet.getRange(rowIndex, 12).setFormula(imgInfo.formula);
            if (imgInfo.note) {
              taskSheet.getRange(rowIndex, 12).setNote(imgInfo.note);
            }
            taskSheet.setRowHeight(rowIndex, 75);
          } else if (tasks[r].images && tasks[r].images.length > 0) {
            taskSheet.setRowHeight(rowIndex, 75);
          } else {
            taskSheet.setRowHeight(rowIndex, 35);
          }

          // If sendEmails requested in payload, send assignment email
          if (payload.sendEmails) {
            sendTaskAssignmentEmails(tasks[r]);
          }
        }
      }

      // 2. Sync BRD Sheet
      const brdSheet = getOrCreateSheet(SHEET_BRD, HEADERS_BRD, "#059669");
      brdSheet.clearContents();
      brdSheet.appendRow(HEADERS_BRD);
      if (brds.length > 0) {
        const brdRows = brds.map(b => [
          String(b.id),
          String(b.code || ""),
          String(b.title || ""),
          String(b.version || "1.0"),
          String(b.status || "draft"),
          String(b.owner || ""),
          formatDateForSheet(b.targetRelease),
          String(b.summary || ""),
          JSON.stringify(b.businessObjectives || []),
          JSON.stringify(b.requirements || []),
          formatDateTimeForSheet(b.createdAt || new Date()),
          formatDateTimeForSheet(b.updatedAt || new Date())
        ]);
        brdSheet.getRange(2, 1, brdRows.length, HEADERS_BRD.length).setValues(brdRows);
        brdSheet.getRange(2, 7, brdRows.length, 1).setNumberFormat("yyyy-mm-dd");
        brdSheet.getRange(2, 11, brdRows.length, 2).setNumberFormat("yyyy-mm-dd hh:mm:ss");
      }

      // 3. Sync CRs Sheet
      const crSheet = getOrCreateSheet(SHEET_CRS, HEADERS_CRS, "#D97706");
      crSheet.clearContents();
      crSheet.appendRow(HEADERS_CRS);
      if (crs.length > 0) {
        const crRows = crs.map(c => [
          String(c.id),
          String(c.crNumber || ""),
          String(c.title || ""),
          String(c.description || ""),
          String(c.justification || ""),
          String(c.impactArea || "scope"),
          String(c.priority || "medium"),
          String(c.status || "submitted"),
          String(c.requestedBy || ""),
          String(c.assignedTo || ""),
          String(c.linkedTaskId || ""),
          String(c.linkedBrdId || ""),
          formatDateTimeForSheet(c.createdAt || new Date()),
          formatDateTimeForSheet(c.updatedAt || new Date())
        ]);
        crSheet.getRange(2, 1, crRows.length, HEADERS_CRS.length).setValues(crRows);
        crSheet.getRange(2, 13, crRows.length, 2).setNumberFormat("yyyy-mm-dd hh:mm:ss");
      }

      // 4. Sync Test Cases Sheet
      const testSheet = getOrCreateSheet(SHEET_TESTS, HEADERS_TESTS, "#7C3AED");
      testSheet.clearContents();
      testSheet.appendRow(HEADERS_TESTS);
      if (testCases.length > 0) {
        const testRows = testCases.map(tc => [
          String(tc.id),
          String(tc.caseCode || ""),
          String(tc.type || "SIT"),
          String(tc.title || ""),
          String(tc.description || ""),
          String(tc.preconditions || ""),
          String(tc.steps || ""),
          String(tc.expectedResult || ""),
          String(tc.actualResult || ""),
          String(tc.status || "untested"),
          String(tc.severity || "critical"),
          String(tc.testedBy || ""),
          formatDateTimeForSheet(tc.testedAt || new Date()),
          String(tc.linkedTaskId || ""),
          String(tc.notes || "")
        ]);
        testSheet.getRange(2, 1, testRows.length, HEADERS_TESTS.length).setValues(testRows);
        testSheet.getRange(2, 13, testRows.length, 1).setNumberFormat("yyyy-mm-dd hh:mm:ss");
      }

      return createJsonResponse({
        success: true,
        message: "Successfully synchronized all tables to Google Sheets with PIC columns and multiple images!",
        counts: {
          tasks: tasks.length,
          brds: brds.length,
          changeRequests: crs.length,
          testCases: testCases.length
        }
      });
    }

    // Save individual task
    if (action === "createTask" || action === "saveTask") {
      const task = payload.task;
      const sheet = getOrCreateSheet(SHEET_TASKS, HEADERS_TASKS, "#4F46E5");
      sheet.setColumnWidth(12, 130);
      sheet.setColumnWidth(13, 160);
      sheet.setColumnWidth(14, 160);
      sheet.setColumnWidth(15, 160);

      const rows = sheet.getDataRange().getValues();
      let rowIndex = -1;
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === String(task.id)) {
          rowIndex = i + 1;
          break;
        }
      }

      const imgResult = processImagesForSheet(task.images);
      const taskRow = [
        String(task.id),
        String(task.title || ""),
        String(task.description || ""),
        String(task.status || "backlog"),
        String(task.priority || "medium"),
        Number(task.quadrant || 1),
        formatDateForSheet(task.dueDate),
        JSON.stringify(task.tags || []),
        JSON.stringify(task.subtasks || []),
        formatDateTimeForSheet(task.createdAt || new Date()),
        formatDateTimeForSheet(task.updatedAt || new Date()),
        imgResult.formula || "",
        formatPicForCell(task.picProgrammer),
        formatPicForCell(task.picSupport),
        formatPicForCell(task.picTester),
        String(task.linkedCrId || ""),
        String(task.linkedBrdId || "")
      ];

      if (rowIndex > 0) {
        sheet.getRange(rowIndex, 1, 1, HEADERS_TASKS.length).setValues([taskRow]);
        sheet.getRange(rowIndex, 7).setNumberFormat("yyyy-mm-dd");
        sheet.getRange(rowIndex, 10, 1, 2).setNumberFormat("yyyy-mm-dd hh:mm:ss");
        if (imgResult.formula && imgResult.formula.startsWith("=")) {
          sheet.getRange(rowIndex, 12).setFormula(imgResult.formula);
          if (imgResult.note) {
            sheet.getRange(rowIndex, 12).setNote(imgResult.note);
          }
        }
        if (task.images && task.images.length > 0) {
          sheet.setRowHeight(rowIndex, 75);
        }
      } else {
        sheet.appendRow(taskRow);
        const newRowIndex = sheet.getLastRow();
        sheet.getRange(newRowIndex, 7).setNumberFormat("yyyy-mm-dd");
        sheet.getRange(newRowIndex, 10, 1, 2).setNumberFormat("yyyy-mm-dd hh:mm:ss");
        if (imgResult.formula && imgResult.formula.startsWith("=")) {
          sheet.getRange(newRowIndex, 12).setFormula(imgResult.formula);
          if (imgResult.note) {
            sheet.getRange(newRowIndex, 12).setNote(imgResult.note);
          }
        }
        if (task.images && task.images.length > 0) {
          sheet.setRowHeight(newRowIndex, 75);
        }
      }

      // If requested or if task contains PIC emails, automatically send notification email
      let emailResult = { sentCount: 0 };
      if (payload.sendEmails !== false) {
        emailResult = sendTaskAssignmentEmails(task);
      }

      return createJsonResponse({
        success: true,
        message: "Task saved to Google Sheet" + (emailResult.sentCount > 0 ? " (Email dikirim ke " + emailResult.sentCount + " PIC)" : ""),
        taskId: task.id,
        emailCount: emailResult.sentCount
      });
    }

    // Delete task
    if (action === "deleteTask") {
      const taskId = payload.taskId;
      const sheet = getOrCreateSheet(SHEET_TASKS, HEADERS_TASKS, "#4F46E5");
      const rows = sheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === String(taskId)) {
          sheet.deleteRow(i + 1);
          return createJsonResponse({ success: true, message: "Task deleted from Google Sheet" });
        }
      }
      return createJsonResponse({ success: true, message: "Task already removed" });
    }

    return createJsonResponse({ success: false, error: "Unsupported POST action: " + action });
  } catch (err) {
    return createJsonResponse({ success: false, error: err.toString() });
  }
}
`;

/**
 * Universal dispatcher for Google Apps Script requests
 * First attempts to use /api/sheets-proxy (bypasses browser iframe restrictions & CORS)
 * Falls back to direct fetch with text/plain (prevents preflight CORS failure)
 */
async function postToAppsScript(cleanUrl: string, payload: any): Promise<{
  ok: boolean;
  status: number;
  data: any;
  error?: string;
  is401?: boolean;
}> {
  // 1. Try server-side proxy
  try {
    const proxyResponse = await fetch('/api/sheets-proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-target-url': cleanUrl
      },
      body: JSON.stringify({ targetUrl: cleanUrl, payload })
    });

    const data = await proxyResponse.json().catch(() => null);

    if (proxyResponse.status === 401 || data?.is401) {
      return {
        ok: false,
        status: 401,
        is401: true,
        data: null,
        error:
          'HTTP 401 (Unauthorized): Pengaturan "Who has access" di deployment Google Apps Script Anda saat ini belum diatur ke "Anyone" (Siapa saja), atau link yang digunakan berakhiran /dev (bukan /exec). Silakan ikuti panduan di tab Sheets API untuk mengubahnya.'
      };
    }

    if (proxyResponse.ok && data) {
      return { ok: true, status: proxyResponse.status, data };
    }
  } catch (_) {
    // If proxy failed, continue to direct browser fetch
  }

  // 2. Direct browser fetch with text/plain to avoid CORS preflight
  try {
    const response = await fetch(cleanUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    if (response.status === 401) {
      return {
        ok: false,
        status: 401,
        is401: true,
        data: null,
        error:
          'HTTP 401 (Unauthorized): Google memblokir akses karena Apps Script belum di-deploy dengan akses "Anyone" (Siapa saja).'
      };
    }

    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { ok: false, status: 0, data: null, error: errorMsg };
  }
}

/**
 * Test connectivity to Google Apps Script Web App
 */
export async function testAppsScriptConnection(url: string): Promise<{
  success: boolean;
  message: string;
  latencyMs: number;
  spreadsheetTitle?: string;
  spreadsheetUrl?: string;
}> {
  if (!url || !url.trim().startsWith('http')) {
    return {
      success: false,
      message: 'Invalid URL. Please enter a valid https://script.google.com URL.',
      latencyMs: 0
    };
  }

  const cleanUrl = url.trim();
  const start = performance.now();

  const res = await postToAppsScript(cleanUrl, { action: 'ping' });
  const latencyMs = Math.round(performance.now() - start);

  if (res.is401) {
    return {
      success: false,
      message: res.error || 'HTTP 401 Unauthorized.',
      latencyMs
    };
  }

  if (res.ok && res.data && res.data.success) {
    return {
      success: true,
      message: res.data.message || 'Connected successfully to Google Sheets API!',
      latencyMs,
      spreadsheetTitle: res.data.spreadsheetTitle,
      spreadsheetUrl: res.data.spreadsheetUrl
    };
  }

  return {
    success: false,
    message: res.error || res.data?.error || `HTTP ${res.status}: Failed to connect to Apps Script.`,
    latencyMs
  };
}

/**
 * Fetch ALL enterprise data from Google Sheets (Tasks, BRD, CR, TestCases)
 */
export async function fetchAllDataFromSheets(url: string): Promise<{
  success: boolean;
  tasks?: Task[];
  brds?: BRDDocument[];
  changeRequests?: ChangeRequest[];
  testCases?: TestCase[];
  spreadsheetTitle?: string;
  spreadsheetUrl?: string;
  error?: string;
}> {
  if (!url || !url.trim().startsWith('http')) {
    return { success: false, error: 'No valid Apps Script URL configured' };
  }

  const res = await postToAppsScript(url.trim(), { action: 'getAllData' });

  if (res.is401) {
    return { success: false, error: res.error };
  }

  if (res.ok && res.data && res.data.success) {
    return {
      success: true,
      tasks: Array.isArray(res.data.tasks) ? res.data.tasks : [],
      brds: Array.isArray(res.data.brds) ? res.data.brds : [],
      changeRequests: Array.isArray(res.data.changeRequests) ? res.data.changeRequests : [],
      testCases: Array.isArray(res.data.testCases) ? res.data.testCases : [],
      spreadsheetTitle: res.data.spreadsheetTitle,
      spreadsheetUrl: res.data.spreadsheetUrl
    };
  }

  return { success: false, error: res.error || res.data?.error || 'Failed to fetch data' };
}

/**
 * Bulk sync ALL enterprise data (Tasks, BRDs, ChangeRequests, TestCases) to Google Sheets
 */
export async function syncAllDataToSheets(
  url: string,
  data: {
    tasks: Task[];
    brds: BRDDocument[];
    changeRequests: ChangeRequest[];
    testCases: TestCase[];
  }
): Promise<{ success: boolean; message?: string; error?: string }> {
  if (!url || !url.trim().startsWith('http')) {
    return { success: false, error: 'No Apps Script URL configured' };
  }

  const res = await postToAppsScript(url.trim(), {
    action: 'syncAllData',
    tasks: data.tasks,
    brds: data.brds,
    changeRequests: data.changeRequests,
    testCases: data.testCases
  });

  if (res.is401) {
    return { success: false, error: res.error };
  }

  return {
    success: res.ok && !!res.data?.success,
    message: res.data?.message,
    error: res.error || res.data?.error
  };
}

export async function fetchTasksFromSheets(url: string): Promise<{ success: boolean; tasks?: Task[]; error?: string }> {
  const all = await fetchAllDataFromSheets(url);
  return { success: all.success, tasks: all.tasks, error: all.error };
}

export async function saveTaskToSheets(url: string, task: Task): Promise<{ success: boolean; error?: string }> {
  if (!url || !url.trim().startsWith('http')) {
    return { success: false, error: 'No Apps Script URL configured' };
  }

  const res = await postToAppsScript(url.trim(), { action: 'createTask', task });
  return { success: res.ok && !!res.data?.success, error: res.error || res.data?.error };
}

export async function deleteTaskFromSheets(url: string, taskId: string): Promise<{ success: boolean; error?: string }> {
  if (!url || !url.trim().startsWith('http')) {
    return { success: false, error: 'No Apps Script URL configured' };
  }

  const res = await postToAppsScript(url.trim(), { action: 'deleteTask', taskId });
  return { success: res.ok && !!res.data?.success, error: res.error || res.data?.error };
}

export async function syncBatchToSheets(url: string, tasks: Task[]): Promise<{ success: boolean; error?: string }> {
  return syncAllDataToSheets(url, { tasks, brds: [], changeRequests: [], testCases: [] });
}

export async function sendTaskInviteEmail(
  url: string,
  task: Task,
  targetRole: 'programmer' | 'support' | 'tester' | 'all' = 'all'
): Promise<{ success: boolean; message?: string; sentCount?: number; error?: string }> {
  if (!url || !url.trim().startsWith('http')) {
    return { success: false, error: 'No Apps Script URL configured' };
  }

  const res = await postToAppsScript(url.trim(), {
    action: 'sendEmailInvite',
    task,
    targetRole
  });

  return {
    success: res.ok && !!res.data?.success,
    message: res.data?.message,
    sentCount: res.data?.sentCount,
    error: res.error || res.data?.error
  };
}

