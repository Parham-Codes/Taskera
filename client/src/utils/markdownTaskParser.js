/**
 * Markdown Task Parser & Exporter
 * Supports bidirectional conversion between Task objects and AI-friendly Markdown / CSV.
 */

const PRIORITY_MAP_FA_TO_EN = {
  'فوری': 'urgent',
  'بسیار بالا': 'urgent',
  'ضروری': 'urgent',
  'urgent': 'urgent',
  'critical': 'urgent',
  'بالا': 'high',
  'high': 'high',
  'متوسط': 'medium',
  'عادی': 'medium',
  'معمولی': 'medium',
  'medium': 'medium',
  'پایین': 'low',
  'کم': 'low',
  'low': 'low',
};

const STATUS_MAP_FA_TO_EN = {
  'برای انجام': 'todo',
  'انجام نشده': 'todo',
  'شروع نشده': 'todo',
  'todo': 'todo',
  'در حال انجام': 'in-progress',
  'درحال انجام': 'in-progress',
  'in-progress': 'in-progress',
  'در حال بررسی': 'review',
  'بررسی': 'review',
  'review': 'review',
  'تکمیل شده': 'completed',
  'انجام شده': 'completed',
  'completed': 'completed',
  'done': 'completed',
};

/**
 * Parses raw Markdown text into structured Task objects
 * @param {string} rawMarkdown
 * @returns {Array} Array of parsed task objects
 */
