
# GAA Coach Hub - App Store Release Checklist

## 📱 App Store Submission Requirements

### 1. **Apple App Store (iOS)**

#### Required Assets
- [ ] App Icon (1024x1024px) - High resolution, no transparency
- [ ] Screenshots (multiple sizes required):
  - iPhone 6.7" (1290 x 2796 pixels) - iPhone 15 Pro Max
  - iPhone 6.5" (1242 x 2688 pixels) - iPhone 11 Pro Max
  - iPhone 5.5" (1242 x 2208 pixels) - iPhone 8 Plus
  - iPad Pro 12.9" (2048 x 2732 pixels)
- [ ] App Preview Videos (optional but recommended)

#### App Information
- [ ] App Name: "GAA Coach Hub"
- [ ] Subtitle: "Team Management for GAA Coaches"
- [ ] Description: Write compelling description highlighting features
- [ ] Keywords: "GAA, hurling, camogie, coaching, team management, stats"
- [ ] Support URL: Your website or support page
- [ ] Marketing URL: Your marketing website
- [ ] Privacy Policy URL: **REQUIRED** - See privacy-policy.md

#### App Store Connect Setup
1. Create app in App Store Connect (https://appstoreconnect.apple.com)
2. Get your App ID and Team ID
3. Update `eas.json` with your Apple credentials
4. Set up App Store Connect API key for automated submissions

#### Build & Submit Commands
```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to Expo account
eas login

# Configure project
eas build:configure

# Build for iOS (production)
eas build --platform ios --profile production

# Submit to App Store (after build completes)
eas submit --platform ios --latest
```

---

### 2. **Google Play Store (Android)**

#### Required Assets
- [ ] App Icon (512x512px) - High resolution PNG
- [ ] Feature Graphic (1024 x 500 pixels)
- [ ] Screenshots (minimum 2, up to 8):
  - Phone: 16:9 or 9:16 aspect ratio
  - 7-inch tablet (optional)
  - 10-inch tablet (optional)
- [ ] Promo Video (YouTube link, optional)

#### App Information
- [ ] App Name: "GAA Coach Hub"
- [ ] Short Description (80 chars): "Team management for GAA coaches"
- [ ] Full Description: Detailed feature list
- [ ] Category: Sports
- [ ] Content Rating: Complete questionnaire
- [ ] Privacy Policy URL: **REQUIRED** - See privacy-policy.md

#### Google Play Console Setup
1. Create app in Google Play Console (https://play.google.com/console)
2. Complete store listing
3. Set up app signing
4. Create service account for automated submissions
5. Download JSON key and save as `google-play-service-account.json`

#### Build & Submit Commands
```bash
# Build for Android (production - APK for testing)
eas build --platform android --profile production

# Build for Android (production - AAB for Play Store)
eas build --platform android --profile production-aab

# Submit to Google Play (after build completes)
eas submit --platform android --latest
```

---

## 🔐 Required Legal Documents

### Privacy Policy
Create a privacy policy that covers:
- What data you collect (user accounts, team data, match stats)
- How you use the data (app functionality, analytics)
- Data storage and security (backend server location)
- Third-party services (Better Auth, image storage)
- User rights (data access, deletion requests)
- Contact information

**Host your privacy policy online and add the URL to both app stores.**

### Terms of Service (Optional but Recommended)
- User responsibilities
- Acceptable use policy
- Liability limitations
- Account termination conditions

---

## 🚀 Pre-Release Testing Checklist

### Functionality Testing
- [ ] User registration and login works
- [ ] Google OAuth works on iOS
- [ ] Apple OAuth works on iOS
- [ ] Team creation and management
- [ ] Player management (add, edit, delete, injury toggle)
- [ ] Fixture creation and editing
- [ ] Lineup builder works correctly
- [ ] Match tracker captures events
- [ ] Match reports generate correctly
- [ ] Training sessions and attendance
- [ ] Image uploads (crests, jerseys)
- [ ] Offline functionality (match tracker)
- [ ] Data syncs correctly when back online

### Platform-Specific Testing
- [ ] Test on multiple iOS devices (iPhone 12, 13, 14, 15)
- [ ] Test on iPad
- [ ] Test on multiple Android devices (various screen sizes)
- [ ] Test on Android tablets
- [ ] Dark mode works correctly
- [ ] Notch/safe area handling on all devices
- [ ] Keyboard behavior (doesn't cover inputs)
- [ ] Navigation works smoothly

### Performance Testing
- [ ] App launches quickly (< 3 seconds)
- [ ] No memory leaks
- [ ] Smooth scrolling in lists
- [ ] Images load efficiently
- [ ] No crashes or freezes
- [ ] Battery usage is reasonable

---

## 📝 App Store Optimization (ASO)

### Keywords Research
Research and include relevant keywords:
- GAA, hurling, camogie
- coaching, coach, team management
- sports stats, match tracker
- training, lineup, squad

### Screenshots Strategy
Create compelling screenshots showing:
1. Team dashboard (main screen)
2. Player management
3. Lineup builder (pitch view)
4. Match tracker in action
5. Match report with stats
6. Training session management

Add text overlays highlighting key features.

---

## 🔧 Configuration Updates Needed

### Update `app.json`
Replace placeholder values:
- `owner`: Your Expo username
- `extra.eas.projectId`: Your EAS project ID (get from `eas build:configure`)

### Update `eas.json`
Replace placeholder values in submit section:
- iOS: `appleId`, `ascAppId`, `appleTeamId`
- Android: Path to service account JSON

---

## 📊 Post-Launch Monitoring

### Analytics Setup (Recommended)
Consider adding analytics to track:
- User engagement
- Feature usage
- Crash reports
- Performance metrics

Popular options:
- Firebase Analytics
- Sentry (error tracking)
- Amplitude
- Mixpanel

### User Feedback
- Monitor app store reviews
- Set up support email
- Create feedback mechanism in app
- Plan regular updates based on feedback

---

## 🎯 Launch Strategy

1. **Soft Launch** (Recommended)
   - Release to limited audience first
   - Use TestFlight (iOS) and Internal Testing (Android)
   - Gather feedback and fix critical issues

2. **Phased Rollout**
   - Release to 10% of users first
   - Monitor crash rates and reviews
   - Gradually increase to 100%

3. **Marketing**
   - Announce on social media
   - Contact GAA clubs directly
   - Create demo videos
   - Offer free trial period

---

## 📞 Support & Resources

### Expo Documentation
- EAS Build: https://docs.expo.dev/build/introduction/
- EAS Submit: https://docs.expo.dev/submit/introduction/
- App Store Guidelines: https://docs.expo.dev/submit/ios/

### App Store Guidelines
- Apple: https://developer.apple.com/app-store/review/guidelines/
- Google: https://play.google.com/about/developer-content-policy/

### Need Help?
- Expo Forums: https://forums.expo.dev/
- Expo Discord: https://chat.expo.dev/

---

## ✅ Final Checklist Before Submission

- [ ] All features tested and working
- [ ] No console errors or warnings
- [ ] Privacy policy published online
- [ ] App icons and screenshots ready
- [ ] App Store Connect / Play Console configured
- [ ] EAS credentials configured
- [ ] Production build tested on real devices
- [ ] Backend is stable and production-ready
- [ ] Support email/website set up
- [ ] Marketing materials prepared

---

**Good luck with your launch! 🚀**
