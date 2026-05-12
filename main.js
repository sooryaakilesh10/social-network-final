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
    gridSteps: 8, // Dynamic step count, can be extended for longer recordings
    audioContextStarted: false,
    tutorialStep: 0,
    shareStep: 1,
    projectName: 'My First Beat',
    savedBeats: [],
    likedBeats: new Set(),
    voiceRecordingUrl: null,
    pianoRecordingUrl: null,
};

// Genre configurations with colors
const Genres = {
    trap: { color: '#FACC15', bpm: 140, name: 'Trap' },
    lofi: { color: '#14B8A6', bpm: 85, name: 'Lo-fi' },
    house: { color: '#F43F5E', bpm: 128, name: 'House' },
    ambient: { color: '#38BDF8', bpm: 100, name: 'Ambient' }
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
let pianoPart = null; // Tone.Part for piano recording playback
let progressAnimationFrame = null; // For smooth progress bar animation

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

    // Voice player for recordings
    synths.voicePlayer = null;

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

    // Piano recording playback is now handled by Tone.Part (see schedulePianoPlayback)

    // Visual feedback
    Tone.Draw.schedule(() => {
        highlightPlayingStep(step);
        updatePianoProgressBar(step);
    }, time);
}

function updateStepIndicator() {
    AppState.currentStep = (AppState.currentStep + 1) % AppState.gridSteps;
}

function highlightPlayingStep(step) {
    document.querySelectorAll('.step-indicator').forEach((el, i) => {
        el.classList.toggle('active', i === step);
    });

    document.querySelectorAll('.grid-cell').forEach((cell, i) => {
        const cellStep = i % AppState.gridSteps;
        cell.classList.toggle('playing', cellStep === step);
    });
}

