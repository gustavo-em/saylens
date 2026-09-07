package com.gustavoem.lesingo.reminders

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.provider.AlarmClock
import android.provider.CalendarContract
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.module.annotations.ReactModule
import java.util.Calendar

/**
 * Hands a practice reminder to the phone's own clock and calendar.
 *
 * Both are sent as intents that open the system app with the fields already
 * filled, and the learner confirms there. Writing an alarm or an event
 * directly would need SET_ALARM and WRITE_CALENDAR, and a calendar permission
 * turns "Calendar" into a data type the store listing has to declare and the
 * app has to justify. This app reads nothing and stores nothing; it only asks
 * another app to offer something the learner then accepts or dismisses.
 */
@ReactModule(name = PractiseReminderModule.NAME)
class PractiseReminderModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = NAME

  @ReactMethod
  fun capabilities(promise: Promise) {
    val result = com.facebook.react.bridge.Arguments.createMap()
    result.putBoolean("alarm", canHandle(alarmIntent(7, 0, "")))
    result.putBoolean("calendar", canHandle(calendarIntent(7, 0, "", "")))
    promise.resolve(result)
  }

  @ReactMethod
  fun scheduleAlarm(
    hour: Double,
    minute: Double,
    label: String,
    promise: Promise,
  ) {
    launch(alarmIntent(hour.toInt(), minute.toInt(), label), promise)
  }

  @ReactMethod
  fun scheduleCalendarEvent(
    hour: Double,
    minute: Double,
    title: String,
    note: String,
    promise: Promise,
  ) {
    launch(calendarIntent(hour.toInt(), minute.toInt(), title, note), promise)
  }

  /** Repeats every day: a streak is fed daily or not at all. */
  private fun alarmIntent(hour: Int, minute: Int, label: String): Intent =
    Intent(AlarmClock.ACTION_SET_ALARM).apply {
      putExtra(AlarmClock.EXTRA_HOUR, hour)
      putExtra(AlarmClock.EXTRA_MINUTES, minute)
      putExtra(AlarmClock.EXTRA_MESSAGE, label)
      putExtra(AlarmClock.EXTRA_DAYS, ArrayList(EVERY_DAY))
      // The clock app shows its own screen, so no SET_ALARM permission is
      // needed and nothing happens without the learner tapping save.
      putExtra(AlarmClock.EXTRA_SKIP_UI, false)
    }

  private fun calendarIntent(
    hour: Int,
    minute: Int,
    title: String,
    note: String,
  ): Intent {
    val start = nextOccurrence(hour, minute)

    return Intent(Intent.ACTION_INSERT).apply {
      data = CalendarContract.Events.CONTENT_URI
      putExtra(CalendarContract.Events.TITLE, title)
      putExtra(CalendarContract.Events.DESCRIPTION, note)
      putExtra(CalendarContract.EXTRA_EVENT_BEGIN_TIME, start)
      putExtra(CalendarContract.EXTRA_EVENT_END_TIME, start + SESSION_MINUTES * 60_000L)
      putExtra(CalendarContract.Events.RRULE, "FREQ=DAILY")
    }
  }

  /** Today if that time is still ahead, tomorrow otherwise. */
  private fun nextOccurrence(hour: Int, minute: Int): Long {
    val moment = Calendar.getInstance().apply {
      set(Calendar.HOUR_OF_DAY, hour)
      set(Calendar.MINUTE, minute)
      set(Calendar.SECOND, 0)
      set(Calendar.MILLISECOND, 0)
    }

    if (moment.timeInMillis <= System.currentTimeMillis()) {
      moment.add(Calendar.DAY_OF_YEAR, 1)
    }

    return moment.timeInMillis
  }

  private fun canHandle(intent: Intent): Boolean =
    intent.resolveActivity(reactContext.packageManager) != null

  private fun launch(intent: Intent, promise: Promise) {
    val activity: Activity? = reactContext.currentActivity

    try {
      if (activity != null) {
        activity.startActivity(intent)
      } else {
        // Started from the application context, so it needs its own task.
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        reactContext.startActivity(intent)
      }
      promise.resolve(null)
    } catch (error: ActivityNotFoundException) {
      promise.reject(E_NO_APP, "No app on this phone can take that.", error)
    }
  }

  companion object {
    const val NAME = "LesingoPractiseReminder"
    const val E_NO_APP = "E_REMINDER_NO_APP"
    private const val SESSION_MINUTES = 10L
    private val EVERY_DAY = listOf(
      Calendar.SUNDAY,
      Calendar.MONDAY,
      Calendar.TUESDAY,
      Calendar.WEDNESDAY,
      Calendar.THURSDAY,
      Calendar.FRIDAY,
      Calendar.SATURDAY,
    )
  }
}
