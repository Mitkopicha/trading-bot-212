package com.tradingbot.backend.controller;

import com.tradingbot.backend.repo.PortfolioRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class PortfolioController {

    private final PortfolioRepository portfolioRepo;

    public PortfolioController(PortfolioRepository portfolioRepo) {
        this.portfolioRepo = portfolioRepo;
    }

    @GetMapping("/portfolio")
    public List<Map<String, Object>> getPortfolio(@RequestParam long accountId) {
        return portfolioRepo.getPortfolio(accountId);
    }
}
