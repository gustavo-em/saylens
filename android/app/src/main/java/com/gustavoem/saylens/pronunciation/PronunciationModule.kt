package com.gustavoem.saylens.pronunciation

import android.speech.tts.TextToSpeech
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.module.annotations.ReactModule
import java.util.Locale
import java.util.UUID

@ReactModule(name = PronunciationModule.NAME)
class PronunciationModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  private enum class InitializationState {
    INITIALIZING,
    READY,
    FAILED,
    CLOSED,
  }

  private data class PendingSpeech(
    val text: String,
    val languageTag: String,
    val rate: Double,
    val promise: Promise,
  )

  private val stateLock = Any()
  private val pendingSpeeches = mutableListOf<PendingSpeech>()
  private var initializationState = InitializationState.INITIALIZING
  private var textToSpeech: TextToSpeech? = null

  init {
    reactContext.runOnUiQueueThread {
      val engine = TextToSpeech(reactContext, ::handleInitialization)

      synchronized(stateLock) {
        if (initializationState == InitializationState.CLOSED) {
          engine.shutdown()
        } else {
          textToSpeech = engine
        }
      }
    }
  }

  override fun getName(): String = NAME

  @ReactMethod
  fun speak(text: String, languageTag: String, rate: Double, promise: Promise) {
    if (text.isBlank()) {
      promise.reject(ERROR_INVALID_TEXT, "The pronunciation text cannot be empty.")
      return
    }

    val speech = PendingSpeech(text.trim(), languageTag, rate, promise)
    val state = synchronized(stateLock) {
      if (initializationState == InitializationState.INITIALIZING) {
        pendingSpeeches.add(speech)
      }
      initializationState
    }

    when (state) {
      InitializationState.INITIALIZING -> Unit
      InitializationState.READY -> dispatchSpeech(speech)
      InitializationState.FAILED ->
        promise.reject(ERROR_INITIALIZATION, "The system speech engine failed to initialize.")
      InitializationState.CLOSED ->
        promise.reject(ERROR_CLOSED, "The system speech engine is closed.")
    }
  }

  @ReactMethod
  fun stop(promise: Promise) {
    val cancelledSpeeches = synchronized(stateLock) {
      pendingSpeeches.toList().also { pendingSpeeches.clear() }
    }
    cancelledSpeeches.forEach { it.promise.resolve(null) }

    reactContext.runOnUiQueueThread {
      val engine: TextToSpeech?
      val state: InitializationState
      synchronized(stateLock) {
        engine = textToSpeech
        state = initializationState
      }

      // Nothing can be playing until the engine reports itself ready, so a stop
      // that arrives during start-up is a no-op instead of a failure.
      if (engine == null || state != InitializationState.READY) {
        promise.resolve(null)
        return@runOnUiQueueThread
      }

      if (engine.stop() == TextToSpeech.ERROR) {
        promise.reject(ERROR_STOP, "The system speech engine could not stop playback.")
      } else {
        promise.resolve(null)
      }
    }
  }

  override fun invalidate() {
    val cancelledSpeeches = synchronized(stateLock) {
      initializationState = InitializationState.CLOSED
      pendingSpeeches.toList().also { pendingSpeeches.clear() }
    }
    cancelledSpeeches.forEach { it.promise.resolve(null) }

    reactContext.runOnUiQueueThread {
      synchronized(stateLock) {
        textToSpeech?.stop()
        textToSpeech?.shutdown()
        textToSpeech = null
      }
    }
    super.invalidate()
  }

  private fun handleInitialization(status: Int) {
    reactContext.runOnUiQueueThread {
      val queuedSpeeches: List<PendingSpeech>
      val initializedSuccessfully = status == TextToSpeech.SUCCESS

      synchronized(stateLock) {
        if (initializationState == InitializationState.CLOSED) return@runOnUiQueueThread

        initializationState =
          if (initializedSuccessfully) InitializationState.READY
          else InitializationState.FAILED
        queuedSpeeches = pendingSpeeches.toList()
        pendingSpeeches.clear()
      }

      if (initializedSuccessfully) {
        queuedSpeeches.forEach(::performSpeech)
      } else {
        queuedSpeeches.forEach {
          it.promise.reject(
            ERROR_INITIALIZATION,
            "The system speech engine failed to initialize.",
          )
        }
      }
    }
  }

  private fun dispatchSpeech(speech: PendingSpeech) {
    reactContext.runOnUiQueueThread { performSpeech(speech) }
  }

  private fun performSpeech(speech: PendingSpeech) {
    val engine = synchronized(stateLock) { textToSpeech }
    if (engine == null) {
      speech.promise.reject(ERROR_INITIALIZATION, "The system speech engine is unavailable.")
      return
    }

    val locale = Locale.forLanguageTag(speech.languageTag)
    if (locale.language.isBlank()) {
      speech.promise.reject(ERROR_LANGUAGE, "The requested speech language is invalid.")
      return
    }

    val languageStatus = engine.setLanguage(locale)
    if (
      languageStatus == TextToSpeech.LANG_MISSING_DATA ||
        languageStatus == TextToSpeech.LANG_NOT_SUPPORTED
    ) {
      speech.promise.reject(
        ERROR_LANGUAGE,
        "The requested speech language is not installed on this device.",
      )
      return
    }

    engine.setSpeechRate(speech.rate.coerceIn(MINIMUM_RATE, MAXIMUM_RATE).toFloat())
    val result =
      engine.speak(
        speech.text,
        TextToSpeech.QUEUE_FLUSH,
        null,
        "saylens-${UUID.randomUUID()}",
      )

    if (result == TextToSpeech.ERROR) {
      speech.promise.reject(ERROR_SPEAK, "The system speech engine could not play the word.")
    } else {
      speech.promise.resolve(null)
    }
  }

  companion object {
    const val NAME = "SayLensPronunciation"

    private const val MINIMUM_RATE = 0.5
    private const val MAXIMUM_RATE = 1.5
    private const val ERROR_CLOSED = "E_PRONUNCIATION_CLOSED"
    private const val ERROR_INITIALIZATION = "E_PRONUNCIATION_INITIALIZATION"
    private const val ERROR_INVALID_TEXT = "E_PRONUNCIATION_INVALID_TEXT"
    private const val ERROR_LANGUAGE = "E_PRONUNCIATION_LANGUAGE"
    private const val ERROR_SPEAK = "E_PRONUNCIATION_SPEAK"
    private const val ERROR_STOP = "E_PRONUNCIATION_STOP"
  }
}
