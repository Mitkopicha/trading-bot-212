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

    public TrainingStepResult runTrainingStep(long accountId, String symbol, int limit, int index) {
    List<BigDecimal> closes = priceService.getHistoricalCloses(symbol, "1m", limit);

    // need enough data for MA20 + previous
    if (index < 21) index = 21;

    if (index >= closes.size()) {
        return new TrainingStepResult(true, closes.size(), 0, MACrossoverStrategy.Signal.HOLD);
    }

    List<BigDecimal> slice = closes.subList(0, index + 1);
    MACrossoverStrategy.Signal signal = strategy.decide(slice);
    BigDecimal price = closes.get(index);

    int trades = 0;
    if (signal == MACrossoverStrategy.Signal.BUY) {
        tradeService.buy(accountId, symbol, price, "TRAINING");
        trades = 1;
    } else if (signal == MACrossoverStrategy.Signal.SELL) {
        tradeService.sell(accountId, symbol, price, "TRAINING");
        trades = 1;
    }

    int nextIndex = index + 1;
    boolean done = nextIndex >= closes.size();

    return new TrainingStepResult(done, nextIndex, trades, signal);
}   
public static class TrainingStepResult {
    public boolean done;
    public int nextIndex;
    public int tradesExecuted;
    public MACrossoverStrategy.Signal signal;

    public TrainingStepResult(boolean done, int nextIndex, int tradesExecuted, MACrossoverStrategy.Signal signal) {
        this.done = done;
        this.nextIndex = nextIndex;
        this.tradesExecuted = tradesExecuted;
        this.signal = signal;
    }
}

}