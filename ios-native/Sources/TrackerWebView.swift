import SwiftUI
import WebKit

struct TrackerWebView: UIViewRepresentable {
    @ObservedObject var health: HealthKitManager

    func makeCoordinator() -> Coordinator {
        Coordinator(health: health)
    }

    func makeUIView(context: Context) -> WKWebView {
        let controller = WKUserContentController()
        controller.add(context.coordinator, name: "healthkit")

        let configuration = WKWebViewConfiguration()
        configuration.userContentController = controller
        configuration.websiteDataStore = .default()

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.isOpaque = false
        webView.backgroundColor = .black
        context.coordinator.webView = webView

        if let url = URL(string: "https://tausifdg-cmyk.github.io/december-family-function-tracker/") {
            webView.load(URLRequest(url: url, cachePolicy: .reloadRevalidatingCacheData))
        }
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        context.coordinator.health = health
    }

    static func dismantleUIView(_ uiView: WKWebView, coordinator: Coordinator) {
        uiView.configuration.userContentController.removeScriptMessageHandler(forName: "healthkit")
        coordinator.stopObserving()
    }

    @MainActor
    final class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        var health: HealthKitManager
        weak var webView: WKWebView?
        private var token: NSObjectProtocol?

        init(health: HealthKitManager) {
            self.health = health
            super.init()
            token = NotificationCenter.default.addObserver(forName: .healthStepsDidUpdate, object: nil, queue: .main) { [weak self] _ in
                Task { @MainActor in self?.pushStepsToWeb() }
            }
        }

        func stopObserving() {
            if let token { NotificationCenter.default.removeObserver(token) }
            token = nil
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            pushStepsToWeb()
        }

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            guard message.name == "healthkit" else { return }
            let action: String
            if let body = message.body as? [String: Any] {
                action = body["action"] as? String ?? ""
            } else {
                action = message.body as? String ?? ""
            }

            switch action {
            case "syncSteps", "requestSteps":
                Task {
                    await health.refreshTodaySteps()
                    await MainActor.run { self.pushStepsToWeb() }
                }
            case "requestAuthorization":
                Task {
                    await health.requestAuthorizationAndStart()
                    await MainActor.run { self.pushStepsToWeb() }
                }
            default:
                break
            }
        }

        private func pushStepsToWeb() {
            guard let webView else { return }
            let syncedAt = health.lastSync?.ISO8601Format() ?? ""
            let payload: [String: Any] = [
                "steps": health.todaySteps,
                "source": "Apple Health",
                "syncedAt": syncedAt,
                "native": true,
                "error": health.lastError ?? ""
            ]
            guard let data = try? JSONSerialization.data(withJSONObject: payload),
                  let json = String(data: data, encoding: .utf8) else { return }
            let script = "window.appleHealthSteps && window.appleHealthSteps.receiveNativeSteps(\(json));"
            webView.evaluateJavaScript(script)
        }
    }
}
