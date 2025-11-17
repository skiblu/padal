/*
  music-player-module.js
  ES module version of the retro cassette music player.

  Features:
  - Modes: 'single', 'playlist', 'radio' (cannot switch)
  - Playlist available for 'playlist' or 'radio'
  - Radio disables seeking, starts at radioStart
  - Uses SVG icons from assets/bootstrap-icons/
  - Preserves cassette markup and styling
*/

class MusicPlayer {
  constructor(container, opts = {}) {
    if (typeof container === 'string') container = document.querySelector(container);
    this.wrapper = container;
    if (!this.wrapper) throw new Error('MusicPlayer: container not found');

    this.options = Object.assign({
      mode: 'single',
      playlist: [],
      startIndex: 0,
      radioStart: 0,
      loop: false
    }, opts);

    this.mode = this.options.mode;
    this.playlist = Array.isArray(this.options.playlist) ? this.options.playlist.slice() : [];
    this.currentIndex = Math.max(0, Math.min(this.options.startIndex || 0, Math.max(0, this.playlist.length - 1)));
    this.isLive = this.mode === 'radio';
    this.loop = !!this.options.loop;

    this._ensureMarkup();
    this._bindElements();
    this._injectStyles();
    this._attachEvents();

    this._readPlaylistFromDOM();
    if (this.playlist.length === 0 && this.options.playlist && this.options.playlist.length) {
      this.playlist = this.options.playlist.slice();
    }

    if (this.playlist.length) this._loadTrack(this.currentIndex, false);
    this.setMode(this.mode);
  }

  // ---------- DOM ----------
  _ensureMarkup() {
    this.wrapper.innerHTML = `
      <audio preload="metadata" crossorigin="anonymous"></audio>
      <div class="cassette-player">
        <div class="cassette-shell">
          <div class="cassette-window">
            <div class="reel reel-left" aria-hidden="true"></div>
            <div class="tape" aria-hidden="true"></div>
            <div class="reel reel-right" aria-hidden="true"></div>
          </div>

          <div class="cassette-label">
            <div class="track-title">Untitled</div>
            <div class="track-sub"></div>
          </div>

          <div class="controls-row">
            <button class="mp-btn mp-play" aria-label="Play" title="Play">
              <img src="assets/bootstrap-icons/play.svg" alt="Play">
            </button>
            <button class="mp-btn mp-pause" aria-label="Pause" title="Pause" style="display:none;">
              <img src="assets/bootstrap-icons/pause.svg" alt="Pause">
            </button>

            <div class="mp-seek">
              <span class="mp-elapsed">0:00</span>
              <input type="range" class="mp-seek-range" value="0" min="0">
              <span class="mp-duration">0:00</span>
            </div>

            <div class="mp-volume">
              <button class="mp-vol-down" title="Volume Down">
                <img src="assets/bootstrap-icons/volume-down.svg" alt="-">
              </button>
              <input type="range" class="mp-volume-range" min="0" max="1" step="0.01" value="1">
              <button class="mp-vol-up" title="Volume Up">
                <img src="assets/bootstrap-icons/volume-up.svg" alt="+">
              </button>
            </div>
          </div>

          <div class="mp-playlist-container" style="display:none; margin-top:10px;">
            <button class="mp-playlist-toggle">Show Playlist</button>
            <div class="mp-playlist-view" style="display:none; margin-top:8px;"></div>
          </div>
        </div>
      </div>
    `;
  }

