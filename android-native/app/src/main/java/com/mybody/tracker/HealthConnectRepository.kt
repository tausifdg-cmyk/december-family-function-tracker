package com.mybody.tracker

import android.content.Context
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.time.TimeRangeFilter
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

class HealthConnectRepository(context: Context) {
    private val client = HealthConnectClient.getOrCreate(context)

    val readStepsPermission: String = HealthPermission.getReadPermission(StepsRecord::class)

    suspend fun hasStepsPermission(): Boolean =
        client.permissionController.getGrantedPermissions().contains(readStepsPermission)

    suspend fun readTodaySteps(): Long {
        val zone = ZoneId.systemDefault()
        val start = LocalDate.now(zone).atStartOfDay(zone).toInstant()
        val end = Instant.now()
        val result = client.aggregate(
            AggregateRequest(
                metrics = setOf(StepsRecord.COUNT_TOTAL),
                timeRangeFilter = TimeRangeFilter.between(start, end)
            )
        )
        return (result[StepsRecord.COUNT_TOTAL] ?: 0L).coerceAtLeast(0L)
    }
}
