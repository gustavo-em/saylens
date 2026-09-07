package com.gustavoem.lesingo.reminders

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class PractiseReminderPackage : BaseReactPackage() {
  override fun getModule(
    name: String,
    reactContext: ReactApplicationContext,
  ): NativeModule? =
    if (name == PractiseReminderModule.NAME) {
      PractiseReminderModule(reactContext)
    } else {
      null
    }

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider =
    ReactModuleInfoProvider {
      mapOf(
        PractiseReminderModule.NAME to
          ReactModuleInfo(
            PractiseReminderModule.NAME,
            PractiseReminderModule::class.java.name,
            false,
            false,
            false,
            false,
          ),
      )
    }
}
