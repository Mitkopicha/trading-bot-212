package com.tradingbot.backend.controller;

import com.tradingbot.backend.service.BotService;
import com.tradingbot.backend.service.MACrossoverStrategy;

import com.tradingbot.backend.service.TradeService;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;


@RestController
@RequestMapping("/api")

public class BotController {

    private final TradeService tradeService;

    public BotController(TradeService tradeService, BotService botService) {
    this.tradeService = tradeService;
    this.botService = botService;
}
    private final BotService botService;

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

   // TRADING MODE: one live step (fetch prices -> decide -> trade)
    @PostMapping("/step")
    public String step(@RequestParam long accountId,
                       @RequestParam String symbol) {
        MACrossoverStrategy.Signal signal = botService.runTradingStep(accountId, symbol);
        return "Signal=" + signal;
    }

    // TRAINING MODE: backtesting on historical candles

    @PostMapping("/train")
    public String train(@RequestParam long accountId,
                        @RequestParam String symbol,
                        @RequestParam(defaultValue = "200") int limit) {
        int trades = botService.runTraining(accountId, symbol, limit);
        return "Training done. Trades executed=" + trades;


    }
@PostMapping("/train/step")
public BotService.TrainingStepResult trainStep(@RequestParam long accountId,
                                               @RequestParam String symbol,
                                               @RequestParam(defaultValue = "200") int limit,
                                               @RequestParam int index) {
    return botService.runTrainingStep(accountId, symbol, limit, index);
}



}
