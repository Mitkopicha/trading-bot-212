package com.tradingbot.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Service
public class BinancePriceService {

    private static final String BASE_URL = "https://api.binance.com";

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public BigDecimal getLatestPrice(String symbol) {
        try {
            String url = BASE_URL + "/api/v3/ticker/price?symbol=" + symbol;
            String json = restTemplate.getForObject(url, String.class);
            JsonNode node = objectMapper.readTree(json);
            return new BigDecimal(node.get("price").asText());
        } catch (Exception e) {
            throw new RuntimeException("Failed to fetch latest price from Binance", e);
        }
    }

    public List<BigDecimal> getHistoricalCloses(String symbol, String interval, int limit, int offset) {
        List<Candle> candles = getCandles(symbol, interval, limit, offset);
        List<BigDecimal> closes = new ArrayList<>();
        for (Candle c : candles) closes.add(c.close);
        return closes;
    }

    public List<Candle> getCandles(String symbol, String interval, int limit, int offset) {
        try {
            int fetch = limit + offset;
            String url = BASE_URL + "/api/v3/klines?symbol=" + symbol + "&interval=" + interval + "&limit=" + fetch;
            String json = restTemplate.getForObject(url, String.class);
            JsonNode arr = objectMapper.readTree(json);

            List<Candle> candles = new ArrayList<>();
            for (JsonNode c : arr) {
                long openTime = c.get(0).asLong();
                BigDecimal open = new BigDecimal(c.get(1).asText());
                BigDecimal high = new BigDecimal(c.get(2).asText());
                BigDecimal low = new BigDecimal(c.get(3).asText());
                BigDecimal close = new BigDecimal(c.get(4).asText());
                candles.add(new Candle(openTime, open, high, low, close));
            }

            int end = Math.max(0, candles.size() - offset);
            int start = Math.max(0, end - limit);
            if (start > end) start = end;

            return candles.subList(start, end);
        } catch (Exception e) {
            throw new RuntimeException("Failed to fetch candles for " + symbol, e);
        }
    }

    public static class Candle {
        public long timestamp;
        public BigDecimal open, high, low, close;

        public Candle(long timestamp, BigDecimal open, BigDecimal high, BigDecimal low, BigDecimal close) {
            this.timestamp = timestamp;
            this.open = open;
            this.high = high;
            this.low = low;
            this.close = close;
        }
    }
}
