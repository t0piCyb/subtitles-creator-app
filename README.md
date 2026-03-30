# Sous-titres Creator — App Android

Application mobile React Native qui transcrit des vidéos et grave les sous-titres, 100% en local sur le téléphone.

## Fonctionnalités

- Sélection de vidéo depuis la galerie
- Transcription locale avec Whisper (modèle base, 148 Mo, téléchargé au premier lancement)
- Éditeur de sous-titres mot par mot avec preview vidéo en temps réel
- Fusion automatique des mots composés français (l'homme, qu'est-ce, etc.)
- Incrustation des sous-titres avec FFmpeg (format ASS, jaune Montserrat Bold)
- Adaptation automatique à l'orientation vidéo (16:9 / 9:16)
- Sauvegarde dans la galerie

## Stack

- **React Native** (Expo SDK 54, dev builds)
- **whisper.rn** — Whisper on-device (whisper.cpp)
- **ffmpeg-kit-react-native** — FFmpeg natif (fork moizhassankh pour Android 15+)
- **react-native-video** — Lecture vidéo
- **Zustand** — État global
- **expo-file-system / expo-image-picker / expo-media-library**

## Prérequis (build local)

```bash
# Java 17
brew install --cask temurin@17

# Android SDK
brew install --cask android-commandlinetools
export ANDROID_HOME=$HOME/Library/Android/sdk
yes | sdkmanager --sdk_root="$ANDROID_HOME" \
  "platforms;android-36" "platforms;android-33" \
  "build-tools;36.0.0" "platform-tools" \
  "ndk;27.1.12297006" "cmake;3.22.1"
```

## Installation

```bash
pnpm install
```

## Build APK (local)

```bash
# Générer le projet Android
npx expo prebuild --platform android

# Builder l'APK release
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
export ANDROID_HOME=$HOME/Library/Android/sdk
cd android && ./gradlew :app:assembleRelease -x lint -x test --no-daemon
```

L'APK est dans `android/app/build/outputs/apk/release/app-release.apk`

## Build APK (EAS Cloud)

```bash
eas build --platform android --profile production
```

Nécessite un compte Expo et `eas.json` configuré avec `pnpm`.

## Installer sur Android

```bash
# Via USB (debug USB activé)
adb install android/app/build/outputs/apk/release/app-release.apk

# Si une ancienne version existe avec une signature différente
adb uninstall com.t0pi.subtitlescreatorapp
adb install android/app/build/outputs/apk/release/app-release.apk
```

## Structure

```
src/
  screens/          # 4 écrans : Home, Transcribing, Editor, Export
  components/       # VideoPreview, SubtitleList, SubtitleItem, FontSizeSlider, etc.
  services/         # whisperService, ffmpegService, fileService, modelService
  utils/            # assGenerator, compoundWords, timeFormat
  store/            # Zustand (useProjectStore)
  constants/        # theme, subtitleDefaults
  types/            # TypeScript types
assets/fonts/       # Montserrat-Bold.ttf
patches/            # patch-package pour ffmpeg-kit (fork Maven)
```

## Notes

- **ffmpeg-kit** : le package original (arthenica) a été retiré de Maven Central en avril 2025. Un patch (`patches/ffmpeg-kit-react-native+6.0.2.patch`) redirige vers le fork communautaire `com.moizhassan.ffmpeg:ffmpeg-kit-16kb:6.1.1`.
- **expo-file-system** : on utilise la v19 (compatible SDK 54) avec l'import `expo-file-system/legacy` car l'API class-based a des bugs Android.
- **Whisper** : le modèle `ggml-base.bin` est téléchargé depuis Hugging Face au premier lancement. Les segments sont limités à 15 caractères (`maxLen: 15`) pour obtenir des sous-titres mot par mot.
