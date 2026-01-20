Auto Trading Bot – Take-Home Task

A simple web application that simulates an automated crypto trading bot.

The bot supports:

- Training mode (backtesting on historical price data)
- Trading mode (live simulation using current market prices)

All trades are simulated only — no real money is used.

Tech Stack

Frontend: React + Vite (HTML, CSS, JavaScript)

Backend: Java, Spring Boot (raw JDBC, no ORM)

Database: MariaDB

Market Data: Binance public REST API

Features

- Training (backtest) and Trading (live simulation) modes
- Automated trading logic based on market indicators
- Tracks:
  - Account balance
  - Portfolio holdings
  - Trade history
  - Equity over time

Dashboard includes:

- Price chart with BUY / SELL markers
- Trade history table with PnL
- Portfolio summary
- Controls to start, pause, reset, and switch modes

Project Structure
trading_bot_212/
├── README.md
├── db/
│   ├── schema.sql
│   └── seed.sql
├── backend/
└── frontend/

Database Setup (MariaDB)

Make sure MariaDB is running locally.

CREATE DATABASE trading_bot_212;


From the project root, load the schema and seed data:

mysql -u root -p trading_bot_212 < db/schema.sql
mysql -u root -p trading_bot_212 < db/seed.sql

Backend Setup

Edit database credentials in:

backend/src/main/resources/application.properties


Example:

spring.datasource.url=jdbc:mariadb://localhost:3306/trading_bot_212
spring.datasource.username=root
spring.datasource.password=your_password


Run the backend:

cd backend
./mvnw spring-boot:run


Backend runs on:

http://localhost:8080

Frontend Setup
cd frontend
npm install
npm run dev


Frontend runs on:

http://localhost:5173

How to Run

Start MariaDB and load the database.

Run the backend.

Run the frontend.

Open the dashboard and use Training or Trading mode.

Notes

Uses raw SQL (JDBC) — no ORM.

Binance API is public and does not require an API key.

Designed for clarity and simplicity for a take-home task.