function updatePianoProgressBar(step) {
    // Progress bar now updates smoothly via animateProgressBar()
    // This function is kept for compatibility but doesn't do discrete updates
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
        // Play voice recording if available
        playVoiceRecording();
        // Start piano part if exists
        if (pianoPart) {
            pianoPart.start(0);
        }
        // Start smooth progress bar animation
        startProgressBarAnimation();
    } else {
        Tone.Transport.stop();
        loop.stop();
        // Stop piano part if exists
        if (pianoPart) {
            pianoPart.stop();
        }
        // Stop progress bar animation
        stopProgressBarAnimation();
        document.getElementById('play-btn').innerHTML = '<i class="fas fa-play"></i>';
        document.getElementById('play-btn').classList.remove('playing');
        AppState.currentStep = 0;

        document.querySelectorAll('.step-indicator').forEach((el, i) => {
            el.classList.toggle('active', i === 0);
        });
        document.querySelectorAll('.grid-cell').forEach(cell => {
            cell.classList.remove('playing');
        });
        // Reset piano progress bar
        resetPianoProgressBar();
        // Stop voice recording if playing
        stopVoiceRecording();
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
    grid.style.gridTemplateColumns = `repeat(${AppState.gridSteps}, minmax(34px, 1fr))`;

    for (let track = 0; track < 8; track++) {
        for (let step = 0; step < AppState.gridSteps; step++) {
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

function extendGrid(newStepCount) {
    // Ensure within bounds
    if (newStepCount < 4 || newStepCount > 32) {
        return;
    }

    const oldStepCount = AppState.gridSteps;

    // Extend each track in the grid
    for (let track = 0; track < AppState.grid.length; track++) {
        if (newStepCount > oldStepCount) {
            // Extend the grid
            while (AppState.grid[track].length < newStepCount) {
                AppState.grid[track].push(false);
            }
        } else if (newStepCount < oldStepCount) {
            // Shrink the grid
            AppState.grid[track] = AppState.grid[track].slice(0, newStepCount);
        }
    }

    // Update grid steps
    AppState.gridSteps = newStepCount;

    // Regenerate UI
    generateGrid();
    regenerateStepIndicators();



    // If piano recording exists, reschedule it with new duration
    if (AppState.pianoRecordingUrl && AppState.pianoRecordingUrl.length > 0) {
        schedulePianoPlayback();
    }

    if (newStepCount !== oldStepCount) {
        showToast(`Grid ${newStepCount > oldStepCount ? 'extended' : 'shortened'} to ${newStepCount} steps`, 'info');
    }
}

function regenerateStepIndicators() {
    const container = document.querySelector('.step-indicators');
    if (!container) return;

    container.innerHTML = '';

    for (let i = 0; i < AppState.gridSteps; i++) {
        const indicator = document.createElement('div');
        indicator.className = 'step-indicator';
        if (i === 0) indicator.classList.add('active');
        indicator.dataset.step = i;
        indicator.textContent = i + 1;
        container.appendChild(indicator);
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
    switch (track) {
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

    // Clear Grid
    document.getElementById('clear-grid-btn').addEventListener('click', clearGrid);

    // BPM control
    document.getElementById('bpm-slider').addEventListener('input', (e) => {
        AppState.bpm = parseInt(e.target.value);
        document.getElementById('bpm-value').textContent = AppState.bpm;
        if (AppState.audioContextStarted) {
            Tone.Transport.bpm.value = AppState.bpm;
        }
    });

    // Grid length control
    const lengthSelect = document.getElementById('grid-length-select');
    if (lengthSelect) {
        lengthSelect.value = AppState.gridSteps;
        lengthSelect.addEventListener('change', (e) => {
            extendGrid(parseInt(e.target.value));
        });
    }

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

function clearGrid() {
    // Show custom confirmation dialog
    showConfirm('Are you sure you want to clear the entire grid? This action cannot be undone.')
        .then((confirmed) => {
            if (!confirmed) {
                return; // User cancelled, do nothing
            }

            // Clear all cells in the grid
            for (let track = 0; track < 8; track++) {
                for (let step = 0; step < AppState.gridSteps; step++) {
                    AppState.grid[track][step] = false;
                }
            }

            // Update UI to reflect cleared grid
            document.querySelectorAll('.grid-cell').forEach(cell => {
                cell.classList.remove('active');
            });

            // Haptic feedback
            if (navigator.vibrate) {
                navigator.vibrate([30, 30, 30]);
            }

            showToast('🗑️ Grid cleared!', 'success');
        });
}

// Custom confirmation dialog
function showConfirm(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirm-modal');
        const messageEl = document.getElementById('confirm-message');
        const cancelBtn = document.getElementById('confirm-cancel');
        const okBtn = document.getElementById('confirm-ok');

        messageEl.textContent = message;
        modal.classList.remove('hidden');

        // Haptic feedback
        if (navigator.vibrate) {
            navigator.vibrate(20);
        }

        const handleCancel = () => {
            modal.classList.add('hidden');
            cleanup();
            resolve(false);
        };

        const handleOk = () => {
            modal.classList.add('hidden');
            cleanup();
            resolve(true);
        };

        const cleanup = () => {
            cancelBtn.removeEventListener('click', handleCancel);
            okBtn.removeEventListener('click', handleOk);
        };

        cancelBtn.addEventListener('click', handleCancel);
        okBtn.addEventListener('click', handleOk);
    });
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
        trap: ['#FACC15', '#14B8A6'],
        lofi: ['#14B8A6', '#67E8F9'],
        house: ['#F43F5E', '#FB923C'],
        ambient: ['#38BDF8', '#14B8A6']
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
        trap: ['#FACC15', '#14B8A6'],
        lofi: ['#14B8A6', '#67E8F9'],
        house: ['#F43F5E', '#FB923C'],
        ambient: ['#38BDF8', '#14B8A6']
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
// VOICE RECORDER
// ============================================
let mediaRecorder = null;
let recordedChunks = [];
let recordingTimer = null;
let recordingSeconds = 0;
let voiceRecordingUrl = null; // This is now AppState.voiceRecordingUrl

function initVoiceRecorder() {
    const recordBtn = document.getElementById('record-btn');
    const stopBtn = document.getElementById('stop-record-btn');
    const timer = document.getElementById('recording-timer');

    recordBtn.addEventListener('click', startRecording);
    stopBtn.addEventListener('click', stopRecording);
}

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        recordedChunks = [];

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                recordedChunks.push(e.data);
            }
        };

        mediaRecorder.onstop = saveRecording;

        mediaRecorder.start();

        // Update UI
        document.getElementById('record-btn').classList.add('hidden');
        document.getElementById('stop-record-btn').classList.remove('hidden');
        document.getElementById('recording-timer').classList.remove('hidden');

        // Start timer
        recordingSeconds = 0;
        updateRecordingTimer();
        recordingTimer = setInterval(updateRecordingTimer, 1000);

        showToast('🔴 Recording started!', 'success');
    } catch (err) {
        showToast('Microphone access denied', 'error');
    }
}

function updateRecordingTimer() {
    recordingSeconds++;
    const mins = Math.floor(recordingSeconds / 60).toString().padStart(2, '0');
    const secs = (recordingSeconds % 60).toString().padStart(2, '0');
    document.getElementById('recording-timer').textContent = `${mins}:${secs}`;
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }

    clearInterval(recordingTimer);

    // Update UI
    document.getElementById('record-btn').classList.remove('hidden');
    document.getElementById('stop-record-btn').classList.add('hidden');
    document.getElementById('recording-timer').classList.add('hidden');

    showToast('✅ Recording saved!', 'success');
}

