# GAA Coach Hub

A comprehensive team management app for GAA clubs, built with Expo Router and React Native.

## 🚀 Backend Integration Status

✅ **FULLY INTEGRATED** - All backend endpoints are connected and working.

### Backend URL
- **Production:** `https://8wja63artu7vtupgg8ypqsaw65kcpgay.app.specular.dev`
- Configured in `app.json` under `expo.extra.backendUrl`

### Authentication
- ✅ Email/Password authentication via Better Auth
- ✅ Google OAuth (web popup flow)
- ✅ Apple OAuth (iOS native + web popup)
- ✅ Session persistence with Bearer tokens
- ✅ Auto-refresh on app focus
- ✅ Proper auth guards on all protected routes

### API Integration

#### Core Features
- ✅ **Clubs Management** - Create, read, update clubs
- ✅ **Teams Management** - Full CRUD with image uploads (crest, jersey)
- ✅ **Players Management** - CRUD, reordering, injury tracking, position groups
- ✅ **Fixtures Management** - Scheduling, lineup creation, match tracking
- ✅ **Training Sessions** - Session management and attendance tracking
- ✅ **Match Tracker** - Live event recording with offline support
- ✅ **Reports** - Team and player analytics

#### Recent Backend Improvements (Integrated)
1. ✅ **List Endpoints** - Return 200 with `[]` for empty collections (not 404)
2. ✅ **Player Reorder** - `PUT /api/teams/:teamId/players/reorder` with batch updates
3. ✅ **Match State Defaults** - Always returns defaults (NOT_STARTED, 0 scores)
4. ✅ **Squad Status** - `GET /api/fixtures/:fixtureId/squad-status` for readiness checks
5. ✅ **Error Standards** - 400 for invalid IDs, 401/403 for auth, 404 for missing entities

### API Client Architecture

#### Central API Wrapper (`utils/api.ts`)
```typescript
// Unauthenticated requests
apiGet(endpoint)
apiPost(endpoint, data)
apiPut(endpoint, data)
apiPatch(endpoint, data)
apiDelete(endpoint, data)

// Authenticated requests (auto-adds Bearer token)
authenticatedGet(endpoint)
authenticatedPost(endpoint, data)
authenticatedPut(endpoint, data)
authenticatedPatch(endpoint, data)
authenticatedDelete(endpoint, data)

// File uploads
authenticatedUpload(endpoint, file, fieldName)
```

#### Error Handling
- ✅ User-friendly error messages
- ✅ Network error detection
- ✅ Auth token expiration handling
- ✅ Validation error display
- ✅ Offline mode support with AsyncStorage caching

### Key Screens & Integration

#### Authentication Flow
- `/auth` - Sign in/up with email or OAuth
- `/auth-popup` - OAuth popup handler (web)
- `/auth-callback` - OAuth callback handler

#### Main App Flow
1. **Home** → Auto-redirects to team dashboard or team selection
2. **Team Dashboard** → Shows team stats, quick actions, upcoming schedule
3. **Players** → List, add, edit, reorder, injury tracking
4. **Fixtures** → Create, edit, view fixtures
5. **Lineups** → Build starting 15 + bench, support for placeholders
6. **Match Tracker** → Live event recording with offline sync
7. **Training** → Session management and attendance
8. **Reports** → Analytics and insights

### Data Validation
- ✅ `teamId`, `fixtureId`, `playerId` validated before API calls
- ✅ Blocking UI shown for missing required IDs
- ✅ No `/undefined` API calls
- ✅ Proper error messages for invalid UUIDs

### Offline Support
- ✅ Match squads cached in AsyncStorage
- ✅ Match events queued for sync when online
- ✅ Offline mode detection with user notification
- ✅ Auto-sync on reconnection

### UI/UX Standards
- ✅ **No Alert.alert()** - All confirmations use custom Modal components
- ✅ **Loading States** - ActivityIndicator shown during API calls
- ✅ **Error States** - Retry buttons and helpful error messages
- ✅ **Empty States** - Friendly messages with action buttons
- ✅ **Optimistic Updates** - UI updates immediately, reverts on error

### Testing Checklist
- ✅ Sign up / Sign in flows
- ✅ Create club → Create team → Add players
- ✅ Player reordering (depth chart)
- ✅ Injury toggle (moves to bottom)
- ✅ Create fixture → Build lineup → Start match
- ✅ Match event recording
- ✅ Training session creation and attendance
- ✅ Image uploads (crest, jersey)
- ✅ Team color customization
- ✅ Offline mode handling

## 🔐 Demo Credentials

For testing, you can create a new account or use:
- **Email:** test@example.com
- **Password:** Test123!

## 📱 Running the App

```bash
# Install dependencies
npm install

# Start Expo dev server
npx expo start

# Run on iOS
npx expo start --ios

# Run on Android
npx expo start --android

# Run on Web
npx expo start --web
```

## 🏗️ Project Structure

```
app/
├── (tabs)/           # Main app tabs (home, profile)
├── auth.tsx          # Authentication screen
├── team-dashboard/   # Team management
├── players/          # Player management
├── lineups/          # Lineup builder
├── match-tracker-live/ # Live match tracking
├── training-sessions/ # Training management
└── ...

components/
├── IconSymbol.tsx    # Cross-platform icons
├── ScreenState.tsx   # Loading/error/empty states
├── FixturePicker.tsx # Fixture selection modal
└── ...

contexts/
├── AuthContext.tsx   # Authentication state
├── ThemeContext.tsx  # Theme management
└── WidgetContext.tsx # Widget state

utils/
├── api.ts           # Central API client
├── colorParser.ts   # Color validation
└── errorLogger.ts   # Error tracking

types/
└── index.ts         # TypeScript definitions
```

## 🎨 Design System

- **Colors:** Black/white base with red accent (#FF0000)
- **Buttons:** Red outline style for primary actions
- **Typography:** System fonts with bold headings
- **Icons:** SF Symbols (iOS) / Material Icons (Android)
- **Spacing:** 8px grid system

## 🔧 Configuration

### Backend URL
Set in `app.json`:
```json
{
  "expo": {
    "extra": {
      "backendUrl": "https://8wja63artu7vtupgg8ypqsaw65kcpgay.app.specular.dev"
    }
  }
}
```

### Better Auth
Configured in `lib/auth.ts` with:
- Email/password provider
- Google OAuth
- Apple OAuth
- Expo client plugin for native support

## 📝 Notes

- All API calls use the central `utils/api.ts` wrapper
- Never hardcode backend URLs - always read from `Constants.expoConfig.extra.backendUrl`
- Use custom Modal components instead of Alert.alert() for web compatibility
- Implement proper loading, error, and empty states on all screens
- Validate IDs before making API calls to prevent `/undefined` errors

---

Made with 💙 using [Natively.dev](https://natively.dev)
