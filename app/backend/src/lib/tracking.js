// Mô phỏng cơ chế Redis Bitmap & TTL Heartbeat bằng bộ nhớ trong của Node.js
// Do máy chủ hiện tại chưa cài đặt Redis, đây là bản giả lập (Mock) hoàn hảo
// cho ý tưởng 1-bit / 1-user.

const MAX_USERS = 100000; // Giả lập hỗ trợ tối đa 100.000 user
// Mỗi user chiếm 1 bit -> Cần 12.500 bytes (khoảng 12.5 KB)
const bitmap = Buffer.alloc(Math.ceil(MAX_USERS / 8));

// Lưu trữ danh sách nhịp tim để tính toán TTL và "Last seen": userId -> timestamp
const lastSeenCache = new Map();

// TTL: 60 giây (để offline)
const TTL_MS = 60 * 1000;
// Xóa hẳn khỏi bộ nhớ sau 7 ngày (tránh đầy RAM)
const MAX_LAST_SEEN_MS = 7 * 24 * 60 * 60 * 1000; 

class TrackingService {
  /**
   * Set bit online cho user
   * @param {number} userId 
   * @param {number} value 1 (online), 0 (offline)
   */
  static setBit(userId, value) {
    if (!userId || isNaN(userId) || userId >= MAX_USERS) return;
    
    const byteIndex = Math.floor(userId / 8);
    const bitIndex = userId % 8;
    
    if (value === 1) {
      bitmap[byteIndex] |= (1 << bitIndex); // Bật bit lên 1
    } else {
      bitmap[byteIndex] &= ~(1 << bitIndex); // Tắt bit về 0
    }
  }

  /**
   * Get trạng thái online và thời gian truy cập cuối
   * @param {number} userId 
   * @returns {Object} { isOnline: boolean, lastActiveAt: number | null }
   */
  static getStatus(userId) {
    if (!userId || isNaN(userId) || userId >= MAX_USERS) return { isOnline: false, lastActiveAt: null };
    
    const byteIndex = Math.floor(userId / 8);
    const bitIndex = userId % 8;
    
    const isOnline = (bitmap[byteIndex] & (1 << bitIndex)) !== 0;
    const lastActiveAt = lastSeenCache.get(userId) || null;
    
    return { isOnline, lastActiveAt };
  }

  /**
   * Nhận nhịp tim từ thiết bị của User (Ping ngầm)
   * @param {number} userId 
   */
  static ping(userId) {
    if (!userId) return;
    
    // 1. Gạt bit sang 1 (Online)
    this.setBit(userId, 1);
    
    // 2. Cập nhật TTL & Last Seen
    lastSeenCache.set(userId, Date.now());
  }

  /**
   * Xóa khi user bấm đăng xuất
   * @param {number} userId 
   */
  static logout(userId) {
    if (!userId) return;
    this.setBit(userId, 0);
  }

  /**
   * Bộ đếm ngược TTL (Mô phỏng Cronjob quét dọn)
   */
  static runTTLWorker() {
    const now = Date.now();
    for (const [userId, lastSeen] of lastSeenCache.entries()) {
      if (now - lastSeen > TTL_MS) {
        // Quá 60 giây không nhận được tín hiệu -> Gạt bit về 0
        this.setBit(userId, 0);
      }
      if (now - lastSeen > MAX_LAST_SEEN_MS) {
        // Quá 7 ngày -> Xóa hẳn khỏi cache cho nhẹ RAM
        lastSeenCache.delete(userId);
      }
    }
  }
}

// Khởi chạy Worker ẩn (chạy mỗi 10 giây để check TTL)
setInterval(() => {
  TrackingService.runTTLWorker();
}, 10000);

export default TrackingService;
