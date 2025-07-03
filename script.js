// Supabase Client Configuration
// *** IMPORTANT: Replace with your actual Supabase Project URL and Anon Key ***
const SUPABASE_URL = 'https://xoscoszdlzchwyisvxbp.supabase.co'; // Your Project URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhvc2Nvc3pkbHpjaHd5aXN2eGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1NDIwNzIsImV4cCI6MjA2NzExODA3Mn0.nZhld0oB8vmwvLzwhxhISuD6D-inHP7UVKhYzDfr6KY'; // Your Anon Public Key

let supabaseClient = null; // Will be initialized when DOM is ready

// --- DOM Element References ---
let elements = {};
const REQUIRED_ELEMENT_IDS = [
    'todoTitleInput', 'subjectSelect', 'addTodoButton', 'todoList', 'initialMessage',
    'subjectFilterButtons', 'hamburgerMenu', 'sideNav', 'closeNav', 'overlay',
    'showAddTodoView', 'showViewTasksView', 'addTodoView', 'viewTasksBySubjectView',
    'tasksBySubjectContainer'
];

let currentFilterSubject = 'all'; // Default filter for the main list view

// --- Utility Functions for Console Logging ---
const log = (message, ...args) => console.log(`[APP LOG]: ${message}`, ...args);
const warn = (message, ...args) => console.warn(`[APP WARN]: ${message}`, ...args);
const error = (message, ...args) => console.error(`[APP ERROR]: ${message}`, ...args);

// --- Core Application Functions ---

/**
 * Fetches todos from Supabase based on the current filter and renders them
 * to the main `todoList` element (for the "Add New Task" view).
 */
async function fetchTodos() {
    log(`Attempting to fetch todos for default view with filter: ${currentFilterSubject}`);
    elements.initialMessage.textContent = 'กำลังโหลดรายการ...';
    elements.initialMessage.className = 'initial-message'; // Reset class

    try {
        let query = supabaseClient.from('todos').select('*');

        if (currentFilterSubject !== 'all') {
            query = query.eq('subject', currentFilterSubject);
        }

        const { data, error: dbError } = await query.order('created_at', { ascending: false });

        if (dbError) {
            error('Error fetching todos:', dbError.message);
            elements.initialMessage.textContent = `เกิดข้อผิดพลาดในการดึงข้อมูล: ${dbError.message}`;
            elements.initialMessage.className = 'error-message';
            elements.todoList.innerHTML = ''; // Clear list on error
            return;
        }

        log('Todos fetched successfully for default view:', data);
        renderTodos(data);
    } catch (e) {
        error('Critical error in fetchTodos (try/catch):', e.message, e);
        elements.initialMessage.textContent = `เกิดข้อผิดพลาดร้ายแรง: ${e.message}`;
        elements.initialMessage.className = 'error-message';
        elements.todoList.innerHTML = ''; // Clear list on error
    }
}

/**
 * Renders an array of todo items into the `todoList` element.
 * @param {Array<Object>} todos - Array of todo objects.
 */
function renderTodos(todos) {
    log('Rendering todos for main list view:', todos);

    elements.todoList.innerHTML = ''; // Clear existing list items

    if (!todos || todos.length === 0) {
        elements.initialMessage.textContent = `ยังไม่มีสิ่งที่ต้องทำสำหรับ ${currentFilterSubject === 'all' ? 'ทุกวิชา' : currentFilterSubject}! เพิ่มใหม่ได้เลย!`;
        elements.initialMessage.className = 'no-todos-message';
        elements.todoList.appendChild(elements.initialMessage);
        log('No todos to display in main list view.');
        return;
    }

    // Remove the initial message if items exist
    if (elements.initialMessage.parentNode === elements.todoList) {
        elements.todoList.removeChild(elements.initialMessage);
    }

    todos.forEach(todo => {
        const todoItem = document.createElement('div');
        todoItem.className = `todo-item ${todo.is_done ? 'done' : ''}`;
        todoItem.dataset.id = todo.id; // Store ID for future operations

        todoItem.innerHTML = `
            <input type="checkbox" class="todo-checkbox" ${todo.is_done ? 'checked' : ''}>
            <div class="todo-content">
                <span class="todo-title">${todo.title}</span>
                <span class="todo-category">${todo.subject}</span>
            </div>
            <button class="delete-button">ลบ</button>
        `;

        todoItem.querySelector('.todo-checkbox').addEventListener('change', toggleTodoStatus);
        todoItem.querySelector('.delete-button').addEventListener('click', deleteTask);

        elements.todoList.appendChild(todoItem);
    });
}

