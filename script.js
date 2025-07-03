// Supabase Client Configuration
// *** IMPORTANT: Replace with your actual Supabase Project URL and Anon Key ***
const SUPABASE_URL = 'https://xoscoszdlzchwyisvxbp.supabase.co'; // Your Project URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhvc2Nvc3pkbHpjaHd5aXN2eGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1NDIwNzIsImV4cCI6MjA2NzExODA3Mn0.nZhld0oB8vmwvLzwhxhISuD6D-inHP7UVKhYzDfr6KY'; // Your Anon Public Key

let supabaseClient = null; // Will be initialized on DOMContentLoaded

// Global DOM Element References (will be set on DOMContentLoaded)
let todoTitleInput, todoCategorySelect, addTodoButton, todoList, initialMessage;

// --- Utility Functions for Console Logging ---
const log = (message, ...args) => console.log(`[APP LOG]: ${message}`, ...args);
const warn = (message, ...args) => console.warn(`[APP WARN]: ${message}`, ...args);
const error = (message, ...args) => console.error(`[APP ERROR]: ${message}`, ...args);

// --- Core Application Functions ---

/**
 * Fetches all todos from Supabase and renders them to the UI.
 */
async function fetchTodos() {
    log('Attempting to fetch todos...');
    initialMessage.textContent = 'กำลังโหลดรายการ...';
    initialMessage.className = 'initial-message'; // Reset message class

    try {
        const { data, error: dbError } = await supabaseClient
            .from('todos') // Make sure your table name is 'todos'
            .select('*')
            .order('created_at', { ascending: false });

        if (dbError) {
            error('Error fetching todos:', dbError.message);
            initialMessage.textContent = `เกิดข้อผิดพลาดในการดึงข้อมูล: ${dbError.message}`;
            initialMessage.className = 'error-message';
            todoList.innerHTML = ''; // Clear any existing items
            return;
        }

        log('Todos fetched successfully:', data);
        renderTodos(data);
    } catch (e) {
        error('Critical error in fetchTodos (try/catch):', e.message, e);
        initialMessage.textContent = `เกิดข้อผิดพลาดร้ายแรง: ${e.message}`;
        initialMessage.className = 'error-message';
        todoList.innerHTML = ''; // Clear any existing items
    }
}

/**
 * Renders an array of todo items to the UI.
 * @param {Array<Object>} todos - An array of todo objects from Supabase.
 */
function renderTodos(todos) {
    log('Rendering todos:', todos);

    // Ensure todoList element exists
    if (!todoList) {
        error('todoList element not found during renderTodos.');
        return;
    }

    todoList.innerHTML = ''; // Clear current list

    if (!todos || todos.length === 0) {
        initialMessage.textContent = 'ยังไม่มีสิ่งที่ต้องทำ เพิ่มใหม่ได้เลย!';
        initialMessage.className = 'no-todos-message';
        todoList.appendChild(initialMessage); // Show the message
        log('No todos to display.');
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
                <span class="todo-category">${todo.category}</span>
            </div>
            <button class="delete-button">ลบ</button>
        `;

        // Add event listeners for the new elements
        todoItem.querySelector('.todo-checkbox').addEventListener('change', toggleTodoStatus);
        todoItem.querySelector('.delete-button').addEventListener('click', deleteTodo);

        todoList.appendChild(todoItem);
        log(`Todo item "${todo.title}" (ID: ${todo.id}) added to UI.`);
    });
}

/**
 * Adds a new todo item to Supabase.
 */
async function addTodo() {
    const title = todoTitleInput.value.trim();
    const category = todoCategorySelect.value;

    log('Attempting to add todo:', { title, category });

    if (!title) {
        alert('กรุณาใส่สิ่งที่ต้องทำ');
        warn('Add todo failed: Missing title.');
        return;
    }
    if (!category) {
        alert('กรุณาเลือกหมวดหมู่');
        warn('Add todo failed: Missing category.');
        return;
    }

    addTodoButton.disabled = true;
    addTodoButton.textContent = 'กำลังเพิ่ม...';

    try {
        const { data, error: dbError } = await supabaseClient
            .from('todos')
            .insert([{ title: title, category: category, is_done: false }]);

        if (dbError) {
            error('Error adding todo to Supabase:', dbError.message);
            alert(`เกิดข้อผิดพลาดในการเพิ่มสิ่งที่ต้องทำ: ${dbError.message}`);
            return;
        }

        log('Todo added successfully:', data);
        todoTitleInput.value = ''; // Clear input
        todoCategorySelect.value = ''; // Reset select
        fetchTodos(); // Refresh the list
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
async function deleteTodo(event) {
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
            initialMessage.textContent = 'ยังไม่มีสิ่งที่ต้องทำ เพิ่มใหม่ได้เลย!';
            initialMessage.className = 'no-todos-message';
            todoList.appendChild(initialMessage);
        }
    } catch (e) {
        error('Critical error in deleteTodo (try/catch):', e.message, e);
        alert(`เกิดข้อผิดพลาดร้ายแรงในการลบ: ${e.message}`);
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
    todoCategorySelect = document.getElementById('todoCategorySelect');
    addTodoButton = document.getElementById('addTodoButton');
    todoList = document.getElementById('todoList');
    initialMessage = document.getElementById('initialMessage');

    // Validate if critical DOM elements are found
    if (!todoTitleInput || !todoCategorySelect || !addTodoButton || !todoList || !initialMessage) {
        error('One or more critical DOM elements not found. Check your index.html IDs.');
        alert('เกิดข้อผิดพลาด: ไม่พบส่วนประกอบสำคัญของหน้าเว็บ. โปรดตรวจสอบ ID ใน HTML.');
        return; // Stop execution if elements are missing
    }
    log('All critical DOM elements referenced successfully.');

    // 3. Attach Event Listeners
    addTodoButton.addEventListener('click', addTodo);
    log('Add Todo button event listener attached.');

    // 4. Initial Load of Todos
    fetchTodos();
});

log('Script finished parsing.'); // This will show when the script file itself is parsed.
