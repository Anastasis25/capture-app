# Google Places Setup

The prototype can use Google Places lookup to fill details for restaurants, cafes, shops, and places.

Because the prototype is hosted as a static GitHub Pages app, do not commit an API key into the repository.

Instead, create a browser-restricted key and paste it into the app on the device you are testing with. The key is saved only in that browser/device.

## Enable APIs

In Google Cloud Console, enable:

```text
Maps JavaScript API
Places API
```

## Create API Key

Create an API key for browser use.

Restrict it by website referrer:

```text
https://anastasis25.github.io/capture-app/*
```

For local testing, you may also add:

```text
http://localhost:*
file://*
```

Remove broad/local referrers before production.

## Use In The App

1. Open Luxe Capture.
2. Paste the restricted API key into `Google Places API key`.
3. Tap `Save key`.
4. Tap `Enable lookup`.
5. Start typing in `Find place`.
6. Choose a Google suggestion.

The app will fill available details such as:

```text
name
address
phone
website
Google Maps URL
```

## Cost Control

Set a billing budget and quota cap in Google Cloud.

For this app, avoid calling Places on every save. Only fetch place details when the user explicitly chooses a place.
