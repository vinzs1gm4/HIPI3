const input = document.getElementById("searchInput");
const onlineResults = document.getElementById("onlineResults");
const sectionTitle = document.getElementById("sectionTitle");
const refreshBtn = document.getElementById("refreshBtn");

const miniAudio = document.getElementById("miniAudio");
const miniPlay = document.getElementById("miniPlay");
const miniTitle = document.getElementById("miniTitle");
const miniArtist = document.getElementById("miniArtist");
const miniCover = document.getElementById("miniCover");
const miniCurrent = document.getElementById("miniCurrent");
const miniDuration = document.getElementById("miniDuration");
const miniWave = document.getElementById("miniWave");
const miniWaveBase = document.getElementById("miniWaveBase");
const miniWaveFill = document.getElementById("miniWaveFill");
const miniBack = document.getElementById("miniBack");

const APP_NAME = "HIPI3Music";
let audiusHost = "";
let searchTimer = null;
let currentSongs = [];
let miniWaveLength = 0;

function safeText(text){
  return String(text || "").replace(/[&<>"']/g, (m) => {
    return {"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"}[m];
  });
}

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

function getArtwork(song){
  return song.artwork?.["1000x1000"] || song.artwork?.["480x480"] || song.artwork?.["150x150"] || "";
}

function getArtist(song){
  return song.user?.name || "Unknown Artist";
}

function getTitle(song){
  return song.title || "Unknown Title";
}

async function getStreamUrl(songId){
  const host = await getAudiusHost();
  return host + "/v1/tracks/" + songId + "/stream?app_name=" + encodeURIComponent(APP_NAME);
}

function saveSong(song, songs){
  const title = getArtist(song) + " - " + getTitle(song);
  const image = getArtwork(song);

  localStorage.setItem("currentSongId", song.id);
  localStorage.setItem("currentTitle", title);
  localStorage.setItem("currentArtist", getArtist(song));
  localStorage.setItem("currentImg", image);
  localStorage.setItem("currentTime", "0");
  localStorage.setItem("source", "audius");
  localStorage.setItem("songList", JSON.stringify(songs || currentSongs));
}

function renderSongs(songs){
  currentSongs = songs || [];
  localStorage.setItem("songList", JSON.stringify(currentSongs));
  onlineResults.innerHTML = "";

  if(!songs || songs.length === 0){
    onlineResults.innerHTML = `<h2 style="padding:20px;">Lagu tidak ditemukan</h2>`;
    return;
  }

  songs.forEach(song => {
    const image = getArtwork(song);
    const title = getTitle(song);
    const artist = getArtist(song);
    const duration = song.duration ? formatTime(song.duration) : "Full";

    const card = document.createElement("div");
    card.className = "music-card";
    card.innerHTML = `
      <img src="${image}" alt="${safeText(title)}">
      <h3>${safeText(title)}</h3>
      <p class="artist-name">${safeText(artist)}</p>
      <p class="song-duration">${duration}</p>
      <button class="play-btn">Putar</button>
    `;

    card.onclick = () => openPlayer(song);
    card.querySelector(".play-btn").onclick = (e) => {
      e.stopPropagation();
      openPlayer(song);
    };

    onlineResults.appendChild(card);
  });
}

async function openPlayer(song){
  saveSong(song, currentSongs);
  const streamUrl = await getStreamUrl(song.id);
  localStorage.setItem("currentSong", streamUrl);

  window.location.href =
    "player.html?source=audius" +
    "&id=" + encodeURIComponent(song.id) +
    "&song=" + encodeURIComponent(streamUrl) +
    "&title=" + encodeURIComponent(localStorage.getItem("currentTitle")) +
    "&artist=" + encodeURIComponent(getArtist(song)) +
    "&img=" + encodeURIComponent(getArtwork(song));
}

async function loadTrending(){
  sectionTitle.innerText = "Rekomendasi Untukmu";
  onlineResults.innerHTML = `<h2 style="padding:20px;">Loading trending...</h2>`;

  try{
    const host = await getAudiusHost();
    const res = await fetch(host + "/v1/tracks/trending?limit=24&app_name=" + encodeURIComponent(APP_NAME));
    const data = await res.json();
    renderSongs(data.data || []);
  }catch(err){
    console.log(err);
    onlineResults.innerHTML = `<h2 style="padding:20px;">Audius API Error</h2>`;
  }
}

async function searchSongs(query){
  sectionTitle.innerText = "Hasil Pencarian";
  onlineResults.innerHTML = `<h2 style="padding:20px;">Loading...</h2>`;

  try{
    const host = await getAudiusHost();
    const res = await fetch(host + "/v1/tracks/search?query=" + encodeURIComponent(query) + "&limit=24&app_name=" + encodeURIComponent(APP_NAME));
    const data = await res.json();
    renderSongs(data.data || []);
  }catch(err){
    console.log(err);
    onlineResults.innerHTML = `<h2 style="padding:20px;">Pencarian Audius error</h2>`;
  }
}

