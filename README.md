<h1 align="center">moddybot</h1>

<p align="center">a discord bot built for the R.E.P.O. Modding Server, handles moderation, spam detection, and has some handy tools for mod developers. written in typescript, runs on bun.</p>

---

## disclaimer

# you can take anything from this repo and use it in your bot, just give some creds!

## features

- **piracy detection** - scans messages for known piracy-related keywords and flags them in a log channel
- **spam and scam filtering** - catches crypto scam messages, blacklisted links, and fake discord invite urls. also uses tesseract OCR to scan images for scam text
- **account age alerts** - flags new members with suspiciously young accounts so mods can keep an eye on them
- **thunderstore integration** - search for packages on thunderstore and import r2modman profiles directly in discord
- **mod guide command** - links to pages from the R.E.P.O. modding docs (API, SDK, general guides) with autocomplete
- **dev help responses** - canned responses for common questions like setting up the SDK, unity environment, or telling people to stop being vague
- **log file analyzer** - automatically parses uploaded log files and pulls out mod errors with stack traces
- **context menu translate** - right click a message to translate it using google translate
- **softban** - ban and immediately unban a user to wipe their messages, configurable message deletion window
- **link blacklisting** - add links to a blacklist so the bot auto-removes them
- **rotating status** - randomized status messages that cycle through fun actions, suffixes, and tagged users
- **per-guild config** - set log channels, mod roles, toggle DM notifications, and let mods bypass spam checks
- **deploy server** - built-in deploy endpoint for easy remote updates

## setup

1. clone the repo
```bash
git clone https://github.com/coah80/moddybot.git
cd moddybot
```

2. install dependencies (requires [bun](https://bun.sh))
```bash
bun install
```

3. copy the example env and fill in your bot token and any other config
```bash
cp .env.example .env
```

4. run the bot
```bash
bun start
```

## tech

- **runtime:** bun
- **language:** typescript
- **discord library:** discord.js v14
- **ocr:** tesseract.js
- **translation:** @vitalets/google-translate-api
- **thunderstore:** cheerio + jsdom for scraping
