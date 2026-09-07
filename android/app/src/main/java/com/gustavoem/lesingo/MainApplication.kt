package com.gustavoem.lesingo

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.gustavoem.lesingo.pronunciation.PronunciationPackage
import com.gustavoem.lesingo.reminders.PractiseReminderPackage
import com.gustavoem.lesingo.speech.SpeechRecognitionPackage

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          add(PractiseReminderPackage())
          add(PronunciationPackage())
          add(SpeechRecognitionPackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
  }
}
