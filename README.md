# AHMED-MD WhatsApp Bot 🤖

<p align="center">
  <img src="https://img.shields.io/github/license/ahmedpixels/AHMED-MD?style=flat-square&color=blue" alt="License"/>
  <img src="https://img.shields.io/github/stars/ahmedpixels/AHMED-MD?style=flat-square&color=gold" alt="Stars"/>
  <img src="https://img.shields.io/github/forks/ahmedpixels/AHMED-MD?style=flat-square&color=green" alt="Forks"/>
  <img src="https://img.shields.io/github/issues/ahmedpixels/AHMED-MD?style=flat-square&color=red" alt="Issues"/>
</p>

<p align="center">
  A premium, high-speed multi-device WhatsApp bot built for advanced moderation, rich media processing, and seamless performance. Fully close-source and optimized for absolute security.
</p>

---

## ⚡ Deployment Platforms

Deploy **AHMED-MD** instantly on your favorite cloud platform with one click:

### 1. Render 🚀
[![Deploy to Render](https://render.com/images/deploy-to-render.svg)](https://render.com/deploy?repo=https://github.com/ahmedpixels/AHMED-MD)

### 2. Railway 🚃
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/ahmedpixels/AHMED-MD)

### 3. Koyeb ☁️
[![Deploy to Koyeb](https://www.koyeb.com/static/images/deploy/button.svg)](https://app.koyeb.com/deploy?type=git&repository=https://github.com/ahmedpixels/AHMED-MD&branch=main&run_command=node%20index.js)

### 4. Heroku 💜
[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/ahmedpixels/AHMED-MD)

---

## ⚙️ Environment Variables (Configuration)

When deploying, configure the following Environment Variables (Variables/Configs) in your platform settings:

| Variable Name | Description | Required | Example |
|---|---|---|---|
| `SESSION_ID` | Your WhatsApp pairing session ID. Get it from [ahmedxmd.com](https://ahmedxmd.com) | **Yes** | `AHMED-MD-XXXXXX` |
| `OWNER_NUMBER` | The phone number of the bot owner (with country code, no `+` or spaces) | **Yes** | `923XXXXXXXXX` |
| `PREFIX` | Command prefix character | No (Default: `.`) | `.` |
| `MODE` | Work mode of the bot (`public` or `private`) | No (Default: `public`) | `public` |
| `AUTO_READ` | Automatically read all incoming messages (`true` or `false`) | No (Default: `false`) | `false` |
| `AUTO_STATUS_VIEW` | Automatically view WhatsApp status stories (`true` or `false`) | No (Default: `false`) | `false` |

---

## 🖥️ VPS / Docker Deployment

For self-hosted VPS servers (Ubuntu/Debian):

```bash
# Clone the repository
git clone https://github.com/ahmedpixels/AHMED-MD.git
cd AHMED-MD

# Install dependencies
npm install

# Create config.env
nano config.env
# Add the following lines:
# SESSION_ID=your_session_id
# OWNER_NUMBER=your_number

# Start the bot
npm start
```

### 1-Click Single File VPS Panel Deployment (Bootloader) 🚀
If your VPS panel (like pterodactyl, aapanel, etc.) allows uploading a single file to deploy:
1. Download or copy the [bootloader.js](bootloader.js) file.
2. Rename it to `index.js` on your VPS panel.
3. Edit the `SESSION_ID` variable at the top of the file with your session ID.
4. Click Start! The script will automatically clone the repository, install dependencies, pull updates, and launch the bot online.

### Run using Docker:
```bash
docker build -t ahmed-md .
docker run -d --name ahmed-md-bot -e SESSION_ID=your_session_id -e OWNER_NUMBER=your_number -p 8000:8000 ahmed-md
```

---

## 🔒 Close-Source Security

This bot is fully protected against code theft, cloning, and logical duplication. The source code is compiled using professional-grade obfuscation technologies to safeguard original intellectual property.

## 📢 Official Support & Community
- **Website:** [ahmedxmd.com](https://ahmedxmd.com)
- **WhatsApp Channel:** [Join Now](https://whatsapp.com/channel/0029Vb8EK6l3gvWfrZpfOm23)
- **Telegram Channel:** [Join Now](https://t.me/ahmedxtech)

> Developed with ❤️ by Ahmed
