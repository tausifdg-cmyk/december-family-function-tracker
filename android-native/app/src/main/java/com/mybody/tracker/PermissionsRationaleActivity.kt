package com.mybody.tracker

import android.app.Activity
import android.graphics.Color
import android.os.Bundle
import android.view.Gravity
import android.widget.TextView

class PermissionsRationaleActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(TextView(this).apply {
            setBackgroundColor(Color.rgb(5, 7, 5))
            setTextColor(Color.WHITE)
            textSize = 18f
            gravity = Gravity.CENTER
            setPadding(48, 48, 48, 48)
            text = "MYBODY reads only your daily step total from Health Connect. " +
                "It uses that number for your dashboard and hourly step sync. " +
                "You can revoke access at any time in Health Connect settings."
        })
    }
}
