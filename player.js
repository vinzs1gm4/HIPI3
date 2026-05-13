const params = new URLSearchParams(window.location.search);

const APP_NAME = "HIPI3Music";
let audiusHost = "";

const song = params.get("song") || localStorage.getItem("currentSong") || "";
const title = params.get("title") || localStorage.getItem("currentTitle") || "Tidak ada judul";
const artist = params.get("artist") || localStorage.getItem("currentArtist") || "Audius";
const img = params.get("img") || localStorage.getItem("currentImg") || "";
const songId = params.get("id") || localStorage.getItem("currentSongId") || "";

const audio = document.getElementById("audio");
const cover = document.getElementById("cover");
const titleText = document.getElementById("title");
const artistText = document.getElementById("artist");
const playBtn = document.getElementById("play");
const current = document.getElementById("current");
const duration = document.getElementById("duration");
const wave = document.getElementById("waveFill");
const path = document.getElementById("waveBase");
const waveProgress = document.getElementById("waveProgress");
const favoriteBtn = document.getElementById("favoriteBtn");
const playlistBtn = document.getElementById("playlistBtn");

let playlist = JSON.parse(localStorage.getItem("songList") || "[]");
let length = 0;

function formatTime(time){
  if(!time || isNaN(time)) return "0:00";
  const minutes = Math.floor(time / 60);
  let seconds = Math.floor(time % 60);
  if(seconds < 10) seconds = "0" + seconds;
  return minutes + ":" + seconds;
}

async function getAudiusHost(){
  if(audiusHost) return audiusHost;

  const res = await fetch("https://api.audius.co");
  const data = await res.json();

  if(!data.data || !data.data.length){
    throw new Error("Audius host tidak ditemukan");
  }

  audiusHost = data.data[0];
  return audiusHost;
}

function getArtwork(track){
  return track.artwork?.["1000x1000"] || track.artwork?.["480x480"] || track.artwork?.["150x150"] || "";
}

function getArtist(track){
  return track.user?.name || "Unknown Artist";
}

function getTitle(track){
  return track.title || "Unknown Title";
}

async function getStreamUrl(id){
  const host = await getAudiusHost();
  return host + "/v1/tracks/" + id + "/stream?app_name=" + encodeURIComponent(APP_NAME);
}

function saveCurrent(data){
  localStorage.setItem("currentSong", data.song || "");
  localStorage.setItem("currentTitle", data.title || "Tidak ada judul");
  localStorage.setItem("currentArtist", data.artist || "Audius");
  localStorage.setItem("currentImg", data.img || "");
  localStorage.setItem("currentSongId", data.id || "");
  localStorage.setItem("source", "audius");
}

function setupWave(){
  length = path.getTotalLength();
  wave.style.strokeDasharray = length;
  wave.style.strokeDashoffset = length;
}

function setupPlayer(){
  audio.src = song;
  cover.src = img;
  titleText.innerText = title;
  artistText.innerText = artist;

  saveCurrent({ song, title, artist, img, id: songId });

  const savedTime = parseFloat(localStorage.getItem("currentTime") || "0");
  audio.addEventListener("loadedmetadata", () => {
    if(savedTime && savedTime < audio.duration){
      audio.currentTime = savedTime;
    }
    duration.innerText = formatTime(audio.duration);
  }, {once:true});

  audio.play()
    .then(() => {
      playBtn.innerText = "⏸";
      localStorage.setItem("isPlaying", "true");
    })
    .catch(() => {
      playBtn.innerText = "▶";
    });
}

playBtn.onclick = async () => {
  if(!audio.src){
    playBtn.classList.add("button-error");
    setTimeout(() => playBtn.classList.remove("button-error"), 500);
    return;
  }

  try{
    if(audio.paused){
      await audio.play();
      playBtn.innerText = "⏸";
      localStorage.setItem("isPlaying", "true");
    }else{
      audio.pause();
      playBtn.innerText = "▶";
      localStorage.setItem("isPlaying", "false");
    }
  }catch(err){
    console.log(err);
    playBtn.innerText = "▶";
    localStorage.setItem("isPlaying", "false");
  }
};

audio.addEventListener("timeupdate", () => {
  localStorage.setItem("currentTime", audio.currentTime);

  const progress = audio.currentTime / audio.duration;
  if(length && !isNaN(progress)){
    wave.style.strokeDashoffset = length - (length * progress);
  }

  current.innerText = formatTime(audio.currentTime);
  duration.innerText = formatTime(audio.duration);
});

