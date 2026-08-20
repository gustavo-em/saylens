# Android baseline validation

This record makes Milestone 1 reproducible and distinguishes verified behavior
from planned camera and machine-learning work.

## Validation run

- Date: 2026-08-20
- Device: Samsung SM-M536B
- Android: 14 (API 34)
- Connection: physical device over USB
- Application ID: `com.gustavoem.spellforme`
- React Native: 0.87.0
- React: 19.2.3
- Node.js: 24.11.1
- npm: 11.6.2
- Java: 17.0.17
- Gradle: 9.4.1
- Android compile SDK: 37
- Android target SDK: 36
- Android minimum SDK: 24
- React Native New Architecture: enabled
- Hermes: enabled

## Results

The local quality gate passed:

```text
prettier --check .       passed
eslint .                 passed
tsc --noEmit             passed
jest --runInBand         1 suite, 1 test passed
```

The Android debug build completed successfully, installed through ADB, and
started `com.gustavoem.spellforme/.MainActivity`. Android reported the process
running, the activity resumed and visible, and its window fully drawn. The UI
hierarchy contained the expected milestone copy and all four architecture
labels.

![SpellForMe Android baseline running on a physical Samsung device](assets/android-baseline.png)

## Dependency audit note

On the validation date, `npm audit --omit=dev` reported eight high-severity
findings that resolve to the same transitive `image-size@1.2.1` path through
React Native and Metro. The suggested forced remediation would replace the
React Native 0.87 Metro configuration with 0.86.2, which is a breaking
downgrade.

The advisories identify `2.0.3` as the patched `image-size` version, but that
version has not been published. This is tracked upstream in
[github/advisory-database#9028](https://github.com/github/advisory-database/issues/9028).
The baseline therefore keeps the coherent React Native 0.87 dependency set,
does not apply `npm audit fix --force`, and will re-evaluate the finding when an
installable upstream fix is available.

For the current baseline, the affected package is used by the local Metro asset
pipeline. The app does not ingest untrusted ICNS, JXL, or HEIF assets at
runtime. Repository assets should still be treated as reviewed source input.

## Camera-first validation

The Milestone 2 camera foundation was validated on the same physical Samsung
device on 2026-08-20 with VisionCamera 5.2.2, Nitro Modules 0.37.0, Nitro Image
0.15.2, and styled-components 6.5.3.

The Android build compiled all native camera dependencies, installed, and
launched successfully. After granting the runtime permission, Android's camera
service reported camera `0` open by `com.gustavoem.spellforme` and the UI showed
the live camera state.

Lifecycle behavior was also verified through the Android camera service:

- opening Settings disconnected the camera and left no active camera client;
- returning to Camera reconnected camera `0` to the application;
- disabling the framing guide removed its overlay and enabling it restored the
  overlay without restarting the app.

![SpellForMe camera settings running on a physical Samsung device](assets/android-camera-settings.png)

The updated local quality gate passed with two application interaction tests:

```text
prettier --check .       passed
eslint .                 passed
tsc --noEmit             passed
jest --runInBand         1 suite, 2 tests passed
```

FrameOutput, object detection, bounding boxes, and the five-minute endurance
session remain explicitly unvalidated and are tracked in the roadmap.