/**
 * Adds a new todo item to Supabase.
 */
async function addTodo() {
    const title = elements.todoTitleInput.value.trim();
    const subject = elements.subjectSelect.value;

    log('Attempting to add todo:', { title, subject });

    if (!title) {
        alert('กรุณาใส่สิ่งที่ต้องทำ');
        warn('Add todo failed: Missing title.');
        return;
    }
    if (!subject) {
        alert('กรุณาเลือกวิชา');
        warn('Add todo failed: Missing subject.');
        return;
    }

    elements.addTodoButton.disabled = true;
    elements.addTodoButton.textContent = 'กำลังเพิ่ม...';

    try {
        const { data, error: dbError } = await supabaseClient
            .from('todos')
            .insert([{ title: title, subject: subject, is_done: false }]);

        if (dbError) {
            error('Error adding todo to Supabase:', dbError.message);
            alert(`เกิดข้อผิดพลาดในการเพิ่มสิ่งที่ต้องทำ: ${dbError.message}`);
            return;
        }

        log('Todo added successfully:', data);
        elements.todoTitleInput.value = ''; // Clear input
        elements.subjectSelect.value = ''; // Reset select
        fetchTodos(); // Refresh the main todo list
        // If the grouped view is active, trigger a refresh for it too
        if (!elements.viewTasksBySubjectView.classList.contains('hidden')) {
            fetchAndRenderTasksBySubject();
        }
    } catch (e) {
        error('Critical error in addTodo (try/catch):', e.message, e);
        alert(`เกิดข้อผิดพลาดร้ายแรงในการเพิ่ม: ${e.message}`);
    } finally {
        elements.addTodoButton.disabled = false;
        elements.addTodoButton.textContent = 'เพิ่ม';
    }
}

/**
 * Toggles the 'is_done' status of a todo in Supabase.
 * @param {Event} event - The change event from the checkbox.
 */
async function toggleTodoStatus(event) {
    const todoItem = event.target.closest('.todo-item');
    const todoId = todoItem.dataset.id;
    const isDone = event.target.checked;

    log('Attempting to toggle todo status:', { todoId, isDone });

    try {
        const { error: dbError } = await supabaseClient
            .from('todos')
            .update({ is_done: isDone })
            .eq('id', todoId);

        if (dbError) {
            error('Error updating todo status:', dbError.message);
            alert(`เกิดข้อผิดพลาดในการอัปเดตสถานะ: ${dbError.message}`);
            event.target.checked = !isDone; // Revert checkbox state on error
            return;
        }

        log('Todo status updated successfully:', { todoId, isDone });
        todoItem.classList.toggle('done', isDone); // Update UI class
    } catch (e) {
        error('Critical error in toggleTodoStatus (try/catch):', e.message, e);
        alert(`เกิดข้อผิดพลาดร้ายแรงในการอัปเดต: ${e.message}`);
        event.target.checked = !isDone; // Revert checkbox state on critical error
    }
}

/**
 * Deletes a todo item from Supabase.
 * @param {Event} event - The click event from the delete button.
 */
