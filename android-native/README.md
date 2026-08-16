# MYBODY 2.0 Android + Health Connect

This is a small Android WebView wrapper for the existing MYBODY 2.0 PWA. It is required because a browser/PWA cannot call the native Health Connect SDK.

## What it does

- Loads the existing tracker from its HTTPS GitHub Pages URL.
- Exposes a restricted `MyBodyAndroidHealth` bridge only to the bundled tracker.
- Requests read access for the Health Connect Steps record.
- Reads today's aggregated step total when the tracker opens or **Sync now** is tapped.
- Requests Health Connect background-read access when the device supports it.
- Uses Android WorkManager to upload the current daily total about once per hour.
- Sends only the current date and step total to the same capability-token endpoint already used by iPhone Shortcut sync.

## Requirements

- Android 9 or later for Health Connect data. The app itself has a minimum SDK of Android 8 so it can show an availability message on older devices.
- Android 14+ for native Health Connect and supported background reads. Android 9–13 may need the Health Connect app from Google Play and support foreground/manual reads only.
- A step source in Health Connect. On current supported Android versions, granting READ_STEPS can activate on-device step counting; Samsung Health, Fitbit, and other connected sources can also contribute data.

## Build locally

1. Install Android Studio with Android SDK 35 and JDK 17.
2. Open the `android-native` folder as a Gradle project.
3. Build and run the `app` configuration on a physical Android phone.
4. Allow Steps and, when offered, background health access.

No Google Play developer account is required to build or directly install the APK. Publishing through Google Play requires a Play Console account and the Health Connect declarations required by Google.

The GitHub workflow builds a test APK and publishes it at the stable `android-latest` release URL. That test APK uses a debug signature and is intended for device validation before a production signing key is configured.