function saveRecording() {
    const blob = new Blob(recordedChunks, { type: 'audio/webm' });
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toLocaleTimeString();
    const clipId = `clip-${Date.now()}`;

    const clipContainer = document.createElement('div');
    clipContainer.className = 'recorded-clip';
    clipContainer.innerHTML = `
        <div class="clip-info">
            <i class="fas fa-microphone"></i>
            <span>Voice Clip ${timestamp}</span>
        </div>
        <div class="clip-actions">
            <button class="btn-play-clip" onclick="playVoiceClip('${url}', '${clipId}')">
                <i class="fas fa-play"></i> Play
            </button>
            <button class="btn-add-to-beat" onclick="addVoiceToBeat('${url}')">
                <i class="fas fa-plus"></i> Add to Beat
            </button>
        </div>
        <audio id="${clipId}" src="${url}" style="display: none;"></audio>
    `;

    document.getElementById('recorded-clips').prepend(clipContainer);
}

function playVoiceClip(url, clipId) {
    const audio = document.getElementById(clipId);
    const allAudios = document.querySelectorAll('.recorded-clip audio');

    // Stop all other playing clips
    allAudios.forEach(a => {
        if (a.id !== clipId) {
            a.pause();
            a.currentTime = 0;
        }
    });

    // Toggle play/pause for this clip
    if (audio.paused) {
        audio.play();
        // Update button to show pause icon
        const btn = event.target.closest('.btn-play-clip');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-pause"></i> Pause';
        }

        // Reset button when audio ends
        audio.onended = () => {
            if (btn) {
                btn.innerHTML = '<i class="fas fa-play"></i> Play';
            }
        };
    } else {
        audio.pause();
        audio.currentTime = 0;
        const btn = event.target.closest('.btn-play-clip');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-play"></i> Play';
        }
    }
}


function addVoiceToBeat(url) {
    AppState.voiceRecordingUrl = url;

    // Remove existing voice track if any
    const existingVoiceTrack = document.getElementById('voice-track-bar');
    if (existingVoiceTrack) {
        existingVoiceTrack.remove();
    }

    // Create new voice track as a full-width bar
    const voiceTrackBar = document.createElement('div');
    voiceTrackBar.id = 'voice-track-bar';
    voiceTrackBar.className = 'voice-track-bar';
    voiceTrackBar.innerHTML = `
        <div class="voice-track-content">
            <div class="voice-track-header">
                <i class="fas fa-microphone"></i>
                <span>VOICE</span>
            </div>
            <div class="voice-progress-bar-container">
                <div id="voice-progress-bar" class="voice-progress-bar"></div>
            </div>
        </div>
    `;

    // Insert after the sequencer container
    const sequencerContainer = document.querySelector('.sequencer-container');
    sequencerContainer.parentNode.insertBefore(voiceTrackBar, sequencerContainer.nextSibling);

    showToast('Voice added to your beat!', 'success');
}

