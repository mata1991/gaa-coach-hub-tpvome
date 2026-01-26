
# GAA Coach Hub - Complete Release Guide

This guide walks you through releasing your app to the Apple App Store and Google Play Store.

## 📋 Prerequisites Checklist

Before you begin, ensure you have:

- [ ] **Apple Developer Account** ($99/year) - https://developer.apple.com
- [ ] **Google Play Developer Account** ($25 one-time) - https://play.google.com/console
- [ ] **Expo Account** (free) - https://expo.dev
- [ ] **App tested thoroughly** on real iOS and Android devices
- [ ] **Privacy Policy** published online (see privacy-policy.md)
- [ ] **Support email** set up
- [ ] **App icons and screenshots** prepared

---

## 🍎 Part 1: iOS App Store Release

### Step 1: Set Up Apple Developer Account

1. Go to https://developer.apple.com
2. Enroll in Apple Developer Program ($99/year)
3. Wait for approval (can take 24-48 hours)
4. Note your **Team ID** (found in Membership section)

### Step 2: Create App in App Store Connect

1. Go to https://appstoreconnect.apple.com
2. Click **"My Apps"** → **"+"** → **"New App"**
3. Fill in:
   - **Platform**: iOS
   - **Name**: GAA Coach Hub
   - **Primary Language**: English
   - **Bundle ID**: Create new → `com.gaacoach.hub`
   - **SKU**: `gaa-coach-hub-001`
   - **User Access**: Full Access
4. Click **"Create"**
5. Note your **App ID** (numeric, found in App Information)

### Step 3: Configure App Information

In App Store Connect, fill out:

#### **App Information**
- **Name**: GAA Coach Hub
- **Subtitle**: Team Management for GAA Coaches
- **Category**: Primary: Sports, Secondary: Productivity
- **Content Rights**: Check if you own all rights

#### **Pricing and Availability**
- **Price**: Free (or set your price)
- **Availability**: All countries or select specific ones

#### **Privacy**
- **Privacy Policy URL**: [Your hosted privacy policy URL]
- **Privacy Practices**: Complete the questionnaire
  - Collects: Name, Email, User Content (team data)
  - Used for: App Functionality, Analytics
  - Linked to User: Yes
  - Used for Tracking: No

### Step 4: Prepare App Store Assets

Create the following assets:

#### **App Icon**
- Size: 1024 x 1024 pixels
- Format: PNG (no transparency)
- No rounded corners (Apple adds them)

#### **Screenshots** (Required for multiple sizes)

**iPhone 6.7" Display (iPhone 15 Pro Max, 14 Pro Max)**
- Size: 1290 x 2796 pixels
- Minimum: 3 screenshots, Maximum: 10

**iPhone 6.5" Display (iPhone 11 Pro Max, XS Max)**
- Size: 1242 x 2688 pixels
- Minimum: 3 screenshots, Maximum: 10

**iPhone 5.5" Display (iPhone 8 Plus, 7 Plus)**
- Size: 1242 x 2208 pixels
- Minimum: 3 screenshots, Maximum: 10

**iPad Pro 12.9" Display**
- Size: 2048 x 2732 pixels
- Minimum: 3 screenshots, Maximum: 10

