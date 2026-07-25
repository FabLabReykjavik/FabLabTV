# Changelog

All notable changes to FabLabTV will be documented in this file.

## [0.3.1] - 2026-07-25

### Added

- Added support for manually entering staff display names during upload.
- Added support for Unicode staff display names (e.g. `Magnús`, `Þórður`) independent of image filenames.

### Changed

- Staff display names are now stored separately from image filenames.
- Existing staff display names can now be edited from the Remote UI.

---

## [0.3.0] - 2026-06-16

### Added

#### Location Settings

- Added configurable location settings.
- Added interactive map picker for selecting location coordinates.
- Added automatic timezone detection based on the selected location.

#### Opening Hours

- Added support for multiple opening-hour intervals per day.

#### Content

- Added Neil Project Picks video source.

### Changed

- Reorganized the Remote UI into dashboard cards.
- Moved display visibility controls into dashboard cards.
- Consolidated the Workshop feature into Local Messages.
- Improved Now Playing metadata presentation.

### Fixed

- Added support for replacing existing staff photos without recreating staff entries.

---

## [0.2.0] - 2026-06-08

### Added

#### Slide System

- Added local `slides/` media folder.
- Added slide media library support.
- Added slide inventory and slide count reporting in the Remote UI.
- Added slide playback on the TV screen.
- Added slide-only fallback mode when no videos are available.
- Added configurable slide duration.
- Added configurable slide playback settings.
- Added slide playlist controls in the Remote UI.
- Added slide playlist rotation support.
- Added slide uploads from the Remote UI.

#### PDF Support

- Added PDF slide support.
- Added automatic PDF page rendering and caching.
- Added multi-page PDF support, with each page participating in playlist rotation.
- Added PDF cache generation using Node.js without external software dependencies.
- Added Unicode filename support for uploaded slides and cached media.

#### Playlist Controls

- Added configurable playlist mix ratios.
- Added support for zero playlist ratios.
- Added playlist inventory reporting.
- Added playlist configuration visibility in the Remote UI.
- Added balancing between local videos and Fab Academy Highlights.

#### Screen Layout Controls

- Added clock visibility setting.
- Added Tech News visibility setting.
- Added Staff Card visibility setting.
- Added Global Pulse visibility setting.
- Added Local Pulse visibility setting.
- Added Now Playing visibility setting.
- Added centralized screen layout controls in the Remote UI.

#### Opening Hours

- Added opening-hours-aware playback for Fab Academy Highlights.
- Added after-hours highlight override.
- Added opening hours status display in the Remote UI.
- Added highlight playback status display in the Remote UI.

### Changed

- Moved language preferences into user settings.
- Separated video source defaults from local settings.
- Separated Local Pulse defaults from local settings.
- Separated staff profile defaults from local settings.
- Replaced Remote audio controls with TV-side start screen controls.
- Improved playlist generation and source balancing logic.

### Fixed

- Skip failed video streams instead of interrupting playback.
- Removed deprecated Remote audio API routes.
- Improved handling of local runtime configuration files.
- Preserved Unicode characters in uploaded filenames.

---

## [0.1.0] - 2026-06-04

### Added

- Initial release of FabLabTV.
- Added README improvements and media examples.
- Added default user settings template.

### Changed

- Ignore local user settings and runtime-specific configuration files in Git.