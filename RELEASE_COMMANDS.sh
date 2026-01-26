
#!/bin/bash
# GAA Coach Hub - Release Commands
# This file contains all commands needed to release your app
# DO NOT RUN THIS FILE DIRECTLY - copy and paste commands as needed

echo "==================================="
echo "GAA Coach Hub - Release Commands"
echo "==================================="
echo ""
echo "⚠️  DO NOT RUN THIS FILE DIRECTLY"
echo "Copy and paste commands as needed"
echo ""

# ===================================
# ONE-TIME SETUP
# ===================================

echo "1. ONE-TIME SETUP"
echo "-----------------"
echo ""
echo "# Install EAS CLI globally"
echo "npm install -g eas-cli"
echo ""
echo "# Login to Expo"
echo "eas login"
echo ""
echo "# Configure project"
echo "eas build:configure"
echo ""
echo "# Initialize EAS project"
echo "eas init"
echo ""

# ===================================
# iOS RELEASE
# ===================================

echo "2. iOS RELEASE"
echo "--------------"
echo ""
echo "# Build for iOS (production)"
echo "eas build --platform ios --profile production"
echo ""
echo "# Check build status"
echo "eas build:list --platform ios"
echo ""
echo "# Submit to App Store (after build completes)"
echo "eas submit --platform ios --latest"
echo ""
echo "# Then complete submission in App Store Connect:"
echo "# https://appstoreconnect.apple.com"
echo ""

# ===================================
# ANDROID RELEASE
# ===================================

echo "3. ANDROID RELEASE"
echo "------------------"
echo ""
echo "# Build AAB for Google Play (REQUIRED for Play Store)"
echo "eas build --platform android --profile production-aab"
echo ""
echo "# Check build status"
echo "eas build:list --platform android"
echo ""
echo "# Submit to Google Play (after build completes)"
echo "eas submit --platform android --latest"
echo ""
echo "# Then create production release in Play Console:"
echo "# https://play.google.com/console"
echo ""

# ===================================
# TESTING BUILDS
# ===================================

echo "4. TESTING BUILDS (Before Production)"
echo "--------------------------------------"
echo ""
echo "# Build for iOS testing (TestFlight)"
echo "eas build --platform ios --profile preview"
echo ""
echo "# Build APK for Android testing"
echo "eas build --platform android --profile preview"
echo ""

# ===================================
# UPDATE APP (NEW VERSION)
# ===================================

echo "5. UPDATE APP (New Version)"
echo "---------------------------"
echo ""
echo "# Step 1: Update version numbers in app.json"
echo "# - Increment 'version' (e.g., 1.0.0 → 1.1.0)"
echo "# - Increment 'ios.buildNumber' (e.g., 1 → 2)"
echo "# - Increment 'android.versionCode' (e.g., 1 → 2)"
echo ""
echo "# Step 2: Build and submit"
echo "eas build --platform ios --profile production"
echo "eas submit --platform ios --latest"
echo ""
echo "eas build --platform android --profile production-aab"
echo "eas submit --platform android --latest"
echo ""

# ===================================
# MONITORING & DEBUGGING
# ===================================

echo "6. MONITORING & DEBUGGING"
echo "-------------------------"
echo ""
echo "# List all builds"
echo "eas build:list"
echo ""
echo "# View specific build"
echo "eas build:view <build-id>"
echo ""
echo "# View build logs"
echo "eas build:view <build-id> --logs"
echo ""
echo "# Check project info"
echo "eas project:info"
echo ""
echo "# View credentials"
echo "eas credentials"
echo ""

# ===================================
# LOCAL DEVELOPMENT
# ===================================

echo "7. LOCAL DEVELOPMENT"
echo "--------------------"
echo ""
echo "# Start development server"
echo "npm run dev"
echo ""
echo "# Run on iOS simulator"
echo "npm run ios"
echo ""
echo "# Run on Android emulator"
echo "npm run android"
echo ""
echo "# Clear cache and restart"
echo "expo start --clear"
echo ""

# ===================================
# TROUBLESHOOTING
# ===================================

echo "8. TROUBLESHOOTING"
echo "------------------"
echo ""
echo "# Clear node modules and reinstall"
echo "rm -rf node_modules"
echo "npm install"
echo ""
echo "# Reset EAS configuration"
echo "rm eas.json"
echo "eas build:configure"
echo ""
echo "# Clear iOS credentials (if issues)"
echo "eas credentials --platform ios --clear"
echo ""
echo "# Clear Android credentials (if issues)"
echo "eas credentials --platform android --clear"
echo ""

# ===================================
# IMPORTANT LINKS
# ===================================

echo "9. IMPORTANT LINKS"
echo "------------------"
echo ""
echo "EAS Dashboard: https://expo.dev"
echo "App Store Connect: https://appstoreconnect.apple.com"
echo "Google Play Console: https://play.google.com/console"
echo "Expo Documentation: https://docs.expo.dev"
echo ""

echo "==================================="
echo "Ready to release! 🚀"
echo "==================================="
echo ""
echo "Next steps:"
echo "1. Review DEPLOYMENT_CHECKLIST.md"
echo "2. Follow RELEASE_GUIDE.md for detailed instructions"
echo "3. Copy commands from this file as needed"
echo ""
