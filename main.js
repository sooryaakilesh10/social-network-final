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
    pianoNotes: [],
    pianoDefaultDuration: 1,
    pianoZoomWidth: 60,
    pianoZoomHeight: 28,
    selectedNoteId: null,
    isPianoPlaying: false,
    currentPianoStep: 0,
    fxActive: { reverb: false, delay: false, distortion: false, chorus: false },
    fxSettings: {
        reverb: { decay: 2.5, mix: 50 },
        delay: { time: '8n', feedback: 30, mix: 50 },
        distortion: { drive: 40, mix: 50 },
        chorus: { rate: 1.5, depth: 70, mix: 50 }
    },
    selectedChordKey: 'C',
    selectedScale: 'major',
    selectedVoicing: 'triad',
    selectedChordStyle: 'block',
    chordRecordingUrl: null
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
let pianoLoop = null;
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
    // Capture the step BEFORE advancing so audio + visuals use the same value.
    loop = new Tone.Loop((time) => {
        const step = AppState.currentStep;
        playStep(time, step);
        AppState.currentStep = (AppState.currentStep + 1) % AppState.gridSteps;
    }, "8n");

    // Create the piano-only solo loop
    pianoLoop = new Tone.Loop((time) => {
        const step = AppState.currentPianoStep;
        playPianoStep(time, step);
        AppState.currentPianoStep = (AppState.currentPianoStep + 1) % AppState.gridSteps;
    }, "8n");

    Tone.Transport.bpm.value = AppState.bpm;
    AppState.audioContextStarted = true;
}

function playStep(time, step) {
    // Play each active cell
    if (AppState.grid[0][step]) synths.kick.triggerAttackRelease("C1", "8n", time);
    if (AppState.grid[1][step]) synths.snare.triggerAttackRelease("8n", time);
    if (AppState.grid[2][step]) synths.hihat.triggerAttackRelease("32n", time);
    if (AppState.grid[3][step]) synths.clap.triggerAttackRelease("8n", time);
    if (AppState.grid[4][step]) synths.bass.triggerAttackRelease("C2", "8n", time);
    if (AppState.grid[5][step]) synths.synth.triggerAttackRelease(["C4", "E4", "G4"], "8n", time);
    if (AppState.grid[6][step]) synths.fx.triggerAttackRelease("C5", "8n", time);

    // Play active piano notes starting at this step
    if (AppState.pianoNotes) {
        AppState.pianoNotes.forEach(note => {
            if (note.step === step) {
                if (pianoSynth && pianoNotes[note.row]) {
                    const durationSeconds = Tone.Time("8n").toSeconds() * note.duration;
                    pianoSynth.triggerAttackRelease(pianoNotes[note.row].note, durationSeconds, time);
                }
            }
        });
    }

    // Visual feedback — scheduled on the same `time` so highlight is frame-accurate
    Tone.Draw.schedule(() => {
        highlightPlayingStep(step);
        updatePianoProgressBar(step);
    }, time);
}

function highlightPlayingStep(step) {
    document.querySelectorAll('.step-indicator').forEach((el, i) => {
        el.classList.toggle('active', i === step);
    });

    document.querySelectorAll('.grid-cell').forEach((cell, i) => {
        const cellStep = i % AppState.gridSteps;
        cell.classList.toggle('playing', cellStep === step);
    });

    // Highlight piano roll columns and note blocks
    document.querySelectorAll('.piano-roll-cell').forEach((cell) => {
        const cellStep = parseInt(cell.dataset.step);
        cell.classList.toggle('playing', cellStep === step);
    });

    document.querySelectorAll('.piano-note-block').forEach((noteEl) => {
        const noteStep = parseInt(noteEl.dataset.step);
        const noteDuration = parseInt(noteEl.dataset.duration);
        const isPlaying = step >= noteStep && step < noteStep + noteDuration;
        noteEl.classList.toggle('playing', isPlaying);
    });
}

function updatePianoProgressBar(step) {
    // Progress bar now updates smoothly via animateProgressBar()
    // This function is kept for compatibility but doesn't do discrete updates
}

async function togglePlayback() {
    if (!AppState.audioContextStarted) {
        await Tone.start();
        initAudio();
    }

    AppState.isPlaying = !AppState.isPlaying;

    if (AppState.isPlaying) {
        // If piano solo is playing, stop it
        if (AppState.isPianoPlaying) {
            stopPianoPlayback();
        }

        // Stop any previews that might be playing
        stopChordPreview();

        Tone.Transport.stop();
        Tone.Transport.seconds = 0;
        Tone.Transport.start();
        loop.start(0);
        document.getElementById('play-btn').innerHTML = '<i class="fas fa-pause"></i>';
        document.getElementById('play-btn').classList.add('playing');
        // Play voice recording if available
        playVoiceRecording();
        // Start parts if exist
        if (chordPart) {
            chordPart.start(0);
        }
        // Start smooth progress bar animation
        startProgressBarAnimation();
    } else {
        // Stop ALL audio sources
        Tone.Transport.stop();
        Tone.Transport.seconds = 0;
        loop.stop();
        // Stop parts if exist
        if (chordPart) {
            chordPart.stop();
        }
        // Stop voice recording FIRST (most audible issue)
        stopVoiceRecording();
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
    }
}

