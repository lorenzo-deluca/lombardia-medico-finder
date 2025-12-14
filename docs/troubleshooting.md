# Troubleshooting

## VNC Connection Issues
- Ensure port 5900 is not blocked by a firewall.
- Check if the container is running: `docker ps`.
- Verify the password in `.env`.

## Authentication Fails
- If the login page doesn't load, check your internet connection.
- If the bot doesn't detect the login, ensure you reached the dashboard page.
- Check logs: `docker-compose logs -f`.

## Puppeteer/Chrome Issues
- "DevToolsActivePort file doesn't exist": Usually fixed by `--no-sandbox` (already included).
- "Crash": Increase shared memory in `docker-compose.yml` (`shm_size: '2gb'`).

## Telegram Notifications Not Working
- Verify Bot Token and Chat ID.
- Ensure the bot has been started (send `/start` to the bot).
