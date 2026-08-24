# Performance engineering strategy

## Portfolio intent

SayLens is both a useful camera-based learning product and a realistic mobile
performance laboratory. Its workload combines a live camera, on-device machine
learning, native memory ownership, concurrent Kotlin workers, React rendering,
and UI-thread animation.

The public story should not be "React Native reached 30 FPS." It should show how
the system was measured, where each frame spends time, which resource trade-offs
were accepted, and how the implementation changes when the evidence changes.

This project can demonstrate:

- React Native New Architecture and Hermes in a production-shaped application;
- explicit JavaScript, UI, camera, and native-inference thread boundaries;
- a typed Nitro/Kotlin bridge that keeps camera pixels out of JavaScript;
- backpressure, frame lifetime, concurrency, and stale-result handling;
- on-device MediaPipe inference without a backend;
- React render control and Reanimated UI-thread interpolation;
- release profiling, sustained-device testing, and evidence-driven trade-offs.

## Current evidence

The repository history already forms a useful engineering narrative:

1. architecture and product decisions were documented before implementation;
2. the Android React Native baseline was validated on physical hardware;
3. VisionCamera was isolated behind infrastructure and MVVM boundaries;
4. a local Nitro module connected camera frames to MediaPipe;
5. a synchronous detector established the first measured baseline;
6. four bounded native workers removed inference from the camera callback;
7. presentation updates were capped and geometry interpolation moved to the UI
   thread;
8. vocabulary content was added without moving pixels or inference into React.

The current debug snapshot on a Samsung SM-M536B improved the camera preview
from about 10 FPS to about 30 FPS and aggregate detector throughput from about
5 FPS to about 30 FPS. The same configuration used about 324% to 339% process
CPU and 529 to 533 MB resident memory. These numbers prove throughput on one
device; they do not yet prove efficiency, release performance, or sustained
thermal behavior.

## Selectable performance profiles

The application exposes exactly two profiles instead of a device-class
taxonomy:

- **Maximum performance** uses every core the device reports, capped at six,
  with all workers prewarmed at startup, one GPU worker when the delegate is
  safe, the highest supported camera frame rate, and a 640x360 detection
  resolution.
- **Power saving** uses one CPU worker at background thread priority, no GPU
  worker, a 15 FPS camera, and a 320x180 detection resolution.

Maximum performance deliberately spends CPU, memory, and battery. The only
budget it respects is the one that makes the overlay feel attached to the
camera image: worker counts that raise throughput but also raise result age are
rejected, because a fresher detection matters more than a larger FPS number.

### Evidence: Samsung Galaxy J6 (SM-J600GT)

The J6 has eight logical cores, 1.8 GB of memory, a Mali-T830, and runs the
application as a 32-bit process. Release-build measurements at a 720x480
detector buffer with the camera preview negotiated at 30 FPS:

| CPU workers      | Throughput      | Latency    | Result                           |
| ---------------- | --------------- | ---------- | -------------------------------- |
| 1 (power saving) | 1.7-2.2 inf/s   | 554-600 ms | stable                           |
| 4                | 7.2-8.2 inf/s   | 468-530 ms | stable, 238 MB PSS               |
| 6                | 9.6-11.0 inf/s  | 492-636 ms | stable, 301 MB RSS               |
| 8                | 11.4-12.0 inf/s | 598-745 ms | stable, results 150-250 ms older |

Six workers are the measured optimum. Eight add no reliable throughput and make
each result noticeably older, which is exactly what makes a moving overlay feel
detached from the image, so the ceiling stays at six and leaves two cores to the
camera and UI pipelines.

### Why worker calibration was removed

An earlier revision ramped the worker pool at runtime and kept the smallest
count within 95% of peak throughput. Two measurements retired it:

1. It optimized for efficiency, which is the opposite of what the maximum
   profile promises, and it settled on four workers on the J6.
2. Creating MediaPipe detector instances while other instances are already
   running inference reproducibly kills the 32-bit process with `SIGBUS`
   (`BUS_ADRERR`) inside `libmediapipe_tasks_jni.so`. The ramp from four to
   eight workers crashed the app every time it was attempted.

Both profiles now build their entire worker pool up front. Detector creation is
serialized behind one lock and every CPU worker is prewarmed before the first
camera inference, which costs about 2.4 seconds when the camera screen opens for
the first time and then holds a steady pool for the rest of the session.

### GPU delegate safety

MediaPipe creates an EGL context per detector instance even for CPU inference,
and a delegate that aborts the process cannot be caught in Kotlin: the J6's
32-bit graphics stack crashed inside `libmediapipe_tasks_jni.so` when the GPU
path was forced. The GPU worker is therefore offered only when the process is
64-bit, the device reports OpenGL ES 3.1 or newer, and no previous probe failed.
The first GPU inference on a device is bracketed by a synchronously persisted
marker: if the process never returns from it, the next launch counts an
incomplete probe and blocks the delegate after the second one. A recoverable GPU
failure falls back to CPU and blocks the delegate immediately.

## Performance thesis

The next phase optimizes for a balanced real-time experience rather than the
largest isolated FPS number. Every change follows this loop:

1. measure a repeatable baseline;
2. change one variable;
3. repeat the same scenario;
4. compare distributions and resource cost;
5. keep the change only when the user-visible result improves.