function resetPianoProgressBar() {
    const progressBar = document.getElementById('piano-progress-bar-inline');
    if (progressBar) {
        progressBar.style.width = '0%';
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

    // Extend/shrink piano roll notes
    if (AppState.pianoNotes) {
        AppState.pianoNotes = AppState.pianoNotes.filter(note => note.step < newStepCount);
        AppState.pianoNotes.forEach(note => {
            if (note.step + note.duration > newStepCount) {
                note.duration = newStepCount - note.step;
            }
        });
        savePianoState();
    }

    // Update grid steps
    AppState.gridSteps = newStepCount;

    // Regenerate UI
    generateGrid();
    regenerateStepIndicators();
    generatePianoRollGrid();



    if (newStepCount !== oldStepCount) {
        showToast(`Grid ${newStepCount > oldStepCount ? 'extended' : 'shortened'} to ${newStepCount} steps`, 'info');
    }
}

function regenerateStepIndicators() {
    const container = document.querySelector('.step-indicators');
    if (!container) return;

    container.innerHTML = '';
    container.style.gridTemplateColumns = `60px repeat(${AppState.gridSteps}, minmax(34px, 1fr))`;

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
    if (!AppState.audioContextStarted || !synths.kick) return;
    try {
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
    } catch (e) {
        console.warn('Preview sound error:', e);
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
    const patternLength = pattern[0].length; // base pattern is 8 steps

    // Apply pattern to grid, repeating for longer grids
    for (let track = 0; track < 8; track++) {
        for (let step = 0; step < AppState.gridSteps; step++) {
            AppState.grid[track][step] = pattern[track][step % patternLength] === 1;
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

            // Clear piano roll grid
            AppState.pianoNotes = [];
            savePianoState();

            // Update UI to reflect cleared grid
            document.querySelectorAll('.grid-cell').forEach(cell => {
                cell.classList.remove('active');
            });

            // Update piano roll UI to reflect cleared grid
            renderNotes();

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
// (Space bar for play/pause is handled in the unified keydown listener below)

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
            <button class="btn-play-clip" onclick="playVoiceClip(event, '${url}', '${clipId}')">
                <i class="fas fa-play"></i> Play
            </button>
            <button class="btn-add-to-beat" onclick="addVoiceToBeat('${url}', '${clipId}', '${timestamp}')">
                <i class="fas fa-plus"></i> Add to Beat
            </button>
        </div>
        <audio id="${clipId}" src="${url}" style="display: none;"></audio>
    `;

    document.getElementById('recorded-clips').prepend(clipContainer);
}

function playVoiceClip(e, url, clipId) {
    const audio = document.getElementById(clipId);
    if (!audio) return;
    const allAudios = document.querySelectorAll('.recorded-clip audio');

    // Stop all other playing clips and reset their buttons
    allAudios.forEach(a => {
        if (a.id !== clipId) {
            a.pause();
            a.currentTime = 0;
        }
    });
    document.querySelectorAll('.btn-play-clip').forEach(b => {
        b.innerHTML = '<i class="fas fa-play"></i> Play';
    });

    const btn = e.target.closest('.btn-play-clip');

    // Toggle play/pause for this clip
    if (audio.paused) {
        audio.play().catch(err => console.warn('Clip play failed:', err));
        if (btn) btn.innerHTML = '<i class="fas fa-pause"></i> Pause';

        // Reset button when audio ends
        audio.onended = () => {
            if (btn) btn.innerHTML = '<i class="fas fa-play"></i> Play';
        };
    } else {
        audio.pause();
        audio.currentTime = 0;
        if (btn) btn.innerHTML = '<i class="fas fa-play"></i> Play';
    }
}


let arrangeVoiceBuffers = {};

function addVoiceToBeat(url, clipId, clipName) {
    AppState.voiceRecordingUrl = url;

    // Remove existing voice track if any
    const existingVoiceTrack = document.getElementById('voice-track-bar');
    if (existingVoiceTrack) {
        existingVoiceTrack.remove();
    }

    // Create new voice track as a full-width bar (for Create tab)
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
    if (sequencerContainer) {
        sequencerContainer.parentNode.insertBefore(voiceTrackBar, sequencerContainer.nextSibling);
    }

    // Add to Arrange palette if not exists
    const palette = document.getElementById('arrange-palette-btns');
    if (palette && !document.getElementById('palette-voice-' + clipId)) {
        const btn = document.createElement('button');
        btn.className = 'palette-btn palette-voice';
        btn.id = 'palette-voice-' + clipId;
        btn.dataset.pattern = 'VOICE_' + clipId;
        btn.innerHTML = `<i class="fas fa-microphone"></i> Voice ${clipName || ''}`;
        
        btn.addEventListener('click', () => {
            ArrangementState.eraseMode = false;
            ArrangementState.paintModePattern = btn.dataset.pattern;
            document.querySelectorAll('.palette-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
        
        // Insert before divider if possible, otherwise append
        palette.appendChild(btn);
    }

    // Load Tone.Buffer for precise arrangement playback
    if (typeof Tone !== 'undefined') {
        arrangeVoiceBuffers[clipId] = new Tone.Buffer(url, () => {
            showToast('Voice loaded and synced for Arrange tab!', 'success');
            if (typeof renderArrangementClips === 'function') {
                renderArrangementClips();
            }
        });
    } else {
        showToast('Voice added to your beat!', 'success');
    }
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
    { note: 'C5', type: 'white', label: 'C5' },
    { note: 'B4', type: 'white', label: 'B4' },
    { note: 'A#4', type: 'black', label: 'A#4' },
    { note: 'A4', type: 'white', label: 'A4' },
    { note: 'G#4', type: 'black', label: 'G#4' },
    { note: 'G4', type: 'white', label: 'G4' },
    { note: 'F#4', type: 'black', label: 'F#4' },
    { note: 'F4', type: 'white', label: 'F4' },
    { note: 'E4', type: 'white', label: 'E4' },
    { note: 'D#4', type: 'black', label: 'D#4' },
    { note: 'D4', type: 'white', label: 'D4' },
    { note: 'C#4', type: 'black', label: 'C#4' },
    { note: 'C4', type: 'white', label: 'C4' }
];

function loadPianoState() {
    const savedNotes = localStorage.getItem('loopflow_piano_notes');
    if (savedNotes) {
        AppState.pianoNotes = JSON.parse(savedNotes);
    } else {
        AppState.pianoNotes = [];
    }

    const savedZoomWidth = localStorage.getItem('loopflow_piano_zoom_width');
    if (savedZoomWidth) {
        AppState.pianoZoomWidth = parseInt(savedZoomWidth);
    }
    const savedZoomHeight = localStorage.getItem('loopflow_piano_zoom_height');
    if (savedZoomHeight) {
        AppState.pianoZoomHeight = parseInt(savedZoomHeight);
    }
    // Removed loading of savedDefaultDuration to force it to default to 1
}

function savePianoState() {
    localStorage.setItem('loopflow_piano_notes', JSON.stringify(AppState.pianoNotes));
    localStorage.setItem('loopflow_piano_zoom_width', AppState.pianoZoomWidth);
    localStorage.setItem('loopflow_piano_zoom_height', AppState.pianoZoomHeight);
    localStorage.setItem('loopflow_piano_default_duration', AppState.pianoDefaultDuration);
}

function applyPianoZoom() {
    const container = document.querySelector('.piano-roll-container');
    if (!container) return;
    container.style.setProperty('--piano-cell-width', `${AppState.pianoZoomWidth}px`);
    container.style.setProperty('--piano-row-height', `${AppState.pianoZoomHeight}px`);
    
    // Update inputs
    const widthSlider = document.getElementById('slider-zoom-width');
    if (widthSlider) widthSlider.value = AppState.pianoZoomWidth;
    const heightSlider = document.getElementById('slider-zoom-height');
    if (heightSlider) heightSlider.value = AppState.pianoZoomHeight;
}

function initPiano() {
    loadPianoState();
    applyPianoZoom();

    const sidebar = document.getElementById('piano-roll-sidebar');
    const instrumentSelect = document.getElementById('instrument-select');
    const clearBtn = document.getElementById('piano-clear-btn');

    if (sidebar) {
        sidebar.innerHTML = '';
        // Generate vertical keys
        pianoNotes.forEach((keyData) => {
            const key = document.createElement('div');
            key.className = `piano-roll-key ${keyData.type}`;
            key.dataset.note = keyData.note;
            key.innerHTML = `<span>${keyData.label}</span>`;

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

            sidebar.appendChild(key);
        });
    }

    // Zoom and default options
    const widthSlider = document.getElementById('slider-zoom-width');
    const widthInBtn = document.getElementById('btn-zoom-width-in');
    const widthOutBtn = document.getElementById('btn-zoom-width-out');

    if (widthSlider) {
        widthSlider.addEventListener('input', (e) => {
            AppState.pianoZoomWidth = parseInt(e.target.value);
            applyPianoZoom();
            savePianoState();
        });
    }
    if (widthInBtn) {
        widthInBtn.addEventListener('click', () => {
            AppState.pianoZoomWidth = Math.min(150, AppState.pianoZoomWidth + 10);
            applyPianoZoom();
            savePianoState();
        });
    }
    if (widthOutBtn) {
        widthOutBtn.addEventListener('click', () => {
            AppState.pianoZoomWidth = Math.max(30, AppState.pianoZoomWidth - 10);
            applyPianoZoom();
            savePianoState();
        });
    }

    const heightSlider = document.getElementById('slider-zoom-height');
    const heightInBtn = document.getElementById('btn-zoom-height-in');
    const heightOutBtn = document.getElementById('btn-zoom-height-out');

    if (heightSlider) {
        heightSlider.addEventListener('input', (e) => {
            AppState.pianoZoomHeight = parseInt(e.target.value);
            applyPianoZoom();
            savePianoState();
        });
    }
    if (heightInBtn) {
        heightInBtn.addEventListener('click', () => {
            AppState.pianoZoomHeight = Math.min(60, AppState.pianoZoomHeight + 4);
            applyPianoZoom();
            savePianoState();
        });
    }
    if (heightOutBtn) {
        heightOutBtn.addEventListener('click', () => {
            AppState.pianoZoomHeight = Math.max(16, AppState.pianoZoomHeight - 4);
            applyPianoZoom();
            savePianoState();
        });
    }

    const durationSelect = document.getElementById('piano-default-duration-select');
    if (durationSelect) {
        durationSelect.value = AppState.pianoDefaultDuration;
        durationSelect.addEventListener('change', (e) => {
            AppState.pianoDefaultDuration = parseInt(e.target.value);
            savePianoState();
        });
    }

    const resetViewBtn = document.getElementById('btn-zoom-reset');
    if (resetViewBtn) {
        resetViewBtn.addEventListener('click', () => {
            AppState.pianoZoomWidth = 60;
            AppState.pianoZoomHeight = 28;
            applyPianoZoom();
            savePianoState();
        });
    }

    // Scroll synchronization
    const gridWrapper = document.querySelector('.piano-roll-grid-wrapper');
    if (gridWrapper && sidebar) {
        gridWrapper.addEventListener('scroll', () => {
            sidebar.scrollTop = gridWrapper.scrollTop;
        });
        sidebar.addEventListener('wheel', (e) => {
            gridWrapper.scrollTop += e.deltaY;
            e.preventDefault();
        }, { passive: false });

        // Clicking empty space deselects notes
        gridWrapper.addEventListener('click', (e) => {
            if (e.target === gridWrapper || e.target === document.getElementById('piano-roll-grid')) {
                deselectNotes();
            }
        });
    }

    // Instrument selector
    if (instrumentSelect) {
        instrumentSelect.addEventListener('change', (e) => {
            changeInstrument(e.target.value);
        });
    }

    // Initialize default instrument
    changeInstrument('piano');

    // Clear grid button
    if (clearBtn) {
        clearBtn.addEventListener('click', clearPianoGrid);
    }

    // Play solo button
    const playBtn = document.getElementById('piano-play-btn');
    if (playBtn) {
        playBtn.addEventListener('click', togglePianoPlayback);
    }

    // Generate grid cells
    generatePianoRollGrid();
}

function generatePianoRollGrid() {
    const grid = document.getElementById('piano-roll-grid');
    if (!grid) return;

    grid.innerHTML = '';
    grid.style.setProperty('--grid-steps', AppState.gridSteps);

    for (let row = 0; row < 13; row++) {
        const keyData = pianoNotes[row];
        for (let step = 0; step < AppState.gridSteps; step++) {
            const cell = document.createElement('div');
            cell.className = `piano-roll-cell ${keyData.type}-row`;
            cell.dataset.row = row;
            cell.dataset.step = step;
            cell.style.gridRow = row + 1;
            cell.style.gridColumn = step + 1;

            // Click listener — only create note if the click is directly on the cell,
            // not on a note block that overlays it.
            cell.addEventListener('click', (e) => {
                if (e.target.closest('.piano-note-block')) return;
                createNoteAt(row, step);
            });
            cell.addEventListener('touchstart', (e) => {
                if (e.target.closest('.piano-note-block')) return;
                e.preventDefault();
                createNoteAt(row, step);
            });

            grid.appendChild(cell);
        }
    }

    // Apply scale locking visual states if enabled
    applyScaleLock();

    // Render active note blocks
    renderNotes();
}

function getClosestScaleRow(targetRow) {
    if (!scaleLockEnabled) return targetRow;
    const scaleNotes = getScaleNotes(AppState.selectedChordKey, AppState.selectedScale);
    
    let bestRow = targetRow;
    let minDistance = Infinity;
    
    for (let row = 0; row < 13; row++) {
        const noteName = pianoNotes[row].note.replace(/\d+/, '');
        if (scaleNotes.includes(noteName)) {
            const distance = Math.abs(row - targetRow);
            if (distance < minDistance) {
                minDistance = distance;
                bestRow = row;
            }
        }
    }
    return bestRow;
}

function createNoteAt(row, step) {
    // Start audio context if needed
    if (!AppState.audioContextStarted) {
        Tone.start();
        initAudio();
    }

    // Check if row is disabled under scale lock
    if (scaleLockEnabled) {
        const scaleNotes = getScaleNotes(AppState.selectedChordKey, AppState.selectedScale);
        const noteName = pianoNotes[row].note.replace(/\d+/, '');
        if (!scaleNotes.includes(noteName)) {
            // Snap to closest valid scale key
            row = getClosestScaleRow(row);
        }
    }

    const defaultDur = AppState.pianoDefaultDuration || 4;
    const duration = Math.min(defaultDur, AppState.gridSteps - step);
    if (duration <= 0) return;

    // Check if any existing note in the same row overlaps the proposed range
    const overlaps = AppState.pianoNotes.some(n =>
        n.row === row && n.step < step + duration && n.step + n.duration > step
    );
    if (overlaps) return;

    const newNote = {
        id: Date.now() + Math.random(),
        row: row,
        step: step,
        duration: duration
    };

    AppState.pianoNotes.push(newNote);
    AppState.selectedNoteId = newNote.id;

    // Play preview sound
    if (pianoSynth && pianoNotes[row]) {
        pianoSynth.triggerAttackRelease(pianoNotes[row].note, '8n');
    }

    // Haptic feedback
    if (navigator.vibrate) {
        navigator.vibrate(15);
    }

    savePianoState();
    renderNotes();
}

function deleteNote(id) {
    AppState.pianoNotes = AppState.pianoNotes.filter(n => n.id !== id);
    if (AppState.selectedNoteId === id) {
        AppState.selectedNoteId = null;
    }
    savePianoState();
    renderNotes();
    
    if (navigator.vibrate) {
        navigator.vibrate(10);
    }
}

function selectNote(id) {
    AppState.selectedNoteId = id;
    document.querySelectorAll('.piano-note-block').forEach(el => {
        const isSelected = parseFloat(el.dataset.id) === id;
        el.classList.toggle('selected', isSelected);
    });
}

function deselectNotes() {
    AppState.selectedNoteId = null;
    document.querySelectorAll('.piano-note-block').forEach(el => {
        el.classList.remove('selected');
    });
}

function renderNotes() {
    // Remove existing note elements
    document.querySelectorAll('.piano-note-block').forEach(el => el.remove());

    const grid = document.getElementById('piano-roll-grid');
    if (!grid) return;

    AppState.pianoNotes.forEach(note => {
        const noteEl = document.createElement('div');
        noteEl.className = 'piano-note-block';
        
        const keyData = pianoNotes[note.row];
        if (keyData && keyData.type === 'black') {
            noteEl.classList.add('black-key-note');
        }

        noteEl.dataset.id = note.id;
        noteEl.dataset.row = note.row;
        noteEl.dataset.step = note.step;
        noteEl.dataset.duration = note.duration;

        noteEl.style.setProperty('--note-row', note.row + 1);
        noteEl.style.setProperty('--note-col', `${note.step + 1} / span ${note.duration}`);

        if (note.id === AppState.selectedNoteId) {
            noteEl.classList.add('selected');
        }

        // Left handle
        const leftHandle = document.createElement('div');
        leftHandle.className = 'note-resize-handle left-handle';
        noteEl.appendChild(leftHandle);

        // Content
        const content = document.createElement('div');
        content.className = 'note-content';
        content.textContent = keyData ? keyData.label : '';
        noteEl.appendChild(content);

        // Delete button
        const deleteBtn = document.createElement('div');
        deleteBtn.className = 'note-delete-btn';
        deleteBtn.innerHTML = '&times;';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteNote(note.id);
        });
        noteEl.appendChild(deleteBtn);

        // Right handle
        const rightHandle = document.createElement('div');
        rightHandle.className = 'note-resize-handle right-handle';
        noteEl.appendChild(rightHandle);

        // Double click to delete
        noteEl.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            deleteNote(note.id);
        });

        // Event listeners for dragging
        noteEl.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('note-delete-btn')) return;
            startNoteDrag(e, note.id);
        });
        noteEl.addEventListener('touchstart', (e) => {
            if (e.target.classList.contains('note-delete-btn')) return;
            startNoteDrag(e, note.id);
        }, { passive: false });

        grid.appendChild(noteEl);
    });
}

function startNoteDrag(e, id) {
    if (e.cancelable) e.preventDefault();
    selectNote(id);

    const isLeft = e.target.classList.contains('left-handle');
    const isRight = e.target.classList.contains('right-handle');
    const isMove = !isLeft && !isRight;

    const startEvent = e.touches ? e.touches[0] : e;
    const clientX = startEvent.clientX;
    const clientY = startEvent.clientY;

    const note = AppState.pianoNotes.find(n => n.id === id);
    if (!note) return;

    const initRow = note.row;
    const initStep = note.step;
    const initDuration = note.duration;

    const grid = document.getElementById('piano-roll-grid');
    if (!grid) return;
    
    let gridRect = grid.getBoundingClientRect();
    let stepWidth = gridRect.width / AppState.gridSteps;
    let rowHeight = gridRect.height / 13;

    const initRelativeX = clientX - gridRect.left;
    const initRelativeY = clientY - gridRect.top;
    const initGridStep = Math.floor(initRelativeX / stepWidth);
    const initGridRow = Math.floor(initRelativeY / rowHeight);

    let hasMoved = false;

    // Helper: checks if placing note at (row, step, duration) would overlap any other note
    function wouldOverlap(row, step, duration) {
        return AppState.pianoNotes.some(n =>
            n.id !== id && n.row === row && n.step < step + duration && n.step + n.duration > step
        );
    }

    // Add dragging class for visual feedback
    const noteEl = document.querySelector(`.piano-note-block[data-id="${id}"]`);
    if (noteEl) noteEl.classList.add('dragging');

    function handleMove(moveEv) {
        if (moveEv.cancelable) moveEv.preventDefault();
        hasMoved = true;

        const currentEvent = moveEv.touches ? moveEv.touches[0] : moveEv;
        const curX = currentEvent.clientX;
        const curY = currentEvent.clientY;

        gridRect = grid.getBoundingClientRect();
        stepWidth = gridRect.width / AppState.gridSteps;
        rowHeight = gridRect.height / 13;

        const curRelativeX = curX - gridRect.left;
        const curRelativeY = curY - gridRect.top;
        const curGridStep = Math.floor(curRelativeX / stepWidth);
        const curGridRow = Math.floor(curRelativeY / rowHeight);

        const deltaStep = curGridStep - initGridStep;
        const deltaRow = curGridRow - initGridRow;

        if (isMove) {
            let newRow = initRow + deltaRow;
            let newStep = initStep + deltaStep;
            newRow = Math.max(0, Math.min(12, newRow));
            newStep = Math.max(0, Math.min(AppState.gridSteps - initDuration, newStep));
            newRow = getClosestScaleRow(newRow);

            // Only apply if no overlap at new position
            if (!wouldOverlap(newRow, newStep, initDuration)) {
                note.row = newRow;
                note.step = newStep;
            }
        } else if (isRight) {
            let newDuration = initDuration + deltaStep;
            newDuration = Math.max(1, Math.min(AppState.gridSteps - note.step, newDuration));
            // Only apply if no overlap
            if (!wouldOverlap(note.row, note.step, newDuration)) {
                note.duration = newDuration;
            }
        } else if (isLeft) {
            let newStep = initStep + deltaStep;
            newStep = Math.max(0, Math.min(initStep + initDuration - 1, newStep));
            let newDuration = initStep + initDuration - newStep;
            // Only apply if no overlap
            if (!wouldOverlap(note.row, newStep, newDuration)) {
                note.step = newStep;
                note.duration = newDuration;
            }
        }

        // Live DOM style update (prevent laggy redraws)
        const noteEl = document.querySelector(`.piano-note-block[data-id="${id}"]`);
        if (noteEl) {
            noteEl.style.setProperty('--note-row', note.row + 1);
            noteEl.style.setProperty('--note-col', `${note.step + 1} / span ${note.duration}`);
            noteEl.dataset.row = note.row;
            noteEl.dataset.step = note.step;
            noteEl.dataset.duration = note.duration;
            const contentEl = noteEl.querySelector('.note-content');
            if (contentEl && pianoNotes[note.row]) {
                contentEl.textContent = pianoNotes[note.row].label;
            }
        }
    }

    function handleEnd() {
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleEnd);
        window.removeEventListener('touchmove', handleMove);
        window.removeEventListener('touchend', handleEnd);

        if (hasMoved) {
            if (isMove && note.row !== initRow) {
                if (pianoSynth && pianoNotes[note.row]) {
                    pianoSynth.triggerAttackRelease(pianoNotes[note.row].note, '8n');
                }
            }
            savePianoState();
        }
        renderNotes();
    }

    window.addEventListener('mousemove', handleMove, { passive: false });
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
}

function clearPianoGrid() {
    showConfirm('Clear the entire piano roll grid?')
        .then((confirmed) => {
            if (!confirmed) return;

            AppState.pianoNotes = [];
            savePianoState();
            renderNotes();

            if (navigator.vibrate) {
                navigator.vibrate([20, 20]);
            }
            showToast('Piano roll cleared!', 'success');
        });
}

function togglePianoPlayback() {
    if (!AppState.audioContextStarted) {
        Tone.start();
        initAudio();
    }

    AppState.isPianoPlaying = !AppState.isPianoPlaying;

    if (AppState.isPianoPlaying) {
        if (AppState.isPlaying) {
            togglePlayback();
        }

        stopChordPreview();

        Tone.Transport.stop();
        Tone.Transport.seconds = 0;
        Tone.Transport.start();
        pianoLoop.start(0);

        const playBtn = document.getElementById('piano-play-btn');
        if (playBtn) {
            playBtn.innerHTML = '<i class="fas fa-pause"></i>';
            playBtn.classList.add('playing');
        }
        
        showToast('Playing piano roll solo', 'success');
    } else {
        stopPianoPlayback();
    }
}

function stopPianoPlayback() {
    if (pianoLoop) {
        pianoLoop.stop();
    }
    AppState.isPianoPlaying = false;
    AppState.currentPianoStep = 0;

    const playBtn = document.getElementById('piano-play-btn');
    if (playBtn) {
        playBtn.innerHTML = '<i class="fas fa-play"></i>';
        playBtn.classList.remove('playing');
    }

    document.querySelectorAll('.piano-roll-cell').forEach((cell) => {
        cell.classList.remove('playing');
    });
    document.querySelectorAll('.piano-note-block').forEach((noteEl) => {
        noteEl.classList.remove('playing');
    });
}

function playPianoStep(time, step) {
    // Play active piano notes starting at this step
    if (AppState.pianoNotes) {
        AppState.pianoNotes.forEach(note => {
            if (note.step === step) {
                if (pianoSynth && pianoNotes[note.row]) {
                    const durationSeconds = Tone.Time("8n").toSeconds() * note.duration;
                    pianoSynth.triggerAttackRelease(pianoNotes[note.row].note, durationSeconds, time);
                }
            }
        });
    }

    // Visual feedback — highlight both cells and note blocks in sync with audio
    Tone.Draw.schedule(() => {
        highlightPianoPlayingStep(step);
    }, time);
}

function highlightPianoPlayingStep(step) {
    // Highlight the playing column in the grid
    document.querySelectorAll('.piano-roll-cell').forEach((cell) => {
        const cellStep = parseInt(cell.dataset.step);
        cell.classList.toggle('playing', cellStep === step);
    });

    // Highlight note blocks that span this step
    document.querySelectorAll('.piano-note-block').forEach((noteEl) => {
        const noteStep = parseInt(noteEl.dataset.step);
        const noteDuration = parseInt(noteEl.dataset.duration);
        const isPlaying = step >= noteStep && step < noteStep + noteDuration;
        noteEl.classList.toggle('playing', isPlaying);
    });
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

    // Visual feedback
    const key = document.querySelector(`.piano-roll-key[data-note="${note}"]`);
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

    // Remove visual feedback
    const key = document.querySelector(`.piano-roll-key[data-note="${note}"]`);
    if (key) {
        key.classList.remove('active');
    }
}

function startProgressBarAnimation() {
    const pBar = document.getElementById('piano-progress-bar-inline');
    const cBar = document.getElementById('chord-progress-bar-inline');
    if (!pBar && !cBar) return;

    const stepDuration = (60 / AppState.bpm); // Duration of one step in seconds
    const loopDuration = stepDuration * AppState.gridSteps; // Total loop duration in seconds

    function animate() {
        if (!AppState.isPlaying) return;

        // Get current position in Transport timeline
        const currentTime = Tone.Transport.seconds;

        // Calculate progress within the loop
        const timeInLoop = currentTime % loopDuration;
        const progress = (timeInLoop / loopDuration) * 100;

        // Update progress bars
        if (pBar) pBar.style.width = `${progress}%`;
        if (cBar) cBar.style.width = `${progress}%`;

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

    // Reset inline progress bars
    const pBar = document.getElementById('piano-progress-bar-inline');
    const cBar = document.getElementById('chord-progress-bar-inline');
    if (pBar) pBar.style.width = '0%';
    if (cBar) cBar.style.width = '0%';
}

// ============================================
// PLAYBACK INTEGRATION
// ============================================
let voiceAnimationFrame = null;

function playVoiceRecording() {
    if (!AppState.voiceRecordingUrl) return;

    // Always stop existing first
    stopVoiceRecording();

    // Use native Audio which handles webm blobs reliably
    const player = new Audio(AppState.voiceRecordingUrl);
    player.loop = true;
    synths.voicePlayer = player;

    player.play().then(() => {
        startVoiceProgressAnimation();
    }).catch(err => {
        console.error('Voice playback failed:', err);
        synths.voicePlayer = null;
    });
}

function startVoiceProgressAnimation() {
    // Cancel any existing animation loop
    if (voiceAnimationFrame) {
        cancelAnimationFrame(voiceAnimationFrame);
        voiceAnimationFrame = null;
    }

    const progressBar = document.getElementById('voice-progress-bar');
    if (!progressBar) return;

    function updateProgress() {
        const player = synths.voicePlayer;
        if (!AppState.isPlaying || !player) {
            progressBar.style.width = '0%';
            voiceAnimationFrame = null;
            return;
        }

        const duration = player.duration;
        if (isFinite(duration) && duration > 0) {
            const progress = (player.currentTime / duration) * 100;
            progressBar.style.width = `${progress}%`;
        }

        voiceAnimationFrame = requestAnimationFrame(updateProgress);
    }

    voiceAnimationFrame = requestAnimationFrame(updateProgress);
}

function stopVoiceRecording() {
    // Cancel animation
    if (voiceAnimationFrame) {
        cancelAnimationFrame(voiceAnimationFrame);
        voiceAnimationFrame = null;
    }

    // Stop and destroy the audio element
    if (synths.voicePlayer) {
        try {
            synths.voicePlayer.pause();
            synths.voicePlayer.currentTime = 0;
            synths.voicePlayer.src = ''; // Force release
            synths.voicePlayer.load();   // Abort any pending loads
        } catch (e) { /* ignore */ }
        synths.voicePlayer = null;
    }

    // Reset progress bar
    const progressBar = document.getElementById('voice-progress-bar');
    if (progressBar) {
        progressBar.style.width = '0%';
    }
}



// Keyboard support for piano
const keyboardMap = {
    'a': 'C4', 'w': 'C#4', 's': 'D4', 'e': 'D#4', 'd': 'E4',
    'f': 'F4', 't': 'F#4', 'g': 'G4', 'y': 'G#4', 'h': 'A4',
    'u': 'A#4', 'j': 'B4', 'k': 'C5'
};

const activeKeyboardNotes = new Set();

document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

    // Space bar for play/pause
    if (e.code === 'Space') {
        e.preventDefault();
        togglePlayback();
        return;
    }

    // Piano keyboard (prevent key repeat)
    const note = keyboardMap[e.key.toLowerCase()];
    if (note && !activeKeyboardNotes.has(note)) {
        activeKeyboardNotes.add(note);
        playPianoNote(note);
    }
});

document.addEventListener('keyup', (e) => {
    const note = keyboardMap[e.key.toLowerCase()];
    if (note) {
        activeKeyboardNotes.delete(note);
        stopPianoNote(note);
    }
});

// ============================================
// MIXER — Volume / Mute / Solo per track
// ============================================
const trackNames = ['KICK', 'SNARE', 'HAT', 'CLAP', 'BASS', 'SYNTH', 'FX', 'VOC'];
const trackMuted = Array(8).fill(false);
const trackSoloed = Array(8).fill(false);
const trackVolumes = [0, -5, -10, -5, -8, -10, -8, -20]; // default dB

function initMixer() {
    const container = document.getElementById('mixer-tracks');
    if (!container) return;
    container.innerHTML = '';

    trackNames.forEach((name, i) => {
        const track = document.createElement('div');
        track.className = 'mixer-track';
        track.innerHTML = `
            <span class="mixer-track-name">${name}</span>
            <input type="range" class="mixer-vol-slider" data-track="${i}" min="-30" max="6" value="${trackVolumes[i]}">
            <div class="mixer-btn-row">
                <button class="btn-mute" data-track="${i}" title="Mute">M</button>
                <button class="btn-solo" data-track="${i}" title="Solo">S</button>
            </div>
        `;
        container.appendChild(track);
    });

    // Volume sliders
    container.querySelectorAll('.mixer-vol-slider').forEach(slider => {
        slider.addEventListener('input', (e) => {
            const idx = parseInt(e.target.dataset.track);
            trackVolumes[idx] = parseInt(e.target.value);
            applyTrackVolume(idx);
        });
    });

    // Mute buttons
    container.querySelectorAll('.btn-mute').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.currentTarget.dataset.track);
            trackMuted[idx] = !trackMuted[idx];
            e.currentTarget.classList.toggle('active', trackMuted[idx]);
            applyTrackVolume(idx);
        });
    });

    // Solo buttons
    container.querySelectorAll('.btn-solo').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.currentTarget.dataset.track);
            trackSoloed[idx] = !trackSoloed[idx];
            e.currentTarget.classList.toggle('active', trackSoloed[idx]);
            applyAllTrackVolumes();
        });
    });

    // Toggle collapse
    document.getElementById('mixer-toggle').addEventListener('click', () => {
        const tracks = document.getElementById('mixer-tracks');
        const btn = document.getElementById('mixer-toggle');
        tracks.classList.toggle('collapsed');
        btn.classList.toggle('collapsed');
    });
}

function getSynthForTrack(idx) {
    const synthKeys = ['kick', 'snare', 'hihat', 'clap', 'bass', 'synth', 'fx', 'vocal'];
    return synths[synthKeys[idx]];
}

function applyTrackVolume(idx) {
    const s = getSynthForTrack(idx);
    if (!s) return;
    const anySoloed = trackSoloed.some(v => v);
    if (trackMuted[idx] || (anySoloed && !trackSoloed[idx])) {
        s.volume.value = -Infinity;
    } else {
        s.volume.value = trackVolumes[idx];
    }
}

function applyAllTrackVolumes() {
    for (let i = 0; i < 8; i++) applyTrackVolume(i);
}

// ============================================
// EFFECTS RACK — Reverb, Delay, Distortion, Chorus
// ============================================
let fxNodes = {};

function initEffects() {
    // 1. Setup toggle listeners
    const fxTypes = ['reverb', 'delay', 'distortion', 'chorus'];
    fxTypes.forEach(fx => {
        const toggle = document.getElementById(`toggle-${fx}`);
        const card = document.getElementById(`fx-card-${fx}`);
        if (toggle && card) {
            toggle.addEventListener('change', (e) => {
                if (!AppState.audioContextStarted) {
                    Tone.start();
                    initAudio();
                }
                AppState.fxActive[fx] = e.target.checked;
                card.classList.toggle('active', AppState.fxActive[fx]);
                rebuildEffectsChain();
            });
        }
    });

    // 2. Reverb parameter listeners
    const reverbDecay = document.getElementById('reverb-decay');
    const reverbDecayVal = document.getElementById('reverb-decay-val');
    if (reverbDecay && reverbDecayVal) {
        reverbDecay.addEventListener('input', (e) => {
            reverbDecayVal.textContent = e.target.value + 's';
        });
        reverbDecay.addEventListener('change', (e) => {
            const val = parseFloat(e.target.value);
            AppState.fxSettings.reverb.decay = val;
            if (AppState.audioContextStarted && fxNodes.reverb) {
                fxNodes.reverb.decay = val;
            }
        });
    }

    const reverbMix = document.getElementById('reverb-mix');
    const reverbMixVal = document.getElementById('reverb-mix-val');
    if (reverbMix && reverbMixVal) {
        reverbMix.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            reverbMixVal.textContent = val + '%';
            AppState.fxSettings.reverb.mix = val;
            if (AppState.audioContextStarted && fxNodes.reverb) {
                fxNodes.reverb.wet.value = val / 100;
            }
        });
    }

    // 3. Delay parameter listeners
    const delayTime = document.getElementById('delay-time');
    const delayTimeVal = document.getElementById('delay-time-val');
    if (delayTime && delayTimeVal) {
        delayTime.addEventListener('change', (e) => {
            const val = e.target.value;
            delayTimeVal.textContent = val;
            AppState.fxSettings.delay.time = val;
            if (AppState.audioContextStarted && fxNodes.delay) {
                fxNodes.delay.delayTime.value = val;
            }
        });
    }

    const delayFeedback = document.getElementById('delay-feedback');
    const delayFeedbackVal = document.getElementById('delay-feedback-val');
    if (delayFeedback && delayFeedbackVal) {
        delayFeedback.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            delayFeedbackVal.textContent = val + '%';
            AppState.fxSettings.delay.feedback = val;
            if (AppState.audioContextStarted && fxNodes.delay) {
                fxNodes.delay.feedback.value = val / 100;
            }
        });
    }

    const delayMix = document.getElementById('delay-mix');
    const delayMixVal = document.getElementById('delay-mix-val');
    if (delayMix && delayMixVal) {
        delayMix.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            delayMixVal.textContent = val + '%';
            AppState.fxSettings.delay.mix = val;
            if (AppState.audioContextStarted && fxNodes.delay) {
                fxNodes.delay.wet.value = val / 100;
            }
        });
    }

    // 4. Distortion parameter listeners
    const distDrive = document.getElementById('distortion-drive');
    const distDriveVal = document.getElementById('distortion-drive-val');
    if (distDrive && distDriveVal) {
        distDrive.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            distDriveVal.textContent = val + '%';
            AppState.fxSettings.distortion.drive = val;
            if (AppState.audioContextStarted && fxNodes.distortion) {
                fxNodes.distortion.distortion = val / 100;
            }
        });
    }

    const distMix = document.getElementById('distortion-mix');
    const distMixVal = document.getElementById('distortion-mix-val');
    if (distMix && distMixVal) {
        distMix.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            distMixVal.textContent = val + '%';
            AppState.fxSettings.distortion.mix = val;
            if (AppState.audioContextStarted && fxNodes.distortion) {
                fxNodes.distortion.wet.value = val / 100;
            }
        });
    }

    // 5. Chorus parameter listeners
    const chorusRate = document.getElementById('chorus-rate');
    const chorusRateVal = document.getElementById('chorus-rate-val');
    if (chorusRate && chorusRateVal) {
        chorusRate.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            chorusRateVal.textContent = val + 'Hz';
            AppState.fxSettings.chorus.rate = val;
            if (AppState.audioContextStarted && fxNodes.chorus) {
                fxNodes.chorus.frequency.value = val;
            }
        });
    }

    const chorusDepth = document.getElementById('chorus-depth');
    const chorusDepthVal = document.getElementById('chorus-depth-val');
    if (chorusDepth && chorusDepthVal) {
        chorusDepth.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            chorusDepthVal.textContent = val + '%';
            AppState.fxSettings.chorus.depth = val / 100;
            if (AppState.audioContextStarted && fxNodes.chorus) {
                fxNodes.chorus.depth = val / 100;
            }
        });
    }

    const chorusMix = document.getElementById('chorus-mix');
    const chorusMixVal = document.getElementById('chorus-mix-val');
    if (chorusMix && chorusMixVal) {
        chorusMix.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            chorusMixVal.textContent = val + '%';
            AppState.fxSettings.chorus.mix = val;
            if (AppState.audioContextStarted && fxNodes.chorus) {
                fxNodes.chorus.wet.value = val / 100;
            }
        });
    }
}

function ensureFxNodes() {
    if (fxNodes.reverb) return; // already created

    fxNodes.reverb = new Tone.Reverb({
        decay: AppState.fxSettings.reverb.decay,
        wet: AppState.fxSettings.reverb.mix / 100
    }).toDestination();

    fxNodes.delay = new Tone.FeedbackDelay({
        delayTime: AppState.fxSettings.delay.time,
        feedback: AppState.fxSettings.delay.feedback / 100,
        wet: AppState.fxSettings.delay.mix / 100
    }).toDestination();

    fxNodes.distortion = new Tone.Distortion({
        distortion: AppState.fxSettings.distortion.drive / 100,
        wet: AppState.fxSettings.distortion.mix / 100
    }).toDestination();

    fxNodes.chorus = new Tone.Chorus({
        frequency: AppState.fxSettings.chorus.rate,
        delayTime: 3.5,
        depth: AppState.fxSettings.chorus.depth / 100,
        wet: AppState.fxSettings.chorus.mix / 100
    }).toDestination();
}

function rebuildEffectsChain() {
    if (!AppState.audioContextStarted) return;
    ensureFxNodes();

    const synthKeys = ['kick', 'snare', 'hihat', 'clap', 'bass', 'synth', 'fx', 'vocal'];
    synthKeys.forEach(key => {
        const s = synths[key];
        if (!s) return;
        s.disconnect();

        // Build chain of active effects
        const activeChain = Object.keys(AppState.fxActive).filter(k => AppState.fxActive[k]).map(k => fxNodes[k]);

        if (activeChain.length > 0) {
            s.chain(...activeChain);
        } else {
            s.toDestination();
        }
    });

    showToast('Effects updated', 'success');
}



// ============================================
// METRONOME
// ============================================
let metronomeEnabled = false;
let metronomeSynth = null;
let metronomeLoop = null;

function initMetronome() {
    const btn = document.getElementById('metronome-btn');
    if (!btn) return;

    btn.addEventListener('click', () => {
        metronomeEnabled = !metronomeEnabled;
        btn.classList.toggle('active', metronomeEnabled);

        if (metronomeEnabled && !metronomeSynth && AppState.audioContextStarted) {
            metronomeSynth = new Tone.MembraneSynth({
                pitchDecay: 0.01,
                octaves: 6,
                oscillator: { type: 'sine' },
                envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.1 }
            }).toDestination();
            metronomeSynth.volume.value = -12;
        }

        showToast(metronomeEnabled ? '🥁 Metronome ON' : 'Metronome OFF', 'success');
    });
}

// Called from playStep
function tickMetronome(time, step) {
    if (!metronomeEnabled || !metronomeSynth) return;
    // Accent on beat 1
    const note = step === 0 ? 'C3' : 'C4';
    metronomeSynth.triggerAttackRelease(note, '32n', time);
}

// ============================================
// PATTERN BANKS (A-H)
// ============================================
const patternBanks = {
    A: null, B: null, C: null, D: null, E: null, F: null, G: null, H: null
};
let currentPattern = 'A';

function initPatternBanks() {
    // Save initial grid and piano notes to bank A
    patternBanks.A = {
        grid: JSON.parse(JSON.stringify(AppState.grid)),
        pianoNotes: JSON.parse(JSON.stringify(AppState.pianoNotes || []))
    };

    document.querySelectorAll('.pattern-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.pattern;

            // Save current state to current bank
            patternBanks[currentPattern] = {
                grid: JSON.parse(JSON.stringify(AppState.grid)),
                pianoNotes: JSON.parse(JSON.stringify(AppState.pianoNotes || []))
            };

            // Switch to target bank
            currentPattern = target;

            // Load target bank (or create empty if null)
            if (patternBanks[target]) {
                const bank = patternBanks[target];
                for (let t = 0; t < 8; t++) {
                    while (bank.grid[t].length < AppState.gridSteps) bank.grid[t].push(false);
                    AppState.grid[t] = bank.grid[t].slice(0, AppState.gridSteps);
                }
                AppState.pianoNotes = bank.pianoNotes ? JSON.parse(JSON.stringify(bank.pianoNotes)) : [];
            } else {
                AppState.grid = Array(8).fill(null).map(() => Array(AppState.gridSteps).fill(false));
                AppState.pianoNotes = [];
                patternBanks[target] = {
                    grid: JSON.parse(JSON.stringify(AppState.grid)),
                    pianoNotes: []
                };
            }

            // Update UI
            document.querySelectorAll('.pattern-btn').forEach(b => {
                b.classList.toggle('active', b.dataset.pattern === target);
            });
            // Update arrange palette buttons if they exist
            document.querySelectorAll('.palette-btn').forEach(b => {
                b.classList.toggle('active', b.dataset.pattern === target);
            });

            // Refresh UI
            refreshGridUI();
            if (typeof renderNotes === 'function') renderNotes();

            showToast(`Pattern ${target}`, 'success');
        });
    });

    // Copy / Paste / Clear logic
    const copyBtn = document.getElementById('copy-pattern-btn');
    const pasteBtn = document.getElementById('paste-pattern-btn');
    const clearBtn = document.getElementById('clear-pattern-btn');

    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            AppState.clipboardPattern = {
                grid: JSON.parse(JSON.stringify(AppState.grid)),
                pianoNotes: JSON.parse(JSON.stringify(AppState.pianoNotes || []))
            };
            showToast('Pattern copied', 'success');
        });
    }

    if (pasteBtn) {
        pasteBtn.addEventListener('click', () => {
            if (AppState.clipboardPattern) {
                AppState.grid = JSON.parse(JSON.stringify(AppState.clipboardPattern.grid));
                AppState.pianoNotes = JSON.parse(JSON.stringify(AppState.clipboardPattern.pianoNotes));
                refreshGridUI();
                if (typeof renderNotes === 'function') renderNotes();
                showToast('Pattern pasted', 'success');
            } else {
                showToast('Clipboard is empty', 'info');
            }
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            for (let t = 0; t < 8; t++) AppState.grid[t].fill(false);
            AppState.pianoNotes = [];
            refreshGridUI();
            if (typeof renderNotes === 'function') renderNotes();
            showToast('Pattern cleared', 'success');
        });
    }
}

// ============================================
// UNDO / REDO
// ============================================
const undoStack = [];
const redoStack = [];
const MAX_UNDO = 30;

function pushUndoState() {
    undoStack.push(JSON.parse(JSON.stringify(AppState.grid)));
    if (undoStack.length > MAX_UNDO) undoStack.shift();
    redoStack.length = 0; // clear redo on new action
}

function undo() {
    if (undoStack.length === 0) return;
    redoStack.push(JSON.parse(JSON.stringify(AppState.grid)));
    const prev = undoStack.pop();
    AppState.grid = prev;
    refreshGridUI();
    showToast('Undo', 'info');
}

function redo() {
    if (redoStack.length === 0) return;
    undoStack.push(JSON.parse(JSON.stringify(AppState.grid)));
    const next = redoStack.pop();
    AppState.grid = next;
    refreshGridUI();
    showToast('Redo', 'info');
}

function refreshGridUI() {
    document.querySelectorAll('.grid-cell').forEach(cell => {
        const track = parseInt(cell.dataset.track);
        const step = parseInt(cell.dataset.step);
        if (track < AppState.grid.length && step < AppState.grid[track].length) {
            cell.classList.toggle('active', AppState.grid[track][step]);
        }
    });
}

function initUndoRedo() {
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    if (undoBtn) undoBtn.addEventListener('click', undo);
    if (redoBtn) redoBtn.addEventListener('click', redo);
}

// ============================================
// PER-TRACK RANDOMIZE
// ============================================
function initTrackRandomize() {
    document.querySelectorAll('.btn-rand-track').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const track = parseInt(btn.dataset.track);
            pushUndoState();
            const density = track <= 3 ? 0.35 : 0.25;
            for (let step = 0; step < AppState.gridSteps; step++) {
                AppState.grid[track][step] = Math.random() < density;
            }
            refreshGridUI();
            if (navigator.vibrate) navigator.vibrate([15, 15, 15]);
            showToast(`🎲 ${trackNames[track]} randomized`, 'success');
        });
    });
}

// ============================================
// DJ PERFORMANCE TOOLS
// ============================================
let tapeStopActive = false;
let beatRollActive = false;
let beatRollInterval = null;
let originalBpm = null;

function initDJTools() {
    const tapeBtn = document.getElementById('tape-stop-btn');
    const rollBtn = document.getElementById('beat-roll-btn');
    const halfBtn = document.getElementById('half-speed-btn');
    const doubleBtn = document.getElementById('double-speed-btn');

    if (tapeBtn) tapeBtn.addEventListener('click', triggerTapeStop);
    if (rollBtn) rollBtn.addEventListener('mousedown', startBeatRoll);
    if (rollBtn) rollBtn.addEventListener('mouseup', stopBeatRoll);
    if (rollBtn) rollBtn.addEventListener('mouseleave', stopBeatRoll);
    if (rollBtn) rollBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startBeatRoll(); });
    if (rollBtn) rollBtn.addEventListener('touchend', (e) => { e.preventDefault(); stopBeatRoll(); });
    if (halfBtn) halfBtn.addEventListener('click', () => changeSpeed(0.5));
    if (doubleBtn) doubleBtn.addEventListener('click', () => changeSpeed(2));
}

function triggerTapeStop() {
    if (!AppState.audioContextStarted || !AppState.isPlaying) {
        showToast('Start playback first', 'info');
        return;
    }
    const btn = document.getElementById('tape-stop-btn');
    btn.classList.add('active');
    const startBpm = Tone.Transport.bpm.value;
    Tone.Transport.bpm.rampTo(10, 1.5);
    setTimeout(() => {
        togglePlayback();
        Tone.Transport.bpm.value = startBpm;
        btn.classList.remove('active');
        showToast('⏹ Tape stopped', 'success');
    }, 1600);
}

function startBeatRoll() {
    if (!AppState.audioContextStarted) return;
    const btn = document.getElementById('beat-roll-btn');
    btn.classList.add('active');
    beatRollActive = true;
    let rollSpeed = 100;
    function doRoll() {
        if (!beatRollActive) return;
        const step = AppState.currentStep;
        playStep(Tone.now());
        rollSpeed = Math.max(50, rollSpeed - 5);
        beatRollInterval = setTimeout(doRoll, rollSpeed);
    }
    doRoll();
}

function stopBeatRoll() {
    beatRollActive = false;
    if (beatRollInterval) { clearTimeout(beatRollInterval); beatRollInterval = null; }
    const btn = document.getElementById('beat-roll-btn');
    if (btn) btn.classList.remove('active');
}

function changeSpeed(multiplier) {
    if (!AppState.audioContextStarted) return;
    const newBpm = Math.round(AppState.bpm * multiplier);
    const clamped = Math.max(30, Math.min(300, newBpm));
    AppState.bpm = clamped;
    Tone.Transport.bpm.value = clamped;
    document.getElementById('bpm-slider').value = Math.min(180, clamped);
    document.getElementById('bpm-value').textContent = clamped;
    showToast(`⚡ ${clamped} BPM`, 'success');
}

// ============================================
// LIVE AUDIO VISUALIZER
// ============================================
let liveAnalyser = null;
let liveVisMode = 'bars';
let liveVisAnimId = null;

function initLiveVisualizer() {
    // Mode buttons
    document.querySelectorAll('.vis-mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.vis-mode-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            liveVisMode = btn.dataset.visMode;
        });
    });
    startLiveVis();
}

function startLiveVis() {
    const canvas = document.getElementById('live-visualizer-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function resize() {
        canvas.width = canvas.offsetWidth * (window.devicePixelRatio || 1);
        canvas.height = canvas.offsetHeight * (window.devicePixelRatio || 1);
        ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    }
    resize();

    function ensureAnalyser() {
        if (!liveAnalyser && AppState.audioContextStarted) {
            liveAnalyser = new Tone.Analyser('fft', 64);
            Tone.Destination.connect(liveAnalyser);
        }
    }

    const w = () => canvas.offsetWidth;
    const h = () => canvas.offsetHeight;

    function draw() {
        ensureAnalyser();
        ctx.clearRect(0, 0, w(), h());
        ctx.fillStyle = '#0a0a14';
        ctx.fillRect(0, 0, w(), h());

        if (!liveAnalyser) { liveVisAnimId = requestAnimationFrame(draw); return; }
        const data = liveAnalyser.getValue();

        if (liveVisMode === 'bars') {
            const barW = w() / data.length;
            data.forEach((val, i) => {
                const db = Math.max(0, (val + 100) / 100);
                const barH = db * h() * 0.9;
                const hue = 180 + (i / data.length) * 60;
                ctx.fillStyle = `hsla(${hue}, 80%, 60%, 0.85)`;
                ctx.fillRect(i * barW + 1, h() - barH, barW - 2, barH);
            });
        } else if (liveVisMode === 'wave') {
            ctx.beginPath();
            ctx.strokeStyle = '#06B6D4';
            ctx.lineWidth = 2;
            data.forEach((val, i) => {
                const x = (i / data.length) * w();
                const y = h() / 2 + ((val + 100) / 200) * h() * 0.8 - h() * 0.4;
                i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            });
            ctx.stroke();
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(236, 72, 153, 0.5)';
            ctx.lineWidth = 1;
            data.forEach((val, i) => {
                const x = (i / data.length) * w();
                const y = h() / 2 + ((val + 100) / 200) * h() * 0.6 - h() * 0.3;
                i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            });
            ctx.stroke();
        } else if (liveVisMode === 'circle') {
            const cx = w() / 2, cy = h() / 2;
            const baseR = Math.min(w(), h()) * 0.25;
            ctx.beginPath();
            data.forEach((val, i) => {
                const angle = (i / data.length) * Math.PI * 2 - Math.PI / 2;
                const db = Math.max(0, (val + 100) / 100);
                const r = baseR + db * baseR * 0.8;
                const x = cx + Math.cos(angle) * r;
                const y = cy + Math.sin(angle) * r;
                i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            });
            ctx.closePath();
            ctx.strokeStyle = '#06B6D4';
            ctx.lineWidth = 2;
            ctx.stroke();
            const grad = ctx.createRadialGradient(cx, cy, baseR * 0.3, cx, cy, baseR * 1.5);
            grad.addColorStop(0, 'rgba(6, 182, 212, 0.1)');
            grad.addColorStop(1, 'rgba(139, 92, 246, 0.05)');
            ctx.fillStyle = grad;
            ctx.fill();
        }
        liveVisAnimId = requestAnimationFrame(draw);
    }
    draw();
}

// ============================================
// CHORD PROGRESSION GENERATOR
// ============================================
const SCALE_INTERVALS = {
    major: [0,2,4,5,7,9,11],
    minor: [0,2,3,5,7,8,10],
    dorian: [0,2,3,5,7,9,10],
    mixolydian: [0,2,4,5,7,9,10],
    pentatonic: [0,2,4,7,9],
    blues: [0,3,5,6,7,10]
};

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

const COMMON_PROGRESSIONS = [
    { name: 'Pop', degrees: [1,5,6,4] },
    { name: 'Jazz', degrees: [2,5,1,1] },
    { name: 'Sad', degrees: [6,4,1,5] },
    { name: 'Epic', degrees: [1,3,4,5] },
    { name: 'LoFi', degrees: [2,5,1,4] },
    { name: 'Rock', degrees: [1,4,5,5] }
];

let activeChordProg = null;
let isChordRecording = false;
let chordRecordingData = [];
let chordRecordStartTime = 0;
let chordPart = null;
let currentChordPreview = null;
let chordPreviewPart = null;

function initChordGenerator() {
    const keySelect = document.getElementById('chord-key-select');
    const scaleSelect = document.getElementById('chord-scale-select');
    const voicingSelect = document.getElementById('chord-voicing-select');
    const styleSelect = document.getElementById('chord-style-select');
    const playBtn = document.getElementById('play-chord-prog-btn');
    const recordBtn = document.getElementById('chord-record-btn');
    const clearBtn = document.getElementById('chord-clear-btn');

    if (keySelect) {
        keySelect.addEventListener('change', (e) => {
            AppState.selectedChordKey = e.target.value;
            buildChordButtons();
            buildChordPads();
            applyScaleLock();
        });
    }

    if (scaleSelect) {
        scaleSelect.addEventListener('change', (e) => {
            AppState.selectedScale = e.target.value;
            buildChordButtons();
            buildChordPads();
            applyScaleLock();
        });
    }

    if (voicingSelect) {
        voicingSelect.addEventListener('change', (e) => {
            AppState.selectedVoicing = e.target.value;
            buildChordButtons();
            buildChordPads();
        });
    }

    if (styleSelect) {
        styleSelect.addEventListener('change', (e) => {
            AppState.selectedChordStyle = e.target.value;
        });
    }

    if (playBtn) playBtn.addEventListener('click', playChordProgression);
    if (recordBtn) recordBtn.addEventListener('click', toggleChordRecord);
    if (clearBtn) clearBtn.addEventListener('click', clearChordRecording);

    buildChordButtons();
    buildChordPads();
}

function getScaleNotes(root, scale) {
    const rootIdx = NOTE_NAMES.indexOf(root);
    const intervals = SCALE_INTERVALS[scale] || SCALE_INTERVALS.major;
    return intervals.map(i => NOTE_NAMES[(rootIdx + i) % 12]);
}

function getChordNotesFromDegree(root, scale, degree, voicing) {
    const intervals = SCALE_INTERVALS[scale] || SCALE_INTERVALS.major;
    const rootIdx = NOTE_NAMES.indexOf(root);
    const degIdx = degree - 1;

    const getScaleNoteAtOffset = (offset) => {
        const step = degIdx + offset;
        const intervalValue = intervals[step % intervals.length];
        const octaveShift = Math.floor(step / intervals.length);
        const pitchIdx = (rootIdx + intervalValue) % 12;
        const octave = 4 + octaveShift;
        return NOTE_NAMES[pitchIdx] + octave;
    };

    const rootNote = getScaleNoteAtOffset(0);
    const thirdNote = getScaleNoteAtOffset(2);
    const fifthNote = getScaleNoteAtOffset(4);

    let notes = [rootNote, thirdNote, fifthNote];
    let nameBase = rootNote.replace(/\d/, '');

    const rootPitchIdx = NOTE_NAMES.indexOf(rootNote.replace(/\d/, ''));
    const thirdPitchIdx = NOTE_NAMES.indexOf(thirdNote.replace(/\d/, ''));
    const thirdInterval = (thirdPitchIdx - rootPitchIdx + 12) % 12;
    
    let type = '';
    if (thirdInterval === 3) type = 'm';
    else if (thirdInterval === 4) type = '';
    else type = 'dim';

    let name = nameBase.replace('#', '♯') + type;

    if (voicing === '7th') {
        const seventhNote = getScaleNoteAtOffset(6);
        notes.push(seventhNote);
        name += '7';
    } else if (voicing === '9th') {
        const seventhNote = getScaleNoteAtOffset(6);
        const ninthNote = getScaleNoteAtOffset(8);
        notes.push(seventhNote, ninthNote);
        name += '9';
    } else if (voicing === 'sus') {
        const fourthNote = getScaleNoteAtOffset(3);
        notes = [rootNote, fourthNote, fifthNote];
        name = nameBase.replace('#', '♯') + 'sus4';
    }

    return { name, notes, type };
}

function playChordNotes(notes, style, time = Tone.now()) {
    if (!AppState.audioContextStarted) {
        Tone.start();
        initAudio();
    }

    highlightPianoKeysForChord(notes);

    const duration = '2n';
    if (style === 'block') {
        if (pianoSynth) pianoSynth.triggerAttackRelease(notes, duration, time);
    } else if (style === 'strum') {
        notes.forEach((note, idx) => {
            if (pianoSynth) pianoSynth.triggerAttackRelease(note, duration, time + idx * 0.04);
        });
    } else if (style === 'arp-up') {
        notes.forEach((note, idx) => {
            if (pianoSynth) pianoSynth.triggerAttackRelease(note, '8n', time + idx * 0.15);
        });
    } else if (style === 'arp-down') {
        [...notes].reverse().forEach((note, idx) => {
            if (pianoSynth) pianoSynth.triggerAttackRelease(note, '8n', time + idx * 0.15);
        });
    }
}

function highlightPianoKeysForChord(notes) {
    notes.forEach(note => {
        const key = document.querySelector(`.piano-key[data-note="${note}"]`);
        if (key) {
            key.classList.add('active');
            setTimeout(() => {
                key.classList.remove('active');
            }, 600);
        }
    });
}

const DEGREES_ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
function buildChordPads() {
    const grid = document.getElementById('chord-pads-grid');
    if (!grid) return;
    grid.innerHTML = '';

    for (let d = 1; d <= 7; d++) {
        const chordInfo = getChordNotesFromDegree(AppState.selectedChordKey, AppState.selectedScale, d, AppState.selectedVoicing);
        
        let degreeText = DEGREES_ROMAN[d - 1];
        if (chordInfo.type === 'm') degreeText = degreeText.toLowerCase();
        else if (chordInfo.type === 'dim') degreeText = degreeText.toLowerCase() + '°';

        const pad = document.createElement('div');
        pad.className = `chord-pad ${chordInfo.type === 'm' ? 'minor-pad' : chordInfo.type === 'dim' ? 'dim-pad' : 'major-pad'}`;
        pad.innerHTML = `
            <span class="chord-pad-degree">${degreeText}</span>
            <span class="chord-pad-name">${chordInfo.name}</span>
        `;

        pad.addEventListener('mousedown', () => {
            playChordNotes(chordInfo.notes, AppState.selectedChordStyle);
            if (isChordRecording) {
                recordChordHit(chordInfo, Date.now());
            }
        });
        
        pad.addEventListener('touchstart', (e) => {
            e.preventDefault();
            playChordNotes(chordInfo.notes, AppState.selectedChordStyle);
            if (isChordRecording) {
                recordChordHit(chordInfo, Date.now());
            }
        });

        grid.appendChild(pad);
    }
}

function buildChordButtons() {
    const container = document.getElementById('chord-progression-btns');
    if (!container) return;
    container.innerHTML = '';

    COMMON_PROGRESSIONS.forEach((prog, idx) => {
        const chords = prog.degrees.map(d => getChordNotesFromDegree(AppState.selectedChordKey, AppState.selectedScale, d, AppState.selectedVoicing));
        const label = chords.map(c => c.name).join(' → ');
        const btn = document.createElement('button');
        btn.className = 'chord-btn';
        btn.textContent = prog.name;
        btn.title = label;
        btn.dataset.progIdx = idx;
        btn.addEventListener('click', () => {
            container.querySelectorAll('.chord-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeChordProg = idx;
            showToast(`${prog.name}: ${label}`, 'success');
        });
        container.appendChild(btn);
    });
}

function playChordProgression() {
    if (activeChordProg === null) { showToast('Select a progression first', 'info'); return; }
    if (!AppState.audioContextStarted) { Tone.start(); initAudio(); }

    const prog = COMMON_PROGRESSIONS[activeChordProg];
    const chords = prog.degrees.map(d => getChordNotesFromDegree(AppState.selectedChordKey, AppState.selectedScale, d, AppState.selectedVoicing));

    const stepDuration = 1.2;
    chords.forEach((chord, i) => {
        setTimeout(() => {
            playChordNotes(chord.notes, AppState.selectedChordStyle);
            if (isChordRecording) {
                recordChordHit(chord, Date.now());
            }
        }, i * stepDuration * 1000);
    });

    showToast(`▶ Playing ${prog.name} progression`, 'success');
}

function recordChordHit(chordInfo, time) {
    if (isChordRecording) {
        chordRecordingData.push({
            notes: chordInfo.notes,
            name: chordInfo.name,
            time: time - chordRecordStartTime
        });
    }
}

function toggleChordRecord() {
    const btn = document.getElementById('chord-record-btn');
    if (!btn) return;

    if (!isChordRecording) {
        isChordRecording = true;
        chordRecordingData = [];
        chordRecordStartTime = Date.now();
        btn.classList.add('recording');
        btn.innerHTML = '<i class="fas fa-stop"></i> Stop Chords';
        showToast('🔴 Recording chords...', 'success');
    } else {
        isChordRecording = false;
        btn.classList.remove('recording');
        btn.innerHTML = '<i class="fas fa-circle"></i> Record Chords';

        if (chordRecordingData.length > 0) {
            AppState.chordRecordingUrl = chordRecordingData;
            saveChordRecording(chordRecordingData);
            showToast(`✅ Recorded ${chordRecordingData.length} chords!`, 'success');
        } else {
            showToast('No chords recorded', 'info');
        }
    }
}

function saveChordRecording(recordedChords) {
    const timestamp = new Date().toLocaleTimeString();
    const count = recordedChords.length;
    const clipId = `chord-clip-${Date.now()}`;

    const clipContainer = document.createElement('div');
    clipContainer.className = 'recorded-clip';
    clipContainer.innerHTML = `
        <div class="clip-info">
            <i class="fas fa-grip-horizontal"></i>
            <span>Chord Loop ${timestamp} (${count} chords)</span>
        </div>
        <div class="clip-actions">
            <button class="btn-play-clip" id="play-${clipId}">
                <i class="fas fa-play"></i> Play
            </button>
            <button class="btn-add-to-beat" id="add-${clipId}">
                <i class="fas fa-plus"></i> Add to Beat
            </button>
        </div>
    `;

    const playBtn = clipContainer.querySelector(`#play-${clipId}`);
    const addBtn = clipContainer.querySelector(`#add-${clipId}`);

    playBtn.addEventListener('click', (e) => {
        playChordPreview(clipId, e.currentTarget);
    });

    addBtn.addEventListener('click', () => {
        addChordsToBeat();
    });

    const container = document.getElementById('chord-recorded-clips');
    if (container) {
        container.innerHTML = '';
        container.appendChild(clipContainer);
    }
}

function playChordPreview(clipId, btn) {
    if (!AppState.chordRecordingUrl) return;

    if (currentChordPreview === clipId && chordPreviewPart) {
        stopChordPreview();
        if (btn) btn.innerHTML = '<i class="fas fa-play"></i> Play';
        return;
    }

    stopChordPreview();

    if (!AppState.audioContextStarted) {
        Tone.start();
        initAudio();
    }

    const events = AppState.chordRecordingUrl.map(evt => [evt.time / 1000, evt.notes]);
    chordPreviewPart = new Tone.Part((time, notes) => {
        playChordNotes(notes, AppState.selectedChordStyle, time);
    }, events);
    chordPreviewPart.loop = false;

    if (btn) btn.innerHTML = '<i class="fas fa-pause"></i> Pause';

    Tone.Transport.stop();
    Tone.Transport.seconds = 0;
    chordPreviewPart.start(0);
    Tone.Transport.start();
    currentChordPreview = clipId;

    const maxTime = Math.max(...AppState.chordRecordingUrl.map(e => e.time / 1000));
    setTimeout(() => {
        stopChordPreview();
        if (btn) btn.innerHTML = '<i class="fas fa-play"></i> Play';
    }, (maxTime + 1.2) * 1000);
}

function stopChordPreview() {
    if (chordPreviewPart) {
        chordPreviewPart.stop();
        chordPreviewPart.dispose();
        chordPreviewPart = null;
    }
    if (!AppState.isPlaying) {
        Tone.Transport.stop();
    }
    currentChordPreview = null;
}

function addChordsToBeat() {
    if (!AppState.chordRecordingUrl) return;

    scheduleChordPlayback();

    const existingChordTrack = document.getElementById('chord-track-bar');
    if (existingChordTrack) existingChordTrack.remove();

    const chordTrackBar = document.createElement('div');
    chordTrackBar.id = 'chord-track-bar';
    chordTrackBar.className = 'piano-track-bar';
    chordTrackBar.innerHTML = `
        <div class="piano-track-content">
            <div class="piano-track-header">
                <i class="fas fa-grip-horizontal"></i>
                <span>CHORDS</span>
            </div>
            <div class="piano-progress-bar-container-inline">
                <div id="chord-progress-bar-inline" class="piano-progress-bar-inline"></div>
            </div>
        </div>
    `;

    const pianoTrack = document.getElementById('piano-track-bar');
    const voiceTrack = document.getElementById('voice-track-bar');
    const sequencerContainer = document.querySelector('.sequencer-container');

    if (pianoTrack) {
        pianoTrack.parentNode.insertBefore(chordTrackBar, pianoTrack.nextSibling);
    } else if (voiceTrack) {
        voiceTrack.parentNode.insertBefore(chordTrackBar, voiceTrack.nextSibling);
    } else {
        sequencerContainer.parentNode.insertBefore(chordTrackBar, sequencerContainer.nextSibling);
    }

    showToast('🎹 Chords added to beat!', 'success');
}

function scheduleChordPlayback() {
    if (chordPart) {
        chordPart.stop();
        chordPart.dispose();
        chordPart = null;
    }

    if (!AppState.chordRecordingUrl || AppState.chordRecordingUrl.length === 0) return;

    const stepDuration = (60 / AppState.bpm);
    const loopDuration = stepDuration * AppState.gridSteps;

    const events = AppState.chordRecordingUrl
        .filter(evt => (evt.time / 1000) < loopDuration)
        .map(evt => [evt.time / 1000, evt.notes]);

    chordPart = new Tone.Part((time, notes) => {
        playChordNotes(notes, AppState.selectedChordStyle, time);
    }, events);

    chordPart.loop = true;
    chordPart.loopEnd = loopDuration;

    if (AppState.isPlaying) {
        chordPart.start(0);
    }
}

function clearChordRecording() {
    chordRecordingData = [];
    AppState.chordRecordingUrl = null;

    if (chordPart) {
        chordPart.stop();
        chordPart.dispose();
        chordPart = null;
    }

    const container = document.getElementById('chord-recorded-clips');
    if (container) container.innerHTML = '';

    const bar = document.getElementById('chord-track-bar');
    if (bar) bar.remove();

    showToast('Chord recording cleared', 'success');
}

// ============================================
// MASTER OUTPUT (Volume, Compressor, Limiter, Meters)
// ============================================
let masterCompressor = null;
let masterLimiter = null;
let masterMeter = null;
let limiterEnabled = false;
let meterAnimId = null;

function initMasterOutput() {
    const volSlider = document.getElementById('master-volume');
    const compSlider = document.getElementById('master-compressor');
    const limiterBtn = document.getElementById('limiter-toggle');

    if (volSlider) volSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        Tone.Destination.volume.value = val;
        document.getElementById('master-vol-val').textContent = val + ' dB';
    });

    if (compSlider) compSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        if (val > 0 && AppState.audioContextStarted) {
            if (!masterCompressor) {
                masterCompressor = new Tone.Compressor({ threshold: -24, ratio: 4, attack: 0.003, release: 0.25 });
                Tone.Destination.chain(masterCompressor);
            }
            masterCompressor.threshold.value = -10 - (val * 0.3);
            masterCompressor.ratio.value = 1 + (val / 100) * 11;
            document.getElementById('master-comp-val').textContent = val + '%';
        } else {
            document.getElementById('master-comp-val').textContent = 'Off';
        }
    });

    if (limiterBtn) limiterBtn.addEventListener('click', () => {
        limiterEnabled = !limiterEnabled;
        limiterBtn.classList.toggle('active', limiterEnabled);
        limiterBtn.textContent = limiterEnabled ? 'ON' : 'OFF';
        if (limiterEnabled && AppState.audioContextStarted) {
            if (!masterLimiter) {
                masterLimiter = new Tone.Limiter(-3);
                Tone.Destination.chain(masterLimiter);
            }
        }
        showToast(limiterEnabled ? '🔊 Limiter ON' : 'Limiter OFF', 'success');
    });

    // Meter animation
    if (!masterMeter && typeof Tone !== 'undefined') {
        try {
            masterMeter = new Tone.Meter({ channels: 2, smoothing: 0.8 });
            Tone.Destination.connect(masterMeter);
        } catch (e) { /* mono fallback */ }
    }
    startMeterAnimation();
}

