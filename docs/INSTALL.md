# Installation

## Requirements

- Node.js 20 or newer recommended
- A computer connected to the TV by HDMI
- Chrome or Chromium for kiosk mode

## Install

```bash
npm install
npm start
```

## Open

```text
http://localhost:3000/screen
http://localhost:3000/remote
```

## Kiosk mode

```bash
chromium-browser --kiosk http://localhost:3000/screen
```

The Remote page can stay open on the laptop while the TV screen continues playing on the HDMI display.
