/*
  music-player-module.js
  ES module version of the retro cassette music player.

  - Preserves the original cassette markup + styling exactly (injected by the module).
  - Exposes class MusicPlayer and default initializer initMusicPlayer(container, options).
  - Supports modes: 'single', 'playlist', 'radio'.
  - Supports features: next/prev, loop playlist, collapsible playlist view, auto-scroll active item,
    radio start position, disable seeking in radio, LIVE red badge for radio mode.

  Usage example:

  import initMusicPlayer from '/assets/js/music-player-module.js';

  // 1) Initialize on an existing wrapper element (container element must be present on page)
  const wrapper = document.querySelector('[data-audio-id="my-audio-id"]');
  const player = initMusicPlayer(wrapper, {
    mode: 'playlist', // single | playlist | radio
    playlist: [
      { src: '/assets/audio/bhakti/track1.mp3', title: 'Track 1', sub: 'Album A' },
      { src: '/assets/audio/bhakti/track2.mp3', title: 'Track 2', sub: 'Album A' }
    ],
    startIndex: 0,
    radioStart: 72, // seconds, only applies when mode === 'radio'
    loop: false
  });

  // API examples
  player.play();
  player.pause();
  player.next();
  player.prev();
  player.setMode('radio');
  player.setPlaylist(newPlaylistArray);

*/

class MusicPlayer {
  constructor(container, opts = {}) {
    // Accept selector string or element
    if (typeof container === 'string') container = document.querySelector(container);
    this.wrapper = container;
    if (!this.wrapper) throw new Error('MusicPlayer: container not found');

    // merge options
    this.options = Object.assign({
      mode: 'single', // 'single' | 'playlist' | 'radio'
      playlist: [],
      startIndex: 0,
      radioStart: 0,
      loop: false
    }, opts);

    // internal state
    this.mode = this.options.mode;
    this.playlist = Array.isArray(this.options.playlist) ? this.options.playlist.slice() : [];
    this.currentIndex = Math.max(0, Math.min(this.options.startIndex || 0, Math.max(0, this.playlist.length -1)));
    this.isLive = this.mode === 'radio';
    this.loop = !!this.options.loop;

    // build/attach DOM (will preserve your design by recreating same structure)
    this._ensureMarkup();
    this._bindElements();
    this._injectStyles();
    this._attachEvents();

    // initialize playlist if provided in DOM or via options
    this._readPlaylistFromDOM();
    if (this.playlist.length === 0 && this.options.playlist && this.options.playlist.length) {
      this.playlist = this.options.playlist.slice();
    }

    // load initial track
    if (this.playlist.length) this._loadTrack(this.currentIndex, false);
    this.setMode(this.mode);
  }