function startMeterAnimation() {
    const barL = document.getElementById('meter-bar-l');
    const barR = document.getElementById('meter-bar-r');
    if (!barL || !barR) return;

    function update() {
        if (masterMeter && AppState.isPlaying) {
            try {
                const vals = masterMeter.getValue();
                if (Array.isArray(vals)) {
                    barL.style.width = Math.min(100, Math.max(0, (vals[0] + 60) / 60 * 100)) + '%';
                    barR.style.width = Math.min(100, Math.max(0, (vals[1] + 60) / 60 * 100)) + '%';
                } else {
                    const pct = Math.min(100, Math.max(0, (vals + 60) / 60 * 100));
                    barL.style.width = pct + '%';
                    barR.style.width = pct + '%';
                }
            } catch (e) { /* ignore */ }
        } else {
            barL.style.width = '0%';
            barR.style.width = '0%';
        }
        meterAnimId = requestAnimationFrame(update);
    }
    update();
}

// ============================================
// SCALE LOCK FOR PIANO
// ============================================
let scaleLockEnabled = false;

function initScaleLock() {
    const btn = document.getElementById('scale-lock-btn');
    if (!btn) return;

    btn.addEventListener('click', () => {
        scaleLockEnabled = !scaleLockEnabled;
        btn.classList.toggle('active', scaleLockEnabled);
        btn.innerHTML = scaleLockEnabled
            ? '<i class="fas fa-lock"></i>'
            : '<i class="fas fa-lock-open"></i>';
        applyScaleLock();
        showToast(scaleLockEnabled ? '🔒 Scale lock ON' : '🔓 Scale lock OFF', 'success');
    });
}

