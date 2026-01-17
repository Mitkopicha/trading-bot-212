package com.tradingbot.backend.controller;

import com.tradingbot.backend.service.TradeService;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;


@RestController
@RequestMapping("/api")
public class BotController {

    private final TradeService tradeService;

    public BotController(TradeService tradeService) {
        this.tradeService = tradeService;
    }
     @GetMapping("/ping")
        public String ping() {
            return "pong";
        }

    @PostMapping("/buy")
    public String buy(@RequestParam long accountId,
                      @RequestParam String symbol,
                      @RequestParam BigDecimal price,
                      @RequestParam(defaultValue = "TRADING") String mode) {
        tradeService.buy(accountId, symbol, price, mode);
        return "OK";
    }

    @PostMapping("/sell")
    public String sell(@RequestParam long accountId,
                       @RequestParam String symbol,
                       @RequestParam BigDecimal price,
                       @RequestParam(defaultValue = "TRADING") String mode) {
        tradeService.sell(accountId, symbol, price, mode);
        return "OK";
    }
   

    
}
