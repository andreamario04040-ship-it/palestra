# Palestra

Diario di allenamento per iPhone: web app installabile (PWA) che funziona offline e
tiene **tutti i dati sul telefono**. Nessun account, nessun server, nessun abbonamento.

**App:** https://andreamario04040-ship-it.github.io/palestra/

## Cosa fa

**Durante l'allenamento** — pensata per fare meno tap possibile
- carico e ripetizioni già compilati in base all'ultima volta che hai fatto quell'esercizio;
- un solo pulsante grande: *Completa serie* → la serie viene registrata, parte il timer di
  recupero e si passa alla successiva da sola;
- timer di recupero a tutto schermo con conto alla rovescia, bip finale, +15s / −15s / salta,
  anteprima della serie successiva e un consiglio tecnico sull'esercizio;
- animazione del movimento per ogni esercizio, più tecnica ed errori comuni a portata di tap;
- calcolatore dei dischi da caricare sul bilanciere;
- serie di riscaldamento proposte automaticamente;
- record personali rilevati sul momento;
- lo schermo resta acceso mentre ti alleni.

**Progressione dei carichi**
- chiuse tutte le serie in cima al range → propone il carico successivo;
- range raggiunto ma non completo → stesso carico, una ripetizione in più;
- tre sedute in stallo → propone uno scarico del 10%.

**Schede**
- 5 modelli pronti (Full Body 3x, Push/Pull/Legs, Upper/Lower, Split 5 giorni, Corpo libero);
- **import da testo**: incolli la scheda come te l'ha data l'istruttore e l'app riconosce
  giorni, esercizi, serie × ripetizioni e recuperi;
- editor completo: serie, ripetizioni, recupero, note, ordine, duplica, sostituisci.

**Statistiche**
- volume, serie e frequenza per settimana, mese, anno;
- equilibrio muscolare su mappa del corpo (fronte/retro) + serie settimanali per gruppo;
- record personali e 1RM stimato (formula di Epley) con grafico di progressione;
- calendario e heatmap della costanza;
- peso corporeo e circonferenze.

**Catalogo**: 110 esercizi con muscoli coinvolti, attrezzo, cue di esecuzione, errori comuni
e animazione del movimento. Puoi aggiungere esercizi tuoi.

## Dove finiscono i dati

Tutto in `localStorage`, con una copia di sicurezza automatica in `IndexedDB` (se il primo
si svuota, l'app recupera dalla seconda). Niente lascia il telefono.

Conseguenze da conoscere:
- i dati sono legati a **quel browser su quel dispositivo**: non si sincronizzano fra iPhone e PC;
- se cancelli i dati di Safari o disinstalli l'app dalla Home, spariscono.

Per questo in *Impostazioni → I tuoi dati* ci sono **Esporta backup** (file `.json`, da salvare
su iCloud Drive o mandarti via mail) e **Importa backup** (unisci o sostituisci). Un backup ogni
tanto, o prima di cambiare telefono, mette al riparo da tutto.

## Installazione su iPhone

1. apri il link in **Safari**;
2. tocca **Condividi**;
3. scegli **Aggiungi a Home**.

Da lì parte a schermo intero, con la sua icona, e funziona anche senza rete.

## Struttura

```
index.html              guscio, meta PWA, splash screen iOS
manifest.webmanifest    manifest PWA
sw.js                   service worker (offline; network-first sul codice)
css/style.css           design system completo
js/app.js               bootstrap, router, tab bar, tema
js/lib/store.js         stato + persistenza locale + indici (PR, storico)
js/lib/coach.js         progressione carichi, dischi, riscaldamento, analisi
js/lib/anim.js          motore animazioni (figura 2D con IK, ~60 pattern)
js/lib/charts.js        grafici SVG, heatmap, calendario, mappa muscolare
js/lib/dom.js           helper DOM, formattazione, bottom sheet, audio
js/lib/icons.js         set di icone inline
js/data/exercises.js    database esercizi
js/data/templates.js    schede pronte + parser import testuale
js/views/*.js           schermate (home, schede, allenamento, diario, statistiche, …)
tools/make-assets.mjs   generatore di icone e splash (PNG senza dipendenze)
tools/figures.html      provino: tutte le figure a confronto, per lavorare sulle animazioni
```

Nessuna dipendenza, nessun build step: è JavaScript a moduli servito così com'è.

## Sviluppo

```bash
python3 -m http.server 8791
```

Poi apri http://localhost:8791. Per rigenerare icone e splash: `node tools/make-assets.mjs`.

Per lavorare sulle animazioni c'è un provino a `/tools/figures.html`: mostra ogni esercizio
in due fotogrammi fermi (`?ph=0,0.2,0.4` per sceglierne altri), con filtro per attrezzo o id.
