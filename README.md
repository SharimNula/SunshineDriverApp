# Sunshine Driver App

This is an Expo Router app for live team location sharing, chat, and file exchange with Firebase Auth, Firestore, Storage, Emulator Suite support, Firebase Hosting, Firebase App Hosting, and EAS internal Android packaging.

## Local development

1. Install dependencies.

```bash
npm install
```

2. Start the app.

```bash
npx expo start
```

3. Optional: run the Firebase emulators.

```bash
npm run emulators
```

## EAS APK packaging

The EAS build profiles are now prepared so remote builds do not depend on `.env.local`.

- `eas.json` now provides the required `EXPO_PUBLIC_FIREBASE_*` values directly to the `development`, `preview`, and `production` profiles.
- The `preview` profile stays configured for internal Android APK output.
- `EXPO_PUBLIC_USE_FIREBASE_EMULATORS` is forced to `false` for packaged builds.
- Native map builds require `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` in your EAS environment so Android can create the Google Map view safely.

Build an internal APK with:

```bash
eas build --platform android --profile preview
```

Before rebuilding, add your Google Maps SDK key to EAS:

```bash
eas env:create --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --value YOUR_ANDROID_MAPS_KEY --environment preview
eas env:create --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --value YOUR_ANDROID_MAPS_KEY --environment production
```

Use a Google Cloud key with the Maps SDK for Android enabled, then restrict it to your Android app package and signing fingerprints.

If you would rather manage the Firebase values in EAS project environment variables instead of keeping them in `eas.json`, you can move the same keys into the Expo dashboard or EAS CLI later and keep the profile `environment` mappings already defined.

## Web live map

The web app can now render the live vehicle map with the Google Maps JavaScript API.

- Use a separate `EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY` for the web build. Do not reuse the Android-restricted native key.
- Restrict the web key to `Websites` in Google Cloud and allow the domains you host from, plus any local development origins you need such as `http://localhost:8081/*` or `http://localhost:19006/*`.
- Enable `Maps JavaScript API` for that key's project.
- Make sure the key is present at web build time for Firebase Hosting or App Hosting, because the Expo web export inlines public env vars into the client bundle.

## Firebase App Hosting

This repo is prepared for Firebase App Hosting with:

- `apphosting.yaml` for build, run, and build-time environment configuration.
- `server.js` to serve the Expo static export from `dist` in the App Hosting runtime.
- `npm run build` to produce the web export.
- The checked-in `apphosting.yaml` now includes `EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY` so the hosted web build can render the browser map. If you rotate to a different browser-restricted key later, update that value there too.

Once you create an App Hosting backend in Firebase and connect this repo, App Hosting can build and run the app using the checked-in config.

### Key files

- `apphosting.yaml`
- `server.js`
- `package.json`

## Firebase Hosting

This project is also configured for classic Firebase Hosting.

1. Build the web app into `dist`.

```bash
npm run export:web
```

2. Deploy to your default Firebase project.

```bash
npm run hosting:deploy
```

3. Optional: deploy to a preview channel.

```bash
npm run hosting:preview
```

The Firebase Hosting configuration lives in `firebase.json` and serves the Expo web export from `dist` with clean URLs and long-lived caching for static assets.

## Firebase project selection

The current default Firebase project is stored in `.firebaserc`.

If you need to switch projects:

```bash
firebase use <project-id>
```

## Notes

- Firestore rules are defined in `firestore.rules`.
- Storage rules are defined in `storage.rules`.
- If you change Firebase rules and use hosted Firebase instead of the emulator, redeploy them with the Firebase CLI.
