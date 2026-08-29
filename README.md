# PL-300 Exam Simulator | Interactive Quiz Platform

## 📝 Descrizione del Progetto

Sviluppo di una piattaforma web interattiva per l'allenamento sui principali argomenti della certificazione **Microsoft Power BI Data Analyst (PL-300)**.

Il progetto trasforma una banca di domande strutturata in file JSON in un simulatore utilizzabile per pratica libera, ripasso mirato e simulazione d'esame. L'applicazione è realizzata come sito statico con **HTML, CSS e JavaScript Vanilla**, senza framework o backend applicativo.

La piattaforma è stata sviluppata in ottica *vibe coding*, attraverso progettazione iterativa, test su desktop e smartphone, debugging funzionale e supporto di strumenti AI: **Perplexity** (con modelli Claude Sonnet e GPT), **Google Gemini** e **Google AI Studio**. Quest'ultimo è stato utilizzato per supportare l'estrazione e la strutturazione in JSON di domande provenienti da documenti non strutturati.

---

## 🌐 Live Demo

La demo pubblica è disponibile tramite **GitHub Pages**:

➡️ **[Apri il PL-300 Exam Simulator](https://freddyg98.github.io/pl300-exam-simulator-demo/)**

> La repository contiene una banca demo con domande fittizie, usate esclusivamente per mostrare le funzionalità tecniche della piattaforma.

---

## 🎯 Obiettivi del progetto

* Realizzare un simulatore web responsive per pratica e autovalutazione.
* Trasformare contenuti provenienti da documenti non strutturati in una banca dati JSON interrogabile.
* Gestire sessioni, risposte, statistiche e progresso direttamente nel browser.
* Riprodurre una modalità esame con timer, navigazione controllata e revisione finale.
* Applicare logiche di ripasso adattivo tramite spaced repetition e metodo Leitner.

---

## 🛠️ Strumenti Utilizzati

* **Frontend:** HTML5, CSS3, JavaScript Vanilla
* **Gestione dati:** JSON, Fetch API, FileReader API, LocalStorage
* **UI/UX:** CSS Grid, Flexbox, Media Queries, SVG inline
* **AI-assisted development:** Perplexity (Claude Sonnet e GPT), Google Gemini, Google AI Studio
* **Deploy personale:** Raspberry Pi 5, Docker, Nginx, Portainer
* **Demo pubblica:** GitHub Pages
* **Versionamento:** Git e GitHub

---

## 🚀 Funzionalità Principali

### 1. Banca Domande JSON

* Caricamento asincrono di file JSON suddivisi per topic tramite `fetch()`.
* Unione dinamica di più file e gestione di ID progressivi.
* Supporto al caricamento manuale di banche JSON dal browser.
* Struttura estendibile con testo, opzioni, spiegazioni, immagini, scenari e metadati per domain/tipologia.

### 2. Tipologie di Domanda

* Scelta singola (`single`)
* Risposta multipla (`multi`)
* Yes/No (`yesno`)
* Dropdown con statement multipli (`dropdown`)
* Drag & drop (`dragdrop`)
* Hotspot e hotspot su immagine
* Case study con scenario espandibile, testo e allegati

Le domande drag & drop supportano il trascinamento su desktop e il meccanismo **tap-to-move** su smartphone.

### 3. Pratica Libera e Filtri

* Selezione multipla di topic.
* Selezione multipla di domain: Prepare, Model, Visualize e Deploy.
* Selezione multipla per tipologia di domanda.
* Filtri combinabili tra loro e numero massimo di domande configurabile.
* Griglia di navigazione diretta tra le domande.
* Verifica opzionale della risposta: una risposta può essere salvata come inserita senza mostrare subito se è corretta o errata.

### 4. Modalità Esame Simulato

* Sessione con 40–50 domande casuali.
* Countdown unico di 100 minuti, valido sia durante il quiz sia nella revisione.
* Distribuzione ponderata delle domande per domain:

```text
Prepare: circa 27,5%
Model: circa 27,5%
Visualize: circa 27,5%
Deploy: circa 17,5%
```

* Navigazione rapida tramite griglia, stato delle risposte e domande contrassegnate.
* Nessun feedback immediato durante l'esame.
* Gestione di blocchi Case Study e domande Yes/No con regole di navigazione irreversibili.

### 5. Revisione, Statistiche e Spaced Repetition

* Revisione finale delle domande risposte, non risposte e contrassegnate.
* Statistiche globali e per topic.
* Storico dei risultati con grafico SVG dell'andamento.
* Esportazione e importazione del progresso in JSON.
* Sistema Leitner a cinque box per organizzare il ripasso nel tempo.
* Modalità dedicata alle domande SRS già dovute.

### 6. Ripasso Lampo Intelligente

Modalità di studio mirata configurabile per tempo disponibile, numero di domande, domain e tipologia.

Profili disponibili:

```text
🎯 Adattivo consigliato
❌ Solo domande errate
🚩 Solo domande contrassegnate
🔁 Solo domande SRS dovute
⚠️ Critiche Leitner 1–2
```

L'algoritmo adattivo attribuisce priorità a errori recenti, frequenza degli errori, bandierine, livello Leitner, ripassi dovuti e tempo trascorso dall'ultima visualizzazione.

### 7. UI Responsive e Persistenza

* Tema chiaro, scuro e automatico.
* Interfaccia responsive per desktop e smartphone.
* Salvataggio nel `localStorage` di sessione, risposte, statistiche, bandierine, tema e stato SRS.
* Possibilità di mettere in pausa e riprendere un test.

---

## 📁 Struttura del Progetto

```text
pl300-exam-simulator-demo/
│
├── index.html
├── README.md
├── .gitignore
│
├── css/
│   └── style.css
│
├── js/
│   └── app.js
│
├── data/
│   ├── topic1_demo.json
│   └── topic2_demo.json
│
└── images/
    └── fabrikam_retail_case_study_dashboard.png
```

| File / Cartella | Funzione |
|---|---|
| `index.html` | Punto di ingresso dell'applicazione |
| `css/style.css` | Temi, layout, componenti UI e responsività |
| `js/app.js` | Logica quiz, rendering, sessioni, SRS, statistiche e filtri |
| `data/topic1_demo.json` | Banca demo del Topic 1 con domande di tipologia diversa |
| `data/topic2_demo.json` | Banca demo del Topic 2 con domande collegate al case study Fabrikam Retail |
| `images/fabrikam_retail_case_study_dashboard.png` | Immagini delle domande e degli scenari |

---

## ⚙️ Avvio in Locale

Il progetto non richiede dipendenze Node.js o build tools.

```bash
git clone https://github.com/FreddyG98/pl300-exam-simulator-demo.git
cd pl300-exam-simulator-demo
python -m http.server 8000
```

Apri poi il browser su:

```text
http://localhost:8000
```

> È consigliato utilizzare un server HTTP locale invece di aprire direttamente `index.html` con `file://`, perché la banca domande viene caricata tramite `fetch()`.

---

## 🔒 Privacy e Nota Demo

Il progetto non richiede autenticazione né backend applicativo. Risposte, statistiche e preferenze restano nel `localStorage` del browser dell'utente e non vengono inviate a servizi esterni.

La versione pubblicata contiene esclusivamente contenuti dimostrativi e domande fittizie. Il simulatore non rappresenta materiale ufficiale Microsoft né garantisce la riproduzione del formato, del punteggio o dei criteri di valutazione dell'esame reale.

---

## 👤 Autore

**FreddyG98**

Data Analyst certificato Microsoft:

* Microsoft Certified: Azure Fundamentals (**AZ-900**)
* Microsoft Certified: Azure Data Fundamentals (**DP-900**)

Progetto sviluppato come dimostrazione pratica di:

```text
Interactive Web Development
JavaScript Application Logic
JSON Data Structuring
Extraction and Transformation of Unstructured Content
Responsive UI/UX
Local Data Persistence
AI-Assisted Development
Docker / Nginx Self-Hosted Deployment
```