function applyScaleLock() {
    const scaleNotes = getScaleNotes(AppState.selectedChordKey, AppState.selectedScale);
    
    pianoNotes.forEach((keyData, row) => {
        const noteName = keyData.note.replace(/\d+/, '');
        const isScaleIn = scaleNotes.includes(noteName);
        const isDisabled = scaleLockEnabled && !isScaleIn;

        // Key in sidebar
        const keyEl = document.querySelector(`.piano-roll-key[data-note="${keyData.note}"]`);
        if (keyEl) {
            keyEl.classList.toggle('scale-disabled', isDisabled);
        }

        // Cells in that row
        document.querySelectorAll(`.piano-roll-cell[data-row="${row}"]`).forEach(cell => {
            cell.classList.toggle('scale-disabled', isDisabled);
        });
    });
}

// ============================================
// DAW ARRANGEMENT TIMELINE
// ============================================
const ArrangementState = {
    tracks: [
        { name: 'Drums', muted: false, solo: false },
        { name: 'Bass', muted: false, solo: false },
        { name: 'Synth 1', muted: false, solo: false },
        { name: 'Synth 2', muted: false, solo: false },
        { name: 'Melody', muted: false, solo: false },
        { name: 'FX', muted: false, solo: false }
    ],
    clips: [], // { id, trackIdx, bar, patternId }
    songLength: 16,
    isPlayingSong: false,
    currentBar: 0,
    paintModePattern: 'A',
    eraseMode: false
};

