// Supabase Client Initialization (ใช้คีย์ที่คุณให้มา)
// **สำคัญมาก: แทนที่ YOUR_SUPABASE_URL และ YOUR_SUPABASE_ANON_KEY ด้วยคีย์จริงของคุณ**
const SUPABASE_URL = 'https://xoscoszdlzchwyisvxbp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhvc2Nvc3pkbHpjaHd5aXN2eGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1NDIwNzIsImV4cCI6MjA2NzExODA3Mn0.nZhld0oB8vmwvLzwhxhISuD6D-inHP7UVKhYzDfr6KY';

let _supabase = null; // จะกำหนดค่าเมื่อ DOM โหลดเสร็จ

console.log('--- Script Initializing ---'); // แสดงเมื่อ script เริ่มโหลด

// --- Global DOM Elements (จะถูกกำหนดค่าเมื่อ DOMContentLoaded) ---
let subjectSelect, taskInput, addTaskButton, taskList;

// --- Functions ---

/**
 * ฟังก์ชันสำหรับดึงงานทั้งหมดจาก Supabase และแสดงผล
 */
async function fetchTasks() {
    console.log('Function: fetchTasks - กำลังพยายามดึงงาน...');
    taskList.innerHTML = '<p class="loading-message">กำลังโหลดงาน...</p>'; // แสดงข้อความกำลังโหลด

    try {
        const { data, error } = await _supabase
            .from('tasks') // ตรวจสอบว่าชื่อตาราง 'tasks' ตรงกันใน Supabase เป๊ะๆ
            .select('*')
            .order('created_at', { ascending: false }); // เรียงลำดับตามเวลาสร้างใหม่สุดอยู่บน

        if (error) {
            console.error('Error in fetchTasks:', error.message);
            taskList.innerHTML = `<p class="no-tasks-message error-message">เกิดข้อผิดพลาดในการดึงข้อมูล: ${error.message}. โปรดตรวจสอบ Console.</p>`;
            return;
        }

        console.log('Function: fetchTasks - ดึงงานสำเร็จแล้ว:', data);
        renderTasks(data); // เรียกฟังก์ชันแสดงผล
    } catch (e) {
        console.error('Critical Error in fetchTasks (try/catch):', e.message, e);
        taskList.innerHTML = `<p class="no-tasks-message error-message">เกิดข้อผิดพลาดร้ายแรงในการดึงข้อมูล: ${e.message}. โปรดดู Console.</p>`;
    }
}

/**
 * ฟังก์ชันสำหรับแสดงรายการงานใน UI
 * @param {Array} tasks - อาร์เรย์ของอ็อบเจกต์งาน
 */
function renderTasks(tasks) {
    console.log('Function: renderTasks - กำลังแสดงผลงาน:', tasks);
    
    // ตรวจสอบว่า taskList element มีอยู่จริง
    if (!taskList) {
        console.error('Error: taskList element not found during renderTasks.');
        return;
    }

    if (!tasks || tasks.length === 0) {
        taskList.innerHTML = '<p class="no-tasks-message">ยังไม่มีงานในรายการ เพิ่มงานใหม่ได้เลย!</p>';
        console.log('Function: renderTasks - ไม่มีงานให้แสดง, แสดงข้อความเปล่า.');
        return;
    }

    taskList.innerHTML = ''; // ลบงานปัจจุบันทั้งหมดก่อนแสดงใหม่

    tasks.forEach(task => {
        const taskItem = document.createElement('div');
        taskItem.className = `task-item ${task.is_complete ? 'completed' : ''}`;
        taskItem.dataset.id = task.id; // เก็บ ID งานจาก Supabase เพื่อใช้ในการอัปเดต/ลบ

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

        // เพิ่ม Event Listener ให้กับ checkbox และปุ่มลบ
        // ใช้ Event delegation สำหรับ checkbox ที่ task-content เพื่อให้คลิกได้ง่ายขึ้น
        taskItem.querySelector('.task-content').addEventListener('click', (event) => {
            // ตรวจสอบว่าไม่ได้คลิกโดน checkbox โดยตรง (เพราะ checkbox มี listener ของตัวเอง)
            if (event.target.type !== 'checkbox') {
                const checkbox = taskItem.querySelector('input[type="checkbox"]');
                checkbox.checked = !checkbox.checked; // สลับสถานะ checkbox
                toggleTaskComplete({ target: checkbox }); // เรียกฟังก์ชัน toggleTaskComplete
            }
        });
        taskItem.querySelector('input[type="checkbox"]').addEventListener('change', toggleTaskComplete);
        taskItem.querySelector('.delete-button').addEventListener('click', deleteTask);

        taskList.appendChild(taskItem);
        console.log(`Function: renderTasks - เพิ่มงาน "${task.description}" (ID: ${task.id}) ใน UI แล้ว.`);
    });
}

