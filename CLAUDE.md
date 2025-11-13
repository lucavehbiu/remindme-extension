# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A privacy-focused Chrome extension (Manifest v3) that allows users to set reminders for web content via right-click context menus. Built with vanilla JavaScript and Tailwind CSS. All data is stored locally in the browser by default, with optional email notifications via Resend API for long-term reminders.

## Development Commands

### Build Commands
- `npm run build` - Full build: creates dist directory, compiles Tailwind CSS, and copies all necessary files
- `npm run build:css` - Build Tailwind CSS only (outputs to dist/output.css)
- `npm run watch` - Watch mode for CSS development
- `npm run dev` - Build and watch in development mode

### Loading the Extension
After building, load the extension in Chrome:
1. Navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `dist` directory

## Architecture

### Core Components

**background.js** (Service Worker)
- Creates context menu items on installation
- Handles context menu clicks and stores pending reminders in `chrome.storage.local`
- Opens popup window for time selection
- Manages `chrome.alarms` API for scheduled reminders
- Triggers browser notifications when alarms fire
- Optionally sends email notifications via Resend API (https://api.resend.com/emails)
- Handles notification clicks to open the saved URL

**popup.html/popup.js** (Main UI)
- Two-view system: new reminder creation and reminders history
- Uses Flatpickr for date/time selection with custom Material Blue theme
- Quick reminder buttons: 30min, 1h, Tomorrow (1440min), Next Week (10080min)
- Optional description field for additional context
- Optional email field with autocomplete (stores last 5 used emails)
- Stores reminder history (last 100 reminders) in local storage
- Success screen displayed after setting reminder, auto-closes after 3 seconds

**manifest.json**
- Chrome Extension Manifest v3
- Permissions: storage, activeTab, contextMenus, alarms, notifications
- Host permissions: Limited to `https://api.resend.com/emails` (for optional email feature)
- Service worker runs background.js as a module

### Data Flow

1. User right-clicks on text, image, or link → context menu appears
2. Click "Remind me about this" → background.js stores `pendingReminder` in local storage
3. Background opens popup window
4. User selects time/date and optional email → creates alarm with data
5. Alarm data stored in `chrome.storage.local` with key `test_reminder_data`
6. When alarm fires → notification sent (browser + optional email)
7. Reminder saved to `reminderHistory` array (max 100 items)

### Storage Keys

- `pendingReminder` - Temporary storage for content selected via context menu
- `test_reminder_data` - Stores alarm data for the scheduled reminder
- `reminderHistory` - Array of past reminders (capped at 100)
- `lastUsedEmail` - Last email address used (for convenience)
- `savedEmails` - Array of up to 5 recently used email addresses

### Email Notifications

The extension includes optional email backup for long-term reminders:
- Uses Resend API (https://api.resend.com/emails)
- API key hardcoded in background.js line 112 (re_Se7TVdSp_2fMCw9eRaKBsbmqQzUPohfXh)
- Only sent if user provides email address
- Email includes formatted content, optional notes, and link to original page
- Minimal host_permissions scope for privacy

## Privacy-First Design

This extension is explicitly designed to be 100% private by default:
- All data stored in `chrome.storage.local` (browser local storage)
- No analytics, tracking, or external API calls (except optional email feature)
- No account/login required
- Email notifications are opt-in and clearly labeled as optional
- Open source for auditability

See PRIVACY.md for the full privacy policy.

## Styling

- Uses Tailwind CSS 3.3.5 for styling
- Custom configuration in `tailwind.config.js` with Inter font family
- CSS source: `src/styles.css`
- Compiled output: `dist/output.css`
- Flatpickr date picker styled with `material_blue.css` theme
- Gradient backgrounds and soft shadows for modern UI

## Important Notes

- Always rebuild (`npm run build`) before testing changes in Chrome
- The `dist` directory is what gets loaded into Chrome (not the root directory)
- Reminder alarms persist across browser restarts
- Extension uses Chrome Alarms API (not setTimeout) for reliability
- Icons are stored in `icons/` directory (16px, 48px, 128px variants)