  // ---------- DOM building / styling ----------
  _ensureMarkup() {
    // Always create player UI inside the wrapper
    this.wrapper.innerHTML = `
      <audio preload="metadata" crossorigin="anonymous"></audio>
      <div class="cassette-player">
        <div class="cassette-shell">
          <div class="cassette-window">
            <div class="reel reel-left" aria-hidden="true"></div>
            <div class="tape" aria-hidden="true"></div>
            <div class="reel reel-right" aria-hidden="true"></div>
            <!-- centered track info: title above the tape, sub below the tape -->
            <div class="mp-track-center" aria-hidden="false">
              <div class="track-title" aria-hidden="false"><span class="track-title-inner">Untitled</span></div>
              <div class="track-sub"></div>
            </div>
          </div>

          <div class="controls-row">
            <div class="mp-mode">
              <!-- show only the active mode label (non-interactive) -->
              <div class="mp-mode-current" title="Mode" aria-hidden="true">
                <span class="mp-mode-label">Cassette</span>
              </div>
            </div>

            <button class="mp-btn mp-play" aria-label="Play" title="Play">
              <img src="/assets/bootstrap-icons/play.svg" alt="Play">
            </button>
            <button class="mp-btn mp-pause" aria-label="Pause" title="Pause" style="display:none;">
              <img src="/assets/bootstrap-icons/pause.svg" alt="Pause">
            </button>

            <div class="mp-seek">
              <span class="mp-elapsed">0:00</span>
              <input type="range" class="mp-seek-range" value="0" min="0">
              <span class="mp-duration">0:00</span>
            </div>

            <div class="mp-volume">
              <button class="mp-btn mp-vol-down" title="Volume Down" aria-label="Volume Down">
                <img src="/assets/bootstrap-icons/volume-down.svg" alt="Volume Down">
              </button>
              <input type="range" class="mp-volume-range" min="0" max="1" step="0.01" value="1">
              <button class="mp-btn mp-vol-up" title="Volume Up" aria-label="Volume Up">
                <img src="/assets/bootstrap-icons/volume-up.svg" alt="Volume Up">
              </button>
            </div>
          </div>

          <div class="mp-playlist-container" style="display:none; margin-top:10px;">
            <button class="mp-playlist-toggle" title="Show playlist" aria-label="Show playlist">
              <img src="/assets/bootstrap-icons/list.svg" alt="Playlist">
            </button>
            <div class="mp-playlist-view" style="display:none; margin-top:8px;"></div>
          </div>
        </div>
      </div>
    `;
  }



