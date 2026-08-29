// ====================== Banca domande & scenari ======================
const EMBEDDED_QUESTIONS = [];
const SCENARIOS_KEY = "pl300_scenarios_v1";
const EXTERNAL_BANK_KEY = "pl300_external_bank_v1";

// Rileva se il dispositivo è principalmente touch (mobile/tablet)
const IS_TOUCH_DEVICE = (
  'ontouchstart' in window ||
  navigator.maxTouchPoints > 0 ||
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
);

// File JSON di banca domande pre-caricati sul server
const SERVER_BANK_FILES = [
  "Domande/JSON uniti/Topic 1.json",
  "Domande/JSON uniti/Topic 2.json",
  "Domande/JSON uniti/Topic 3.json",
  "Domande/JSON uniti/Topic 4.json",
  "Domande/JSON uniti/Topic 5.json",
  "Domande/JSON uniti/Topic 6.json",
  "Domande/JSON uniti/Topic 7.json",
  "Domande/JSON uniti/Topic 8.json",
  "Domande/JSON uniti/Topic 9.json",
  "Domande/JSON uniti/Topic 10.json",
  "Domande/JSON uniti/Topic 11.json",
  "Domande/JSON uniti/Topic 12.json",
  "Domande/JSON uniti/Topic 13.json",
  "Domande/JSON uniti/Topic 14.json"
];

let SCENARIOS = loadJSONSafe(SCENARIOS_KEY, {});
let QUESTIONS = loadJSONSafe(EXTERNAL_BANK_KEY, null);

// Inizializzazione asincrona della banca dal server se non esiste ancora
async function ensureQuestionsLoaded() {
  // Se QUESTIONS è già presente in localStorage, non fare nulla
  if (QUESTIONS && Array.isArray(QUESTIONS) && QUESTIONS.length > 0) {
    return;
  }

  try {
    // Prova a caricare i file JSON dal server
    await loadServerBankFiles();
    const loaded = loadJSONSafe(EXTERNAL_BANK_KEY, null);
    if (loaded && Array.isArray(loaded) && loaded.length > 0) {
      QUESTIONS = loaded;
      SCENARIOS = loadJSONSafe(SCENARIOS_KEY, {});
      return;
    }
  } catch (e) {
    console.error("Errore nel caricamento della banca dal server:", e);
  }

  // Fallback: se ancora vuoto, usa EMBEDDED_QUESTIONS (anche se al momento è vuoto)
  QUESTIONS = EMBEDDED_QUESTIONS || [];
  SCENARIOS = loadJSONSafe(SCENARIOS_KEY, {});
}

function loadJSONSafe(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch (e) {
    return fallback;
  }
}

function normalizeScenarios(rawScenarios) {
  if (!rawScenarios) return {};
  if (Array.isArray(rawScenarios)) {
    const map = {};
    rawScenarios.forEach(sc => {
      const key = sc.scenario_id || sc.scenarioId || sc.id;
      if (key) {
        map[key] = {
          title: sc.title,
          text: sc.text,
          media: sc.media || []
        };
      }
    });
    return map;
  }
  return rawScenarios;
}

function loadExternalBank(jsonObj) {
  if (!jsonObj.questions || !Array.isArray(jsonObj.questions)) {
    throw new Error("Il file deve contenere un array 'questions'.");
  }
  QUESTIONS = jsonObj.questions;
  SCENARIOS = normalizeScenarios(jsonObj.scenarios);
  localStorage.setItem(EXTERNAL_BANK_KEY, JSON.stringify(QUESTIONS));
  localStorage.setItem(SCENARIOS_KEY, JSON.stringify(SCENARIOS));
}

function resetToEmbeddedBank(){
  if (!confirm("Svuotare la banca dei quiz? Verranno rimosse tutte le domande caricate esternamente e gli scenari. Continuare?")) {
    return; // annulla se l'utente clicca "Annulla"
  }

  QUESTIONS = EMBEDDED_QUESTIONS;
  SCENARIOS = {};
  localStorage.removeItem(EXTERNAL_BANK_KEY);
  localStorage.removeItem(SCENARIOS_KEY);
}

// Carica i file JSON di banca dal server e li unisce in un'unica banca
async function loadServerBankFiles() {
  if (!SERVER_BANK_FILES || SERVER_BANK_FILES.length === 0) return;

  const responses = await Promise.all(
    SERVER_BANK_FILES.map(path =>
      fetch(path).then(r => {
        if (!r.ok) throw new Error("Errore nel caricamento di " + path + " (HTTP " + r.status + ")");
        return r.json();
      })
    )
  );

  // Usa già mergeBankFiles per unire le banche
  mergeBankFiles(responses, false);
}

function mergeBankFiles(fileContents, appendToExisting) {
  let mergedQuestions = appendToExisting ? QUESTIONS.slice() : [];
  let mergedScenarios = appendToExisting ? Object.assign({}, SCENARIOS) : {};
  let nextId = mergedQuestions.reduce((max, q) => Math.max(max, q.id || 0), 0) + 1;

  fileContents.forEach(jsonObj => {
    if (!jsonObj.questions || !Array.isArray(jsonObj.questions)) {
      throw new Error("Uno dei file non contiene un array 'questions' valido.");
    }
    const scMap = normalizeScenarios(jsonObj.scenarios);
    Object.keys(scMap).forEach(k => {
      mergedScenarios[k] = scMap[k];
    });

    jsonObj.questions.forEach(q => {
      const newQ = Object.assign({}, q, { id: nextId });
      nextId++;
      mergedQuestions.push(newQ);
    });
  });

  QUESTIONS = mergedQuestions;
  SCENARIOS = mergedScenarios;
  localStorage.setItem(EXTERNAL_BANK_KEY, JSON.stringify(QUESTIONS));
  localStorage.setItem(SCENARIOS_KEY, JSON.stringify(SCENARIOS));
}

function handleBankUpload(ev) {
  const files = Array.from(ev.target.files || []);
  if (files.length === 0) return;

  const hasExisting = !!localStorage.getItem(EXTERNAL_BANK_KEY);
  let appendToExisting = false;
  if (hasExisting) {
    appendToExisting = confirm(
      "Hai già una banca quiz esterna caricata (" +
      QUESTIONS.length +
      " domande).\n\nOK = Aggiungi questi nuovi file a quelli esistenti\nAnnulla = Sostituisci tutto con solo questi nuovi file"
    );
  }

  const readers = files.map(file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        resolve(JSON.parse(e.target.result));
      } catch (err) {
        reject(new Error("Errore nel file " + file.name + ": " + err.message));
      }
    };
    reader.onerror = () => reject(new Error("Impossibile leggere il file " + file.name));
    reader.readAsText(file);
  }));

  Promise.all(readers).then(contents => {
    try {
      const countBefore = appendToExisting ? QUESTIONS.length : 0;
      mergeBankFiles(contents, appendToExisting);
      const added = QUESTIONS.length - countBefore;

      alert(
        "Banca quiz aggiornata: +" +
        added +
        " domande da " +
        files.length +
        " file. Totale: " +
        QUESTIONS.length +
        " domande."
      );

      clearSession();
      currentView = "home";
      render();
    } catch (err) {
      alert("Errore durante l'unione dei file: " + err.message);
    }
  }).catch(err => {
    alert(err.message);
  });
}

// ====================== Chiavi storage ======================
const STORAGE_KEY = "pl300_session_v1";
const HISTORY_KEY = "pl300_history_v1";
const SRS_KEY = "pl300_srs_v1";
const THEME_KEY = "pl300_theme_v1"; // "light" | "dark" | "auto"
const FLAG_FREQ_KEY = "pl300_flag_freq_v1"; // {qid: count}

// ====================== Tema chiaro/scuro ======================
function applyTheme() {
  const pref = localStorage.getItem(THEME_KEY) || "auto";
  let effective = pref;
  if (pref === "auto") {
    effective = (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches)
      ? "light"
      : "dark";
  }
  document.documentElement.setAttribute("data-theme", effective);
}
function setTheme(pref) {
  localStorage.setItem(THEME_KEY, pref);
  applyTheme();
  render();
}
if (window.matchMedia) {
  window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => {
    const pref = localStorage.getItem(THEME_KEY) || "auto";
    if (pref === "auto") applyTheme();
  });
}
applyTheme();

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function loadJSON(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch (e) {
    return fallback;
  }
}
function saveJSON(key, obj) {
  localStorage.setItem(key, JSON.stringify(obj));
}

// ====================== History & SRS ======================
let history = loadJSON(HISTORY_KEY, {});
let srs = loadJSON(SRS_KEY, {});
let flagFreq = loadJSON(FLAG_FREQ_KEY, {});

function ensureSrs(qid) {
  if (!srs[qid]) srs[qid] = { box: 1, dueAt: Date.now() };
}
function srsUpdate(qid, correct) {
  ensureSrs(qid);
  const boxIntervals = [0, 1, 3, 7, 14, 30]; // days per box 1..5
  if (correct) {
    srs[qid].box = Math.min(5, srs[qid].box + 1);
  } else {
    srs[qid].box = 1;
  }
  const days = boxIntervals[srs[qid].box];
  srs[qid].dueAt = Date.now() + days * 24 * 60 * 60 * 1000;
  saveJSON(SRS_KEY, srs);
}
function isDue(qid) {
  ensureSrs(qid);
  return srs[qid].dueAt <= Date.now();
}

function recordAnswer(qid, correct) {
  if (!history[qid]) {
    history[qid] = { seen: 0, wrong: 0, lastResult: null, lastSeenAt: 0 };
  }
  history[qid].seen++;
  if (!correct) history[qid].wrong++;
  history[qid].lastResult = correct;
  history[qid].lastSeenAt = Date.now();
  saveJSON(HISTORY_KEY, history);
  srsUpdate(qid, correct);
}

function topicStats() {
  const topics = {};
  QUESTIONS.forEach(q => {
    if (!topics[q.topic]) {
      topics[q.topic] = { total: 0, seen: 0, correct: 0, wrong: 0 };
    }
    topics[q.topic].total++;
    const h = history[q.id];
    if (h && h.seen > 0) {
      topics[q.topic].seen++;
      if (h.lastResult) topics[q.topic].correct++;
      else topics[q.topic].wrong++;
    }
  });
  return topics;
}

function wrongQuestionIds() {
  return Object.keys(history)
    .filter(id => history[id].lastResult === false)
    .map(Number);
}

function dueSrsIds() {
  return QUESTIONS.map(q => q.id).filter(id => {
    ensureSrs(id);
    return isDue(id);
  });
}

// ---------------- Session management ----------------
let session = loadJSON(STORAGE_KEY, null);

// Assicura che session.tapSelect esista (per il tap-to-move su mobile)
if (session && !session.tapSelect) {
  session.tapSelect = {};
}

function newSession(
  mode,
  topicFilters,
  domainFilters,
  typeFilters,
  count
) {
  let pool = QUESTIONS.slice();

  // Array vuoto = nessun filtro topic.
  if (Array.isArray(topicFilters) && topicFilters.length > 0) {
    pool = pool.filter(q =>
      topicFilters.includes(String(q.topic))
    );
  }

  // Array vuoto = nessun filtro domain.
  if (Array.isArray(domainFilters) && domainFilters.length > 0) {
    pool = pool.filter(q =>
      domainFilters.includes(questionDomain(q))
    );
  }

  // Array vuoto = nessun filtro tipologia.
  if (Array.isArray(typeFilters) && typeFilters.length > 0) {
    pool = pool.filter(q =>
      typeFilters.includes(q.type)
    );
  }

  if (mode === "wrong") {
    const wrongIds = wrongQuestionIds();
    pool = pool.filter(q => wrongIds.includes(q.id));
  } else if (mode === "srs") {
    const dueIds = dueSrsIds();
    pool = pool.filter(q => dueIds.includes(q.id));
  }

  pool = shuffleArray(pool);

  if (count > 0 && count < pool.length) {
    pool = pool.slice(0, count);
  }

  session = {
    mode,
    topicFilter: topicFilters,
    domainFilter: domainFilters,
    typeFilter: typeFilters,
    ids: pool.map(q => q.id),
    current: 0,
    answers: {},
    tempSingle: {},
    tempMulti: {},
    startedAt: Date.now(),
    paused: false,
    pausedAt: null,
    phase: "quiz",
    dragState: {},
    tapSelect: {},
    flags: {},
    reviewMode: false,
    isExam: false
  };

  persist();
}

function clearSession() {
  session = null;
  localStorage.removeItem(STORAGE_KEY);
}

function persist() {
  saveJSON(STORAGE_KEY, session);
}

// ---------------- Rendering ----------------
const appEl = document.getElementById("app");

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Navbar con tema
function topNavHtml() {
  const pref = localStorage.getItem(THEME_KEY) || "auto";
  return `
    <div class="app-top-nav">
      <div class="app-top-nav-left">
        <div class="app-logo">PL</div>
        <div>
          <div class="app-title">PL-300 Quiz Trainer</div>
          <div class="app-subtitle">
            ${QUESTIONS.length} domande · ${localStorage.getItem(EXTERNAL_BANK_KEY) ? "📦 Banca esterna" : "📋 Banca integrata"}
          </div>
        </div>
      </div>
      <div class="app-top-nav-right">
        <button class="btn btn-outline" onclick="goHome()">🏠 Home</button>
        <button class="btn btn-outline" onclick="goExplanations()">📖 Spiegazioni</button>
        <button class="btn btn-outline" onclick="setTheme('light')">☀️ Chiaro</button>
        <button class="btn btn-outline" onclick="setTheme('dark')">🌙 Scuro</button>
        <button class="btn btn-primary" onclick="setTheme('auto')">🖥️ Auto</button>
      </div>
    </div>
  `;
}

function goHome() {
  if (session && !session.paused) {
    if (!confirm("Tornare alla home abbandonerà il test in corso. Continuare?")) {
      return;
    }
    clearSession();
  }
  currentView = "home";
  render();
}

function goExplanations() {
  currentView = "explanations";
  render();
}

let currentView = "home";

function render() {
  if (currentView === "explanations" && (!session || session.paused)) {
    renderExplanations();
    return;
  }
  if (session && session.paused && currentView === "home") {
    renderHome();
  } else if (!session) {
    renderHome();
  } else if (session.phase === "quiz") {
    renderQuiz();
  } else if (session.phase === "review") {
    renderReview();
  } else if (session.phase === "done") {
    renderResults();
  }

  // Se non siamo più in quiz, pulisci il timer live
  if (!session || session.phase !== "quiz") {
    if (session && session._liveTimerInterval) {
      clearInterval(session._liveTimerInterval);
      session._liveTimerInterval = null;
    }
  }
}

function topicLabel(t) {
  const labels = {
    1: "Prepare Data",
    2: "Model Data",
    3: "Visualize Data",
    4: "Deploy & Maintain",
    5: "Case Study A",
    6: "Case Study B",
    7: "Case Study C",
    8: "Case Study Litware",
    9: "Case Study Northwind",
    10: "Case Study D",
    11: "Case Study E",
    12: "Case Study F",
    13: "Case Study G",
    14: "Case Study Contoso"
  };
  return "Topic " + t + (labels[t] ? " – " + labels[t] : "");
}

