# App

This is the composition root and application shell.

It owns startup, the shared styled-components theme, bottom navigation,
dependency construction, and feature registration. `useAppViewModel` owns
shell-level state such as the selected tab and framing-guide preference.

Concrete infrastructure adapters are created here and passed into feature
Screens. Business rules and platform SDK details do not live in the app shell.