  _injectStyles() {
    if (document.getElementById('mp-module-styles')) return;
    const css = `
    /* Injected cassette player CSS (keeps styling identical to original include) */
    .music-player-wrapper { max-width: 780px; margin: 1.25rem auto; padding: 0 1rem; box-sizing: border-box; }
    .cassette-player { display:flex; justify-content:center; }
    .cassette-shell { width: 100%; max-width: 720px; background: linear-gradient(180deg, #efe0b4 0%, #e3d19a 60%, #d6c68a 100%); border-radius: 12px; box-shadow: 0 6px 18px rgba(0,0,0,0.18), inset 0 2px 0 rgba(255,255,255,0.35); padding: 14px; font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; color: #42321a; overflow: visible; }
    /* ensure absolutely-positioned title isn't clipped */
    .cassette-window { display:flex; align-items:center; justify-content:space-between; gap: 18px; background: linear-gradient(180deg, rgba(0,0,0,0.06), rgba(255,255,255,0.02)); padding: 14px 12px; border-radius: 8px; margin-bottom: 12px; position: relative; overflow: visible; }
     /* centered track info sits above/below the tape line */
    .mp-track-center {
      position: absolute;
      left: 50%;
      /* move a bit higher so title clearly sits above the tape */
      top: 38%;
      transform: translate(-50%,-50%);
      display:flex;
      flex-direction:column;
      align-items:center;
      pointer-events: none;
      z-index: 9999; /* ensure it's on top */
      width: calc(100% - 160px); /* keep within reels */
    }
    /* title: keep clipping for marquee but ensure strong contrast and readability */
    .mp-track-center .track-title {
      font-weight:700;
      font-size:1.05rem;
      margin:0 0 6px 0;
      color: #ffffff;
      text-align:center;
      overflow:hidden;         /* required for marquee clipping */
      white-space:nowrap;
      max-width:100%;
      text-shadow: 0 2px 6px rgba(0,0,0,0.7); /* stronger shadow for visibility */
      -webkit-text-stroke: 0.3px rgba(0,0,0,0.5); /* subtle stroke to improve contrast */
      background: rgba(0,0,0,0.06); /* very subtle backdrop to help legibility on any background */
      padding: 2px 8px;
      border-radius: 4px;
      display: block;
      transform: translateY(-4px); /* small nudge, not huge */
    }
    /* inner padding for marquee breathing room */
    .mp-track-center .track-title .track-title-inner {
      display:inline-block;
      transform: translateX(0);
      padding: 0 12px;
    }
     /* marquee animation: scroll to --mp-marquee-distance and back */
     .track-title.marquee-active .track-title-inner {
       animation-name: mpMarquee;
       animation-duration: var(--mp-marquee-duration, 6s);
       animation-timing-function: cubic-bezier(.25,.1,.25,1);
       animation-iteration-count: infinite;
       animation-fill-mode: forwards;
     }
     .track-title.marquee-active:hover .track-title-inner { animation-play-state: paused; }
     @keyframes mpMarquee {
       0% { transform: translateX(0); }
       50% { transform: translateX(var(--mp-marquee-distance, -100px)); }
       100% { transform: translateX(0); }
     }
    /* subtitle: nudged down to sit clearly below the tape */
    .mp-track-center .track-sub { font-size:0.8rem; color:#5b4a30; margin-top:8px; text-align:center; transform: translateY(8px); pointer-events: none; }
     .reel { width: 78px; height: 78px; background: radial-gradient(circle at 34% 30%, #2a1f12 0, #4a3b28 30%, #2b1f13 100%); border-radius: 50%; box-shadow: inset 0 2px 6px rgba(255,255,255,0.05), 0 3px 8px rgba(0,0,0,0.2); position: relative; transform-origin: 50% 50%; }
     .reel::after { content: ""; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 14px; height: 14px; border-radius: 50%; background: #c9b58a; box-shadow: inset 0 -2px 0 rgba(0,0,0,0.2); }
     .tape { flex:1; height: 8px; background: linear-gradient(90deg,#3b2a1a 0%, #1e130a 40%, #3b2a1a 100%); border-radius: 4px; align-self:center; box-shadow: inset 0 1px 1px rgba(255,255,255,0.06); z-index: 2; }
     /* removed separate cassette-label; track title/sub now in .mp-track-center (above) */
     .controls-row { display:flex; align-items:center; gap:10px; flex-wrap:wrap; justify-content:space-between; }
     .mp-btn { display:inline-flex; align-items:center; justify-content:center; background: #fff; border: none; padding:6px; border-radius:6px; box-shadow: 0 2px 4px rgba(0,0,0,0.12); cursor:pointer; }
     .mp-btn img { display:block; width:18px; height:18px; filter: none; }
     .mp-mode { position:relative; display:flex; align-items:center; gap:6px; }
     .mp-mode-current { display:inline-flex; align-items:center; gap:8px; background:transparent; border:1px solid rgba(0,0,0,0.06); padding:6px 8px; border-radius:6px; }
     .mp-seek { flex:1; min-width:160px; margin:0 8px; }
     .mp-seek-range { width:100%; -webkit-appearance:none; background:transparent; height:8px; }
     .mp-seek-range::-webkit-slider-runnable-track { height:8px; background: linear-gradient(90deg,#b88f45,#e9d49f); border-radius:8px; }
     .mp-seek-range::-webkit-slider-thumb { -webkit-appearance:none; width:14px; height:14px; background:#2a1f12; border-radius:50%; margin-top:-3px; box-shadow:0 1px 3px rgba(0,0,0,0.4); }
     .mp-times { font-size:0.82rem; color:#302414; min-width:86px; text-align:center; }
     .mp-volume { display:flex; align-items:center; gap:6px; min-width:170px; }
     .mp-volume-range { width:90px; -webkit-appearance:none; height:6px; }
     .mp-volume-range::-webkit-slider-runnable-track { height:6px; background: linear-gradient(90deg,#e6d6a8,#c8a858); border-radius:6px; }
     .mp-volume-range::-webkit-slider-thumb { -webkit-appearance:none; width:12px; height:12px; background:#2a1f12; border-radius:50%; margin-top:-3px; }
     .mp-playlist-view ul { list-style:none; padding:0; margin:0; max-height:220px; overflow:auto; }
     .mp-playlist-view li { padding:8px 10px; border-radius:6px; display:flex; align-items:center; gap:10px; cursor:pointer; }
     .mp-playlist-view li:hover { background: rgba(0,0,0,0.03); }
     .mp-playlist-view li.active { background: rgba(0,0,0,0.06); font-weight:700; }
     .mp-live-badge { display:inline-flex; align-items:center; gap:6px; font-weight:700; color:#b30000; }
     .mp-live-dot { width:10px; height:10px; border-radius:50%; background:#ff2b2b; box-shadow:0 0 6px rgba(255,43,43,0.6); }
     .mp-prev, .mp-next { margin-left:6px; padding:6px 8px; border-radius:6px; }
    @media (max-width:720px) {
      .reel { width:60px; height:60px; }
      .mp-btn img { width:16px; height:16px; }
      .mp-volume { min-width:140px; }
      .mp-times { font-size:0.75rem; }
      /* smaller devices: reduce title size and move slightly less up so it doesn't collide with reels */
      .mp-track-center { width: calc(100% - 120px); top: 40%; }
      .mp-track-center .track-title { font-size:0.95rem; transform: translateY(-2px); }
      .mp-track-center .track-title .track-title-inner { padding: 0 10px; }
    }
    `;
    const style = document.createElement('style');
    style.id = 'mp-module-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  _bindElements() {
    this.audio = this.wrapper.querySelector('audio');
    this.playBtn = this.wrapper.querySelector('.mp-play');
    this.pauseBtn = this.wrapper.querySelector('.mp-pause');
    this.seekRange = this.wrapper.querySelector('.mp-seek-range');
    this.elapsedEl = this.wrapper.querySelector('.mp-elapsed');
    this.durationEl = this.wrapper.querySelector('.mp-duration');
    this.volRange = this.wrapper.querySelector('.mp-volume-range');
    this.volUp = this.wrapper.querySelector('.mp-vol-up');
    this.volDown = this.wrapper.querySelector('.mp-vol-down');
    this.reelLeft = this.wrapper.querySelector('.reel-left');
    this.reelRight = this.wrapper.querySelector('.reel-right');
    this.playlistContainer = this.wrapper.querySelector('.mp-playlist-container');
    this.playlistToggle = this.wrapper.querySelector('.mp-playlist-toggle');
    this.playlistView = this.wrapper.querySelector('.mp-playlist-view');
    // mode label (non-interactive) — only shows active mode
    this.mpModeLabel = this.wrapper.querySelector('.mp-mode-label');
    this.modeButtons = []; // no toggle controls exposed to user

    // create next/prev buttons and attach to controls-row (keeps layout intact)
    this.controlsRow = this.wrapper.querySelector('.controls-row');
    this.prevBtn = document.createElement('button');
    this.prevBtn.className = 'mp-prev mp-btn';
    this.prevBtn.title = 'Previous';
    this.prevBtn.setAttribute('aria-label', 'Previous');
    this.prevBtn.innerHTML = `<img src="/assets/bootstrap-icons/skip-start.svg" alt="Previous">`;
    this.nextBtn = document.createElement('button');
    this.nextBtn.className = 'mp-next mp-btn';
    this.nextBtn.title = 'Next';
    this.nextBtn.setAttribute('aria-label', 'Next');
    this.nextBtn.innerHTML = `<img src="/assets/bootstrap-icons/skip-end.svg" alt="Next">`;
    // insert prev before play/pause and next after play/pause (fix swapped order)
    const refNode = this.pauseBtn || this.playBtn;
    if (refNode && refNode.parentNode) {
      // keep play and pause adjacent, insert Prev and Next after that pair:
      // DOM becomes: ... play, pause, prev, next ...
      refNode.parentNode.insertBefore(this.prevBtn, refNode.nextSibling); // after refNode
      refNode.parentNode.insertBefore(this.nextBtn, this.prevBtn.nextSibling);
    } else if (this.controlsRow) {
      // fallback: append prev then next (prev still first)
      this.controlsRow.appendChild(this.prevBtn);
      this.controlsRow.appendChild(this.nextBtn);
    }
  }

