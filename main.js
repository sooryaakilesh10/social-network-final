// LoopFlow - Browser-based Music Creation Platform
// Main JavaScript Application

// ============================================
// STATE MANAGEMENT
// ============================================
const AppState = {
    currentTab: 'create',
    isPlaying: false,
    currentStep: 0,
    bpm: 120,
    currentGenre: 'trap',
    grid: Array(8).fill(null).map(() => Array(8).fill(false)),
    audioContextStarted: false,
    tutorialStep: 0,
    shareStep: 1,
    projectName: 'My First Beat',
    savedBeats: [],
    likedBeats: new Set(),
};

// Genre configurations with colors
const Genres = {
    trap: { color: '#8B5CF6', bpm: 140, name: 'Trap' },
    lofi: { color: '#3B82F6', bpm: 85, name: 'Lo-fi' },
    house: { color: '#F97316', bpm: 128, name: 'House' },
    ambient: { color: '#10B981', bpm: 100, name: 'Ambient' }
};

// Magic Fill patterns for each genre
const MagicPatterns = {
    trap: [
        [1, 0, 0, 0, 1, 0, 0, 0], // Kick
        [0, 0, 0, 0, 1, 0, 0, 0], // Snare
        [1, 1, 1, 1, 1, 1, 1, 1], // Hi-hat
        [0, 0, 0, 0, 1, 0, 0, 0], // Clap
        [1, 0, 1, 0, 1, 0, 1, 0], // Bass
        [0, 1, 0, 1, 0, 1, 0, 1], // Synth
        [0, 0, 1, 0, 0, 0, 1, 0], // FX
        [0, 0, 0, 0, 0, 0, 0, 0], // Vocal
    ],
    lofi: [
        [1, 0, 0, 0, 1, 0, 0, 0],
        [0, 0, 1, 0, 0, 0, 1, 0],
        [0, 1, 0, 1, 0, 1, 0, 1],
        [0, 0, 0, 0, 1, 0, 0, 0],
        [1, 0, 0, 1, 0, 0, 1, 0],
        [0, 0, 1, 0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
    ],
    house: [
        [1, 0, 1, 0, 1, 0, 1, 0],
        [0, 0, 0, 0, 1, 0, 0, 0],
        [1, 1, 1, 1, 1, 1, 1, 1],
        [0, 0, 0, 0, 1, 0, 0, 0],
        [1, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 1, 0, 0, 0, 1, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
    ],
    ambient: [
        [1, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 1, 0, 0, 0],
        [1, 0, 1, 0, 1, 0, 1, 0],
        [0, 1, 0, 1, 0, 1, 0, 1],
        [0, 0, 0, 0, 0, 0, 0, 0],
    ]
};

// Sample beats for discovery feed
const SampleBeats = [
    { id: 1, title: "Midnight Dreams", author: "BeatMaster_99", mood: "dark", likes: 1234, genre: "trap" },
    { id: 2, title: "Summer Vibes", author: "LoFiGirl", mood: "euphoric", likes: 892, genre: "lofi" },
    { id: 3, title: "Rainy Day", author: "ChillBeats", mood: "melancholic", likes: 567, genre: "ambient" },
    { id: 4, title: "Night Drive", author: "SynthWave", mood: "energetic", likes: 2341, genre: "house" },
    { id: 5, title: "Deep Focus", author: "StudyMusic", mood: "dark", likes: 445, genre: "ambient" },
    { id: 6, title: "Party Starter", author: "DJFresh", mood: "energetic", likes: 3102, genre: "house" },
];

// Stem packs for library
const StemPacks = [
    { id: 1, name: "808 Essentials", artist: "TrapKing", tag: "Trending" },
    { id: 2, name: "Lo-Fi Dreams", artist: "ChillHop", tag: "New" },
    { id: 3, name: "House Anthems", artist: "ClubMaster", tag: "Popular" },
    { id: 4, name: "Ambient Worlds", artist: "SpaceSound", tag: "Trending" },
];

// ============================================
// AUDIO ENGINE (Tone.js)
// ============================================
let synths = {};
let loop = null;

function initAudio() {
    if (AppState.audioContextStarted) return;
    
    // Initialize synthesizers for each track
    synths = {
        kick: new Tone.MembraneSynth({
            pitchDecay: 0.05,
            octaves: 10,
            oscillator: { type: "sine" },
            envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 }
        }).toDestination(),
        snare: new Tone.NoiseSynth({
            noise: { type: "white" },
            envelope: { attack: 0.005, decay: 0.1, sustain: 0 }
        }).toDestination(),
        hihat: new Tone.MetalSynth({
            frequency: 200,
            envelope: { attack: 0.001, decay: 0.1, release: 0.01 },
            harmonicity: 5.1,
            modulationIndex: 32,
            resonance: 4000,
            octaves: 1.5
        }).toDestination(),
        clap: new Tone.NoiseSynth({
            noise: { type: "pink" },
            envelope: { attack: 0.001, decay: 0.3, sustain: 0 }
        }).toDestination(),
        bass: new Tone.MonoSynth({
            oscillator: { type: "sawtooth" },
            envelope: { attack: 0.1, decay: 0.3, sustain: 0.2, release: 2 },
            filterEnvelope: { attack: 0.001, decay: 0.1, sustain: 0.5, baseFrequency: 200, octaves: 2.6 }
        }).toDestination(),
        synth: new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: "triangle" },
            envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 1 }
        }).toDestination(),
        fx: new Tone.AMSynth({
            harmonicity: 3,
            detune: 0,
            oscillator: { type: "sine" },
            envelope: { attack: 0.01, decay: 0.01, sustain: 1, release: 0.5 },
            modulation: { type: "square" },
            modulationEnvelope: { attack: 0.5, decay: 0, sustain: 1, release: 0.5 }
        }).toDestination(),
        vocal: new Tone.Sampler({
            urls: {},
            baseUrl: ""
        }).toDestination()
    };

    // Set volumes
    synths.kick.volume.value = 0;
    synths.snare.volume.value = -5;
    synths.hihat.volume.value = -10;
    synths.clap.volume.value = -5;
    synths.bass.volume.value = -8;
    synths.synth.volume.value = -10;
    synths.fx.volume.value = -8;

    // Create the sequencer loop
    loop = new Tone.Loop((time) => {
        playStep(time);
        updateStepIndicator();
    }, "8n");

    Tone.Transport.bpm.value = AppState.bpm;
    AppState.audioContextStarted = true;
}