// ============================================
// PIANO KEYBOARD
// ============================================
let pianoSynth = null;
let currentInstrument = 'piano';

const instrumentConfigs = {
    piano: {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.005, decay: 0.3, sustain: 0.4, release: 1.2 }
    },
    synth: {
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.5 }
    },
    bass: {
        oscillator: { type: 'square' },
        envelope: { attack: 0.05, decay: 0.4, sustain: 0.6, release: 0.8 }
    },
    strings: {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.1, decay: 0.5, sustain: 0.7, release: 1.5 }
    },
    organ: {
        oscillator: { type: 'square' },
        envelope: { attack: 0.02, decay: 0.1, sustain: 1, release: 0.3 }
    },
    flute: {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.05, decay: 0.2, sustain: 0.6, release: 0.8 }
    }
};

const pianoNotes = [
    { note: 'C4', type: 'white', label: 'C' },
    { note: 'C#4', type: 'black', label: 'C#' },
    { note: 'D4', type: 'white', label: 'D' },
    { note: 'D#4', type: 'black', label: 'D#' },
    { note: 'E4', type: 'white', label: 'E' },
    { note: 'F4', type: 'white', label: 'F' },
    { note: 'F#4', type: 'black', label: 'F#' },
    { note: 'G4', type: 'white', label: 'G' },
    { note: 'G#4', type: 'black', label: 'G#' },
    { note: 'A4', type: 'white', label: 'A' },
    { note: 'A#4', type: 'black', label: 'A#' },
    { note: 'B4', type: 'white', label: 'B' },
    { note: 'C5', type: 'white', label: 'C' }
];

function initPiano() {
    const pianoKeys = document.getElementById('piano-keys');
    const instrumentSelect = document.getElementById('instrument-select');

    // Generate piano keys
    pianoNotes.forEach((keyData, index) => {
        const key = document.createElement('div');
        key.className = `piano-key ${keyData.type}`;
        key.dataset.note = keyData.note;

        if (keyData.type === 'white') {
            key.innerHTML = `<span class="key-label">${keyData.label}</span>`;
        }

        key.addEventListener('mousedown', () => playPianoNote(keyData.note));
        key.addEventListener('mouseup', () => stopPianoNote(keyData.note));
        key.addEventListener('mouseleave', () => stopPianoNote(keyData.note));

        // Touch support
        key.addEventListener('touchstart', (e) => {
            e.preventDefault();
            playPianoNote(keyData.note);
        });
        key.addEventListener('touchend', (e) => {
            e.preventDefault();
            stopPianoNote(keyData.note);
        });

        pianoKeys.appendChild(key);
    });

    // Instrument selector
    instrumentSelect.addEventListener('change', (e) => {
        changeInstrument(e.target.value);
    });

    // Initialize default instrument
    changeInstrument('piano');

    // Piano record button
    document.getElementById('piano-record-btn').addEventListener('click', togglePianoRecord);
    document.getElementById('piano-clear-btn').addEventListener('click', clearPianoRecording);
}

function changeInstrument(instrument) {
    currentInstrument = instrument;
    const config = instrumentConfigs[instrument];

    if (pianoSynth) {
        pianoSynth.dispose();
    }

    pianoSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: config.oscillator,
        envelope: config.envelope,
        volume: -5
    }).toDestination();
}

function playPianoNote(note) {
    if (!AppState.audioContextStarted) {
        Tone.start();
        initAudio();
    }

    if (pianoSynth) {
        pianoSynth.triggerAttack(note);
    }

    // Record the note if recording is active
    if (isPianoRecording) {
        recordPianoNote(note, Date.now(), 'start');
    }

    // Visual feedback
    const key = document.querySelector(`.piano-key[data-note="${note}"]`);
    if (key) {
        key.classList.add('active');
    }

    // Haptic feedback
    if (navigator.vibrate) {
        navigator.vibrate(20);
    }
}

