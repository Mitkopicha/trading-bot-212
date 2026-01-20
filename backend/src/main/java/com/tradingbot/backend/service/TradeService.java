package com.tradingbot.backend.service;


import com.tradingbot.backend.repo.AccountRepository;
import com.tradingbot.backend.repo.PortfolioRepository;
import com.tradingbot.backend.repo.TradeRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
public class TradeService {

    private final AccountRepository accountRepo;
    private final PortfolioRepository portfolioRepo;
    private final TradeRepository tradeRepo;

    public TradeService(AccountRepository accountRepo,
                        PortfolioRepository portfolioRepo,
                        TradeRepository tradeRepo) {
        this.accountRepo = accountRepo;
        this.portfolioRepo = portfolioRepo;
        this.tradeRepo = tradeRepo;
    }

    @Transactional
    public void buy(long accountId, String symbol, BigDecimal price, String mode) {
        BigDecimal cash = accountRepo.getCashBalanceForUpdate(accountId);

        BigDecimal spend = cash.multiply(new BigDecimal("0.10"));
        if (spend.compareTo(BigDecimal.ZERO) <= 0) return;
        if (price.compareTo(BigDecimal.ZERO) <= 0) return;

        BigDecimal qty = spend.divide(price, 8, RoundingMode.DOWN);
        if (qty.compareTo(BigDecimal.ZERO) <= 0) return;

        tradeRepo.insertTrade(accountId, mode, symbol, "BUY", qty, price, null, null);

        BigDecimal newCash = cash.subtract(spend);
        accountRepo.updateCashBalance(accountId, newCash);

        portfolioRepo.upsertBuy(accountId, symbol, qty, price);
    }

   @Transactional
public void sell(long accountId, String symbol, BigDecimal price, String mode) {

    if (price.compareTo(BigDecimal.ZERO) <= 0) return;

    BigDecimal positionQty;
    BigDecimal avgEntry;
    try {
        positionQty = portfolioRepo.getPositionQtyForUpdate(accountId, symbol);
        avgEntry = portfolioRepo.getAvgEntryPriceForUpdate(accountId, symbol);
    } catch (Exception e) {
        return; 
    }

    if (positionQty == null || positionQty.compareTo(BigDecimal.ZERO) <= 0) return;
    if (avgEntry == null) avgEntry = BigDecimal.ZERO;

    BigDecimal sellQty = positionQty.multiply(new BigDecimal("0.10"))
            .setScale(8, RoundingMode.DOWN);

    if (sellQty.compareTo(BigDecimal.ZERO) <= 0) return;

    
    int updated = portfolioRepo.reducePosition(accountId, symbol, sellQty);
    if (updated == 0) return;

    BigDecimal cash = accountRepo.getCashBalanceForUpdate(accountId);
    BigDecimal proceeds = sellQty.multiply(price).setScale(8, RoundingMode.HALF_UP);
    BigDecimal newCash = cash.add(proceeds);
    accountRepo.updateCashBalance(accountId, newCash);

 
    BigDecimal pnl = price.subtract(avgEntry)
            .multiply(sellQty)
            .setScale(8, RoundingMode.HALF_UP);
    tradeRepo.insertTrade(accountId, mode, symbol, "SELL", sellQty, price, null, pnl);
    portfolioRepo.deleteIfZero(accountId, symbol);
}

}
