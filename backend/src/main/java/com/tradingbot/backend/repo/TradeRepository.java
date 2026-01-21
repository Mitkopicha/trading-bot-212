package com.tradingbot.backend.repo;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.util.List;
import java.util.Map;

@Repository
public class TradeRepository {

    private final JdbcTemplate jdbc;

    public TradeRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public int insertTrade(long accountId,
                           String mode,
                           String symbol,
                           String side,
                           BigDecimal quantity,
                           BigDecimal price,
                           BigDecimal fee,
                           BigDecimal pnl) {

        return jdbc.update(
                "INSERT INTO trade (account_id, mode, symbol, side, quantity, price, fee, pnl, timestamp) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())",
                accountId, mode, symbol, side, quantity, price, fee, pnl
        );
    }

    public int insertTradeWithTimestamp(long accountId,
                                        String mode,
                                        String symbol,
                                        String side,
                                        BigDecimal quantity,
                                        BigDecimal price,
                                        BigDecimal fee,
                                        BigDecimal pnl,
                                        Long candleTs) {

        if (candleTs == null) {
            return insertTrade(accountId, mode, symbol, side, quantity, price, fee, pnl);
        }

        return jdbc.update(
                "INSERT INTO trade (account_id, mode, symbol, side, quantity, price, fee, pnl, timestamp) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, FROM_UNIXTIME(?/1000))",
                accountId, mode, symbol, side, quantity, price, fee, pnl, candleTs
        );
    }

    public List<Map<String, Object>> getTrades(long accountId) {
        return jdbc.queryForList(
                "SELECT `timestamp`, side, symbol, quantity, price, pnl " +
                        "FROM trade WHERE account_id = ? ORDER BY `timestamp` DESC",
                accountId
        );
    }

    public int deleteTradesForAccount(long accountId) {
        return jdbc.update("DELETE FROM trade WHERE account_id = ?", accountId);
    }

    public Timestamp getLastTradeTimestamp(long accountId, String mode, String symbol) {
        return jdbc.query(
                "SELECT `timestamp` FROM trade " +
                        "WHERE account_id=? AND mode=? AND symbol=? " +
                        "ORDER BY `timestamp` DESC LIMIT 1",
                rs -> rs.next() ? rs.getTimestamp(1) : null,
                accountId, mode, symbol
        );
    }
}
