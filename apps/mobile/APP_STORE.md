# Bosun iOS: what to set up outside the repo

Everything the code can't do for you, in the order to do it. Fill the blanks into `app.json` / `eas.json`
where noted; never commit secrets.

## Apple Developer (developer.apple.com)

- [ ] **Team ID.** Account → Membership. Put it in `apps/web/public/.well-known/apple-app-site-association`
      (replace `TEAMID` in both places) and `eas.json` → `submit.production.ios.appleTeamId`. Redeploy the web
      so the file is live at `https://getbosun.app/.well-known/apple-app-site-association` (Apple caches it via
      its CDN; allow up to a day).
- [ ] **App ID** `app.getbosun.ios` with capabilities **Push Notifications** and **Associated Domains**.
      (EAS creates it on the first build if you let it manage credentials.)
- [ ] **APNs key** (Keys → +, "Apple Push Notifications service"). Upload it to EAS: `eas credentials` →
      iOS → Push Notifications. Expo's push service uses it; the server never sees it.

## Expo / EAS (expo.dev)

- [ ] `npm i -g eas-cli`, `eas login`, then in `apps/mobile`: `eas init` (writes `extra.eas.projectId` into
      `app.json`; commit that).
- [ ] If your Expo account enforces push security, create an access token and set `EXPO_ACCESS_TOKEN` on the
      web server (Vercel env) so `/api/v1/push/dispatch` can send.
- [ ] `eas build --profile development --platform ios` for the simulator build; `--profile preview` for a
      device build you can install over the air.

## Supabase

- [ ] Run migrations `20261022` → `20261027` (SQL Editor, "without RLS").
- [ ] Database Webhook on `notifications` INSERT → `POST https://getbosun.app/api/v1/push/dispatch` with
      header `x-bosun-webhook-secret: <PUSH_WEBHOOK_SECRET>` (dashboard, or fill the secret into
      `20261025_push_webhook.sql` and run it).
- [ ] Auth → URL Configuration: add `https://getbosun.app/login` to Redirect URLs if it isn't there. Sign-up
      confirmation emails link there; with universal links the tap opens the app when installed.

## Vercel (web server)

- [ ] Env: `PUSH_WEBHOOK_SECRET` (long random string, same as the webhook header), `SUPABASE_SERVICE_ROLE_KEY`
      (already needed by admin), optional `EXPO_ACCESS_TOKEN`.

## App Store Connect (appstoreconnect.apple.com)

- [ ] New app: name **Bosun**, bundle ID `app.getbosun.ios`, SKU `bosun-ios`, primary language English (U.S.).
      Put the App Store Connect app ID (the numeric "Apple ID" on the App Information page) in `eas.json` →
      `submit.production.ios.ascAppId`.
- [ ] **TestFlight**: `eas build --profile production --platform ios` then `eas submit --platform ios`.
      Add an internal testing group; external groups need Beta App Review.
- [ ] **App Privacy** (nutrition labels). Data collected and linked to the user: contact info (name, email,
      phone), user content (photos, messages, invoices and receipts the owner imports), identifiers (user ID),
      coarse location (home port / rounded job coordinates), precise location only while "Near me" is on in
      Find a Shop (never stored), usage data. No tracking, no third-party advertising.
- [ ] **Sign-in for review**: a demo owner and a demo shop account on production (email + password), with at
      least one open job and one bid between them, in the "Sign-In Information" box.
- [ ] **Review notes** (paste): "Bosun connects boat owners with marine repair shops. Owners post jobs and
      accept bids; shops bid and message. Payments for the physical service are arranged with the shop
      directly or through Stripe on the website (3.1.3(e)). Shop subscription plans are purchased and managed
      on getbosun.app only; the app offers no way to buy or upgrade a plan and shows no pricing (3.1.1 does
      not apply). Push notifications are for bids, messages and matching jobs; they can be turned off in iOS
      Settings."
- [ ] **Age rating** questionnaire: none of the listed content → 4+.
- [ ] **Screenshots**: 6.9" and 6.5" iPhone sets (the simulator's iPhone 16 Pro Max and iPhone 11 Pro Max
      sizes). Suggested: Home (boat + what's due), Boat Log, Maintenance, a job with bids, Find a Shop, a chat.
- [ ] **Review notes, AI**: the invoice import and the service schedule send the owner's own file or engine
      details to the Bosun server, which reads them with Claude; nothing is trained on. Mention it if asked.
- [ ] **Support URL** `https://getbosun.app`, **Privacy Policy URL** `https://getbosun.app/privacy`,
      **Terms** `https://getbosun.app/terms` (both pages exist on the web app).
- [ ] **Export compliance**: the app uses only HTTPS; `ITSAppUsesNonExemptEncryption` is already `false` in
      `app.json`, so no yearly self-classification report is needed.

## Before the first production build

- [ ] Replace the placeholder icon and splash in `apps/mobile/assets/` with the Bosun mark (1024×1024 icon,
      no transparency; splash on navy `#052443`).
- [ ] Bump `version` in `app.json` for each store release; `eas.json` auto-increments the build number.
- [ ] Decide whether Android ships: `app.json` already carries the package name and link intent filter, but
      nothing here has been tested on Android.

## Subscriptions (decided: web only)

Shops buy and manage plans on getbosun.app. The app never shows plan prices, "upgrade" buttons, or links
to the pricing page. Showing a plan's *status* is fine. If that changes, Apple will require In-App Purchase
for any plan sold inside the app (guideline 3.1.1) and takes its commission on it.

## Social login (decided: none in v1)

Email + password only. If Google or any other third-party login is ever added on either platform, Apple
requires Sign in with Apple as well (guideline 4.8): `expo-apple-authentication` →
`supabase.auth.signInWithIdToken({ provider: "apple" })`, plus enabling the Apple provider in Supabase
with a Services ID.