export const parseMarkdownTasks = (rawMarkdown = '') => {
  if (!rawMarkdown || typeof rawMarkdown !== 'string') return [];

  // Normalize line endings
  const content = rawMarkdown.replace(/\r\n/g, '\n').trim();
  if (!content) return [];

  // Split tasks by `---` divider or top-level `# ` headings
  const sections = content
    .split(/\n\s*---\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const parsedTasks = [];

  for (const section of sections) {
    const lines = section.split('\n');

    let title = '';
    let priority = 'medium';
    let status = 'todo';
    let categoryName = '';
    let dueDate = null;
    let descriptionLines = [];
    let subtasks = [];
    let isParsingDescription = false;
    let isParsingSubtasks = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // 1. Detect Title (# Task: ... or # تسک: ... or # ...)
      if (!title && /^#+\s+/.test(line)) {
        title = line
          .replace(/^#+\s+/, '')
          .replace(/^(تسک|کار|وظیفه|task|ticket)\s*[:：\-]\s*/i, '')
          .trim();
        continue;
      }

      // 2. Detect Metadata Bullets (- اولویت: ... or - Priority: ...)
      const metaMatch = line.match(/^[-*•]\s*([^\s:：]+)\s*[:：]\s*(.+)$/);
      if (metaMatch && !isParsingDescription && !isParsingSubtasks) {
        const key = metaMatch[1].trim().toLowerCase();
        const val = metaMatch[2].trim();

        if (/^(اولویت|priority)$/i.test(key)) {
          const matchedPriority = PRIORITY_MAP_FA_TO_EN[val.toLowerCase()];
          if (matchedPriority) priority = matchedPriority;
          continue;
        }

        if (/^(دسته|دسته‌بندی|دسته بندی|category|tag)$/i.test(key)) {
          categoryName = val.replace(/^#/, '').trim();
          continue;
        }

        if (/^(وضعیت|status)$/i.test(key)) {
          const matchedStatus = STATUS_MAP_FA_TO_EN[val.toLowerCase()];
          if (matchedStatus) status = matchedStatus;
          continue;
        }

        if (/^(موعد|سررسید|مهلت|تاریخ|due|duedate)$/i.test(key)) {
          // Normalize ISO date or YYYY-MM-DD
          const dateMatch = val.match(/\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/);
          if (dateMatch) {
            const iso = dateMatch[0].replace(/[/.]/g, '-');
            const d = new Date(iso);
            if (!isNaN(d.getTime())) dueDate = iso;
          }
          continue;
        }
      }

      // 3. Detect Section Headers
      if (/^#+\s+(توضیحات|توضیح|شرح|description|details)/i.test(line)) {
        isParsingDescription = true;
        isParsingSubtasks = false;
        continue;
      }

      if (/^#+\s+(زیرتسک|زیرتسک‌ها|مراحل|مراحل کار|چک‌لیست|subtasks|checklist)/i.test(line)) {
        isParsingDescription = false;
        isParsingSubtasks = true;
        continue;
      }

      // 4. Detect Subtasks / Checklist Items (- [ ] or - [x])
      const checkMatch = line.match(/^[-*•]\s*\[([ xX])\]\s*(.+)$/);
      if (checkMatch) {
        const completed = checkMatch[1].toLowerCase() === 'x';
        const subtaskTitle = checkMatch[2].trim();
        if (subtaskTitle) {
          subtasks.push({ title: subtaskTitle, completed });
        }
        continue;
      }

      // 5. Append to description if under description or general content
      if (isParsingDescription) {
        descriptionLines.push(line);
      } else if (!isParsingSubtasks && !line.startsWith('#') && !line.startsWith('-')) {
        descriptionLines.push(line);
      }
    }

    if (title) {
      parsedTasks.push({
        title,
        description: descriptionLines.join('\n').trim(),
        priority,
        status,
        categoryName,
        dueDate,
        subtasks,
      });
    }
  }

  return parsedTasks;
};

/**
 * Generates AI-friendly Markdown string from task objects
 * @param {Array} tasks
 * @param {string} lang
 * @returns {string} Markdown text
 */
export const generateMarkdownFromTasks = (tasks = [], lang = 'fa') => {
  if (!Array.isArray(tasks) || tasks.length === 0) return '';

  const priorityLabels = {
    fa: { urgent: 'فوری', high: 'بالا', medium: 'متوسط', low: 'پایین' },
    en: { urgent: 'Urgent', high: 'High', medium: 'Medium', low: 'Low' },
  }[lang] || { urgent: 'High', high: 'High', medium: 'Medium', low: 'Low' };

  const statusLabels = {
    fa: { todo: 'برای انجام', 'in-progress': 'در حال انجام', review: 'در حال بررسی', completed: 'تکمیل شده' },
    en: { todo: 'To Do', 'in-progress': 'In Progress', review: 'In Review', completed: 'Completed' },
  }[lang];

  return tasks
    .map((task, index) => {
      const lines = [];
      lines.push(`# تسک: ${task.title}`);
      lines.push(`- اولویت: ${priorityLabels[task.priority] || task.priority}`);
      lines.push(`- وضعیت: ${statusLabels[task.status] || task.status}`);

      if (task.categoryId?.name) {
        lines.push(`- دسته‌بندی: ${task.categoryId.name}`);
      }

      if (task.dueDate) {
        const d = new Date(task.dueDate).toISOString().split('T')[0];
        lines.push(`- موعد: ${d}`);
      }

      if (task.assignedTo?.name) {
        lines.push(`- مسئول: ${task.assignedTo.name}`);
      }

      if (task.totalTimeSpent > 0) {
        lines.push(`- زمان صرف‌شده: ${Math.floor(task.totalTimeSpent / 60)} دقیقه`);
      }

      if (task.description && task.description.trim()) {
        lines.push('');
        lines.push('## توضیحات');
        lines.push(task.description.trim());
      }

      if (Array.isArray(task.subtasks) && task.subtasks.length > 0) {
        lines.push('');
        lines.push('## زیرتسک‌ها');
        task.subtasks.forEach((sub) => {
          lines.push(`- [${sub.completed ? 'x' : ' '}] ${sub.title}`);
        });
      }

      return lines.join('\n');
    })
    .join('\n\n---\n\n');
};

/**
 * Generates Excel-friendly CSV with UTF-8 BOM
 * @param {Array} tasks
 * @returns {string} CSV text with BOM
 */
export const generateCSVFromTasks = (tasks = []) => {
  const headers = [
    'عنوان',
    'وضعیت',
    'اولویت',
    'دسته‌بندی',
    'مسئول',
    'زمان صرف‌شده (دقیقه)',
    'موعد سررسید',
    'تعداد زیرتسک‌ها',
    'زیرتسک‌های تکمیل‌شده',
    'توضیحات',
  ];

  const escapeCSV = (str) => {
    if (str === null || str === undefined) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const statusMap = {
    todo: 'برای انجام',
    'in-progress': 'در حال انجام',
    review: 'در حال بررسی',
    completed: 'تکمیل‌شده',
  };

  const priorityMap = {
    urgent: 'فوری',
    high: 'بالا',
    medium: 'متوسط',
    low: 'پایین',
  };

  const rows = tasks.map((task) => {
    const totalSub = task.subtasks?.length || 0;
    const completedSub = task.subtasks?.filter((s) => s.completed)?.length || 0;
    const minutes = task.totalTimeSpent ? Math.floor(task.totalTimeSpent / 60) : 0;
    const due = task.dueDate ? new Date(task.dueDate).toLocaleDateString('fa-IR') : '';

    return [
      escapeCSV(task.title),
      escapeCSV(statusMap[task.status] || task.status),
      escapeCSV(priorityMap[task.priority] || task.priority),
      escapeCSV(task.categoryId?.name || 'بدون دسته'),
      escapeCSV(task.assignedTo?.name || 'تخصیص‌نیافته'),
      escapeCSV(minutes),
      escapeCSV(due),
      escapeCSV(totalSub),
      escapeCSV(completedSub),
      escapeCSV(task.description || ''),
    ].join(',');
  });

  // \uFEFF is UTF-8 Byte Order Mark for Excel Persian character encoding
  return '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
};

/**
 * Ready-made AI Prompt for the user to copy with 1 click
 */
export const READY_AI_PROMPT_TEMPLATE = `من پروژه‌ای با مشخصات زیر دارم. لطفاً این پروژه را به چند تسک عملیاتی و منطقی به همراه زیرتسک‌ها (چک‌لیست) تبدیل کن و خروجی را دقیقاً در قالب مارک‌داون زیر ارائه بده تا بتوانم مستقیماً آن را وارد تسکرا کنم:

# تسک: [عنوان تسک]
- اولویت: [فوری / بالا / متوسط / پایین]
- دسته‌بندی: [نام دسته مثلا: فرانت‌اند / بک‌اند / طراحی]
- موعد: [تاریخ مثلا: 2026-10-30]

## توضیحات
[توضیحات فنی یا اجرایی کار...]

## زیرتسک‌ها
- [ ] مرحله اول
- [ ] مرحله دوم
- [ ] مرحله سوم

---

(بین هر تسک از ۳ خط تیره استفاده کن. پروژه من: ...)`;
