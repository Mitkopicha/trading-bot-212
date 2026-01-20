package com.tradingbot.backend.controller;

import com.tradingbot.backend.repo.AccountRepository;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")

public class AccountController {

    private final AccountRepository accountRepo;

    public AccountController(AccountRepository accountRepo) {
        this.accountRepo = accountRepo;
    }

    @GetMapping("/account")
    public Map<String, Object> getAccount(@RequestParam long accountId) {
        return accountRepo.getAccount(accountId);
    }
}
