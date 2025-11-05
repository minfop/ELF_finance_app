# ELF Finance Mobile (Expo WebView)

This is a lightweight React Native (Expo) wrapper that loads the existing web app inside a WebView for Android and iOS.

## Prerequisites
- Node 18+
- Expo CLI (optional): `npm i -g expo` (or use `npx`)
- Android Studio (emulator) and/or Xcode (iOS Simulator)

## Install & Run

```bash
cd mobile
npm install
# set your BASE URL in app.json -> expo.extra.baseUrl (recommended)
# For local dev defaults: Android uses http://10.0.2.2:5173, iOS uses http://localhost:5173
npm run start
# then press 'a' for Android or 'i' for iOS
```

## Configure BASE URL
Set the web app URL in `app.json` under `expo.extra.baseUrl`:

```json
{
  "expo": {
    "extra": {
      "baseUrl": "https://your-domain-or-ip:port"
    }
  }
}
```

- Android emulator localhost is `http://10.0.2.2:<port>`.
- iOS simulator localhost is `http://localhost:<port>`.

The app uses platform defaults if `extra.baseUrl` is empty.

## External Links
- `tel:`, `mailto:`, and `geo:` open the platform handlers (Phone, Mail, Maps).
- External domains open in the system browser.

## HTTP (non-HTTPS)
- iOS allows arbitrary loads via ATS in this config for development.
- Android `mixedContentMode` is set to `always`.

For production, host over HTTPS and harden ATS/permissions accordingly.
