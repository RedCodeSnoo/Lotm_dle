const ATTRIBUTES = [
  { key:'gender', label:'Gender' },
  { key:'species', label:'Species' },
  { key:'pathway', label:'Pathway' },
  { key:'sequence', label:'Sequence' },
  { key:'volume', label:'Volume' },
  { key:'affiliation', label:'Affiliation' },
  { key:'epoch', label:'Epoch' },
];

let currentMode = 'daily';
let targetChar = null, guesses = [], gameWon = false, gameOver = false, currentSuggestions = [];
let randomModeStats = { wins: 0, losses: 0 };
let globalStats = { totalVisits: 0 };
let dailyStats = { date: '', wins: 0, losses: 0 };

const particleContainer = document.querySelector('.particles');
const particleCount = window.innerWidth < 768 ? 30 : 60;

for(let i = 0; i < particleCount; i++){
  const p = document.createElement('div');
  p.className = 'particle';
  p.style.left = Math.random() * 100 + '%';
  p.style.animationDelay = (Math.random() * 10) + 's';
  const size = Math.random() * 3 + 2;
  p.style.width = p.style.height = size + 'px';
  p.style.opacity = Math.random() * 0.5 + 0.3;
  particleContainer.appendChild(p);
}

function compareAttributes(val1, val2){
  const arr1 = Array.isArray(val1) ? val1 : [val1];
  const arr2 = Array.isArray(val2) ? val2 : [val2];
  if (arr1.length === arr2.length && arr1.every(v => arr2.includes(v))) return 'correct';
  if (arr1.some(v => arr2.includes(v))) return 'close';
  return 'incorrect';
}

function loadStats(){
  const savedGlobal = localStorage.getItem('lotmGlobalStats');
  if(savedGlobal) globalStats = JSON.parse(savedGlobal);
  else globalStats.totalVisits = 1;
  globalStats.totalVisits++;
  localStorage.setItem('lotmGlobalStats', JSON.stringify(globalStats));

  const today = new Date().toISOString().split('T')[0];
  const savedDaily = localStorage.getItem('lotmDailyStats');
  if(savedDaily){
    dailyStats = JSON.parse(savedDaily);
    if(dailyStats.date !== today){
      dailyStats = { date: today, wins: 0, losses: 0 };
    }
  } else {
    dailyStats = { date: today, wins: 0, losses: 0 };
  }
}

function saveStats(){
  localStorage.setItem('lotmGlobalStats', JSON.stringify(globalStats));
  localStorage.setItem('lotmDailyStats', JSON.stringify(dailyStats));
}

function getCharacterOfTheDay(){
  const today = new Date().toISOString().split('T')[0];
  let seed = 0;
  for(let i = 0; i < today.length; i++){
    seed = ((seed << 5) - seed) + today.charCodeAt(i);
    seed = seed & seed;
  }
  const random = Math.abs(Math.sin(seed)) % 1;
  return CHARACTERS[Math.floor(random * CHARACTERS.length)];
}

function getRandomCharacter(){
  return CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
}

function switchMode(mode){
  currentMode = mode;
  guesses = [];
  gameWon = false;
  gameOver = false;
  
  document.getElementById('dailyBtn').classList.toggle('active', mode === 'daily');
  document.getElementById('dailyBtn').classList.toggle('inactive', mode !== 'daily');
  document.getElementById('randomBtn').classList.toggle('active', mode === 'random');
  document.getElementById('randomBtn').classList.toggle('inactive', mode !== 'random');

  targetChar = (mode === 'daily') ? getCharacterOfTheDay() : getRandomCharacter();
  renderGame();
}

function init(){
  targetChar = (currentMode === 'daily') ? getCharacterOfTheDay() : getRandomCharacter();
  guesses = [];
  gameWon = false;
  gameOver = false;
  renderGame();
}

function updateStats(){
  if(currentMode === 'random'){
    document.getElementById('statsDisplay').textContent = `Session: ${randomModeStats.wins}W - ${randomModeStats.losses}L`;
  } else {
    document.getElementById('statsDisplay').textContent = '';
  }
  
  const globalText = `Total Visits: ${globalStats.totalVisits} | Daily: ${dailyStats.wins}W - ${dailyStats.losses}L`;
  document.getElementById('globalStats').textContent = globalText;
}

