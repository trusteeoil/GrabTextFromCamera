# Photo Text — GitHub Pages PWA

A static, phone-first photo-to-text collector. Each photo appends all OCR-recognized text under a numbered heading (`Picture 1:`, `Picture 2:`, etc.). Edit, copy, or export the combined text.

## Deploy to GitHub Pages

1. Create a GitHub repository (for example, `photo-text`).
2. Upload all files from this folder **to the repository root** (do not upload the containing folder instead).
3. Open **Settings → Pages → Build and deployment**, select **Deploy from a branch**, **main**, and **/(root)**; save.
4. Open `https://YOUR-USERNAME.github.io/photo-text/` in Safari on your iPhone.
5. For an app icon: Safari **Share → Add to Home Screen**.

## Notes

- Uses Tesseract.js 6.0.1 from jsDelivr. **Internet is required to load the OCR engine** on initial use and may be required again after browser cache eviction. The app shell is service-worker cached, but full offline OCR is **not guaranteed**. Photos are processed locally in the browser; they are **not uploaded** to GitHub or an OCR API.
- Supports camera capture and multiple photo library selections; OCR runs sequentially.
- All extracted text is kept as-is other than trimming leading/trailing whitespace; nothing is filtered for serial numbers, and there is no QR or barcode decoder.
- Text and picture count are saved in the browser's localStorage. Safari may clear site storage; export/copy important data regularly. No photos are saved.
- Large pictures are downscaled to 2400 pixels on their longest side before OCR to reduce memory usage. Small/faint text may be missed; clear, close photos work best.
- If the CDN is blocked, the engine cannot load. Internet is also needed when opening GitHub Pages for the first time.
- `Save .txt` uses Safari's file download behavior; on iPhone you may find files in Files → Downloads.

## Development

This is plain HTML/CSS/JavaScript: no build step or backend required. For local testing of the service worker, serve the directory using localhost rather than opening the HTML as a file.
