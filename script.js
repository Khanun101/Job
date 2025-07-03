// Supabase Client Initialization (replace with your actual Supabase details)
// You'll get these from your Supabase project settings -> API
const SUPABASE_URL = 'https://xoscoszdlzchwyisvxbp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhvc2Nvc3pkbHpjaHd5aXN2eGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1NDIwNzIsImV4cCI6MjA2NzExODA3Mn0.nZhld0oB8vmwvLzwhxhISuD6D-inHP7UVKhYzDfr6KY';

const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM Elements
const subjectSelect = document.getElementById('subjectSelect');
const taskInput = document.getElementById('taskInput');
const addTaskButton = document.getElementById('addTaskButton');
const taskList = document.getElementById('taskList');

// --- Functions ---

// Function to fetch tasks from Supabase
async function fetchTasks() {
    const { data, error } = await _supabase
        .from('tasks') // Your table name in Supabase
        .select('*')
        .order('created_at', { ascending: false }); // Order by creation date

    if (error) {
        console.error('Error fetching tasks:', error.message);
        return;
    }
    renderTasks(data);
}

// Function to render tasks to the UI
function renderTasks(tasks) {
    taskList.innerHTML = ''; // Clear current tasks
    tasks.forEach(task => {
        const taskItem = document.createElement('div');
        taskItem.className = `task-item ${task.is_complete ? 'completed' : ''}`;
        taskItem.dataset.id = task.id; // Store Supabase task ID

        taskItem.innerHTML = `
            <div class="task-content">
                <input type="checkbox" ${task.is_complete ? 'checked' : ''}>
                <div class="task-details">
                    <span class="task-text">${task.description}</span>
                    <span class="task-subject">${task.subject}</span>
                </div>
            </div>
            <button class="delete-button">ลบ</button>
        `;

        // Add event listeners for checkbox and delete button
        taskItem.querySelector('input[type="checkbox"]').addEventListener('change', toggleTaskComplete);
        taskItem.querySelector('.delete-button').addEventListener('click', deleteTask);

        taskList.appendChild(taskItem);
    });
}

// Function to add a new task
async function addTask() {
    const subject = subjectSelect.value;
    const description = taskInput.value.trim();

    if (!subject || !description) {
        alert('กรุณาเลือกวิชาและใส่ชื่องาน');
        return;
    }

    const { data, error } = await _supabase
        .from('tasks')
        .insert([{ subject: subject, description: description, is_complete: false }]);

    if (error) {
        console.error('Error adding task:', error.message);
        return;
    }

    taskInput.value = ''; // Clear input field
    subjectSelect.value = ''; // Reset subject selection
    fetchTasks(); // Re-fetch and re-render tasks
}

// Function to toggle task completion status
async function toggleTaskComplete(event) {
    const taskItem = event.target.closest('.task-item');
    const taskId = taskItem.dataset.id;
    const isComplete = event.target.checked;

    const { error } = await _supabase
        .from('tasks')
        .update({ is_complete: isComplete })
        .eq('id', taskId);

    if (error) {
        console.error('Error updating task status:', error.message);
        return;
    }
    taskItem.classList.toggle('completed', isComplete); // Toggle CSS class
    // fetchTasks(); // Can re-fetch or just update local class
}

// Function to delete a task
async function deleteTask(event) {
    const taskItem = event.target.closest('.task-item');
    const taskId = taskItem.dataset.id;

    if (!confirm('คุณแน่ใจหรือไม่ที่ต้องการลบงานนี้?')) {
        return;
    }

    const { error } = await _supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

    if (error) {
        console.error('Error deleting task:', error.message);
        return;
    }
    taskItem.remove(); // Remove from UI
    // fetchTasks(); // Can re-fetch or just remove from local DOM
}

// --- Event Listeners ---
addTaskButton.addEventListener('click', addTask);

// Initial load of tasks when the page loads
document.addEventListener('DOMContentLoaded', fetchTasks);
