# Quick Start Guide - Tourist App with Mapbox

## 🚀 Getting Started

### 1. Install Dependencies

```bash
cd touristapp_mobile
npm install
```

### 2. Install Expo Dev Client (Required for Mapbox)

```bash
npx expo install expo-dev-client
```

### 3. Create Development Build

Since Mapbox uses native code, you need a development build:

```bash
# For iOS (requires Mac with Xcode)
npx expo run:ios

# For Android
npx expo run:android
```

**Note**: The standard Expo Go app won't work with Mapbox. You must use a development build.

### 4. Alternative: Use EAS Build (Recommended)

If you don't want to set up local development environment:

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure EAS
eas build:configure

# Build for development
eas build --platform ios --profile development
eas build --platform android --profile development
```

## 📱 Features Available

### 🗺️ Map Features
- Interactive Mapbox map with tourist spots
- Real-time user location
- Navigation with turn-by-turn directions
- Color-coded markers by category

### 🏢 Company Features
- Add new tourist spots with location picker
- Manage existing spots
- View approval status
- Interactive map for location selection

### 👨‍💼 Admin Features
- Approve/reject tourist spots
- Manage users (block/unblock/delete)
- Change user roles
- System settings

### 👤 User Profiles
- Enhanced profile management
- Role-specific dashboards
- Preference settings

## 🔧 Configuration Files

All configuration files have been set up:

- ✅ `app.json` - Expo configuration with Mapbox plugin
- ✅ `metro.config.js` - Metro bundler configuration
- ✅ `.env` - Environment variables
- ✅ `package.json` - Dependencies

## 🎯 Testing the App

### Test Different User Roles:

1. **Tourist**: 
   - View maps and navigate to spots
   - Browse and book packages
   - Manage profile

2. **Travel Company**:
   - Add and manage tourist spots
   - Manage tour packages
   - View bookings and analytics

3. **Admin**:
   - Approve tourist spots
   - Manage all users
   - System configuration

### Test Map Features:

1. **Location Permission**: Grant location access when prompted
2. **Map Interaction**: Zoom, pan, tap markers
3. **Navigation**: Select a spot and start navigation
4. **Spot Addition**: (Company role) Add new tourist spots

## 🐛 Troubleshooting

### Common Issues:

1. **"Expo Go not supported"**
   - Solution: Use development build (`npx expo run:ios/android`)

2. **Map not loading**
   - Check internet connection
   - Verify Mapbox token in `.env` file

3. **Location not working**
   - Test on physical device (not simulator)
   - Grant location permissions

4. **Build errors**
   - Clear cache: `npx expo start --clear`
   - Reinstall: `rm -rf node_modules && npm install`

### Development Build Issues:

1. **iOS Build Fails**
   - Ensure Xcode is installed and updated
   - Run: `npx expo run:ios --clear`

2. **Android Build Fails**
   - Ensure Android Studio is set up
   - Run: `npx expo run:android --clear`

## 📚 Next Steps

1. **Backend Integration**: Implement the API endpoints listed in `NEW_FEATURES.md`
2. **Testing**: Test all user flows and map functionality
3. **Deployment**: Use EAS Build for production builds
4. **Monitoring**: Set up error tracking and analytics

## 🔗 Useful Commands

```bash
# Start development server
npx expo start

# Clear cache and restart
npx expo start --clear

# Run on iOS (development build)
npx expo run:ios

# Run on Android (development build)
npx expo run:android

# Check Expo doctor for issues
npx expo doctor

# Update Expo SDK
npx expo install --fix
```

## 📞 Support

- **Mapbox Issues**: Check [Mapbox React Native Docs](https://rnmapbox.github.io/docs/install)
- **Expo Issues**: Check [Expo Documentation](https://docs.expo.dev/)
- **App Issues**: Review console logs and error messages

Your tourist app is now ready with full Mapbox integration! 🎉