function stopPianoNote(note) {
    if (pianoSynth) {
        pianoSynth.triggerRelease(note);
    }

    // Record the note release if recording is active
    if (isPianoRecording) {
        recordPianoNote(note, Date.now(), 'stop');
    }

    // Remove visual feedback
    const key = document.querySelector(`.piano-key[data-note="${note}"]`);
    if (key) {
        key.classList.remove('active');
    }
}

let isPianoRecording = false;
let pianoRecording = []; // Raw events (start/stop)
let pianoRecordStartTime = 0;
let lastPianoRecording = null; // Store the last processed recording for preview

// Piano Clip Playback Variables
let currentPianoPreview = null;
let pianoPreviewPart = null;

function playPianoClip(clipId, btn) {
    if (!lastPianoRecording || !pianoSynth) {
        showToast('No piano recording available', 'error');
        return;
    }

    // If already playing this clip, stop it
    if (currentPianoPreview === clipId && pianoPreviewPart) {
        stopPianoPreview();
        if (btn) {
            btn.innerHTML = '<i class="fas fa-play"></i> Play';
        }
        return;
    }

    // Stop any currently playing preview
    stopPianoPreview();

    // Start audio context if needed
    if (!AppState.audioContextStarted) {
        Tone.start();
        initAudio();
    }

    // Create a one-shot Part for preview (no loop)
    const partNotes = lastPianoRecording.map(noteData => {
        const timeInSeconds = noteData.time / 1000;
        const durationInSeconds = noteData.duration ? noteData.duration / 1000 : 0.1;
        return [
            timeInSeconds,
            {
                note: noteData.note,
                duration: durationInSeconds
            }
        ];
    });

    pianoPreviewPart = new Tone.Part((time, value) => {
        pianoSynth.triggerAttackRelease(value.note, value.duration, time);
    }, partNotes);

    // Don't loop for preview
    pianoPreviewPart.loop = false;

    // Update button to show pause
    if (btn) {
        btn.innerHTML = '<i class="fas fa-pause"></i> Pause';
    }

    // Reset and start Transport from beginning
    Tone.Transport.stop();
    Tone.Transport.seconds = 0;

    // Start playback at Transport time 0 (not Tone.now())
    pianoPreviewPart.start(0);
    Tone.Transport.start();
    currentPianoPreview = clipId;

    // Calculate total duration
    const maxTime = Math.max(...lastPianoRecording.map(n => (n.time + n.duration) / 1000));

    // Stop after the recording finishes
    setTimeout(() => {
        stopPianoPreview();
        if (btn) {
            btn.innerHTML = '<i class="fas fa-play"></i> Play';
        }
    }, (maxTime + 0.5) * 1000); // Add 0.5s buffer
}

function stopPianoPreview() {
    if (pianoPreviewPart) {
        pianoPreviewPart.stop();
        pianoPreviewPart.dispose();
        pianoPreviewPart = null;
    }

    // Only stop transport if main playback isn't active
    if (!AppState.isPlaying) {
        Tone.Transport.stop();
    }

    currentPianoPreview = null;
}

