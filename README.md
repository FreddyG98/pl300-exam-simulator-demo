# PL-300 Exam Simulator | Interactive Quiz Platform

## 📝 Descrizione del Progetto
Progettazione e sviluppo di una piattaforma web interattiva per l'allenamento alla certificazione **Microsoft Power BI Data Analyst Associate (PL-300)**.

Il progetto nasce con l'obiettivo di trasformare una banca di domande strutturata in file JSON in un simulatore completo, utilizzabile sia per la pratica mirata sia per la simulazione di un esame a tempo. L'applicazione è stata progettata con una logica *frontend-first*, senza dipendenze da framework esterni, utilizzando HTML, CSS e JavaScript vanilla.

Il simulatore gestisce diverse tipologie di domande — scelta singola, risposta multipla, Yes/No, dropdown, drag & drop, hotspot e case study — e include meccanismi di persistenza locale, statistiche, ripasso con spaced repetition, filtri incrociati e interfaccia responsive per desktop e smartphone.

La versione presente in questa repository è una **demo pubblica** pensata per mostrare funzionalità, architettura del progetto, gestione dei dati e qualità dell'esperienza utente.

---

## 🌐 Live Demo

La demo è pubblicata tramite **GitHub Pages** ed è consultabile direttamente dal browser.

➡️ **[Apri la demo del PL-300 Exam Simulator](INSERISCI_QUI_IL_LINK_GITHUB_PAGES)**

> La demo utilizza una banca di domande fittizie, creata esclusivamente per presentare le funzionalità tecniche della piattaforma. Non contiene materiale d'esame reale né contenuti proprietari Microsoft.

---

## 📸 Anteprima Interfaccia

> Inserisci qui uno o più screenshot del progetto caricati nella sezione “Issues” o come GitHub User Attachment.

```html
<img width="1422" alt="PL-300 Exam Simulator - Home" src="INSERISCI_URL_SCREENSHOT_HOME" />
```

```html
<img width="1422" alt="PL-300 Exam Simulator - Exam Mode" src="INSERISCI_URL_SCREENSHOT_ESAME" />
```

```html
<img width="1422" alt="PL-300 Exam Simulator - Review" src="INSERISCI_URL_SCREENSHOT_REVISIONE" />
```

---

## 🎯 Obiettivi del progetto

* Sviluppare un simulatore web interattivo per la preparazione all'esame Microsoft PL-300.
* Gestire una banca domande strutturata e caricata dinamicamente da file JSON.
* Riprodurre una sessione d'esame con timer, navigazione, revisione finale e gestione delle domande non risposte.
* Realizzare una modalità di pratica libera con filtri incrociati per topic, domain e tipologia di domanda.
* Implementare un sistema di apprendimento progressivo basato su **Spaced Repetition** e metodo Leitner.
* Garantire una UI/UX responsive e utilizzabile sia da desktop sia da dispositivi mobili.
* Rendere il progetto facilmente distribuibile come sito statico, in locale o tramite hosting web.

---

## 🛠️ Strumenti Utilizzati

* **Frontend:** HTML5, CSS3, JavaScript Vanilla
* **Data Management:** JSON, LocalStorage API, FileReader API
* **Rendering dinamico:** DOM Manipulation, Template Literals, Event Handling
* **Persistenza locale:** Browser LocalStorage
* **Visualizzazione dati:** SVG inline per grafico storico dei punteggi
* **Responsive Design:** CSS Flexbox, CSS Grid, Media Queries
* **Deployment self-hosted:** Raspberry Pi 5, Docker, Nginx, Portainer
* **Demo pubblica:** GitHub Pages
* **Versionamento:** Git e GitHub

---

## 🚀 Fasi di Sviluppo (Passaggi Tecnici)

### 1. Progettazione della Banca Domande JSON

