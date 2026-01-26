
# GAA Coach Hub

A production-ready native iOS and Android app for GAA clubs (hurling and camogie) that combines team selection, match stats capture, training management, and player development dashboards.

## 🚀 Features

- **Team Management**: Create and manage multiple teams, seasons, and competitions
- **Player Management**: Track players, positions, injuries, and development notes
- **Match Tracker**: Offline-first match event capture with real-time stats
- **Lineup Builder**: Visual pitch layout for team selection with drag-and-drop
- **Training Sessions**: Schedule training, track attendance, and manage drills
- **Match Reports**: Comprehensive statistics and analytics with export options
- **Season Dashboard**: Track performance trends across competitions
- **Multi-User Support**: Role-based access (Club Admin, Coach, Stats Person, Player)

## 📱 Tech Stack

- **Frontend**: React Native + Expo 54
- **Navigation**: Expo Router (file-based routing)
- **Authentication**: Better Auth (email/password + Google + Apple OAuth)
- **Backend**: Fastify + PostgreSQL (via Specular)
- **State Management**: React Context + Hooks
- **Offline Support**: Custom offline sync for match tracking

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+ and npm
- Expo CLI: `npm install -g expo-cli eas-cli`
- iOS: Xcode 15+ (Mac only)
- Android: Android Studio

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd gaa-coach-hub

# Install dependencies
npm install

# Start development server
npm run dev

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run on web
npm run web
```

## 🏗️ Project Structure

```
├── app/                          # Expo Router screens
│   ├── (tabs)/                   # Tab navigation screens
│   ├── auth.tsx                  # Authentication screen
│   ├── team-dashboard/           # Team management
│   ├── players/                  # Player management
│   ├── lineups/                  # Lineup builder
│   ├── match-tracker-live/       # Match event capture
│   ├── match-report/             # Match statistics
│   └── training-sessions/        # Training management
├── components/                   # Reusable UI components
├── contexts/                     # React Context providers
├── hooks/                        # Custom React hooks
├── utils/                        # Utility functions
├── types/                        # TypeScript type definitions
├── constants/                    # App constants and presets
├── styles/                       # Shared styles
└── backend/                      # Backend API (Fastify + Drizzle ORM)
```

## 🔐 Authentication

The app uses Better Auth with support for:
- Email/password authentication
- Google OAuth (iOS & Android)
- Apple Sign In (iOS)

Authentication files are auto-generated using the `setup_auth` tool.

## 📊 Database Schema

Key entities:
- **Clubs**: Organization level
- **Teams**: Multiple teams per club
- **Players**: Team roster with positions and stats
- **Fixtures**: Matches with opponent, venue, date
- **Match Events**: Timestamped events (goals, points, turnovers, etc.)
- **Training Sessions**: Scheduled training with attendance
- **Lineups**: Starting 15 + subs for each fixture

## 🚀 Building for Production

### iOS (App Store)

```bash
# Configure EAS
eas build:configure

# Build for iOS
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios --latest
```

### Android (Google Play)

```bash
# Build APK (for testing)
eas build --platform android --profile production

# Build AAB (for Play Store)
eas build --platform android --profile production-aab

# Submit to Google Play
eas submit --platform android --latest
```

See `app-store-preparation.md` for detailed release checklist.

## 📝 Configuration

### Environment Variables

Update `app.json`:
- `expo.extra.backendUrl`: Your production backend URL
- `expo.ios.bundleIdentifier`: Your iOS bundle ID
- `expo.android.package`: Your Android package name
- `expo.owner`: Your Expo username

Update `eas.json`:
- iOS: Apple ID, App Store Connect ID, Team ID
- Android: Service account JSON path

## 🧪 Testing

```bash
# Run linter
npm run lint

# Test on physical device (recommended)
# iOS: Use Expo Go or development build
# Android: Use Expo Go or development build
```

## 📱 Platform-Specific Files

The app uses platform-specific files for iOS optimizations:
- `app/(tabs)/_layout.ios.tsx`: Native iOS tabs
- `app/(tabs)/profile.ios.tsx`: iOS-specific profile screen
- `components/IconSymbol.ios.tsx`: SF Symbols for iOS

## 🐛 Debugging

```bash
# View frontend logs
# Check console in Expo Dev Tools

# View backend logs
# Check Specular dashboard or backend logs
```

## 📄 License

[Your License Here]

## 👥 Contributors

[Your Team/Name]

## 📞 Support

For support, email support@gaacoach.hub or visit [your support website]

---

**Built with ❤️ for GAA coaches**
