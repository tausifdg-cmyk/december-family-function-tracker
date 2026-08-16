package com.mybody.tracker

import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.HealthConnectFeatures
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.time.Instant

class MainActivity : ComponentActivity() {
    private lateinit var webView: WebView
    private lateinit var repository: HealthConnectRepository
    private var pendingSync = false

    private val permissionLauncher = registerForActivityResult(
        PermissionController.createRequestPermissionResultContract()
    ) { granted ->
        val hasSteps = granted.contains(repository.readStepsPermission)
        if (hasSteps) {
            StepSyncWorker.schedule(this)
            syncTodaySteps()
        } else {
            pushError("Steps permission was not granted.")
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        repository = HealthConnectRepository(this)
        webView = WebView(this).apply {
            setBackgroundColor(android.graphics.Color.rgb(5, 7, 5))
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.cacheMode = WebSettings.LOAD_DEFAULT
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            addJavascriptInterface(AndroidHealthBridge(), "MyBodyAndroidHealth")
            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(
                    view: WebView,
                    request: WebResourceRequest
                ): Boolean {
                    val uri = request.url
                    if (isTrustedAppUrl(uri)) return false
                    startActivity(Intent(Intent.ACTION_VIEW, uri))
                    return true
                }

                override fun onPageFinished(view: WebView, url: String) {
                    super.onPageFinished(view, url)
                    if (pendingSync) syncTodaySteps()
                }
            }
            loadUrl(APP_URL)
        }
        setContentView(webView)

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) webView.goBack() else finish()
            }
        })
    }

    private fun isTrustedAppUrl(uri: Uri): Boolean =
        uri.scheme == "https" &&
            uri.host == "tausifdg-cmyk.github.io" &&
            uri.path.orEmpty().startsWith("/december-family-function-tracker/")

    private fun healthConnectAvailable(): Boolean {
        val status = HealthConnectClient.getSdkStatus(this, HEALTH_CONNECT_PROVIDER_PACKAGE)
        if (status == HealthConnectClient.SDK_AVAILABLE) return true
        if (status == HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) {
            val market = Uri.parse(
                "market://details?id=$HEALTH_CONNECT_PROVIDER_PACKAGE" +
                    "&url=healthconnect%3A%2F%2Fonboarding"
            )
            runCatching { startActivity(Intent(Intent.ACTION_VIEW, market)) }
        }
        pushError("Health Connect is unavailable or needs an update.")
        return false
    }

    private fun requestedPermissions(): Set<String> {
        val permissions = mutableSetOf(repository.readStepsPermission)
        val client = HealthConnectClient.getOrCreate(this)
        val backgroundAvailable = client.features.getFeatureStatus(
            HealthConnectFeatures.FEATURE_READ_HEALTH_DATA_IN_BACKGROUND
        ) == HealthConnectFeatures.FEATURE_STATUS_AVAILABLE
        if (backgroundAvailable) {
            permissions += HealthPermission.PERMISSION_READ_HEALTH_DATA_IN_BACKGROUND
        }
        return permissions
    }

    private fun requestAuthorization(syncAfterGrant: Boolean = true) {
        if (!healthConnectAvailable()) return
        pendingSync = syncAfterGrant
        lifecycleScope.launch {
            val requested = requestedPermissions()
            val granted = HealthConnectClient.getOrCreate(this@MainActivity)
                .permissionController
                .getGrantedPermissions()
            if (granted.contains(repository.readStepsPermission)) {
                StepSyncWorker.schedule(this@MainActivity)
                if (syncAfterGrant) syncTodaySteps()
            } else {
                permissionLauncher.launch(requested)
            }
        }
    }

    private fun syncTodaySteps() {
        if (!healthConnectAvailable()) return
        lifecycleScope.launch {
            try {
                if (!repository.hasStepsPermission()) {
                    requestAuthorization()
                    return@launch
                }
                val steps = repository.readTodaySteps()
                val payload = JSONObject()
                    .put("steps", steps)
                    .put("source", "Android Health Connect")
                    .put("syncedAt", Instant.now().toString())
                    .put("native", true)
                pushPayload(payload)
                pendingSync = false
            } catch (error: Exception) {
                pushError(error.localizedMessage ?: "Could not read today’s steps.")
            }
        }
    }

    private fun pushError(message: String) {
        pushPayload(JSONObject().put("error", message))
    }

    private fun pushPayload(payload: JSONObject) {
        if (!::webView.isInitialized) return
        webView.post {
            webView.evaluateJavascript(
                "window.androidHealthSteps && window.androidHealthSteps.receiveAndroidSteps(${payload});",
                null
            )
        }
    }

    inner class AndroidHealthBridge {
        @JavascriptInterface
        fun requestSteps() {
            runOnUiThread { requestAuthorization(syncAfterGrant = true) }
        }

        @JavascriptInterface
        fun requestAuthorization() {
            runOnUiThread { requestAuthorization(syncAfterGrant = true) }
        }

        @JavascriptInterface
        fun configureBackgroundSync(json: String) {
            runOnUiThread {
                try {
                    val config = JSONObject(json)
                    val saved = StepSyncWorker.saveConfiguration(
                        this@MainActivity,
                        config.optString("endpoint"),
                        config.optString("token")
                    )
                    if (saved && healthConnectAvailable()) StepSyncWorker.schedule(this@MainActivity)
                } catch (_: Exception) {
                    Toast.makeText(this@MainActivity, "Could not configure step sync.", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    companion object {
        private const val APP_URL =
            "https://tausifdg-cmyk.github.io/december-family-function-tracker/"
        private const val HEALTH_CONNECT_PROVIDER_PACKAGE = "com.google.android.apps.healthdata"
    }
}
