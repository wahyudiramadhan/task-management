/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import JSZip from 'jszip';

export interface FlutterFile {
  path: string;
  filename: string;
  language: string;
  content: string;
  description: string;
}

export function generateFlutterFiles(configuredAppsScriptUrl = ''): FlutterFile[] {
  const defaultUrl = configuredAppsScriptUrl.trim() || 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';

  const pubspecContent = `name: taskflow_flutter
description: "A production-grade Material 3 Task Planner & Manager powered by Google Sheets & Apps Script."
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.2.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  http: ^1.2.0
  intl: ^0.19.0
  uuid: ^4.3.3
  cupertino_icons: ^1.0.8

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0

flutter:
  uses-material-design: true
`;

  const taskModelContent = `import 'dart:convert';
import 'package:flutter/material.dart';

enum TaskStatus {
  backlog,
  inProgress,
  review,
  done;

  String get label {
    switch (this) {
      case TaskStatus.backlog:
        return 'Backlog';
      case TaskStatus.inProgress:
        return 'In Progress';
      case TaskStatus.review:
        return 'Review';
      case TaskStatus.done:
        return 'Done';
    }
  }

  static TaskStatus fromString(String val) {
    switch (val.toLowerCase().replaceAll(' ', '_')) {
      case 'in_progress':
      case 'inprogress':
        return TaskStatus.inProgress;
      case 'review':
        return TaskStatus.review;
      case 'done':
      case 'completed':
        return TaskStatus.done;
      default:
        return TaskStatus.backlog;
    }
  }

  String get apiValue {
    switch (this) {
      case TaskStatus.backlog:
        return 'backlog';
      case TaskStatus.inProgress:
        return 'in_progress';
      case TaskStatus.review:
        return 'review';
      case TaskStatus.done:
        return 'done';
    }
  }
}

enum TaskPriority {
  low,
  medium,
  high,
  urgent;

  String get label {
    switch (this) {
      case TaskPriority.low:
        return 'Low';
      case TaskPriority.medium:
        return 'Medium';
      case TaskPriority.high:
        return 'High';
      case TaskPriority.urgent:
        return 'Urgent';
    }
  }

  Color get color {
    switch (this) {
      case TaskPriority.low:
        return Colors.blueGrey;
      case TaskPriority.medium:
        return Colors.indigo;
      case TaskPriority.high:
        return Colors.orange;
      case TaskPriority.urgent:
        return Colors.red;
    }
  }

  static TaskPriority fromString(String val) {
    switch (val.toLowerCase()) {
      case 'urgent':
        return TaskPriority.urgent;
      case 'high':
        return TaskPriority.high;
      case 'low':
        return TaskPriority.low;
      default:
        return TaskPriority.medium;
    }
  }
}

class SubTask {
  final String id;
  String title;
  bool completed;

  SubTask({
    required this.id,
    required this.title,
    this.completed = false,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'completed': completed,
      };

  factory SubTask.fromJson(Map<String, dynamic> json) => SubTask(
        id: json['id']?.toString() ?? '',
        title: json['title']?.toString() ?? '',
        completed: json['completed'] == true,
      );
}

class TaskAttachment {
  final String id;
  final String name;
  final String dataUrl;
  final int size;
  final String uploadedAt;

  TaskAttachment({
    required this.id,
    required this.name,
    required this.dataUrl,
    this.size = 0,
    String? uploadedAt,
  }) : uploadedAt = uploadedAt ?? DateTime.now().toIso8601String();

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'dataUrl': dataUrl,
        'size': size,
        'uploadedAt': uploadedAt,
      };

  factory TaskAttachment.fromJson(Map<String, dynamic> json) => TaskAttachment(
        id: json['id']?.toString() ?? '',
        name: json['name']?.toString() ?? '',
        dataUrl: json['dataUrl']?.toString() ?? '',
        size: int.tryParse(json['size']?.toString() ?? '0') ?? 0,
        uploadedAt: json['uploadedAt']?.toString() ?? '',
      );
}

class TaskItem {
  final String id;
  String title;
  String description;
  TaskStatus status;
  TaskPriority priority;
  int quadrant; // 1: Do First, 2: Schedule, 3: Delegate, 4: Don't Do
  String dueDate; // YYYY-MM-DD
  List<String> tags;
  List<SubTask> subtasks;
  List<TaskAttachment> images;
  String? linkedCrId;
  String? linkedBrdId;
  String createdAt;
  String updatedAt;

  TaskItem({
    required this.id,
    required this.title,
    this.description = '',
    this.status = TaskStatus.backlog,
    this.priority = TaskPriority.medium,
    this.quadrant = 1,
    this.dueDate = '',
    List<String>? tags,
    List<SubTask>? subtasks,
    List<TaskAttachment>? images,
    this.linkedCrId,
    this.linkedBrdId,
    String? createdAt,
    String? updatedAt,
  })  : tags = tags ?? [],
        subtasks = subtasks ?? [],
        images = images ?? [],
        createdAt = createdAt ?? DateTime.now().toIso8601String(),
        updatedAt = updatedAt ?? DateTime.now().toIso8601String();

  TaskItem copyWith({
    String? title,
    String? description,
    TaskStatus? status,
    TaskPriority? priority,
    int? quadrant,
    String? dueDate,
    List<String>? tags,
    List<SubTask>? subtasks,
    List<TaskAttachment>? images,
    String? linkedCrId,
    String? linkedBrdId,
  }) {
    return TaskItem(
      id: id,
      title: title ?? this.title,
      description: description ?? this.description,
      status: status ?? this.status,
      priority: priority ?? this.priority,
      quadrant: quadrant ?? this.quadrant,
      dueDate: dueDate ?? this.dueDate,
      tags: tags ?? List.from(this.tags),
      subtasks: subtasks ?? List.from(this.subtasks),
      images: images ?? List.from(this.images),
      linkedCrId: linkedCrId ?? this.linkedCrId,
      linkedBrdId: linkedBrdId ?? this.linkedBrdId,
      createdAt: createdAt,
      updatedAt: DateTime.now().toIso8601String(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'description': description,
        'status': status.apiValue,
        'priority': priority.name,
        'quadrant': quadrant,
        'dueDate': dueDate,
        'tags': tags,
        'subtasks': subtasks.map((s) => s.toJson()).toList(),
        'images': images.map((img) => img.toJson()).toList(),
        'linkedCrId': linkedCrId,
        'linkedBrdId': linkedBrdId,
        'createdAt': createdAt,
        'updatedAt': updatedAt,
      };

  factory TaskItem.fromJson(Map<String, dynamic> json) {
    List<String> parsedTags = [];
    if (json['tags'] is List) {
      parsedTags = (json['tags'] as List).map((e) => e.toString()).toList();
    } else if (json['tags'] is String) {
      try {
        final decoded = jsonDecode(json['tags']);
        if (decoded is List) {
          parsedTags = decoded.map((e) => e.toString()).toList();
        }
      } catch (_) {
        parsedTags = (json['tags'] as String).split(',').map((e) => e.trim()).toList();
      }
    }

    List<SubTask> parsedSubtasks = [];
    if (json['subtasks'] is List) {
      parsedSubtasks = (json['subtasks'] as List)
          .map((e) => SubTask.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    }

    List<TaskAttachment> parsedImages = [];
    if (json['images'] is List) {
      parsedImages = (json['images'] as List)
          .map((e) => TaskAttachment.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    } else if (json['images'] is String) {
      try {
        final decoded = jsonDecode(json['images']);
        if (decoded is List) {
          parsedImages = decoded
              .map((e) => TaskAttachment.fromJson(Map<String, dynamic>.from(e)))
              .toList();
        }
      } catch (_) {}
    }

    return TaskItem(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      status: TaskStatus.fromString(json['status']?.toString() ?? 'backlog'),
      priority: TaskPriority.fromString(json['priority']?.toString() ?? 'medium'),
      quadrant: int.tryParse(json['quadrant']?.toString() ?? '1') ?? 1,
      dueDate: json['dueDate']?.toString() ?? '',
      tags: parsedTags,
      subtasks: parsedSubtasks,
      images: parsedImages,
      linkedCrId: json['linkedCrId']?.toString(),
      linkedBrdId: json['linkedBrdId']?.toString(),
      createdAt: json['createdAt']?.toString() ?? '',
      updatedAt: json['updatedAt']?.toString() ?? '',
    );
  }
}
`;

  const appsScriptServiceContent = `import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/task_model.dart';

class AppsScriptService {
  String webAppUrl;

  AppsScriptService({required this.webAppUrl});

  /// Test connectivity to the Google Apps Script Web App
  Future<Map<String, dynamic>> testConnection() async {
    if (webAppUrl.isEmpty || !webAppUrl.startsWith('http')) {
      return {'success': false, 'message': 'Please provide a valid Web App URL'};
    }
    try {
      final response = await http.post(
        Uri.parse(webAppUrl),
        headers: {'Content-Type': 'text/plain;charset=utf-8'},
        body: jsonEncode({'action': 'ping'}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return {'success': data['success'] == true, 'message': data['message'] ?? 'Connected!'};
      }
      return {'success': false, 'message': 'HTTP \${response.statusCode}: \${response.reasonPhrase}'};
    } catch (e) {
      return {'success': false, 'message': 'Connection error: \$e'};
    }
  }

  /// Fetch all tasks from Google Sheets
  Future<List<TaskItem>> fetchTasks() async {
    if (webAppUrl.isEmpty) return [];

    final response = await http.post(
      Uri.parse(webAppUrl),
      headers: {'Content-Type': 'text/plain;charset=utf-8'},
      body: jsonEncode({'action': 'getTasks'}),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      if (data['success'] == true && data['tasks'] is List) {
        return (data['tasks'] as List)
            .map((item) => TaskItem.fromJson(Map<String, dynamic>.from(item)))
            .toList();
      }
    }
    throw Exception('Failed to fetch tasks from Google Sheets');
  }

  /// Create or update a single task in Google Sheets
  Future<bool> saveTask(TaskItem task) async {
    if (webAppUrl.isEmpty) return false;

    final response = await http.post(
      Uri.parse(webAppUrl),
      headers: {'Content-Type': 'text/plain;charset=utf-8'},
      body: jsonEncode({
        'action': 'createTask',
        'task': task.toJson(),
      }),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['success'] == true;
    }
    return false;
  }

  /// Delete a task from Google Sheets by ID
  Future<bool> deleteTask(String taskId) async {
    if (webAppUrl.isEmpty) return false;

    final response = await http.post(
      Uri.parse(webAppUrl),
      headers: {'Content-Type': 'text/plain;charset=utf-8'},
      body: jsonEncode({
        'action': 'deleteTask',
        'taskId': taskId,
      }),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['success'] == true;
    }
    return false;
  }

  /// Batch sync all tasks at once
  Future<bool> syncBatch(List<TaskItem> tasks) async {
    if (webAppUrl.isEmpty) return false;

    final response = await http.post(
      Uri.parse(webAppUrl),
      headers: {'Content-Type': 'text/plain;charset=utf-8'},
      body: jsonEncode({
        'action': 'syncBatch',
        'tasks': tasks.map((t) => t.toJson()).toList(),
      }),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['success'] == true;
    }
    return false;
  }
}
`;

  const kanbanScreenContent = `import 'package:flutter/material.dart';
import '../models/task_model.dart';

class KanbanScreen extends StatelessWidget {
  final List<TaskItem> tasks;
  final Function(TaskItem, TaskStatus) onStatusChange;
  final Function(TaskItem) onTaskTap;
  final Function(TaskItem) onDeleteTask;

  const KanbanScreen({
    super.key,
    required this.tasks,
    required this.onStatusChange,
    required this.onTaskTap,
    required this.onDeleteTask,
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth > 900;
        final columns = [
          _buildColumn(context, TaskStatus.backlog, 'Backlog', Icons.inbox_outlined, Colors.slateAccent(context)),
          _buildColumn(context, TaskStatus.inProgress, 'In Progress', Icons.trending_up, Colors.blue),
          _buildColumn(context, TaskStatus.review, 'In Review', Icons.rate_review_outlined, Colors.amber),
          _buildColumn(context, TaskStatus.done, 'Done', Icons.check_circle_outline, Colors.green),
        ];

        if (isWide) {
          return Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: columns.map((col) => Expanded(child: col)).toList(),
            ),
          );
        } else {
          return DefaultTabController(
            length: 4,
            child: Scaffold(
              appBar: const TabBar(
                isScrollable: true,
                tabs: [
                  Tab(text: 'Backlog'),
                  Tab(text: 'In Progress'),
                  Tab(text: 'Review'),
                  Tab(text: 'Done'),
                ],
              ),
              body: TabBarView(
                children: [
                  _buildTaskList(context, TaskStatus.backlog),
                  _buildTaskList(context, TaskStatus.inProgress),
                  _buildTaskList(context, TaskStatus.review),
                  _buildTaskList(context, TaskStatus.done),
                ],
              ),
            ),
          );
        }
      },
    );
  }

  Widget _buildColumn(BuildContext context, TaskStatus status, String title, IconData icon, Color color) {
    final colTasks = tasks.where((t) => t.status == status).toList();

    return DragTarget<TaskItem>(
      onAcceptWithDetails: (details) {
        onStatusChange(details.data, status);
      },
      builder: (context, candidateData, rejectedData) {
        final isHovered = candidateData.isNotEmpty;
        return Container(
          margin: const EdgeInsets.symmetric(horizontal: 6.0),
          decoration: BoxDecoration(
            color: isHovered
                ? color.withValues(alpha: 0.15)
                : Theme.of(context).colorScheme.surfaceContainerLowest,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isHovered ? color : Theme.of(context).dividerColor.withValues(alpha: 0.3),
              width: isHovered ? 2 : 1,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.all(14.0),
                child: Row(
                  children: [
                    Icon(icon, size: 18, color: color),
                    const SizedBox(width: 8),
                    Text(
                      title,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.surfaceContainerHigh,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        colTasks.length.toString(),
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),
              Expanded(
                child: colTasks.isEmpty
                    ? Center(
                        child: Text(
                          'No tasks in \$title',
                          style: TextStyle(color: Theme.of(context).hintColor, fontSize: 13),
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(8),
                        itemCount: colTasks.length,
                        itemBuilder: (context, index) {
                          final task = colTasks[index];
                          return _buildDraggableCard(context, task);
                        },
                      ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildTaskList(BuildContext context, TaskStatus status) {
    final colTasks = tasks.where((t) => t.status == status).toList();
    if (colTasks.isEmpty) {
      return Center(
        child: Text('No tasks in \${status.label}', style: TextStyle(color: Theme.of(context).hintColor)),
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: colTasks.length,
      itemBuilder: (context, index) => _buildCard(context, colTasks[index]),
    );
  }

  Widget _buildDraggableCard(BuildContext context, TaskItem task) {
    return LongPressDraggable<TaskItem>(
      data: task,
      feedback: Material(
        elevation: 8,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          width: 260,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Theme.of(context).cardColor,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(task.title, style: const TextStyle(fontWeight: FontWeight.w600)),
        ),
      ),
      childWhenDragging: Opacity(
        opacity: 0.3,
        child: _buildCard(context, task),
      ),
      child: _buildCard(context, task),
    );
  }

  Widget _buildCard(BuildContext context, TaskItem task) {
    final completedSubs = task.subtasks.where((s) => s.completed).length;

    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Theme.of(context).dividerColor.withValues(alpha: 0.3)),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => onTaskTap(task),
        child: Padding(
          padding: const EdgeInsets.all(12.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Text(
                      task.title,
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                    ),
                  ),
                  PopupMenuButton<TaskStatus>(
                    icon: const Icon(Icons.more_vert, size: 18),
                    onSelected: (newStatus) => onStatusChange(task, newStatus),
                    itemBuilder: (context) => TaskStatus.values.map((s) {
                      return PopupMenuItem(
                        value: s,
                        child: Text('Move to \${s.label}'),
                      );
                    }).toList(),
                  ),
                ],
              ),
              if (task.description.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(
                  task.description,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(color: Theme.of(context).hintColor, fontSize: 12),
                ),
              ],
              const SizedBox(height: 8),
              if (task.subtasks.isNotEmpty) ...[
                Row(
                  children: [
                    Icon(Icons.checklist, size: 14, color: Theme.of(context).hintColor),
                    const SizedBox(width: 4),
                    Text(
                      '\$completedSubs/\${task.subtasks.length} subtasks',
                      style: TextStyle(fontSize: 11, color: Theme.of(context).hintColor),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
              ],
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: task.priority.color.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      task.priority.label,
                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: task.priority.color),
                    ),
                  ),
                  if (task.dueDate.isNotEmpty) ...[
                    const SizedBox(width: 8),
                    Icon(Icons.calendar_today, size: 12, color: Theme.of(context).hintColor),
                    const SizedBox(width: 4),
                    Text(task.dueDate, style: TextStyle(fontSize: 11, color: Theme.of(context).hintColor)),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

extension ColorExtension on Colors {
  static Color slateAccent(BuildContext context) {
    return Theme.of(context).brightness == Brightness.dark ? Colors.grey : Colors.blueGrey;
  }
}
`;

  const matrixScreenContent = `import 'package:flutter/material.dart';
import '../models/task_model.dart';

class EisenhowerScreen extends StatelessWidget {
  final List<TaskItem> tasks;
  final Function(TaskItem) onTaskTap;
  final Function(TaskItem, int) onQuadrantChange;

  const EisenhowerScreen({
    super.key,
    required this.tasks,
    required this.onTaskTap,
    required this.onQuadrantChange,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        children: [
          Expanded(
            child: Row(
              children: [
                Expanded(
                  child: _buildQuadrantCard(
                    context,
                    quadrant: 1,
                    title: 'Do First',
                    subtitle: 'Urgent & Important',
                    color: Colors.red,
                    icon: Icons.priority_high,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildQuadrantCard(
                    context,
                    quadrant: 2,
                    title: 'Schedule',
                    subtitle: 'Important, Not Urgent',
                    color: Colors.amber.shade800,
                    icon: Icons.event_available,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Expanded(
            child: Row(
              children: [
                Expanded(
                  child: _buildQuadrantCard(
                    context,
                    quadrant: 3,
                    title: 'Delegate',
                    subtitle: 'Urgent, Not Important',
                    color: Colors.blue,
                    icon: Icons.group,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildQuadrantCard(
                    context,
                    quadrant: 4,
                    title: 'Don\\'t Do',
                    subtitle: 'Neither Urgent nor Important',
                    color: Colors.grey,
                    icon: Icons.delete_outline,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuadrantCard(
    BuildContext context, {
    required int quadrant,
    required String title,
    required String subtitle,
    required Color color,
    required IconData icon,
  }) {
    final qTasks = tasks.where((t) => t.quadrant == quadrant).toList();

    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerLowest,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.3), width: 1.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(14)),
            ),
            child: Row(
              children: [
                Icon(icon, size: 18, color: color),
                const SizedBox(width: 8),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: color)),
                    Text(subtitle, style: TextStyle(fontSize: 10, color: Theme.of(context).hintColor)),
                  ],
                ),
                const Spacer(),
                Text(
                  '\${qTasks.length}',
                  style: TextStyle(fontWeight: FontWeight.bold, color: color),
                ),
              ],
            ),
          ),
          Expanded(
            child: qTasks.isEmpty
                ? Center(
                    child: Text(
                      'No tasks in this quadrant',
                      style: TextStyle(fontSize: 12, color: Theme.of(context).hintColor),
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(8),
                    itemCount: qTasks.length,
                    itemBuilder: (context, index) {
                      final task = qTasks[index];
                      return Card(
                        elevation: 0,
                        margin: const EdgeInsets.only(bottom: 6),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                          side: BorderSide(color: Theme.of(context).dividerColor.withValues(alpha: 0.2)),
                        ),
                        child: ListTile(
                          dense: true,
                          title: Text(task.title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                          subtitle: task.dueDate.isNotEmpty
                              ? Text('Due: \${task.dueDate}', style: const TextStyle(fontSize: 11))
                              : null,
                          trailing: PopupMenuButton<int>(
                            icon: const Icon(Icons.swap_horiz, size: 16),
                            tooltip: 'Move Quadrant',
                            onSelected: (newQ) => onQuadrantChange(task, newQ),
                            itemBuilder: (context) => [
                              const PopupMenuItem(value: 1, child: Text('Q1: Do First')),
                              const PopupMenuItem(value: 2, child: Text('Q2: Schedule')),
                              const PopupMenuItem(value: 3, child: Text('Q3: Delegate')),
                              const PopupMenuItem(value: 4, child: Text('Q4: Don\\'t Do')),
                            ],
                          ),
                          onTap: () => onTaskTap(task),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
`;

  const mainDartContent = `import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';
import 'models/task_model.dart';
import 'services/apps_script_service.dart';
import 'screens/kanban_screen.dart';
import 'screens/matrix_screen.dart';

void main() {
  runApp(const TaskFlowApp());
}

class TaskFlowApp extends StatelessWidget {
  const TaskFlowApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'TaskFlow Planner',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF4F46E5),
          brightness: Brightness.light,
        ),
      ),
      darkTheme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF6366F1),
          brightness: Brightness.dark,
        ),
      ),
      themeMode: ThemeMode.system,
      home: const HomeScreen(),
    );
  }
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;
  bool _isLoading = false;
  String _appsScriptUrl = '${defaultUrl}';

  late AppsScriptService _apiService;
  List<TaskItem> _tasks = [];

  @override
  void initState() {
    super.initState();
    _apiService = AppsScriptService(webAppUrl: _appsScriptUrl);
    _loadTasks();
  }

  Future<void> _loadTasks() async {
    setState(() => _isLoading = true);
    try {
      final fetched = await _apiService.fetchTasks();
      setState(() => _tasks = fetched);
    } catch (_) {
      // Seed with initial demo task if empty
      if (_tasks.isEmpty) {
        setState(() {
          _tasks = [
            TaskItem(
              id: const Uuid().v4(),
              title: 'Review TaskFlow Flutter Setup',
              description: 'Connect Apps Script URL in settings and sync data with Google Sheets.',
              status: TaskStatus.inProgress,
              priority: TaskPriority.high,
              quadrant: 1,
              dueDate: DateTime.now().add(const Duration(days: 2)).toIso8601String().split('T').first,
              subtasks: [
                SubTask(id: '1', title: 'Open Google Sheets Extensions > Apps Script', completed: true),
                SubTask(id: '2', title: 'Deploy Web App as Anyone', completed: true),
                SubTask(id: '3', title: 'Verify live sync', completed: false),
              ],
            )
          ];
        });
      }
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _onStatusChange(TaskItem task, TaskStatus newStatus) {
    setState(() {
      task.status = newStatus;
    });
    _apiService.saveTask(task);
  }

  void _onQuadrantChange(TaskItem task, int newQuadrant) {
    setState(() {
      task.quadrant = newQuadrant;
    });
    _apiService.saveTask(task);
  }

  void _openTaskEditor([TaskItem? existing]) {
    final titleController = TextEditingController(text: existing?.title ?? '');
    final descController = TextEditingController(text: existing?.description ?? '');
    TaskPriority priority = existing?.priority ?? TaskPriority.medium;
    int quadrant = existing?.quadrant ?? 1;
    TaskStatus status = existing?.status ?? TaskStatus.backlog;

    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: Text(existing == null ? 'New Task' : 'Edit Task'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(
                      controller: titleController,
                      decoration: const InputDecoration(labelText: 'Task Title', border: OutlineInputBorder()),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: descController,
                      maxLines: 3,
                      decoration: const InputDecoration(labelText: 'Description', border: OutlineInputBorder()),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<TaskPriority>(
                      value: priority,
                      decoration: const InputDecoration(labelText: 'Priority', border: OutlineInputBorder()),
                      items: TaskPriority.values
                          .map((p) => DropdownMenuItem(value: p, child: Text(p.label)))
                          .toList(),
                      onChanged: (val) => setDialogState(() => priority = val!),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<int>(
                      value: quadrant,
                      decoration: const InputDecoration(labelText: 'Eisenhower Quadrant', border: OutlineInputBorder()),
                      items: const [
                        DropdownMenuItem(value: 1, child: Text('Q1: Urgent & Important (Do First)')),
                        DropdownMenuItem(value: 2, child: Text('Q2: Important, Not Urgent (Schedule)')),
                        DropdownMenuItem(value: 3, child: Text('Q3: Urgent, Not Important (Delegate)')),
                        DropdownMenuItem(value: 4, child: Text('Q4: Neither (Don\\'t Do)')),
                      ],
                      onChanged: (val) => setDialogState(() => quadrant = val!),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
                FilledButton(
                  onPressed: () {
                    if (titleController.text.trim().isEmpty) return;
                    if (existing == null) {
                      final newTask = TaskItem(
                        id: const Uuid().v4(),
                        title: titleController.text.trim(),
                        description: descController.text.trim(),
                        status: status,
                        priority: priority,
                        quadrant: quadrant,
                      );
                      setState(() => _tasks.add(newTask));
                      _apiService.saveTask(newTask);
                    } else {
                      setState(() {
                        existing.title = titleController.text.trim();
                        existing.description = descController.text.trim();
                        existing.priority = priority;
                        existing.quadrant = quadrant;
                      });
                      _apiService.saveTask(existing);
                    }
                    Navigator.pop(context);
                  },
                  child: const Text('Save'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('TaskFlow', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.sync),
            tooltip: 'Sync with Google Sheets',
            onPressed: _loadTasks,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _currentIndex == 0
              ? KanbanScreen(
                  tasks: _tasks,
                  onStatusChange: _onStatusChange,
                  onTaskTap: _openTaskEditor,
                  onDeleteTask: (t) {
                    setState(() => _tasks.removeWhere((item) => item.id == t.id));
                    _apiService.deleteTask(t.id);
                  },
                )
              : EisenhowerScreen(
                  tasks: _tasks,
                  onTaskTap: _openTaskEditor,
                  onQuadrantChange: _onQuadrantChange,
                ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _openTaskEditor(),
        tooltip: 'Add Task',
        child: const Icon(Icons.add),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (idx) => setState(() => _currentIndex = idx),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.view_kanban_outlined), label: 'Kanban Board'),
          NavigationDestination(icon: Icon(Icons.grid_view_outlined), label: 'Eisenhower Matrix'),
        ],
      ),
    );
  }
}
`;

  return [
    {
      path: 'pubspec.yaml',
      filename: 'pubspec.yaml',
      language: 'yaml',
      content: pubspecContent,
      description: 'Flutter dependencies including http, intl, and uuid'
    },
    {
      path: 'lib/models/task_model.dart',
      filename: 'task_model.dart',
      language: 'dart',
      content: taskModelContent,
      description: 'Null-safe Dart model for Tasks, Subtasks, Priority, and Status'
    },
    {
      path: 'lib/services/apps_script_service.dart',
      filename: 'apps_script_service.dart',
      language: 'dart',
      content: appsScriptServiceContent,
      description: 'HTTP client for Google Apps Script Web App API'
    },
    {
      path: 'lib/screens/kanban_screen.dart',
      filename: 'kanban_screen.dart',
      language: 'dart',
      content: kanbanScreenContent,
      description: 'Drag-and-drop Kanban Board with 4 stage columns'
    },
    {
      path: 'lib/screens/matrix_screen.dart',
      filename: 'matrix_screen.dart',
      language: 'dart',
      content: matrixScreenContent,
      description: '4-Quadrant Eisenhower Matrix grid'
    },
    {
      path: 'lib/main.dart',
      filename: 'main.dart',
      language: 'dart',
      content: mainDartContent,
      description: 'Material 3 Flutter app entry point with theme and live state'
    }
  ];
}

export async function createFlutterZip(configuredAppsScriptUrl = ''): Promise<Blob> {
  const zip = new JSZip();
  const files = generateFlutterFiles(configuredAppsScriptUrl);

  const root = zip.folder('taskflow_flutter')!;
  for (const file of files) {
    root.file(file.path, file.content);
  }

  // Add README.md with setup instructions
  root.file(
    'README.md',
    `# TaskFlow Flutter App

TaskFlow is a Material 3 cross-platform Task Planner & Manager integrated with Google Sheets as the database and Google Apps Script as the REST API.

## Requirements
- Flutter SDK 3.2.0 or newer
- Android Studio / VS Code with Flutter extension

## Getting Started
1. Run \`flutter pub get\` to install dependencies (http, intl, uuid).
2. Ensure your Google Apps Script is deployed as a Web App (Anyone).
3. If needed, update \`_appsScriptUrl\` in \`lib/main.dart\` with your Web App URL.
4. Run on your desired target:
   - Chrome: \`flutter run -d chrome\`
   - Android: \`flutter run -d android\`
   - iOS: \`flutter run -d ios\`
`
  );

  return await zip.generateAsync({ type: 'blob' });
}
