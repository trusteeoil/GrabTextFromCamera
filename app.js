'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const STORAGE_KEY = 'photo-text-v1';
  const cameraInput = $('cameraInput'), libraryInput = $('libraryInput'), result = $('result');
  const cameraBtn = $('cameraBtn'), libraryBtn = $('libraryBtn'), copyBtn = $('copyBtn'), downloadBtn = $('downloadBtn'), clearBtn = $('clearBtn');
  let pictureCount = 0, worker = null, busy = false, saveTimer = null;

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ text: result.value, pictureCount }));
      $('savedStatus').textContent = 'Saved locally';
    } catch (e) {
      $('savedStatus').textContent = 'Could not save locally — copy your text now';
    }
  }
  function setCount() { $('count').textContent = `${pictureCount} picture${pictureCount === 1 ? '' : 's'}`; }
  function message(text, isError = false) { $('message').textContent = text; $('message').style.color = isError ? '#bb3341' : '#748196'; }
  function progress(text, value) {
    $('progress').hidden = false;
    $('statusText').textContent = text;
    const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
    $('percentText').textContent = `${pct}%`;
    $('progressBar').style.width = `${pct}%`;
  }
  function lock(value) {
    busy = value; cameraBtn.disabled = value; libraryBtn.disabled = value; clearBtn.disabled = value;
    cameraBtn.textContent = value ? 'Reading picture…' : '◉ Take picture';
  }
  try {
    const prev = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (typeof prev.text === 'string') result.value = prev.text;
    if (Number.isSafeInteger(prev.pictureCount) && prev.pictureCount >= 0) pictureCount = prev.pictureCount;
  } catch (e) { message('Saved text could not be restored.'); }
  setCount();

  result.addEventListener('input', () => {
    $('savedStatus').textContent = 'Saving…';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 200);
  });
  // Save text before app is backgrounded on iOS.
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  window.addEventListener('pagehide', save);
  cameraBtn.addEventListener('click', () => cameraInput.click());
  libraryBtn.addEventListener('click', () => libraryInput.click());
  cameraInput.addEventListener('change', async e => { const files = Array.from(e.target.files || []); e.target.value = ''; await scanFiles(files); });
  libraryInput.addEventListener('change', async e => { const files = Array.from(e.target.files || []); e.target.value = ''; await scanFiles(files); });

  async function getWorker() {
    if (worker) return worker;
    if (!window.Tesseract) throw new Error('OCR engine could not load. Check your internet connection and reload the page.');
    progress('Loading OCR engine (first use may take longer)…', 0);
    worker = await window.Tesseract.createWorker('eng', 1, {
      logger: msg => {
        if (!busy) return;
        if (typeof msg.progress === 'number') {
          progress(msg.status || 'Processing…', msg.progress);
        }
      }
    });
    return worker;
  }

  async function shrinkImage(file) {
    // Downsize large iPhone photos to limit memory and speed up OCR.
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve; img.onerror = () => reject(new Error('This photo format could not be opened. Try taking a new photo.')); img.src = url;
      });
      const maxSide = 2400;
      const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) throw new Error('Unable to process the picture.');
      context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(img, 0, 0, canvas.width, canvas.height);
      return canvas;
    } finally { URL.revokeObjectURL(url); }
  }

  async function scanFiles(files) {
    if (busy || files.length === 0) return;
    lock(true);
    let successes = 0;
    try {
      const ocr = await getWorker();
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          progress(`Reading photo ${i + 1} of ${files.length}…`, 0);
          const img = await shrinkImage(file);
          const recognition = await ocr.recognize(img);
          const text = (recognition?.data?.text || '').trim();
          pictureCount++;
          const prefix = result.value.trim() ? '\n\n' : '';
          result.value += `${prefix}Picture ${pictureCount}:\n${text || '[No text detected]'}`;
          setCount(); save(); successes++;
          result.scrollTop = result.scrollHeight;
          message(`Added Picture ${pictureCount}. You can take another photo or copy the text.`);
        } catch (e) {
          message(`Photo ${i + 1} was not added: ${e.message || 'OCR failed'}.`, true);
        }
      }
      if (successes === files.length) message(`Added ${successes} picture${successes === 1 ? '' : 's'}. You can take another photo or copy the text.`);
    } catch (e) { message(e.message || 'OCR engine failed to start. Try again with internet access.', true); }
    finally { $('progress').hidden = true; lock(false); }
  }

  copyBtn.addEventListener('click', async () => {
    if (!result.value.trim()) return message('There is no text to copy yet.', true);
    try {
      await navigator.clipboard.writeText(result.value);
      message('Copied all text to your clipboard.');
    } catch (e) {
      result.focus(); result.select();
      try {
        if (!document.execCommand('copy')) throw Error();
        message('Copied all text to your clipboard.');
      } catch (err) { message('Text selected. Tap Copy in the selection menu.', true); }
    }
  });
  downloadBtn.addEventListener('click', () => {
    if (!result.value.trim()) return message('There is no text to save yet.', true);
    const blob = new Blob([result.value], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    const date = new Date(); const stamp = [date.getFullYear(), String(date.getMonth()+1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
    a.download = `photo-text-${stamp}.txt`; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    message('Text file ready to save or share.');
  });
  clearBtn.addEventListener('click', () => {
    if (!result.value && !pictureCount) return;
    if (!confirm('Delete all collected text and reset picture numbering? This cannot be undone.')) return;
    result.value = ''; pictureCount = 0; setCount(); save(); message('Cleared. Your next photo will be Picture 1.');
  });
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }
})();
