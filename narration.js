/* Chinese audio guide: user-initiated, cancellable, sentence-sized speech. */
(() => {
  function init() {
    const panel = document.getElementById('audio-guide');
    const status = document.getElementById('audio-status');
    const caption = document.getElementById('audio-caption');
    const voiceSelect = document.getElementById('audio-voice');
    const rateSelect = document.getElementById('audio-rate');
    const supported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
    const synth = window.speechSynthesis;
    let voices = [], queue = [], position = 0, generation = 0, active = false, paused = false;
    let utterance = null, source = '', heading = '';
    function controls() {
      document.querySelectorAll('[data-audio-action="pause"]').forEach(b => {
        b.disabled = !active;
        b.textContent = paused ? '繼續朗讀' : '暫停朗讀';
      });
      document.querySelectorAll('[data-audio-action="stop"]').forEach(b => b.disabled = !active);
      document.querySelectorAll('[data-audio-status]').forEach(el => el.textContent = status.textContent);
    }
    function stop(message = '已停止朗讀') {
      ++generation; active = false; paused = false; utterance = null;
      if (supported) { synth.cancel(); synth.resume(); }
      status.textContent = message; caption.textContent = ''; controls();
    }
    window.hakubaNarrator = { stopPhoto() { if (source === 'photo' && active) stop(); } };
    if (!supported) {
      status.textContent = '此瀏覽器不支援語音朗讀，請改用新版 Safari、Chrome 或 Edge。';
      document.querySelectorAll('[data-audio-action], [data-read-photo]').forEach(b => b.disabled = true);
      voiceSelect.disabled = rateSelect.disabled = true;
      return;
    }
    function loadVoices() {
      const selected = voiceSelect.value;
      voices = synth.getVoices().filter(v => /^(zh|cmn)(-|_|$)/i.test(v.lang));
      voices.sort((a,b) => Number(/TW|Hant/i.test(b.lang)) - Number(/TW|Hant/i.test(a.lang)));
      voiceSelect.replaceChildren(new Option('自動選擇中文語音', ''));
      voices.forEach(v => voiceSelect.add(new Option(`${v.name}（${v.lang}）`, v.voiceURI)));
      if (voices.some(v => v.voiceURI === selected)) voiceSelect.value = selected;
    }
    loadVoices(); synth.addEventListener('voiceschanged', loadVoices);
    function speakCurrent() {
      if (!active || paused) return;
      if (position >= queue.length) { stop('朗讀完成'); return; }
      const token = generation;
      const u = new SpeechSynthesisUtterance(queue[position]);
      utterance = u; // Retain the utterance while it is speaking.
      u.lang = 'zh-TW'; u.rate = Number(rateSelect.value);
      const voice = voices.find(v => v.voiceURI === voiceSelect.value) || voices[0];
      if (voice) { u.voice = voice; u.lang = voice.lang; }
      status.textContent = `正在朗讀：${heading}（${position + 1}／${queue.length} 段）`;
      caption.textContent = queue[position]; controls();
      u.onend = () => {
        if (token !== generation || !active) return;
        ++position;
        speakCurrent();
      };
      u.onerror = e => {
        if (token !== generation || !active) return;
        stop(e.error === 'not-allowed' ? '播放未獲允許，請再按一次朗讀。' : '語音播放失敗，請切換語音後再試一次。');
      };
      try { synth.speak(u); } catch (_) { stop('語音無法播放，請換個瀏覽器再試。'); }
    }
    function read(texts, label, kind) {
      stopSlideshow(); stop();
      queue = texts.flatMap(t => (t.match(/[^。！？!?；;\n]+[。！？!?；;]?/g) || [])
        .flatMap(s => s.trim().match(/[\s\S]{1,120}/g) || []));
      if (!queue.length) { stop('目前沒有可朗讀的照片，請先調整篩選。'); return; }
      source = kind; heading = label; position = 0; active = true;
      speakCurrent();
    }
    function photoText(p) { return [p.title, p.location, p.desc, p.note]; }
    function restartCurrent() {
      if (!active) return;
      ++generation; synth.cancel(); synth.resume(); paused = false;
      speakCurrent();
    }
    rateSelect.addEventListener('change', restartCurrent);
    voiceSelect.addEventListener('change', restartCurrent);
    document.addEventListener('click', event => {
      const photoButton = event.target.closest('[data-read-photo]');
      if (photoButton) {
        const photo = PHOTOS.find(p => p.id === photoButton.dataset.readPhoto);
        if (photo) read(photoText(photo), photo.title, 'photo');
        return;
      }
      const button = event.target.closest('[data-audio-action]');
      if (!button || button.disabled) return;
      switch (button.dataset.audioAction) {
        case 'intro':
          read([document.querySelector('header h1').textContent,
            document.querySelector('header p').textContent,
            ...Array.from(document.querySelectorAll('#autumn-inspiration h2, #autumn-inspiration > div:first-child p:not(:first-child), #autumn-inspiration figcaption h3, #autumn-inspiration figcaption p')).map(el => el.textContent)], '白馬晨景與秋景導覽', 'intro');
          break;
        case 'gallery': {
          const photos = getFilteredPhotos();
          read(photos.flatMap((p,i) => [`第 ${i + 1} 張。`, ...photoText(p)]), `目前篩選的 ${photos.length} 張照片`, 'gallery');
          break;
        }
        case 'current': {
          const p = getFilteredPhotos()[currentLightboxIndex];
          if (p) read(photoText(p), p.title, 'photo');
          break;
        }
        case 'pause':
          if (!active) return;
          if (paused) { paused = false; synth.resume(); if (!synth.speaking) speakCurrent(); }
          else { paused = true; synth.pause(); }
          status.textContent = paused ? '已暫停，按「繼續朗讀」接續播放' : `正在朗讀：${heading}`;
          controls(); break;
        case 'stop': stop(); break;
      }
    });
    window.addEventListener('pagehide', () => stop());
    controls();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
