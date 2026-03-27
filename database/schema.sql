-- FormSaaS MySQL Schema
-- Compatible with phpMyAdmin / MySQL 8.0+
-- Generated for production use

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- DATABASE
-- ============================================================
CREATE DATABASE IF NOT EXISTS forms_saas
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE forms_saas;

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id           CHAR(36)     NOT NULL,
  name         VARCHAR(100) NOT NULL,
  email        VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) DEFAULT NULL,
  google_id    VARCHAR(100) DEFAULT NULL,
  avatar       VARCHAR(500) DEFAULT NULL,
  role         ENUM('user','admin') NOT NULL DEFAULT 'user',
  is_verified  TINYINT(1)   NOT NULL DEFAULT 0,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_google_id (google_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- REFRESH TOKENS
-- ============================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         CHAR(36)     NOT NULL,
  user_id    CHAR(36)     NOT NULL,
  token      VARCHAR(512) NOT NULL,
  expires_at DATETIME     NOT NULL,
  revoked    TINYINT(1)   NOT NULL DEFAULT 0,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_refresh_tokens_token (token),
  KEY idx_refresh_tokens_user_id (user_id),
  KEY idx_refresh_tokens_expires_at (expires_at),
  CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- PASSWORD RESETS
-- ============================================================
CREATE TABLE IF NOT EXISTS password_resets (
  id         CHAR(36)     NOT NULL,
  user_id    CHAR(36)     NOT NULL,
  token      VARCHAR(128) NOT NULL,
  expires_at DATETIME     NOT NULL,
  used       TINYINT(1)   NOT NULL DEFAULT 0,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_password_resets_token (token),
  KEY idx_password_resets_user_id (user_id),
  CONSTRAINT fk_password_resets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- FOLDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS folders (
  id         CHAR(36)     NOT NULL,
  user_id    CHAR(36)     NOT NULL,
  name       VARCHAR(100) NOT NULL,
  color      VARCHAR(20)  NOT NULL DEFAULT '#3B82F6',
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_folders_user_id (user_id),
  CONSTRAINT fk_folders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- FORMS
-- ============================================================
CREATE TABLE IF NOT EXISTS forms (
  id             CHAR(36)     NOT NULL,
  user_id        CHAR(36)     NOT NULL,
  folder_id      CHAR(36)     DEFAULT NULL,
  title          VARCHAR(255) NOT NULL,
  description    TEXT         DEFAULT NULL,
  schema         JSON         NOT NULL,
  settings       JSON         NOT NULL DEFAULT (JSON_OBJECT()),
  theme          JSON         NOT NULL DEFAULT (JSON_OBJECT()),
  is_published   TINYINT(1)   NOT NULL DEFAULT 0,
  is_closed      TINYINT(1)   NOT NULL DEFAULT 0,
  slug           VARCHAR(100) NOT NULL,
  response_count INT          NOT NULL DEFAULT 0,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_forms_slug (slug),
  KEY idx_forms_user_id (user_id),
  KEY idx_forms_folder_id (folder_id),
  KEY idx_forms_is_published (is_published),
  KEY idx_forms_updated_at (updated_at),
  FULLTEXT KEY ft_forms_title (title),
  CONSTRAINT fk_forms_user   FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
  CONSTRAINT fk_forms_folder FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- RESPONSES
-- ============================================================
CREATE TABLE IF NOT EXISTS responses (
  id               CHAR(36)     NOT NULL,
  form_id          CHAR(36)     NOT NULL,
  respondent_email VARCHAR(255) DEFAULT NULL,
  answers          JSON         NOT NULL,
  ip_address       VARCHAR(45)  DEFAULT NULL,
  user_agent       VARCHAR(500) DEFAULT NULL,
  session_id       VARCHAR(100) DEFAULT NULL,
  submitted_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_responses_form_id (form_id),
  KEY idx_responses_respondent_email (respondent_email),
  KEY idx_responses_ip_address (ip_address),
  KEY idx_responses_submitted_at (submitted_at),
  CONSTRAINT fk_responses_form FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- PARTIAL RESPONSES (Auto-save)
-- ============================================================
CREATE TABLE IF NOT EXISTS partial_responses (
  id               CHAR(36)     NOT NULL,
  form_id          CHAR(36)     NOT NULL,
  session_id       VARCHAR(100) NOT NULL,
  answers          JSON         NOT NULL,
  respondent_email VARCHAR(255) DEFAULT NULL,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_partial_form_session (form_id, session_id),
  KEY idx_partial_responses_form_id (form_id),
  CONSTRAINT fk_partial_responses_form FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- ANALYTICS (Aggregated stats cache)
-- ============================================================
CREATE TABLE IF NOT EXISTS analytics (
  id          CHAR(36)     NOT NULL,
  form_id     CHAR(36)     NOT NULL,
  date        DATE         NOT NULL,
  views       INT          NOT NULL DEFAULT 0,
  submissions INT          NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_analytics_form_date (form_id, date),
  KEY idx_analytics_form_id (form_id),
  CONSTRAINT fk_analytics_form FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- WEBHOOKS
-- ============================================================
CREATE TABLE IF NOT EXISTS webhooks (
  id         CHAR(36)     NOT NULL,
  form_id    CHAR(36)     NOT NULL,
  user_id    CHAR(36)     NOT NULL,
  url        VARCHAR(500) NOT NULL,
  events     JSON         NOT NULL,
  secret     VARCHAR(255) DEFAULT NULL,
  is_active  TINYINT(1)   NOT NULL DEFAULT 1,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_webhooks_form_id (form_id),
  KEY idx_webhooks_user_id (user_id),
  CONSTRAINT fk_webhooks_form FOREIGN KEY (form_id) REFERENCES forms(id) ON DELETE CASCADE,
  CONSTRAINT fk_webhooks_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
