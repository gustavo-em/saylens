package com.gustavoem.saylens.pronunciation

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class PronunciationPackage : BaseReactPackage() {
  override fun getModule(
    name: String,
    reactContext: ReactApplicationContext,
  ): NativeModule? =
    if (name == PronunciationModule.NAME) PronunciationModule(reactContext) else null

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider =
    ReactModuleInfoProvider {
      mapOf(
        PronunciationModule.NAME to
          ReactModuleInfo(
            PronunciationModule.NAME,
            PronunciationModule::class.java.name,
            false,
            false,
            false,
            false,
          ),
      )
    }
}
