# 📊 Microsoft PL-300 Exam Practice & Review Platform (Demo Version)

**PL-300 Quiz Trainer** è un'applicazione web interattiva, lightweight e a zero dipendenze sviluppata per la simulazione e il ripasso strutturato dell'esame di certificazione **Microsoft Certified: Power BI Data Analyst Associate (PL-300)**.

Il progetto nasce con l'obiettivo di offrire un'esperienza di studio fedele all'esame ufficiale Microsoft, integrando algoritmi di apprendimento avanzati per massimizzare la memorizzazione dei concetti di data modeling, DAX e data preparation.

---

## 🌐 Live Demo
👉 **[Accedi alla Demo Online su GitHub Pages](https://FreddyG98.github.io/pl300-exam-simulator-demo/)**

*(Nota: La versione demo include un set ridotto di 20 quesiti suddivisi tra Topic 1 e Topic 2 per mostrare le capacità del motore grafico e della logica di valutazione).*

---

## 🎯 Panoramica e Funzionamento della Piattaforma

La piattaforma è progettata attorno a tre pilastri fondamentali: **interattività avanzata**, **personalizzazione dello studio** e **algoritmi di ripasso adattivo**.

### 1. Supporto Multimodale per le Tipologie di Quesito Microsoft
L'interfaccia gestisce nativamente tutte le strutture di domanda previste dall'esame PL-300:
* **Scelta Singola (`single`) e Scelta Multipla (`multi`):** Selezione standard delle opzioni con verifica immediata.
* **Quesiti Condizionali (`yesno`):** Sequenze di domande con regole rigide di conferma e locking delle risposte.
* **Menu a Tendina Multipli (`dropdown`):** Inserimento di formule DAX o configurazioni completando opzioni all'interno del testo.
* **Drag & Drop (`dragdrop`):** Modulo d'interazione per l'ordinamento di passaggi operativi o l'associazione di concetti, ottimizzato sia per mouse che per schermi touch su dispositivi mobile.
* **Case Studies Completi (`casestudy`):** Navigazione multifattore a schede con scenari aziendali complessi, diagrammi di flusso, tabelle dati e immagini allegate condivise tra più quesiti collegati.

---

### 2. Algoritmo SRS (Spaced Repetition System / Scatole di Leitner)
Per evitare l'apprendimento mnemonico passivo, la piattaforma implementa un sistema di **ripetizione dilazionata a 5 livelli di padronanza**:
* Ogni risposta corretta promuove la domanda alla scatola di livello superiore, dilazionandone il ripasso nel tempo.
* In caso di errore, il quesito torna al livello base per un ripasso immediato.
* La dashboard principale calcola automaticamente la coda dei ripassi pronti (*"Ripasso spaced repetition"*).

---

### 3. Modalità di Fruizione e Dashboard
* **Pratica Libera:** Configurazione su misura per argomenti (*Prepare Data*, *Model Data*, *Visualize & Analyze*, *Deploy & Maintain*), per tipologia di domanda o per stato (*Solo domande errate*).
* **Simulazione Esame:** Timer dinamico, restrizioni ufficiali sulle risposte confermate e report di valutazione con punteggio ponderato su scala 100–1000 (soglia pass: 700).
* **Modulo Spiegazioni & Feedback:** Spiegazioni dettagliate per ogni quesito, con evidenziazione dei concetti chiave e riferimenti alla documentazione ufficiale Microsoft Learn.
* **Temi Interfaccia:** Supporto nativo per la modalità *Chiaro*, *Scuro* e *Sincronizzazione Automatica* con il sistema operativo.

---

## 🏗️ Architettura e Struttura del Progetto

L'applicazione segue un'architettura client-side pura (Zero-Framework / Vanilla ES6+), garantendo tempi di caricamento istantanei e massima fluidità.

### Struttura Directory
```text
pl300-exam-simulator-demo/
├── index.html              # Struttura principale della Single Page Application
├── css/
│   └── style.css           # Styling responsive e variabili per temi (Light/Dark)
├── js/
│   └── app.js              # Motore logico (Gestione test, SRS, timer e rendering UI)
├── data/
│   ├── topic1_demo.json    # Dataset demo: Prepare the Data (15 domande)
│   └── topic2_demo.json    # Dataset demo: Model the Data (5 domande)
├── images/                 # Allegati visivi per i Case Study
└── README.md               # Documentazione del progetto
```
### Struttura JSON Domande
```text
{
  "meta": { "topic": 1, "version": 1.0 },
  "scenarios": [
    {
      "scenario_id": "fabrikam_retail",
      "title": "Caso di Studio: Fabrikam Retail",
      "text": "Panoramica dello scenario aziendale...",
      "media": [{ "url": "./images/fabrikam_retail_case_study_dashboard.png", "caption": "Overview Dashboard" }]
    }
  ],
  "questions": [
    {
      "id": 1,
      "topic": 1,
      "domain": "Prepare Data",
      "type": "dropdown",
      "text": "Selezionare la trasformazione Power Query corretta...",
      "explanation": "Spiegazione tecnica del passaggio...",
      "statements": [...]
    }
  ]
}