function renderFavorites(){
  sectionTitle.innerText = "Favorite";
  input.value = "";
  const favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
  renderSongs(favorites);
}

function renderPlaylist(){
  sectionTitle.innerText = "Playlist Saya";
  input.value = "";
  const playlist = JSON.parse(localStorage.getItem("myPlaylist") || "[]");
  renderSongs(playlist);
}

function setupMiniPlayer(){
  try{
    miniWaveLength = miniWaveBase.getTotalLength();
    miniWaveFill.style.strokeDasharray = miniWaveLength;
    miniWaveFill.style.strokeDashoffset = miniWaveLength;
  }catch(err){
    miniWaveLength = 0;
  }

  const song = localStorage.getItem("currentSong");
  const title = localStorage.getItem("currentTitle") || "Belum ada lagu";
  const artist = localStorage.getItem("currentArtist") || "Pilih lagu";
  const img = localStorage.getItem("currentImg") || "";
  const savedTime = parseFloat(localStorage.getItem("currentTime") || "0");

  miniTitle.innerText = title;
  miniArtist.innerText = artist;
  miniCover.src = img;

  if(song){
    miniAudio.src = song;
    miniAudio.addEventListener("loadedmetadata", async () => {
      if(savedTime && savedTime < miniAudio.duration){
        miniAudio.currentTime = savedTime;
      }
      miniDuration.innerText = formatTime(miniAudio.duration);

      if(localStorage.getItem("isPlaying") === "true"){
        try{
          await miniAudio.play();
          miniPlay.innerText = "⏸";
        }catch(err){
          miniPlay.innerText = "▶";
        }
      }
    }, {once:true});
  }
}

miniPlay.onclick = async () => {
  if(!miniAudio.src){
    miniPlay.classList.add("mini-error");
    setTimeout(() => miniPlay.classList.remove("mini-error"), 500);
    return;
  }

  try{
    if(miniAudio.paused){
      await miniAudio.play();
      miniPlay.innerText = "⏸";
      localStorage.setItem("isPlaying", "true");
    }else{
      miniAudio.pause();
      miniPlay.innerText = "▶";
      localStorage.setItem("isPlaying", "false");
    }
  }catch(err){
    console.log(err);
    miniPlay.innerText = "▶";
    localStorage.setItem("isPlaying", "false");
  }
};

miniAudio.addEventListener("timeupdate", () => {
  localStorage.setItem("currentTime", miniAudio.currentTime);
  miniCurrent.innerText = formatTime(miniAudio.currentTime);
  miniDuration.innerText = formatTime(miniAudio.duration);

  const progress = miniAudio.currentTime / miniAudio.duration;
  if(miniWaveLength && !isNaN(progress)){
    miniWaveFill.style.strokeDashoffset = miniWaveLength - (miniWaveLength * progress);
  }
});

miniAudio.addEventListener("ended", () => {
  miniPlay.innerText = "▶";
  localStorage.setItem("isPlaying", "false");
});

miniWave.onclick = (e) => {
  if(!miniAudio.duration) return;
  const rect = miniWave.getBoundingClientRect();
  const percent = (e.clientX - rect.left) / rect.width;
  miniAudio.currentTime = percent * miniAudio.duration;
};

miniBack.onclick = () => {
  const id = localStorage.getItem("currentSongId") || "";
  const song = localStorage.getItem("currentSong") || "";
  const title = localStorage.getItem("currentTitle") || "";
  const artist = localStorage.getItem("currentArtist") || "";
  const img = localStorage.getItem("currentImg") || "";

  if(!song){
    miniBack.classList.add("mini-error");
    setTimeout(() => miniBack.classList.remove("mini-error"), 500);
    return;
  }

  window.location.href =
    "player.html?source=audius" +
    "&id=" + encodeURIComponent(id) +
    "&song=" + encodeURIComponent(song) +
    "&title=" + encodeURIComponent(title) +
    "&artist=" + encodeURIComponent(artist) +
    "&img=" + encodeURIComponent(img);
};

input.addEventListener("keyup", () => {
  clearTimeout(searchTimer);
  const text = input.value.trim();

  searchTimer = setTimeout(() => {
    if(text.length < 2){
      loadTrending();
      return;
    }
    searchSongs(text);
  }, 400);
});

document.getElementById("homeMenu").onclick = (e) => {
  e.preventDefault();
  input.value = "";
  loadTrending();
};

document.getElementById("favoriteMenu").onclick = (e) => {
  e.preventDefault();
  renderFavorites();
};

document.getElementById("playlistMenu").onclick = (e) => {
  e.preventDefault();
  renderPlaylist();
};

refreshBtn.onclick = () => {
  input.value = "";
  loadTrending();
};

setupMiniPlayer();
loadTrending();
