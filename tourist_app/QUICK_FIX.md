# Quick Fix for Android Bundling Issues

## Run these commands in order:

```bash
cd touristapp_mobile

# 1. Clear everything
rm -rf node_modules
rm package-lock.json
npx expo start --clear

# 2. Install dependencies
npm install

# 3. Install missing Expo packages
npx expo install expo-asset expo-font expo-constants

# 4. Clear Metro cache and start
npx expo start --clear
```

## Then try building:
```bash
npx expo run:android
```

## If still having issues, try:
```bash
npx expo prebuild --clean
npx expo run:android
```

The main issues were:
1. ✅ Fixed AddPackageScreen import path
2. ✅ Added missing expo-asset dependency
3. ✅ Added missing expo-font dependency  
4. ✅ Added missing expo-constants dependency