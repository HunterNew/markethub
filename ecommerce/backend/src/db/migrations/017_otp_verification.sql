CREATE TABLE IF NOT EXISTS otp_codes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NULL,
  code VARCHAR(6) NOT NULL,
  type ENUM('email', 'sms') DEFAULT 'email',
  purpose ENUM('registration', 'login') DEFAULT 'registration',
  expires_at DATETIME NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email_code (email, code),
  INDEX idx_phone_code (phone, code)
);