function togglePianoRecord() {
    const btn = document.getElementById('piano-record-btn');

    if (!isPianoRecording) {
        isPianoRecording = true;
        pianoRecording = [];
        pianoRecordStartTime = Date.now();
        btn.classList.add('recording');
        btn.innerHTML = '<i class="fas fa-stop"></i>';
        showToast('🔴 Recording piano...', 'success');
    } else {
        isPianoRecording = false;
        btn.classList.remove('recording');
        btn.innerHTML = '<i class="fas fa-circle"></i>';

        // Process raw pianoRecording into notes with duration
        const processedNotes = [];
        const activeNotes = {};
        pianoRecording.forEach(event => {
            if (event.type === 'start') {
                activeNotes[event.note] = event.time;
            } else if (event.type === 'stop' && activeNotes[event.note] !== undefined) {
                const startTime = activeNotes[event.note];
                const duration = event.time - startTime;
                if (duration > 0) { // Only add if duration is positive
                    processedNotes.push({
                        note: event.note,
                        time: startTime,
                        duration: duration
                    });
                }
                delete activeNotes[event.note];
            }
        });

        // Sort by time for correct playback order
        processedNotes.sort((a, b) => a.time - b.time);

        // Save for preview (don't add to beat yet)
        if (processedNotes.length > 0) {
            lastPianoRecording = processedNotes;
            savePianoRecording(processedNotes);
            showToast(`✅ Recorded ${processedNotes.length} notes!`, 'success');
        } else {
            showToast('No notes recorded', 'info');
        }
    }
}

function savePianoRecording(processedNotes) {
    const timestamp = new Date().toLocaleTimeString();
    const noteCount = processedNotes.length;
    const clipId = `piano-clip-${Date.now()}`;

    const clipContainer = document.createElement('div');
    clipContainer.className = 'recorded-clip';
    clipContainer.innerHTML = `
        <div class="clip-info">
            <i class="fas fa-keyboard"></i>
            <span>Piano Clip ${timestamp} (${noteCount} notes)</span>
        </div>
        <div class="clip-actions">
            <button class="btn-play-clip" data-clip-id="${clipId}">
                <i class="fas fa-play"></i> Play
            </button>
            <button class="btn-add-to-beat">
                <i class="fas fa-plus"></i> Add to Beat
            </button>
        </div>
    `;

    // Store the clip ID for reference
    clipContainer.dataset.clipId = clipId;

    // Add event listeners
    const playBtn = clipContainer.querySelector('.btn-play-clip');
    const addBtn = clipContainer.querySelector('.btn-add-to-beat');

    playBtn.addEventListener('click', (e) => {
        playPianoClip(clipId, e.currentTarget);
    });

    addBtn.addEventListener('click', () => {
        addPianoToBeat();
    });

    // Clear previous clips and add new one
    const clipsContainer = document.getElementById('piano-recorded-clips');
    clipsContainer.innerHTML = '';
    clipsContainer.appendChild(clipContainer);
}

function addPianoToBeat() {
    if (!lastPianoRecording) {
        showToast('No piano recording found', 'error');
        return;
    }

    // Calculate grid duration in milliseconds
    const stepDuration = (60 / AppState.bpm) * 1000; // Duration of one step in ms
    const gridDuration = stepDuration * AppState.gridSteps; // Total grid duration in ms

    // Cut notes that exceed the grid length
    const processedNotes = lastPianoRecording
        .filter(note => note.time < gridDuration) // Keep only notes that start within grid
        .map(note => {
            const noteEnd = note.time + note.duration;
            if (noteEnd > gridDuration) {
                // Trim duration if it extends beyond grid
                return {
                    ...note,
                    duration: gridDuration - note.time
                };
            }
            return note;
        });

    if (processedNotes.length === 0) {
        showToast('⚠️ All notes exceed grid length', 'error');
        return;
    }

    // Save recording - it will loop automatically via Tone.Part
    AppState.pianoRecordingUrl = processedNotes;

    // Remove existing piano track if any
    const existingPianoTrack = document.getElementById('piano-track-bar');
    if (existingPianoTrack) {
        existingPianoTrack.remove();
    }

    // Create new piano track as a full-width bar (similar to voice track)
    const pianoTrackBar = document.createElement('div');
    pianoTrackBar.id = 'piano-track-bar';
    pianoTrackBar.className = 'piano-track-bar';
    pianoTrackBar.innerHTML = `
        <div class="piano-track-content">
            <div class="piano-track-header">
                <i class="fas fa-keyboard"></i>
                <span>PIANO</span>
            </div>
            <div class="piano-progress-bar-container-inline">
                <div id="piano-progress-bar-inline" class="piano-progress-bar-inline"></div>
            </div>
        </div>
    `;

    // Insert after the sequencer container (or after voice track if it exists)
    const sequencerContainer = document.querySelector('.sequencer-container');
    const voiceTrack = document.getElementById('voice-track-bar');

    if (voiceTrack) {
        // Insert after voice track
        voiceTrack.parentNode.insertBefore(pianoTrackBar, voiceTrack.nextSibling);
    } else {
        // Insert after sequencer
        sequencerContainer.parentNode.insertBefore(pianoTrackBar, sequencerContainer.nextSibling);
    }

    // Schedule piano playback with Transport sync
    schedulePianoPlayback();

    // Hide the old progress bar container if it exists
    const oldProgressContainer = document.getElementById('piano-progress-container');
    if (oldProgressContainer) {
        oldProgressContainer.classList.add('hidden');
    }

    showToast('🎹 Piano added to beat!', 'success');
}

