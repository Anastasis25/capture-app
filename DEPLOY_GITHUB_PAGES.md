# Deploy Prototype To GitHub Pages

Repository:

```text
https://github.com/Anastasis25/capture-app
```

Expected live URL after GitHub Pages is enabled:

```text
https://anastasis25.github.io/capture-app/
```

## Important Security Note

This first version is a static prototype.

The app code can be public if the repository is public. The captures you save in the prototype are stored in the browser on the device you use; they are not uploaded to GitHub.

Do not put secrets, credentials, client data, or private business data in the repository.

## Upload Files Without Git

Because Git is not currently available in the Codex terminal, use the GitHub web upload flow:

1. Open the empty `capture-app` repository on GitHub.
2. Click `uploading an existing file`.
3. Upload the contents of:

```text
C:\Users\admin\OneDrive - Esanda Engineering Limited\Desktop\capture-app
```

4. Commit directly to the `main` branch.

## Enable GitHub Pages

1. Open the repository on GitHub.
2. Go to `Settings`.
3. Go to `Pages`.
4. Under `Build and deployment`, choose:

```text
Source: Deploy from a branch
Branch: main
Folder: / (root)
```

5. Click `Save`.
6. Wait for GitHub to finish publishing.
7. Open:

```text
https://anastasis25.github.io/capture-app/
```

## Phone Testing

Open the live URL on your phone.

On iPhone:

1. Open the URL in Safari.
2. Tap Share.
3. Tap `Add to Home Screen`.

On Android:

1. Open the URL in Chrome.
2. Tap the menu.
3. Tap `Install app` or `Add to Home screen`.

## Later

Once Git works locally, use normal commits and pushes instead of manual upload.
