package com.tradingbot.backend.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

public class MACrossoverStrategy {
    public enum Signal { BUY, SELL, HOLD }
    private final int shortWindow = 5;
    private final int longWindow = 20;  
    public Signal decide(List<BigDecimal> closes) {
        int n = closes.size();
        if (n < longWindow + 1) return Signal.HOLD;
        int curr = n - 1;
        int prev = n - 2;
        BigDecimal prevShort = sma(closes, prev, shortWindow);
        BigDecimal prevLong  = sma(closes, prev, longWindow);
        BigDecimal currShort = sma(closes, curr, shortWindow);
        BigDecimal currLong  = sma(closes, curr, longWindow);
        if (prevShort.compareTo(prevLong) <= 0 && currShort.compareTo(currLong) > 0) {
            return Signal.BUY;
        }
        if (prevShort.compareTo(prevLong) >= 0 && currShort.compareTo(currLong) < 0) {
            return Signal.SELL;
        }
        return Signal.HOLD;
    }

    private BigDecimal sma(List<BigDecimal> closes, int endIndex, int window) {
        BigDecimal sum = BigDecimal.ZERO;
        for (int i = endIndex - window + 1; i <= endIndex; i++) {
            sum = sum.add(closes.get(i));
        }
        return sum.divide(BigDecimal.valueOf(window), 8, RoundingMode.HALF_UP);
    }
}
