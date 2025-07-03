// Supabase Client Initialization (ใช้คีย์ที่คุณให้มา)
const SUPABASE_URL = 'https://xoscoszdlzchwyisvxbp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhvc2Nvc3pkbHpjaHd5aXN2eGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1NDIwNzIsImV4cCI6MjA2NzExODA3Mn0.nZhld0oB8vmwvLzwhxhISuD6D-inHP7UVKhYzDfr6KY';

const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('Supabase Client เริ่มต้นใช้งานแล้ว.');
console.log('Supabase URL:', SUPABASE_URL);
console.log('Supabase Anon Key:', SUPABASE_ANON_KEY ? 'โหลดคีย์แล้ว' : 'คีย์หายไป!'); // ไม่บันทึกคีย์ทั้งหมดเพื่อความปลอดภัย

// ส่วนประกอบ DOM
const subjectSelect = document.getElementById('subjectSelect');
const taskInput = document.getElementById('taskInput');
const addTaskButton = document.getElementById('addTaskButton');
const taskList = document.getElementById('taskList');

console.log('โหลดส่วนประกอบ DOM แล้ว:', { subjectSelect, taskInput, addTaskButton, taskList });

// --- ฟังก์ชันต่างๆ ---

// ฟังก์ชันสำหรับดึงงานจาก Supabase
async function fetchTasks() {
    console.log('กำลังพยายามดึงงาน...');
    const { data, error } = await _supabase
        .from('tasks') // ตรวจสอบให้แน่ใจว่าชื่อตาราง 'tasks' ตรงกันใน Supabase เป๊ะๆ
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('เกิดข้อผิดพลาดในการดึงงาน:', error.message);
        alert(`เกิดข้อผิดพลาดในการดึงข้อมูล: ${error.message}. กรุณาตรวจสอบ Console.`);
        return;
    }
    console.log('ดึงงานสำเร็จแล้ว:', data);
    renderTasks(data);
}

// ฟังก์ชันสำหรับแสดงงานใน UI
function renderTasks(tasks) {
    console.log('กำลังแสดงผลงาน:', tasks);
    if (!tasks || tasks.length === 0) {
        taskList.innerHTML = '<p class="no-tasks-message">ยังไม่มีงานในรายการ เพิ่มงานใหม่ได้เลย!</p>';
        console.log('ไม่มีงานให้แสดง, แสดงข้อความเปล่า.');
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
        console.log(`เพิ่มงานใน UI แล้ว: ${task.description} (${task.subject})`);
    });
}

// ฟังก์ชันสำหรับเพิ่มงานใหม่
async function addTask() {
    const subject = subjectSelect.value;
    const description = taskInput.value.trim();

    console.log('กำลังพยายามเพิ่มงาน:', { subject, description });

    if (!subject || !description) {
        alert('กรุณาเลือกวิชาและใส่ชื่องาน');
        console.warn('การเพิ่มงานล้มเหลว: ไม่ได้เลือกวิชาหรือไม่ได้ใส่รายละเอียดงาน');
        return;
    }

    // เพิ่มตัวแสดงสถานะกำลังโหลด (ไม่บังคับ แต่ดีต่อ UX)
    addTaskButton.disabled = true;
    addTaskButton.textContent = 'กำลังเพิ่ม...';

    const { data, error } = await _supabase
        .from('tasks')
        .insert([{ subject: subject, description: description, is_complete: false }]);

    addTaskButton.disabled = false;
    addTaskButton.textContent = 'เพิ่มงาน';

    if (error) {
        console.error('เกิดข้อผิดพลาดในการเพิ่มงาน:', error.message);
        alert(`เกิดข้อผิดพลาดในการเพิ่มงาน: ${error.message}. กรุณาตรวจสอบ Console.`);
        return;
    }

    console.log('เพิ่มงานใน Supabase สำเร็จแล้ว:', data);
    taskInput.value = ''; // ล้างช่องใส่ข้อมูล
    subjectSelect.value = ''; // รีเซ็ตการเลือกวิชา
    fetchTasks(); // ดึงงานและแสดงผลใหม่ เพื่อให้เห็นงานที่เพิ่มเข้ามา
}

// ฟังก์ชันสำหรับสลับสถานะการทำเครื่องหมายว่างานเสร็จสิ้น
async function toggleTaskComplete(event) {
    const taskItem = event.target.closest('.task-item');
    const taskId = taskItem.dataset.id;
    const isComplete = event.target.checked;

    console.log('กำลังพยายามสลับสถานะการเสร็จสิ้นของงาน:', { taskId, isComplete });

    const { error } = await _supabase
        .from('tasks')
        .update({ is_complete: isComplete })
        .eq('id', taskId);

    if (error) {
        console.error('เกิดข้อผิดพลาดในการอัปเดตสถานะงาน:', error.message);
        alert(`เกิดข้อผิดพลาดในการอัปเดตสถานะงาน: ${error.message}. กรุณาตรวจสอบ Console.`);
        // คืนค่า checkbox ถ้าการอัปเดตล้มเหลว
        event.target.checked = !isComplete;
        return;
    }
    console.log('อัปเดตสถานะงานสำเร็จแล้ว:', { taskId, isComplete });
    taskItem.classList.toggle('completed', isComplete); // สลับ class CSS
}

// ฟังก์ชันสำหรับลบงาน
async function deleteTask(event) {
    const taskItem = event.target.closest('.task-item');
    const taskId = taskItem.dataset.id;

    console.log('กำลังพยายามลบงาน:', taskId);

    if (!confirm('คุณแน่ใจหรือไม่ที่ต้องการลบงานนี้?')) {
        console.log('ผู้ใช้ยกเลิกการลบ.');
        return;
    }

    const { error } = await _supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

    if (error) {
        console.error('เกิดข้อผิดพลาดในการลบงาน:', error.message);
        alert(`เกิดข้อผิดพลาดในการลบงาน: ${error.message}. กรุณาตรวจสอบ Console.`);
        return;
    }
    console.log('ลบงานสำเร็จแล้ว:', taskId);
    taskItem.remove(); // ลบออกจาก UI
}

// --- Event Listener ต่างๆ ---
addTaskButton.addEventListener('click', addTask);
console.log('ผูก Event Listener สำหรับปุ่มเพิ่มงานแล้ว.');

// โหลดงานเริ่มต้นเมื่อหน้าเว็บโหลดเสร็จ
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM โหลดสมบูรณ์แล้ว. กำลังเริ่มต้น fetchTasks...');
    fetchTasks();
});

// เพิ่ม CSS สำหรับข้อความเมื่อไม่มีงาน (เพิ่มใน style.css ของคุณ)
// .no-tasks-message {
//     text-align: center;
//     color: #888;
//     margin-top: 20px;
//     font-style: italic;
// }
