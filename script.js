// Supabase Client Initialization (ใช้คีย์ที่คุณให้มา)
const SUPABASE_URL = 'https://xoscoszdlzchwyisvxbp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhvc2Nvc3pkbHpjaHd5aXN2eGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1NDIwNzIsImV4cCI6MjA2NzExODA3Mn0.nZhld0oB8vmwvLzwhxhISuD6D-inHP7UVKhYzDfr6KY';

let _supabase; // ประกาศตัวแปรนี้ไว้ข้างนอก แต่จะกำหนดค่าใน DOMContentLoaded

console.log('--- Script Start ---');

// --- ฟังก์ชันต่างๆ ---

// ฟังก์ชันสำหรับดึงงานจาก Supabase
async function fetchTasks() {
    console.log('Function: fetchTasks - กำลังพยายามดึงงาน...');
    try {
        const { data, error } = await _supabase
            .from('tasks') // ตรวจสอบให้แน่ใจว่าชื่อตาราง 'tasks' ตรงกันใน Supabase เป๊ะๆ
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error in fetchTasks:', error.message);
            alert(`เกิดข้อผิดพลาดในการดึงข้อมูล: ${error.message}. โปรดตรวจสอบ Console.`);
            return;
        }
        console.log('Function: fetchTasks - ดึงงานสำเร็จแล้ว:', data);
        renderTasks(data);
    } catch (e) {
        console.error('Critical Error in fetchTasks (try/catch):', e.message, e);
        alert(`เกิดข้อผิดพลาดร้ายแรงในการดึงข้อมูล: ${e.message}. โปรดดู Console.`);
    }
}

// ฟังก์ชันสำหรับแสดงงานใน UI
function renderTasks(tasks) {
    console.log('Function: renderTasks - กำลังแสดงผลงาน:', tasks);
    const taskList = document.getElementById('taskList'); // ดึง element มาใน function เพื่อความแน่ใจ
    if (!taskList) {
        console.error('Error: taskList element not found during renderTasks.');
        return;
    }

    if (!tasks || tasks.length === 0) {
        taskList.innerHTML = '<p class="no-tasks-message">ยังไม่มีงานในรายการ เพิ่มงานใหม่ได้เลย!</p>';
        console.log('Function: renderTasks - ไม่มีงานให้แสดง, แสดงข้อความเปล่า.');
        return;
    }
    taskList.innerHTML = ''; // ลบงานปัจจุบันทั้งหมด
    tasks.forEach(task => {
        const taskItem = document.createElement('div');
        taskItem.className = `task-item ${task.is_complete ? 'completed' : ''}`;
        taskItem.dataset.id = task.id; // เก็บ ID งานจาก Supabase

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

        // เพิ่ม event listener สำหรับ checkbox และปุ่มลบ
        taskItem.querySelector('input[type="checkbox"]').addEventListener('change', toggleTaskComplete);
        taskItem.querySelector('.delete-button').addEventListener('click', deleteTask);

        taskList.appendChild(taskItem);
        console.log(`Function: renderTasks - เพิ่มงานใน UI แล้ว: ${task.description} (${task.subject})`);
    });
}

// ฟังก์ชันสำหรับเพิ่มงานใหม่
async function addTask() {
    const subjectSelect = document.getElementById('subjectSelect');
    const taskInput = document.getElementById('taskInput');
    const addTaskButton = document.getElementById('addTaskButton');

    if (!subjectSelect || !taskInput || !addTaskButton) {
        console.error('Error: One or more input elements not found during addTask.');
        alert('เกิดข้อผิดพลาด: ไม่พบส่วนประกอบสำหรับเพิ่มงาน');
        return;
    }

    const subject = subjectSelect.value;
    const description = taskInput.value.trim();

    console.log('Function: addTask - กำลังพยายามเพิ่มงาน:', { subject, description });

    if (!subject || !description) {
        alert('กรุณาเลือกวิชาและใส่ชื่องาน');
        console.warn('Function: addTask - การเพิ่มงานล้มเหลว: ไม่ได้เลือกวิชาหรือไม่ได้ใส่รายละเอียดงาน');
        return;
    }

    // เพิ่มตัวแสดงสถานะกำลังโหลด
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
        // ไม่ว่าจะสำเร็จหรือล้มเหลว ก็คืนค่าปุ่ม
        addTaskButton.disabled = false;
        addTaskButton.textContent = 'เพิ่มงาน';
    }
}

// ฟังก์ชันสำหรับสลับสถานะการทำเครื่องหมายว่างานเสร็จสิ้น
async function toggleTaskComplete(event) {
    const taskItem = event.target.closest('.task-item');
    const taskId = taskItem.dataset.id;
    const isComplete = event.target.checked;

    console.log('Function: toggleTaskComplete - กำลังพยายามสลับสถานะการเสร็จสิ้นของงาน:', { taskId, isComplete });

    try {
        const { error } = await _supabase
            .from('tasks')
            .update({ is_complete: isComplete })
            .eq('id', taskId);

        if (error) {
            console.error('Error in toggleTaskComplete:', error.message);
            alert(`เกิดข้อผิดพลาดในการอัปเดตสถานะงาน: ${error.message}. โปรดตรวจสอบ Console.`);
            // คืนค่า checkbox ถ้าการอัปเดตล้มเหลว
            event.target.checked = !isComplete;
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

// ฟังก์ชันสำหรับลบงาน
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
            .eq('id', taskId);

        if (error) {
            console.error('Error in deleteTask:', error.message);
            alert(`เกิดข้อผิดพลาดในการลบงาน: ${error.message}. โปรดตรวจสอบ Console.`);
            return;
        }
        console.log('Function: deleteTask - ลบงานสำเร็จแล้ว:', taskId);
        taskItem.remove(); // ลบออกจาก UI
    } catch (e) {
        console.error('Critical Error in deleteTask (try/catch):', e.message, e);
        alert(`เกิดข้อผิดพลาดร้ายแรงในการลบงาน: ${e.message}. โปรดดู Console.`);
    }
}

// --- Event Listener หลัก (ผูกใน DOMContentLoaded เพื่อความแน่ใจว่า Elements พร้อมแล้ว) ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded. Initializing Supabase client and Event Listeners...');

    // ตรวจสอบว่า Supabase client ถูกสร้างขึ้นอย่างถูกต้อง
    try {
        _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase client created successfully within DOMContentLoaded.');
    } catch (e) {
        console.error('Error creating Supabase client:', e.message, e);
        alert(`ไม่สามารถสร้าง Supabase Client ได้: ${e.message}. โปรดตรวจสอบ URL/Key ใน script.js.`);
        return; // หยุดการทำงานถ้า Supabase client สร้างไม่ได้
    }

    const addTaskButton = document.getElementById('addTaskButton');
    if (addTaskButton) {
        addTaskButton.addEventListener('click', addTask);
        console.log('Event Listener: Add Task button event listener attached.');
    } else {
        console.error('Error: addTaskButton not found. Cannot attach event listener.');
        alert('ปุ่ม "เพิ่มงาน" ไม่พบ! ตรวจสอบ id ใน HTML.');
    }

    // เรียกดึงงานครั้งแรก
    fetchTasks();
});

console.log('--- Script End ---');

// อย่าลืมเพิ่ม CSS นี้ใน style.css หากยังไม่มี
// .no-tasks-message {
//     text-align: center;
//     color: #888;
//     margin-top: 20px;
//     padding: 20px;
//     border: 1px dashed #ccc;
//     border-radius: 8px;
//     background-color: #fcfcfc;
//     font-style: italic;
// }