// ====================== HOME ======================
function renderHome() {
  // Se per qualche motivo QUESTIONS non è ancora inizializzata correttamente
  if (!QUESTIONS || !Array.isArray(QUESTIONS)) {
    appEl.innerHTML = `
      ${topNavHtml()}
      <div class="view-card">
        <div class="section-header">
          <div class="section-title">PL-300 Quiz Trainer</div>
          <div class="section-subtitle">
            Nessuna banca quiz caricata. Verifica il caricamento automatico dei file JSON o usa la sezione "Banca quiz (JSON esterno)".
          </div>
        </div>
      </div>
    `;
    return;
  }
  const topics = topicStats();
  const topicIds = Object.keys(topics).map(Number).sort((a, b) => a - b);
  const wrongCount = wrongQuestionIds().length;
  const dueCount = dueSrsIds().length;
  const hasPausedSession = !!(session && session.paused);
  const hasPausedExam = hasPausedSession && session.isExam;
  const hasPausedNonExam = hasPausedSession && !session.isExam;
  const criticalCount = QUESTIONS.filter(q => {
    ensureSrs(q.id);
    return srs[q.id].box <= 2;
  }).length;

  let topicOptions = '<option value="all">Tutti i topic</option>';

  topicIds.forEach(t => {
    topicOptions += `
      <option value="${t}">
        ${topicLabel(t)} (${topics[t].total})
      </option>
    `;
  });

  let statsRows = "";
  let globalCorrect = 0, globalWrong = 0, globalSeen = 0;
  topicIds.forEach(t => {
    const s = topics[t];
    globalCorrect += s.correct;
    globalWrong += s.wrong;
    globalSeen += s.seen;
    const pctCorrect = s.seen ? Math.round(100 * s.correct / s.seen) : null;
    const pctWrong = s.seen ? Math.round(100 * s.wrong / s.seen) : null;
    statsRows += `
      <div class="topic-row">
        <span>${topicLabel(t)}</span>
        <span class="small">
          ${s.seen}/${s.total} svolte
          ${pctCorrect !== null ? `· ✅ ${s.correct} (${pctCorrect}%) · ❌ ${s.wrong} (${pctWrong}%)` : ""}
        </span>
      </div>`;
  });
  const globalPctCorrect = globalSeen ? Math.round(100 * globalCorrect / globalSeen) : 0;
  const globalPctWrong = globalSeen ? Math.round(100 * globalWrong / globalSeen) : 0;

  appEl.innerHTML = `
    ${topNavHtml()}
    <div class="view-card">
      <div class="section-header">
        <div class="section-title">PL-300 Quiz Trainer</div>
        <div class="section-subtitle">
          ${QUESTIONS.length} domande disponibili
          <span class="source-badge">
            ${localStorage.getItem(EXTERNAL_BANK_KEY) ? "📦 Banca esterna caricata" : "📋 Banca integrata"}
          </span>
          · Solo su questo PC (localStorage, nessun backend)
        </div>
      </div>
    </div>

    <!-- Banca quiz (JSON esterno) -->
    <div class="view-card section-spaced">
      <div class="section-header">
        <div class="section-title">📥 Banca quiz (JSON esterno)</div>
        <div class="section-subtitle">
          Carica o integra i file JSON dei vari topic (anche più file alla volta).
        </div>
      </div>

      <div class="card">
        <div class="upload-zone" onclick="document.getElementById('bankFileInput').click()">
          📂 Clicca per selezionare uno o più file JSON (es. tutti i file di un topic insieme)
        </div>

        <div style="margin-top:10px">
          <button class="btn secondary" onclick="document.getElementById('bankFileInput').click()">
            ➕ Carica altri topic / quiz
          </button>
          ${localStorage.getItem(EXTERNAL_BANK_KEY)
            ? '<button class="btn secondary" style="margin-left:8px" onclick="resetToEmbeddedBank(); render();">↩ Svuota banca dei quiz</button>'
            : ""}
        </div>

        <input
          type="file"
          id="bankFileInput"
          accept="application/json"
          multiple
          style="display:none"
          onchange="handleBankUpload(event)"
        >
      </div>
    </div>

    <!-- Nuovo test (pratica libera) -->
    <div class="view-card section-spaced">
      <div class="section-header">
        <div class="section-title">📝 Nuovo test (pratica libera)</div>
        <div class="section-subtitle">
          Configura e avvia un test personalizzato per argomento e numero di domande.
        </div>
      </div>

      <div class="card">
        <div class="grid">
  <div>
    <label class="small">Topic</label><br>
    <select
      id="topicSelect"
      multiple
      size="5"
      style="width:100%"
      onchange="updatePracticeDomainFilter()"
    >
      ${topicOptions}
    </select>
    <div class="small" style="margin-top:5px">
      Puoi selezionare più topic.
    </div>
  </div>

  <div>
    <label class="small">Domain</label><br>
    <select
      id="domainSelect"
      multiple
      size="5"
      style="width:100%"
      onchange="updatePracticeTypeFilter()"
    >
      <option value="all">Tutti i domain</option>
      <option value="prepare">Prepare</option>
      <option value="model">Model</option>
      <option value="visualize">Visualize</option>
      <option value="deploy">Deploy</option>
    </select>
    <div class="small" style="margin-top:5px">
      Mostra solo i domain disponibili nei topic scelti.
    </div>
  </div>

  <div>
    <label class="small">Tipologia domanda</label><br>
    <select
      id="typeSelect"
      multiple
      size="5"
      style="width:100%"
    >
      <option value="all">Tutte le tipologie</option>
      <option value="single">Scelta singola</option>
      <option value="multi">Risposta multipla</option>
      <option value="yesno">Yes / No</option>
      <option value="dragdrop">Drag & drop</option>
      <option value="dropdown">Dropdown</option>
      <option value="hotspot">Hotspot Yes / No</option>
      <option value="hotspot_image">Hotspot immagine</option>
      <option value="casestudy">Case study</option>
    </select>
    <div class="small" style="margin-top:5px">
      Mostra solo le tipologie disponibili nei filtri scelti.
    </div>
  </div>

  <div>
    <label class="small">Numero domande (0 = tutte)</label><br>
    <input type="text" id="countInput" value="20" style="width:100%">
  </div>
</div>
                <div style="margin-top:14px">
          <button class="btn" onclick="startNew('normal')">▶ Avvia test</button>
          <button class="btn warn" onclick="startNew('wrong')" ${wrongCount === 0 ? "disabled" : ""}>
            ❌ Solo domande errate (${wrongCount})
          </button>
          <button class="btn secondary" onclick="startNew('srs')" ${dueCount === 0 ? "disabled" : ""}>
            🔁 Ripasso spaced repetition (${dueCount} pronte)
          </button>
        </div>
        ${hasPausedNonExam ? `
          <div style="margin-top:14px">
            <button class="btn warn" onclick="resumeSession()">▶ Riprendi test in pausa</button>
            <button class="btn danger" onclick="cancelPausedSession()">✖ Annulla test in pausa</button>
          </div>
        ` : ''}
      </div>
    </div>

    <!-- Ripasso lampo pre-esame -->
    <div class="view-card section-spaced">
      <div class="section-header">
        <div class="section-title">⚡ Ripasso lampo pre-esame</div>
        <div class="section-subtitle">
          Ripasso mirato nei minuti prima dell'esame: priorità a errori, bandierine, domande Leitner critiche e ripassi SRS dovuti.
        </div>
      </div>

      <div class="card">
  <div class="grid">
    <div>
      <label class="small">
        Tempo limite (minuti, 0 = nessun limite)
      </label><br>

      <input
        type="text"
        id="flashMinutesInput"
        value="15"
        style="width:100%"
      >
    </div>

    <div>
      <label class="small">
        Numero domande (0 = tutte quelle disponibili)
      </label><br>

      <input
        type="text"
        id="flashCountInput"
        value="20"
        style="width:100%"
      >
    </div>

    <div>
      <label class="small">Priorità del ripasso</label><br>

      <select id="flashFocusSelect" style="width:100%">
        <option value="adaptive" selected>
          🎯 Adattivo consigliato
        </option>

        <option value="wrong">
          ❌ Solo domande errate
        </option>

        <option value="flagged">
          🚩 Solo domande contrassegnate
        </option>

        <option value="due">
          🔁 Solo SRS dovute
        </option>

        <option value="critical">
          ⚠️ Critiche Leitner 1–2
        </option>
      </select>
    </div>

    <div>
      <label class="small">Domain</label><br>

      <select id="flashDomainSelect" style="width:100%">
        <option value="all" selected>Tutti i domain</option>
        <option value="prepare">Prepare</option>
        <option value="model">Model</option>
        <option value="visualize">Visualize</option>
        <option value="deploy">Deploy</option>
      </select>
    </div>

    <div>
      <label class="small">Tipologia domanda</label><br>

      <select id="flashTypeSelect" style="width:100%">
        <option value="all" selected>Tutte le tipologie</option>
        <option value="single">Scelta singola</option>
        <option value="multi">Risposta multipla</option>
        <option value="yesno">Yes / No</option>
        <option value="dragdrop">Drag & drop</option>
        <option value="dropdown">Dropdown</option>
        <option value="hotspot">Hotspot Yes / No</option>
        <option value="hotspot_image">Hotspot immagine</option>
        <option value="casestudy">Case study</option>
      </select>
    </div>
  </div>

  <div
    class="small"
    style="margin-top:14px"
  >
    🎯 La modalità adattiva dà priorità a errori recenti,
    bandierine ricorrenti, domande Leitner 1–2 e ripassi SRS dovuti.
  </div>

  <div style="margin-top:14px">
    <button
      class="btn warn"
      onclick="startFlashReview()"
    >
      ⚡ Avvia ripasso lampo intelligente
    </button>
  </div>
</div>
    </div>

    <!-- Esame simulato a tempo -->
<div class="view-card section-spaced">
  <div class="section-header">
    <div class="section-title">🎓 Esame simulato Microsoft PL-300</div>
    <div class="section-subtitle">
      40–50 domande casuali · 100 minuti complessivi · revisione inclusa nel tempo totale.
    </div>
  </div>

  <div class="card">
    <div class="small">
      La distribuzione delle domande segue i quattro domini PL-300:
      Prepare, Model, Visualize &amp; Analyze, Manage &amp; Secure.
      Il numero di domande viene estratto casualmente a ogni nuovo esame.
    </div>

    <div style="margin-top:14px">
      <button class="btn warn" onclick="startExam()">
        🎓 Avvia esame simulato
      </button>
    </div>

    ${hasPausedExam ? `
      <div style="margin-top:14px">
        <button class="btn warn" onclick="resumeSession()">▶ Riprendi esame in pausa</button>
        <button class="btn danger" onclick="cancelPausedSession()">✖ Annulla esame in pausa</button>
      </div>
    ` : ''}
  </div>
</div>

    <!-- Statistiche globali -->
    <div class="view-card section-spaced">
      <div class="section-header">
        <div class="section-title">📊 Statistiche globali</div>
        <div class="section-subtitle">
          Riepilogo complessivo di tutte le domande svolte.
        </div>
      </div>

      <div class="card">
        <div class="grid">
          <div style="text-align:center">
            <div class="stat-value" style="color:var(--correct)">${globalCorrect}</div>
            <div class="stat-label">✅ Corrette (${globalPctCorrect}%)</div>
          </div>
          <div style="text-align:center">
            <div class="stat-value" style="color:var(--wrong)">${globalWrong}</div>
            <div class="stat-label">❌ Errate (${globalPctWrong}%)</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Statistiche per topic -->
    <div class="view-card section-spaced">
      <div class="section-header">
        <div class="section-title">📊 Statistiche per topic</div>
        <div class="section-subtitle">
          Dettaglio del tuo andamento per ciascun topic d'esame.
        </div>
      </div>

      <div class="card">
        ${statsRows || '<div class="small">Nessuna domanda ancora svolta.</div>'}
        <div style="margin-top:10px">
          <button class="btn secondary" onclick="resetStats()">Reset statistiche</button>
          <button class="btn secondary" onclick="exportProgress()">💾 Esporta progresso</button>
          <button class="btn secondary" onclick="document.getElementById('importFile').click()">📂 Importa progresso</button>
          <input
            type="file"
            id="importFile"
            accept="application/json"
            style="display:none"
            onchange="importProgress(event)"
          >
        </div>
      </div>
    </div>

    <!-- Legenda padronanza (spaced repetition) -->
    <div class="view-card section-spaced">
      <div class="section-header">
        <div class="section-title">🏷️ Legenda padronanza (spaced repetition)</div>
        <div class="section-subtitle">
          Ogni domanda ha una "scatola" Leitner da 1 a 5. Più è alta, meglio la padroneggi.
        </div>
      </div>

      <div class="card">
        ${leitnerLegendHtml()}
      </div>
    </div>

    <!-- Priorità di studio consigliata -->
    <div class="view-card section-spaced">
      <div class="section-header">
        <div class="section-title">🎯 Priorità di studio consigliata</div>
        <div class="section-subtitle">
          Indicazioni su quale dominio d'esame richiede più attenzione in base ai tuoi risultati.
        </div>
      </div>

      <div class="card">
        ${studyPriorityHtml()}
      </div>
    </div>

    <!-- Domande ricorrenti da rivedere -->
    <div class="view-card section-spaced">
      <div class="section-header">
        <div class="section-title">🚩 Domande ricorrenti da rivedere</div>
        <div class="section-subtitle">
          Domande che hai contrassegnato più volte come dubbie o difficili.
        </div>
      </div>

      <div class="card">
        ${recurrentFlagsHtml()}
      </div>
    </div>

    <!-- Storico punteggi -->
    <div class="view-card section-spaced">
      <div class="section-header">
        <div class="section-title">📈 Storico punteggi</div>
        <div class="section-subtitle">
          Andamento dei tuoi test ed esami simulati nel tempo.
        </div>
      </div>

        <div class="card">
    ${examHistoryHtml()}
    <button class="btn secondary" style="margin-top:10px" onclick="resetExamHistory()">
      Reset storico punteggi
    </button>
  </div>

    <!-- Info spaced repetition -->
    <div class="view-card section-spaced">
      <div class="section-header">
        <div class="section-title">ℹ️ Come funziona lo spaced repetition</div>
        <div class="section-subtitle">
          Spiegazione del sistema a scatole Leitner usato per il ripasso.
        </div>
      </div>

      <div class="card small">
        <b>Come funziona lo spaced repetition:</b> ogni domanda ha 5 "scatole" (Leitner).
        Se rispondi correttamente, la domanda passa alla scatola successiva e riappare dopo più tempo
        (1, 3, 7, 14, 30 giorni). Se sbagli, torna alla scatola 1 e riappare subito.
        Usa "Ripasso spaced repetition" per allenarti solo su ciò che è dovuto.
      </div>
    </div>
  `;
    updatePracticeDomainFilter();
}

window._trendPoints = [];

function scoreTrendSvg(log) {
  if (log.length < 2) {
    return '<div class="small">Servono almeno 2 test completati per vedere il grafico dell\'andamento.</div>';
  }
  const points = log.slice(-20);
  const w = 600, h = 180, pad = 30;
  const maxScore = 1000, minScore = 0;
  const stepX = (w - pad * 2) / (points.length - 1);
  const coords = points.map((entry, i) => {
    const x = pad + i * stepX;
    const y = h - pad - ((entry.scaledScore - minScore) / (maxScore - minScore)) * (h - pad * 2 - 10);
    return [x, y];
  });
  window._trendPoints = points.map((entry, i) => ({ ...entry, x: coords[i][0], y: coords[i][1] }));

  const pathD = coords.map((c, i) => (i === 0 ? "M" : "L") + c[0].toFixed(1) + "," + c[1].toFixed(1)).join(" ");
  const areaD = pathD + ` L${coords[coords.length - 1][0].toFixed(1)},${h - pad} L${coords[0][0].toFixed(1)},${h - pad} Z`;
  const passY = h - pad - ((700 - minScore) / (maxScore - minScore)) * (h - pad * 2 - 10);

  const dots = coords.map((c, i) => {
    const passed = points[i].scaledScore >= 700;
    return `<circle cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="5" fill="${passed ? '#2ea043' : '#f85149'}"
      stroke="var(--card)" stroke-width="1.5" style="cursor:pointer"
      onmouseenter="showTrendTooltip(event, ${i})" onmouseleave="hideTrendTooltip()" />`;
  }).join("");

  const yLabels = [0, 250, 500, 750, 1000].map(v => {
    const y = h - pad - (v / maxScore) * (h - pad * 2 - 10);
    return `<text x="${pad - 8}" y="${(y + 3).toFixed(1)}" text-anchor="end" font-size="10" fill="var(--muted)">${v}</text>`;
  }).join("");

  return `
    <div style="position:relative">
      <svg viewBox="0 0 ${w} ${h}" style="width:100%;height:180px">
        ${yLabels}
        <line x1="${pad}" y1="${passY}" x2="${w - pad}" y2="${passY}" stroke="var(--accent2)" stroke-dasharray="4,4" stroke-width="1"/>
        <text x="${w - pad}" y="${passY - 6}" text-anchor="end" font-size="11" fill="var(--accent2)">Soglia 700</text>
        <path d="${areaD}" fill="var(--accent)" opacity="0.08"/>
        <path d="${pathD}" fill="none" stroke="var(--accent)" stroke-width="2.5"/>
        ${dots}
      </svg>
      <div id="trendTooltip" class="small" style="display:none; position:absolute; background:var(--card2); border:1px solid var(--border); border-radius:6px; padding:6px 10px; pointer-events:none; white-space:nowrap; z-index:20;"></div>
    </div>
  `;
}

function showTrendTooltip(ev, i) {
  const pt = window._trendPoints[i];
  if (!pt) return;
  const tooltip = document.getElementById("trendTooltip");
  if (!tooltip) return;
  const d = new Date(pt.date);
  const dateStr = d.toLocaleDateString("it-IT") + " " + d.toLocaleTimeString("it-IT", { hour: '2-digit', minute: '2-digit' });
  tooltip.innerHTML = `<b>${pt.isExam ? '🎓 Esame' : '📝 Test'}</b><br>${dateStr}<br>Punteggio: ${pt.scaledScore}/1000<br>${pt.correctCount}/${pt.total} corrette (${pt.pct}%)`;
  const svgEl = ev.target.closest("svg");
  const rect = svgEl.getBoundingClientRect();
  const scaleX = rect.width / 600;
  const scaleY = rect.height / 180;
  tooltip.style.left = Math.min(rect.width - 140, pt.x * scaleX + 10) + "px";
  tooltip.style.top = Math.max(0, pt.y * scaleY - 60) + "px";
  tooltip.style.display = "block";
}
function hideTrendTooltip() {
  const tooltip = document.getElementById("trendTooltip");
  if (tooltip) tooltip.style.display = "none";
}