/**
 * ฟังก์ชันสำหรับเพิ่มงานใหม่ใน Supabase
 */
async function addTask() {
    const subject = subjectSelect.value;
    const description = taskInput.value.trim();

    console.log('Function: addTask - กำลังพยายามเพิ่มงาน:', { subject, description });

    if (!subject) {
        alert('กรุณาเลือกวิชา');
        console.warn('Function: addTask - การเพิ่มงานล้มเหลว: ไม่ได้เลือกวิชา.');
        return;
    }
    if (!description) {
        alert('กรุณาใส่รายละเอียดงาน');
        console.warn('Function: addTask - การเพิ่มงานล้มเหลว: ไม่ได้ใส่รายละเอียดงาน.');
        return;
    }

    // เพิ่มตัวแสดงสถานะกำลังโหลดบนปุ่ม
    addTaskButton.disabled = true;
    addTaskButton.textContent = 'กำลังเพิ่ม...';

    try {
        const { data, error } = await _supabase
            .from('tasks')
            .insert([{ subject: subject, description: description, is_complete: false }]);

        if (error) {
            console.error('Error in addTask (Supabase insert):', error.message);
            alert(`เกิดข้อผิดพลาดในการเพิ่มงาน: ${error.message}. โปรดตรวจสอบ Console.`);
            return;
        }

        console.log('Function: addTask - เพิ่มงานใน Supabase สำเร็จแล้ว:', data);
        taskInput.value = ''; // ล้างช่องใส่ข้อมูล
        subjectSelect.value = ''; // รีเซ็ตการเลือกวิชา
        fetchTasks(); // ดึงงานและแสดงผลใหม่ เพื่อให้เห็นงานที่เพิ่มเข้ามา
    } catch (e) {
        console.error('Critical Error in addTask (try/catch):', e.message, e);
        alert(`เกิดข้อผิดพลาดร้ายแรงในการเพิ่มงาน: ${e.message}. โปรดดู Console.`);
    } finally {
        // ไม่ว่าจะสำเร็จหรือล้มเหลว ก็คืนค่าปุ่มกลับเป็นปกติ
        addTaskButton.disabled = false;
        addTaskButton.textContent = 'เพิ่มงาน';
    }
}

/**
 * ฟังก์ชันสำหรับสลับสถานะการทำเครื่องหมายว่างานเสร็จสิ้นใน Supabase
 * @param {Event} event - Event object จากการเปลี่ยนแปลง checkbox
 */