function renderGame(){
  const statusDiv = document.getElementById('gameStatus');
  statusDiv.innerHTML = '';

  if (gameWon){
    statusDiv.innerHTML = `<div class="status-message bg-green-600 p-4 rounded-lg text-xl font-bold">🎉 Congratulations! You found ${targetChar.name}!</div>`;
    if(currentMode === 'random') randomModeStats.wins++;
    dailyStats.wins++;
    saveStats();
  }
  else if (gameOver){
    statusDiv.innerHTML = `<div class="status-message bg-red-600 p-4 rounded-lg text-xl font-bold">💀 Game Over! The character was ${targetChar.name}</div>`;
    if(currentMode === 'random') randomModeStats.losses++;
    dailyStats.losses++;
    saveStats();
  }

  updateStats();

  document.getElementById('inputSection').style.display = (gameWon || gameOver) ? 'none' : 'block';

  const container = document.getElementById('guessesContainer');
  container.innerHTML = guesses.slice().reverse().map((guess, guessIdx) => {
    const cells = ATTRIBUTES.map((attr, attrIdx) => {
      const guessValue = guess[attr.key];
      const targetValue = targetChar[attr.key];

      const isEmpty = guessValue === -1 || guessValue === 'None';
      const isTargetEmpty = targetValue === -1 || targetValue === 'None';

      let colorStatus = 'incorrect', displayValue = '❌';

      if (isEmpty){
        displayValue = '❌';
        colorStatus = isTargetEmpty ? 'correct' : 'incorrect';
      } else {
        displayValue = Array.isArray(guessValue) ? guessValue.join(', ') : guessValue;
        colorStatus = compareAttributes(guessValue, targetValue);
      }

      const delay = guessIdx * 100 + attrIdx * 80;
      const bgClass = colorStatus;

      return `
        <div class="attribute-cell">
          <div class="cell-inner" style="animation-delay:${delay}ms">
            <div class="cell-front">
              <div class="cell-label">${attr.label}</div>
              <div style="font-size:20px;margin-top:8px;">?</div>
            </div>
            <div class="cell-back ${bgClass}">
              <div class="cell-label">${attr.label}</div>
              <div class="cell-value">${displayValue}</div>
              ${colorStatus === 'correct' ? '<div class="checkmark">✓</div>' : ''}
            </div>
          </div>
        </div>`;
    }).join('');

    return `
      <div class="guess-card p-3 rounded-lg">
        <div class="font-bold text-yellow-300 mb-3 text-lg">${guess.name}</div>
        <div class="grid grid-cols-4 md:grid-cols-7 gap-2">${cells}</div>
      </div>`;
  }).join('');

  setTimeout(() => {
    document.querySelectorAll('.cell-inner').forEach(cell => cell.classList.add('flipped'));
  }, 100);

  const resetSection = document.getElementById('resetSection');
  resetSection.innerHTML = (gameWon || gameOver)
    ? `<button onclick="init()" class="bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 px-6 rounded-lg">${currentMode === 'random' ? '🎲 Next Round' : '🔄 New Game'}</button>`
    : '';

  document.getElementById('counter').textContent = `${guesses.length}/20`;
}

function handleGuess(){
  const input = document.getElementById('guessInput');
  const val = input.value.trim().toLowerCase();
  const error = document.getElementById('errorMessage');
  error.textContent = '';

  if(!val) return;

  let guessedChar = CHARACTERS.find(c => c.name.toLowerCase() === val);
  if(!guessedChar && currentSuggestions.length > 0)
    guessedChar = currentSuggestions[0];

  if(!guessedChar){
    error.textContent = 'Character not found!';
    return;
  }

  if(guesses.find(g => g.id === guessedChar.id)){
    error.textContent = 'You already tried this character!';
    return;
  }

  guesses.push(guessedChar);
  input.value = '';
  document.getElementById('suggestions').classList.add('hidden');

  if (guessedChar.name === targetChar.name) {
    gameWon = true;
  }
  else if(guesses.length >= 20) gameOver = true;

  renderGame();
}

function updateSuggestions() {
  const inputVal = document.getElementById('guessInput').value.toLowerCase();
  const suggestionsDiv = document.getElementById('suggestions');
  if (!inputVal) return suggestionsDiv.classList.add('hidden');

  currentSuggestions = CHARACTERS
    .filter(c => !guesses.find(g => g.id === c.id))
    .filter(c => {
      return c.name.toLowerCase().split(' ').some(word => word.startsWith(inputVal));
    })
    .slice(0, 5);

  if (currentSuggestions.length === 0)
    return suggestionsDiv.classList.add('hidden');

  suggestionsDiv.innerHTML = currentSuggestions
    .map(c => `<div onclick="selectCharacter('${c.name}')" class="px-4 py-2 text-white hover:bg-purple-600 cursor-pointer">${c.name}</div>`)
    .join('');

  suggestionsDiv.classList.remove('hidden');
}

function selectCharacter(name){
  document.getElementById('guessInput').value = name;
  document.getElementById('suggestions').classList.add('hidden');
  handleGuess();
}

document.getElementById('guessBtn').addEventListener('click', handleGuess);
document.getElementById('guessInput').addEventListener('input', updateSuggestions);
document.getElementById('guessInput').addEventListener('keypress', e => { if(e.key === 'Enter') handleGuess(); });

loadStats();
init();