waveProgress.onclick = (e) => {
  if(!audio.duration) return;

  const rect = waveProgress.getBoundingClientRect();
  const percent = (e.clientX - rect.left) / rect.width;
  audio.currentTime = percent * audio.duration;
};

async function playTrack(track){
  const stream = await getStreamUrl(track.id);
  const image = getArtwork(track);
  const newTitle = getArtist(track) + " - " + getTitle(track);
  const newArtist = getArtist(track);

  localStorage.setItem("currentTime", "0");
  saveCurrent({
    song: stream,
    title: newTitle,
    artist: newArtist,
    img: image,
    id: track.id
  });

  window.location.href =
    "player.html?source=audius" +
    "&id=" + encodeURIComponent(track.id) +
    "&song=" + encodeURIComponent(stream) +
    "&title=" + encodeURIComponent(newTitle) +
    "&artist=" + encodeURIComponent(newArtist) +
    "&img=" + encodeURIComponent(image);
}

function getCurrentIndex(){
  return playlist.findIndex(item => String(item.id) === String(localStorage.getItem("currentSongId")));
}

document.getElementById("next").onclick = async () => {
  if(playlist.length > 0){
    let index = getCurrentIndex();
    if(index < 0) index = 0;
    const nextTrack = playlist[(index + 1) % playlist.length];
    await playTrack(nextTrack);
  }else{
    audio.currentTime = Math.min(audio.currentTime + 10, audio.duration || audio.currentTime + 10);
  }
};

document.getElementById("prev").onclick = async () => {
  if(playlist.length > 0 && audio.currentTime < 3){
    let index = getCurrentIndex();
    if(index < 0) index = 0;
    const prevTrack = playlist[(index - 1 + playlist.length) % playlist.length];
    await playTrack(prevTrack);
  }else{
    audio.currentTime = Math.max(audio.currentTime - 10, 0);
  }
};

audio.addEventListener("ended", async () => {
  localStorage.setItem("isPlaying", "false");
  if(playlist.length > 0){
    document.getElementById("next").click();
  }else{
    playBtn.innerText = "▶";
  }
});

function getCurrentTrackData(){
  const id = localStorage.getItem("currentSongId");
  const fullTrack = playlist.find(item => String(item.id) === String(id));

  const fallbackTrack = {
    id,
    title: title.replace((artist || "") + " - ", ""),
    user: { name: artist },
    artwork: { "480x480": img, "1000x1000": img }
  };

  return fullTrack || fallbackTrack;
}

function toggleStorage(key){
  let list = JSON.parse(localStorage.getItem(key) || "[]");
  const id = localStorage.getItem("currentSongId");

  if(!id) return false;

  const exists = list.some(item => String(item.id) === String(id));

  if(exists){
    list = list.filter(item => String(item.id) !== String(id));
  }else{
    list.push(getCurrentTrackData());
  }

  localStorage.setItem(key, JSON.stringify(list));
  return true;
}

function storageHasSong(key){
  const list = JSON.parse(localStorage.getItem(key) || "[]");
  const id = localStorage.getItem("currentSongId");
  return list.some(item => String(item.id) === String(id));
}

function updateActionButtons(){
  const isFav = storageHasSong("favorites");
  const isPlaylist = storageHasSong("myPlaylist");

  favoriteBtn.classList.toggle("active", isFav);
  playlistBtn.classList.toggle("active", isPlaylist);

  favoriteBtn.innerText = isFav ? "♥ Favorite" : "♡ Favorite";
  playlistBtn.innerText = isPlaylist ? "✓ Playlist" : "＋ Playlist";
}

favoriteBtn.onclick = () => {
  if(toggleStorage("favorites")) updateActionButtons();
};

playlistBtn.onclick = () => {
  if(toggleStorage("myPlaylist")) updateActionButtons();
};


const backHomeBtn = document.getElementById("backHomeBtn");

if(backHomeBtn){
  backHomeBtn.onclick = (e) => {
    e.preventDefault();

    localStorage.setItem("currentTime", audio.currentTime || 0);
    localStorage.setItem("isPlaying", audio.paused ? "false" : "true");

    if(document.referrer && document.referrer.includes("home.html")){
      history.back();
    }else{
      window.location.href = "home.html";
    }
  };
}

setupWave();
setupPlayer();
updateActionButtons();