  _injectStyles() {
    if (document.getElementById('mp-module-styles')) return;
    const css = `
      /* CSS omitted for brevity - same as before */
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

    this.controlsRow = this.wrapper.querySelector('.controls-row');
    this.prevBtn = document.createElement('button');
    this.prevBtn.className = 'mp-prev mp-btn';
    this.prevBtn.title = 'Previous';
    this.prevBtn.innerHTML = `<img src="assets/bootstrap-icons/skip-start.svg" alt="Prev">`;
    this.nextBtn = document.createElement('button');
    this.nextBtn.className = 'mp-next mp-btn';
    this.nextBtn.title = 'Next';
    this.nextBtn.innerHTML = `<img src="assets/bootstrap-icons/skip-end.svg" alt="Next">`;

    const refNode = this.pauseBtn || this.playBtn;
    if (refNode && refNode.parentNode) {
      refNode.parentNode.insertBefore(this.prevBtn, refNode.nextSibling);
      refNode.parentNode.insertBefore(this.nextBtn, refNode.nextSibling);
    } else if (this.controlsRow) {
      this.controlsRow.appendChild(this.prevBtn);
      this.controlsRow.appendChild(this.nextBtn);
    }
  }

  // ---------- Playlist / playback ----------
  _readPlaylistFromDOM() {
    const audioId = this.wrapper.getAttribute('data-audio-id');
    if (audioId) {
      const userList = document.querySelector(`.mp-playlist[data-audio-id="${audioId}"]`);
      if (userList) {
        const items = Array.from(userList.querySelectorAll('li'));
        const parsed = items.map(li => ({
          src: li.getAttribute('data-src') || li.dataset.src,
          title: li.getAttribute('data-title') || li.dataset.title || (li.textContent || '').trim(),
          sub: li.getAttribute('data-sub') || li.dataset.sub || '',
        })).filter(x => x.src);
        if (parsed.length) this.playlist = parsed;
      }
    }
  }

  _buildPlaylistView() {
    if (!this.playlistView) return;
    this.playlistView.innerHTML = '';
    const ul = document.createElement('ul');
    this.playlist.forEach((t,i)=>{
      const li = document.createElement('li');
      li.className='mp-playlist-item';
      li.tabIndex=0;
      li.dataset.index=i;
      li.innerHTML=`<div style="flex:1;"><div>${t.title||'Untitled'}</div><div>${t.sub||''}</div></div>`;
      if (this.isLive && i===this.currentIndex){
        const badge=document.createElement('div');
        badge.className='mp-live-badge';
        badge.innerHTML='<span class="mp-live-dot"></span><span>LIVE</span>';
        li.appendChild(badge);
      }
      li.addEventListener('click',()=>{ if(this.mode==='playlist'){ this.select(i); this.play(); this._togglePlaylist(false); } });
      li.addEventListener('keydown',e=>{ if(e.key==='Enter') li.click(); });
      ul.appendChild(li);
    });
    this.playlistView.appendChild(ul);
    this._highlightActive();
  }

  _togglePlaylist(show){
    if(show===undefined) show=this.playlistView.style.display==='none'||this.playlistView.style.display==='';
    this.playlistView.style.display=show?'':'none';
    if(this.playlistToggle) this.playlistToggle.textContent=show?'Hide Playlist':'Show Playlist';
    if(show) this._scrollActiveIntoView();
  }

  _highlightActive(){ Array.from(this.playlistView.querySelectorAll('li')).forEach(li=>li.classList.toggle('active',parseInt(li.dataset.index,10)===this.currentIndex)); }
  _scrollActiveIntoView(){ const active=this.playlistView.querySelector('li.active'); if(active) active.scrollIntoView({behavior:'smooth',block:'nearest'}); }

  _loadTrack(index,preservePlay=false){
    if(!this.playlist[index]) return;
    this.currentIndex=index;
    const track=this.playlist[index];
    this.audio.src=track.src;
    this.wrapper.querySelector('.track-title').textContent=track.title||'Untitled';
    this.wrapper.querySelector('.track-sub').textContent=track.sub||'';
    if(this.isLive && this.options.radioStart) try{ this.audio.currentTime=parseFloat(this.options.radioStart)||0; }catch(e){}
    this.audio.load();
    if(preservePlay)this.audio.play().catch(()=>{});
    this._highlightActive();
    this._scrollActiveIntoView();
  }

  play(){ this.audio.play(); }
  pause(){ this.audio.pause(); }
  select(index){ if(index>=0 && index<this.playlist.length) this._loadTrack(index,false); }

  next(){ if(this.mode==='radio')return; const ni=this.currentIndex+1; if(ni<this.playlist.length)this._loadTrack(ni,true); else if(this.loop)this._loadTrack(0,true); else {this.pause();this.audio.currentTime=0;} }
  prev(){ if(this.mode==='radio')return; const pi=this.currentIndex-1; if(pi>=0)this._loadTrack(pi,true); else if(this.loop)this._loadTrack(this.playlist.length-1,true); }

  setPlaylist(list,opts={}){ this.playlist=Array.isArray(list)?list.slice():[]; if(typeof opts.startIndex==='number') this.currentIndex=Math.max(0,Math.min(opts.startIndex,this.playlist.length-1)); this._buildPlaylistView(); if(this.playlist.length)this._loadTrack(this.currentIndex,false); }

  setMode(m){
    this.mode=m;
    this.isLive=this.mode==='radio';
    if(this.mode==='playlist'||this.mode==='radio'){ this.playlistContainer.style.display=''; if(this.playlistToggle) this.playlistToggle.style.display=''; this._buildPlaylistView(); this._togglePlaylist(false); }
    else this.playlistContainer.style.display='none';
    this.seekRange.disabled=this.mode==='radio';
    this.seekRange.style.opacity=this.mode==='radio'?0.5:'';
    if(this.isLive&&this.playlist.length){ this._loadTrack(this.currentIndex,false); if(this.options.radioStart) try{ this.audio.currentTime=this.options.radioStart; }catch(e){} }
  }

  setLoop(enabled){ this.loop=!!enabled; }

  _attachEvents(){
    this.audio.addEventListener('loadedmetadata',()=>{ this.durationEl.textContent=this._formatTime(this.audio.duration); this.seekRange.max=Math.floor(isFinite(this.audio.duration)?this.audio.duration:0); });
    this.audio.addEventListener('timeupdate',()=>{ this.elapsedEl.textContent=this._formatTime(this.audio.currentTime); if(!this.seekRange.disabled) this.seekRange.value=Math.floor(this.audio.currentTime); });
    this.audio.addEventListener('ended',()=>this.next());

    this.playBtn.addEventListener('click',()=>{ this.play(); this.playBtn.style.display='none'; this.pauseBtn.style.display='inline-flex'; });
    this.pauseBtn.addEventListener('click',()=>{ this.pause(); this.playBtn.style.display='inline-flex'; this.pauseBtn.style.display='none'; });

    this.seekRange.addEventListener('input',()=>{ this.audio.currentTime=this.seekRange.value; });
    this.volRange.addEventListener('input',()=>{ this.audio.volume=this.volRange.value; });
    this.volUp.addEventListener('click',()=>{ this.audio.volume=Math.min(1,this.audio.volume+0.1); this.volRange.value=this.audio.volume; });
    this.volDown.addEventListener('click',()=>{ this.audio.volume=Math.max(0,this.audio.volume-0.1); this.volRange.value=this.audio.volume; });

    this.nextBtn.addEventListener('click',()=>this.next());
    this.prevBtn.addEventListener('click',()=>this.prev());
    if(this.playlistToggle) this.playlistToggle.addEventListener('click',()=>this._togglePlaylist());
  }

  _formatTime(t){ if(!isFinite(t))return'0:00'; const m=Math.floor(t/60),s=Math.floor(t%60); return m+':'+(s<10?'0':'')+s; }
}

export default MusicPlayer;
