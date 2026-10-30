# Cat animations

Put Lottie animation files here, downloaded from lottiefiles.com as **Lottie JSON**.
The app looks for exactly these names; any missing one shows a bouncing emoji instead.

| File | Where it shows | Search LottieFiles for |
|------|----------------|------------------------|
| `peek.json` | Small cat next to "Kiro's Library" in the header | "cat peeking", "cute cat head" |
| `wave.json` | Login screen | "cat waving", "cat hello" |
| `sleep.json` | Empty folders | "sleeping cat" |
| `walk.json` | Above the upload progress bar | "cat walking" |
| `loading.json` | Every loading screen | "cat loading", "paw loading" |

Tips:
- Check the animation's license on its page. The free "Lottie Simple License" allows use in your app.
- Keep each file under ~150 KB (smaller = faster on phones).
- Pink-ish ones fit the theme. LottieFiles' editor can recolour an animation before you download it.
- After adding or replacing a file, reload the app (the service worker refreshes cats in the background).