The preferred configuration should maintain a smooth preview and fresh,
readable overlays while consuming materially less CPU and memory than the
current maximum-throughput setup.

## Metrics

Each published run should capture the following together:

- **Smoothness:** camera preview FPS, UI frame rate, slow frames, and frozen
  frames;
- **Detection:** accepted camera frames, dropped frames, completed inferences,
  detector throughput, and inference latency p50, p95, and p99;
- **Freshness:** time from frame capture to the detection becoming visible, plus
  the age of the latest result when React presents it;
- **React:** commit count, render count for the camera screen and object cards,
  and duration of the heaviest commit for the measured flow;
- **Resources:** process CPU, PSS or RSS, Java heap, native heap, allocation
  rate, and garbage-collection events;
- **Sustainability:** battery delta, thermal status, clock throttling, and metric
  drift during ten- and thirty-minute sessions;
- **Delivery:** cold-start time to first usable camera frame, JavaScript bundle
  size, release APK or AAB size, and 16 KB native-library alignment.

No public before-and-after claim should mix debug and release builds, different
devices, different scenes, or different measurement durations.

## Reproducible scenario

The first benchmark protocol should use a physical Android device and record:

- commit SHA, dirty-tree state, build type, dependency lockfile hash, and app
  version;
- device model, Android version, battery level, thermal status, display mode,
  and ambient conditions;
- fixed camera, model, score threshold, output resolution, and worker count;
- a documented scene containing the same supported COCO objects in stable
  positions;
- a two-minute warm-up followed by a ten-minute measured run;
- at least five runs per configuration, reporting the median run and latency
  percentiles rather than the best sample;
- a separate thirty-minute run for thermal and battery behavior.

Development builds remain useful for React and JavaScript diagnosis. Public
performance comparisons must use a release or explicitly profileable build
without Metro or development instrumentation.

## Experiment backlog

### PERF-001: Measurement foundation

- add a repeatable benchmark build and capture script;
- emit structured detector counters and latency samples instead of relying only
  on five-second log summaries;
- record run metadata beside every result;
- save commands and raw evidence needed to reproduce each published number.

Acceptance: the same commit and device can run the protocol five times and
produce comparable machine-readable results.

### PERF-002: Native allocation pressure

The current detector clears each worker's `inputBitmap` reference after an
inference. Treat retaining and reusing one correctly sized bitmap per worker as
a hypothesis, then verify allocation rate, GC activity, memory, and throughput
before changing the ownership model permanently. Also measure the compact RGBA
copy path independently from MediaPipe inference.

Acceptance: allocation and memory evidence explains whether bitmap and buffer
reuse improves sustained behavior without corrupting frames or detector output.

### PERF-003: Worker and resolution curve

Compare one through four workers at the supported detector resolutions. Capture
preview smoothness, result freshness, latency percentiles, CPU, memory, battery,
and thermal drift for every configuration.

Acceptance: the default is selected from an evidence-backed efficiency curve,
not from the largest throughput value. A future adaptive scheduler may reduce
workers when the device becomes hot or when the scene is stable.

### PERF-004: Result freshness and tracking

Instrument frame sequence, capture time, inference completion, native publish,
React acceptance, and visible presentation. Replace label-plus-array-index IDs
with stable tracks based on label and bounding-box overlap, and expire stale
tracks deterministically.

Acceptance: overlays do not swap identity when detector ordering changes, and
the published result-age distribution remains inside the chosen interaction
budget.

### PERF-005: React and UI-thread cost

Profile the exact live-detection flow with React DevTools. Record why the camera
screen and each object card render, inspect the heaviest commit, and verify that
interpolation frames stay on the UI thread without creating React commits.

Acceptance: the evidence distinguishes detector updates, React reconciliation,
layout work, and Reanimated interpolation instead of treating them as one FPS
number.

### PERF-006: Sustained mobile efficiency

Run ten- and thirty-minute sessions with the selected worker configuration.
Capture thermal status, battery delta, CPU, memory growth, preview smoothness,
and detector freshness over time. Include at least one less-capable Android
device before making a broad hardware claim.

Acceptance: no unbounded memory growth occurs, degradation over time is
documented, and the default can be justified for its target device class.

### PERF-007: Startup and release footprint

Measure cold startup to first usable camera frame, analyze the JavaScript bundle
and release artifact, test R8 and resource shrinking, restrict release ABIs as
appropriate, and verify every packaged native library for 16 KB page alignment.

Acceptance: release startup and size have reproducible baselines, optimizations
are validated on device, and native-library alignment is checked before public
distribution.

## Publication gate

The performance case study is ready to publish when it contains:

- one reproducible baseline and one improved release configuration;
- raw and summarized evidence for smoothness, latency, freshness, CPU, memory,
  and sustained thermals;
- a documented experiment that did not improve the result and was rejected;
- architecture and Perfetto or profiler visuals that explain why the winning
  change worked;
- exact device, build, commit, scenario, and known limitations;
- a concise demo that links to the reproducible repository evidence.

The current 30 FPS detector snapshot remains valuable as the origin of the case
study. It should be presented as the high-throughput baseline whose efficiency
the next experiments will improve.