function clearPianoRecording() {
    pianoRecording = [];
    lastPianoRecording = null;
    AppState.pianoRecordingUrl = null;

    // Stop and dispose piano part
    if (pianoPart) {
        pianoPart.stop();
        pianoPart.dispose();
        pianoPart = null;
    }

    // Clear preview UI
    const clipsContainer = document.getElementById('piano-recorded-clips');
    if (clipsContainer) {
        clipsContainer.innerHTML = '';
    }

    // Remove piano track bar
    const pianoTrackBar = document.getElementById('piano-track-bar');
    if (pianoTrackBar) {
        pianoTrackBar.remove();
    }

    // Hide old progress bar container
    const oldProgressContainer = document.getElementById('piano-progress-container');
    if (oldProgressContainer) {
        oldProgressContainer.classList.add('hidden');
    }

    showToast('Recording cleared', 'success');
}


function startProgressBarAnimation() {
    if (!AppState.pianoRecordingUrl || AppState.pianoRecordingUrl.length === 0) return;

    const progressBar = document.getElementById('piano-progress-bar-inline');

    if (!progressBar) return;

    // Calculate loop duration
    const stepDuration = (60 / AppState.bpm); // Duration of one step in seconds
    const loopDuration = stepDuration * AppState.gridSteps; // Total loop duration in seconds

    function animate() {
        if (!AppState.isPlaying) return;

        // Get current position in Transport timeline
        const currentTime = Tone.Transport.seconds;

        // Calculate progress within the loop
        const timeInLoop = currentTime % loopDuration;
        const progress = (timeInLoop / loopDuration) * 100;

        // Update progress bar
        progressBar.style.width = `${progress}%`;

        // Continue animation
        progressAnimationFrame = requestAnimationFrame(animate);
    }

    // Start animation
    progressAnimationFrame = requestAnimationFrame(animate);
}

function stopProgressBarAnimation() {
    if (progressAnimationFrame) {
        cancelAnimationFrame(progressAnimationFrame);
        progressAnimationFrame = null;
    }

    // Reset inline progress bar
    const progressBar = document.getElementById('piano-progress-bar-inline');
    if (progressBar) {
        progressBar.style.width = '0%';
    }
}

// ============================================
// PLAYBACK INTEGRATION
// ============================================
function playVoiceRecording() {
    if (AppState.voiceRecordingUrl) {
        // Stop existing player if any
        if (synths.voicePlayer) {
            synths.voicePlayer.stop();
            synths.voicePlayer.dispose();
        }

        // Create new player
        synths.voicePlayer = new Tone.Player({
            url: AppState.voiceRecordingUrl,
            loop: true,
            autostart: false
        }).toDestination();

        // Start when loaded
        Tone.loaded().then(() => {
            if (synths.voicePlayer && AppState.isPlaying) {
                synths.voicePlayer.sync().start(0);
                startVoiceProgressAnimation();
            }
        });
    }
}

