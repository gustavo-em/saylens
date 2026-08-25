package com.gustavoem.saylens.speech

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.module.annotations.ReactModule

/**
 * Records a single spoken word and reports what the system heard, so the app
 * can compare it with the word being practised. Recognition runs through the
 * device's own service; nothing is uploaded by this module.
 */
@ReactModule(name = SpeechRecognitionModule.NAME)
class SpeechRecognitionModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  private val stateLock = Any()
  private var recognizer: SpeechRecognizer? = null
  private var pending: Promise? = null

  override fun getName(): String = NAME

  @ReactMethod
  fun isAvailable(promise: Promise) {
    promise.resolve(SpeechRecognizer.isRecognitionAvailable(reactContext))
  }

  @ReactMethod
  fun hasPermission(promise: Promise) {
    promise.resolve(
      ContextCompat.checkSelfPermission(
        reactContext,
        Manifest.permission.RECORD_AUDIO,
      ) == PackageManager.PERMISSION_GRANTED,
    )
  }

  @ReactMethod
  fun listen(languageTag: String, promise: Promise) {
    if (!SpeechRecognizer.isRecognitionAvailable(reactContext)) {
      promise.reject(ERROR_UNAVAILABLE, "Speech recognition is unavailable.")
      return
    }

    if (
      ContextCompat.checkSelfPermission(
        reactContext,
        Manifest.permission.RECORD_AUDIO,
      ) != PackageManager.PERMISSION_GRANTED
    ) {
      promise.reject(ERROR_PERMISSION, "Microphone permission was not granted.")
      return
    }

    val alreadyListening = synchronized(stateLock) {
      if (pending != null) return@synchronized true
      pending = promise
      false
    }
    if (alreadyListening) {
      promise.reject(ERROR_BUSY, "Another recording is still running.")
      return
    }

    reactContext.runOnUiQueueThread { startListening(languageTag) }
  }

  @ReactMethod
  fun cancel(promise: Promise) {
    reactContext.runOnUiQueueThread {
      recognizer?.cancel()
      settle { it.reject(ERROR_CANCELLED, "The recording was cancelled.") }
      promise.resolve(null)
    }
  }

  override fun invalidate() {
    reactContext.runOnUiQueueThread {
      recognizer?.destroy()
      recognizer = null
      settle { it.reject(ERROR_CANCELLED, "The recording was cancelled.") }
    }
    super.invalidate()
  }

  private fun settle(action: (Promise) -> Unit) {
    val promise = synchronized(stateLock) {
      pending.also { pending = null }
    } ?: return

    action(promise)
  }

  private fun startListening(languageTag: String) {
    recognizer?.destroy()
    val engine = SpeechRecognizer.createSpeechRecognizer(reactContext)
    recognizer = engine
    engine.setRecognitionListener(listener)

    val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
      putExtra(
        RecognizerIntent.EXTRA_LANGUAGE_MODEL,
        RecognizerIntent.LANGUAGE_MODEL_FREE_FORM,
      )
      putExtra(RecognizerIntent.EXTRA_LANGUAGE, languageTag)
      putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, MAX_RESULTS)
      putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false)
      putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true)
    }

    engine.startListening(intent)
  }

  private val listener = object : RecognitionListener {
    override fun onReadyForSpeech(params: Bundle?) = Unit
    override fun onBeginningOfSpeech() = Unit
    override fun onRmsChanged(rmsdB: Float) = Unit
    override fun onBufferReceived(buffer: ByteArray?) = Unit
    override fun onEndOfSpeech() = Unit
    override fun onPartialResults(partialResults: Bundle?) = Unit
    override fun onEvent(eventType: Int, params: Bundle?) = Unit

    override fun onError(error: Int) {
      val code = when (error) {
        SpeechRecognizer.ERROR_NO_MATCH,
        SpeechRecognizer.ERROR_SPEECH_TIMEOUT,
        -> ERROR_NO_SPEECH
        SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> ERROR_PERMISSION
        else -> ERROR_RECOGNITION
      }
      settle { it.reject(code, "Speech recognition failed with code $error.") }
    }

    override fun onResults(results: Bundle?) {
      val heard = results
        ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
        .orEmpty()

      settle { promise ->
        val payload = Arguments.createArray()
        heard.forEach(payload::pushString)
        promise.resolve(payload)
      }
    }
  }

  companion object {
    const val NAME = "SayLensSpeechRecognition"

    private const val MAX_RESULTS = 5
    private const val ERROR_BUSY = "E_SPEECH_BUSY"
    private const val ERROR_CANCELLED = "E_SPEECH_CANCELLED"
    private const val ERROR_NO_SPEECH = "E_SPEECH_NO_MATCH"
    private const val ERROR_PERMISSION = "E_SPEECH_PERMISSION"
    private const val ERROR_RECOGNITION = "E_SPEECH_RECOGNITION"
    private const val ERROR_UNAVAILABLE = "E_SPEECH_UNAVAILABLE"
  }
}
