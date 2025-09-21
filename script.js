'use strict';

/* ===================== DOM (getElementById) ===================== */
const $taskText = document.getElementById('taskText');
const $taskDate = document.getElementById('taskDate');
const $addBtn = document.getElementById('addBtn');
const $taskList = document.getElementById('taskList');
const $filters = document.getElementById('filters');
const $sortBtn = document.getElementById('sortBtn');
const $themeToggle = document.getElementById('themeToggle'); // NEW

/* ===================== Storage (localStorage) ===================== */

function getTasks() {
    const raw = localStorage.getItem('tasks');
    if (!raw) return [];
    try {
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr : [];
    } catch {
        return [];
    }
}

function saveTasks(tasks) {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

/* ===================== STATE ===================== */
let tasks = getTasks();
let currentFilter = 'all';
let sortDir = 'asc';

/* ===================== Utils ===================== */
const genId = () => Math.random().toString(36).slice(2, 9);
const normDate = (d) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? d : '');

/* ===================== THEME (Dark / Light) ===================== */

function getPreferredTheme() {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved;
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
}
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if ($themeToggle) $themeToggle.textContent = theme === 'dark' ? '🌙 Dark' : '☀️ Light';
}
function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || getPreferredTheme();
    const next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', next);
    applyTheme(next);
}

applyTheme(getPreferredTheme());

if (window.matchMedia) {
    const mqDark = window.matchMedia('(prefers-color-scheme: dark)');
    mqDark.addEventListener?.('change', e => {
        if (localStorage.getItem('theme') === null) applyTheme(e.matches ? 'dark' : 'light');
    });
}

/* ===================== Render (global) ===================== */
function renderTasks() {
    // סינון
    let view = tasks.filter(t => {
        if (currentFilter === 'completed') return t.completed;
        if (currentFilter === 'active') return !t.completed;
        return true;
    });

    // מיון לפי תאריך יעד
    view.sort((a, b) => {
        const A = a.dueDate || (sortDir === 'asc' ? '9999-99-99' : '0000-00-00');
        const B = b.dueDate || (sortDir === 'asc' ? '9999-99-99' : '0000-00-00');
        return sortDir === 'asc' ? A.localeCompare(B) : B.localeCompare(A);
    });

    // רינדור
    $taskList.innerHTML = '';
    view.forEach(t => {
        const li = document.createElement('li');
        li.className = `task${t.completed ? ' completed' : ''}`;
        li.dataset.id = t.id;

        // checkbox (סימון כהושלם)
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = t.completed;

        // תיאור
        const text = document.createElement('span');
        text.className = 'task-text';
        text.textContent = t.text;

        // תאריך
        const due = document.createElement('small');
        due.textContent = t.dueDate ? `Due: ${t.dueDate}` : 'No due date';

        // מחיקה
        const del = document.createElement('button');
        del.className = 'delete';
        del.type = 'button';
        del.textContent = '✕';
        del.title = 'Delete task';

        li.append(cb, text, due, del);
        $taskList.appendChild(li);
    });
}

/* ===================== Actions ===================== */
/** הוספת משימה חדשה */
function addTask() {
    const text = $taskText.value.trim();
    const date = normDate($taskDate.value);
    if (!text) { $taskText.focus(); return; }

    const task = { id: genId(), text, dueDate: date, completed: false };
    tasks.push(task);
    saveTasks(tasks);
    $taskText.value = '';
    $taskDate.value = '';
    renderTasks();
}

/** שינוי סינון */
function filterTasks(filter) {
    currentFilter = filter;
    // עדכון UI
    $filters.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('is-active', btn.dataset.filter === filter);
    });
    renderTasks();
}

/** מיון לפי תאריך יעד */
function sortTasks() {
    sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    $sortBtn.dataset.dir = sortDir;
    $sortBtn.textContent = `Sort by Due Date ${sortDir === 'asc' ? '↑' : '↓'}`;
    renderTasks();
}

/* ===================== Event Handling ===================== */
// כפתור "הוסף משימה"
$addBtn.addEventListener('click', addTask);
// אנטר בשדה הטקסט
$taskText.addEventListener('keydown', (e) => { if (e.key === 'Enter') addTask(); });

// סינון 
$filters.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-filter]');
    if (!btn) return;
    filterTasks(btn.dataset.filter);
});

// מיון
$sortBtn.addEventListener('click', sortTasks);

// פעולות בתוך הרשימה 
$taskList.addEventListener('click', (e) => {
    const li = e.target.closest('li.task');
    if (!li) return;
    const id = li.dataset.id;

    // מחיקה
    if (e.target.classList.contains('delete')) {
        tasks = tasks.filter(t => t.id !== id);
        saveTasks(tasks);
        renderTasks();
        return;
    }
});

$taskList.addEventListener('change', (e) => {

    if (e.target instanceof HTMLInputElement && e.target.type === 'checkbox') {
        const li = e.target.closest('li.task');
        if (!li) return;
        const id = li.dataset.id;
        const t = tasks.find(x => x.id === id);
        if (!t) return;
        t.completed = !!e.target.checked;
        saveTasks(tasks);
        renderTasks();
    }
});


$themeToggle?.addEventListener('click', toggleTheme);

/* ===================== Initial Tasks from API (Optional) ===================== */
async function fetchInitialTasks() {
    try {
        const res = await fetch('https://jsonplaceholder.typicode.com/todos?_limit=5');
        if (!res.ok) return;
        const data = await res.json();
        const seed = data.map(item => ({
            id: genId(),
            text: item.title,
            dueDate: '',
            completed: !!item.completed
        }));
        tasks = [...seed, ...tasks];
        saveTasks(tasks);
        renderTasks();
    } catch {

    }
}

/* ===================== INIT ===================== */
renderTasks();
if (tasks.length === 0) {

}