* Definizione di una struttura dati JSON modulare per gestire topic, domain, tipo di domanda, opzioni, risposta corretta, spiegazione, note, immagini e scenari.
* Organizzazione della banca domande in file distinti per topic, caricabili dal server e unificati dinamicamente all'avvio dell'applicazione.
* Implementazione del caricamento asincrono dei file tramite `fetch()` e unione delle banche mediante logica di merge.
* Gestione di ID progressivi durante l'unione dei file per evitare collisioni tra domande provenienti da topic diversi.
* Supporto al caricamento manuale di uno o più file JSON tramite `FileReader`, utile per integrare o sostituire una banca domande senza modificare il codice applicativo.

### 2. Gestione Multi-Tipologia delle Domande

* Sviluppo di un motore di rendering dinamico capace di interpretare il campo `type` di ogni domanda.
* Implementazione di domande a scelta singola (`single`) e Yes/No (`yesno`) con selezione temporanea e verifica opzionale nella pratica libera.
* Gestione delle domande a risposta multipla (`multi`) con controllo della combinazione esatta delle opzioni selezionate.
* Sviluppo di domande dropdown (`dropdown`) basate su statement multipli e opzioni indipendenti.
* Implementazione di quesiti drag & drop (`dragdrop`) con supporto a desktop e smartphone.
* Gestione del tap-to-move su dispositivi touch, come alternativa al drag & drop classico.
* Supporto a domande hotspot e hotspot su immagini, con aree cliccabili e valutazione della selezione.
* Rendering di immagini, didascalie e materiali multimediali associati a singole domande o scenari.

### 3. Sviluppo della Pratica Libera con Filtri Incrociati

* Creazione di una modalità di allenamento configurabile dall'utente.
* Implementazione della selezione multipla dei topic disponibili.
* Implementazione della selezione multipla dei domain: Prepare, Model, Visualize e Deploy.
* Realizzazione del filtro dinamico dei domain: selezionando uno o più topic, il sistema mostra esclusivamente i domain realmente disponibili nella selezione.
* Implementazione del filtro per tipologia di domanda: single, multi, Yes/No, dropdown, drag & drop, hotspot, hotspot immagine e case study.
* Applicazione combinata dei filtri secondo una logica di intersezione:

```text
Topic selezionati
AND
Domain selezionati
AND
Tipologie selezionate
AND
Numero massimo di domande richiesto
```

* Introduzione della navigazione diretta tramite griglia numerata delle domande.
* Possibilità di inserire risposte senza verifica immediata, mantenendo il pulsante “Verifica” come strumento opzionale di feedback.

### 4. Modalità Esame Simulato

* Sviluppo di una modalità esame separata dalla pratica libera.
* Estrazione casuale di un numero di domande compreso tra 40 e 50.
* Implementazione di una distribuzione ponderata per domain, con target vicini alla struttura d'esame configurata:

```text
Prepare: circa 27,5%
Model: circa 27,5%
Visualize: circa 27,5%
Deploy: circa 17,5%
```

* Visualizzazione del conteggio delle domande per domain direttamente nella barra informativa della sessione.
* Implementazione di un countdown unico di 100 minuti, condiviso tra quiz e revisione finale.
* Disattivazione del feedback immediato: correttezza e spiegazioni sono visualizzate solo dopo la consegna.
* Implementazione della griglia di navigazione con stato della domanda corrente, risposta inserita e bandierina.
* Gestione delle domande non risposte e delle domande contrassegnate durante la revisione.

### 5. Gestione Case Study e Domande Yes/No

* Sviluppo di una logica dedicata per i case study, identificati tramite `scenarioId`.
* Rendering di scenari espandibili con testo, immagini e allegati associati.
* Gestione dei case study come blocchi coerenti durante la modalità esame.
* Implementazione del blocco di un case study dopo l'uscita dalla relativa sezione, impedendo la modifica successiva delle risposte.
* Gestione delle domande Yes/No con conferma esplicita al passaggio alla domanda successiva.
* Blocco definitivo della risposta Yes/No dopo la conferma, simulando una navigazione controllata.
* Protezione della navigazione tramite pulsanti, griglia e revisione per evitare la riapertura di sezioni già chiuse.

### 6. Revisione Finale e Gestione Risposte

* Sviluppo di una schermata di revisione con elenco delle domande, stato di compilazione e pulsante di accesso rapido alla domanda.
* Differenziazione tra risposta inserita e risposta verificata nella pratica libera.
* Visualizzazione degli stati:

