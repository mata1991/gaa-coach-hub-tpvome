
# Quick Reference - Release Commands

## 🚀 One-Time Setup

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to Expo
eas login

# Configure project (creates eas.json)
eas build:configure

# Link to EAS project
eas init
```

## 📱 iOS Commands

```bash
# Build for iOS (production)
eas build --platform ios --profile production

# Check build status
eas build:list --platform ios

# Submit to App Store (after build completes)
eas submit --platform ios --latest

# Or submit specific build
eas submit --platform ios --id <build-id>

# View build logs
eas build:view <build-id>
```

## 🤖 Android Commands

```bash
# Build APK (for testing)
eas build --platform android --profile production

# Build AAB (for Play Store - REQUIRED)
eas build --platform android --profile production-aab

# Check build status
eas build:list --platform android

# Submit to Google Play (after build completes)
eas submit --platform android --latest

# Or submit specific build
eas submit --platform android --id <build-id>
```

## 🔄 Update App (New Version)

### 1. Update version numbers in `app.json`:

```json
{
  "expo": {
    "version": "1.1.0",  // Increment this (1.0.0 → 1.1.0)
    "ios": {
      "buildNumber": "2"  // Increment this (1 → 2)
    },
    "android": {
      "versionCode": 2  // Increment this (1 → 2)
    }
  }
}
```

### 2. Build and submit:

```bash
# iOS
eas build --platform ios --profile production
eas submit --platform ios --latest

# Android
eas build --platform android --profile production-aab
eas submit --platform android --latest
```

## 🧪 Testing Builds

```bash
# Build for internal testing (iOS)
eas build --platform ios --profile preview

# Build for internal testing (Android)
eas build --platform android --profile preview

# Install on device
# iOS: Download from build URL, install via TestFlight
# Android: Download APK from build URL, install directly
```

## 📊 Monitoring

```bash
# List all builds
eas build:list

# View specific build details
eas build:view <build-id>

# View build logs
eas build:view <build-id> --logs

# Check project status
eas project:info
```

## 🔐 Credentials Management

```bash
# View credentials
eas credentials

# Configure iOS credentials
eas credentials --platform ios

# Configure Android credentials
eas credentials --platform android

# Reset credentials (if needed)
eas credentials --platform ios --clear
```

## 🐛 Troubleshooting

```bash
# Clear local cache
rm -rf node_modules
npm install

# Clear Expo cache
expo start --clear

# Reset EAS configuration
rm eas.json
eas build:configure

# View detailed logs
eas build --platform ios --profile production --verbose
```

## 📦 Local Development

```bash
# Start development server
npm run dev

# Start with tunnel (for testing on physical device)
expo start --tunnel

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run on web
npm run web

# Clear cache and restart
expo start --clear
```

## 🔍 Useful Links

- **EAS Dashboard**: https://expo.dev/accounts/[your-username]/projects
- **App Store Connect**: https://appstoreconnect.apple.com
- **Google Play Console**: https://play.google.com/console
- **Expo Documentation**: https://docs.expo.dev

## 💡 Tips

1. **Always test on real devices** before submitting
2. **Increment version numbers** for every release
3. **Keep build logs** for debugging
4. **Test both iOS and Android** separately
5. **Submit to internal testing first** before production
6. **Monitor crash reports** after release
7. **Respond to user reviews** promptly

## 🚨 Common Issues

### "Build failed: Provisioning profile error"
- Check Apple Developer account is active
- Verify Team ID in app.json
- Run: `eas credentials --platform ios`

### "Submission failed: Invalid bundle"
- Ensure version/build numbers are incremented
- Check bundle identifier matches App Store Connect

### "Android submission failed: Service account error"
- Verify service account has correct permissions in Play Console
- Check google-play-service-account.json path

### "App rejected: Missing privacy policy"
- Add privacy policy URL to app.json
- Ensure URL is publicly accessible
- Update in App Store Connect / Play Console

---

**Save this file for quick reference during releases!**
