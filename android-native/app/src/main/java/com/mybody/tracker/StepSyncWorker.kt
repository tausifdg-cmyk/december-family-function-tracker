package com.mybody.tracker

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.HealthConnectFeatures
import androidx.health.connect.client.permission.HealthPermission
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.time.LocalDate
import java.util.concurrent.TimeUnit

class StepSyncWorker(appContext: Context, params: WorkerParameters) :
    CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result {
        val prefs = applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val endpoint = prefs.getString(KEY_ENDPOINT, "").orEmpty()
        val token = prefs.getString(KEY_TOKEN, "").orEmpty()
        if (endpoint != APPROVED_ENDPOINT || token.length < 32) return Result.failure()

        return try {
            val client = HealthConnectClient.getOrCreate(applicationContext)
            val granted = client.permissionController.getGrantedPermissions()
            val stepsPermission = HealthPermission.getReadPermission(
                androidx.health.connect.client.records.StepsRecord::class
            )
            if (!granted.contains(stepsPermission) ||
                !granted.contains(HealthPermission.PERMISSION_READ_HEALTH_DATA_IN_BACKGROUND)
            ) return Result.failure()

            val steps = HealthConnectRepository(applicationContext).readTodaySteps()
            val body = JSONObject()
                .put("action", "write")
                .put("token", token)
                .put("steps", steps)
                .put("date", LocalDate.now().toString())
                .toString()
            val connection = (URL(endpoint).openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 15_000
                readTimeout = 15_000
                doOutput = true
                setRequestProperty("Content-Type", "application/json")
            }
            connection.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
            val success = connection.responseCode in 200..299
            connection.disconnect()
            if (success) Result.success() else Result.retry()
        } catch (_: Exception) {
            Result.retry()
        }
    }

    companion object {
        const val APPROVED_ENDPOINT =
            "https://vucmcxkgpghnahnocirk.supabase.co/functions/v1/ios-step-sync"
        private const val PREFS = "mybody_health_sync"
        private const val KEY_ENDPOINT = "endpoint"
        private const val KEY_TOKEN = "token"
        private const val WORK_NAME = "mybody_health_connect_hourly"

        fun saveConfiguration(context: Context, endpoint: String, token: String): Boolean {
            if (endpoint != APPROVED_ENDPOINT || token.length < 32) return false
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit()
                .putString(KEY_ENDPOINT, endpoint)
                .putString(KEY_TOKEN, token)
                .apply()
            return true
        }

        fun schedule(context: Context): Boolean {
            val client = HealthConnectClient.getOrCreate(context)
            val supported = client.features.getFeatureStatus(
                HealthConnectFeatures.FEATURE_READ_HEALTH_DATA_IN_BACKGROUND
            ) == HealthConnectFeatures.FEATURE_STATUS_AVAILABLE
            if (!supported) return false
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
            val request = PeriodicWorkRequestBuilder<StepSyncWorker>(1, TimeUnit.HOURS)
                .setConstraints(constraints)
                .build()
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                request
            )
            return true
        }
    }
}
