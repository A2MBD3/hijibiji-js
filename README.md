# JavaScript Obfuscator Telegram Bot 🤖🔒

<!-- ============================================================
  Credit: abdullah al mamun (@A2MBD3)
  ============================================================ -->

A Telegram bot that obfuscates JavaScript code using the [javascript-obfuscator](https://github.com/javascript-obfuscator/javascript-obfuscator) library.

## Features

- Send JavaScript code as a **text message** – the bot detects and obfuscates it
- Upload a **.js file** – the bot processes it and returns the obfuscated version
- **Owner control system** — bot owner gets full admin commands, others get `.mjs` output
- Strong default obfuscation settings (control flow flattening, RC4 encoding, self-defending, debug protection)
- **Original files are saved** in user-specific folders under `originals/<chatId>/`
- User-friendly interface with Markdown formatting
- Intelligent code detection – won't obfuscate plain text

## Commands

| Command      | Who can use | Description                      |
|-------------|------------|----------------------------------|
| `/start`    | Everyone   | Welcome message & instructions   |
| `/help`     | Everyone   | Show help information            |
| `/about`    | Everyone   | About the bot & credits          |
| `/ping`     | Everyone   | Check if bot is alive            |
| `/owner`    | Everyone   | Show bot owner info              |
| `/stats`    | Owner only | View bot statistics              |
| `/broadcast`| Owner only | Send a broadcast message         |

## Owner Control System

The bot has a built-in owner control system:

- **Bot Owner** (Telegram ID: `8074495633` — abdullah al mamun)
  - Gets `.js` output files
  - Can use `/stats`, `/broadcast`, and all owner commands
  - Full system control

- **Other Users**
  - Get `.mjs` output files (ES module format)
  - Can only use public commands (`/start`, `/help`, `/about`, `/ping`, `/owner`)
  - Can send code and upload `.js` files normally

## File Organization

When you send code or upload files, the **original files** are automatically saved into organized folders:

```
originals/
  ├── 8074495633/                  ← Owner's files
  │   ├── 1712345678901-script.js
  │   └── ...
  └── 123456789/                   ← Other users' files
      ├── 1712345678902-message.js
      └── ...
```

This allows you to keep a backup of all original code sent by each user.

## Obfuscation Options

The bot uses aggressive obfuscation settings including:

| Option                          | Value  |
|---------------------------------|--------|
| Control flow flattening         | true   |
| Control flow flattening threshold| 1      |
| Dead code injection             | true   |
| Dead code injection threshold   | 0.4    |
| String array                    | true   |
| String array encoding           | rc4    |
| String array threshold          | 1      |
| Self-defending                  | true   |
| Debug protection                | true   |
| Identifier names generator      | hexadecimal |
| Numbers to expressions          | true   |
| String splitting                | true   |
| Object key transformation       | true   |

You can customize these options in `src/config.js`.

---

## 🚀 Deploy on Render (Blueprint)

You can deploy this bot on [Render](https://render.com) for **free** using the included Blueprint (`render.yaml`).

### One-Click Deploy

1. **Fork or push** this repository to your GitHub/GitLab account.

2. Go to [Render Dashboard → Blueprints](https://dashboard.render.com/blueprints).

3. Click **"New Blueprint Instance"** and connect your repository.

4. Render will automatically detect the `render.yaml` file and show you the service configuration.

5. When prompted, enter your **`BOT_TOKEN`** (get it from [@BotFather](https://t.me/BotFather)) as a secret environment variable.

6. Click **"Apply"** — Render will build and deploy the bot automatically.

7. Once deployed, your bot will be live! 🎉

### What the Blueprint Includes

The `render.yaml` file creates:

| Resource | Type | Details |
|----------|------|---------|
| **Bot Service** | Web (Docker) | Runs the Telegram bot with health check |
| Region | Singapore | Fastest for Asia — change in `render.yaml` |
| Plan | Free | 750 hrs/month (more than enough for a bot) |
| Health Check | `/health` | Render keeps the bot alive automatically |

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `BOT_TOKEN` | ✅ **Yes** | Your Telegram bot token (secret) |
| `OWNER_ID` | ❌ No | Bot owner Telegram ID (default: `8074495633`) |
| `PORT` | ❌ No | Default: `10000` — health check server port |
| `NODE_ENV` | ❌ No | Default: `production` |

### Setup at Deploy

The bot automatically creates all required directories (`originals/`, temp) **at startup time**.
No manual setup needed after deploy.

---

## Development

Run with auto-restart on file changes:

```bash
npm run dev
```

Or run directly:

```bash
npm start
```

### Project Structure

```
.
├── src/
│   ├── index.js                  # Entry point + health check + owner control
│   ├── config.js                 # Configuration & obfuscator options
│   ├── handlers/
│   │   ├── messageHandler.js     # Handles text messages (code detection)
│   │   └── documentHandler.js    # Handles .js file uploads
│   ├── services/
│   │   └── obfuscatorService.js  # JavaScript obfuscation logic
│   └── utils/
│       └── fileUtils.js          # File I/O helpers + safe edit
├── originals/                    # Saved original files (per user)
├── render.yaml                   # Render Blueprint deployment config
├── Dockerfile                    # Docker image for containerized deploy
├── start.sh                      # Docker entrypoint script
├── .env.example                  # Environment variable template
└── package.json
```

## License

MIT

---

## Credit

**abdullah al mamun (@A2MBD3)**
