# Fab Lab TV

## A digital TV station for Fab Labs

Does your Fab Lab have a TV on the wall that is currently showing a desktop, a browser tab, an old slideshow, or nothing at all?

**Fab Lab TV** turns that screen into a living channel for your lab.

It can show project videos, Fab Academy highlights, staff on call, opening hours, workshops, local announcements, weather, tech news, global Fab community updates, and your lab branding — all controlled from a friendly Remote screen in the browser.

No special signage hardware. No complicated CMS. No daily file editing.

Just a computer, a TV, and your Fab Lab.

![Fab Lab TV running on a TV screen](docs/assets/tv-screen.jpg)

![Fab Lab TV demo](docs/assets/fablabtv-demo.gif)

---

## What is Fab Lab TV?

Fab Lab TV is part digital signage, part community bulletin board, part project showcase, and part tiny Fab Lab television station.

It was built for the daily reality of a Fab Lab:

- visitors want to know who can help them
- students want to show their work
- staff need to announce workshops and opening hours
- labs want to show what is happening locally and globally
- the TV should look good without someone babysitting it

Fab Lab TV has two main screens:

| Screen | Purpose |
| --- | --- |
| `/screen` | The TV display shown on the public screen |
| `/remote` | The control panel used by staff on the laptop |

---

## Features

### Project video playback

Fab Lab TV can play both local videos and curated Fab Academy highlight videos.

Local videos are uploaded through the Remote screen and stored in the project’s `videos/` folder. Fab Academy Highlights can be streamed from the bundled highlights catalog.

The normal TV playlist is shuffled automatically so the display does not start with the same video every time.

![Remote video controls](docs/assets/remote-video-sources.jpg)

Features include:

- local MP4 uploads
- shuffled playback
- Fab Academy Highlight streaming
- search Fab Academy highlight videos by student, lab, year, or award
- play a searched highlight immediately
- previous, play/pause, and next controls
- audio setup flow for labs that want sound

### Local videos vs streaming highlights

Fab Lab TV has two video sources.

**Local uploaded videos** are videos from your own lab. These are uploaded in the Remote screen and stored locally in:

```text
videos/
```

Use local videos for:

- student projects
- machine demos
- workshop promos
- sponsor videos
- local documentation
- anything your lab wants to showcase

![Upload a local video](docs/assets/remote-local-video-upload.jpg)

**Fab Academy Highlights** are curated Fab Academy project videos. These are streamed from Fab Academy URLs using the bundled `data/fabAcademyHighlights.json` catalog.

Use streaming highlights when you want to show excellent Fab Academy projects from around the world without downloading videos manually.

If you click a searched highlight, it plays once on the TV. After it finishes, Fab Lab TV returns to the normal shuffled playlist.

---

## Staff on call

The TV can show who is currently available to help visitors.

Staff members can be added from the Remote screen with:

- photo
- name
- short label, such as `On Call`, pronouns, role, or specialty
- profile text, such as areas of expertise

Example uses:

```text
Neil • On Call
Fab Lab network support and inspiration.
```

```text
Maria • she/her
Laser cutting, vinyl cutting, and documentation.
```

Staff can also be removed from the Remote screen when someone leaves the lab.

---

## Local Pulse

**Local Pulse** is the information channel for your own lab.

It is managed by staff from the Remote screen and appears on the TV as a rotating lower-third information area.

Local Pulse can show:

- today’s weather
- multi-day forecast
- opening hours today
- opening hours this week
- custom local messages
- message images
- upcoming workshops

### Weather

Set your lab’s weather location in Remote using a location name, latitude, and longitude.

![Weather setup](docs/assets/remote-weather.jpg)

### Opening hours

Opening hours are edited in the Remote screen. Leave a day empty to show it as closed. On the TV, today’s hours and weekly hours rotate as separate Local Pulse cards.

![Opening hours setup](docs/assets/remote-opening-hours.jpg)

### Workshops

Add workshops or events so visitors can see what is coming up.

![Workshop setup](docs/assets/remote-workshops.jpg)

### Custom local messages

Add announcements, temporary notices, closures, reminders, or event messages. Messages can also include an optional image.

![Custom local messages](docs/assets/remote-local-messages.jpg)

---

## Global Pulse

**Global Pulse** is the worldwide Fab community channel.

Unlike Local Pulse, it is not edited by local staff. It updates automatically when the app starts and then refreshes daily.

Global Pulse can include public information from the Fab ecosystem, such as:

- Fab Academy
- FAB conferences
- Fabricademy
- Fab Futures
- Fab Foundation
- Fab Learning Academy
- Academany-related programs

Content is cached locally so the TV still works if the internet is temporarily unavailable.

---

## Tech News

Fab Lab TV includes a simple tech news feed using Hacker News.

The TV screen only shows headlines so the display stays clean. If staff want to read the full story, the Remote screen keeps a news history with article links.

![Tech news history](docs/assets/remote-news.jpg)

---

## Branding

Every lab can make Fab Lab TV feel like its own station.

Fab Lab TV ships with a default logo:

