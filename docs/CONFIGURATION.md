# Configuration

FabLabTV deliberately uses editable JSON files instead of a database.

## Main files

```text
data/config.json                 General station settings.
data/localPulse.json             Weather, opening hours, local messages, workshops.
data/i18n.json                   Language choice and editable system labels.
data/videoSources.json           Local videos and Fab Academy highlight stream toggles.
data/fabAcademyHighlights.json   Static catalog of curated Fab Academy highlight videos.
data/staffProfiles.json          Saved per-staff text.
```

Runtime-only generated files:

```text
data/runtime.json                Current selected staff/video state.
data/globalPulseCache.json       Latest automatic Global Pulse fetch.
```

These generated files are ignored by Git.

## Branding

Replace:

```text
branding/logo.png (custom upload) or branding/fablab.png (default)
```

with your lab's transparent PNG logo.

## Language labels

The Remote page can change the active language and edit translated system labels.
Custom Local Pulse messages and workshop descriptions are not translated automatically; staff-written text stays exactly as written.