function examHistoryHtml() {
  const log = loadJSON("pl300_exam_log_v1", []);
  if (log.length === 0) return '<div class="small">Nessun test completato ancora.</div>';
  const trend = scoreTrendSvg(log);
  const recent = log.slice(-10).reverse();
  const rows = recent.map(entry => {
    const d = new Date(entry.date);
    const dateStr = d.toLocaleDateString("it-IT") + " " + d.toLocaleTimeString("it-IT", { hour: '2-digit', minute: '2-digit' });
    const passed = entry.scaledScore >= 700;
    return `<div class="topic-row">
      <span>${entry.isExam ? '🎓 Esame' : '📝 Test'} · ${dateStr}</span>
      <span class="small" style="color:${passed ? 'var(--correct)' : 'var(--wrong)'}">
        ${entry.scaledScore}/1000 · ${entry.correctCount}/${entry.total} (${entry.pct}%)
      </span>
    </div>`;
  }).join("");
  return trend + rows;
}

const QUESTION_TYPE_LABELS = {
  single: "Scelta singola",
  multi: "Risposta multipla",
  yesno: "Yes / No",
  dragdrop: "Drag & drop",
  dropdown: "Dropdown",
  hotspot: "Hotspot Yes / No",
  hotspot_image: "Hotspot immagine",
  casestudy: "Case study"
};

function availableQuestionTypesForFilters(topicValues, domainValues) {
  let pool = QUESTIONS.slice();

  // Prima restringe per topic selezionati.
  if (topicValues.length > 0) {
    pool = pool.filter(q =>
      topicValues.includes(String(q.topic))
    );
  }

  // Poi restringe per domain selezionati.
  if (domainValues.length > 0) {
    pool = pool.filter(q =>
      domainValues.includes(questionDomain(q))
    );
  }

  return [...new Set(pool.map(q => q.type))]
    .filter(Boolean)
    .sort();
}

function updatePracticeTypeFilter() {
  const topicValues = selectedValues("topicSelect");
  const domainValues = selectedValues("domainSelect");
  const typeSelect = document.getElementById("typeSelect");

  if (!typeSelect) {
    return;
  }

  const previouslySelected = Array.from(typeSelect.selectedOptions)
    .map(option => option.value)
    .filter(value => value !== "all");

  const availableTypes = availableQuestionTypesForFilters(
    topicValues,
    domainValues
  );

  typeSelect.innerHTML = `
    <option value="all">Tutte le tipologie</option>
    ${availableTypes.map(type => `
      <option
        value="${type}"
        ${previouslySelected.includes(type) ? "selected" : ""}
      >
        ${QUESTION_TYPE_LABELS[type] || type}
      </option>
    `).join("")}
  `;
}

function selectedValues(selectId) {
  const select = document.getElementById(selectId);

  if (!select) {
    return [];
  }

  return Array.from(select.selectedOptions)
    .map(option => option.value)
    .filter(value => value !== "all");
}

function availableDomainsForTopics(topicValues) {
  let pool = QUESTIONS.slice();

  if (topicValues.length > 0) {
    pool = pool.filter(q =>
      topicValues.includes(String(q.topic))
    );
  }

  return [...new Set(pool.map(q => questionDomain(q)))]
    .sort();
}

function domainLabel(domain) {
  const labels = {
    prepare: "Prepare",
    model: "Model",
    visualize: "Visualize",
    deploy: "Deploy"
  };

  return labels[domain] || domain;
}

function updatePracticeDomainFilter() {
  const topicValues = selectedValues("topicSelect");
  const domainSelect = document.getElementById("domainSelect");

  if (!domainSelect) {
    return;
  }

  const previouslySelected = Array.from(domainSelect.selectedOptions)
    .map(option => option.value)
    .filter(value => value !== "all");

  const availableDomains = availableDomainsForTopics(topicValues);

  domainSelect.innerHTML = `
    <option value="all">Tutti i domain</option>
    ${availableDomains.map(domain => `
      <option
        value="${domain}"
        ${previouslySelected.includes(domain) ? "selected" : ""}
      >
        ${domainLabel(domain)}
      </option>
    `).join("")}
  `;

  // Dopo l'aggiornamento dei domain disponibili, aggiorna
  // anche le tipologie disponibili.
  updatePracticeTypeFilter();
}

function startNew(mode) {
  const selectedTopics = selectedValues("topicSelect");
  const selectedDomains = selectedValues("domainSelect");
  const selectedTypes = selectedValues("typeSelect");

  const countRaw = document.getElementById("countInput")
    ? document.getElementById("countInput").value
    : "0";

  const count = parseInt(countRaw, 10) || 0;

  newSession(
    mode,
    selectedTopics,
    selectedDomains,
    selectedTypes,
    count
  );

  render();
}

const DOMAIN_WEIGHTS = {
  prepare: 0.275,
  model: 0.275,
  visualize: 0.275,
  deploy: 0.175
};

function normalizeDomain(value, topic) {
  const raw = String(value || "").trim().toLowerCase();

  if (raw === "prepare" || raw === "prepare data") {
    return "prepare";
  }

  if (raw === "model" || raw === "model data") {
    return "model";
  }

  if (
    raw === "visualize" ||
    raw === "visualise" ||
    raw === "visualize & analyze" ||
    raw === "visualize and analyze" ||
    raw === "visualize data"
  ) {
    return "visualize";
  }

  if (
    raw === "deploy" ||
    raw === "manage" ||
    raw === "deploy & maintain" ||
    raw === "manage and secure" ||
    raw === "deploy and maintain"
  ) {
    return "deploy";
  }

  // Fallback solo per eventuali domande senza campo domain valido.
  if (topic === 1) return "prepare";
  if (topic === 2) return "model";
  if (topic === 3) return "visualize";
  if (topic === 4) return "deploy";

  return "model";
}

function topicDomain(t) {
  if (t === 1) return "prepare";
  if (t === 2) return "model";
  if (t === 3) return "visualize";
  if (t === 4) return "deploy";

  // I case study (topic 5–14) sono distribuiti nel dominio indicato dal JSON,
  // se presente; il fallback è model.
  return "model";
}

function questionDomain(q) {
  return normalizeDomain(q.domain, q.topic);
}

function shuffleArray(arr) {
  const copy = arr.slice();

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

function examTargetCounts(total) {
  const domains = Object.keys(DOMAIN_WEIGHTS);
  const target = {};
  const decimals = [];
  let assigned = 0;

  domains.forEach(domain => {
    const exact = total * DOMAIN_WEIGHTS[domain];
    const whole = Math.floor(exact);

    target[domain] = whole;
    assigned += whole;

    decimals.push({
      domain,
      decimal: exact - whole
    });
  });

  decimals
    .sort((a, b) => b.decimal - a.decimal)
    .slice(0, total - assigned)
    .forEach(item => {
      target[item.domain]++;
    });

  return target;
}

function yesNoBlockKey(q) {
  return `yesno_${q.topic}_${q.scenarioId}`;
}

function groupYesNoQuestions(questions) {
  const blocks = [];
  const yesNoGroups = new Map();

  questions.forEach(q => {
    const isGroupedYesNo =
      q.type === "yesno" &&
      q.scenarioId !== null &&
      q.scenarioId !== undefined;

    if (!isGroupedYesNo) {
      blocks.push([q]);
      return;
    }

    const key = yesNoBlockKey(q);

    if (!yesNoGroups.has(key)) {
      yesNoGroups.set(key, []);
    }

    yesNoGroups.get(key).push(q);
  });

  yesNoGroups.forEach(group => blocks.push(group));

  return blocks;
}

function getRandomCaseStudyBlock() {
  const byTopic = {};

  QUESTIONS
    .filter(q => isCaseStudy(q.topic))
    .forEach(q => {
      if (!byTopic[q.topic]) {
        byTopic[q.topic] = [];
      }

      byTopic[q.topic].push(q);
    });

  const blocks = Object.values(byTopic).filter(
    block => block.length > 0
  );

  if (blocks.length === 0) {
    return null;
  }

  return shuffleArray(blocks)[0];
}

function blockDomainCounts(block) {
  const counts = {
    prepare: 0,
    model: 0,
    visualize: 0,
    deploy: 0
  };

  block.questions.forEach(q => {
    const domain = questionDomain(q);
    counts[domain]++;
  });

  return counts;
}

function blockFitsTargets(block, currentCounts, targetCounts) {
  const blockCounts = blockDomainCounts(block);

  return Object.keys(blockCounts).every(domain => {
    return currentCounts[domain] + blockCounts[domain] <= targetCounts[domain];
  });
}

function addBlock(selectedBlocks, selectedIds, currentCounts, block) {
  selectedBlocks.push(block);

  block.questions.forEach(q => {
    selectedIds.add(q.id);
    currentCounts[questionDomain(q)]++;
  });
}

function totalSelectedQuestions(selectedBlocks) {
  return selectedBlocks.reduce(
    (sum, b) => sum + b.questions.length,
    0
  );
}

function weightedExamSample(count) {
  const targets = examTargetCounts(count);

  const pools = {
    prepare: [],
    model: [],
    visualize: [],
    deploy: []
  };

  const caseTopics = {};

  // 1. Costruisce blocchi:
  // - Topic 1–4: una domanda per blocco.
  // - Topic 5–14: topic case study completo, indivisibile.
  QUESTIONS.forEach(q => {
    if (isCaseStudy(q.topic)) {
      const key = `case_topic_${q.topic}`;

      if (!caseTopics[key]) {
        caseTopics[key] = {
          type: "caseStudy",
          questions: []
        };
      }

      caseTopics[key].questions.push(q);
    } else {
      const domain = questionDomain(q);

      pools[domain].push({
        type: "normal",
        questions: [q]
      });
    }
  });

  Object.values(caseTopics).forEach(block => {
    const counts = blockDomainCounts(block);

    // Per scegliere il pool, usa il dominio più rappresentato nel blocco.
    // I contatori reali restano comunque calcolati domanda per domanda.
    const primaryDomain = Object.keys(counts)
      .sort((a, b) => counts[b] - counts[a])[0];

    pools[primaryDomain].push(block);
  });

  Object.keys(pools).forEach(domain => {
    pools[domain] = shuffleArray(pools[domain]);
  });

  const selectedBlocks = [];
  const selectedIds = new Set();

  const currentCounts = {
    prepare: 0,
    model: 0,
    visualize: 0,
    deploy: 0
  };

  // 2. Garantisce un case study completo.
  const mandatoryCaseQuestions = getRandomCaseStudyBlock();

  if (mandatoryCaseQuestions && mandatoryCaseQuestions.length <= count) {
    const mandatoryBlock = {
      type: "caseStudy",
      questions: mandatoryCaseQuestions
    };

    addBlock(
      selectedBlocks,
      selectedIds,
      currentCounts,
      mandatoryBlock
    );
  }

  // 3. Riempie sempre prima il dominio più distante dal proprio target.
  while (totalSelectedQuestions(selectedBlocks) < count) {
    const remainingSlots = count - totalSelectedQuestions(selectedBlocks);

    const domainsByNeed = Object.keys(targets)
      .sort((a, b) => {
        const needA = targets[a] - currentCounts[a];
        const needB = targets[b] - currentCounts[b];
        return needB - needA;
      });

    let added = false;

    for (const domain of domainsByNeed) {
      const candidates = pools[domain].filter(block => {
        const blockSize = block.questions.length;

        return (
          !block.questions.some(q => selectedIds.has(q.id)) &&
          blockSize <= remainingSlots &&
          blockFitsTargets(block, currentCounts, targets)
        );
      });

      if (candidates.length === 0) {
        continue;
      }

      addBlock(
        selectedBlocks,
        selectedIds,
        currentCounts,
        candidates[0]
      );

      added = true;
      break;
    }

    if (!added) {
      break;
    }
  }

  // 4. Completa eventuali posti rimasti usando il blocco con minor eccesso
  // rispetto ai target, senza spezzare un case study.
  while (totalSelectedQuestions(selectedBlocks) < count) {
    const remainingSlots = count - totalSelectedQuestions(selectedBlocks);

    const candidates = Object.values(pools)
      .flat()
      .filter(block => {
        return (
          !block.questions.some(q => selectedIds.has(q.id)) &&
          block.questions.length <= remainingSlots
        );
      });

    if (candidates.length === 0) {
      break;
    }

    candidates.sort((a, b) => {
      const score = block => {
        const nextCounts = { ...currentCounts };

        block.questions.forEach(q => {
          nextCounts[questionDomain(q)]++;
        });

        return Object.keys(targets).reduce((sum, domain) => {
          return sum + Math.max(0, nextCounts[domain] - targets[domain]) * 100 +
            Math.abs(nextCounts[domain] - targets[domain]);
        }, 0);
      };

      return score(a) - score(b);
    });

    addBlock(
      selectedBlocks,
      selectedIds,
      currentCounts,
      candidates[0]
    );
  }

  const selectedQuestions = selectedBlocks.flatMap(
    block => block.questions
  );

  // 5. Costruisce blocchi finali:
  // - ogni case study rimane nel suo topic completo;
  // - ogni gruppo Yes/No resta consecutivo;
  // - le altre domande restano individuali.
  const finalBlocks = [];
  const placedIds = new Set();

  selectedBlocks
    .filter(block =>
      block.questions.length > 0 &&
      isCaseStudy(block.questions[0].topic)
    )
    .forEach(block => {
      finalBlocks.push(block.questions);
      block.questions.forEach(q => placedIds.add(q.id));
    });

  groupYesNoQuestions(selectedQuestions).forEach(block => {
    const remaining = block.filter(q => !placedIds.has(q.id));

    if (remaining.length > 0) {
      finalBlocks.push(remaining);
      remaining.forEach(q => placedIds.add(q.id));
    }
  });

  selectedQuestions.forEach(q => {
    if (!placedIds.has(q.id)) {
      finalBlocks.push([q]);
      placedIds.add(q.id);
    }
  });

  return shuffleArray(finalBlocks).flat();
}

function flashDomainLabel(domain) {
  const labels = {
    all: "Tutti i domain",
    prepare: "Prepare",
    model: "Model",
    visualize: "Visualize",
    deploy: "Deploy"
  };

  return labels[domain] || domain;
}

function flashTypeLabel(type) {
  const labels = {
    all: "Tutte le tipologie",
    single: "Scelta singola",
    multi: "Risposta multipla",
    yesno: "Yes / No",
    dragdrop: "Drag & drop",
    dropdown: "Dropdown",
    hotspot: "Hotspot Yes / No",
    hotspot_image: "Hotspot immagine",
    casestudy: "Case study"
  };

  return labels[type] || type;
}

function flashPriorityScore(q) {
  ensureSrs(q.id);

  const h = history[q.id] || {
    seen: 0,
    wrong: 0,
    lastResult: null,
    lastSeenAt: 0
  };

  const box = srs[q.id].box;
  const flags = flagFreq[q.id] || 0;
  let score = 0;

  // Massima priorità: domanda sbagliata nell'ultimo tentativo.
  if (h.lastResult === false) {
    score += 10000;
  }

  // Ogni errore storico aumenta ulteriormente la priorità.
  score += Math.min(h.wrong || 0, 10) * 500;

  // Le bandierine rappresentano dubbi dichiarati dall'utente.
  score += Math.min(flags, 10) * 700;

  // Più bassa è la box Leitner, maggiore è la priorità.
  if (box === 1) {
    score += 1500;
  } else if (box === 2) {
    score += 900;
  } else if (box === 3) {
    score += 350;
  }

  // Domanda che il sistema SRS considera dovuta.
  if (isDue(q.id)) {
    score += 300;
  }

  // Una domanda mai vista riceve una piccola priorità,
  // ma viene dopo quelle effettivamente problematiche.
  if (!h.seen) {
    score += 100;
  }

  // A parità di priorità, quelle non viste da più tempo salgono leggermente.
  if (h.lastSeenAt) {
    const daysSinceSeen =
      (Date.now() - h.lastSeenAt) / (24 * 60 * 60 * 1000);

    score += Math.min(Math.floor(daysSinceSeen), 30) * 5;
  }

  return score;
}

function flashFocusLabel(focus) {
  const labels = {
    adaptive: "🎯 Adattivo",
    wrong: "❌ Solo errate",
    flagged: "🚩 Solo contrassegnate",
    due: "🔁 Solo SRS dovute",
    critical: "⚠️ Critiche Leitner 1–2"
  };

  return labels[focus] || "🎯 Adattivo";
}

function startFlashReview() {
  const minutesInput = document.getElementById("flashMinutesInput");
  const countInput = document.getElementById("flashCountInput");
  const focusInput = document.getElementById("flashFocusSelect");
  const domainInput = document.getElementById("flashDomainSelect");
  const typeInput = document.getElementById("flashTypeSelect");

  const minutes = minutesInput
    ? parseInt(minutesInput.value, 10) || 0
    : 0;

  const count = countInput
    ? parseInt(countInput.value, 10) || 0
    : 0;

  const focus = focusInput
    ? focusInput.value || "adaptive"
    : "adaptive";

  const selectedDomain = domainInput
    ? domainInput.value || "all"
    : "all";

  const selectedType = typeInput
    ? typeInput.value || "all"
    : "all";

  let pool = QUESTIONS.slice();

  // Filtro opzionale per domain.
  if (selectedDomain !== "all") {
    pool = pool.filter(q =>
      questionDomain(q) === selectedDomain
    );
  }

  // Filtro opzionale per tipologia.
  if (selectedType !== "all") {
    pool = pool.filter(q =>
      q.type === selectedType
    );
  }

  // Applica il profilo di ripasso scelto.
  if (focus === "wrong") {
    pool = pool.filter(q => {
      const h = history[q.id];
      return h && h.lastResult === false;
    });
  } else if (focus === "flagged") {
    pool = pool.filter(q =>
      (flagFreq[q.id] || 0) > 0
    );
  } else if (focus === "due") {
    pool = pool.filter(q => isDue(q.id));
  } else if (focus === "critical") {
    pool = pool.filter(q => {
      ensureSrs(q.id);
      return srs[q.id].box <= 2;
    });
  } else {
    // Profilo adattivo:
    // Include le domande da cui puoi realisticamente ottenere
    // più valore prima dell'esame.
    pool = pool.filter(q => {
      ensureSrs(q.id);

      const h = history[q.id] || {};
      const hasRecentError = h.lastResult === false;
      const hasFlags = (flagFreq[q.id] || 0) > 0;
      const isCritical = srs[q.id].box <= 2;
      const due = isDue(q.id);

      return hasRecentError || hasFlags || isCritical || due;
    });
  }

  // Ordina per punteggio di priorità.
  // random evita sempre lo stesso ordine quando due domande
  // hanno lo stesso punteggio.
  pool = pool
    .map(q => ({
      question: q,
      score: flashPriorityScore(q),
      random: Math.random()
    }))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return a.random - b.random;
    })
    .map(entry => entry.question);

  // 0 = tutte le domande disponibili dopo i filtri.
  if (count > 0 && count < pool.length) {
    pool = pool.slice(0, count);
  }

  if (pool.length === 0) {
    alert(
      "Nessuna domanda disponibile con i filtri selezionati.\n\n" +
      "Prova a scegliere 'Tutti i domain', 'Tutte le tipologie' " +
      "oppure una priorità diversa."
    );
    return;
  }

  session = {
    mode: "flash",
    topicFilter: "all",
    domainFilter: selectedDomain,
    typeFilter: selectedType,
    ids: pool.map(q => q.id),
    current: 0,
    answers: {},
    tempSingle: {},
    tempMulti: {},
    startedAt: Date.now(),
    paused: false,
    pausedAt: null,
    phase: "quiz",
    dragState: {},
    tapSelect: {},
    flags: {},
    reviewMode: false,
    isExam: false,
    isFlash: true,
    flashFocus: focus,
    flashQuestionCount: pool.length
  };

  if (minutes > 0) {
    session.flashDeadline =
      Date.now() + minutes * 60 * 1000;
  }

  persist();
  render();
}