```text
✍️ Risposta inserita
✅ Corretta
❌ Errata
⏺ Non risposta
```

* Mantenimento del timer crescente durante quiz e revisione della pratica libera.
* Mantenimento del countdown unico durante quiz e revisione della modalità esame.
* Possibilità di filtrare le domande contrassegnate tramite bandierina.
* Preservazione della griglia di navigazione e dei pulsanti Precedente / Successiva anche durante la consultazione delle domande dalla revisione.

### 7. Spaced Repetition e Metodo Leitner

* Implementazione di un sistema di ripasso progressivo basato su cinque box Leitner.
* Creazione automatica dello stato SRS per ogni domanda.
* Aggiornamento della box dopo ogni risposta verificata:

```text
Risposta corretta → avanzamento alla box successiva
Risposta errata   → ritorno alla box 1
```

* Pianificazione dei ripassi su intervalli progressivi:

```text
Box 1 → immediato
Box 2 → 1 giorno
Box 3 → 3 giorni
Box 4 → 7 giorni
Box 5 → 14 / 30 giorni
```

* Visualizzazione della padronanza tramite icone e legenda nella Home.
* Creazione di una modalità dedicata alle domande SRS già dovute.

### 8. Ripasso Lampo Intelligente

* Evoluzione della funzione “Ripasso lampo pre-esame” in uno strumento di studio adattivo.
* Configurazione del tempo disponibile e del numero massimo di domande.
* Introduzione di profili di priorità:

```text
🎯 Adattivo consigliato
❌ Solo domande errate
🚩 Solo domande contrassegnate
🔁 Solo domande SRS dovute
⚠️ Critiche Leitner 1–2
```

* Implementazione di un algoritmo di scoring per ordinare le domande in base a:
  * errore nell'ultimo tentativo;
  * frequenza degli errori;
  * numero di bandierine;
  * livello Leitner;
  * scadenza SRS;
  * tempo trascorso dall'ultima visualizzazione.
* Integrazione di filtri per domain e tipologia domanda.
* Mantenimento del countdown durante quiz, revisione e consultazione delle domande del ripasso lampo.

### 9. Persistenza, Statistiche e Storico

* Utilizzo di `localStorage` per salvare lo stato delle sessioni, le risposte, le statistiche, le bandierine, il tema grafico e i dati SRS.
* Salvataggio automatico della sessione per consentire la ripresa di un test in pausa.
* Tracciamento delle risposte svolte, errate, ultima risposta e data dell'ultima visualizzazione.
* Generazione di statistiche globali e statistiche per topic.
* Calcolo di suggerimenti di priorità studio in base al dominio con percentuale di risposta più bassa.
* Identificazione delle domande contrassegnate ripetutamente.
* Salvataggio dello storico di test ed esami con punteggio, percentuale e score stimato.
* Realizzazione di un grafico SVG per monitorare l'andamento dei punteggi nel tempo.
* Implementazione di import/export del progresso in formato JSON.

### 10. UI/UX, Responsività e Temi

* Progettazione di un'interfaccia a schede con navigazione superiore, badge informativi, progress bar e stati visivi per le risposte.
* Implementazione di tema chiaro, scuro e automatico tramite CSS Custom Properties e `prefers-color-scheme`.
* Salvataggio della preferenza tema nel browser.
* Adattamento responsive tramite media query per smartphone e tablet.
* Ottimizzazione dei controlli touch: pulsanti con area minima di interazione, layout flessibile e tap-to-move per le domande drag & drop.
* Implementazione di feedback visivo differenziato per risposte corrette, errate, non selezionate e mancanti.
* Supporto a una futura internazionalizzazione dell'interfaccia tramite selettore lingua e preferenza salvata localmente.

### 11. Deployment Self-Hosted e Demo Pubblica

