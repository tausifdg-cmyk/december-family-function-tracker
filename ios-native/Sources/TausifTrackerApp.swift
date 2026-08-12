import SwiftUI

@main
struct TausifTrackerApp: App {
    @StateObject private var health = HealthKitManager()

    var body: some Scene {
        WindowGroup {
            TrackerWebView(health: health)
                .task {
                    await health.requestAuthorizationAndStart()
                }
        }
    }
}
