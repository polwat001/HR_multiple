const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// เช็คสถานะ Server
app.get('/', (req, res) => {
  res.send('HR Group System API is running...');
});

// ==========================================
// 📍 รวบรวม Routes (API Endpoints) ทั้งหมด
// ==========================================

// 🟢 โมดูลที่สร้างเสร็จแล้ว (เปิดใช้งานแล้ว)
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/employees', require('./routes/employeeRoutes'));
app.use('/api/organization', require('./routes/orgRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/leaves', require('./routes/leaveRoutes'));
app.use('/api/contracts', require('./routes/contractRoutes'));
app.use('/api/schedules', require('./routes/scheduleRoutes'));
app.use('/api/shifts', require('./routes/shiftRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
// 🟡 โมดูลที่กำลังจะสร้าง (คอมเมนต์ไว้ก่อน)



// ==========================================
 
// เริ่มเปิด Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});