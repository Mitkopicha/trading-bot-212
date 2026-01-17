## Database (MariaDB)

### Create DB + load schema
Run these inside the MariaDB prompt:

```sql
CREATE DATABASE trading_bot_212;
USE trading_bot_212;
SOURCE db/schema.sql;
SOURCE db/seed.sql;
