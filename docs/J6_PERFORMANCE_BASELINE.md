# Galaxy J6 performance baseline

Measured on 2026-08-23 with a Samsung Galaxy J6 (`SM-J600GT`), Android 10,
32-bit `armeabi-v7a`, while the back camera preview was active at a negotiated
30 FPS. The model and worker comparisons below use a debug build and are
directional rather than a laboratory benchmark; CPU is a single instantaneous
sample and scene, device temperature, and Android memory reclamation can vary
between runs.

## EfficientDet-Lite0 int8, two workers, 640 × 360 target

- Detector throughput: 4.6–4.7 inferences/s.
- Latest observed latency: 418–439 ms.
- CPU sample: 222%.
- Total PSS after an extended session: 457 MB.
- Swap PSS after an extended session: 179 MB.
- Result: highest detector throughput, but severe memory pressure and less CPU
  headroom for camera preview and UI work.

## EfficientDet-Lite0 int8, one worker, 640 × 360 target

- Detector throughput: 2.2 inferences/s.
- Latest observed latency: 478 ms.
- CPU sample: 141%.
- Total PSS: 362 MB.
- Swap PSS: 1.8 MB.
- Result: substantially more camera and system headroom at the cost of detector
  update frequency.

## EfficientDet-Lite0 int8, one worker, 320 × 180 target

The J6 negotiated an actual detector buffer of 256 × 144 for this target.

- Detector throughput: 2.2 inferences/s.
- Latest observed latency: 455 ms.
- CPU sample: 163%.
- Total PSS: 342 MB.
- Swap PSS: 0.1 MB.
- Result: retained throughput, reduced latest latency, reduced graphics memory,
  and nearly eliminated early-session swap pressure.

## SSD MobileNetV2 float16, one worker, 320 × 180 target

- Detector throughput: 1.9 inferences/s.
- Latest observed latency: 535 ms.
- CPU sample: 158%.
- Total PSS: 341 MB.
- Swap PSS: 17.7 MB.
- Result: 14% lower throughput and 18% higher latency than EfficientDet-Lite0
  int8 in this J6 sample. The candidate was therefore not bundled in the app.

The official MediaPipe model guide describes SSD MobileNetV2 as a generally
faster but less accurate alternative with a 256 × 256 input. Its published
download currently provides a float16 artifact, while the current SpellForMe
model is int8; the J6's CPU favored the quantized EfficientDet model in the
device benchmark.

Source: <https://developers.google.com/edge/mediapipe/solutions/vision/object_detector#models>

## Previous one-worker release baseline

The final release build uses EfficientDet-Lite0 int8, one reusable worker, a
320 × 180 detector target negotiated to 256 × 144, fresh-result-only bridge
updates, and predictive UI-thread tracking.

- Detector throughput across five windows: 2.0–2.2 inferences/s.
- Latest observed latency: 451–492 ms.
- CPU sample: 125%.
- Total PSS: 135 MB.
- Resident set: 164 MB.
- Swap PSS: 0.14 MB.
- Camera preview remained negotiated at 30 FPS.
- Result: release mode reduced total PSS by roughly 60% compared with the same
  final pipeline in debug, without reducing detector throughput.

## Two-worker accuracy baseline in release mode

To reduce the time before a layer first appears without accepting low-confidence
labels, the low-end profile uses two prewarmed CPU workers and the original 0.55
confidence threshold. Its 640 × 360 target negotiates a 720 × 480 detector
buffer on the J6, giving the model substantially more visual detail than the
previous 256 × 144 buffer. The 30 FPS camera preview remains on its own pipeline.

- Both model instances finished prewarming before the first camera inference.
- First inference latency after warm-up: 474–497 ms, compared with roughly
  983 ms when the first inference also initialized the model.
- Detector throughput across five windows: 3.8–4.5 inferences/s.
- Latest observed latency: 454–518 ms.
- Approximate interval between completed attempts: 222–263 ms, down from
  455–500 ms with one worker.
- CPU sample: 252%.
- Total PSS: 163 MB.
- Swap PSS: 0.14 MB.
- Camera preview remained negotiated at 30 FPS and the process stayed stable.

The optimization increases throughput rather than making one inference twice
as fast. It therefore reduces the visible acquisition delay when the first
sample misses an object. Raising input detail and rejecting detections below
55% trades a small amount of latency and memory for fewer false positives.

## Maximum-throughput CPU comparison

The final comparison kept the same 720 × 480 detector buffer, 0.55 confidence
threshold, release build, and 30 FPS camera configuration. Only the number of
concurrent detector workers changed.

- Four CPU workers: 7.2–8.2 inferences/s, 468–530 ms per inference, 418% CPU,
  and 238 MB PSS.
- Six CPU workers: 10.3–13.3 inferences/s during the final 60-second run,
  413–524 ms per inference, 583% CPU, and 309 MB PSS.
- Eight CPU workers: 11.4–12.0 inferences/s after warm-up, 598–745 ms per
  inference, 596% CPU, and 332 MB PSS.

Eight workers did not produce a reliable sustained throughput gain and made
each result roughly 150–250 ms older. That extra staleness makes a moving layer
feel less attached to the camera image, so six workers are the measured optimum
for the eight-core J6: a completed detection every 75–97 ms while leaving two
cores available to the camera and UI pipelines.

A seventh GPU worker was also tested. MediaPipe's GPU path crashed inside
`libmediapipe_tasks_jni.so` with `SIGBUS` on the J6's 32-bit graphics stack, so
the low-end capability gate continues to disable the GPU delegate.

The low-end profile now derives its CPU worker count from the processors
reported by Android, capped at six. All J6 workers are prewarmed sequentially:
creating new MediaPipe detector instances while existing instances were already
running inference also produced a native `SIGBUS` on its 32-bit runtime. This
costs roughly two seconds at startup but keeps continuous detection stable.

## Reproduce

Install the desired APK, keep the same scene and device temperature, then run:

```sh
npm run android:release
npm run benchmark:android
```

Use at least three runs per configuration. Compare median detector throughput,
latency, CPU, PSS, and swap instead of choosing a configuration from one peak
number.