function startVoiceProgressAnimation() {
    const progressBar = document.getElementById('voice-progress-bar');
    if (!progressBar || !synths.voicePlayer) return;

    function updateProgress() {
        if (!AppState.isPlaying || !synths.voicePlayer) {
            if (progressBar) progressBar.style.width = '0%';
            return;
        }

        // Get the duration of the voice recording
        const duration = synths.voicePlayer.buffer.duration;

        // Calculate loop duration based on grid steps
        const stepDuration = 60 / AppState.bpm; // Duration of one step in seconds
        const loopDuration = stepDuration * AppState.gridSteps; // Total loop duration

        // Get current playback position within the loop
        const currentTime = Tone.Transport.seconds;
        const timeInLoop = currentTime % loopDuration;

        // Calculate progress percentage - use modulo to loop the progress bar
        const timeInVoiceLoop = timeInLoop % duration;
        const progress = (timeInVoiceLoop / duration) * 100;

        progressBar.style.width = `${progress}%`;

        // Continue animation if still playing
        if (AppState.isPlaying) {
            requestAnimationFrame(updateProgress);
        }
    }

    updateProgress();
}

function stopVoiceRecording() {
    if (synths.voicePlayer) {
        synths.voicePlayer.unsync().stop();
        synths.voicePlayer.dispose();
        synths.voicePlayer = null;
    }

    // Reset progress bar
    const progressBar = document.getElementById('voice-progress-bar');
    if (progressBar) {
        progressBar.style.width = '0%';
    }
}

function schedulePianoPlayback() {
    // Dispose of existing part if any
    if (pianoPart) {
        pianoPart.stop();
        pianoPart.dispose();
        pianoPart = null;
    }

    if (!AppState.pianoRecordingUrl || AppState.pianoRecordingUrl.length === 0 || !pianoSynth) {
        return;
    }

    // Calculate loop duration based on grid steps
    const stepDuration = (60 / AppState.bpm); // Duration of one step in seconds
    const loopDuration = stepDuration * AppState.gridSteps; // Total loop duration in seconds

    // Convert notes to Tone.Part format: [[time, {note, duration}], ...]
    const partNotes = AppState.pianoRecordingUrl.map(noteData => {
        const timeInSeconds = noteData.time / 1000; // Convert ms to seconds
        const durationInSeconds = noteData.duration ? noteData.duration / 1000 : 0.1;

        return [
            timeInSeconds,
            {
                note: noteData.note,
                duration: durationInSeconds
            }
        ];
    });

    // Create a new Part with the notes
    pianoPart = new Tone.Part((time, value) => {
        pianoSynth.triggerAttackRelease(value.note, value.duration, time);
    }, partNotes);

    // Make the part loop at the loop duration
    pianoPart.loop = true;
    pianoPart.loopEnd = loopDuration;

    // Start the part if playback is active
    if (AppState.isPlaying) {
        pianoPart.start(0);
    }
}

// Add to piano recording when playing notes
function recordPianoNote(note, time, eventType) {
    if (isPianoRecording) {
        pianoRecording.push({
            note: note,
            time: time - pianoRecordStartTime,
            type: eventType // 'start' or 'stop'
        });
    }
}

// Keyboard support for piano
const keyboardMap = {
    'a': 'C4', 'w': 'C#4', 's': 'D4', 'e': 'D#4', 'd': 'E4',
    'f': 'F4', 't': 'F#4', 'g': 'G4', 'y': 'G#4', 'h': 'A4',
    'u': 'A#4', 'j': 'B4', 'k': 'C5'
};

document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;

    const note = keyboardMap[e.key.toLowerCase()];
    if (note) {
        playPianoNote(note);
    }
});

document.addEventListener('keyup', (e) => {
    const note = keyboardMap[e.key.toLowerCase()];
    if (note) {
        stopPianoNote(note);
    }
});

// ============================================
// INITIALIZE
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    init();
    initVoiceRecorder();
    initPiano();

    // Ensure recordings are initialized when audio context starts
    const originalInitAudio = initAudio;
    initAudio = function () {
        originalInitAudio();
        // Load any existing voice recordings
        if (AppState.voiceRecordingUrl) {
            loadVoiceRecordingToBuffer();
        }
    };
});
