const questionEl = document.getElementById('quizQuestion');
const answersEl = document.getElementById('quizAnswers');
const statusEl = document.getElementById('quizStatus');
const nextBtn = document.getElementById('quizNext');
const roomInput = document.getElementById('quizRoomInput');
const joinBtn = document.getElementById('quizJoinRoom');

const questions = [
  { q: 'Welke taal voert een browser normaal gesproken uit?', a: ['HTML', 'JavaScript', 'CSS', 'JSON'], correct: 1 },
  { q: 'Hoeveel letters heeft het woord “socket”?', a: ['5', '6', '7', '8'], correct: 2 },
  { q: 'Wat is de snelste manier om een game in JavaScript te laten herhalen?', a: ['setInterval', 'alert', 'prompt', 'console.log'], correct: 0 },
  { q: 'Welk element wordt gebruikt voor een HTML-knop?', a: ['<input>', '<button>', '<div>', '<label>'], correct: 1 }
];

let index = 0;
const multiplayer = window.GameMultiplayer.createMultiplayerController({
  gameName: 'QuizDuel',
  onRoomState: (payload) => {
    if (!payload || !payload.state || !payload.state.index) return;
    index = payload.state.index;
    renderQuestion();
  }
});

function renderQuestion() {
  const current = questions[index % questions.length];
  questionEl.textContent = current.q;
  answersEl.innerHTML = '';
  current.a.forEach((answer, answerIndex) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'answer-btn';
    button.textContent = answer;
    button.addEventListener('click', () => {
      const isRight = answerIndex === current.correct;
      statusEl.textContent = isRight ? 'Correct! Je wint de vraag.' : 'Niet juist, probeer de volgende.';
      multiplayer.sendState({ index, answer, correct: isRight });
    });
    answersEl.appendChild(button);
  });
}

nextBtn.addEventListener('click', () => {
  index = (index + 1) % questions.length;
  multiplayer.sendState({ index });
  renderQuestion();
});

joinBtn.addEventListener('click', () => {
  multiplayer.joinRoom(roomInput.value.trim() || 'QUIZ1');
});

renderQuestion();