function playStep(time) {
    const step = AppState.currentStep;
    
    // Play each active cell
    if (AppState.grid[0][step]) synths.kick.triggerAttackRelease("C1", "8n", time);
    if (AppState.grid[1][step]) synths.snare.triggerAttackRelease("8n", time);
    if (AppState.grid[2][step]) synths.hihat.triggerAttackRelease("32n", time);
    if (AppState.grid[3][step]) synths.clap.triggerAttackRelease("8n", time);
    if (AppState.grid[4][step]) synths.bass.triggerAttackRelease("C2", "8n", time);
    if (AppState.grid[5][step]) synths.synth.triggerAttackRelease(["C4", "E4", "G4"], "8n", time);
    if (AppState.grid[6][step]) synths.fx.triggerAttackRelease("C5", "8n", time);
    
    // Visual feedback
    Tone.Draw.schedule(() => {
        highlightPlayingStep(step);
    }, time);
}

function updateStepIndicator() {
    AppState.currentStep = (AppState.currentStep + 1) % 8;
}

function highlightPlayingStep(step) {
    document.querySelectorAll('.step-indicator').forEach((el, i) => {
        el.classList.toggle('active', i === step);
    });
    
    document.querySelectorAll('.grid-cell').forEach((cell, i) => {
        const cellStep = i % 8;
        cell.classList.toggle('playing', cellStep === step);
    });
}

