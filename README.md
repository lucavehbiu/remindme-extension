# Remind Me - Smart Web Reminders

A **100% private**, Chrome extension that lets you set reminders for any web content with just a right-click. Perfect for remembering to follow up on articles, images, or any web content later.

## Features

- 🔒 **100% Private** - All data stays on your device, zero external servers
- 🖱️ Right-click on any text or image to set a reminder
- ⏰ Quick reminder presets (30min, 1h, tomorrow, next week)
- 📅 Custom date/time picker with elegant UI
- 🔔 Native browser notifications when reminders are due
- 📝 Add optional notes/descriptions to your reminders
- 📱 Modern, clean UI with Tailwind CSS
- 🚀 Minimal permissions - only what's needed

## Privacy First

Unlike other "save for later" tools, Remind Me is designed with privacy as a core principle:

- ✅ All data stored locally in your browser (`chrome.storage.local`)
- ✅ No external API calls or data transmission
- ✅ No analytics or tracking
- ✅ No account required
- ✅ Open source and auditable
- ✅ Minimal permissions (storage, alarms, notifications, contextMenus, activeTab only)

Read our full [Privacy Policy](PRIVACY.md)

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/remindme-extension.git
   ```

2. Build the extension:
   ```bash
   npm run build
   ```

3. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the `dist` directory

## Development

The extension is built with vanilla JavaScript and Tailwind CSS for simplicity and performance. Key files:

- `manifest.json`: Extension configuration (v3, minimal permissions)
- `popup.html/js`: The reminder creation interface
- `background.js`: Manages context menus, alarms, and notifications
- `PRIVACY.md`: Detailed privacy policy

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - feel free to use this project however you'd like!