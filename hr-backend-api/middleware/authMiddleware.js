const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    // 1. ดึง Token จาก Header
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'ปฏิเสธการเข้าถึง: ไม่พบ Token หรือรูปแบบไม่ถูกต้อง' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const secretKey = process.env.JWT_SECRET || 'super_secret_key_for_hr_system_2026';
        const decoded = jwt.verify(token, secretKey);
        
        req.user = decoded; // เอาข้อมูลไปแปะไว้ให้ roleMiddleware ใช้ต่อ
        next();
    } catch (error) {
        console.error('Token Verification Error:', error.message);
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token หมดอายุ กรุณาเข้าสู่ระบบใหม่' });
        }
        return res.status(403).json({ message: 'Token ไม่ถูกต้อง' });
    }
};

module.exports = authMiddleware;