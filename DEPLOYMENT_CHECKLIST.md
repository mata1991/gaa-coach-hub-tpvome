
# GAA Coach Hub - Deployment Checklist

Use this checklist to ensure you've completed all steps before releasing to production.

## ✅ Pre-Release Checklist

### 1. Code & Testing
- [ ] All features implemented and working
- [ ] No console errors or warnings in production build
- [ ] Tested on real iOS device (iPhone)
- [ ] Tested on real Android device
- [ ] Tested on iPad (if supporting tablets)
- [ ] Dark mode works correctly
- [ ] All navigation flows work
- [ ] Authentication works (email, Google, Apple)
- [ ] Offline functionality tested (match tracker)
- [ ] Image uploads work
- [ ] All API endpoints tested
- [ ] Backend is stable and production-ready

### 2. Configuration Files

#### `app.json`
- [ ] `name`: "GAA Coach Hub"
- [ ] `slug`: "gaa-coach-hub"
- [ ] `version`: "1.0.0"
- [ ] `ios.bundleIdentifier`: "com.gaacoach.hub" (or your chosen ID)
- [ ] `ios.buildNumber`: "1"
- [ ] `android.package`: "com.gaacoach.hub" (or your chosen package)
- [ ] `android.versionCode`: 1
- [ ] `extra.backendUrl`: Your production backend URL
- [ ] `owner`: Your Expo username
- [ ] `extra.eas.projectId`: Your EAS project ID
- [ ] Camera and photo permissions configured

#### `eas.json`
- [ ] Production profile configured
- [ ] iOS submit credentials added (appleId, ascAppId, appleTeamId)
- [ ] Android submit credentials added (serviceAccountKeyPath)

### 3. Legal & Privacy
- [ ] Privacy policy written and reviewed
- [ ] Privacy policy published online (publicly accessible URL)
- [ ] Privacy policy URL added to app.json
- [ ] Terms of service written (optional but recommended)
- [ ] Support email set up and monitored
- [ ] Contact information ready for app stores

### 4. App Store Assets

#### iOS (App Store Connect)
- [ ] App icon (1024x1024px, PNG, no transparency)
- [ ] iPhone 6.7" screenshots (1290 x 2796px, minimum 3)
- [ ] iPhone 6.5" screenshots (1242 x 2688px, minimum 3)
- [ ] iPhone 5.5" screenshots (1242 x 2208px, minimum 3)
- [ ] iPad Pro 12.9" screenshots (2048 x 2732px, minimum 3)
- [ ] App preview video (optional, 15-30 seconds)
- [ ] App description written (4000 chars max)
- [ ] Keywords researched (100 chars max)
- [ ] Promotional text written (170 chars max)
- [ ] App subtitle written
- [ ] Support URL ready
- [ ] Marketing URL ready (optional)

#### Android (Google Play Console)
- [ ] App icon (512x512px, PNG with alpha)
- [ ] Feature graphic (1024 x 500px, PNG or JPEG)
- [ ] Phone screenshots (minimum 2, 16:9 or 9:16 aspect ratio)
- [ ] 7-inch tablet screenshots (optional)
- [ ] 10-inch tablet screenshots (optional)
- [ ] Short description (80 chars)
- [ ] Full description (4000 chars)
- [ ] Promo video URL (optional, YouTube)
- [ ] Category selected (Sports)
- [ ] Tags added

### 5. Developer Accounts
- [ ] Apple Developer account active ($99/year)
- [ ] Google Play Developer account active ($25 one-time)
- [ ] Expo account created (free)
- [ ] Apple Team ID obtained
- [ ] App Store Connect app created
- [ ] App Store Connect App ID obtained
- [ ] Google Play Console app created
- [ ] Google Play service account created
- [ ] Service account JSON downloaded
- [ ] Service account permissions granted in Play Console

### 6. App Store Compliance

#### iOS
- [ ] Privacy policy URL added
- [ ] Privacy practices questionnaire completed
- [ ] Content rights confirmed
- [ ] Age rating appropriate
- [ ] Export compliance completed (ITSAppUsesNonExemptEncryption: false)
- [ ] Demo account provided (if login required)
- [ ] App review notes written (if needed)

#### Android
- [ ] Privacy policy URL added
- [ ] Data safety form completed
- [ ] Content rating questionnaire completed
- [ ] App access information provided
- [ ] Demo account provided (if login required)
- [ ] Target audience selected
- [ ] News app declaration (if applicable)

### 7. Build & Submit

#### iOS
- [ ] EAS CLI installed (`npm install -g eas-cli`)
- [ ] Logged into Expo (`eas login`)
- [ ] Project configured (`eas build:configure`)
- [ ] Production build created (`eas build --platform ios --profile production`)
- [ ] Build completed successfully
- [ ] Build tested on real device
- [ ] Submitted to App Store (`eas submit --platform ios --latest`)
- [ ] Submission completed in App Store Connect
- [ ] Screenshots uploaded
- [ ] App information filled out
- [ ] Submitted for review

#### Android
- [ ] Production AAB build created (`eas build --platform android --profile production-aab`)
- [ ] Build completed successfully
- [ ] Build tested on real device
- [ ] Submitted to Google Play (`eas submit --platform android --latest`)
- [ ] Release created in Play Console
- [ ] Screenshots uploaded
- [ ] Store listing completed
- [ ] Released to production

### 8. Post-Launch
- [ ] Monitor crash reports (first 24 hours critical)
- [ ] Respond to user reviews
- [ ] Check analytics and download numbers
- [ ] Prepare marketing materials
- [ ] Announce on social media
- [ ] Contact GAA clubs directly
- [ ] Create demo videos
- [ ] Set up support system
- [ ] Plan first update

---

## 🚨 Critical Reminders

1. **NEVER commit sensitive files**:
   - `google-play-service-account.json`
   - `.env` files
   - Provisioning profiles
   - Certificates

2. **Test on REAL devices**, not just simulators/emulators

3. **Increment version numbers** for every release:
   - `version` in app.json (e.g., 1.0.0 → 1.1.0)
   - `buildNumber` for iOS
   - `versionCode` for Android

4. **Privacy policy is REQUIRED** - both stores will reject without it

5. **Provide test account** if your app requires login

6. **First review takes longest** - be patient (iOS: 24-48 hours, Android: 1-7 days)

7. **Backend must be stable** - app will be rejected if it crashes

---

## 📞 Support Resources

- **Expo Documentation**: https://docs.expo.dev
- **EAS Build Docs**: https://docs.expo.dev/build/introduction/
- **EAS Submit Docs**: https://docs.expo.dev/submit/introduction/
- **Apple App Store Guidelines**: https://developer.apple.com/app-store/review/guidelines/
- **Google Play Policies**: https://play.google.com/about/developer-content-policy/
- **Expo Forums**: https://forums.expo.dev/
- **Expo Discord**: https://chat.expo.dev/

---

## ✨ You're Ready!

Once all items are checked, you're ready to release your app to the world! 🚀

**Good luck with your launch!**

---

**Last Updated**: January 2025
