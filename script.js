// Supabase Client Configuration
// *** IMPORTANT: Replace with your actual Supabase Project URL and Anon Key ***
const SUPABASE_URL = 'https://xoscoszdlzchwyisvxbp.supabase.co'; // Your Project URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhvc2Nvc3pkbHpjaHd5aXN2eGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1NDIwNzIsImV4cCI6MjA2NzExODA3Mn0.nZhld0oB8vmwvLzwhxhISuD6D-inHP7UVKhYzDfr6KY'; // Your Anon Public Key

let supabaseClient = null; // Will be initialized on DOMContentLoaded

// Global DOM Element References
let todoTitleInput, subjectSelect, addTodoButton, todoList, initialMessage;
let subjectFilterButtons;

// New: Menu and View Elements
let hamburgerMenu, sideNav, closeNav, overlay;
let showAddTodoViewLink, showViewTasksViewLink;
let addTodoView, viewTasksBySubjectView;
let tasksBySubjectContainer; // Container for grouped tasks

let currentFilterSubject = 'all'; // Default filter is 'all'

// --- Utility Functions for Console Logging ---
const log = (message, ...args) => console.log(`[APP LOG]: ${message}`, ...args);
const warn = (message, ...args) => console.warn(`[APP WARN]: ${message}`, ...args);
const error = (message, ...args) => console.error(`[APP ERROR]: ${message}`, ...args);

// --- Core Application Functions ---

/**
 * Fetches todos from Supabase based on the current filter and renders them.
 * This function is primarily used for the 'Add Todo' view (addTodoView).
 */
async function fetchTodos() {
    log(`Attempting to fetch todos for default view with filter: ${currentFilterSubject || 'None'}`);
    initialMessage.textContent = 'กำลังโหลดรายการ...';
    initialMessage.className = 'initial-message'; // Reset message class

    try {
        let query = supabaseClient.from('todos').select('*');

        // Apply filter if a specific subject is selected
        if (currentFilterSubject !== 'all') {
            query = query.eq('subject', currentFilterSubject); // Filter by subject column
        }

        const { data, error: dbError } = await query.order('created_at', { ascending: false });

        if (dbError) {
            error('Error fetching todos:', dbError.message);
            initialMessage.textContent = `เกิดข้อผิดพลาดในการดึงข้อมูล: ${dbError.message}`;
            initialMessage.className = 'error-message';
            todoList.innerHTML = ''; // Clear any existing items
            return;
        }

        log('Todos fetched successfully for default view:', data);
        renderTodos(data);
    } catch (e) {
        error('Critical error in fetchTodos (try/catch):', e.message, e);
        initialMessage.textContent = `เกิดข้อผิดพลาดร้ายแรง: ${e.message}`;
        initialMessage.className = 'error-message';
        todoList.innerHTML = ''; // Clear any existing items
    }
}

/**
 * Renders an array of todo items to the UI for the default list view.
 * @param {Array<Object>} todos - An array of todo objects from Supabase.
 */
function renderTodos(todos) {
    log('Rendering todos for default list view:', todos);

    // Ensure todoList element exists
    if (!todoList) {
        error('todoList element not found during renderTodos.');
        return;
    }

    todoList.innerHTML = ''; // Clear current list

    if (!todos || todos.length === 0) {
        initialMessage.textContent = `ยังไม่มีสิ่งที่ต้องทำสำหรับ ${currentFilterSubject === 'all' ? 'ทุกวิชา' : currentFilterSubject}! เพิ่มใหม่ได้เลย!`;
        initialMessage.className = 'no-todos-message';
        todoList.appendChild(initialMessage); // Show the message
        log('No todos to display in default list view.');
        return;
    }

    // Hide initial/empty message if todos exist
    if (initialMessage.parentNode === todoList) {
        todoList.removeChild(initialMessage);
    }

    todos.forEach(todo => {
        const todoItem = document.createElement('div');
        todoItem.className = `todo-item ${todo.is_done ? 'done' : ''}`;
        todoItem.dataset.id = todo.id; // Store Supabase ID for operations

        todoItem.innerHTML = `
            <input type="checkbox" class="todo-checkbox" ${todo.is_done ? 'checked' : ''}>
            <div class="todo-content">
                <span class="todo-title">${todo.title}</span>
                <span class="todo-category">${todo.subject}</span> 
            </div>
            <button class="delete-button">ลบ</button>
        `;

        // Add event listeners for the new elements
        todoItem.querySelector('.todo-checkbox').addEventListener('change', toggleTodoStatus);
        todoItem.querySelector('.delete-button').addEventListener('click', deleteTask);

        todoList.appendChild(todoItem);
        // log(`Todo item "${todo.title}" (ID: ${todo.id}) added to UI.`); // Optional: Too many logs
    });
}

/**
 * Adds a new todo item to Supabase.
 */
