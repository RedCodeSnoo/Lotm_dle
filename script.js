const CONFIG = {
  maxGuesses: 20,
  attributes: [
    { key: 'gender', label: 'Gender' },
    { key: 'species', label: 'Species' },
    { key: 'pathway', label: 'Pathway' },
    { key: 'sequence', label: 'Sequence' },
    { key: 'volume', label: 'Volume' },
    { key: 'affiliation', label: 'Affiliation' },
    { key: 'epoch', label: 'Epoch' },
  ],
  storageKeys: {
    global: 'lotmGlobalStats',
    daily: 'lotmDailyStats'
  }
};


const UI = {
  input: document.getElementById('guessInput'),
  suggestions: document.getElementById('suggestions'),
  guessBtn: document.getElementById('guessBtn'),
  errorMsg: document.getElementById('errorMessage'),
  container: document.getElementById('guessesContainer'),
  status: document.getElementById('gameStatus'),
  resetSection: document.getElementById('resetSection'),
  counter: document.getElementById('counter'),
  inputSection: document.getElementById('inputSection'),
  globalStats: document.getElementById('globalStats'),
  statsDisplay: document.getElementById('statsDisplay'),
  dailyBtn: document.getElementById('dailyBtn'),
  randomBtn: document.getElementById('randomBtn'),
};