function togglePlayback() {
    if (!AppState.audioContextStarted) {
        Tone.start();
        initAudio();
    }
    
    AppState.isPlaying = !AppState.isPlaying;
    
    if (AppState.isPlaying) {
        Tone.Transport.start();
        loop.start(0);
        document.getElementById('play-btn').innerHTML = '<i class="fas fa-pause"></i>';
        document.getElementById('play-btn').classList.add('playing');
    } else {
        Tone.Transport.stop();
        loop.stop();
        document.getElementById('play-btn').innerHTML = '<i class="fas fa-play"></i>';
        document.getElementById('play-btn').classList.remove('playing');
        AppState.currentStep = 0;
        
        document.querySelectorAll('.step-indicator').forEach((el, i) => {
            el.classList.toggle('active', i === 0);
        });
        document.querySelectorAll('.grid-cell').forEach(cell => {
            cell.classList.remove('playing');
        });
    }
}

// ============================================
// UI INITIALIZATION
// ============================================
function init() {
    // Set project date
    const date = new Date();
    document.getElementById('project-date').textContent = date.toLocaleDateString();
    
    // Generate sequencer grid
    generateGrid();
    
    // Initialize discovery feed
    populateDiscoveryFeed();
    
    // Initialize stem packs
    populateStemPacks();
    
    // Set up event listeners
    setupEventListeners();
    
    // Check for saved state
    loadSavedState();
}

function generateGrid() {
    const grid = document.getElementById('sequencer-grid');
    grid.innerHTML = '';
    
    for (let track = 0; track < 8; track++) {
        for (let step = 0; step < 8; step++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.dataset.track = track;
            cell.dataset.step = step;
            
            cell.addEventListener('click', () => toggleCell(track, step));
            cell.addEventListener('touchstart', (e) => {
                e.preventDefault();
                toggleCell(track, step);
            });
            
            grid.appendChild(cell);
        }
    }
}

function toggleCell(track, step) {
    AppState.grid[track][step] = !AppState.grid[track][step];
    
    const cell = document.querySelector(`.grid-cell[data-track="${track}"][data-step="${step}"]`);
    cell.classList.toggle('active', AppState.grid[track][step]);
    
    // Haptic feedback
    if (navigator.vibrate) {
        navigator.vibrate(10);
    }
    
    // Play preview sound
    if (!AppState.isPlaying && AppState.audioContextStarted) {
        previewSound(track);
    }
}

function previewSound(track) {
    const now = Tone.now();
    switch(track) {
        case 0: synths.kick.triggerAttackRelease("C1", "8n", now); break;
        case 1: synths.snare.triggerAttackRelease("8n", now); break;
        case 2: synths.hihat.triggerAttackRelease("32n", now); break;
        case 3: synths.clap.triggerAttackRelease("8n", now); break;
        case 4: synths.bass.triggerAttackRelease("C2", "8n", now); break;
        case 5: synths.synth.triggerAttackRelease(["C4"], "8n", now); break;
        case 6: synths.fx.triggerAttackRelease("C5", "8n", now); break;
    }
}

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {
    // Onboarding
    document.getElementById('start-btn').addEventListener('click', startApp);
    
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    // Play button
    document.getElementById('play-btn').addEventListener('click', togglePlayback);
    
    // Genre selector
    document.querySelectorAll('.genre-btn').forEach(btn => {
        btn.addEventListener('click', () => changeGenre(btn.dataset.genre));
    });
    
    // Magic Fill
    document.getElementById('magic-fill-btn').addEventListener('click', magicFill);
    
    // BPM control
    document.getElementById('bpm-slider').addEventListener('input', (e) => {
        AppState.bpm = parseInt(e.target.value);
        document.getElementById('bpm-value').textContent = AppState.bpm;
        if (AppState.audioContextStarted) {
            Tone.Transport.bpm.value = AppState.bpm;
        }
    });
    
    // Share
    document.getElementById('share-btn').addEventListener('click', openShareModal);
    document.getElementById('share-next').addEventListener('click', nextShareStep);
    document.getElementById('share-prev').addEventListener('click', prevShareStep);
    document.getElementById('preview-share-btn').addEventListener('click', previewShare);
    
    // Mood filter
    document.querySelectorAll('.mood-btn').forEach(btn => {
        btn.addEventListener('click', () => filterByMood(btn.dataset.mood));
    });
    
    // Category cards
    document.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', () => showCategory(card.dataset.category));
    });
    
    // Export buttons
    document.querySelectorAll('.export-btn').forEach(btn => {
        btn.addEventListener('click', handleExport);
    });
    
    // Project name
    document.getElementById('project-name').addEventListener('change', (e) => {
        AppState.projectName = e.target.value;
    });
}