  // ---------- Playlist reading/building ----------
  _readPlaylistFromDOM() {
    // If user provided a <ul.mp-playlist data-audio-id="..."> read items
    const audioId = this.wrapper.getAttribute('data-audio-id');
    if (audioId) {
      const userList = document.querySelector('.mp-playlist[data-audio-id="' + audioId + '"]');
      if (userList) {
        const items = Array.from(userList.querySelectorAll('li'));
        const parsed = items.map(li => ({
          src: li.getAttribute('data-src') || li.dataset.src,
          title: li.getAttribute('data-title') || li.dataset.title || (li.textContent || '').trim(),
          sub: li.getAttribute('data-sub') || li.dataset.sub || '',
          duration: li.getAttribute('data-duration') || li.dataset.duration || null
        })).filter(x => x.src);
        if (parsed.length) this.playlist = parsed;
      }
    }
  }

  _buildPlaylistView() {
    this.playlistView.innerHTML = '';
    const ul = document.createElement('ul');
    this.playlist.forEach((t, i) => {
      const li = document.createElement('li');
      li.className = 'mp-playlist-item';
      li.tabIndex = 0;
      li.dataset.index = i;
      const left = document.createElement('div');
      left.style.flex = '1';
      left.innerHTML = `<div class="mp-pl-title">${t.title || 'Untitled'}</div><div class="mp-pl-sub">${t.sub || ''}</div>`;
      li.appendChild(left);
      if (this.isLive && i === this.currentIndex) {
        const badge = document.createElement('div');
        badge.className = 'mp-live-badge';
        badge.innerHTML = '<span class="mp-live-dot"></span><span>LIVE</span>';
        li.appendChild(badge);
      }
      li.addEventListener('click', () => {
        if (this.mode === 'playlist') {
          this.select(i);
          this.play();
          this._togglePlaylist(false);
        }
      });
      li.addEventListener('keydown', (e) => { if (e.key === 'Enter') li.click(); });
      ul.appendChild(li);
    });
    this.playlistView.appendChild(ul);
    this._highlightActive();
  }