function startExam() {
  // Numero casuale intero fra 40 e 50 inclusi.
  const minQuestions = 40;
  const maxQuestions = 50;
  const count = Math.min(
    minQuestions + Math.floor(Math.random() * (maxQuestions - minQuestions + 1)),
    QUESTIONS.length
  );

  // Microsoft PL-300: 100 minuti complessivi.
  // La revisione userà lo stesso termine temporale.
  const examMinutes = 100;

  const sample = weightedExamSample(count);

  session = {
    mode: "exam",
    topicFilter: "all",
    ids: sample.map(q => q.id),
    current: 0,
    answers: {},
    tempSingle: {},
    tempMulti: {},
    startedAt: Date.now(),
    paused: false,
    pausedAt: null,
    phase: "quiz",
    dragState: {},
    tapSelect: {},
    flags: {},
    isExam: true,
    reviewMode: false,

    examDeadline: Date.now() + examMinutes * 60 * 1000,
    examTotalSeconds: examMinutes * 60,

    // Rimane solo per compatibilità con il resto del codice:
    // non verrà usato per creare un secondo timer in revisione.
    reviewSeconds: 0,

    lockedCaseStudies: [],
    lockedYesNoScenarios: []
  };

  persist();
  render();
}

function resetStats() {
  if (confirm("Sicuro di voler azzerare tutte le statistiche e lo spaced repetition?")) {
    history = {};
    srs = {};
    saveJSON(HISTORY_KEY, history);
    saveJSON(SRS_KEY, srs);
    render();
  }
}

function resetExamHistory(){
  if(!confirm(
    "Azzerare lo storico dei punteggi di test ed esami simulati?\n\n" +
    "- Verranno cancellate tutte le voci nella sezione 'Storico punteggi'.\n" +
    "Questa operazione non può essere annullata. Continuare?"
  )){
    return;
  }

  // Svuota il log degli esami/test
  saveJSON("pl300_exam_log_v1", []);
  render();
}

function recurrentFlagsHtml() {
  const entries = Object.keys(flagFreq)
    .map(qid => ({ qid: parseInt(qid), count: flagFreq[qid] }))
    .filter(e => e.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  if (entries.length === 0) {
    return '<div class="small">Nessuna domanda contrassegnata più di una volta finora. Usa la bandierina 🏳️ durante i test per segnalare i tuoi dubbi ricorrenti.</div>';
  }
  return entries.map(e => {
    const q = getQ(e.qid);
    if (!q) return "";
    return `<div class="topic-row">
      <span>🚩 ${q.text.slice(0, 65)}${q.text.length > 65 ? "…" : ""}</span>
      <span class="small">${e.count} volte · ${topicLabel(q.topic)}</span>
    </div>`;
  }).join("");
}

function studyPriorityHtml() {
  const topics = topicStats();
  const domains = {};
  Object.keys(topics).forEach(t => {
    const d = domainOf(parseInt(t));
    if (!domains[d]) domains[d] = { seen: 0, correct: 0 };
    domains[d].seen += topics[t].seen;
    domains[d].correct += topics[t].correct;
  });
  const domainList = Object.keys(domains).filter(d => domains[d].seen > 0);
  if (domainList.length === 0) {
    return '<div class="small">Svolgi almeno un test per ricevere un consiglio personalizzato sulla priorità di studio.</div>';
  }
  const withPct = domainList.map(d => ({
    domain: d,
    pct: Math.round(100 * domains[d].correct / domains[d].seen),
    seen: domains[d].seen
  })).sort((a, b) => a.pct - b.pct);

  const worst = withPct[0];
  const rows = withPct.map(item => `
    <div class="topic-row">
      <span>${item.domain}</span>
      <span class="small" style="color:${item.pct >= 70 ? 'var(--correct)' : 'var(--wrong)'}">
        ${item.pct}% corrette (${item.seen} risposte)
      </span>
    </div>
  `).join("");

  return `
    <div class="explain" style="border-color:var(--accent2)">
      💡 Il tuo dominio più debole è <b>${worst.domain}</b> (${worst.pct}% di risposte corrette).
      Ti consigliamo di concentrarti lì prima del prossimo esame simulato.
    </div>
    ${rows}
  `;
}

function leitnerLegendHtml() {
  const icons = { 1: "🆕", 2: "⭐", 3: "⭐⭐", 4: "⭐⭐⭐", 5: "🔒" };
  const labels = { 1: "Nuova/Critica", 2: "In apprendimento", 3: "Buona", 4: "Ottima", 5: "Padroneggiata" };
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  QUESTIONS.forEach(q => {
    ensureSrs(q.id);
    const box = srs[q.id].box;
    counts[box] = (counts[box] || 0) + 1;
  });
  return Object.keys(icons).map(b => `
    <div class="topic-row">
      <span>${icons[b]} ${labels[b]}</span>
      <span class="small">${counts[b]} domande</span>
    </div>
  `).join("");
}

function exportProgress() {
  const examLog = loadJSON("pl300_exam_log_v1", []);
  const data = {
    history: history,
    srs: srs,
    examLog: examLog,
    flagFreq: flagFreq,
    theme: localStorage.getItem(THEME_KEY) || "auto",
    exportedAt: new Date().toISOString(),
    version: 3
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "pl300_progresso_" + new Date().toISOString().slice(0, 10) + ".json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importProgress(ev) {
  const file = ev.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.history || !data.srs) throw new Error("Formato non valido");
      if (!confirm("Importare questo progresso sovrascriverà le statistiche attuali. Continuare?")) return;
      history = data.history;
      srs = data.srs;
      saveJSON(HISTORY_KEY, history);
      saveJSON(SRS_KEY, srs);
      if (data.examLog) saveJSON("pl300_exam_log_v1", data.examLog);
      if (data.flagFreq) {
        flagFreq = data.flagFreq;
        saveJSON(FLAG_FREQ_KEY, flagFreq);
      }
      if (data.theme) {
        localStorage.setItem(THEME_KEY, data.theme);
        applyTheme();
      }
      alert("Progresso importato con successo!");
      render();
    } catch (err) {
      alert("Errore nell'importazione: file non valido.");
    }
  };
  reader.readAsText(file);
}

function getQ(id) {
  return QUESTIONS.find(q => q.id === id);
}

function isAnsweredForExamNavigation(qid) {
  const q = getQ(qid);

  if (!q || !session) {
    return false;
  }

  if (!session.isExam) {
    return !!session.answers[qid];
  }

  if (
    q.type === "single" ||
    q.type === "yesno" ||
    q.type === "casestudy"
  ) {
    return !!(
      session.tempSingle &&
      session.tempSingle[qid] !== undefined &&
      session.tempSingle[qid] !== null
    );
  }

  if (q.type === "multi") {
    return !!(
      session.tempMulti &&
      session.tempMulti[qid] &&
      session.tempMulti[qid].length > 0
    );
  }

  const state = session.dragState && session.dragState[qid];

  if (q.type === "dropdown" || q.type === "hotspot") {
    return !!(
      state &&
      state.selected &&
      state.selected.some(value =>
        value !== "" &&
        value !== undefined &&
        value !== null
      )
    );
  }

  if (q.type === "dragdrop") {
    return !!(
      state &&
      state.zones &&
      state.zones.some(value => value !== null)
    );
  }

  if (q.type === "hotspot_image") {
    return !!(
      state &&
      state.selectedZones &&
      state.selectedZones.length > 0
    );
  }

  return false;
}

function isLockedForExamNavigation(q) {
  if (!session || !session.isExam || !q) {
    return false;
  }

  const yesNoLocked = !!(
    q.type === "yesno" &&
    session.answers &&
    session.answers[q.id] &&
    session.answers[q.id].locked
  );

  const caseStudyLocked = isLockedCaseStudyQuestion(q);

  return yesNoLocked || caseStudyLocked;
}

function examDomainCountsHtml() {
  // Mostra il conteggio in tutte le sessioni:
  // esame, pratica libera, ripasso SRS e ripasso lampo.
  if (!session) return "";

  const counts = {
    prepare: 0,
    model: 0,
    visualize: 0,
    deploy: 0
  };

  session.ids.forEach(qid => {
    const q = getQ(qid);
    if (!q) return;

    const domain = questionDomain(q);

    if (counts[domain] !== undefined) {
      counts[domain]++;
    }
  });

  const total = session.ids.length;

  const pct = domain => {
    return total ? Math.round((counts[domain] / total) * 100) : 0;
  };

  return `
    <span
      class="badge domain-count-badge"
      title="Distribuzione delle domande di questa sessione per dominio"
    >
      📊 Prepare: ${counts.prepare} (${pct("prepare")}%) ·
      Model: ${counts.model} (${pct("model")}%) ·
      Visualize: ${counts.visualize} (${pct("visualize")}%) ·
      Deploy: ${counts.deploy} (${pct("deploy")}%)
    </span>
  `;
}

function examNavigationHtml() {
  // Mostra la griglia sia in esame che in pratica libera (se non in reviewMode)
  if (!session) {
    return "";
  }

  const buttons = session.ids.map((qid, index) => {
    const q = getQ(qid);

    if (!q) {
      return "";
    }

    // In pratica libera: nessuna domanda è bloccata
    // In esame: rispetta i lock di Yes/No e case study
    const isLocked = session.isExam && isLockedForExamNavigation(q);
    
    if (isLocked) {
      return "";
    }

    const isCurrent = index === session.current;
    
    // In pratica libera: controlla session.answers
    // In esame: controlla isAnsweredForExamNavigation
    const isAnswered = session.isExam
      ? isAnsweredForExamNavigation(qid)
      : hasPendingAnswer(q);
    
    const isFlagged = !!(session.flags && session.flags[qid]);

    let className = "exam-nav-question";

    if (isCurrent) {
      className += " current";
    }

    if (isAnswered) {
      className += " answered";
    }

    if (isFlagged) {
      className += " flagged";
    }

    return `
      <button
        class="${className}"
        type="button"
        onclick="goToExamQuestion(${index})"
        aria-label="Vai alla domanda ${index + 1}"
        title="Vai alla domanda ${index + 1}"
      >
        ${index + 1}${isAnswered ? " ✓" : ""}${isFlagged ? " 🚩" : ""}
      </button>
    `;
  }).join("");

  return `
    <div class="exam-navigation" aria-label="Navigazione rapida tra domande">
      <div class="small exam-navigation-title">
        🔢 Vai direttamente a una domanda
      </div>

      <div class="exam-navigation-grid">
        ${buttons}
      </div>
    </div>
  `;
}

function goToExamQuestion(targetIndex) {
  if (!session) {
    return;
  }

  const fromIdx = session.current;
  const fromQ = getQ(session.ids[fromIdx]);
  const targetQ = getQ(session.ids[targetIndex]);

  if (!targetQ) {
    return;
  }

  // --- SOLO PER ESAME: gestisci i lock ---
  if (session.isExam) {
    // Non permette di rientrare in una sezione già chiusa
    if (isLockedForExamNavigation(targetQ)) {
      alert(
        "🔒 Questa domanda appartiene a una sezione già chiusa " +
        "e non può più essere riaperta."
      );
      return;
    }

    // Se la domanda di partenza è una Yes/No e stai andando
    // a una domanda diversa, applica le stesse regole di "Successiva"
    if (
      fromQ &&
      fromQ.type === "yesno" &&
      targetIndex !== fromIdx &&
      !(session.answers[fromQ.id] && session.answers[fromQ.id].locked)
    ) {
      const selected = session.tempSingle
        ? session.tempSingle[fromQ.id]
        : undefined;

      if (selected === undefined || selected === null) {
        alert("⚠️ Devi rispondere Yes o No prima di proseguire.");
        return;
      }

      const ok = confirm(
        "⚠️ Stai per confermare questa risposta Yes/No. " +
        "Una volta confermata non potrai più modificarla né tornare indietro a questa domanda. Continuare?"
      );

      if (!ok) {
        return;
      }

      const correct = selected === fromQ.correct;

      session.answers[fromQ.id] = {
        selected,
        correct,
        locked: true
      };

      recordAnswer(fromQ.id, correct);
    }

    // Se sei in un case study e la destinazione appartiene
    // a un topic diverso, stai uscendo dal blocco
    if (
      fromQ &&
      isCaseStudy(fromQ.topic) &&
      targetIndex !== fromIdx &&
      targetQ.topic !== fromQ.topic
    ) {
      const ok = confirm(
        "⚠️ Stai per uscire da questo case study. " +
        "In un esame reale non potrai più tornare indietro " +
        "per modificare le risposte a questo scenario. Continuare?"
      );

      if (!ok) {
        return;
      }

      if (!session.lockedCaseStudies) {
        session.lockedCaseStudies = [];
      }

      const lockKey = `case_topic_${fromQ.topic}`;

      if (!session.lockedCaseStudies.includes(lockKey)) {
        session.lockedCaseStudies.push(lockKey);
      }
    }
  }
  // --- FINE BLOCCO SOLO PER ESAME ---

  // Per pratica libera: vai semplicemente alla domanda
  session.current = targetIndex;
  persist();
  render();
}

