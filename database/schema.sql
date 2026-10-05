CREATE DATABASE IF NOT EXISTS taller_control CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE taller_control;

CREATE TABLE users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('ADMIN', 'GERENTE', 'RECEPCION', 'TECNICO', 'ALMACEN') NOT NULL DEFAULT 'TECNICO',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE password_resets (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_reset_token (token_hash), INDEX idx_reset_expiry (expires_at)
) ENGINE=InnoDB;

CREATE TABLE audit_log (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NULL,
  entity_id BIGINT UNSIGNED NULL,
  ip_address VARCHAR(45) NULL,
  metadata JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_audit_created (created_at), INDEX idx_audit_entity (entity_type, entity_id)
) ENGINE=InnoDB;

CREATE TABLE clients (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  alternate_contact VARCHAR(150) NOT NULL,
  age TINYINT UNSIGNED NOT NULL,
  birth_date DATE NOT NULL,
  personal_phone VARCHAR(25) NOT NULL,
  work_phone VARCHAR(25) NOT NULL,
  personal_email VARCHAR(254) NOT NULL,
  work_email VARCHAR(254) NULL,
  photo_data MEDIUMBLOB NOT NULL,
  photo_mime VARCHAR(100) NOT NULL,
  street VARCHAR(150) NOT NULL,
  neighborhood VARCHAR(100) NOT NULL,
  municipality VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  postal_code CHAR(5) NOT NULL,
  identity_key CHAR(64) NOT NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_clients_personal_email UNIQUE (personal_email),
  CONSTRAINT uq_clients_personal_phone UNIQUE (personal_phone),
  CONSTRAINT uq_clients_identity UNIQUE (identity_key),
  CONSTRAINT fk_clients_creator FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_clients_name (full_name),
  INDEX idx_clients_birth_date (birth_date)
) ENGINE=InnoDB;
