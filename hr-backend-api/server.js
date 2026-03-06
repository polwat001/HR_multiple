const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// ==========================================
// 📦 นำเข้า Routes (Import)
// ==========================================
const authRoutes = require('./routes/authRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const orgRoutes = require('./routes/orgRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const reportRoutes = require('./routes/reportRoutes');
const userRoutes = require('./routes/userRoutes');
const contractRoutes = require('./routes/contractRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');

// หมายเหตุ: ถ้าคุณแยกไฟล์ companyRoutes.js และ shiftRoutes.js จริงๆ 
// ให้เอาคอมเมนต์ 2 บรรทัดด้านล่างนี้ออกนะครับ แต่ถ้าทำตามสเต็ปที่ผมแนะนำไปก่อนหน้า ไม่ต้องเอาออกครับ
// const companyRoutes = require('./routes/companyRoutes');
// const shiftRoutes = require('./routes/shiftRoutes');

// ==========================================
// Middleware
app.use(cors());
app.use(express.json());

// เช็คสถานะ Server เบื้องต้น
app.get('/', (req, res) => {
  res.send('HR Group System API is running...');
});

// ==========================================
// 📍 รวบรวม Routes (API Endpoints) ทั้งหมด
// ==========================================

// 🟢 โมดูลที่สร้างเสร็จแล้ว (เปิดใช้งานแล้ว)
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/organization', orgRoutes); // 👈 (รวม companies ไว้ในนี้แล้ว)
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/schedules', scheduleRoutes); // 👈 (รวม shifts ไว้ในนี้แล้ว)

// ถ้าคุณสร้างแยกไฟล์จริงๆ ค่อยเอาคอมเมนต์ด้านล่างนี้ออกนะครับ
// app.use('/api/companies', companyRoutes);
// app.use('/api/shifts', shiftRoutes);

// ==========================================

// เริ่มเปิด Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});