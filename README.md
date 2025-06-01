# Miss Minutes - Focus To-Do Chrome Extension

A productivity Chrome Extension combining a customizable Pomodoro timer with a to-do list, focus analytics, and white noise features.

## Features

### 🍅 Pomodoro Timer

- Customizable focus and break durations
- Visual progress indicator with circular timer
- Background timer that continues even when popup is closed
- Keyboard shortcuts for quick control
- Audio notifications for timer completion

### ✅ Task Management

- Add, edit, and delete tasks
- Mark tasks as complete
- Task counter and progress tracking
- Clean, intuitive interface

### 📊 Analytics Dashboard

- Daily focus time tracking
- Session count monitoring
- Weekly focus statistics
- 7-day trend chart visualization
- Historical data retention

### 🎵 White Noise Features

- 13 ambient sound options including:
  - Rain, Ocean Shore, Fire Burning
  - Coffee Shop, Library, Classroom
  - Wind sounds, Ticking sounds
  - Nature and wilderness sounds
- Volume control
- Auto-play with timer sessions
- Persistent settings

### 🎨 Theme Support

- Light and dark mode themes
- Automatic theme persistence
- Smooth transitions
- Modern, responsive design

## Installation

### From Chrome Web Store

1. Visit the Chrome Web Store (link will be added after publication)
2. Click "Add to Chrome"
3. Pin the extension for easy access

### Manual Installation (Development)

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The extension will appear in your toolbar

## Usage

### Timer

- Click the timer view to start your focus session
- Use Space bar to start/pause timer
- Press 'R' to reset timer
- Switch between Focus, Short Break, and Long Break modes

### Tasks

- Add tasks using the "Add Task" button
- Click tasks to mark them complete
- Tasks persist across browser sessions

### Analytics

- View your daily and weekly focus statistics
- Track your progress with the 7-day chart
- Monitor session counts and trends

### White Noise

- Select from 13 ambient sound options
- Adjust volume with the slider
- Sounds auto-play when timer starts
- Toggle on/off as needed

### Keyboard Shortcuts

- `Space` - Start/Pause timer
- `Ctrl+R` - Reset timer
- `1` - Switch to Timer view
- `2` - Switch to Tasks view
- `3` - Switch to Analytics view
- `Ctrl+S` - Open Settings
- `Ctrl+T` - Toggle theme

## Technical Details

### Permissions

- `storage` - For saving user preferences and data
- `alarms` - For background timer functionality
- `notifications` - For timer completion alerts

### Browser Compatibility

- Chrome 88+ (Manifest V3 support required)
- Edge 88+ (Chromium-based)

### Data Storage

All data is stored locally using Chrome's storage API. No data is sent to external servers.

## Development

### Project Structure

```
miss-minutes/
├── manifest.json          # Extension manifest
├── popup.html            # Main popup interface
├── popup.js              # Main application controller
├── timer.js              # Timer functionality
├── tasks.js              # Task management
├── analytics.js          # Analytics and charting
├── theme.js              # Theme management
├── background.js         # Background service worker
├── styles.css            # All styling
├── audio/                # Sound files
├── images/               # Extension icons
├── font/                 # Custom fonts
└── icons/                # UI icons
```

### Key Features Implementation

- **Timer**: Uses Chrome alarms API for accurate background timing
- **Analytics**: HTML5 Canvas for chart rendering
- **White Noise**: HTML5 Audio API with loop and volume control
- **Storage**: Chrome storage.local for data persistence
- **Themes**: CSS custom properties for dynamic theming

## Version History

### Version 1.0.0

- Initial release
- Pomodoro timer with customizable durations
- Task management system
- Focus analytics with 7-day chart
- 13 white noise options
- Light/dark theme support
- Keyboard shortcuts
- Background timer functionality

## Privacy Policy

Miss Minutes does not collect, store, or transmit any personal data to external servers. All user data (tasks, settings, analytics) is stored locally on your device using Chrome's storage API.

## Support

For issues, feature requests, or questions:

- Create an issue on GitHub
- Contact: [Your contact information]

## License

MIT License - see LICENSE file for details

## Credits

- Developed by [Your Name]
- Audio files: [Attribution if needed]
- Icons: [Attribution if needed]
