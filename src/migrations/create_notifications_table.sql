-- Create notifications table for real-time notification system
CREATE TABLE IF NOT EXISTS notifications (
    id INT(11) NOT NULL AUTO_INCREMENT,
    recipient_type ENUM('admin', 'client') NOT NULL,
    recipient_id INT(11) NULL, -- NULL for broadcast messages
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
    priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
    is_read TINYINT(1) DEFAULT 0,
    read_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_recipient_type (recipient_type),
    INDEX idx_recipient_id (recipient_id),
    INDEX idx_type (type),
    INDEX idx_priority (priority),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

-- Add foreign key constraints if the referenced tables exist
-- Note: recipient_id can be NULL for broadcast messages, so we don't add FK constraints

-- Create additional indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread
ON notifications (recipient_id, recipient_type, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_broadcast
ON notifications (recipient_type, is_read, created_at DESC);
