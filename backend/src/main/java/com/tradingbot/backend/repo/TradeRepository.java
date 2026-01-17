package com.tradingbot.backend.repo;


import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;

@Repository
public class TradeRepository {
    private final JdbcTemplate jdbc;

    public TradeRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public int insertTrade(long accountId,
                           String mode,       // "TRAINING" or "TRADING"
                           String symbol,
                           String side,       // "BUY" or "SELL"
                           BigDecimal quantity,
                           BigDecimal price,
                           BigDecimal fee,    // can be null
                           BigDecimal pnl) {  // can be null

        return jdbc.update(
            "INSERT INTO trade (account_id, mode, symbol, side, quantity, price, fee, pnl, timestamp) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())",
            accountId, mode, symbol, side, quantity, price, fee, pnl
        );
    }
}
