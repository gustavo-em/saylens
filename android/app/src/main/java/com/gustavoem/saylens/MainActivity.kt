package com.gustavoem.saylens

import android.os.Build
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    window.decorView.post(::preferHighestDisplayRefreshRate)
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "SayLens"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  private fun preferHighestDisplayRefreshRate() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return

    val highestRefreshMode = window.decorView.display?.supportedModes
        ?.maxByOrNull { it.refreshRate }
        ?: return
    val attributes = window.attributes
    attributes.preferredDisplayModeId = highestRefreshMode.modeId
    attributes.preferredRefreshRate = highestRefreshMode.refreshRate
    window.attributes = attributes
  }
}
