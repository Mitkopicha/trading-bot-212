package com.tradingbot.backend.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

public class MACrossoverStrategy {

    public enum Signal { BUY, SELL, HOLD }

    private final int shortWindow;
    private final int longWindow;

    public MACrossoverStrategy() {
        this(5, 20);
    }

    public MACrossoverStrategy(int shortWindow, int longWindow) {
        this.shortWindow = shortWindow;
        this.longWindow = longWindow;
    }

    // Classic crossover (good for training/backtests)
    public Signal decide(List<BigDecimal> closes) {
        if (closes == null) return Signal.HOLD;
        if (closes.size() < longWindow + 1) return Signal.HOLD;

        int last = closes.size() - 1;

        BigDecimal shortNow = sma(closes, last, shortWindow);
        BigDecimal longNow  = sma(closes, last, longWindow);

        BigDecimal shortPrev = sma(closes, last - 1, shortWindow);
        BigDecimal longPrev  = sma(closes, last - 1, longWindow);

        boolean crossUp = shortPrev.compareTo(longPrev) <= 0 && shortNow.compareTo(longNow) > 0;
        boolean crossDown = shortPrev.compareTo(longPrev) >= 0 && shortNow.compareTo(longNow) < 0;

        if (crossUp) return Signal.BUY;
        if (crossDown) return Signal.SELL;
        return Signal.HOLD;
    }

    // Trend-following (better for live stepping; does not require a perfect cross)
    public Signal trendSignal(List<BigDecimal> closes, BigDecimal epsilonPct) {
        if (closes == null) return Signal.HOLD;
        if (closes.size() < longWindow) return Signal.HOLD;

        int last = closes.size() - 1;

        BigDecimal shortNow = sma(closes, last, shortWindow);
        BigDecimal longNow  = sma(closes, last, longWindow);

        // optional “dead zone” to reduce whipsaw:
        // if short and long are extremely close, HOLD.
        if (epsilonPct != null && epsilonPct.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal diff = shortNow.subtract(longNow).abs();
            BigDecimal threshold = longNow.abs().multiply(epsilonPct);
            if (diff.compareTo(threshold) <= 0) return Signal.HOLD;
        }

        int cmp = shortNow.compareTo(longNow);
        if (cmp > 0) return Signal.BUY;
        if (cmp < 0) return Signal.SELL;
        return Signal.HOLD;
    }

    private BigDecimal sma(List<BigDecimal> closes, int endIndex, int window) {
        int start = endIndex - window + 1;
        BigDecimal sum = BigDecimal.ZERO;
        for (int i = start; i <= endIndex; i++) sum = sum.add(closes.get(i));
        return sum.divide(BigDecimal.valueOf(window), 8, RoundingMode.HALF_UP);
    }
}
