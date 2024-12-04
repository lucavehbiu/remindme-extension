# Remind Me - Smart Web Reminders

A Chrome extension that lets you set reminders for any web content with just a right-click. Perfect for remembering to follow up on articles, images, or any web content later.

## Features

- 🖱️ Right-click on any text or image to set a reminder
- ⏰ Quick reminder presets (30min, 1h, tomorrow, next week)
- 📅 Custom date/time picker
- 📧 Optional email notifications via Resend
- 🔔 Chrome notifications when reminders are due
- 📱 Modern, clean UI with Tailwind CSS

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

- `manifest.json`: Extension configuration
- `popup.html/js`: The reminder creation interface
- `contentScript.js`: Handles right-click selection
- `background.js`: Manages alarms and notifications

## Email Notifications

To enable email notifications:

1. Sign up for a [Resend](https://resend.com) account
2. Get your API key
3. Add your Resend API key to the extension's settings

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - feel free to use this project however you'd like!