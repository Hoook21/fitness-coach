const views = document.querySelectorAll('.view');
const navButtons = document.querySelectorAll('.bottom-nav button');
const sheet = document.querySelector('#sheet');
const backdrop = document.querySelector('#sheetBackdrop');
const sheetContent = document.querySelector('#sheetContent');
const toast = document.querySelector('#toast');

const details = {
  readiness: ['Tagesform', '82', 'Deine Tagesform kombiniert Schlaf, Erholung und Trainingsbelastung. Heute liegen alle drei Werte im grünen Bereich.'],
  sleep: ['Schlaf', '7h 42m', 'Du hast 24 Minuten länger als dein 14-Tage-Mittel geschlafen. Die Schlafdauer unterstützt dein heutiges Training.'],
  recovery: ['Erholung', '72 HRV', 'Deine Herzratenvariabilität liegt leicht über deinem persönlichen Basiswert. Das spricht für gute Erholung.'],
  load: ['Trainingsbelastung', '1.1', 'Das Verhältnis aus akuter und chronischer Belastung liegt im optimalen Zielkorridor von 0.8 bis 1.2.'],
  workout: ['Heutiges Training', '45 Min', 'Lockerer Dauerlauf in GA1 bei ungefähr 120–140 bpm. Laufe so entspannt, dass du dich noch gut unterhalten könntest.']
};

function switchView(id) {
  views.forEach(view => view.classList.toggle('active', view.id === id));
  navButtons.forEach(button => button.classList.toggle('active', button.dataset.view === id));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openSheet(key) {
  const [title, value, copy] = details[key];
  sheetContent.innerHTML = `<p class="eyebrow">Athlete OS Analyse</p><h2>${title}</h2><div class="big-value">${value}</div><p>${copy}</p>`;
  sheet.classList.add('open');
  backdrop.classList.add('open');
}

function closeSheet() {
  sheet.classList.remove('open');
  backdrop.classList.remove('open');
}

navButtons.forEach(button => button.addEventListener('click', () => switchView(button.dataset.view)));
document.querySelectorAll('[data-sheet]').forEach(button => button.addEventListener('click', () => openSheet(button.dataset.sheet)));
document.querySelector('#sheetClose').addEventListener('click', closeSheet);
backdrop.addEventListener('click', closeSheet);
document.querySelector('#alerts').addEventListener('click', () => {
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
});
document.querySelector('#coachQuestion').addEventListener('click', () => openSheet('readiness'));

if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