let songLoop = null;
let songPlayAnimId = null;
let isExporting = false;
let songRecorder = null;

function initArrangement() {
    renderArrangementGrid();
    setupArrangementListeners();
}

function renderArrangementGrid() {
    const headers = document.getElementById('bar-headers');
    const sidebar = document.getElementById('timeline-tracks-sidebar');
    const grid = document.getElementById('timeline-grid');
    if (!headers || !sidebar || !grid) return;

    headers.innerHTML = '';
    sidebar.innerHTML = '';
    grid.innerHTML = '';

    const lenDisplay = document.getElementById('song-length-display');
    const lenLabel = document.getElementById('song-length-label');
    if (lenDisplay) lenDisplay.textContent = ArrangementState.songLength;
    if (lenLabel) lenLabel.textContent = `${ArrangementState.songLength} Bars`;

    for (let bar = 0; bar < ArrangementState.songLength; bar++) {
        const h = document.createElement('div');
        h.className = 'bar-header';
        h.textContent = bar + 1;
        headers.appendChild(h);
    }

    ArrangementState.tracks.forEach((track, trackIdx) => {
        // Sidebar
        const t = document.createElement('div');
        t.className = 'timeline-track-header';
        t.innerHTML = `
            <span class="timeline-track-name">${track.name}</span>
            <div class="track-mini-controls">
                <button class="track-mini-btn btn-trk-mute ${track.muted ? 'muted' : ''}" data-track="${trackIdx}">M</button>
                <button class="track-mini-btn btn-trk-solo ${track.solo ? 'soloed' : ''}" data-track="${trackIdx}">S</button>
            </div>
        `;
        sidebar.appendChild(t);

        // Grid row
        const row = document.createElement('div');
        row.className = 'timeline-row';
        for (let bar = 0; bar < ArrangementState.songLength; bar++) {
            const cell = document.createElement('div');
            cell.className = 'timeline-cell';
            cell.dataset.track = trackIdx;
            cell.dataset.bar = bar;
            row.appendChild(cell);
        }
        grid.appendChild(row);
    });

    renderArrangementClips();

    // Bind sidebar buttons
    sidebar.querySelectorAll('.btn-trk-mute').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tIdx = parseInt(e.target.dataset.track);
            ArrangementState.tracks[tIdx].muted = !ArrangementState.tracks[tIdx].muted;
            e.target.classList.toggle('muted', ArrangementState.tracks[tIdx].muted);
        });
    });
    sidebar.querySelectorAll('.btn-trk-solo').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tIdx = parseInt(e.target.dataset.track);
            ArrangementState.tracks[tIdx].solo = !ArrangementState.tracks[tIdx].solo;
            e.target.classList.toggle('soloed', ArrangementState.tracks[tIdx].solo);
        });
    });

    // Painting logic on grid cells
    let isPainting = false;
    grid.addEventListener('mousedown', (e) => {
        isPainting = true;
        if (e.target.classList.contains('timeline-cell') || e.target.closest('.timeline-clip')) {
            handleGridClick(e);
        }
    });
    window.addEventListener('mouseup', () => isPainting = false);
    grid.addEventListener('mousemove', (e) => {
        if (isPainting && e.target.classList.contains('timeline-cell')) {
            handleGridClick(e);
        }
    });
}

