package com.tradingbot.backend.service;

import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Service
public class BotService {

    private final BinancePriceService priceService;
    private final TradeService tradeService;

    // Trading: faster + more responsive signals
    private final MACrossoverStrategy tradingStrategy = new MACrossoverStrategy(3, 8);

    // Training: classic 5/20 crossover
    private final MACrossoverStrategy trainingStrategy = new MACrossoverStrategy(5, 20);

    public BotService(BinancePriceService priceService, TradeService tradeService) {
        this.priceService = priceService;
        this.tradeService = tradeService;
    }

    // ===== TRADING MODE =====
    public MACrossoverStrategy.Signal runTradingStep(long accountId, String symbol) {

        List<BinancePriceService.Candle> candles = priceService.getCandles(symbol, "1m", 200, 0);
        if (candles == null || candles.size() < 21) return MACrossoverStrategy.Signal.HOLD;

        List<BigDecimal> closes = new ArrayList<>();
        for (var c : candles) closes.add(c.close);

        // live price update for responsiveness
        BigDecimal live = priceService.getLatestPrice(symbol);
        closes.set(closes.size() - 1, live);

        // TREND signal = shortMA above/below longMA (more active than "cross" in live)
        // epsilon=0 means no dead-zone, most active
        MACrossoverStrategy.Signal signal = tradingStrategy.trendSignal(closes, BigDecimal.ZERO);

        // cooldown prevents spam
        long cooldownMs = 5_000;
        if (!tradeService.isCooldownOver(accountId, symbol, "TRADING", cooldownMs)) {
            return MACrossoverStrategy.Signal.HOLD;
        }

        boolean hasPos = tradeService.hasPosition(accountId, symbol);

        // If strategy wants to BUY but we already hold, or wants to SELL but we don't hold,
        // we still return the SIGNAL so the UI shows what the bot "wants".
        if (signal == MACrossoverStrategy.Signal.BUY && !hasPos) {
            tradeService.buy(accountId, symbol, live, "TRADING");
        } else if (signal == MACrossoverStrategy.Signal.SELL && hasPos) {
            tradeService.sell(accountId, symbol, live, "TRADING");
        }

        return signal;
    }

    // ===== TRAINING MODE =====

    public static class CandleDTO {
        public long timestamp;
        public BigDecimal close;

        public CandleDTO() {}
        public CandleDTO(long timestamp, BigDecimal close) {
            this.timestamp = timestamp;
            this.close = close;
        }
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

    public int runTraining(long accountId, String symbol, int limit, int offset) {
        List<BigDecimal> closes = priceService.getHistoricalCloses(symbol, "1m", limit, offset);
        int trades = 0;

        for (int i = 0; i < closes.size(); i++) {
            if (i < 21) continue;

            List<BigDecimal> slice = closes.subList(0, i + 1);
            MACrossoverStrategy.Signal signal = trainingStrategy.decide(slice);
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

    public TrainingStepResult runTrainingStep(long accountId, String symbol, int limit, int index, int offset) {
        List<BigDecimal> closes = priceService.getHistoricalCloses(symbol, "1m", limit, offset);
        return runTrainingStepWithCloses(accountId, symbol, closes, null, index);
    }

    public TrainingStepResult runTrainingStepWithCandles(long accountId, String symbol, List<CandleDTO> candles, int index) {
        if (index < 21) index = 21;

        if (candles == null || candles.isEmpty() || index >= candles.size()) {
            return new TrainingStepResult(true, candles == null ? 0 : candles.size(), 0, MACrossoverStrategy.Signal.HOLD);
        }

        List<BigDecimal> closes = new ArrayList<>();
        List<Long> timestamps = new ArrayList<>();
        for (CandleDTO c : candles) {
            closes.add(c.close);
            timestamps.add(c.timestamp);
        }

        return runTrainingStepWithCloses(accountId, symbol, closes, timestamps, index);
    }

    public TrainingStepResult runTrainingStepWithCloses(long accountId,
                                                        String symbol,
                                                        List<BigDecimal> closes,
                                                        List<Long> candleTimestamps,
                                                        int index) {

        if (index < 21) index = 21;

        if (closes == null || closes.isEmpty() || index >= closes.size()) {
            return new TrainingStepResult(true, closes == null ? 0 : closes.size(), 0, MACrossoverStrategy.Signal.HOLD);
        }

        List<BigDecimal> slice = closes.subList(0, index + 1);
        MACrossoverStrategy.Signal signal = trainingStrategy.decide(slice);

        BigDecimal price = closes.get(index);
        Long candleTs = (candleTimestamps != null && candleTimestamps.size() > index)
                ? candleTimestamps.get(index)
                : null;

        int trades = 0;
        if (signal == MACrossoverStrategy.Signal.BUY) {
            tradeService.buyAtTimestamp(accountId, symbol, price, "TRAINING", candleTs);
            trades = 1;
        } else if (signal == MACrossoverStrategy.Signal.SELL) {
            tradeService.sellAtTimestamp(accountId, symbol, price, "TRAINING", candleTs);
            trades = 1;
        }

        int nextIndex = index + 1;
        boolean done = nextIndex >= closes.size();

        return new TrainingStepResult(done, nextIndex, trades, signal);
    }
}