* Preparazione dell'applicazione come sito statico, senza necessità di backend applicativo.
* Deployment dell'ambiente personale su Raspberry Pi 5 tramite container Docker con server Nginx.
* Gestione del container e dei volumi tramite Portainer.
* Organizzazione delle risorse statiche: HTML, CSS, JavaScript, immagini e file JSON.
* Utilizzo di versioning query string nei riferimenti a CSS e JavaScript per ridurre problemi di cache browser durante gli aggiornamenti.
* Pubblicazione di una versione demo statica tramite GitHub Pages, accessibile ai recruiter e agli utenti interessati a testare direttamente l'applicazione.

---

## 📁 Struttura del Progetto

```text
pl300-exam-simulator-demo/
│
├── index.html
├── style.css
├── test_script3.js
│
├── Domande/
│   └── JSON uniti/
│       ├── Topic 1.json
│       ├── Topic 2.json
│       └── ...
│
├── images/
│   ├── fabrikam-retail-case-study-dashboard.png
│   └── ...
│
└── README.md
```

| File / Cartella | Funzione |
|---|---|
| `index.html` | Punto di ingresso dell'applicazione e collegamento a CSS/JavaScript |
| `style.css` | Temi, layout, responsive design, stati visuali e componenti UI |
| `test_script3.js` | Logica applicativa, rendering dinamico, sessioni, quiz, SRS e statistiche |
| `Domande/JSON uniti/` | Banca domande organizzata per topic |
| `images/` | Allegati, immagini delle domande e immagini degli scenari |

---

## ⚙️ Avvio in locale

Il progetto non richiede installazione di dipendenze Node.js né build tools.

1. Clona la repository:

```bash
git clone https://github.com/FreddyG98/pl300-exam-simulator-demo.git
```

2. Accedi alla cartella del progetto:

```bash
cd pl300-exam-simulator-demo
```

3. Avvia un server HTTP locale.

Esempio con Python:

```bash
python -m http.server 8000
```

4. Apri il browser all'indirizzo:

```text
http://localhost:8000
```

> È consigliato usare un server HTTP locale anziché aprire direttamente `index.html` tramite `file://`, perché il caricamento della banca JSON avviene con `fetch()` e alcuni browser possono bloccarlo per policy di sicurezza locale.

---

## 🔒 Privacy e Dati

La demo non richiede autenticazione e non utilizza un backend per raccogliere informazioni personali.

Le statistiche, le risposte, il tema selezionato, le bandierine e lo stato di avanzamento vengono memorizzati nel `localStorage` del browser del visitatore.

Di conseguenza:

* i dati restano sul dispositivo/browser dell'utente;
* non vengono inviati a server esterni;
* cancellando i dati del browser si cancella anche il progresso locale;
* la funzione di export permette di salvare manualmente il proprio progresso in un file JSON.

---

## ⚠️ Nota sulla Demo

Questa repository contiene una versione dimostrativa del progetto.

* Le domande incluse sono fittizie e create per dimostrare i diversi componenti dell'applicazione.
* Non rappresentano materiale ufficiale Microsoft.
* Non sono una riproduzione dell'esame PL-300.
* Il punteggio Microsoft visualizzato dal simulatore è una stima a scopo di allenamento.
* Microsoft utilizza criteri di scoring proprietari e il punteggio finale reale non può essere dedotto con precisione da una semplice percentuale di risposte corrette.

---

## 🔮 Sviluppi Futuri

* Completamento dell'internazionalizzazione dell'interfaccia in inglese, spagnolo e francese.
* Traduzione e validazione controllata delle banche domande multilingua.
* Sincronizzazione opzionale e sicura del progresso tra dispositivi.
* Area amministrativa per validare automaticamente la struttura e la coerenza dei file JSON.
* Statistiche avanzate per domain, tipologia domanda e difficoltà.
* Profili di studio personalizzati e piani di ripasso automatici.
* Esportazione di report di avanzamento.
* Implementazione di una modalità demo con limitazioni e di una modalità completa con autenticazione.

---

## 👤 Autore

**FreddyG98**

Progetto sviluppato come dimostrazione di competenze in:

```text
Frontend Development
JavaScript Application Logic
DOM Manipulation
Responsive UI/UX
Data Modeling with JSON
Local Persistence
Interactive Educational Technology
Docker / Nginx Deployment
Self-Hosted Infrastructure
```