// ====================== QUIZ ======================
function renderQuiz() {
  if (session.ids.length === 0) {
    appEl.innerHTML = `
      ${topNavHtml()}
      <div class="view-card">
        <div class="section-header">
          <div class="section-title">Nessuna domanda trovata</div>
          <div class="section-subtitle">
            Nessuna domanda trovata per questa selezione.
          </div>
        </div>
        <button class="btn" onclick="clearSession(); render();">Torna alla home</button>
      </div>
    `;
    return;
  }

  const idx = session.current;
  const qid = session.ids[idx];
  const q = getQ(qid);
  const storedAnswer = session.answers ? session.answers[qid] : null;

  const answered =
    !session.isExam &&
    storedAnswer &&
    storedAnswer.checked !== false
      ? storedAnswer
      : null;
  const total = session.ids.length;
  const pct = Math.round(100 * (idx) / total);

  let optionsHtml = "";
  const hideReveal = session.isExam;
  const isLocked =
    session.isExam &&
    isCaseStudy(q.topic) &&
    session.lockedCaseStudies &&
    session.lockedCaseStudies.includes(scenarioKeyOf(q));

  // ----- Opzioni di risposta -----
    if (q.type === "single" || q.type === "yesno") {
    const tempSel = session.tempSingle ? session.tempSingle[qid] : undefined;
    optionsHtml = q.options.map((opt, i) => {
      let cls = "option";
      let tag = "";
      if (answered) {
        if (!hideReveal) {
          if (i === q.correct) {
            cls += " correct-selected";
            tag = ' <span class="option-tag tag-correct">✔ Corretta</span>';
          } else if (answered.selected === i) {
            cls += " wrong-selected";
            tag = ' <span class="option-tag tag-wrong">✘ Tua risposta (errata)</span>';
          }
        }
        if (answered.selected === i) cls += " selected";
      } else if (tempSel === i) {
        cls += " selected";
      }
      return `<button class="${cls}" ${answered && !session.isExam ? 'disabled' : ''} onclick="selectSingle(${qid}, ${i})">
        ${String.fromCharCode(65 + i)}. ${opt}${tag}
      </button>`;
    }).join("");
    if (!answered && !session.isExam) {
      optionsHtml += `<button class="btn" ${(tempSel === undefined || tempSel === null) ? 'disabled' : ''} onclick="confirmSingle(${qid})">Verifica risposta</button>`;
    }
  } else if (q.type === "multi") {
    const sel = (session.tempMulti && session.tempMulti[qid]) || (answered ? answered.selected : []);
    optionsHtml = q.options.map((opt, i) => {
      const isSel = sel.includes(i);
      const isCorrectOpt = q.correct.includes(i);
      let cls = "option";
      let tag = "";

      if (answered && !hideReveal) {
        if (isCorrectOpt && isSel) {
          cls += " correct-selected";
          tag = ' <span class="option-tag tag-correct">✔ Corretta (tua scelta)</span>';
        } else if (isCorrectOpt && !isSel) {
          cls += " correct-missed";
          tag = ' <span class="option-tag tag-missed">★ Corretta (non scelta)</span>';
        } else if (!isCorrectOpt && isSel) {
          cls += " wrong-selected";
          tag = ' <span class="option-tag tag-wrong">✘ Errata (tua scelta)</span>';
        }
      } else if (answered && hideReveal) {
        if (isSel) cls += " selected";
      } else if (isSel) {
        cls += " selected";
      }

      return `<button class="${cls}" ${answered && !session.isExam ? 'disabled' : ''} onclick="toggleMulti(${qid}, ${i})">
        ${String.fromCharCode(65 + i)}. ${opt}${tag}
      </button>`;
    }).join("");
        if (!answered && !session.isExam) {
      optionsHtml += `<button class="btn" onclick="submitMulti(${qid})">Verifica risposta</button>`;
    }
  } else if (q.type === "dragdrop") {
    optionsHtml = renderDragDrop(q, answered);
  } else if (q.type === "hotspot") {
    optionsHtml = renderHotspot(q, answered);
  } else if (q.type === "dropdown") {
    optionsHtml = renderDropdownStatements(q, answered, hideReveal);
  } else if (q.type === "hotspot_image") {
    optionsHtml = renderHotspotImage(q, answered);
  } else if (q.type === "casestudy") {
    const tempSel = session.tempSingle ? session.tempSingle[qid] : undefined;
    optionsHtml = q.options.map((opt, i) => {
      let cls = "option";
      let tag = "";
      if (answered) {
        if (!hideReveal) {
          if (i === q.correct) {
            cls += " correct-selected";
            tag = ' <span class="option-tag tag-correct">✔ Corretta</span>';
          } else if (answered.selected === i) {
            cls += " wrong-selected";
            tag = ' <span class="option-tag tag-wrong">✘ Tua risposta (errata)</span>';
          }
        }
        if (answered.selected === i) cls += " selected";
      } else if (tempSel === i) {
        cls += " selected";
      }
      return `<button class="${cls}" ${answered && !session.isExam || isLocked ? 'disabled' : ''} onclick="selectSingle(${qid}, ${i})">
        ${String.fromCharCode(65 + i)}. ${opt}${tag}
      </button>`;
    }).join("");
    if (!answered && !session.isExam && !isLocked) {
      optionsHtml += `<button class="btn" ${(tempSel === undefined || tempSel === null) ? 'disabled' : ''} onclick="confirmSingle(${qid})">Verifica risposta</button>`;
    }
  }

  // ----- Feedback (corretto/errato) -----
  let explainHtml = "";
  if (answered && !hideReveal) {
    const wasCorrect = answered.correct;
    const explanationText = q.explanation || q.note || "";
    explainHtml = `
      <div class="explain" style="border-color:${wasCorrect ? 'var(--correct)' : 'var(--wrong)'}">
        <div style="font-weight:700;margin-bottom:6px">
          ${wasCorrect ? '✔ Corretto!' : '✘ Risposta errata.'}
        </div>
        ${!wasCorrect ? `
          <div class="explain-section" style="margin-top:8px">
            <div class="explain-label">✅ Risposta corretta</div>
            <div class="explain-a">${formatCorrectAnswer(q)}</div>
          </div>
        ` : ""}
        ${explanationText ? `<div class="note-tag" style="margin-top:8px">💡 Spiegazione: ${explanationText}</div>` : ""}
      </div>`;
  } else if (answered && hideReveal) {
    explainHtml = `<div class="explain" style="border-color:var(--muted)">
      ✔️ Risposta registrata. Il feedback sarà disponibile in revisione finale.
    </div>`;
  }

  // ----- Timer (live, senza re-render) -----
let timerLabel = "";

// Funzione che calcola e aggiorna il testo del timer
function updateTimerText() {
  const timerEl = document.querySelector(".quiz-timer");
  if (!timerEl) return;

  if (session.isFlash && session.flashDeadline) {
    const remaining = Math.max(0, Math.round((session.flashDeadline - Date.now()) / 1000));
    const mm2 = String(Math.floor(remaining / 60)).padStart(2, '0');
    const ss2 = String(remaining % 60).padStart(2, '0');
    timerEl.textContent = `⚡ Tempo ripasso: ${mm2}:${ss2}`;

    if (remaining <= 0 && !session._flashTimeUp) {
      session._flashTimeUp = true;
      persist();
      if (session._liveTimerInterval) {
        clearInterval(session._liveTimerInterval);
        session._liveTimerInterval = null;
      }
      setTimeout(() => {
        alert("Tempo di ripasso terminato!");
        finishQuiz();
      }, 50);
    }
  } else if (session.isExam) {
    const remaining = Math.max(0, Math.round((session.examDeadline - Date.now()) / 1000));
    const mm2 = String(Math.floor(remaining / 60)).padStart(2, '0');
    const ss2 = String(remaining % 60).padStart(2, '0');
    timerEl.textContent = `⏳ Tempo esame: ${mm2}:${ss2}`;

    if (remaining <= 0 && !session._examTimeUp) {
      session._examTimeUp = true;
      persist();
      if (session._liveTimerInterval) {
        clearInterval(session._liveTimerInterval);
        session._liveTimerInterval = null;
      }
      setTimeout(() => {
        alert("Tempo scaduto! Si passa alla revisione finale.");
        finishQuiz();
      }, 50);
    }
  } else {
    const timeElapsed = Math.round((Date.now() - session.startedAt) / 1000);
    const mm2 = String(Math.floor(timeElapsed / 60)).padStart(2, '0');
    const ss2 = String(timeElapsed % 60).padStart(2, '0');
    timerEl.textContent = `⏱ Tempo trascorso: ${mm2}:${ss2}`;
  }
}

// Calcola la label iniziale (per compatibilità, anche se non usata direttamente nell'HTML)
if (session.isFlash && session.flashDeadline) {
  const remaining = Math.max(0, Math.round((session.flashDeadline - Date.now()) / 1000));
  const mm2 = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss2 = String(remaining % 60).padStart(2, '0');
  timerLabel = `⚡ Tempo ripasso: ${mm2}:${ss2}`;
} else if (session.isExam) {
  const remaining = Math.max(0, Math.round((session.examDeadline - Date.now()) / 1000));
  const mm2 = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss2 = String(remaining % 60).padStart(2, '0');
  timerLabel = `⏳ Tempo esame: ${mm2}:${ss2}`;
} else {
  const timeElapsed = Math.round((Date.now() - session.startedAt) / 1000);
  const mm2 = String(Math.floor(timeElapsed / 60)).padStart(2, '0');
  const ss2 = String(timeElapsed % 60).padStart(2, '0');
  timerLabel = `⏱ Tempo trascorso: ${mm2}:${ss2}`;
}

// Pulisci eventuale intervallo precedente
if (session._liveTimerInterval) {
  clearInterval(session._liveTimerInterval);
  session._liveTimerInterval = null;
}

// Avvia aggiornamento live ogni secondo
session._liveTimerInterval = setInterval(updateTimerText, 1000);
updateTimerText(); // aggiorna subito

    // ----- Immagine della domanda (se presente) -----
  let questionImageHtml = "";
  if (q.media && Array.isArray(q.media) && q.media.length > 0) {
    const imgs = q.media
      .filter(m => m && m.url)
      .map(m => `
        <div class="question-image-box">
          <img src="${m.url}" alt="${m.caption ? m.caption : 'Immagine domanda ' + q.id}" class="question-image" />
          ${m.caption ? `<div class="small question-image-caption">${m.caption}</div>` : ""}
        </div>
      `)
      .join("");

    questionImageHtml = `
      <div class="question-media-box">
        ${imgs}
      </div>
    `;
  } else if (q.scenarioId && SCENARIOS[q.scenarioId]) {
    // se usi scenario con immagini, le gestisce scenarioBlockHtml
  }

    // ----- HTML principale -----
  appEl.innerHTML = `
    ${topNavHtml()}
    ${session.isExam
      ? '<div class="pause-banner">🎓 Modalità Esame Simulato: nessun feedback immediato, le risposte verranno mostrate solo in revisione finale.</div>'
      : ""
    }

    <div class="view-card">
      <!-- Barra superiore: info domanda + timer -->
      <div class="quiz-topbar">
        <div class="quiz-info">
          <div class="quiz-number">Domanda ${idx + 1} / ${total}</div>

          <span class="badge quiz-topic-badge">
            Topic ${q.topic}
          </span>

          <span class="badge domain-badge">
            📚 ${q.domain || topicDomain(q.topic)}
          </span>

          <span class="badge ${q.type}">
            ${q.type}
          </span>

          <span class="quiz-srs">
            ${leitnerIconFor(q.id)}
          </span>

          ${flagBadgeFor(q.id)
            ? `<span class="quiz-flag">${flagBadgeFor(q.id)}</span>`
            : ""
          }

          ${examDomainCountsHtml()}
        </div>

        <div class="quiz-timer">
          ${timerLabel}
        </div>
      </div>

      <!-- Barra di avanzamento -->
      <div class="progressbar">
        <div
          class="progressbar-fill"
          style="width:${pct}%"
        ></div>
      </div>

      ${examNavigationHtml()}

      <!-- Pulsanti azione: pausa, esci, flag -->
      <div class="quiz-actions">
        <button class="btn secondary" onclick="pauseSession()">
          ⏸ Pausa
        </button>

        <button class="btn danger" onclick="exitSession()">
          ✖ Esci
        </button>

        <button
          class="btn ${session.flags && session.flags[qid] ? "warn" : "secondary"}"
          onclick="toggleFlag(${qid})"
        >
          ${session.flags && session.flags[qid]
            ? "🚩 Contrassegnata"
            : "🏳️ Contrassegna"
          }
        </button>
      </div>

      <!-- Card domanda -->
      <div class="card question-card">
        ${session.isExam &&
          isCaseStudy(q.topic) &&
          session.lockedCaseStudies &&
          session.lockedCaseStudies.includes(scenarioKeyOf(q))
          ? '<div class="pause-banner">🔒 Case study bloccato: hai già lasciato questo scenario, le risposte non sono più modificabili (come nell\'esame reale).</div>'
          : ""
        }

        ${q.scenarioId && SCENARIOS[q.scenarioId]
          ? scenarioBlockHtml(q.scenarioId)
          : ""
        }

        <div class="question-text-box">
          <div class="question-label">📝 Traccia</div>
          <div class="question-text">${q.text}</div>
        </div>

        ${questionImageHtml}

        <div class="options-box">
          <div class="question-label">✅ Risposte</div>
          ${optionsHtml}
        </div>

        ${explainHtml}
      </div>

      <!-- Navigazione -->
      <div class="quiz-footer">
        <button
          class="btn secondary"
          onclick="prevQuestion()"
          ${!hasReachablePrevQuestion(idx) ? "disabled" : ""}
        >
          &larr; Precedente
        </button>

        ${
          idx < total - 1
            ? `
              <button class="btn" onclick="nextQuestion()">
                Successiva &rarr;
              </button>
            `
            : `
              <button class="btn" onclick="finishQuiz()">
                Termina e vai alla revisione
              </button>
            `
        }

        ${
          session.reviewMode
            ? `
              <button class="btn warn" onclick="backToReview()">
                &#8617; Torna alla revisione
              </button>
            `
            : ""
        }
      </div>
    </div>
  `;
}

function selectSingle(qid, i) {
  const q = getQ(qid);

  // In modalità esame: blocca una Yes/No già confermata in modo definitivo.
  if (session.answers[qid] && session.answers[qid].locked) {
    return;
  }

  // In pratica libera: blocca soltanto una risposta che è stata verificata.
  // Una risposta con checked: false è stata inserita, ma è ancora modificabile.
  if (
    session.answers[qid] &&
    !session.isExam &&
    session.answers[qid].checked !== false
  ) {
    return;
  }

  if (!session.tempSingle) {
    session.tempSingle = {};
  }

  session.tempSingle[qid] = i;

  // Se la risposta era già stata salvata automaticamente come "inserita",
  // aggiornala con la nuova scelta senza considerarla verificata.
  if (
    !session.isExam &&
    session.answers[qid] &&
    session.answers[qid].checked === false
  ) {
    session.answers[qid].selected = i;
  }

  persist();
  render();
}

function confirmSingle(qid) {
  const q = getQ(qid);
  const selected = session.tempSingle ? session.tempSingle[qid] : undefined;

  if (selected === undefined || selected === null) {
    return;
  }

  const correct = selected === q.correct;

  // checked: true = l'utente ha volutamente premuto "Verifica".
  session.answers[qid] = {
    selected,
    correct,
    checked: true
  };

  recordAnswer(qid, correct);
  persist();
  render();
}

function toggleMulti(qid, i) {
  // In pratica libera, una multi verificata non è più modificabile.
  // Una multi salvata ma non verificata (checked: false) resta modificabile.
  if (
    session.answers[qid] &&
    !session.isExam &&
    session.answers[qid].checked !== false
  ) {
    return;
  }

  if (!session.tempMulti) {
    session.tempMulti = {};
  }

  if (!session.tempMulti[qid]) {
    session.tempMulti[qid] = [];
  }

  const selections = session.tempMulti[qid];
  const pos = selections.indexOf(i);

  if (pos >= 0) {
    selections.splice(pos, 1);
  } else {
    selections.push(i);
  }

  // Se era già presente una risposta non verificata, aggiornala.
  if (
    !session.isExam &&
    session.answers[qid] &&
    session.answers[qid].checked === false
  ) {
    session.answers[qid].selected = selections.slice();
  }

  persist();
  render();
}

function submitMulti(qid) {
  const q = getQ(qid);
  const selected = (session.tempMulti && session.tempMulti[qid]) || [];

  const correctSet = q.correct.slice().sort();
  const selectedSet = selected.slice().sort();

  const correct =
    JSON.stringify(correctSet) === JSON.stringify(selectedSet);

  // checked: true = l'utente ha premuto "Verifica".
  session.answers[qid] = {
    selected: selected.slice(),
    correct,
    checked: true
  };

  recordAnswer(qid, correct);
  persist();
  render();
}