```text
branding/fablab.png
```

If your lab uploads a logo in the Remote screen, it is saved as:

```text
branding/logo.png
```

The TV uses `branding/logo.png` if it exists. Otherwise it falls back to the default `branding/fablab.png`.

Transparent PNG logos work best.

![Branding setup](docs/assets/remote-branding.jpg)

---

## Language support

Fab Lab TV can display system labels in multiple languages.

Staff-written content is **not** automatically translated. If staff write a message in Icelandic, Spanish, Japanese, or any other language, Fab Lab TV shows exactly what they wrote.

System labels can also be edited per language, so labs can choose natural wording instead of awkward generic translations.

For example, a lab might change an Icelandic translation of “Tech News” to simply “Fréttir”.

![Language setup](docs/assets/remote-language.jpg)

---

## Audio

Browsers block autoplay with sound unless a user interacts with the TV page.

For reliable signage playback, Fab Lab TV starts videos muted. If your lab wants audio, use the audio setup flow from the Remote screen:

1. Click **Set up TV audio** in Remote.
2. The TV screen will show an **Enable Audio** button.
3. Click that button once on the TV screen.
4. Audio is enabled for that TV browser session.

The audio button only appears on the TV after staff request it from Remote.

For normal day-to-day volume control, use the TV or speaker volume controls.

---

## Installation

### Requirements

- Node.js 18 or newer
- npm
- a computer connected to a TV, projector, or large display

### Clone the project

```bash
git clone https://github.com/FabLabReykjavik/FabLabTV.git
cd FabLabTV
```

### Install dependencies

```bash
npm install
```

### Start Fab Lab TV

```bash
npm start
```

You should see something like:

```text
FabLabTV is running
TV screen:    http://localhost:3000/screen
Staff remote: http://localhost:3000/remote
Status:       http://localhost:3000/api/status
```

---

## First-time setup

After starting the server, open the Remote screen:

```text
http://localhost:3000/remote
```

Then go through these setup steps.

### 1. Add staff

Add at least one staff member with a photo and profile text. Then choose who is on call.

### 2. Upload local videos

Upload local MP4 files from the Video section. These become part of the normal shuffled TV playlist.

### 3. Choose video sources

In the Video section, choose whether the TV should play:

- local uploaded videos
- Fab Academy Highlights
- or both

### 4. Set your weather location

Enter your lab’s location name, latitude, and longitude.

### 5. Set opening hours

Add normal weekly opening hours. Leave closed days empty.

### 6. Add workshops

Add upcoming events or workshops that visitors should know about.

### 7. Add local messages

Add announcements, temporary notices, closures, or reminders. Add an image if useful.

### 8. Upload your lab logo

Upload your logo in the Branding section.

### 9. Choose language

Select the language used for system labels on the TV screen.

After this, daily use should happen entirely from Remote. No coding required.

---

## URLs

| Page | URL |
| --- | --- |
| TV screen | `http://localhost:3000/screen` |
| Remote control | `http://localhost:3000/remote` |
| Status API | `http://localhost:3000/api/status` |

If another device on the same network needs access, replace `localhost` with the computer’s local IP address.

Example:

```text
http://192.168.1.50:3000/remote
```

---

## Project folders

```text
branding/              Logos and branding assets
client/                Browser UI for /screen and /remote
data/                  Settings, catalogs, cache, and local data
integrations/          Public API integrations
server/                Express and Socket.IO backend
staff/                 Uploaded staff photos
videos/                Uploaded local videos
```

Useful files:

```text
data/localPulse.json           Local Pulse data
data/i18n.json                 Editable language labels
data/fabAcademyHighlights.json Fab Academy highlight catalog
data/videoSources.json         Video source settings
branding/fablab.png            Default logo
branding/logo.png              Uploaded custom logo, if present
```

---

## Deployment notes

For a simple lab installation:

1. Connect a computer to the TV with HDMI.
2. Start Fab Lab TV with `npm start`.
3. Open `/screen` on the TV display.
4. Open `/remote` on the laptop screen.
5. Put the TV browser in fullscreen mode.

Fab Lab TV is designed for a local network. It is not intended to be exposed directly to the public internet without additional security.

---

## Roadmap ideas

Possible future features:

- map-based weather location picker
- optional local caching of streamed videos
- better video preview tools in Remote
- visitor statistics
- machine usage statistics
- more Global Pulse sources
- more language refinements
- per-lab themes

---

## Community feedback

Fab Lab TV is currently maintained by the original author.

Fab Labs are welcome to download, use, remix, and suggest improvements. For now, please open an issue with ideas, bugs, or feature requests before sending major code changes.

---

## License

MIT License.

---

## Credits

Created by **Andri Sæmundsson** at **Fab Lab Reykjavík** for the **Fab Lab Community**.

Made with ❤️ in Reykjavík for the global Fab Lab community.


## Weather refresh

Weather data is refreshed once per hour and cached in `data/weatherCache.json` so Fab Lab TV keeps showing the last good forecast if Open-Meteo is temporarily unavailable.
