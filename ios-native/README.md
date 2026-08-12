# Tausif Tracker iPhone + Apple Health

This folder contains the native iPhone wrapper for the existing web tracker.

## What changes in the native app

- The tracker UI stays the same.
- Tapping **Sync steps** does not leave the tracker.
- JavaScript sends `syncSteps` to the native `WKWebView` bridge.
- The native layer reads today's Step Count from Apple Health with `HKStatisticsQuery` using a cumulative sum.
- The result is pushed back into the open tracker screen and saved in the existing local tracker state.
- `HKObserverQuery` plus HealthKit background delivery keeps a cached step total refreshed when iOS delivers updates. The requested frequency is hourly, but iOS decides the actual delivery timing.

## Build

1. Install Xcode and XcodeGen on a Mac.
2. From this folder run `xcodegen generate`.
3. Open `TausifTracker.xcodeproj`.
4. Select your Apple Developer Team under Signing & Capabilities.
5. Confirm **HealthKit** and **Background Delivery** capabilities are present.
6. Connect the iPhone and run the app.
7. On first launch allow the app to read **Steps** in Apple Health.

The bundle identifier is currently `com.tausifpathan.bodyrecomp`; change it if your Apple Developer account requires another unique identifier.

## Important

HealthKit data is available only on a real iPhone. The simulator can verify compilation but is not the final HealthKit test environment.