async function deleteTask(event) {
    const todoItem = event.target.closest('.todo-item');
    const todoId = todoItem.dataset.id;

    log('Attempting to delete todo:', todoId);

    if (!confirm('คุณแน่ใจหรือไม่ที่ต้องการลบสิ่งนี้?')) {
        log('Delete cancelled by user.');
        return;
    }

    try {
        const { error: dbError } = await supabaseClient
            .from('todos')
            .delete()
            .eq('id', todoId);

        if (dbError) {
            error('Error deleting todo:', dbError.message);
            alert(`เกิดข้อผิดพลาดในการลบ: ${dbError.message}`);
            return;
        }

        log('Todo deleted successfully:', todoId);
        todoItem.remove(); // Remove item from UI

        // If list becomes empty, show the message
        if (elements.todoList.children.length === 0) {
            elements.initialMessage.textContent = `ยังไม่มีสิ่งที่ต้องทำสำหรับ ${currentFilterSubject === 'all' ? 'ทุกวิชา' : currentFilterSubject}! เพิ่มใหม่ได้เลย!`;
            elements.initialMessage.className = 'no-todos-message';
            elements.todoList.appendChild(elements.initialMessage);
        }
        // If the grouped view is active, trigger a refresh for it too
        if (!elements.viewTasksBySubjectView.classList.contains('hidden')) {
            fetchAndRenderTasksBySubject();
        }
    } catch (e) {
        error('Critical error in deleteTask (try/catch):', e.message, e);
        alert(`เกิดข้อผิดพลาดร้ายแรงในการลบ: ${e.message}`);
    }
}

/**
 * Handles clicks on subject filter buttons for the main todo list view.
 * @param {Event} event - The click event from a filter button.
 */
function handleSubjectFilterClick(event) {
    const clickedButton = event.target.closest('.filter-button');
    if (!clickedButton) return;

    // Remove 'active' class from all filter buttons
    const allFilterButtons = elements.subjectFilterButtons.querySelectorAll('.filter-button');
    allFilterButtons.forEach(button => button.classList.remove('active'));

    // Add 'active' class to the clicked button
    clickedButton.classList.add('active');

    // Update filter and re-fetch todos
    currentFilterSubject = clickedButton.dataset.subjectFilter;
    log(`Filter changed to: ${currentFilterSubject}`);
    fetchTodos();
}

// --- Menu and View Management Functions ---

function openNav() {
    elements.sideNav.style.width = "250px"; // Adjust width as needed
    elements.overlay.style.display = "block";
    log('Side navigation opened.');
}

function closeNav() {
    elements.sideNav.style.width = "0";
    elements.overlay.style.display = "none";
    log('Side navigation closed.');
}

/**
 * Shows a specific application view and hides all others.
 * @param {HTMLElement} viewToShow - The DOM element of the view to show.
 */
function showView(viewToShow) {
    // Hide all views
    document.querySelectorAll('.app-view').forEach(view => {
        view.classList.add('hidden');
    });
    // Show the selected view
    viewToShow.classList.remove('hidden');
    log(`Switched to view: ${viewToShow.id}`);
    closeNav(); // Close navigation after view selection
}

/**
 * Fetches all tasks and groups them by subject for the "View Tasks By Subject" view.
 */
