package com.tradingbot.backend.service;

import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.util.List;

@Service
public class BotService {
    private final BinancePriceService priceService;
    private final TradeService tradeService;
    private final MACrossoverStrategy strategy = new MACrossoverStrategy();
    public BotService(BinancePriceService priceService, TradeService tradeService) {
        this.priceService = priceService;
        this.tradeService = tradeService;
    }

    /**
     * TRADING MODE:
     * Run one step of the strategy using latest data.
     * Executes trades as needed.   
     */
    public MACrossoverStrategy.Signal runTradingStep(long accountId, String symbol) {
        // Need enough candles to compute MA20 + previous MA20
        List<BigDecimal> closes = priceService.getHistoricalCloses(symbol, "1m", 30);
        MACrossoverStrategy.Signal signal = strategy.decide(closes);
        BigDecimal latestPrice = closes.get(closes.size() - 1);
        if (signal == MACrossoverStrategy.Signal.BUY) {
            tradeService.buy(accountId, symbol, latestPrice, "TRADING");
        } else if (signal == MACrossoverStrategy.Signal.SELL) {
            tradeService.sell(accountId, symbol, latestPrice, "TRADING");
        }
        return signal;
    }


    /**
     * TRAINING MODE (backtest):
     * Simulate running the strategy over historical data.
     * Returns number of trades executed.
     */
    public int runTraining(long accountId, String symbol, int limit) {
        List<BigDecimal> closes = priceService.getHistoricalCloses(symbol, "1m", limit);
        int trades = 0;
        for (int i = 0; i < closes.size(); i++) {
            if (i < 21) continue; // need enough data
            List<BigDecimal> slice = closes.subList(0, i + 1);
            MACrossoverStrategy.Signal signal = strategy.decide(slice);
            BigDecimal price = closes.get(i);
            if (signal == MACrossoverStrategy.Signal.BUY) {
                tradeService.buy(accountId, symbol, price, "TRAINING");
                trades++;
            } else if (signal == MACrossoverStrategy.Signal.SELL) {
                tradeService.sell(accountId, symbol, price, "TRAINING");
                trades++;
            }
        }
        return trades;
    }
}
