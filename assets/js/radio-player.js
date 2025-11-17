/**
 * Radio Player
 * Creates a global radio timeline so all listeners hear the same audio segment.
 * Usage:
 *
 *   initRadioPlayer("shlokas");        // plays all /assets/audio/shlokas/*.mp3
 *   initRadioPlayer();                 // auto-detect all folders in /assets/audio/
 *
 * HTML must include:
 * <div id="radio-player"></div>
 */

async function initRadioPlayer(parent_name = null) {

    const container = document.getElementById("radio-player");
    if (!container) return console.error("radio-player: #radio-player not found");

    // -------------------------------------------------------
    // 1. Auto-detect available parent folders if none given
    // -------------------------------------------------------
    if (!parent_name) {
        const folders = await fetch("/assets/audio/")
            .then(r => r.text())
            .catch(() => "");

        const matches = [...folders.matchAll(/href="([^\/]+)\/"/g)];
        parent_name = matches.map(m => m[1]);
    } else {
        parent_name = [parent_name];
    }

    // -------------------------------------------------------
    // 2. Collect all audio tracks from folders
    // -------------------------------------------------------
    let tracks = [];

    for (const folder of parent_name) {
        const html = await fetch(`/assets/audio/${folder}/`).then(r => r.text()).catch(() => "");

        const files = [...html.matchAll(/href="([^"]+\.mp3)"/g)].map(m => m[1]);

        files.forEach(file => {
            tracks.push({
                url: `/assets/audio/${folder}/${file}`,
                folder,
                file
            });
        });
    }

    if (tracks.length === 0) {
        container.innerHTML = "<p>No audio files found.</p>";
        return;
    }

    // -------------------------------------------------------
    // 3. Measure duration for each MP3
    // -------------------------------------------------------
    async function getDuration(url) {
        return new Promise(resolve => {
            const a = new Audio();
            a.src = url;
            a.addEventListener("loadedmetadata", () => resolve(a.duration));
            a.addEventListener("error", () => resolve(0));
        });
    }

    for (let t of tracks) {
        t.duration = await getDuration(t.url);
    }

    const totalDuration = tracks.reduce((s, t) => s + t.duration, 0);

    // -------------------------------------------------------
    // 4. Compute global radio timeline
    // -------------------------------------------------------
    function getRadioPositionSeconds() {
        const now = Date.now();
        return (Math.floor(now / 1000) % Math.floor(totalDuration));
    }

    function findTrackAt(time) {
        let acc = 0;
        for (let t of tracks) {
            if (time >= acc && time < acc + t.duration) {
                return { track: t, offset: time - acc };
            }
            acc += t.duration;
        }
        return { track: tracks[0], offset: 0 };
    }

    // -------------------------------------------------------
    // 5. Build player UI (same layout as music-player)
    // -------------------------------------------------------
    container.innerHTML = `
<div class="music-player-wrapper">
  <audio id="radio-audio" preload="metadata" crossorigin="anonymous"></audio>

  <div class="cassette-player">
    <div class="cassette-shell">
      <div class="cassette-window">
        <div class="reel reel-left"></div>
        <div class="tape"></div>
        <div class="reel reel-right"></div>
      </div>

      <div class="cassette-label">
        <div class="track-title" id="rp-track-title">Radio Stream</div>
        <div class="track-sub" id="rp-track-sub">Online Radio</div>
      </div>

      <div class="controls-row">

        <button class="mp-btn mp-play">
            <img src="/assets/bootstrap-icons/play.svg" alt="">
        </button>
        <button class="mp-btn mp-pause" style="display:none;">
            <img src="/assets/bootstrap-icons/pause.svg" alt="">
        </button>

        <div class="mp-times">
            <span id="rp-now">0:00</span> / <span id="rp-total">0:00</span>
        </div>

      </div>
    </div>
  </div>
</div>
`;

    // -------------------------------------------------------
    // 6. Player logic
    // -------------------------------------------------------
    const audio = document.getElementById("radio-audio");
    const playBtn = container.querySelector(".mp-play");
    const pauseBtn = container.querySelector(".mp-pause");
    const leftReel = container.querySelector(".reel-left");
    const rightReel = container.querySelector(".reel-right");

    const nowEl = container.querySelector("#rp-now");
    const totalEl = container.querySelector("#rp-total");
    totalEl.textContent = formatTime(totalDuration);

    function formatTime(s) {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return m + ":" + (sec < 10 ? "0" + sec : sec);
    }

    let reelTimer = null;
    function startReels() {
        let ang = 0;
        reelTimer = setInterval(() => {
            ang += 6;
            leftReel.style.transform = `rotate(${ang}deg)`;
            rightReel.style.transform = `rotate(${-ang}deg)`;
        }, 40);
    }
    function stopReels() {
        clearInterval(reelTimer);
        reelTimer = null;
    }

    async function syncRadio() {
        const pos = getRadioPositionSeconds();
        const { track, offset } = findTrackAt(pos);

        audio.src = track.url;
        audio.currentTime = offset;
        audio.play();

        document.getElementById("rp-track-title").textContent = track.file.replace(".mp3", "");
        document.getElementById("rp-track-sub").textContent = track.folder;
    }

    // -------------------------------------------------------
    // 7. UI controls
    // -------------------------------------------------------
    playBtn.addEventListener("click", () => {
        syncRadio();
        playBtn.style.display = "none";
        pauseBtn.style.display = "";
        startReels();
    });

    pauseBtn.addEventListener("click", () => {
        audio.pause();
        pauseBtn.style.display = "none";
        playBtn.style.display = "";
        stopReels();
    });

    audio.addEventListener("timeupdate", () => {
        const pos = getRadioPositionSeconds();
        nowEl.textContent = formatTime(pos);
    });

    audio.addEventListener("ended", () => {
        syncRadio(); // loop like radio
    });

    // auto-start
    syncRadio();
    playBtn.style.display = "none";
    pauseBtn.style.display = "";
    startReels();
}