const game = {
  mode: 'daily', // 'daily' or 'random'
  target: null,
  guesses: [],
  state: 'playing', // 'playing', 'won', 'lost'
  stats: {
    global: { totalVisits: 0 },
    daily: { date: '', wins: 0, losses: 0 },
    session: { wins: 0, losses: 0 }
  },

  // Initialize the game
  init() {
    this.loadStats();
    this.setupParticles();
    this.setupEventListeners();
    this.startRound();
  },

  startRound() {
    this.guesses = [];
    this.state = 'playing';
    this.target = (this.mode === 'daily') ? this.getDailyCharacter() : this.getRandomCharacter();
    
    // UI Reset
    UI.input.value = '';
    UI.errorMsg.textContent = '';
    UI.suggestions.classList.add('hidden');
    UI.inputSection.style.display = 'block';
    
    this.render();
  },

  switchMode(newMode) {
    if (this.mode === newMode) return;
    this.mode = newMode;
    
    // Toggle Button Styles
    UI.dailyBtn.className = `mode-btn ${newMode === 'daily' ? 'active' : 'inactive'}`;
    UI.randomBtn.className = `mode-btn ${newMode === 'random' ? 'active' : 'inactive'}`;
    
    this.startRound();
  },

  // Core Game Logic
  submitGuess() {
    if (this.state !== 'playing') return;

    const val = UI.input.value.trim().toLowerCase();
    UI.errorMsg.textContent = '';

    if (!val) return;

    // Find character (exact match or first suggestion)
    let guessedChar = CHARACTERS.find(c => c.name.toLowerCase() === val);
    
    // Fallback to first suggestion if input is partial but valid
    if (!guessedChar) {
      const suggestions = this.getSuggestions(val);
      if (suggestions.length > 0) guessedChar = suggestions[0];
    }

    if (!guessedChar) {
      this.showError('Character not found!');
      return;
    }

    if (this.guesses.some(g => g.id === guessedChar.id)) {
      this.showError('You already tried this character!');
      return;
    }

    // Process Valid Guess
    this.guesses.push(guessedChar);
    UI.input.value = '';
    UI.suggestions.classList.add('hidden');

    // Check Win/Loss
    if (guessedChar.id === this.target.id) {
      this.handleWin();
    } else if (this.guesses.length >= CONFIG.maxGuesses) {
      this.handleLoss();
    }

    this.render();
  },

  handleWin() {
    this.state = 'won';
    if (this.mode === 'daily') this.stats.daily.wins++;
    else this.stats.session.wins++;
    this.saveStats();
  },

  handleLoss() {
    this.state = 'lost';
    if (this.mode === 'daily') this.stats.daily.losses++;
    else this.stats.session.losses++;
    this.saveStats();
  },

  // Data Helpers
  getDailyCharacter() {
    const today = new Date().toISOString().split('T')[0];
    let seed = 0;
    for (let i = 0; i < today.length; i++) {
      seed = ((seed << 5) - seed) + today.charCodeAt(i);
      seed = seed & seed;
    }
    const random = Math.abs(Math.sin(seed));
    return CHARACTERS[Math.floor(random * CHARACTERS.length)];
  },

  getRandomCharacter() {
    return CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
  },

  getSuggestions(query) {
    if (!query) return [];
    return CHARACTERS
      .filter(c => !this.guesses.some(g => g.id === c.id))
      .filter(c => c.name.toLowerCase().includes(query)) // Changed to includes for better UX
      .slice(0, 5);
  },

  compareAttributes(val1, val2) {
    const arr1 = Array.isArray(val1) ? val1 : [val1];
    const arr2 = Array.isArray(val2) ? val2 : [val2];
    
    // Exact match (arrays are equal set-wise)
    const isExact = arr1.length === arr2.length && arr1.every(v => arr2.includes(v));
    if (isExact) return 'correct';
    
    // Partial match
    const isPartial = arr1.some(v => arr2.includes(v));
    if (isPartial) return 'close';
    
    return 'incorrect';
  },

  // Stats Management
  loadStats() {
    // Global
    const savedGlobal = localStorage.getItem(CONFIG.storageKeys.global);
    this.stats.global = savedGlobal ? JSON.parse(savedGlobal) : { totalVisits: 0 };
    this.stats.global.totalVisits++;
    localStorage.setItem(CONFIG.storageKeys.global, JSON.stringify(this.stats.global));

    // Daily
    const today = new Date().toISOString().split('T')[0];
    const savedDaily = localStorage.getItem(CONFIG.storageKeys.daily);
    
    if (savedDaily) {
      const parsed = JSON.parse(savedDaily);
      this.stats.daily = (parsed.date === today) ? parsed : { date: today, wins: 0, losses: 0 };
    } else {
      this.stats.daily = { date: today, wins: 0, losses: 0 };
    }
  },

  saveStats() {
    localStorage.setItem(CONFIG.storageKeys.global, JSON.stringify(this.stats.global));
    localStorage.setItem(CONFIG.storageKeys.daily, JSON.stringify(this.stats.daily));
  },

  // UI Rendering
  render() {
    this.renderStatus();
    this.renderStats();
    this.renderCards();
    UI.counter.textContent = `${this.guesses.length}/${CONFIG.maxGuesses}`;
  },

  renderStatus() {
    UI.status.innerHTML = '';
    UI.resetSection.innerHTML = '';

    if (this.state === 'playing') return;

    // Game Over / Win UI
    UI.inputSection.style.display = 'none';
    
    const isWin = this.state === 'won';
    const msgClass = isWin ? 'bg-green-600' : 'bg-red-600';
    const msgText = isWin 
      ? `🎉 Congratulations! You found ${this.target.name}!` 
      : `💀 Game Over! The character was ${this.target.name}`;

    UI.status.innerHTML = `<div class="status-message ${msgClass} p-4 rounded-lg text-xl font-bold">${msgText}</div>`;

    const btnText = this.mode === 'random' ? '🎲 Next Round' : '🔄 New Game';
    UI.resetSection.innerHTML = `
      <button onclick="game.startRound()" class="bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">
        ${btnText}
      </button>`;
  },

  renderStats() {
    // Session Stats (Random Mode)
    UI.statsDisplay.textContent = (this.mode === 'random') 
      ? `Session: ${this.stats.session.wins}W - ${this.stats.session.losses}L`
      : '';

    // Global Stats
    UI.globalStats.textContent = `Total Visits: ${this.stats.global.totalVisits} | Daily: ${this.stats.daily.wins}W - ${this.stats.daily.losses}L`;
  },

  renderCards() {
    // Generate HTML for all cards (reversed order)
    const html = this.guesses.slice().reverse().map((guess, guessIdx) => {
      return this.createCardHTML(guess, guessIdx);
    }).join('');
    
    UI.container.innerHTML = html;

    // Trigger flip animation after render
    setTimeout(() => {
      document.querySelectorAll('.cell-inner:not(.flipped)').forEach(el => el.classList.add('flipped'));
    }, 50);
  },

  createCardHTML(guess, guessIdx) {
    const cells = CONFIG.attributes.map((attr, attrIdx) => {
      const gVal = guess[attr.key];
      const tVal = this.target[attr.key];
      
      // Comparison Logic
      const isGEmpty = gVal === -1 || gVal === 'None';
      const isTEmpty = tVal === -1 || tVal === 'None';
      
      let status = 'incorrect';
      let display = '❌';

      if (!isGEmpty) {
        display = Array.isArray(gVal) ? gVal.join(', ') : gVal;
        status = this.compareAttributes(gVal, tVal);
      } else if (isTEmpty) {
        status = 'correct'; // Both empty
      }

      // Animation delay calculation
      const delay = guessIdx * 100 + attrIdx * 80;
      
      return `
        <div class="attribute-cell">
          <div class="cell-inner" style="animation-delay:${delay}ms">
            <div class="cell-front">
              <div class="cell-label">${attr.label}</div>
              <div style="font-size:20px;margin-top:8px;">?</div>
            </div>
            <div class="cell-back ${status}">
              <div class="cell-label">${attr.label}</div>
              <div class="cell-value">${display}</div>
              ${status === 'correct' ? '<div class="checkmark">✓</div>' : ''}
            </div>
          </div>
        </div>`;
    }).join('');

    return `
      <div class="guess-card p-3 rounded-lg mb-4">
        <div class="font-bold text-yellow-300 mb-3 text-lg">${guess.name}</div>
        <div class="grid grid-cols-4 md:grid-cols-7 gap-2">${cells}</div>
      </div>`;
  },

  showError(msg) {
    UI.errorMsg.textContent = msg;
    // Auto-clear after 3 seconds
    setTimeout(() => { if(UI.errorMsg.textContent === msg) UI.errorMsg.textContent = ''; }, 3000);
  },

  // Setup Helpers
  setupParticles() {
    const container = document.querySelector('.particles');
    if(!container) return;
    
    const count = window.innerWidth < 768 ? 30 : 60;
    const fragment = document.createDocumentFragment();

    for(let i = 0; i < count; i++){
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.left = Math.random() * 100 + '%';
      p.style.animationDelay = (Math.random() * 10) + 's';
      const size = Math.random() * 3 + 2;
      p.style.width = size + 'px';
      p.style.height = size + 'px';
      p.style.opacity = Math.random() * 0.5 + 0.3;
      fragment.appendChild(p);
    }
    container.appendChild(fragment);
  },

  setupEventListeners() {
    UI.guessBtn.addEventListener('click', () => this.submitGuess());
    
    UI.input.addEventListener('keypress', (e) => {
      if(e.key === 'Enter') this.submitGuess();
    });

    UI.input.addEventListener('input', (e) => {
      const val = e.target.value.toLowerCase();
      const list = this.getSuggestions(val);
      
      if(list.length === 0) {
        UI.suggestions.classList.add('hidden');
        return;
      }

      UI.suggestions.innerHTML = list
        .map(c => `<div class="px-4 py-2 text-white hover:bg-purple-600 cursor-pointer suggestion-item" data-name="${c.name}">${c.name}</div>`)
        .join('');
      UI.suggestions.classList.remove('hidden');
    });

    // Delegate click for dynamic suggestions
    UI.suggestions.addEventListener('click', (e) => {
      const item = e.target.closest('.suggestion-item');
      if(item) {
        UI.input.value = item.dataset.name;
        UI.suggestions.classList.add('hidden');
        this.submitGuess();
      }
    });

    // Close suggestions on click outside
    document.addEventListener('click', (e) => {
      if (!UI.input.contains(e.target) && !UI.suggestions.contains(e.target)) {
        UI.suggestions.classList.add('hidden');
      }
    });
  }
};

// Start the engine
document.addEventListener('DOMContentLoaded', () => {
  game.init();
});