async function fetchAndRenderTasksBySubject() {
    log('Attempting to fetch and render tasks by subject for grouped view...');
    elements.tasksBySubjectContainer.innerHTML = '<p class="initial-message">กำลังโหลดงานทั้งหมด...</p>';
    elements.tasksBySubjectContainer.classList.remove('no-todos-message', 'error-message'); // Clear previous state classes

    try {
        // Fetch all tasks, ordered by subject then by creation date
        const { data, error: dbError } = await supabaseClient
            .from('todos')
            .select('*')
            .order('subject', { ascending: true })
            .order('created_at', { ascending: false });

        if (dbError) {
            error('Error fetching all tasks for grouped view:', dbError.message);
            elements.tasksBySubjectContainer.innerHTML = `<p class="error-message">เกิดข้อผิดพลาดในการดึงข้อมูล: ${dbError.message}</p>`;
            elements.tasksBySubjectContainer.classList.add('error-message');
            return;
        }

        if (!data || data.length === 0) {
            elements.tasksBySubjectContainer.innerHTML = '<p class="no-todos-message">ยังไม่มีงานในระบบเลย!</p>';
            elements.tasksBySubjectContainer.classList.add('no-todos-message');
            log('No tasks to display in grouped view.');
            return;
        }

        // Group tasks by their subject
        const tasksGroupedBySubject = data.reduce((acc, task) => {
            if (!acc[task.subject]) {
                acc[task.subject] = [];
            }
            acc[task.subject].push(task);
            return acc;
        }, {});

        elements.tasksBySubjectContainer.innerHTML = ''; // Clear previous content

        // Render each subject group
        const sortedSubjects = Object.keys(tasksGroupedBySubject).sort(); // Sort subjects alphabetically
        sortedSubjects.forEach(subject => {
            const subjectGroupDiv = document.createElement('div');
            subjectGroupDiv.className = 'subject-group';
            subjectGroupDiv.innerHTML = `<h3>${subject}</h3><div class="todo-list"></div>`;

            const todoListForSubject = subjectGroupDiv.querySelector('.todo-list');

            tasksGroupedBySubject[subject].forEach(todo => {
                const todoItem = document.createElement('div');
                todoItem.className = `todo-item ${todo.is_done ? 'done' : ''}`;
                // In this view, we make items read-only (no checkboxes/delete buttons)
                todoItem.innerHTML = `
                    <div class="todo-content">
                        <span class="todo-title">${todo.title}</span>
                        <span class="todo-category">${todo.is_done ? 'สถานะ: เสร็จแล้ว' : 'สถานะ: ยังไม่เสร็จ'}</span>
                    </div>
                `;
                todoListForSubject.appendChild(todoItem);
            });
            elements.tasksBySubjectContainer.appendChild(subjectGroupDiv);
            log(`Rendered group for subject: ${subject}`);
        });

    } catch (e) {
        error('Critical error in fetchAndRenderTasksBySubject (try/catch):', e.message, e);
        elements.tasksBySubjectContainer.innerHTML = `<p class="error-message">เกิดข้อผิดพลาดร้ายแรง: ${e.message}</p>`;
        elements.tasksBySubjectContainer.classList.add('error-message');
    }
}

// --- Initialize Application on DOM Load ---
document.addEventListener('DOMContentLoaded', () => {
    log('DOM Content Loaded. Initializing application...');

    // 1. Initialize Supabase Client
    try {
        if (typeof supabase === 'undefined' || !supabase.createClient) {
            throw new Error("Supabase client library not found. Make sure Supabase CDN script is loaded correctly in index.html.");
        }
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        log('Supabase client initialized successfully.');
    } catch (e) {
        error('Failed to initialize Supabase client:', e.message, e);
        alert(`ข้อผิดพลาดร้ายแรง: ไม่สามารถเชื่อมต่อ Supabase ได้. ${e.message}. โปรดตรวจสอบ Console และไฟล์ index.html/script.js.`);
        return;
    }

    // 2. Get DOM Element References and Validate
    let allElementsFound = true;
    REQUIRED_ELEMENT_IDS.forEach(id => {
        const element = document.getElementById(id);
        if (!element) {
            error(`Critical DOM element with ID "${id}" not found.`);
            allElementsFound = false;
        }
        elements[id] = element; // Store reference
    });

    if (!allElementsFound) {
        alert('เกิดข้อผิดพลาด: ไม่พบส่วนประกอบสำคัญของหน้าเว็บ. โปรดตรวจสอบ ID ใน HTML.');
        return; // Stop execution if elements are missing
    }
    log('All critical DOM elements referenced successfully.');

    // 3. Attach Event Listeners
    elements.addTodoButton.addEventListener('click', addTodo);
    elements.subjectFilterButtons.addEventListener('click', handleSubjectFilterClick);

    // Menu Event Listeners
    elements.hamburgerMenu.addEventListener('click', openNav);
    elements.closeNav.addEventListener('click', closeNav);
    elements.overlay.addEventListener('click', closeNav); // Close menu when clicking outside

    // View Navigation Event Listeners
    elements.showAddTodoView.addEventListener('click', (event) => {
        event.preventDefault(); // Prevent default link behavior
        showView(elements.addTodoView);
        fetchTodos(); // Refresh todos for this view
    });
    elements.showViewTasksView.addEventListener('click', (event) => {
        event.preventDefault(); // Prevent default link behavior
        showView(elements.viewTasksBySubjectView);
        fetchAndRenderTasksBySubject(); // Fetch and render for the grouped view
    });

    // 4. Initial Load: Show the "Add Todo" view and fetch its data
    showView(elements.addTodoView);
    fetchTodos();
});

log('Script finished parsing.');
