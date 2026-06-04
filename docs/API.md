# API overview

FabLabTV is primarily controlled from `/remote`, but the backend exposes JSON endpoints used by the UI.

## `GET /api/status`

Returns the complete current TV state, including videos, staff, news, Global Pulse, Local Pulse, language settings, and video source settings.

## Staff

### `POST /api/upload/staff?filename=Name.jpg&statusLabel=On%20Call&note=Text`

Uploads a staff image into `staff/` and stores optional per-staff profile text.

### `PUT /api/staff/:filename/profile`

Updates saved staff text.

### `DELETE /api/staff/:filename`

Removes a staff member image and profile data.

### `POST /api/on-call`

Selects the current on-call staff member.

## Video

### `POST /api/upload/video?filename=video.mp4`

Uploads a local video into `videos/`.

### `PUT /api/video-sources`

Enables or disables local videos and Fab Academy highlight streams.

### `POST /api/video/play-highlight`

Immediately plays one Fab Academy highlight video selected from the Remote search.

### `POST /api/video/next`

Skips to the next randomized playlist video.

### `POST /api/video/pause-toggle`

Pauses or resumes the TV video player.

## Local Pulse

### `PUT /api/local-pulse/weather`

Updates local weather location and coordinates.

### `PUT /api/local-pulse/opening-hours`

Updates weekly opening hours.

### `POST /api/local-pulse/messages`

Adds a custom Local Pulse message, optionally with an uploaded image URL.

### `DELETE /api/local-pulse/messages/:id`

Deletes a Local Pulse message.

### `POST /api/local-pulse/workshops`

Adds an upcoming workshop/event card.

### `DELETE /api/local-pulse/workshops/:id`

Deletes a workshop/event card.

## Language

### `PUT /api/i18n/language`

Sets the active language/locale.

### `PUT /api/i18n/labels/:language`

Overrides editable system labels for a language.