**Tip**: Use a screenshot tool like [Shotbot](https://shotbot.io/) or [App Store Screenshot Generator](https://www.appscreens.com/) to create professional screenshots with device frames.

#### **App Preview Video** (Optional but recommended)
- Length: 15-30 seconds
- Show key features: team management, lineup builder, match tracker

### Step 5: Write App Store Description

**Description** (4000 character limit):
```
GAA Coach Hub is the ultimate team management app for GAA coaches managing hurling and camogie teams. Built by coaches, for coaches.

KEY FEATURES:

📋 TEAM MANAGEMENT
• Manage multiple teams, seasons, and competitions
• Track players, positions, and jersey numbers
• Monitor player injuries and availability
• Store team crests and jerseys

⚽ MATCH DAY
• Visual lineup builder with GAA pitch layout
• Offline-first match tracker - works without internet
• Capture goals, points, wides, puckouts, turnovers
• Real-time match statistics
• Generate comprehensive match reports

📊 STATISTICS & REPORTS
• Player performance tracking
• Season-long trends and analytics
• Conversion rates and efficiency metrics
• Export reports to WhatsApp or PDF

🏃 TRAINING MANAGEMENT
• Schedule training sessions
• Track attendance (present, late, absent)
• Record drill plans and session notes
• Monitor player development

👥 MULTI-USER SUPPORT
• Role-based access: Club Admin, Coach, Stats Person, Player
• Invite team members by email
• Secure authentication with Google and Apple Sign In

PERFECT FOR:
• Club coaches managing multiple teams
• Stats people capturing match data
• Club administrators overseeing operations
• Players viewing their own statistics

OFFLINE CAPABLE:
The match tracker works completely offline - perfect for rural pitches with poor signal. All data syncs automatically when you're back online.

BUILT FOR GAA:
Designed specifically for hurling and camogie with proper GAA positions, scoring systems, and terminology.

---

Download GAA Coach Hub today and take your team management to the next level!

Support: support@gaacoach.hub
Privacy Policy: [Your URL]
```

**Keywords** (100 character limit):
```
GAA,hurling,camogie,coaching,team,stats,match,tracker,lineup,training,sports
```

**Promotional Text** (170 character limit):
```
The complete team management solution for GAA coaches. Lineup builder, match tracker, stats, and training management - all in one app.
```

### Step 6: Configure EAS for iOS

1. Install EAS CLI:
```bash
npm install -g eas-cli
```

2. Login to Expo:
```bash
eas login
```

3. Configure your project:
```bash
eas build:configure
```

4. Update `app.json` with your details:
```json
{
  "expo": {
    "owner": "your-expo-username",
    "extra": {
      "eas": {
        "projectId": "your-project-id-from-eas-configure"
      }
    }
  }
}
```

5. Update `eas.json` submit section:
```json
{
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@email.com",
        "ascAppId": "your-app-store-connect-app-id",
        "appleTeamId": "your-apple-team-id"
      }
    }
  }
}
```

### Step 7: Build and Submit iOS App

1. **Build the app**:
```bash
eas build --platform ios --profile production
```

This will:
- Upload your code to Expo servers
- Build the app in the cloud
- Generate an `.ipa` file
- Take 15-30 minutes

2. **Wait for build to complete**
   - You'll get an email when done
   - Or check status: `eas build:list`

3. **Submit to App Store**:
```bash
eas submit --platform ios --latest
```

This will:
- Upload the build to App Store Connect
- Take 5-10 minutes

4. **Complete submission in App Store Connect**:
   - Go to https://appstoreconnect.apple.com
   - Select your app
   - Go to **"App Store"** tab
   - Click **"+ Version or Platform"** → **"iOS"**
   - Fill in version information:
     - **What's New**: Describe new features
     - **Promotional Text**: Optional marketing text
   - Select the build you just uploaded
   - Add screenshots and app preview
   - Fill in App Review Information:
     - **Contact Information**: Your email and phone
     - **Demo Account**: If login required, provide test credentials
     - **Notes**: Any special instructions for reviewers
   - Click **"Save"**
   - Click **"Submit for Review"**

### Step 8: App Review Process

- **Review Time**: Typically 24-48 hours
- **Status**: Check in App Store Connect
- **Possible Outcomes**:
  - ✅ **Approved**: App goes live automatically
  - ❌ **Rejected**: Fix issues and resubmit
  - ⚠️ **Metadata Rejected**: Fix app description/screenshots

**Common Rejection Reasons**:
- Missing privacy policy
- Incomplete app information
- Crashes or bugs
- Misleading screenshots
- Missing demo account credentials

---

## 🤖 Part 2: Android Google Play Release

### Step 1: Set Up Google Play Developer Account

1. Go to https://play.google.com/console
2. Pay $25 one-time registration fee
3. Complete account setup
4. Wait for approval (can take 24-48 hours)

### Step 2: Create App in Google Play Console

1. Click **"Create app"**
2. Fill in:
   - **App name**: GAA Coach Hub
   - **Default language**: English (United States)
   - **App or game**: App
   - **Free or paid**: Free
3. Accept declarations
4. Click **"Create app"**

### Step 3: Set Up Store Listing

Navigate to **"Store presence"** → **"Main store listing"**:

#### **App details**
- **App name**: GAA Coach Hub
- **Short description** (80 characters):
```
Team management for GAA coaches - lineups, stats, training
```

- **Full description** (4000 characters):
```
GAA Coach Hub is the ultimate team management app for GAA coaches managing hurling and camogie teams. Built by coaches, for coaches.

KEY FEATURES:

📋 TEAM MANAGEMENT
• Manage multiple teams, seasons, and competitions
• Track players, positions, and jersey numbers
• Monitor player injuries and availability
• Store team crests and jerseys

⚽ MATCH DAY
• Visual lineup builder with GAA pitch layout
• Offline-first match tracker - works without internet
• Capture goals, points, wides, puckouts, turnovers
• Real-time match statistics
• Generate comprehensive match reports

📊 STATISTICS & REPORTS
• Player performance tracking
• Season-long trends and analytics
• Conversion rates and efficiency metrics
• Export reports to WhatsApp or PDF

🏃 TRAINING MANAGEMENT
• Schedule training sessions
• Track attendance (present, late, absent)
• Record drill plans and session notes
• Monitor player development

👥 MULTI-USER SUPPORT
• Role-based access: Club Admin, Coach, Stats Person, Player
• Invite team members by email
• Secure authentication with Google and Apple Sign In

PERFECT FOR:
• Club coaches managing multiple teams
• Stats people capturing match data
• Club administrators overseeing operations
• Players viewing their own statistics

OFFLINE CAPABLE:
The match tracker works completely offline - perfect for rural pitches with poor signal. All data syncs automatically when you're back online.

BUILT FOR GAA:
Designed specifically for hurling and camogie with proper GAA positions, scoring systems, and terminology.

Download GAA Coach Hub today and take your team management to the next level!

Support: support@gaacoach.hub
Privacy Policy: [Your URL]
```

#### **Graphics**

**App icon**
- Size: 512 x 512 pixels
- Format: PNG (32-bit with alpha)

**Feature graphic** (Required)
- Size: 1024 x 500 pixels
- Format: PNG or JPEG
- No transparency

**Phone screenshots** (Minimum 2, Maximum 8)
- Aspect ratio: 16:9 or 9:16
- Minimum dimension: 320px
- Maximum dimension: 3840px

**7-inch tablet screenshots** (Optional)
- Same requirements as phone

**10-inch tablet screenshots** (Optional)
- Same requirements as phone

**Tip**: Use Android Studio's screenshot tool or [Google Play Screenshot Generator](https://www.appstorescreenshot.com/)

#### **Categorization**
- **App category**: Sports
- **Tags**: Coaching, Team Management, Statistics

#### **Contact details**
- **Email**: support@gaacoach.hub
- **Phone**: Your phone number (optional)
- **Website**: Your website URL (optional)

#### **Privacy Policy**
- **Privacy policy URL**: [Your hosted privacy policy URL]

### Step 4: Complete Content Rating

Navigate to **"Policy"** → **"App content"**:

1. Click **"Start questionnaire"**
2. Select **"Sports"** category
3. Answer questions honestly:
   - Violence: No
   - Sexual content: No
   - Profanity: No
   - Controlled substances: No
   - User interaction: Yes (users can communicate)
   - Share location: No
   - Personal info: Yes (email, name)
4. Submit for rating
5. You'll receive a rating (likely "Everyone" or "Everyone 10+")

### Step 5: Set Up App Access

Navigate to **"Policy"** → **"App access"**:

- If your app requires login:
  - Select **"All or some functionality is restricted"**
  - Provide test account credentials:
    - **Username**: test@example.com
    - **Password**: TestPassword123
  - Add instructions for reviewers

### Step 6: Complete Data Safety

Navigate to **"Policy"** → **"Data safety"**:

1. **Does your app collect or share user data?**: Yes
2. **Data types collected**:
   - **Personal info**: Name, Email address
   - **App activity**: App interactions
   - **App info and performance**: Crash logs
3. **Data usage**:
   - **Purpose**: App functionality, Analytics
   - **Is data shared**: No
   - **Can users request deletion**: Yes
4. **Data security**:
   - **Data encrypted in transit**: Yes
   - **Users can request data deletion**: Yes
   - **Committed to Google Play Families Policy**: No (unless targeting kids)
5. Submit

### Step 7: Set Up App Signing

Navigate to **"Release"** → **"Setup"** → **"App signing"**:

1. Choose **"Google Play App Signing"** (recommended)
2. Google will manage your signing keys
3. Download your upload key certificate
4. Save it securely

### Step 8: Create Service Account for EAS

1. Go to **Google Cloud Console**: https://console.cloud.google.com
2. Select your project (or create one)
3. Enable **Google Play Android Developer API**
4. Go to **IAM & Admin** → **Service Accounts**
5. Click **"Create Service Account"**:
   - **Name**: EAS Submit
   - **Role**: Service Account User
6. Click **"Create Key"** → **JSON**
7. Save the JSON file as `google-play-service-account.json` in your project root
8. **IMPORTANT**: Add this file to `.gitignore` (never commit it!)

9. Grant access in Play Console:
   - Go to **Users and permissions**
   - Click **"Invite new users"**
   - Add the service account email
   - Grant **"Admin"** or **"Release manager"** role

### Step 9: Build and Submit Android App

1. **Build APK (for testing)**:
```bash
eas build --platform android --profile production
```

2. **Build AAB (for Play Store)**:
```bash
eas build --platform android --profile production-aab
```

The AAB (Android App Bundle) is required for Play Store. It's smaller and optimized.

3. **Wait for build** (15-30 minutes)

4. **Submit to Google Play**:
```bash
eas submit --platform android --latest
```

This will:
- Upload the AAB to Google Play Console
- Create a release in Internal Testing track
- Take 5-10 minutes

### Step 10: Create Production Release

1. Go to **Google Play Console**
2. Navigate to **"Release"** → **"Production"**
3. Click **"Create new release"**
4. Select the build you just uploaded
5. **Release name**: `1.0.0` (matches your version)
6. **Release notes**:
```
Initial release of GAA Coach Hub!

Features:
• Team and player management
• Visual lineup builder
• Offline match tracker
• Comprehensive statistics
• Training session management
• Multi-user support with roles

Perfect for GAA coaches managing hurling and camogie teams.
```
7. Click **"Save"**
8. Click **"Review release"**
9. Click **"Start rollout to Production"**

### Step 11: App Review Process

- **Review Time**: Typically 1-7 days (first app takes longer)
- **Status**: Check in Play Console
- **Possible Outcomes**:
  - ✅ **Approved**: App goes live
  - ❌ **Rejected**: Fix issues and resubmit

**Common Rejection Reasons**:
- Missing privacy policy
- Incomplete data safety form
- Crashes or bugs
- Permissions not justified
- Missing test account

---

## 🎯 Part 3: Post-Launch

### Monitor Your App

#### **iOS (App Store Connect)**
- **Sales and Trends**: Download numbers
- **Ratings and Reviews**: User feedback
- **Crashes**: Crash reports and diagnostics
- **App Analytics**: User engagement

#### **Android (Play Console)**
- **Statistics**: Installs, uninstalls, ratings
- **Reviews**: User feedback
- **Crashes & ANRs**: Crash reports
- **Vitals**: Performance metrics

### Respond to Reviews

- Respond to all reviews (especially negative ones)
- Thank users for positive feedback
- Address issues in negative reviews
- Update app based on feedback

### Plan Updates

Regular updates keep users engaged:
- **Bug fixes**: Release ASAP
- **Minor features**: Every 2-4 weeks
- **Major features**: Every 2-3 months

To release updates:
1. Update version in `app.json`:
   - iOS: Increment `buildNumber`
   - Android: Increment `versionCode`
   - Both: Update `version` (e.g., 1.0.0 → 1.1.0)
2. Build and submit using same commands
3. Add "What's New" notes

### Marketing Your App

- **Social Media**: Share on Twitter, Facebook, Instagram
- **GAA Community**: Post in GAA forums, Facebook groups
- **Direct Outreach**: Contact GAA clubs directly
- **Demo Videos**: Create YouTube tutorials
- **Press Release**: Send to sports tech blogs
- **App Store Optimization**: Update keywords based on search data

---

## 🆘 Troubleshooting

### Build Fails

**Error: "Expo account not configured"**
```bash
eas login
eas build:configure
```

**Error: "Bundle identifier already exists"**
- Change `bundleIdentifier` in `app.json`
- Must be unique across all apps

**Error: "Provisioning profile error"**
- Ensure Apple Developer account is active
- Check Team ID is correct

### Submission Fails

**iOS: "Missing compliance"**
- Add to `app.json`:
```json
"ios": {
  "config": {
    "usesNonExemptEncryption": false
  }
}
```

**Android: "Service account error"**
- Verify service account has correct permissions
- Check JSON file path is correct

### App Rejected

**Read rejection reason carefully**
- Apple/Google provides specific feedback
- Fix the issue
- Resubmit (no need to rebuild unless code changes)

---

## 📞 Need Help?

- **Expo Forums**: https://forums.expo.dev/
- **Expo Discord**: https://chat.expo.dev/
- **Apple Developer Support**: https://developer.apple.com/contact/
- **Google Play Support**: https://support.google.com/googleplay/android-developer

---

## ✅ Final Checklist

Before submitting:

- [ ] App tested on real iOS device
- [ ] App tested on real Android device
- [ ] No crashes or critical bugs
- [ ] Privacy policy published and linked
- [ ] Support email set up and monitored
- [ ] App icons prepared (1024x1024 for iOS, 512x512 for Android)
- [ ] Screenshots prepared (multiple sizes)
- [ ] App descriptions written
- [ ] Test account credentials provided (if login required)
- [ ] Content rating completed
- [ ] Data safety form completed (Android)
- [ ] App Store Connect configured (iOS)
- [ ] Google Play Console configured (Android)
- [ ] EAS credentials configured
- [ ] Backend is production-ready and stable
- [ ] All API endpoints tested
- [ ] Marketing materials prepared

---

**Congratulations on launching your app! 🎉**

Remember: The first submission is the hardest. Updates are much easier!

Good luck! 🚀