  _togglePlaylist(show) {
    if (show === undefined) show = this.playlistView.style.display === 'none' || this.playlistView.style.display === '';
    this.playlistView.style.display = show ? '' : 'none';
    if (this.playlistToggle) {
      if (show) {
        this.playlistToggle.innerHTML = `<img src="/assets/bootstrap-icons/x.svg" alt="Hide playlist">`;
        this.playlistToggle.title = 'Hide playlist';
        this.playlistToggle.setAttribute('aria-label', 'Hide playlist');
      } else {
        this.playlistToggle.innerHTML = `<img src="/assets/bootstrap-icons/list.svg" alt="Show playlist">`;
        this.playlistToggle.title = 'Show playlist';
        this.playlistToggle.setAttribute('aria-label', 'Show playlist');
      }
    }
    if (show) this._scrollActiveIntoView();
  }

  _highlightActive() {
    const lis = Array.from(this.playlistView.querySelectorAll('li'));
    lis.forEach(li => li.classList.toggle('active', parseInt(li.dataset.index,10) === this.currentIndex));
  }

  _scrollActiveIntoView() {
    const active = this.playlistView.querySelector('li.active');
    if (active) active.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // ---------- Loading / playback ----------
  _loadTrack(index, preservePlay = false) {
    if (!this.playlist[index]) return;
    // allow end handling for the new track
    this._endedHandled = false;
    this.currentIndex = index;
    const track = this.playlist[index];
    this.audio.src = track.src;
    const titleEl = this.wrapper.querySelector('.track-title');
    const titleInner = this.wrapper.querySelector('.track-title .track-title-inner');
    const subEl = this.wrapper.querySelector('.track-sub');
    if (titleInner) titleInner.textContent = track.title || 'Untitled';
    if (subEl) subEl.textContent = track.sub || '';

    // radio start
    if (this.isLive && this.options.radioStart) {
      try { this.audio.currentTime = parseFloat(this.options.radioStart) || 0; } catch(e){}
    }

    this.audio.load();
    if (preservePlay) this.audio.play().catch(()=>{});
    this._highlightActive();
    this._scrollActiveIntoView();
    // enable marquee if title overflows
    this._updateTitleMarquee();
  }

  // centralized ended handler (used by 'ended' event and timeupdate fallback)
  _onTrackEnded() {
    if (this._endedHandled) return;
    this._endedHandled = true;
    // radio: keep stopped / live badge; do not switch tracks
    if (this.mode === 'radio') {
      this._updatePlayPauseUI(false);
      return;
    }
    // playlist mode: advance
    if (this.mode === 'playlist') {
      if (this.currentIndex + 1 < this.playlist.length) {
        this.next();
      } else if (this.loop) {
        this._loadTrack(0, true);
      } else {
        this._updatePlayPauseUI(false);
      }
      return;
    }
    // single mode: stop and reset
    this.pause();
    try { this.audio.currentTime = 0; } catch(e){}
    this._updatePlayPauseUI(false);
  }

  play() { this.audio.play(); }
  pause() { this.audio.pause(); }

  select(index) { if (index >= 0 && index < this.playlist.length) this._loadTrack(index, false); }

  next() {
    if (this.mode === 'radio') return; // radio forbids switching
    const nextIndex = this.currentIndex + 1;
    if (nextIndex < this.playlist.length) {
      this._loadTrack(nextIndex, true);
    } else {
      if (this.loop) {
        this._loadTrack(0, true);
      } else {
        // end of playlist
        this.pause();
        this.audio.currentTime = 0;
      }
    }
  }
  prev() {
    if (this.mode === 'radio') return;
    const prevIndex = this.currentIndex - 1;
    if (prevIndex >= 0) {
      this._loadTrack(prevIndex, true);
    } else if (this.loop) {
      this._loadTrack(this.playlist.length - 1, true);
    }
  }

  setPlaylist(list, opts = {}){
    this.playlist = Array.isArray(list) ? list.slice() : [];
    if (typeof opts.startIndex === 'number') this.currentIndex = Math.max(0, Math.min(opts.startIndex, this.playlist.length -1));
    this._buildPlaylistView();
    if (this.playlist.length) this._loadTrack(this.currentIndex, false);
  }

  setMode(m) {
    this.mode = m;
    this.isLive = this.mode === 'radio';
    // UI: update visible (non-interactive) mode label only
    const label = (this.mode === 'single') ? 'Cassette' : (this.mode === 'playlist' ? 'Playlist' : 'Radio');
    if (this.mpModeLabel) this.mpModeLabel.textContent = label;

    // show playlist container only for playlist/radio
    if (this.playlistContainer) {
      if (this.mode === 'playlist' || this.mode === 'radio') {
        this.playlistContainer.style.display = '';
        if (this.playlistToggle) this.playlistToggle.style.display = '';
        this._buildPlaylistView();
        this._togglePlaylist(false);
      } else {
        this.playlistContainer.style.display = 'none';
      }
    }

    // radio: disable seeking
    if (this.mode === 'radio') {
      this.seekRange.disabled = true; this.seekRange.style.opacity = 0.5;
    } else {
      this.seekRange.disabled = false; this.seekRange.style.opacity = '';
    }

    // if radio, ensure current track loaded and start position applied
    if (this.isLive && this.playlist.length) {
      this._loadTrack(this.currentIndex, false);
      if (this.options.radioStart) try { this.audio.currentTime = this.options.radioStart; } catch(e){}
    }
  }

  setLoop(enabled) { this.loop = !!enabled; }

  // ---------- Events ----------
  _attachEvents() {
    // audio events
    this.audio.addEventListener('loadedmetadata', () => {
      this.durationEl.textContent = this._formatTime(this.audio.duration);
      this.seekRange.max = Math.floor(isFinite(this.audio.duration) ? this.audio.duration : 0) || 0;
    });
    this.audio.addEventListener('timeupdate', () => {
      this.elapsedEl.textContent = this._formatTime(this.audio.currentTime);
      if (!this.seekRange.dragging) this.seekRange.value = Math.floor(this.audio.currentTime);
      // fallback: if 'ended' doesn't fire, detect near-end and trigger handler once
      try {
        const dur = this.audio.duration;
        if (isFinite(dur) && dur > 0 && !this._endedHandled) {
          const remaining = dur - this.audio.currentTime;
          if (remaining <= 0.6) this._onTrackEnded();
        }
      } catch(e){}
    });
    this.audio.addEventListener('ended', () => this._onTrackEnded());

    // play/pause UI
    this.playBtn.addEventListener('click', () => { this._endedHandled = false; this.audio.play(); this._updatePlayPauseUI(true); this._startReels(); });
    this.pauseBtn.addEventListener('click', () => { this.audio.pause(); this._updatePlayPauseUI(false); this._stopReels(); });

    // seek
    this.seekRange.addEventListener('input', (e) => { this.elapsedEl.textContent = this._formatTime(e.target.value); this.seekRange.dragging = true; });
    this.seekRange.addEventListener('change', (e) => { if (this.mode === 'radio') return; this.audio.currentTime = e.target.value; this.seekRange.dragging = false; });

    // volume
    this.audio.volume = 1; this.volRange.value = this.audio.volume;
    this.volRange.addEventListener('input', (e) => { this.audio.volume = e.target.value; });
    this.volUp.addEventListener('click', () => { this.audio.volume = Math.min(1, this.audio.volume + 0.1); this.volRange.value = this.audio.volume; });
    this.volDown.addEventListener('click', () => { this.audio.volume = Math.max(0, this.audio.volume - 0.1); this.volRange.value = this.audio.volume; });

    // next/prev
    this.nextBtn.addEventListener('click', () => this.next());
    this.prevBtn.addEventListener('click', () => this.prev());

    // playlist toggle
    if (this.playlistToggle) this.playlistToggle.addEventListener('click', () => this._togglePlaylist());

    // update marquee on resize (debounced)
    let _marqTO = null;
    const _resizeHandler = () => {
      if (_marqTO) clearTimeout(_marqTO);
      _marqTO = setTimeout(()=> { this._updateTitleMarquee(); _marqTO = null; }, 120);
    };
    window.addEventListener('resize', _resizeHandler);
  }

  _updatePlayPauseUI(isPlaying) {
    this.playBtn.style.display = isPlaying ? 'none' : '';
    this.pauseBtn.style.display = isPlaying ? '' : 'none';
    if (!isPlaying) this._stopReels(); else this._startReels();
    this._highlightActive();
  }

  _startReels(){
    if (this._reelInterval) clearInterval(this._reelInterval);
    let angle = 0; this._reelInterval = setInterval(()=>{ angle = (angle + 6 + Math.random()*2) % 360; if (this.reelLeft) this.reelLeft.style.transform = `rotate(${angle}deg)`; if (this.reelRight) this.reelRight.style.transform = `rotate(${360-angle}deg)`; }, 40);
  }
  _stopReels(){ if (this._reelInterval) { clearInterval(this._reelInterval); this._reelInterval = null; } }

  _formatTime(sec){ if (!isFinite(sec)) return '0:00'; const s = Math.floor(sec % 60); const m = Math.floor(sec / 60); return m + ':' + (s < 10 ? '0' + s : s); }

}

// Default initializer
export default function initMusicPlayer(container, options) { return new MusicPlayer(container, options); }

// Also expose class
export { MusicPlayer };