function handleGridClick(e) {
    let cell = e.target.closest('.timeline-cell');
    if (!cell && e.target.closest('.timeline-clip')) {
        cell = e.target.closest('.timeline-clip').parentElement;
    }
    if (!cell) return;
    
    const trackIdx = parseInt(cell.dataset.track);
    const bar = parseInt(cell.dataset.bar);

    const existingClipIdx = ArrangementState.clips.findIndex(c => c.trackIdx === trackIdx && c.bar === bar);

    if (ArrangementState.eraseMode) {
        if (existingClipIdx !== -1) {
            ArrangementState.clips.splice(existingClipIdx, 1);
            renderArrangementClips();
        }
    } else {
        if (existingClipIdx !== -1) {
            ArrangementState.clips[existingClipIdx].patternId = ArrangementState.paintModePattern;
        } else {
            ArrangementState.clips.push({
                id: 'clip-' + Date.now() + Math.random(),
                trackIdx,
                bar,
                patternId: ArrangementState.paintModePattern
            });
        }
        renderArrangementClips();
    }
}

function renderArrangementClips() {
    document.querySelectorAll('.timeline-clip').forEach(c => c.remove());

    const grid = document.getElementById('timeline-grid');
    if (!grid) return;

    ArrangementState.clips.forEach(clip => {
        const row = grid.children[clip.trackIdx];
        if (!row) return;
        const cell = row.children[clip.bar];
        if (!cell) return;

        const clipEl = document.createElement('div');
        clipEl.className = 'timeline-clip';
        clipEl.dataset.pattern = clip.patternId;
        clipEl.dataset.id = clip.id;
        
        if (clip.patternId.startsWith('VOICE_')) {
            clipEl.innerHTML = '<i class="fas fa-microphone"></i> Voice';
        } else {
            clipEl.textContent = 'Pattern ' + clip.patternId;
        }

        const b = patternBanks[clip.patternId];
        const voiceId = clip.patternId.startsWith('VOICE_') ? clip.patternId.replace('VOICE_', '') : null;
        const hasData = (voiceId && arrangeVoiceBuffers[voiceId]) || (b && ((b.grid && b.grid.some(tr => tr.some(v=>v))) || (b.pianoNotes && b.pianoNotes.length > 0)));
        
        const indicator = document.createElement('div');
        indicator.className = 'clip-indicator' + (hasData ? ' has-data' : '');
        clipEl.appendChild(indicator);

        // Individual clip interaction handled by grid delegation
        
        let customWidth = null;
        if (voiceId && arrangeVoiceBuffers[voiceId]) {
            const buffer = arrangeVoiceBuffers[voiceId];
            if (buffer && buffer.loaded) {
                const durationSecs = buffer.duration;
                const stepDur = 60 / AppState.bpm / 2; // seconds per step (8th note)
                const barDur = stepDur * AppState.gridSteps; // seconds per bar
                const bars = durationSecs / barDur;
                customWidth = (bars * 80) - 6; // 80px per bar minus margins
            }
        }
        
        if (customWidth) {
            clipEl.style.right = 'auto'; // override CSS inset right
            clipEl.style.width = customWidth + 'px';
            clipEl.style.zIndex = '5'; // to appear above next cells
        }
        
        cell.appendChild(clipEl);
    });
}

