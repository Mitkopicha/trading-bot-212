-- db/schema.sql
-- Core database schema for trading-bot-212
-- Standalone (pure SQL) so it can run in HeidiSQL / Workbench / any SQL tool.

-- =========================
-- account
-- =========================
CREATE TABLE IF NOT EXISTS account (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  cash_balance DECIMAL(18,8) NOT NULL DEFAULT 0.00000000,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

-- =========================
-- portfolio
-- =========================
CREATE TABLE IF NOT EXISTS portfolio (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  account_id BIGINT UNSIGNED NOT NULL,
  symbol VARCHAR(32) NOT NULL,
  quantity DECIMAL(18,8) NOT NULL DEFAULT 0.00000000,
  avg_entry_price DECIMAL(18,8) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_portfolio_account_symbol (account_id, symbol),
  KEY idx_portfolio_account (account_id),
  CONSTRAINT fk_portfolio_account
    FOREIGN KEY (account_id) REFERENCES account(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =========================
-- trade
-- =========================
CREATE TABLE IF NOT EXISTS trade (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  account_id BIGINT UNSIGNED NOT NULL,
  mode ENUM('TRAINING','TRADING') NOT NULL,
  symbol VARCHAR(32) NOT NULL,
  side ENUM('BUY','SELL') NOT NULL,
  quantity DECIMAL(18,8) NOT NULL,
  price DECIMAL(18,8) NOT NULL,
  fee DECIMAL(18,8) NULL,
  `timestamp` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  pnl DECIMAL(18,8) NULL,
  PRIMARY KEY (id),
  KEY idx_trade_account_time (account_id, `timestamp`),
  KEY idx_trade_account_symbol (account_id, symbol),
  KEY idx_trade_account_mode (account_id, mode),
  CONSTRAINT fk_trade_account
    FOREIGN KEY (account_id) REFERENCES account(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =========================
-- equity_snapshot
-- =========================
CREATE TABLE IF NOT EXISTS equity_snapshot (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  account_id BIGINT UNSIGNED NOT NULL,
  mode ENUM('TRAINING','TRADING') NOT NULL,
  `timestamp` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cash_balance DECIMAL(18,8) NOT NULL,
  portfolio_value DECIMAL(18,8) NOT NULL,
  total_equity DECIMAL(18,8) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_snapshot_account_time (account_id, `timestamp`),
  KEY idx_snapshot_account_mode_time (account_id, mode, `timestamp`),
  CONSTRAINT fk_snapshot_account
    FOREIGN KEY (account_id) REFERENCES account(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB;