function startApp() {
    document.getElementById('onboarding').classList.add('hidden');
    
    // Initialize audio context on user interaction
    Tone.start();
    initAudio();
    
    // Show tutorial for first-time users
    if (!localStorage.getItem('loopflow_tutorial_seen')) {
        showTutorial();
    }
}

function showTutorial() {
    document.getElementById('tutorial').classList.remove('hidden');
}

function skipTutorial() {
    document.getElementById('tutorial').classList.add('hidden');
    localStorage.setItem('loopflow_tutorial_seen', 'true');
}

function switchTab(tab) {
    AppState.currentTab = tab;
    
    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tab}-tab`).classList.add('active');
}

function changeGenre(genre) {
    AppState.currentGenre = genre;
    const genreConfig = Genres[genre];
    
    // Update UI
    document.querySelectorAll('.genre-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.genre === genre);
    });
    
    // Update CSS variable for genre color
    document.documentElement.style.setProperty('--genre-color', genreConfig.color);
    
    // Update BPM
    AppState.bpm = genreConfig.bpm;
    document.getElementById('bpm-slider').value = genreConfig.bpm;
    document.getElementById('bpm-value').textContent = genreConfig.bpm;
    
    if (AppState.audioContextStarted) {
        Tone.Transport.bpm.value = genreConfig.bpm;
    }
    
    showToast(`Switched to ${genreConfig.name} mode`, 'success');
}

function magicFill() {
    const pattern = MagicPatterns[AppState.currentGenre];
    
    // Apply pattern to grid
    for (let track = 0; track < 8; track++) {
        for (let step = 0; step < 8; step++) {
            AppState.grid[track][step] = pattern[track][step] === 1;
        }
    }
    
    // Update UI
    document.querySelectorAll('.grid-cell').forEach(cell => {
        const track = parseInt(cell.dataset.track);
        const step = parseInt(cell.dataset.step);
        cell.classList.toggle('active', AppState.grid[track][step]);
    });
    
    // Haptic feedback
    if (navigator.vibrate) {
        navigator.vibrate([50, 50, 50]);
    }
    
    showToast('✨ Magic pattern applied!', 'success');
}

// ============================================
// DISCOVERY FEED
// ============================================
function populateDiscoveryFeed() {
    const feed = document.getElementById('beats-feed');
    feed.innerHTML = '';
    
    SampleBeats.forEach(beat => {
        const card = createBeatCard(beat);
        feed.appendChild(card);
    });
}

function createBeatCard(beat) {
    const card = document.createElement('div');
    card.className = 'beat-card';
    card.dataset.mood = beat.mood;
    card.dataset.genre = beat.genre;
    
    const isLiked = AppState.likedBeats.has(beat.id);
    
    card.innerHTML = `
        <div class="beat-visualizer">
            <canvas id="visualizer-${beat.id}"></canvas>
            <div class="beat-play-overlay" onclick="playBeat(${beat.id})">
                <i class="fas fa-play"></i>
            </div>
        </div>
        <div class="beat-info">
            <div class="beat-header">
                <div>
                    <div class="beat-title">${beat.title}</div>
                    <div class="beat-author">@${beat.author}</div>
                </div>
            </div>
            <div class="beat-actions">
                <button class="beat-action-btn ${isLiked ? 'active' : ''}" onclick="likeBeat(${beat.id})">
                    <i class="fas fa-fire"></i> ${beat.likes}
                </button>
                <button class="beat-action-btn" onclick="reactToBeat(${beat.id}, 'mind')">
                    <i class="fas fa-brain"></i>
                </button>
                <button class="beat-action-btn" onclick="reactToBeat(${beat.id}, 'headphones')">
                    <i class="fas fa-headphones"></i>
                </button>
                <button class="remix-btn" onclick="remixBeat(${beat.id})">
                    <i class="fas fa-code-branch"></i> Remix
                </button>
            </div>
        </div>
    `;
    
    // Initialize visualizer for this beat
    setTimeout(() => initVisualizer(`visualizer-${beat.id}`, beat.genre), 100);
    
    return card;
}

function filterByMood(mood) {
    // Update buttons
    document.querySelectorAll('.mood-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mood === mood);
    });
    
    // Filter cards
    document.querySelectorAll('.beat-card').forEach(card => {
        if (mood === 'all' || card.dataset.mood === mood) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

function likeBeat(id) {
    if (AppState.likedBeats.has(id)) {
        AppState.likedBeats.delete(id);
    } else {
        AppState.likedBeats.add(id);
        if (navigator.vibrate) navigator.vibrate(20);
    }
    
    // Update UI
    populateDiscoveryFeed();
}

function reactToBeat(id, type) {
    const reactions = {
        mind: '🧠 Mind blown!',
        headphones: '🎧 Using headphones'
    };
    showToast(reactions[type], 'success');
    if (navigator.vibrate) navigator.vibrate(15);
}

function remixBeat(id) {
    const beat = SampleBeats.find(b => b.id === id);
    if (beat) {
        // Load the beat's genre pattern
        changeGenre(beat.genre);
        magicFill();
        switchTab('create');
        showToast(`Remixing "${beat.title}"`, 'success');
    }
}

function playBeat(id) {
    showToast('Playing beat...', 'success');
}

// ============================================
// VISUALIZER
// ============================================
function initVisualizer(canvasId, genre) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    const colors = {
        trap: ['#8B5CF6', '#EC4899'],
        lofi: ['#3B82F6', '#60A5FA'],
        house: ['#F97316', '#FBBF24'],
        ambient: ['#10B981', '#34D399']
    };
    
    const [color1, color2] = colors[genre] || colors.trap;
    
    let animationId;
    let bars = [];
    const barCount = 20;
    
    for (let i = 0; i < barCount; i++) {
        bars.push({
            height: Math.random() * canvas.height * 0.5,
            speed: 0.02 + Math.random() * 0.03
        });
    }
    
    function animate() {
        ctx.fillStyle = 'rgba(10, 10, 15, 0.2)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const barWidth = canvas.width / barCount;
        
        bars.forEach((bar, i) => {
            bar.height += Math.sin(Date.now() * bar.speed) * 2;
            bar.height = Math.max(10, Math.min(canvas.height * 0.7, bar.height));
            
            const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - bar.height);
            gradient.addColorStop(0, color1);
            gradient.addColorStop(1, color2);
            
            ctx.fillStyle = gradient;
            ctx.fillRect(i * barWidth + 2, canvas.height - bar.height, barWidth - 4, bar.height);
        });
        
        animationId = requestAnimationFrame(animate);
    }
    
    animate();
}

// ============================================
// LIBRARY
// ============================================
function populateStemPacks() {
    const list = document.getElementById('stem-list');
    list.innerHTML = '';
    
    StemPacks.forEach(stem => {
        const item = document.createElement('div');
        item.className = 'stem-item';
        item.innerHTML = `
            <div class="stem-cover">
                <i class="fas fa-music"></i>
            </div>
            <div class="stem-info">
                <div class="stem-name">${stem.name}</div>
                <div class="stem-artist">${stem.artist}</div>
            </div>
            <span class="stem-tag">${stem.tag}</span>
        `;
        
        item.addEventListener('click', () => {
            showToast(`Loaded ${stem.name}`, 'success');
        });
        
        list.appendChild(item);
    });
}

function showCategory(category) {
    showToast(`${category} sounds loaded`, 'success');
}

// ============================================
// SHARE MODAL
// ============================================
function openShareModal() {
    AppState.shareStep = 1;
    document.getElementById('share-modal').classList.remove('hidden');
    updateShareStep();
    initShareVisualizer();
}

function closeShareModal() {
    document.getElementById('share-modal').classList.add('hidden');
}

function updateShareStep() {
    // Hide all steps
    document.querySelectorAll('.share-step').forEach(step => {
        step.classList.add('hidden');
    });
    
    // Show current step
    document.getElementById(`share-step-${AppState.shareStep}`).classList.remove('hidden');
    
    // Update progress dots
    document.querySelectorAll('.progress-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i < AppState.shareStep);
    });
    
    // Update buttons
    document.getElementById('share-prev').classList.toggle('hidden', AppState.shareStep === 1);
    document.getElementById('share-next').textContent = AppState.shareStep === 3 ? 'Done' : 'Next';
}

function nextShareStep() {
    if (AppState.shareStep < 3) {
        AppState.shareStep++;
        updateShareStep();
    } else {
        closeShareModal();
        showToast('Beat shared successfully!', 'success');
        saveBeat();
    }
}

function prevShareStep() {
    if (AppState.shareStep > 1) {
        AppState.shareStep--;
        updateShareStep();
    }
}

function previewShare() {
    togglePlayback();
    const btn = document.getElementById('preview-share-btn');
    btn.innerHTML = AppState.isPlaying ? 
        '<i class="fas fa-pause"></i> Pause' : 
        '<i class="fas fa-play"></i> Preview';
}

function initShareVisualizer() {
    const canvas = document.getElementById('share-visualizer');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    const genre = AppState.currentGenre;
    const colors = {
        trap: ['#8B5CF6', '#EC4899'],
        lofi: ['#3B82F6', '#60A5FA'],
        house: ['#F97316', '#FBBF24'],
        ambient: ['#10B981', '#34D399']
    };
    
    const [color1, color2] = colors[genre];
    
    function draw() {
        ctx.fillStyle = 'rgba(26, 26, 46, 0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const time = Date.now() * 0.001;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Draw geometric shapes based on genre
        for (let i = 0; i < 5; i++) {
            const radius = 30 + i * 20 + Math.sin(time + i) * 10;
            const rotation = time * (0.5 + i * 0.1);
            
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(rotation);
            
            ctx.beginPath();
            ctx.strokeStyle = i % 2 === 0 ? color1 : color2;
            ctx.lineWidth = 2;
            
            if (genre === 'trap') {
                // Draw squares
                ctx.rect(-radius, -radius, radius * 2, radius * 2);
            } else if (genre === 'lofi') {
                // Draw circles
                ctx.arc(0, 0, radius, 0, Math.PI * 2);
            } else if (genre === 'house') {
                // Draw triangles
                ctx.moveTo(0, -radius);
                ctx.lineTo(radius, radius);
                ctx.lineTo(-radius, radius);
                ctx.closePath();
            } else {
                // Draw hexagons
                for (let j = 0; j < 6; j++) {
                    const angle = (j / 6) * Math.PI * 2;
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;
                    if (j === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();
            }
            
            ctx.stroke();
            ctx.restore();
        }
        
        requestAnimationFrame(draw);
    }
    
    draw();
}

function handleExport(e) {
    const btn = e.currentTarget;
    
    if (btn.classList.contains('tiktok')) {
        showToast('Exporting to TikTok...', 'success');
    } else if (btn.classList.contains('instagram')) {
        showToast('Sharing to Instagram Stories...', 'success');
    } else if (btn.classList.contains('link')) {
        navigator.clipboard.writeText('https://loopflow.app/beat/123');
        showToast('Link copied to clipboard!', 'success');
    }
}

function saveBeat() {
    const beat = {
        id: Date.now(),
        name: AppState.projectName,
        genre: AppState.currentGenre,
        date: new Date().toLocaleDateString(),
        grid: JSON.parse(JSON.stringify(AppState.grid))
    };
    
    AppState.savedBeats.push(beat);
    localStorage.setItem('loopflow_beats', JSON.stringify(AppState.savedBeats));
    
    updateProfileStats();
}

function updateProfileStats() {
    document.querySelector('.stat-value').textContent = AppState.savedBeats.length;
}

function loadSavedState() {
    const saved = localStorage.getItem('loopflow_beats');
    if (saved) {
        AppState.savedBeats = JSON.parse(saved);
        updateProfileStats();
    }
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        togglePlayback();
    }
});

// ============================================
// INITIALIZE
// ============================================
document.addEventListener('DOMContentLoaded', init);