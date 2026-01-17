package com.tradingbot.backend.repo;


import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;

@Repository
public class AccountRepository {
    private final JdbcTemplate jdbc;

    public AccountRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public BigDecimal getCashBalanceForUpdate(long accountId) {
        return jdbc.queryForObject(
            "SELECT cash_balance FROM account WHERE id = ? FOR UPDATE",
            BigDecimal.class,
            accountId
        );
    }

    public int updateCashBalance(long accountId, BigDecimal newCash) {
        return jdbc.update(
            "UPDATE account SET cash_balance = ? WHERE id = ?",
            newCash, accountId
        );
    }
}