// ---- Drag & drop + tap-to-move per mobile ----
function renderDragDrop(q, answered) {
  const qid = q.id;
  const sourceItems = q.sourceItems || q.options;
  const targetLabels = q.targets || q.correct.map((_, i) => "Posizione " + (i + 1));
  const correctAssignment =
    q.correctAssignment ||
    (q.correct ? q.correct.map(label => sourceItems.indexOf(label)) : targetLabels.map((_, i) => i));

  if (!session.dragState[qid]) {
    const indices = sourceItems.map((o, i) => i);

    // Mischia gli indici in modo sicuro (Fisher-Yates)
    for (let j = indices.length - 1; j > 0; j--) {
      const k = Math.floor(Math.random() * (j + 1));
      const tmp = indices[j];
      indices[j] = indices[k];
      indices[k] = tmp;
    }

    session.dragState[qid] = {
      pool: indices,
      zones: targetLabels.map(() => null)
    };
  }
  const state = session.dragState[qid];

// Per mobile: teniamo traccia dell'elemento selezionato col tap
if (!session.tapSelect) session.tapSelect = {};
if (typeof session.tapSelect[qid] === 'undefined') {
  session.tapSelect[qid] = null;
}
const selectedIdx = session.tapSelect[qid];

  const poolItems = state.pool
    .map((i, idxInPool) => {
      const isSelected = session.tapSelect && session.tapSelect[qid] === i;
      const extraClass = isSelected ? " selected" : "";
      return `
  <span
    class="dragitem${extraClass}"
    draggable="${!IS_TOUCH_DEVICE && (!answered || (session.isExam && !session.reviewMode))}"
    data-idx="${i}"
    data-qid="${qid}"
    data-pool-idx="${idxInPool}"
    ondragstart="dragStart(event)"
  >
    <span class="dragitem-text">${escapeHtml(sourceItems[i])}</span>
  </span>
`;
    })
    .join("");

  const zonesHtml = state.zones
    .map((val, zi) => {
      const clickZone = (!answered || (session.isExam && !session.reviewMode)) ? `onclick="tapZone(${qid}, ${zi})"` : "";
      const clickPlaced =
        val !== null && (!answered || (session.isExam && !session.reviewMode)) ? `onclick="tapPlacedItem(${qid}, ${zi}); event.stopPropagation();"` : "";
      return `
        <div class="dragzone" data-qid="${qid}" data-zone="${zi}" ondragover="dragOver(event)" ondrop="dropItem(event)" ${clickZone}>
          <div class="dragzone-label">${targetLabels[zi]}</div>
          ${
            val !== null
              ? `<span class="dragitem placed" ${clickPlaced}>${escapeHtml(sourceItems[val])}</span>`
              : '<span class="small">Trascina qui</span>'
          }
        </div>
      `;
    })
    .join("");

  let checkBtn = "";
  if (!answered && !session.isExam) {
    const allFilled = state.zones.every(v => v !== null);
    checkBtn = `<button class="btn" ${allFilled ? "" : "disabled"} onclick="checkDragDrop(${qid})">Verifica</button>`;
  }

  return `
  <div class="dragdrop-container">
    <div class="drag-pool-box">
      <div class="question-label">🧩 Elementi da trascinare</div>
      <div class="pool" ${!IS_TOUCH_DEVICE && !answered ? 'ondragover="dragOver(event)" ondrop="dropToPool(event)"' : ''}>
        ${poolItems}
      </div>
    </div>

    <div class="drag-zones-box">
      <div class="question-label">🎯 Zone di destinazione</div>
      ${zonesHtml}
      ${checkBtn}
    </div>
  </div>
`;
}

let draggedData = null;
function dragStart(ev) {
  draggedData = { idx: parseInt(ev.target.dataset.idx), qid: parseInt(ev.target.dataset.qid) };
  ev.dataTransfer.setData("text/plain", "drag");
}
function dragOver(ev) { ev.preventDefault(); }
function dropItem(ev) {
  ev.preventDefault();
  if (!draggedData) return;
  const zone = parseInt(ev.currentTarget.dataset.zone);
  const qid = parseInt(ev.currentTarget.dataset.qid);
  const state = session.dragState[qid];
  const poolPos = state.pool.indexOf(draggedData.idx);
  if (poolPos >= 0) state.pool.splice(poolPos, 1);
  state.zones = state.zones.map(v => v === draggedData.idx ? null : v);
  if (state.zones[zone] !== null) state.pool.push(state.zones[zone]);
  state.zones[zone] = draggedData.idx;
  draggedData = null;
  persist();
  render();
}
function dropToPool(ev) {
  ev.preventDefault();
  if (!draggedData) return;
  const qid = draggedData.qid;
  const state = session.dragState[qid];
  state.zones = state.zones.map(v => v === draggedData.idx ? null : v);
  if (!state.pool.includes(draggedData.idx)) state.pool.push(draggedData.idx);
  draggedData = null;
  persist();
  render();
}

// ---- Tap-to-move per mobile (drag&drop resta su PC) ----
function tapPoolItem(qid, idx) {
  const state = session.dragState[qid];
  if (!state) return;
  if (!session.tapSelect) session.tapSelect = {};

  // Se l'elemento è già selezionato, deselezionalo
  if (session.tapSelect[qid] === idx) {
    session.tapSelect[qid] = null;
  } else {
    // Seleziona questo elemento solo se è nel pool
    if (state.pool.includes(idx)) {
      session.tapSelect[qid] = idx;
    }
  }

  persist();
  render();
}

function tapZone(qid, zoneIndex) {
  const state = session.dragState[qid];
  if (!state) return;
  if (!session.tapSelect) session.tapSelect = {};
  const selectedIdx = session.tapSelect[qid];
  if (selectedIdx === null || selectedIdx === undefined) return;

  const currentInZone = state.zones[zoneIndex];
  if (currentInZone !== null && !state.pool.includes(currentInZone)) {
    state.pool.push(currentInZone);
  }

  const poolPos = state.pool.indexOf(selectedIdx);
  if (poolPos >= 0) state.pool.splice(poolPos, 1);

  state.zones = state.zones.map(v => v === selectedIdx ? null : v);
  state.zones[zoneIndex] = selectedIdx;
  session.tapSelect[qid] = null;

  persist();
  render();
}

function tapPlacedItem(qid, zoneIndex) {
  const state = session.dragState[qid];
  if (!state) return;
  const val = state.zones[zoneIndex];
  if (val === null) return;

  state.zones[zoneIndex] = null;
  if (!state.pool.includes(val)) state.pool.push(val);

  persist();
  render();
}

function tapPoolClick(ev) {
  const el = ev.target.closest(".dragitem");
  if (!el) return;
  const qid = parseInt(el.dataset.qid);
  const idx = parseInt(el.dataset.idx);
  tapPoolItem(qid, idx);
}

function tapPoolItemById(uniqueId) {
  // Trova l'elemento con data-unique-id
  const el = document.querySelector(`[data-unique-id="${uniqueId}"]`);
  if (!el) return;
  const qid = parseInt(el.dataset.qid);
  const idx = parseInt(el.dataset.idx);
  tapPoolItem(qid, idx);
}

function checkDragDrop(qid) {
  const q = getQ(qid);
  const state = session.dragState[qid];
  const sourceItems = q.sourceItems || q.options;
  const targetLabels = q.targets || (q.correct ? q.correct.map((_, i) => "Posizione " + (i + 1)) : []);
  const correctAssignment = q.correctAssignment || (q.correct ? q.correct.map(label => sourceItems.indexOf(label)) : targetLabels.map((_, i) => i));

  const userAssignment = state.zones.slice();
  const correct = JSON.stringify(userAssignment) === JSON.stringify(correctAssignment);
  const userLabels = userAssignment.map(i => i !== null ? sourceItems[i] : null);
  session.answers[qid] = { selected: userLabels, correct };
  recordAnswer(qid, correct);
  persist();
  render();
}

// ---- Hotspot (dropdown menus) ----
function renderDropdownStatements(q, answered, hideReveal) {
  const qid = q.id;
  if (!session.dragState[qid]) session.dragState[qid] = { selected: q.statements.map(() => "") };
  const state = session.dragState[qid];
  const rows = q.statements.map((st, i) => {
    const userChoice = state.selected[i];
    const isPlaceholder = (userChoice === "" || userChoice === undefined);
    const correctChoice = st.choices[st.correct];
    let statusIcon = "";
    if (answered && !hideReveal) {
      statusIcon = (userChoice === correctChoice) ? "✅" : "❌";
    }
    const options = st.choices.map(c => `<option value="${c}" ${userChoice === c ? 'selected' : ''}>${c}</option>`).join("");
    return `<div class="statement-row">
      <span class="statement-text">${st.text}</span>
      <select class="dropdown-inline" data-qid="${qid}" data-i="${i}" onchange="dropdownSelect(event)" ${answered && !session.isExam ? 'disabled' : ''}>
        <option value="" ${isPlaceholder ? 'selected' : ''}>-- scegli --</option>
        ${options}
      </select>
      ${statusIcon}
    </div>`;
  }).join("");
  const btn = (!answered && !session.isExam) ? `<button class="btn" style="margin-top:10px" onclick="checkDropdown(${qid})">Verifica</button>` : "";
  return `<div>${rows}</div>${btn}`;
}

function dropdownSelect(ev) {
  const qid = parseInt(ev.target.dataset.qid);
  const i = parseInt(ev.target.dataset.i);
  session.dragState[qid].selected[i] = ev.target.value;
  persist();
}

function checkDropdown(qid) {
  const q = getQ(qid);
  const state = session.dragState[qid];
  const correctChoices = q.statements.map(st => st.choices[st.correct]);
  
  // In esame: non registrare ancora, solo salva la selezione
  if (session.isExam) {
    // Non chiamare recordAnswer, la risposta verrà registrata in finishQuiz()
    persist();
    render();
    return;
  }
  
  // In pratica libera: registra subito
  const correct = JSON.stringify(state.selected) === JSON.stringify(correctChoices);
  session.answers[qid] = { selected: state.selected.slice(), correct };
  recordAnswer(qid, correct);
  persist();
  render();
}

function renderHotspotImage(q, answered) {
  const qid = q.id;
  if (!session.dragState[qid]) session.dragState[qid] = { selectedZones: [] };
  const state = session.dragState[qid];
  const zonesHtml = q.zones.map(z => {
    let cls = "hotspot-zone";
    const isSel = state.selectedZones.includes(z.id);
    if (answered) {
      const isCorrect = q.correctZones.includes(z.id);
      if (isCorrect) cls += " correct";
      else if (isSel) cls += " wrong";
    } else if (isSel) {
      cls += " selected";
    }
    return `<div class="${cls}" style="left:${z.x}%;top:${z.y}%;width:${z.w}%;height:${z.h}%"
      onclick="${answered && !session.isExam ? '' : `toggleHotspotZone(${qid}, '${z.id}')`}"></div>`;
  }).join("");
  const btn = (!answered && !session.isExam) ? `<button class="btn" style="margin-top:10px" ${state.selectedZones.length === 0 ? 'disabled' : ''} onclick="checkHotspotImage(${qid})">Verifica</button>` : "";
  return `
    <div class="hotspot-container">
      <img src="${q.media.url}" alt="Hotspot" />
      ${zonesHtml}
    </div>
    <div class="small" style="margin-top:8px">Clicca sulla zona corretta dell'immagine.</div>
    ${btn}
  `;
}
function toggleHotspotZone(qid, zoneId) {
  const state = session.dragState[qid];
  const pos = state.selectedZones.indexOf(zoneId);
  if (pos >= 0) state.selectedZones.splice(pos, 1); else state.selectedZones.push(zoneId);
  persist();
  render();
}
function checkHotspotImage(qid) {
  const q = getQ(qid);
  const state = session.dragState[qid];
  const selSorted = state.selectedZones.slice().sort();
  const correctSorted = q.correctZones.slice().sort();
  const correct = JSON.stringify(selSorted) === JSON.stringify(correctSorted);
  session.answers[qid] = { selected: selSorted, correct };
  recordAnswer(qid, correct);
  persist();
  render();
}

function renderHotspot(q, answered) {
  const qid = q.id;
  if (!session.dragState[qid]) session.dragState[qid] = { selected: q.options.map(() => null) };
  const state = session.dragState[qid];
  const rows = q.options.map((opt, i) => `
    <div style="margin-bottom:10px">
      <span class="small">Statement ${i + 1}:</span>
      <select class="dropdown-inline" data-qid="${qid}" data-i="${i}" onchange="hotspotSelect(event)" ${answered && !session.isExam ? 'disabled' : ''}>
        <option value="">-- scegli --</option>
        <option value="Yes" ${state.selected[i] === 'Yes' ? 'selected' : ''}>Yes</option>
        <option value="No" ${state.selected[i] === 'No' ? 'selected' : ''}>No</option>
      </select>
      ${answered ? (state.selected[i] === (q.correct && q.correct[i]) ? '✅' : '❌') : ''}
    </div>
  `).join("");
  const btn = (!answered && !session.isExam) ? `<button class="btn" onclick="checkHotspot(${qid})">Verifica</button>` : "";
  return `<div>${rows}</div>${btn}`;
}
function hotspotSelect(ev) {
  const qid = parseInt(ev.target.dataset.qid);
  const i = parseInt(ev.target.dataset.i);
  session.dragState[qid].selected[i] = ev.target.value;
  persist();
}
function checkHotspot(qid) {
  const q = getQ(qid);
  const state = session.dragState[qid];
  const correctArr = q.correct || q.options.map(() => "Yes");
  const correct = JSON.stringify(state.selected) === JSON.stringify(correctArr);
  session.answers[qid] = { selected: state.selected, correct };
  recordAnswer(qid, correct);
  persist();
  render();
}

function scenarioBlockHtml(scenarioId) {
  const sc = SCENARIOS[scenarioId];
  if (!sc) return "";

  const expanded = window._expandedScenarios && window._expandedScenarios[scenarioId];
  const mediaHtml = (sc.media || []).map(m => `
    <img src="${m.url}" alt="${m.caption || ''}" style="max-width:100%;border-radius:8px;margin-top:8px" />
  `).join("");

  // Normalizza \r\n in \n e poi converte \n in <br> per il rendering HTML
  const textWithBreaks = (sc.text || "").replace(/\r\n/g, "\n").replace(/\n/g, "<br>");

  return `
    <div class="explain" style="border-color:var(--accent);margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer" onclick="toggleScenario('${scenarioId}')">
        <b>📄 ${sc.title || 'Scenario'}</b>
        <span class="small">${expanded ? '▲ Nascondi' : '▼ Mostra scenario'}</span>
      </div>
      ${expanded
        ? `<div style="margin-top:10px;white-space:pre-wrap">${textWithBreaks}</div>${mediaHtml}`
        : ''}
    </div>
  `;
}

function toggleScenario(scenarioId) {
  if (!window._expandedScenarios) window._expandedScenarios = {};
  window._expandedScenarios[scenarioId] = !window._expandedScenarios[scenarioId];
  render();
}

function toggleFlag(qid) {
  if (!session.flags) session.flags = {};
  session.flags[qid] = !session.flags[qid];
  if (session.flags[qid]) {
    flagFreq[qid] = (flagFreq[qid] || 0) + 1;
    saveJSON(FLAG_FREQ_KEY, flagFreq);
  }
  persist();
  render();
}

function isCaseStudy(topic) {
  return topic >= 5;
}

function scenarioKeyOf(q) {
  if (q && isCaseStudy(q.topic)) {
    return `case_topic_${q.topic}`;
  }

  if (q && q.scenarioId !== null && q.scenarioId !== undefined) {
    return `scenario_${q.topic}_${q.scenarioId}`;
  }

  return q ? `question_${q.id}` : "";
}

function caseStudyKeyOf(q) {
  return isCaseStudy(q.topic)
    ? `case_topic_${q.topic}`
    : null;
}

function sameCaseStudy(q1, q2) {
  return !!q1 && !!q2 &&
    isCaseStudy(q1.topic) &&
    isCaseStudy(q2.topic) &&
    caseStudyKeyOf(q1) === caseStudyKeyOf(q2);
}

function isQuestionLocked(q) {
  if (!q) return false;
  if (q.type === "yesno") {
    return !!(session.answers && session.answers[q.id] && session.answers[q.id].locked);
  }
  if (isCaseStudy(q.topic)) {
    return !!(session.lockedCaseStudies && session.lockedCaseStudies.includes(caseStudyKeyOf(q)));
  }
  return false;
}

function hasReachablePrevQuestion(idx) {
  if (!session.isExam) return idx > 0;
  let i = idx - 1;
  while (i >= 0) {
    const q = getQ(session.ids[i]);
    if (!isQuestionLocked(q)) return true;
    i--;
  }
  return false;
}

function lockCaseStudyIfNeeded(fromIdx, toIdx) {
  if (!session || !session.isExam) return;

  const fromQ = getQ(session.ids[fromIdx]);
  const toQ = toIdx < session.ids.length
    ? getQ(session.ids[toIdx])
    : null;

  if (!fromQ || !isCaseStudy(fromQ.topic)) {
    return;
  }

  // Se la domanda dopo appartiene ancora allo stesso topic,
  // sei ancora dentro al blocco: non lo chiudere.
  if (toQ && isCaseStudy(toQ.topic) && toQ.topic === fromQ.topic) {
    return;
  }

  if (!session.lockedCaseStudies) {
    session.lockedCaseStudies = [];
  }

  const lockKey = `case_topic_${fromQ.topic}`;

  if (!session.lockedCaseStudies.includes(lockKey)) {
    session.lockedCaseStudies.push(lockKey);
  }
}

function isLastQuestionOfCaseStudy(idx) {
  if (!session.isExam || idx < 0 || idx >= session.ids.length - 1) {
    return false;
  }

  const currentQ = getQ(session.ids[idx]);
  const nextQ = getQ(session.ids[idx + 1]);

  if (!currentQ || !isCaseStudy(currentQ.topic)) {
    return false;
  }

  return !sameCaseStudy(currentQ, nextQ);
}

function isLockedYesNoQuestion(q) {
  return !!(
    session.isExam &&
    q &&
    q.type === "yesno" &&
    session.lockedYesNoScenarios &&
    session.lockedYesNoScenarios.includes(scenarioKeyOf(q))
  );
}

