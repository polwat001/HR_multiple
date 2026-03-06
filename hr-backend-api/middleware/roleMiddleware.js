// ฟังก์ชันนี้รับพารามิเตอร์เป็น Array ของรายชื่อ Role ที่อนุญาต
const roleMiddleware = (allowedRoles) => {
    return (req, res, next) => {
        // 1. ดึงข้อมูล user จาก req (เซ็ตไว้โดย authMiddleware)
        const user = req.user;

        if (!user) {
            return res.status(401).json({ message: 'ไม่พบข้อมูลผู้ใช้งาน กรุณายืนยันตัวตนก่อน' });
        }

        // 2. ตรวจสอบว่า Role ของ User อยู่ในสิทธิ์ที่อนุญาตหรือไม่
        if (!allowedRoles.includes(user.role_name)) {
            return res.status(403).json({ 
                message: `ปฏิเสธการเข้าถึง: สิทธิ์ '${user.role_name}' ของคุณไม่สามารถใช้งานฟังก์ชันนี้ได้` 
            });
        }

        // 3. ถ้าสิทธิ์ผ่าน ให้ไปต่อได้เลย
        next();
    };
};

module.exports = roleMiddleware;