function setupArrangementListeners() {
    // Palette
    document.querySelectorAll('#arrange-palette-btns .palette-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            ArrangementState.eraseMode = false;
            ArrangementState.paintModePattern = btn.dataset.pattern;
            document.querySelectorAll('.palette-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    const eraseBtn = document.getElementById('arrange-erase-btn');
    if (eraseBtn) {
        eraseBtn.addEventListener('click', () => {
            ArrangementState.eraseMode = true;
            document.querySelectorAll('.palette-btn').forEach(b => b.classList.remove('active'));
            eraseBtn.classList.add('active');
        });
    }

    const clearBtn = document.getElementById('arrange-clear-all-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            showConfirm('Clear entire arrangement?').then(confirmed => {
                if (confirmed) {
                    ArrangementState.clips = [];
                    renderArrangementClips();
                    showToast('Arrangement cleared', 'success');
                }
            });
        });
    }

    // Transport
    document.getElementById('song-play-btn')?.addEventListener('click', toggleSongPlayback);
    document.getElementById('song-stop-btn')?.addEventListener('click', stopSongPlayback);
    document.getElementById('song-rewind-btn')?.addEventListener('click', () => {
        ArrangementState.currentBar = 0;
        document.getElementById('song-bar-display').textContent = 1;
        updatePlayheadPosition();
        if (ArrangementState.isPlayingSong) {
            Tone.Transport.seconds = 0;
        }
    });

    // Length controls
    document.getElementById('song-length-plus')?.addEventListener('click', () => {
        ArrangementState.songLength = Math.min(128, ArrangementState.songLength + 4);
        renderArrangementGrid();
    });
    document.getElementById('song-length-minus')?.addEventListener('click', () => {
        ArrangementState.songLength = Math.max(4, ArrangementState.songLength - 4);
        ArrangementState.clips = ArrangementState.clips.filter(c => c.bar < ArrangementState.songLength);
        renderArrangementGrid();
    });

    // Export
    document.getElementById('export-song-btn')?.addEventListener('click', exportSongToWAV);
}