function isSkippedLockedQuestion(q) {
  return isLockedYesNoQuestion(q) || isLockedCaseStudyQuestion(q);
}

function findNextAccessibleIndex(fromIndex) {
  let i = fromIndex + 1;

  while (i < session.ids.length) {
    const candidate = getQ(session.ids[i]);

    if (!isSkippedLockedQuestion(candidate)) {
      return i;
    }

    i++;
  }

  return session.ids.length - 1;
}

function isLockedCaseStudyQuestion(q) {
  if (
    !session ||
    !session.isExam ||
    !q ||
    !isCaseStudy(q.topic)
  ) {
    return false;
  }

  // Tutte le domande dello stesso topic case study condividono
  // una sola chiave di lock.
  const lockKey = `case_topic_${q.topic}`;
  const locked = session.lockedCaseStudies || [];

  return locked.includes(lockKey);
}

function nextQuestion() {
  if (!session) {
    return;
  }

  const fromIdx = session.current;
  const fromQ = getQ(session.ids[fromIdx]);
  const isLastQuestion = fromIdx >= session.ids.length - 1;

  // Se si arriva all'ultima domanda durante una consultazione dalla revisione,
  // "Successiva" non deve chiudere la revisione: resta sull'ultima domanda.
  if (session.reviewMode && isLastQuestion) {
    return;
  }

  // ----- Modalità esame: Yes/No obbligatoria e definitiva -----
  if (
    session.isExam &&
    fromQ &&
    fromQ.type === "yesno" &&
    !(session.answers[fromQ.id] && session.answers[fromQ.id].locked)
  ) {
    const selected = session.tempSingle
      ? session.tempSingle[fromQ.id]
      : undefined;

    if (selected === undefined || selected === null) {
      alert("⚠️ Devi rispondere Yes o No prima di proseguire.");
      return;
    }

    const ok = confirm(
      "⚠️ Stai per confermare questa risposta Yes/No. " +
      "Una volta confermata non potrai più modificarla né tornare indietro a questa domanda. Continuare?"
    );

    if (!ok) {
      return;
    }

    const correct = selected === fromQ.correct;

    session.answers[fromQ.id] = {
      selected,
      correct,
      locked: true
    };

    recordAnswer(fromQ.id, correct);
  }

  // Se questa è l'ultima domanda del test/esame, apri direttamente la revisione.
  // Funziona anche se l'ultima domanda è stata raggiunta tramite la griglia.
  if (isLastQuestion) {
    finishQuiz();
    return;
  }

  // L'indice immediatamente successivo, prima di saltare eventuali blocchi chiusi.
  const rawNextIdx = fromIdx + 1;

  // ----- Modalità esame: conferma uscita da case study -----
  if (session.isExam && isLastQuestionOfCaseStudy(fromIdx)) {
    const ok = confirm(
      "⚠️ Stai per uscire da questo case study. " +
      "In un esame reale non potrai più tornare indietro per modificare le risposte a questo scenario. Continuare?"
    );

    if (!ok) {
      return;
    }
  }

  // Blocca il case study se il passaggio porta fuori dal relativo topic.
  lockCaseStudyIfNeeded(fromIdx, rawNextIdx);

  // Trova la prima domanda successiva raggiungibile.
  let toIdx = rawNextIdx;

  while (toIdx < session.ids.length) {
    const candidate = getQ(session.ids[toIdx]);

    const yesNoLocked = !!(
      session.isExam &&
      candidate &&
      candidate.type === "yesno" &&
      session.answers[candidate.id] &&
      session.answers[candidate.id].locked
    );

    const caseStudyLocked = isLockedCaseStudyQuestion(candidate);

    if (!yesNoLocked && !caseStudyLocked) {
      break;
    }

    toIdx++;
  }

  // Se dopo eventuali salti non c'è una domanda accessibile,
  // passa comunque alla revisione.
  if (toIdx >= session.ids.length) {
    finishQuiz();
    return;
  }

  session.current = toIdx;
  persist();
  render();
}

function prevQuestion() {
  if (!session) return;

  const fromIdx = session.current;
  const fromQ = getQ(session.ids[fromIdx]);

  // Yes/No: quando lasci la domanda anche andando indietro,
  // la risposta diventa definitiva esattamente come con "Successiva"
  // e con la griglia.
  if (
    session.isExam &&
    fromQ &&
    fromQ.type === "yesno" &&
    !(session.answers[fromQ.id] && session.answers[fromQ.id].locked)
  ) {
    const selected = session.tempSingle
      ? session.tempSingle[fromQ.id]
      : undefined;

    if (selected === undefined || selected === null) {
      alert("⚠️ Devi rispondere Yes o No prima di proseguire.");
      return;
    }

    const ok = confirm(
      "⚠️ Stai per confermare questa risposta Yes/No. " +
      "Una volta confermata non potrai più modificarla né tornare indietro a questa domanda. Continuare?"
    );

    if (!ok) {
      return;
    }

    const correct = selected === fromQ.correct;

    session.answers[fromQ.id] = {
      selected,
      correct,
      locked: true
    };

    recordAnswer(fromQ.id, correct);
  }

  let targetIdx = fromIdx - 1;

  // Prima trova la domanda precedente accessibile, saltando eventuali
  // Yes/No o case study già bloccati.
  while (targetIdx >= 0) {
    const candidate = getQ(session.ids[targetIdx]);

    const caseStudyLocked = isLockedCaseStudyQuestion(candidate);

    const yesNoLocked = !!(
      session.isExam &&
      candidate &&
      candidate.type === "yesno" &&
      session.answers[candidate.id] &&
      session.answers[candidate.id].locked
    );

    if (!caseStudyLocked && !yesNoLocked) {
      break;
    }

    targetIdx--;
  }

  if (targetIdx < 0) {
    targetIdx = 0;
  }

  const targetQ = getQ(session.ids[targetIdx]);

  // Se sei in un case study e torni a una domanda esterna al suo topic,
  // devi confermare l'uscita: il topic diventa irreversibilmente chiuso.
  if (
    session.isExam &&
    fromQ &&
    targetQ &&
    isCaseStudy(fromQ.topic) &&
    targetQ.topic !== fromQ.topic
  ) {
    const ok = confirm(
      "⚠️ Stai per uscire da questo case study. " +
      "In un esame reale non potrai più tornare indietro " +
      "per modificare le risposte a questo scenario. Continuare?"
    );

    if (!ok) {
      return;
    }

    if (!session.lockedCaseStudies) {
      session.lockedCaseStudies = [];
    }

    const lockKey = `case_topic_${fromQ.topic}`;

    if (!session.lockedCaseStudies.includes(lockKey)) {
      session.lockedCaseStudies.push(lockKey);
    }
  }

  session.current = targetIdx;
  persist();
  render();
}

function finishQuiz() {
  if (!session) {
    return;
  }

  // Se sei già nella revisione o nei risultati, evita doppie esecuzioni.
  if (session.phase === "review" || session.phase === "done") {
    return;
  }

  // Nella pratica libera salva le risposte inserite anche se non hai
  // premuto il pulsante "Verifica".
  if (!session.isExam) {
    savePendingPracticeAnswers();
  }

  if (session.isExam) {
    // Registra in blocco tutte le risposte dell'esame.
    // Le domande senza alcuna risposta restano non risposte.
    session.ids.forEach(qid => {
      const q = getQ(qid);

      if (!q) {
        return;
      }

      // Se Yes/No è stata già bloccata e registrata mentre navigavi,
      // NON sovrascrivere la risposta definitiva.
      if (
        q.type === "yesno" &&
        session.answers[qid] &&
        session.answers[qid].locked
      ) {
        return;
      }

      let userAnswer = null;
      let correct = false;

      if (
        q.type === "single" ||
        q.type === "yesno" ||
        q.type === "casestudy"
      ) {
        const selected = session.tempSingle
          ? session.tempSingle[qid]
          : undefined;

        if (selected !== undefined && selected !== null) {
          userAnswer = { selected };
          correct = selected === q.correct;
        }
      } else if (q.type === "multi") {
        const selected = (session.tempMulti && session.tempMulti[qid]) || [];

        // Una multi senza alcuna selezione è considerata non risposta.
        if (selected.length > 0) {
          userAnswer = { selected: selected.slice() };

          const correctSet = q.correct.slice().sort();
          const selSet = selected.slice().sort();
          correct = JSON.stringify(correctSet) === JSON.stringify(selSet);
        }
      } else if (q.type === "dragdrop") {
        const state = session.dragState && session.dragState[qid];

        if (state && state.zones && state.zones.some(value => value !== null)) {
          const sourceItems = q.sourceItems || q.options;
          const userLabels = state.zones.map(i =>
            i !== null ? sourceItems[i] : null
          );

          userAnswer = { selected: userLabels };

          const correctAssignment =
            q.correctAssignment ||
            (q.correct
              ? q.correct.map(label => sourceItems.indexOf(label))
              : []);

          correct =
            JSON.stringify(state.zones) ===
            JSON.stringify(correctAssignment);
        }
      } else if (q.type === "dropdown") {
        const state = session.dragState && session.dragState[qid];

        if (
          state &&
          state.selected &&
          state.selected.some(
            value =>
              value !== "" &&
              value !== undefined &&
              value !== null
          )
        ) {
          const correctChoices = q.statements.map(
            st => st.choices[st.correct]
          );

          userAnswer = { selected: state.selected.slice() };

          correct =
            JSON.stringify(state.selected) ===
            JSON.stringify(correctChoices);
        }
      } else if (q.type === "hotspot_image") {
        const state = session.dragState && session.dragState[qid];

        if (
          state &&
          state.selectedZones &&
          state.selectedZones.length > 0
        ) {
          const selectedZones = state.selectedZones.slice().sort();
          const correctZones = q.correctZones.slice().sort();

          userAnswer = { selected: selectedZones };
          correct =
            JSON.stringify(selectedZones) ===
            JSON.stringify(correctZones);
        }
      } else if (q.type === "hotspot") {
        const state = session.dragState && session.dragState[qid];

        if (
          state &&
          state.selected &&
          state.selected.some(
            value =>
              value !== "" &&
              value !== undefined &&
              value !== null
          )
        ) {
          const correctArr = q.correct || q.options.map(() => "Yes");

          userAnswer = { selected: state.selected.slice() };
          correct =
            JSON.stringify(state.selected) === JSON.stringify(correctArr);
        }
      }

      // Registra esclusivamente domande alle quali l’utente ha risposto.
      if (userAnswer !== null) {
        session.answers[qid] = {
          ...userAnswer,
          correct
        };

        recordAnswer(qid, correct);
      }
    });
  }

  // Entra nella revisione senza richiedere che l'utente abbia visitato
  // tutte le domande, né tramite pulsanti né tramite griglia.
  session.phase = "review";
  session.reviewMode = false;
  session.reviewStartedAt = Date.now();

  persist();
  render();
}

function pauseSession() {
  session.paused = true;
  session.pausedAt = Date.now();
  session.elapsedBeforePause = Date.now() - session.startedAt;
  persist();
  alert("Test in pausa. Puoi chiudere il browser: alla riapertura ti verrà proposto di riprendere da qui.");
  clearSession_softExitToHome();
}
function clearSession_softExitToHome() {
  renderHomeWithResume();
}
function exitSession() {
  if (confirm("Uscire e abbandonare il test corrente? Il progresso verrà perso.")) {
    clearSession();
    render();
  }
}

function renderHomeWithResume() {
  appEl.innerHTML = `
    ${topNavHtml()}
    <div class="view-card">
      <div class="section-header">
        <div class="section-title">⏸ Test in pausa</div>
        <div class="section-subtitle">
          Il tuo progresso è stato salvato. Puoi riprendere in qualsiasi momento, anche dopo aver chiuso il browser.
        </div>
      </div>
      <button class="btn" onclick="resumeSession()">▶ Riprendi test</button>
      <button class="btn danger" onclick="clearSession(); render();">Abbandona test</button>
    </div>
  `;
}
function resumeSession() {
  session.paused = false;
  session.pausedAt = null;
  session.startedAt = Date.now() - (session.elapsedBeforePause || 0);
  persist();
  render();
}

function cancelPausedSession() {
  if (confirm("Annullare definitivamente il test in pausa? Il progresso verrà perso.")) {
    clearSession();
    currentView = "home";
    render();
  }
}

// ====================== REVIEW ======================
function renderReview() {
  const total = session.ids.length;

  let correctCount = 0;
  session.ids.forEach(qid => {
    if (session.answers[qid] && session.answers[qid].correct) {
      correctCount++;
    }
  });

  const isExam = !!session.isExam;
  const hasCountdown = !!(
    session.isExam ||
    (session.isFlash && session.flashDeadline)
  );

  // Solo l'esame ha una scadenza reale.
  // La pratica libera resta a tempo crescente.
  let timerHtml = "";

  if (hasCountdown) {
    const deadline = session.isExam
      ? session.examDeadline
      : session.flashDeadline;

    const remaining = Math.max(
      0,
      Math.round((deadline - Date.now()) / 1000)
    );

    const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
    const ss = String(remaining % 60).padStart(2, "0");

    if (remaining <= 0) {
      finishReview();
      return;
    }

    timerHtml = session.isExam
      ? `⏳ Tempo esame rimanente: ${mm}:${ss}`
      : `⚡ Tempo ripasso rimanente: ${mm}:${ss}`;
  } else {
    const elapsed = Math.max(
      0,
      Math.round((Date.now() - session.startedAt) / 1000)
    );

    const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
    const ss = String(elapsed % 60).padStart(2, "0");

    timerHtml = `⏱ Tempo trascorso: ${mm}:${ss}`;
  }

  const flaggedCount = session.ids.filter(
    qid => session.flags && session.flags[qid]
  ).length;

  const filterActive = !!window._reviewFlagFilter;

  // In esame Yes/No e case study non appaiono nella revisione generale.
  // In pratica libera appaiono tutte le domande.
  let indices = session.ids
    .map((qid, i) => ({ qid, i }))
    .filter(({ qid }) => {
      const q = getQ(qid);

      if (!q) {
        return false;
      }

      if (!isExam) {
        return true;
      }

      return q.type !== "yesno" && !isCaseStudy(q.topic);
    })
    .map(({ i }) => i);

  if (filterActive) {
    indices = indices.filter(
      i => session.flags && session.flags[session.ids[i]]
    );
  }

  const rows = indices.map(i => {
    const qid = session.ids[i];
    const q = getQ(qid);

    // Oggetto completo della risposta salvata, se esiste.
    const storedAnswer = session.answers && session.answers[qid];

    // isChecked è solo un booleano: indica se hai premuto "Verifica".
    const isChecked = !!(
      storedAnswer &&
      (
        storedAnswer.checked === true ||
        (
          storedAnswer.checked === undefined &&
          typeof storedAnswer.correct === "boolean"
        )
      )
    );

    // correctValue conserva il vero valore true/false della correzione.
    const correctValue =
      storedAnswer && typeof storedAnswer.correct === "boolean"
        ? storedAnswer.correct
        : null;

    let hasInsertedAnswer = false;

    if (isExam) {
      hasInsertedAnswer = isAnsweredForExamNavigation(qid);
    } else {
      // Riconosce sia una risposta appena scelta (tempSingle/tempMulti/dragState)
      // sia una risposta salvata in precedenza con checked: false.
      hasInsertedAnswer = hasPendingAnswer(q) || !!storedAnswer;
    }

    let statusHtml = "";

    // ESAME: non mostra corretto/errato prima della consegna.
    if (isExam) {
      statusHtml = hasInsertedAnswer
        ? "✍️ Risposta inserita"
        : "⏺ Non risposta";
    } else if (isChecked) {
      // Se è verificata, usa il valore booleano originale salvato dalla funzione Verifica.
      statusHtml = correctValue === true
        ? "✅ Corretta"
        : "❌ Errata";
    } else if (hasInsertedAnswer) {
      // Risposta presente, ma Verifica non è stata premuta.
      statusHtml = "✍️ Risposta inserita";
    } else {
      statusHtml = "⏺ Non risposta";
    }

    const flagged = session.flags && session.flags[qid];

    return `
      <div class="topic-row">
        <span>
          ${flagged ? "🚩 " : ""}
          ${i + 1}. ${q.text.slice(0, 70)}${q.text.length > 70 ? "…" : ""}
        </span>

        <span>
          ${statusHtml}
          <button
            class="btn secondary"
            style="padding:4px 10px;font-size:12px"
            onclick="jumpToReview(${i})"
          >
            Vedi
          </button>
        </span>
      </div>
    `;
  }).join("");

  let visibleRows = rows;

  if (filterActive && indices.length === 0) {
    visibleRows = '<div class="small">Nessuna domanda contrassegnata.</div>';
  } else if (!filterActive && indices.length === 0) {
    visibleRows = '<div class="small">Nessuna domanda disponibile per la revisione.</div>';
  }

  const showOnlyFlagged = !!window._reviewFlagFilter;

  appEl.innerHTML = `
    ${topNavHtml()}

    <div class="view-card">
      <div class="section-header">
        <div class="section-title">🔍 Revisione finale</div>

        <div class="section-subtitle">
          ${isExam
            ? "Controlla risposte, domande non risposte e contrassegnate. I risultati saranno mostrati solo dopo la consegna."
            : `Punteggio verificato finora: ${correctCount}/${total} (${Math.round(100 * correctCount / total)}%)`
          }

          ${flaggedCount > 0
            ? `· 🚩 ${flaggedCount} contrassegnate per revisione`
            : ""
          }
        </div>
      </div>

      <div class="review-bar">
        <div class="timer">
          ${timerHtml}
        </div>

        ${flaggedCount > 0
          ? `
            <button
              class="btn ${showOnlyFlagged ? "warn" : "secondary"}"
              style="margin-top:8px"
              onclick="toggleFlagFilter()"
            >
              ${showOnlyFlagged
                ? "↩ Mostra tutte"
                : "🚩 Mostra solo contrassegnate"
              }
            </button>
          `
          : ""
        }
      </div>

      <div class="card">
        ${visibleRows}
      </div>

      <button class="btn" onclick="finishReview()">
        ${isExam ? "✔ Concludi esame" : "✔ Concludi revisione"}
      </button>
    </div>
  `;

  // Mantiene il timer aggiornato una volta al secondo:
  // - esame: countdown;
  // - pratica libera: tempo trascorso crescente.
  if (!session._reviewInterval) {
    session._reviewInterval = setInterval(() => {
      if (!session || session.phase !== "review") {
        clearInterval(session._reviewInterval);
        session._reviewInterval = null;
        return;
      }

      // Esame e ripasso lampo condividono un countdown.
      if (session.isExam || (session.isFlash && session.flashDeadline)) {
        const deadline = session.isExam
          ? session.examDeadline
          : session.flashDeadline;

        const remaining = Math.max(
          0,
          Math.round((deadline - Date.now()) / 1000)
        );

        if (remaining <= 0) {
          clearInterval(session._reviewInterval);
          session._reviewInterval = null;
          finishReview();
          return;
        }
      }

      // Aggiorna ogni secondo:
      // - esame/ripasso lampo: countdown;
      // - pratica libera: tempo trascorso.
      render();
    }, 1000);
  }
}

