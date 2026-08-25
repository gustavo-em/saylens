package com.gustavoem.saylens.speech

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class SpeechRecognitionPackage : BaseReactPackage() {
  override fun getModule(
    name: String,
    reactContext: ReactApplicationContext,
  ): NativeModule? =
    if (name == SpeechRecognitionModule.NAME) {
      SpeechRecognitionModule(reactContext)
    } else {
      null
    }

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider =
    ReactModuleInfoProvider {
      mapOf(
        SpeechRecognitionModule.NAME to
          ReactModuleInfo(
            SpeechRecognitionModule.NAME,
            SpeechRecognitionModule::class.java.name,
            false,
            false,
            false,
            false,
          ),
      )
    }
}