async function toggleSongPlayback() {
    if (!AppState.audioContextStarted) { 
        await Tone.start(); 
        initAudio(); 
    }

    ArrangementState.isPlayingSong = !ArrangementState.isPlayingSong;
    const btn = document.getElementById('song-play-btn');

    if (ArrangementState.isPlayingSong) {
        if (AppState.isPlaying) togglePlayback();
        if (AppState.isPianoPlaying) stopPianoPlayback();

        Tone.Transport.stop();
        Tone.Transport.seconds = 0;
        
        // Ensure current pattern is saved
        patternBanks[currentPattern] = {
            grid: JSON.parse(JSON.stringify(AppState.grid)),
            pianoNotes: JSON.parse(JSON.stringify(AppState.pianoNotes || []))
        };

        if (songLoop) songLoop.dispose();
        
        let songStep = 0;
        const totalSongSteps = ArrangementState.songLength * AppState.gridSteps;
        
        songLoop = new Tone.Loop((time) => {
            if (songStep >= totalSongSteps) {
                // End of arrangement reached
                Tone.Draw.schedule(() => {
                    stopSongPlayback();
                }, time);
                return;
            }

            const currentBar = Math.floor(songStep / AppState.gridSteps);
            const stepInBar = songStep % AppState.gridSteps;

            const activeClips = ArrangementState.clips.filter(c => c.bar === currentBar);
            const anySoloed = ArrangementState.tracks.some(t => t.solo);

            activeClips.forEach(clip => {
                const track = ArrangementState.tracks[clip.trackIdx];
                if (track.muted || (anySoloed && !track.solo)) return;

                if (clip.patternId.startsWith('VOICE_')) {
                    const voiceId = clip.patternId.replace('VOICE_', '');
                    const voiceBuffer = arrangeVoiceBuffers[voiceId];
                    if (stepInBar === 0 && voiceBuffer && voiceBuffer.loaded) {
                        const voicePlayer = new Tone.Player(voiceBuffer).toDestination();
                        // Optional: route through FX chain if we had a dedicated voice fx node
                        voicePlayer.start(time);
                    }
                    return;
                }

                const bank = patternBanks[clip.patternId];
                if (!bank) return;

                // Play drums/synth
                if (bank.grid[0] && bank.grid[0][stepInBar]) synths.kick.triggerAttackRelease("C1", "8n", time);
                if (bank.grid[1] && bank.grid[1][stepInBar]) synths.snare.triggerAttackRelease("8n", time);
                if (bank.grid[2] && bank.grid[2][stepInBar]) synths.hihat.triggerAttackRelease("32n", time);
                if (bank.grid[3] && bank.grid[3][stepInBar]) synths.clap.triggerAttackRelease("8n", time);
                if (bank.grid[4] && bank.grid[4][stepInBar]) synths.bass.triggerAttackRelease("C2", "8n", time);
                if (bank.grid[5] && bank.grid[5][stepInBar]) synths.synth.triggerAttackRelease(["C4", "E4", "G4"], "8n", time);
                if (bank.grid[6] && bank.grid[6][stepInBar]) synths.fx.triggerAttackRelease("C5", "8n", time);

                // Play piano
                if (bank.pianoNotes) {
                    bank.pianoNotes.forEach(note => {
                        if (note.step === stepInBar && pianoSynth && pianoNotes[note.row]) {
                            const durationSeconds = Tone.Time("8n").toSeconds() * note.duration;
                            pianoSynth.triggerAttackRelease(pianoNotes[note.row].note, durationSeconds, time);
                        }
                    });
                }
            });

            Tone.Draw.schedule(() => {
                if (currentBar !== ArrangementState.currentBar) {
                    ArrangementState.currentBar = currentBar;
                    const bDisp = document.getElementById('song-bar-display');
                    if(bDisp) bDisp.textContent = currentBar + 1;
                }
            }, time);

            songStep++;
        }, "8n");

        Tone.Transport.start();
        songLoop.start(0);

        btn.classList.add('playing');
        btn.innerHTML = '<i class="fas fa-pause"></i>';
        document.getElementById('song-playhead').classList.add('active');
        
        animateSongPlayhead();

    } else {
        stopSongPlayback();
    }
}

function stopSongPlayback() {
    if (songLoop) {
        songLoop.stop();
        songLoop.dispose();
        songLoop = null;
    }
    ArrangementState.isPlayingSong = false;
    Tone.Transport.stop();
    
    if (songPlayAnimId) cancelAnimationFrame(songPlayAnimId);
    
    const btn = document.getElementById('song-play-btn');
    if (btn) {
        btn.classList.remove('playing');
        btn.innerHTML = '<i class="fas fa-play"></i>';
    }
    const ph = document.getElementById('song-playhead');
    if (ph) {
        ph.classList.remove('active');
        ph.style.left = '0px';
    }
    ArrangementState.currentBar = 0;
    const barDisp = document.getElementById('song-bar-display');
    if (barDisp) barDisp.textContent = 1;
}

function updatePlayheadPosition() {
    const playhead = document.getElementById('song-playhead');
    if (!playhead) return;
    playhead.style.left = (ArrangementState.currentBar * 80) + 'px';
}

function animateSongPlayhead() {
    if (!ArrangementState.isPlayingSong) return;
    
    const playhead = document.getElementById('song-playhead');
    const cellWidth = 80;
    const stepDur = 60 / AppState.bpm / 2; // seconds per 8th note
    const currentStepFloat = Tone.Transport.seconds / stepDur;
    const currentBarFloat = currentStepFloat / AppState.gridSteps;
    
    if (playhead) {
        const pos = currentBarFloat * cellWidth;
        playhead.style.left = pos + 'px';
        
        // Auto-scroll timeline
        const scrollContainer = document.getElementById('timeline-grid-scroll');
        if (scrollContainer) {
            const viewWidth = scrollContainer.clientWidth;
            if (pos > scrollContainer.scrollLeft + viewWidth - 100) {
                scrollContainer.scrollLeft = pos - viewWidth + 100;
            } else if (pos < scrollContainer.scrollLeft) {
                scrollContainer.scrollLeft = pos;
            }
        }
    }
    
    songPlayAnimId = requestAnimationFrame(animateSongPlayhead);
}

// REAL-TIME EXPORT 
async function exportSongToWAV() {
    if (isExporting) return;
    if (ArrangementState.clips.length === 0) {
        showToast('Arrangement is empty!', 'error');
        return;
    }

    if (!AppState.audioContextStarted) { Tone.start(); initAudio(); }
    
    isExporting = true;
    const exportBtn = document.getElementById('export-song-btn');
    if (exportBtn) exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Rendering...';
    
    // Create UI overlay
    const overlay = document.createElement('div');
    overlay.className = 'export-progress-overlay';
    overlay.innerHTML = `
        <div class="export-progress-card">
            <h3>Exporting Song</h3>
            <div class="export-progress-bar"><div class="export-progress-fill" id="export-progress-fill"></div></div>
            <div class="export-progress-text" id="export-progress-text">Rendering audio in real-time...</div>
        </div>
    `;
    document.body.appendChild(overlay);

    // Stop current playback
    stopSongPlayback();
    if (AppState.isPlaying) togglePlayback();
    if (AppState.isPianoPlaying) stopPianoPlayback();
    
    ArrangementState.currentBar = 0;
    Tone.Transport.seconds = 0;
    
    if (!songRecorder) {
        songRecorder = new Tone.Recorder();
        Tone.Destination.connect(songRecorder);
    }
    
    await songRecorder.start();
    
    const barDuration = (60 / AppState.bpm) * (AppState.gridSteps / 2); // Corrected bar duration in seconds
    const totalBars = Math.max(...ArrangementState.clips.map(c => c.bar)) + 1;
    const exportBars = totalBars + 1; // +1 bar for tails
    const totalTimeMs = exportBars * barDuration * 1000;
    
    const startTime = Date.now();
    toggleSongPlayback(); // Start song from beginning
    
    // Progress animation
    const progressFill = document.getElementById('export-progress-fill');
    const progressAnim = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const pct = Math.min(100, (elapsed / totalTimeMs) * 100);
        if (progressFill) progressFill.style.width = pct + '%';
    }, 100);
    
    setTimeout(async () => {
        clearInterval(progressAnim);
        stopSongPlayback();
        
        try {
            const recording = await songRecorder.stop();
            const url = URL.createObjectURL(recording);
            const anchor = document.createElement("a");
            anchor.download = (AppState.projectName || "LoopFlow_Song") + ".webm";
            anchor.href = url;
            anchor.click();
            showToast('Export complete!', 'success');
        } catch (e) {
            console.error('Export failed:', e);
            showToast('Export failed', 'error');
        }
        
        overlay.remove();
        if (exportBtn) exportBtn.innerHTML = '<i class="fas fa-download"></i> Export';
        isExporting = false;
    }, totalTimeMs);
}


// ============================================
// INITIALIZE
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    init();
    initVoiceRecorder();
    initPiano();
    initMixer();
    initEffects();
    initMetronome();
    initPatternBanks();
    initArrangement(); // NEW: Init DAW Timeline
    initUndoRedo();
    initTrackRandomize();
    initDJTools();
    initLiveVisualizer();
    initChordGenerator();
    initMasterOutput();
    initScaleLock();
});

