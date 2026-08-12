import Foundation
import HealthKit

@MainActor
final class HealthKitManager: ObservableObject {
    @Published private(set) var todaySteps: Int = 0
    @Published private(set) var lastSync: Date?
    @Published private(set) var authorizationReady = false
    @Published private(set) var lastError: String?

    private let store = HKHealthStore()
    private var observerQuery: HKObserverQuery?
    private let cachedStepsKey = "tausif.health.steps"
    private let cachedSyncKey = "tausif.health.steps.sync"

    init() {
        todaySteps = UserDefaults.standard.integer(forKey: cachedStepsKey)
        lastSync = UserDefaults.standard.object(forKey: cachedSyncKey) as? Date
    }

    func requestAuthorizationAndStart() async {
        guard HKHealthStore.isHealthDataAvailable(),
              let stepsType = HKObjectType.quantityType(forIdentifier: .stepCount) else {
            lastError = "Apple Health is not available on this device."
            return
        }

        do {
            try await store.requestAuthorization(toShare: [], read: [stepsType])
            authorizationReady = true
            await refreshTodaySteps()
            startObserver(for: stepsType)
            try await store.enableBackgroundDelivery(for: stepsType, frequency: .hourly)
        } catch {
            lastError = error.localizedDescription
        }
    }

    func refreshTodaySteps() async {
        guard let stepsType = HKObjectType.quantityType(forIdentifier: .stepCount) else { return }
        let start = Calendar.current.startOfDay(for: Date())
        let predicate = HKQuery.predicateForSamples(withStart: start, end: Date(), options: .strictStartDate)

        await withCheckedContinuation { continuation in
            let query = HKStatisticsQuery(quantityType: stepsType,
                                          quantitySamplePredicate: predicate,
                                          options: .cumulativeSum) { [weak self] _, result, error in
                Task { @MainActor in
                    defer { continuation.resume() }
                    guard let self else { return }
                    if let error {
                        self.lastError = error.localizedDescription
                        return
                    }
                    let count = result?.sumQuantity()?.doubleValue(for: .count()) ?? 0
                    self.todaySteps = max(0, Int(count.rounded()))
                    self.lastSync = Date()
                    UserDefaults.standard.set(self.todaySteps, forKey: self.cachedStepsKey)
                    UserDefaults.standard.set(self.lastSync, forKey: self.cachedSyncKey)
                    NotificationCenter.default.post(name: .healthStepsDidUpdate, object: nil)
                }
            }
            store.execute(query)
        }
    }

    private func startObserver(for stepsType: HKQuantityType) {
        if let observerQuery { store.stop(observerQuery) }
        let query = HKObserverQuery(sampleType: stepsType, predicate: nil) { [weak self] _, completion, error in
            guard let self else {
                completion()
                return
            }
            Task { @MainActor in
                if let error { self.lastError = error.localizedDescription }
                await self.refreshTodaySteps()
                completion()
            }
        }
        observerQuery = query
        store.execute(query)
    }
}

extension Notification.Name {
    static let healthStepsDidUpdate = Notification.Name("healthStepsDidUpdate")
}
