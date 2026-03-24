# Sunshine Driver App

This is an Expo Router app for live team location sharing, chat, and file exchange with Firebase Auth, Firestore, Storage, Emulator Suite support, and Firebase Hosting for the web build.

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

## Firebase Hosting

This project is already configured for Expo static web export and Firebase Hosting.

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