async function addTodo() {
    const title = todoTitleInput.value.trim();
    const subject = subjectSelect.value; 

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

    addTodoButton.disabled = true;
    addTodoButton.textContent = 'กำลังเพิ่ม...';

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
        todoTitleInput.value = ''; // Clear input
        subjectSelect.value = ''; // Reset select
        fetchTodos(); // Refresh the list in the current (addTodoView) view
        // If the other view (viewTasksBySubjectView) is currently visible,
        // it should also be refreshed to show the new item.
        // We'll handle this when switching views for simplicity.
    } catch (e) {
        error('Critical error in addTodo (try/catch):', e.message, e);
        alert(`เกิดข้อผิดพลาดร้ายแรงในการเพิ่ม: ${e.message}`);
    } finally {
        addTodoButton.disabled = false;
        addTodoButton.textContent = 'เพิ่ม';
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
            event.target.checked = !isDone; // Revert checkbox state
            return;
        }

        log('Todo status updated successfully:', { todoId, isDone });
        todoItem.classList.toggle('done', isDone); // Apply/remove 'done' class
    } catch (e) {
        error('Critical error in toggleTodoStatus (try/catch):', e.message, e);
        alert(`เกิดข้อผิดพลาดร้ายแรงในการอัปเดต: ${e.message}`);
        event.target.checked = !isDone; // Revert checkbox state
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
        todoItem.remove(); // Remove from UI

        // If no todos left, show the empty message
        if (todoList.children.length === 0) {
            initialMessage.textContent = `ยังไม่มีสิ่งที่ต้องทำสำหรับ ${currentFilterSubject === 'all' ? 'ทุกวิชา' : currentFilterSubject}! เพิ่มใหม่ได้เลย!`;
            initialMessage.className = 'no-todos-message';
            todoList.appendChild(initialMessage);
        }
        // If the other view is open/rendered, it also needs refresh after deletion
        if (!viewTasksBySubjectView.classList.contains('hidden')) {
             fetchAndRenderTasksBySubject(); // Refresh the grouped view if it's active
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
    if (!clickedButton) return; // Not a filter button

    const subjectToFilter = clickedButton.dataset.subjectFilter;

    // Remove 'active' class from all filter buttons
    const allFilterButtons = subjectFilterButtons.querySelectorAll('.filter-button');
    allFilterButtons.forEach(button => button.classList.remove('active'));

    // Add 'active' class to the clicked button
    clickedButton.classList.add('active');

    // Update the current filter and re-fetch todos
    currentFilterSubject = subjectToFilter;
    log(`Filter changed to: ${currentFilterSubject}`);
    fetchTodos();
}


// --- New: Menu and View Management Functions ---

function openNav() {
    sideNav.style.width = "250px"; // Adjust width as needed
    overlay.style.display = "block";
    log('Side navigation opened.');
}

function closeNav() {
    sideNav.style.width = "0";
    overlay.style.display = "none";
    log('Side navigation closed.');
}

/**
 * Shows a specific application view and hides others.
 * @param {HTMLElement} viewToShow - The DOM element of the view to show.
 */
function showView(viewToShow) {
    // Hide all views first
    document.querySelectorAll('.app-view').forEach(view => {
        view.classList.add('hidden');
    });
    // Show the selected view
    viewToShow.classList.remove('hidden');
    log(`Switched to view: ${viewToShow.id}`);
    closeNav(); // Close navigation after selection
}

/**
 * Fetches all tasks and groups them by subject for the 'View Tasks by Subject' page.
 */
async function fetchAndRenderTasksBySubject() {
    log('Attempting to fetch and render tasks by subject for grouped view...');
    tasksBySubjectContainer.innerHTML = '<p class="initial-message">กำลังโหลดงานทั้งหมด...</p>';
    tasksBySubjectContainer.classList.remove('no-todos-message', 'error-message'); // Clear previous state classes

    try {
        const { data, error: dbError } = await supabaseClient
            .from('todos')
            .select('*')
            .order('subject', { ascending: true }) // Order by subject first
            .order('created_at', { ascending: false }); // Then by creation date

        if (dbError) {
            error('Error fetching all tasks for grouped view:', dbError.message);
            tasksBySubjectContainer.innerHTML = `<p class="error-message">เกิดข้อผิดพลาดในการดึงข้อมูล: ${dbError.message}</p>`;
            tasksBySubjectContainer.classList.add('error-message');
            return;
        }

        if (!data || data.length === 0) {
            tasksBySubjectContainer.innerHTML = '<p class="no-todos-message">ยังไม่มีงานในระบบเลย!</p>';
            tasksBySubjectContainer.classList.add('no-todos-message');
            log('No tasks to display in grouped view.');
            return;
        }

        // Group tasks by subject
        const tasksGroupedBySubject = data.reduce((acc, task) => {
            if (!acc[task.subject]) {
                acc[task.subject] = [];
            }
            acc[task.subject].push(task);
            return acc;
        }, {});

        tasksBySubjectContainer.innerHTML = ''; // Clear previous content

        // Render each subject group
        const sortedSubjects = Object.keys(tasksGroupedBySubject).sort(); // Sort subjects alphabetically
        sortedSubjects.forEach(subject => {
            const subjectGroup = document.createElement('div');
            subjectGroup.className = 'subject-group';
            subjectGroup.innerHTML = `<h3>${subject}</h3><div class="todo-list"></div>`;

            const todoListForSubject = subjectGroup.querySelector('.todo-list');

            tasksGroupedBySubject[subject].forEach(todo => {
                const todoItem = document.createElement('div');
                todoItem.className = `todo-item ${todo.is_done ? 'done' : ''}`;
                // For this view, we're not making them interactive (no checkbox/delete button)
                todoItem.innerHTML = `
                    <div class="todo-content">
                        <span class="todo-title">${todo.title}</span>
                        <span class="todo-category">${todo.is_done ? 'เสร็จแล้ว' : 'ยังไม่เสร็จ'}</span>
                    </div>
                `;
                todoListForSubject.appendChild(todoItem);
            });
            tasksBySubjectContainer.appendChild(subjectGroup);
            log(`Rendered group for subject: ${subject}`);
        });

    } catch (e) {
        error('Critical error in fetchAndRenderTasksBySubject (try/catch):', e.message, e);
        tasksBySubjectContainer.innerHTML = `<p class="error-message">เกิดข้อผิดพลาดร้ายแรง: ${e.message}</p>`;
        tasksBySubjectContainer.classList.add('error-message');
    }
}

// --- Initialize Application on DOM Load ---
document.addEventListener('DOMContentLoaded', () => {
    log('DOM Content Loaded. Initializing application...');

    // 1. Initialize Supabase Client
    try {
        // 'supabase' object comes from the CDN script loaded in index.html
        if (typeof supabase === 'undefined' || !supabase.createClient) {
            throw new Error("Supabase client library not found. Make sure <script src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'></script> is loaded correctly in index.html.");
        }
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        log('Supabase client initialized successfully.');
    } catch (e) {
        error('Failed to initialize Supabase client:', e.message, e);
        alert(`ข้อผิดพลาดร้ายแรง: ไม่สามารถสร้าง Supabase Client ได้. ${e.message}. โปรดตรวจสอบ Console และไฟล์ index.html.`);
        return; // Stop execution if client cannot be initialized
    }

    // 2. Get DOM Element References
    todoTitleInput = document.getElementById('todoTitleInput');
    subjectSelect = document.getElementById('subjectSelect');
    addTodoButton = document.getElementById('addTodoButton');
    todoList = document.getElementById('todoList');
    initialMessage = document.getElementById('initialMessage');
    subjectFilterButtons = document.getElementById('subjectFilterButtons');

    // New: Get Menu and View References
    hamburgerMenu = document.getElementById('hamburgerMenu');
    sideNav = document.getElementById('sideNav');
    closeNav = document.getElementById('closeNav');
    overlay = document.getElementById('overlay');
    showAddTodoViewLink = document.getElementById('showAddTodoView');
    showViewTasksViewLink = document.getElementById('showViewTasksView');
    addTodoView = document.getElementById('addTodoView');
    viewTasksBySubjectView = document.getElementById('viewTasksBySubjectView');
    tasksBySubjectContainer = document.getElementById('tasksBySubjectContainer');

    // Validate if critical DOM elements are found (including new ones)
    if (!todoTitleInput || !subjectSelect || !addTodoButton || !todoList || !initialMessage || !subjectFilterButtons ||
        !hamburgerMenu || !sideNav || !closeNav || !overlay || !showAddTodoViewLink || !showViewTasksViewLink ||
        !addTodoView || !viewTasksBySubjectView || !tasksBySubjectContainer) {
        error('One or more critical DOM elements not found. Check your index.html IDs.');
        alert('เกิดข้อผิดพลาด: ไม่พบส่วนประกอบสำคัญของหน้าเว็บ. โปรดตรวจสอบ ID ใน HTML.');
        return; // Stop execution if elements are missing
    }
    log('All critical DOM elements referenced successfully.');

    // 3. Attach Event Listeners
    addTodoButton.addEventListener('click', addTodo);
    log('Add Todo button event listener attached.');

    subjectFilterButtons.addEventListener('click', handleSubjectFilterClick);
    log('Subject filter buttons event listener attached.');

    // New: Menu Event Listeners
    hamburgerMenu.addEventListener('click', openNav);
    closeNav.addEventListener('click', closeNav);
    overlay.addEventListener('click', closeNav); // Close menu when clicking outside

    // New: View Navigation Event Listeners
    showAddTodoViewLink.addEventListener('click', (event) => {
        event.preventDefault(); // Prevent default link behavior
        showView(addTodoView);
        fetchTodos(); // Refresh todos for this view
    });
    showViewTasksViewLink.addEventListener('click', (event) => {
        event.preventDefault(); // Prevent default link behavior
        showView(viewTasksBySubjectView);
        fetchAndRenderTasksBySubject(); // Fetch and render for the grouped view
    });

    // 4. Initial Load of Todos (show the add todo view by default)
    showView(addTodoView); // Ensure the correct view is shown initially
    fetchTodos();
});

log('Script finished parsing.');