async function toggleTaskComplete(event) {
    const taskItem = event.target.closest('.task-item');
    const taskId = taskItem.dataset.id;
    const isComplete = event.target.checked;

    console.log('Function: toggleTaskComplete - กำลังพยายามสลับสถานะของงาน:', { taskId, isComplete });

    try {
        const { error } = await _supabase
            .from('tasks')
            .update({ is_complete: isComplete })
            .eq('id', taskId); // อัปเดตงานตาม ID

        if (error) {
            console.error('Error in toggleTaskComplete:', error.message);
            alert(`เกิดข้อผิดพลาดในการอัปเดตสถานะงาน: ${error.message}. โปรดตรวจสอบ Console.`);
            event.target.checked = !isComplete; // คืนค่า checkbox ถ้าอัปเดตไม่สำเร็จ
            return;
        }
        console.log('Function: toggleTaskComplete - อัปเดตสถานะงานสำเร็จแล้ว:', { taskId, isComplete });
        taskItem.classList.toggle('completed', isComplete); // สลับ class CSS
    } catch (e) {
        console.error('Critical Error in toggleTaskComplete (try/catch):', e.message, e);
        alert(`เกิดข้อผิดพลาดร้ายแรงในการอัปเดตสถานะ: ${e.message}. โปรดดู Console.`);
        event.target.checked = !isComplete; // คืนค่า checkbox หากเกิด error ร้ายแรง
    }
}

/**
 * ฟังก์ชันสำหรับลบงานจาก Supabase
 * @param {Event} event - Event object จากการคลิกปุ่มลบ
 */
async function deleteTask(event) {
    const taskItem = event.target.closest('.task-item');
    const taskId = taskItem.dataset.id;

    console.log('Function: deleteTask - กำลังพยายามลบงาน:', taskId);

    if (!confirm('คุณแน่ใจหรือไม่ที่ต้องการลบงานนี้?')) {
        console.log('Function: deleteTask - ผู้ใช้ยกเลิกการลบ.');
        return;
    }

    try {
        const { error } = await _supabase
            .from('tasks')
            .delete()
            .eq('id', taskId); // ลบงานตาม ID

        if (error) {
            console.error('Error in deleteTask:', error.message);
            alert(`เกิดข้อผิดพลาดในการลบงาน: ${error.message}. โปรดตรวจสอบ Console.`);
            return;
        }
        console.log('Function: deleteTask - ลบงานสำเร็จแล้ว:', taskId);
        taskItem.remove(); // ลบ Element ออกจาก UI ทันที
    } catch (e) {
        console.error('Critical Error in deleteTask (try/catch):', e.message, e);
        alert(`เกิดข้อผิดพลาดร้ายแรงในการลบงาน: ${e.message}. โปรดดู Console.`);
    }
}

// --- Event Listener หลัก: รอให้ DOM โหลดเสร็จก่อนทำงาน ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('Event: DOMContentLoaded - DOM โหลดสมบูรณ์แล้ว. กำลังเริ่มต้น...');

    // 1. Initialize Supabase client
    try {
        _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase client created successfully.');
    } catch (e) {
        console.error('Error creating Supabase client:', e.message, e);
        alert(`ไม่สามารถสร้าง Supabase Client ได้: ${e.message}. โปรดตรวจสอบ URL/Key ใน script.js.`);
        return; // หยุดการทำงานถ้า Supabase client สร้างไม่ได้
    }

    // 2. Get DOM Elements
    subjectSelect = document.getElementById('subjectSelect');
    taskInput = document.getElementById('taskInput');
    addTaskButton = document.getElementById('addTaskButton');
    taskList = document.getElementById('taskList'); // Make sure this is globally available or passed

    // Validate if elements are found
    if (!subjectSelect || !taskInput || !addTaskButton || !taskList) {
        console.error('Error: One or more critical DOM elements not found.');
        alert('เกิดข้อผิดพลาด: ไม่พบส่วนประกอบสำคัญของหน้าเว็บ. โปรดตรวจสอบ ID ใน HTML.');
        return; // หยุดการทำงานถ้าหา Element ไม่เจอ
    }
    console.log('DOM Elements successfully referenced.');

    // 3. Attach Event Listeners
    addTaskButton.addEventListener('click', addTask);
    console.log('Event Listener: Add Task button event listener attached.');

    // 4. Initial fetch of tasks
    fetchTasks();
});

console.log('--- Script End ---'); // แสดงเมื่อ script โหลดเสร็จ (แต่ DOMContentLoaded อาจยังไม่ทำงาน)
