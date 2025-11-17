/* ===============================
   RADIO MODE
   =============================== */
async function initRadioPlayer(wrapper) {
    const audio = wrapper.querySelector('.radio-audio');
    const parentName = wrapper.dataset.parent;

    // GET ALL AVAILABLE parent folders if parent_name not defined
    const parentFolders = parentName
        ? [parentName]
        : window.ALL_PARENT_FOLDERS;  // you generate this in Jekyll

    let playlist = [];

    // Build playlist of all audio files
    for (const parent of parentFolders) {
        const files = window.AUDIO_MAP[parent] || [];
        files.forEach(id => {
            playlist.push({
                src: `/assets/audio/${parent}/${id}.mp3`,
                parent,
                id,
                duration: 0
            });
        });
    }

    // Preload durations
    for (const track of playlist) {
        track.duration = await getDuration(track.src);
    }

    const totalLength = playlist.reduce((s, t) => s + t.duration, 0);

    function getCurrentTrack() {
        const now = Date.now() / 1000;
        let t = now % totalLength;

        for (const track of playlist) {
            if (t < track.duration) return { track, offset: t };
            t -= track.duration;
        }
        return { track: playlist[0], offset: 0 };
    }

    function playRadio() {
        const { track, offset } = getCurrentTrack();
        audio.src = track.src;

        audio.addEventListener('loadedmetadata', () => {
            audio.currentTime = offset;
            audio.play();
        }, { once: true });
    }

    audio.addEventListener('ended', () => playRadio());

    // Connect UI buttons
    wrapper.querySelector('.mp-play').onclick = () => audio.play();
    wrapper.querySelector('.mp-pause').onclick = () => audio.pause();

    playRadio(); // start immediately
}