function hasPendingAnswer(q) {
  if (!session || !q) {
    return false;
  }

  const qid = q.id;

  if (
    q.type === "single" ||
    q.type === "yesno" ||
    q.type === "casestudy"
  ) {
    return !!(
      session.tempSingle &&
      session.tempSingle[qid] !== undefined &&
      session.tempSingle[qid] !== null
    );
  }

  if (q.type === "multi") {
    return !!(
      session.tempMulti &&
      session.tempMulti[qid] &&
      session.tempMulti[qid].length > 0
    );
  }

  const state = session.dragState && session.dragState[qid];

  if (q.type === "dragdrop") {
    return !!(
      state &&
      state.zones &&
      state.zones.some(value => value !== null)
    );
  }

  if (q.type === "dropdown" || q.type === "hotspot") {
    return !!(
      state &&
      state.selected &&
      state.selected.some(
        value =>
          value !== "" &&
          value !== undefined &&
          value !== null
      )
    );
  }

  if (q.type === "hotspot_image") {
    return !!(
      state &&
      state.selectedZones &&
      state.selectedZones.length > 0
    );
  }

  return false;
}

function savePendingPracticeAnswers() {
  if (!session || session.isExam) {
    return;
  }

  session.ids.forEach(qid => {
    // Se è già stata verificata, non toccarla.
    if (session.answers && session.answers[qid]) {
      return;
    }

    const q = getQ(qid);

    if (!q || !hasPendingAnswer(q)) {
      return;
    }

    let selected = null;

    if (
      q.type === "single" ||
      q.type === "yesno" ||
      q.type === "casestudy"
    ) {
      selected = session.tempSingle[qid];
    } else if (q.type === "multi") {
      selected = session.tempMulti[qid].slice();
    } else if (q.type === "dragdrop") {
      const sourceItems = q.sourceItems || q.options;
      const state = session.dragState[qid];

      selected = state.zones.map(index =>
        index !== null ? sourceItems[index] : null
      );
    } else if (q.type === "dropdown" || q.type === "hotspot") {
      selected = session.dragState[qid].selected.slice();
    } else if (q.type === "hotspot_image") {
      selected = session.dragState[qid].selectedZones.slice();
    }

    // "checked: false" distingue la risposta inserita da quella valutata.
    session.answers[qid] = {
      selected,
      checked: false
    };
  });

  persist();
}

function jumpToReview(i) {
  if (!session) {
    return;
  }

  const qid = session.ids[i];
  const q = getQ(qid);

  if (!q) {
    return;
  }

  // In un esame, Yes/No confermate e case study chiusi non devono
  // essere mai riaperti dalla pagina di revisione.
  if (session.isExam) {
    const yesNoLocked = !!(
      q.type === "yesno" &&
      session.answers &&
      session.answers[q.id] &&
      session.answers[q.id].locked
    );

    const caseStudyLocked = isLockedCaseStudyQuestion(q);

    if (yesNoLocked || caseStudyLocked) {
      alert(
        "🔒 Questa domanda appartiene a una sezione già chiusa " +
        "e non può essere riaperta o modificata."
      );
      return;
    }
  }

  session.phase = "quiz";
  session.current = i;
  session.reviewMode = true;

  persist();
  render();
}

function backToReview() {
  if (!session) {
    return;
  }

  session.phase = "review";
  session.reviewMode = false;

  persist();
  render();
}

function toggleFlagFilter() {
  window._reviewFlagFilter = !window._reviewFlagFilter;
  render();
}

function finishReview() {
  session.phase = "done";
  persist();
  render();
}

// ====================== RISULTATI ======================
function simulateMicrosoftScore(pctCorrect) {
  const raw = pctCorrect / 100;
  let scaled;
  if (raw <= 0) scaled = 100;
  else scaled = Math.round(100 + raw * 900);
  scaled = Math.max(100, Math.min(1000, scaled));
  return scaled;
}

function domainOf(topic) {
  if (topic === 1) return "Prepare data";
  if (topic === 2) return "Model data";
  if (topic === 3) return "Visualize & analyze";
  if (topic === 4) return "Deploy & maintain";
  return "Case study";
}

function domainBarChartHtml(byTopic) {
  const domains = {};
  Object.keys(byTopic).forEach(t => {
    const d = domainOf(parseInt(t));
    if (!domains[d]) domains[d] = { total: 0, correct: 0 };
    domains[d].total += byTopic[t].total;
    domains[d].correct += byTopic[t].correct;
  });
  const rows = Object.keys(domains).map(d => {
    const s = domains[d];
    const pct = s.total ? Math.round(100 * s.correct / s.total) : 0;
    return `<div style="margin-bottom:10px">
      <div class="small" style="display:flex;justify-content:space-between">
        <span>${d}</span><span>${s.correct}/${s.total} (${pct}%)</span>
      </div>
      <div class="progressbar"><div class="progressbar-fill" style="width:${pct}%; background:${pct >= 70 ? 'var(--correct)' : 'var(--accent2)'}"></div></div>
    </div>`;
  }).join("");
  return rows;
}

function renderResults() {
  const total = session.ids.length;
  let correctCount = 0;
  let wrongCount = 0;
  const byTopic = {};
  session.ids.forEach(qid => {
    const q = getQ(qid);
    const a = session.answers[qid];
    if (!byTopic[q.topic]) byTopic[q.topic] = { total: 0, correct: 0 };
    byTopic[q.topic].total++;
    if (a && a.correct) {
      correctCount++;
      byTopic[q.topic].correct++;
    } else {
      wrongCount++;
    }
  });
  const pct = Math.round(100 * correctCount / total);
  const wrongPct = Math.round(100 * wrongCount / total);
  const scaledScore = simulateMicrosoftScore(pct);
  const passed = scaledScore >= 700;

  let topicRows = Object.keys(byTopic).map(t => {
    const s = byTopic[t];
    return `<div class="topic-row">
      <span>${topicLabel(t)}</span>
      <span>${s.correct}/${s.total} (${Math.round(100 * s.correct / s.total)}%)</span>
    </div>`;
  }).join("");

  if (!window._historyLogSaved || window._historyLogSaved !== session.startedAt) {
    const log = loadJSON("pl300_exam_log_v1", []);
    log.push({
      date: new Date().toISOString(),
      isExam: !!session.isExam,
      total,
      correctCount,
      wrongCount,
      pct,
      scaledScore,
      passed
    });
    saveJSON("pl300_exam_log_v1", log);
    window._historyLogSaved = session.startedAt;
  }

  const scoreLabel = session.isExam
    ? "🎓 Simulazione punteggio Microsoft (scala 1-1000, soglia 700)"
    : "📈 Punteggio stimato in scala Microsoft (scala 1-1000, soglia 700)";

  const scoreBadge = `
    <div class="card" style="text-align:center; border: 2px solid ${passed ? 'var(--correct)' : 'var(--wrong)'}">
      <div class="small">${scoreLabel}</div>
      <div class="stat-value" style="color:${passed ? 'var(--correct)' : 'var(--wrong)'}">${scaledScore} / 1000</div>
      <div class="stat-label">${passed ? '✅ SUPERATO (stima)' : '❌ NON SUPERATO (stima)'}</div>
      <div class="grid" style="margin-top:14px">
        <div style="text-align:center">
          <div class="stat-value" style="color:var(--correct)">${correctCount}</div>
          <div class="stat-label">✅ Corrette — ${pct}%</div>
        </div>
        <div style="text-align:center">
          <div class="stat-value" style="color:var(--wrong)">${wrongCount}</div>
          <div class="stat-label">❌ Errate — ${wrongPct}%</div>
        </div>
      </div>
      <div class="small" style="margin-top:8px">
        ⚠️ Stima approssimativa a scopo di allenamento: Microsoft usa un algoritmo di scoring proprietario non pubblico, con domande pesate diversamente e alcune non conteggiate.
      </div>
    </div>
  `;

  appEl.innerHTML = `
    ${topNavHtml()}
    <div class="view-card">
      <div class="section-header">
        <div class="section-title">Risultati</div>
        <div class="section-subtitle">Dettaglio per dominio e topic</div>
      </div>

      ${scoreBadge}

      <div class="card">
        <h3>📊 Distribuzione per dominio d'esame</h3>
        ${domainBarChartHtml(byTopic)}
      </div>

      <div class="card">
        <h3>Dettaglio per topic</h3>
        ${topicRows}
      </div>

      <div style="margin-top:12px">
        <button class="btn" onclick="clearSession(); render();">🏠 Torna alla home</button>
        <button class="btn secondary" onclick="exportProgress()">💾 Esporta progresso</button>
      </div>
    </div>
  `;
}

function formatCorrectAnswer(q) {
  if (q.type === "single" || q.type === "casestudy") {
    return String.fromCharCode(65 + q.correct) + ". " + q.options[q.correct];
  }
  if (q.type === "yesno") {
    return q.options[q.correct];
  }
  if (q.type === "multi") {
    return q.correct.map(i => String.fromCharCode(65 + i) + ". " + q.options[i]).join(" · ");
  }
  if (q.type === "dragdrop") {
    const sourceItems = q.sourceItems || q.options;
    const targetLabels = q.targets || (q.correct ? q.correct.map((_, i) => "Posizione " + (i + 1)) : []);
    const correctAssignment = q.correctAssignment || (q.correct ? q.correct.map(label => sourceItems.indexOf(label)) : []);
    return correctAssignment.map((srcIdx, i) => `${targetLabels[i]}: ${sourceItems[srcIdx]}`).join(" · ");
  }
  if (q.type === "dropdown") {
    return q.statements.map(st => `${st.text.slice(0, 40)}... → ${st.choices[st.correct]}`).join(" · ");
  }
  if (q.type === "hotspot_image") {
    return "Zone corrette: " + q.correctZones.join(", ");
  }
  return "Vedi nota.";
}

function flagBadgeFor(qid) {
  const count = flagFreq[qid] || 0;
  if (count === 0) return "";
  if (count === 1) return `<span class="badge" style="background:#f8514922;color:#f85149">🚩 1 volta</span>`;
  return `<span class="badge" style="background:#f8514944;color:#f85149">🚩 ${count} volte — ricorrente</span>`;
}

function leitnerIconFor(qid) {
  const icons = { 1: "🆕", 2: "⭐", 3: "⭐⭐", 4: "⭐⭐⭐", 5: "🔒" };
  ensureSrs(qid);
  return icons[srs[qid].box] || "🆕";
}

// ====================== SPIEGAZIONI ======================
function renderExplanations() {
  const topicIds = [...new Set(QUESTIONS.map(q => q.topic))].sort((a, b) => a - b);

  const activeFilter = window._explFilter || "all";
  const searchTerm = (window._explSearch || "").toLowerCase().trim();

  // Filtro per topic
  let filterHtml = '<select id="explTopicFilter" onchange="applyExplFilter()" style="margin-bottom:10px;width:100%">';
  filterHtml += `<option value="all"${activeFilter === "all" ? ' selected' : ''}>Tutti i topic</option>`;
  topicIds.forEach(t => {
    const value = String(t);
    const isSelected = (activeFilter === value);
    filterHtml += `<option value="${value}"${isSelected ? ' selected' : ''}>${topicLabel(t)}</option>`;
  });
  filterHtml += '</select>';

  // Ricerca per parola chiave
  const searchHtml = `
    <input
      type="text"
      id="explSearchInput"
      placeholder="🔍 Cerca per parola chiave nella domanda..."
      style="width:100%;margin-bottom:14px"
      value="${window._explSearch || ''}"
      oninput="applyExplSearch()"
    >
  `;

  // Applica filtri a QUESTIONS
  let list = QUESTIONS;
  if (activeFilter !== "all") {
    list = list.filter(q => String(q.topic) === String(activeFilter));
  }
  if (searchTerm) {
    list = list.filter(q =>
      q.text.toLowerCase().includes(searchTerm) ||
      (q.options && q.options.join(" ").toLowerCase().includes(searchTerm))
    );
  }

  const items = list.map(q => {
    const explanationText = q.explanation || q.note || "";

    return `
      <div class="explain-item">
        <div class="explain-header">
          <div class="explain-meta">
            ${topicLabel(q.topic)} ·
            <span class="badge ${q.type}">${q.type}</span> ·
            ${leitnerIconFor(q.id)} ${flagBadgeFor(q.id)}
          </div>
          <div class="explain-qid">Domanda ${q.id}</div>
        </div>

        <div class="explain-section">
          <div class="explain-label">📝 Traccia</div>
          <div class="explain-q">${q.text}</div>
        </div>

        <div class="explain-section">
          <div class="explain-label">✅ Risposta corretta</div>
          <div class="explain-a">${formatCorrectAnswer(q)}</div>
        </div>

        ${explanationText
          ? `
            <div class="explain-section">
              <div class="explain-label">💡 Spiegazione</div>
              <div class="explain-note">${explanationText}</div>
            </div>
          `
          : ""}
      </div>
    `;
  }).join("");

  appEl.innerHTML = `
    ${topNavHtml()}
    <div class="view-card">
      <div class="section-header">
        <div class="section-title">📖 Spiegazioni complete</div>
        <div class="section-subtitle">
          Tutte le domande con la risposta corretta e la spiegazione, per capire il perché senza dover rifare il quiz.
        </div>
      </div>

      <div class="card">
        ${filterHtml}
        ${searchHtml}
        <div class="small" style="margin-bottom:10px">${list.length} domande mostrate</div>
        ${items}
      </div>
    </div>
  `;

  const inp = document.getElementById("explSearchInput");
  if (inp && window._explSearchFocused) {
    inp.focus();
    inp.setSelectionRange(inp.value.length, inp.value.length);
  }
}

function applyExplFilter() {
  const sel = document.getElementById("explTopicFilter");
  if (!sel) return;

  // valore del select, es. "all", "7", "3"...
  const value = sel.value || "all";
  window._explFilter = value;

  // re-render della pagina spiegazioni
  renderExplanations();
}

function applyExplSearch() {
  const inp = document.getElementById("explSearchInput");
  if (!inp) return;

  // testo digitato nella barra di ricerca
  window._explSearch = inp.value || "";
  window._explSearchFocused = true;

  // re-render della pagina spiegazioni
  renderExplanations();
}

// ---------------- Boot ----------------
window.onload = async function () {
  applyTheme();
  await ensureQuestionsLoaded();
  if (session && session.paused) {
    renderHomeWithResume();
  } else {
    render();
  }
};

// Listener globale per tap-to-move sulla pool (semplificato)
document.addEventListener('click', function(ev) {
  const item = ev.target.closest('.dragitem');
  if (!item) return;

  const qid = parseInt(item.dataset.qid);
  const idx = parseInt(item.dataset.idx);
  if (isNaN(qid) || isNaN(idx)) return;

  // se la domanda è già risposta, ignora
  const answered = !!(session.answers && session.answers[qid]);
  if (answered) return;

  tapPoolItem(qid, idx);
}, true);