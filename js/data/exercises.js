/* =========================================================================
   Database esercizi.
   id  identificatore stabile (non cambiarlo: lo storico vi fa riferimento)
   n   nome            a  alias per la ricerca/import
   m   muscoli primari s  muscoli secondari
   eq  attrezzo        p  pattern di animazione
   rr  range ripetizioni consigliato   rest  recupero consigliato (s)
   c   cue di esecuzione               e  errori comuni
   ========================================================================= */

export const MUSCLES = {
  petto: { n: 'Petto', c: '#ff6b6b' },
  dorso: { n: 'Dorso', c: '#4cd7f6' },
  spalle: { n: 'Spalle', c: '#ffb020' },
  bicipiti: { n: 'Bicipiti', c: '#8b7bff' },
  tricipiti: { n: 'Tricipiti', c: '#f06595' },
  avambracci: { n: 'Avambracci', c: '#a78bfa' },
  trapezi: { n: 'Trapezi', c: '#38bdf8' },
  quadricipiti: { n: 'Quadricipiti', c: '#d7ff3e' },
  femorali: { n: 'Femorali', c: '#35d07f' },
  glutei: { n: 'Glutei', c: '#fb7185' },
  polpacci: { n: 'Polpacci', c: '#22d3ee' },
  addome: { n: 'Addome', c: '#fbbf24' },
  lombari: { n: 'Lombari', c: '#94a3b8' },
  adduttori: { n: 'Adduttori', c: '#c084fc' },
  abduttori: { n: 'Abduttori', c: '#e879f9' },
  cardio: { n: 'Cardio', c: '#f87171' },
};

export const EQUIP = {
  bilanciere: 'Bilanciere',
  ez: 'Bilanciere EZ',
  manubri: 'Manubri',
  cavi: 'Cavi',
  macchina: 'Macchina',
  corpo: 'Corpo libero',
  kettlebell: 'Kettlebell',
  smith: 'Multipower',
  elastico: 'Elastico',
  cardio: 'Cardio',
};

export const EXERCISES = [
  /* ------------------------------------------------------------- PETTO -- */
  {
    id: 'panca-piana', n: 'Panca piana bilanciere', a: ['bench press', 'panca'], m: ['petto'], s: ['tricipiti', 'spalle'],
    eq: 'bilanciere', p: 'horizPush', rr: '5-8', rest: 150,
    c: ['Scapole addotte e depresse, petto alto: crea una base stabile.',
      'Piedi ben piantati a terra, leggero arco lombare naturale.',
      'Discesa controllata in 2 secondi fino a sfiorare lo sterno.',
      'Gomiti a circa 45-60° dal busto, non aperti a 90°.',
      'Spingi lasciando il bilanciere sulla verticale di spalle/polsi.'],
    e: ['Rimbalzare il bilanciere sul petto.', 'Staccare le scapole o i glutei dalla panca.', 'Gomiti completamente aperti: stress sulle spalle.'],
  },
  {
    id: 'panca-inclinata', n: 'Panca inclinata bilanciere', a: ['incline bench'], m: ['petto'], s: ['spalle', 'tricipiti'],
    eq: 'bilanciere', p: 'inclinePush', rr: '6-10', rest: 120,
    c: ['Inclinazione 30-45°: oltre si sposta il lavoro sulle spalle.', 'Bilanciere verso la parte alta del petto / clavicole.', 'Scapole sempre retratte contro lo schienale.'],
    e: ['Inclinazione troppo alta.', 'Spingere il bilanciere verso il viso.'],
  },
  {
    id: 'panca-declinata', n: 'Panca declinata bilanciere', a: ['decline bench'], m: ['petto'], s: ['tricipiti'],
    eq: 'bilanciere', p: 'horizPush', rr: '6-10', rest: 120,
    c: ['Blocca bene le gambe prima di partire.', 'Traiettoria verso la parte bassa del petto.'],
    e: ['Range di movimento ridotto per usare più carico.'],
  },
  {
    id: 'panca-manubri', n: 'Panca piana manubri', a: ['dumbbell bench press', 'distensioni manubri'], m: ['petto'], s: ['tricipiti', 'spalle'],
    eq: 'manubri', p: 'horizPush', rr: '8-12', rest: 120,
    c: ['Parti con i manubri sopra le spalle, polsi neutri e saldi.', 'Scendi fino a sentire un buon allungamento, senza forzare.', 'In alto non far toccare i manubri: mantieni la tensione.'],
    e: ['Scendere troppo in basso stressando la spalla.', 'Far "rimbalzare" i manubri in alto.'],
  },
  {
    id: 'panca-inclinata-manubri', n: 'Panca inclinata manubri', a: ['incline dumbbell press'], m: ['petto'], s: ['spalle', 'tricipiti'],
    eq: 'manubri', p: 'inclinePush', rr: '8-12', rest: 120,
    c: ['Inclinazione 30°, schiena appoggiata.', 'Polsi allineati ai gomiti per tutta la salita.'],
    e: ['Inarcare la schiena per spingere di più.'],
  },
  {
    id: 'croci-piana', n: 'Croci su panca piana', a: ['chest fly', 'aperture'], m: ['petto'], s: [],
    eq: 'manubri', p: 'fly', rr: '10-15', rest: 75,
    c: ['Gomiti semi-flessi e FISSI per tutto il movimento.', 'Apri fino all’altezza del petto, senza scendere oltre.', 'Chiudi "abbracciando", strizzando il petto in alto.'],
    e: ['Trasformarlo in una distensione piegando i gomiti.', 'Carico eccessivo: è un esercizio di isolamento.'],
  },
  {
    id: 'croci-inclinata', n: 'Croci su panca inclinata', a: ['incline fly'], m: ['petto'], s: ['spalle'],
    eq: 'manubri', p: 'fly', rr: '10-15', rest: 75,
    c: ['Inclinazione 30°, movimento ampio ma controllato.', 'Pensa a "unire i gomiti", non le mani.'],
    e: ['Scendere troppo in basso sotto il piano della panca.'],
  },
  {
    id: 'croci-cavi', n: 'Croci ai cavi', a: ['cable crossover', 'chest fly cavi'], m: ['petto'], s: [],
    eq: 'cavi', p: 'flyCable', rr: '12-15', rest: 75,
    c: ['Un piede avanti, busto leggermente inclinato.', 'Tensione costante: non far toccare i pacchi pesi.', 'Incrocia leggermente le mani al centro per 1 secondo.'],
    e: ['Usare le spalle e il busto per lanciare il peso.'],
  },
  {
    id: 'chest-press', n: 'Chest press macchina', a: ['pectoral press'], m: ['petto'], s: ['tricipiti', 'spalle'],
    eq: 'macchina', p: 'horizPush', rr: '8-12', rest: 90,
    c: ['Regola il sedile: le maniglie all’altezza di metà petto.', 'Schiena appoggiata, scapole addotte.'],
    e: ['Sedile troppo alto o troppo basso.'],
  },
  {
    id: 'pectoral-machine', n: 'Pectoral machine (peck deck)', a: ['butterfly', 'pec deck'], m: ['petto'], s: [],
    eq: 'macchina', p: 'fly', rr: '10-15', rest: 75,
    c: ['Allinea le maniglie all’altezza delle spalle.', 'Chiudi lentamente e tieni 1 secondo di contrazione.'],
    e: ['Movimento troppo veloce senza fermo centrale.'],
  },
  {
    id: 'piegamenti', n: 'Piegamenti (push-up)', a: ['push up', 'flessioni'], m: ['petto'], s: ['tricipiti', 'spalle', 'addome'],
    eq: 'corpo', p: 'pushup', rr: '10-20', rest: 75,
    c: ['Corpo in linea: testa, bacino e talloni allineati.', 'Mani poco più larghe delle spalle.', 'Addome e glutei contratti per tutta la serie.'],
    e: ['Bacino che cede verso il basso.', 'Range parziale: scendi fino a sfiorare il pavimento.'],
  },
  {
    id: 'dip-petto', n: 'Dip alle parallele (petto)', a: ['dips petto'], m: ['petto'], s: ['tricipiti', 'spalle'],
    eq: 'corpo', p: 'dip', rr: '8-12', rest: 120,
    c: ['Busto inclinato in avanti ~30° per enfatizzare il petto.', 'Scendi fino a gomiti a 90°, non oltre.'],
    e: ['Scendere troppo in basso: rischio per la spalla.', 'Dondolare con le gambe.'],
  },
  {
    id: 'pullover', n: 'Pullover con manubrio', a: ['pull over'], m: ['petto'], s: ['dorso', 'tricipiti'],
    eq: 'manubri', p: 'pullover', rr: '10-15', rest: 90,
    c: ['Sdraiato sulla panca, manubrio tenuto a due mani.', 'Scendi dietro la testa controllando l’allungamento.', 'Gomiti leggermente flessi e fissi.'],
    e: ['Iperestendere la schiena.', 'Scendere oltre la propria mobilità di spalla.'],
  },
  {
    id: 'panca-smith', n: 'Panca piana al multipower', a: ['smith bench'], m: ['petto'], s: ['tricipiti'],
    eq: 'smith', p: 'horizPush', rr: '8-12', rest: 120,
    c: ['Posiziona la panca così che la barra scenda a metà petto.', 'Ottimo per lavorare vicino al cedimento in sicurezza.'],
    e: ['Posizionare male la panca creando una traiettoria innaturale.'],
  },
  {
    id: 'panca-presa-stretta', n: 'Panca presa stretta', a: ['close grip bench'], m: ['tricipiti'], s: ['petto', 'spalle'],
    eq: 'bilanciere', p: 'horizPush', rr: '6-10', rest: 120,
    c: ['Presa larga quanto le spalle, non più stretta.', 'Gomiti vicini al busto durante la discesa.'],
    e: ['Presa troppo stretta: stress sui polsi.'],
  },

  /* ------------------------------------------------------------- DORSO -- */
  {
    id: 'trazioni', n: 'Trazioni alla sbarra', a: ['pull up', 'pull-up'], m: ['dorso'], s: ['bicipiti', 'avambracci'],
    eq: 'corpo', p: 'vertPull', rr: '5-10', rest: 150,
    c: ['Presa prona poco più larga delle spalle.', 'Parti attivando le scapole (deprimile) prima di tirare.', 'Porta il petto verso la sbarra, non il mento.', 'Scendi controllato fino alle braccia quasi distese.'],
    e: ['Slanciare con le gambe (kipping) senza motivo.', 'Range parziale: mezze trazioni.'],
  },
  {
    id: 'trazioni-supine', n: 'Trazioni presa supina (chin-up)', a: ['chin up'], m: ['dorso'], s: ['bicipiti'],
    eq: 'corpo', p: 'vertPull', rr: '6-12', rest: 120,
    c: ['Presa supina larga quanto le spalle.', 'Più coinvolgimento dei bicipiti rispetto alla presa prona.'],
    e: ['Gomiti che si aprono verso l’esterno.'],
  },
  {
    id: 'lat-machine', n: 'Lat machine avanti', a: ['lat pulldown', 'latmachine'], m: ['dorso'], s: ['bicipiti'],
    eq: 'macchina', p: 'pulldown', rr: '8-12', rest: 90,
    c: ['Blocca bene le cosce sotto i cuscinetti.', 'Petto in fuori, leggera inclinazione indietro (max 15°).', 'Tira la barra verso le clavicole portando i gomiti in basso.'],
    e: ['Tirare dietro la nuca.', 'Oscillare il busto per aiutarsi.'],
  },
  {
    id: 'lat-machine-presa-stretta', n: 'Lat machine presa stretta', a: ['pulldown presa neutra'], m: ['dorso'], s: ['bicipiti'],
    eq: 'macchina', p: 'pulldown', rr: '8-12', rest: 90,
    c: ['Presa neutra o supina, gomiti stretti al busto.', 'Enfasi sulla parte bassa del gran dorsale.'],
    e: ['Usare troppo le braccia invece della schiena.'],
  },
  {
    id: 'pulley', n: 'Pulley basso', a: ['seated row', 'rematore ai cavi'], m: ['dorso'], s: ['bicipiti', 'trapezi'],
    eq: 'cavi', p: 'horizPull', rr: '8-12', rest: 90,
    c: ['Busto verticale, ginocchia leggermente piegate.', 'Tira verso l’ombelico stringendo le scapole.', 'In allungamento lascia protrarre le scapole senza curvare la lombare.'],
    e: ['Dondolare avanti e indietro con tutto il busto.'],
  },
  {
    id: 'rematore-bilanciere', n: 'Rematore con bilanciere', a: ['barbell row', 'bent over row'], m: ['dorso'], s: ['bicipiti', 'lombari'],
    eq: 'bilanciere', p: 'bentRow', rr: '6-10', rest: 120,
    c: ['Busto inclinato a ~45°, schiena neutra e rigida.', 'Tira verso l’ombelico, gomiti a 45° dal busto.', 'Controlla la discesa: niente caduta libera.'],
    e: ['Schiena curva: rischio lombare.', 'Alzare il busto a ogni ripetizione.'],
  },
  {
    id: 'rematore-manubrio', n: 'Rematore con manubrio', a: ['one arm row', 'rematore un braccio'], m: ['dorso'], s: ['bicipiti'],
    eq: 'manubri', p: 'oneArmRow', rr: '8-12', rest: 90,
    c: ['Un ginocchio e una mano sulla panca, schiena parallela al suolo.', 'Tira il manubrio verso il fianco, gomito lungo il corpo.', 'Allunga in basso per massimizzare il range.'],
    e: ['Ruotare il busto per tirare più peso.'],
  },
  {
    id: 'rematore-tbar', n: 'Rematore T-bar', a: ['t bar row'], m: ['dorso'], s: ['bicipiti', 'trapezi'],
    eq: 'bilanciere', p: 'bentRow', rr: '8-12', rest: 120,
    c: ['Petto alto, schiena neutra, ginocchia morbide.', 'Presa neutra per più coinvolgimento del dorsale.'],
    e: ['Estendere la schiena a fine ripetizione.'],
  },
  {
    id: 'rematore-macchina', n: 'Rematore alla macchina', a: ['machine row'], m: ['dorso'], s: ['bicipiti'],
    eq: 'macchina', p: 'horizPull', rr: '8-12', rest: 90,
    c: ['Petto appoggiato al pad, spalle basse.', 'Concentrati sulla contrazione scapolare.'],
    e: ['Staccare il petto dal pad.'],
  },
  {
    id: 'pulldown-braccia-tese', n: 'Pulldown a braccia tese', a: ['straight arm pulldown'], m: ['dorso'], s: ['addome'],
    eq: 'cavi', p: 'pullover', rr: '12-15', rest: 70,
    c: ['Braccia quasi tese, gomiti leggermente flessi e fissi.', 'Porta la barra verso le cosce usando solo le spalle.'],
    e: ['Piegare i gomiti trasformandolo in push-down.'],
  },
  {
    id: 'face-pull', n: 'Face pull', a: ['facepull'], m: ['spalle'], s: ['dorso', 'trapezi'],
    eq: 'cavi', p: 'facePull', rr: '12-20', rest: 60,
    c: ['Cavo all’altezza del viso, corda con presa neutra.', 'Tira verso la fronte ruotando esternamente le spalle.', 'Ottimo per la salute della spalla: usa carichi leggeri.'],
    e: ['Carico eccessivo che costringe a usare il trapezio.'],
  },
  {
    id: 'seal-row', n: 'Seal row', a: ['chest supported row'], m: ['dorso'], s: ['bicipiti'],
    eq: 'manubri', p: 'horizPull', rr: '8-12', rest: 90,
    c: ['Petto appoggiato: elimina ogni spinta di gambe e schiena.', 'Isolamento puro del dorso.'],
    e: ['Sollevare il petto dalla panca.'],
  },
  {
    id: 'shrug-bilanciere', n: 'Scrollate con bilanciere', a: ['shrug'], m: ['trapezi'], s: ['avambracci'],
    eq: 'bilanciere', p: 'shrug', rr: '10-15', rest: 75,
    c: ['Solleva le spalle verso le orecchie, verticalmente.', 'Pausa di 1 secondo in alto.'],
    e: ['Ruotare le spalle (inutile e rischioso).'],
  },
  {
    id: 'shrug-manubri', n: 'Scrollate con manubri', a: ['dumbbell shrug'], m: ['trapezi'], s: ['avambracci'],
    eq: 'manubri', p: 'shrug', rr: '12-15', rest: 70,
    c: ['Braccia rilassate lungo i fianchi, solo le spalle salgono.'],
    e: ['Piegare i gomiti.'],
  },
  {
    id: 'hyperextension', n: 'Hyperextension', a: ['iperestensioni', 'back extension'], m: ['lombari'], s: ['glutei', 'femorali'],
    eq: 'macchina', p: 'hyperextension', rr: '12-15', rest: 75,
    c: ['Scendi controllando con la schiena neutra.', 'Risali fino all’allineamento, senza iperestendere.'],
    e: ['Inarcare esageratamente in alto.', 'Movimento a scatto.'],
  },

  /* ------------------------------------------------------------ SPALLE -- */
  {
    id: 'military-press', n: 'Lento avanti in piedi', a: ['military press', 'overhead press', 'ohp'], m: ['spalle'], s: ['tricipiti', 'addome'],
    eq: 'bilanciere', p: 'vertPush', rr: '5-8', rest: 150,
    c: ['Presa poco più larga delle spalle, polsi dritti.', 'Addome e glutei contratti: niente iperestensione lombare.', 'Porta la testa leggermente indietro, poi spingi "attorno" al viso.', 'A braccia tese la barra è sopra la verticale delle spalle.'],
    e: ['Inarcare la schiena per spingere.', 'Fermare il bilanciere davanti al viso.'],
  },
  {
    id: 'shoulder-press-manubri', n: 'Shoulder press con manubri', a: ['lento manubri', 'dumbbell shoulder press'], m: ['spalle'], s: ['tricipiti'],
    eq: 'manubri', p: 'vertPush', rr: '8-12', rest: 120,
    c: ['Schienale a 80-90°, schiena appoggiata.', 'Gomiti leggermente avanti rispetto al piano frontale.'],
    e: ['Scendere troppo sotto le orecchie.'],
  },
  {
    id: 'arnold-press', n: 'Arnold press', a: [], m: ['spalle'], s: ['tricipiti'],
    eq: 'manubri', p: 'vertPush', rr: '8-12', rest: 90,
    c: ['Parti con i palmi verso di te, ruota salendo.', 'Movimento fluido e controllato.'],
    e: ['Ruotare troppo velocemente.'],
  },
  {
    id: 'alzate-laterali', n: 'Alzate laterali', a: ['lateral raise', 'side raise'], m: ['spalle'], s: [],
    eq: 'manubri', p: 'lateralRaise', rr: '12-20', rest: 60,
    c: ['Gomiti leggermente flessi, salita fino all’altezza delle spalle.', 'Guida il movimento con i gomiti, non con le mani.', 'Discesa lenta in 2-3 secondi: è lì che cresce il deltoide.'],
    e: ['Slanciare con il busto.', 'Salire sopra le spalle alzando i trapezi.'],
  },
  {
    id: 'alzate-laterali-cavi', n: 'Alzate laterali ai cavi', a: ['cable lateral raise'], m: ['spalle'], s: [],
    eq: 'cavi', p: 'lateralRaise', rr: '12-20', rest: 60,
    c: ['Cavo basso, passa davanti al corpo: tensione costante.', 'Un braccio alla volta per massimo controllo.'],
    e: ['Inclinare troppo il busto.'],
  },
  {
    id: 'alzate-frontali', n: 'Alzate frontali', a: ['front raise'], m: ['spalle'], s: [],
    eq: 'manubri', p: 'frontRaise', rr: '12-15', rest: 60,
    c: ['Sali fino all’altezza degli occhi, poi scendi lento.', 'Un braccio alla volta per evitare compensi.'],
    e: ['Usare lo slancio delle gambe.'],
  },
  {
    id: 'alzate-posteriori', n: 'Alzate posteriori', a: ['rear delt fly', 'reverse fly'], m: ['spalle'], s: ['dorso'],
    eq: 'manubri', p: 'rearDelt', rr: '12-20', rest: 60,
    c: ['Busto inclinato in avanti, schiena neutra.', 'Apri con i gomiti, pollici verso il basso.', 'Carichi leggeri: è un muscolo piccolo.'],
    e: ['Trasformarlo in un rematore.'],
  },
  {
    id: 'reverse-pec-deck', n: 'Reverse pec deck', a: ['macchina deltoide posteriore'], m: ['spalle'], s: ['dorso'],
    eq: 'macchina', p: 'rearDelt', rr: '12-20', rest: 60,
    c: ['Petto appoggiato, braccia quasi tese.', 'Apri fino alla linea delle spalle.'],
    e: ['Stringere troppo le scapole invece di aprire le braccia.'],
  },
  {
    id: 'tirate-mento', n: 'Tirate al mento', a: ['upright row'], m: ['spalle'], s: ['trapezi', 'bicipiti'],
    eq: 'bilanciere', p: 'uprightRow', rr: '10-15', rest: 75,
    c: ['Presa larga quanto le spalle o più: riduce l’impingement.', 'Sali fino all’altezza del petto, non oltre.'],
    e: ['Presa troppo stretta e gomiti sopra le spalle.'],
  },
  {
    id: 'shoulder-press-macchina', n: 'Shoulder press macchina', a: [], m: ['spalle'], s: ['tricipiti'],
    eq: 'macchina', p: 'vertPush', rr: '8-12', rest: 90,
    c: ['Maniglie all’altezza delle spalle con il sedile regolato.'],
    e: ['Spingere con la schiena staccata.'],
  },
  {
    id: 'push-press', n: 'Push press', a: [], m: ['spalle'], s: ['quadricipiti', 'tricipiti'],
    eq: 'bilanciere', p: 'vertPush', rr: '3-6', rest: 150,
    c: ['Breve piegamento delle gambe, poi spinta esplosiva.', 'Usa le gambe solo per superare il punto critico.'],
    e: ['Piegamento troppo profondo (diventa un thruster).'],
  },

  /* ---------------------------------------------------------- BICIPITI -- */
  {
    id: 'curl-bilanciere', n: 'Curl con bilanciere', a: ['barbell curl'], m: ['bicipiti'], s: ['avambracci'],
    eq: 'bilanciere', p: 'curl', rr: '8-12', rest: 90,
    c: ['Gomiti fermi lungo i fianchi per tutta l’alzata.', 'Non usare la schiena: busto immobile.', 'Scendi in 2-3 secondi fino quasi alla completa distensione.'],
    e: ['Dondolare con la schiena.', 'Portare i gomiti in avanti in alto.'],
  },
  {
    id: 'curl-ez', n: 'Curl con bilanciere EZ', a: ['ez curl'], m: ['bicipiti'], s: ['avambracci'],
    eq: 'ez', p: 'curl', rr: '8-12', rest: 90,
    c: ['La presa semi-prona riduce lo stress sui polsi.'],
    e: ['Estendere i polsi durante la salita.'],
  },
  {
    id: 'curl-manubri', n: 'Curl con manubri alternato', a: ['dumbbell curl'], m: ['bicipiti'], s: ['avambracci'],
    eq: 'manubri', p: 'curl', rr: '10-14', rest: 75,
    c: ['Supina il polso salendo per massimizzare la contrazione.', 'Alterna le braccia mantenendo il busto fermo.'],
    e: ['Alzare la spalla a fine movimento.'],
  },
  {
    id: 'curl-martello', n: 'Curl a martello', a: ['hammer curl'], m: ['bicipiti'], s: ['avambracci'],
    eq: 'manubri', p: 'curl', rr: '10-14', rest: 75,
    c: ['Presa neutra per tutto il movimento: lavora il brachiale.', 'Gomiti stabili al fianco.'],
    e: ['Ruotare i polsi.'],
  },
  {
    id: 'curl-panca-inclinata', n: 'Curl su panca inclinata', a: ['incline curl'], m: ['bicipiti'], s: [],
    eq: 'manubri', p: 'curl', rr: '10-12', rest: 75,
    c: ['Schienale a 45-60°, braccia che pendono dietro al busto.', 'Massimo allungamento del capo lungo del bicipite.'],
    e: ['Portare i gomiti in avanti perdendo l’allungamento.'],
  },
  {
    id: 'curl-scott', n: 'Curl alla panca Scott', a: ['preacher curl'], m: ['bicipiti'], s: [],
    eq: 'ez', p: 'curl', rr: '8-12', rest: 75,
    c: ['Ascelle appoggiate al pad, non staccarle mai.', 'Non distendere di colpo in basso: controlla sempre.'],
    e: ['Estensione esplosiva in basso: rischio per il tendine.'],
  },
  {
    id: 'curl-cavi', n: 'Curl ai cavi', a: ['cable curl'], m: ['bicipiti'], s: [],
    eq: 'cavi', p: 'curl', rr: '12-15', rest: 70,
    c: ['Tensione costante su tutto l’arco di movimento.'],
    e: ['Arretrare per aiutarsi con il corpo.'],
  },
  {
    id: 'curl-concentrato', n: 'Curl concentrato', a: ['concentration curl'], m: ['bicipiti'], s: [],
    eq: 'manubri', p: 'curl', rr: '10-15', rest: 60,
    c: ['Gomito appoggiato all’interno coscia.', 'Picco di contrazione di 1 secondo in alto.'],
    e: ['Usare la spalla per sollevare.'],
  },

  /* --------------------------------------------------------- TRICIPITI -- */
  {
    id: 'french-press', n: 'French press (skull crusher)', a: ['skullcrusher', 'estensioni ez'], m: ['tricipiti'], s: [],
    eq: 'ez', p: 'skull', rr: '8-12', rest: 90,
    c: ['Gomiti fermi e puntati verso l’alto (o leggermente indietro).', 'Scendi verso la fronte o dietro la testa, controllato.'],
    e: ['Aprire i gomiti verso l’esterno.', 'Muovere le spalle.'],
  },
  {
    id: 'pushdown-corda', n: 'Push-down ai cavi con corda', a: ['triceps pushdown', 'spinte ai cavi'], m: ['tricipiti'], s: [],
    eq: 'cavi', p: 'pushdown', rr: '10-15', rest: 70,
    c: ['Gomiti bloccati ai fianchi.', 'In basso allarga la corda e tieni 1 secondo.', 'Busto leggermente inclinato in avanti, fermo.'],
    e: ['Usare le spalle e il peso del corpo.'],
  },
  {
    id: 'pushdown-barra', n: 'Push-down ai cavi con barra', a: [], m: ['tricipiti'], s: [],
    eq: 'cavi', p: 'pushdown', rr: '10-15', rest: 70,
    c: ['Presa prona, polsi rigidi, gomiti immobili.'],
    e: ['Avvicinarsi troppo o troppo poco alla torre.'],
  },
  {
    id: 'dip-tricipiti', n: 'Dip alle parallele (tricipiti)', a: ['dips'], m: ['tricipiti'], s: ['petto', 'spalle'],
    eq: 'corpo', p: 'dip', rr: '8-12', rest: 120,
    c: ['Busto il più verticale possibile.', 'Gomiti stretti, scendi fino a 90°.'],
    e: ['Scendere troppo in basso.', 'Spalle che si alzano verso le orecchie.'],
  },
  {
    id: 'estensioni-sopra-testa', n: 'Estensioni sopra la testa', a: ['overhead triceps extension'], m: ['tricipiti'], s: [],
    eq: 'manubri', p: 'tricepsExt', rr: '10-15', rest: 75,
    c: ['Gomiti stretti e puntati in alto.', 'Massimo allungamento del capo lungo: scendi bene dietro.'],
    e: ['Aprire i gomiti.', 'Inarcare la schiena.'],
  },
  {
    id: 'estensioni-cavi-alto', n: 'Estensioni ai cavi sopra la testa', a: ['overhead cable extension'], m: ['tricipiti'], s: [],
    eq: 'cavi', p: 'tricepsExt', rr: '12-15', rest: 70,
    c: ['Di spalle alla torre, busto inclinato in avanti.', 'Tensione costante nel punto di massimo allungamento.'],
    e: ['Muovere i gomiti avanti e indietro.'],
  },
  {
    id: 'kickback', n: 'Kickback con manubrio', a: ['triceps kickback'], m: ['tricipiti'], s: [],
    eq: 'manubri', p: 'kickback', rr: '12-15', rest: 60,
    c: ['Braccio parallelo al busto, muovi solo l’avambraccio.', 'Contrazione di picco in estensione completa.'],
    e: ['Carico eccessivo e movimento a slancio.'],
  },

  /* ----------------------------------------------------- GAMBE / QUADS -- */
  {
    id: 'squat', n: 'Squat con bilanciere', a: ['back squat', 'squat bilanciere'], m: ['quadricipiti'], s: ['glutei', 'femorali', 'lombari'],
    eq: 'bilanciere', p: 'squat', rr: '5-8', rest: 180,
    c: ['Bilanciere appoggiato sui trapezi (high bar) o deltoidi posteriori (low bar).', 'Piedi larghezza spalle, punte leggermente extraruotate.', 'Inizia il movimento con anche e ginocchia insieme.', 'Scendi almeno fino al parallelo mantenendo la schiena neutra.', 'Spingi dal centro del piede, ginocchia in linea con le punte.'],
    e: ['Ginocchia che collassano verso l’interno.', 'Talloni che si sollevano.', 'Schiena che si arrotonda in buca ("butt wink" marcato).'],
  },
  {
    id: 'front-squat', n: 'Front squat', a: ['squat frontale'], m: ['quadricipiti'], s: ['glutei', 'addome'],
    eq: 'bilanciere', p: 'frontSquat', rr: '5-8', rest: 180,
    c: ['Gomiti alti per tutta l’alzata: se cadono, cade il bilanciere.', 'Busto più verticale rispetto al back squat.'],
    e: ['Gomiti che si abbassano.', 'Appoggiare il bilanciere sulle clavicole senza supporto delle spalle.'],
  },
  {
    id: 'leg-press', n: 'Leg press 45°', a: ['pressa'], m: ['quadricipiti'], s: ['glutei', 'femorali'],
    eq: 'macchina', p: 'legPress', rr: '8-15', rest: 120,
    c: ['Piedi a metà pedana, larghezza spalle.', 'Scendi fino a ~90° senza staccare il bacino dallo schienale.', 'Non bloccare completamente le ginocchia in alto.'],
    e: ['Staccare la lombare dallo schienale.', 'Mani sulle ginocchia.'],
  },
  {
    id: 'hack-squat', n: 'Hack squat', a: [], m: ['quadricipiti'], s: ['glutei'],
    eq: 'macchina', p: 'squat', rr: '8-12', rest: 120,
    c: ['Schiena ben aderente al pad, piedi leggermente avanti.', 'Discesa profonda e controllata.'],
    e: ['Staccare i talloni.'],
  },
  {
    id: 'leg-extension', n: 'Leg extension', a: ['estensioni gambe'], m: ['quadricipiti'], s: [],
    eq: 'macchina', p: 'legExtension', rr: '12-15', rest: 75,
    c: ['Allinea l’asse di rotazione della macchina con il ginocchio.', 'Estensione completa con 1 secondo di picco.', 'Discesa lenta: l’eccentrica è la parte che conta.'],
    e: ['Movimento a slancio.', 'Staccare i glutei dal sedile.'],
  },
  {
    id: 'affondi', n: 'Affondi con manubri', a: ['lunges', 'affondi'], m: ['quadricipiti'], s: ['glutei', 'femorali'],
    eq: 'manubri', p: 'lunge', rr: '10-12', rest: 90,
    c: ['Passo ampio, busto verticale.', 'Scendi finché il ginocchio posteriore sfiora il suolo.', 'Spingi con il tallone della gamba avanti.'],
    e: ['Passo troppo corto: sovraccarico del ginocchio.', 'Busto che crolla in avanti.'],
  },
  {
    id: 'affondi-camminata', n: 'Affondi camminata', a: ['walking lunges'], m: ['quadricipiti'], s: ['glutei', 'femorali'],
    eq: 'manubri', p: 'lunge', rr: '10-14', rest: 90,
    c: ['Mantieni il ritmo e il controllo dell’equilibrio.', 'Core attivo per non ondeggiare.'],
    e: ['Perdere l’allineamento del ginocchio.'],
  },
  {
    id: 'bulgarian-split-squat', n: 'Bulgarian split squat', a: ['affondo bulgaro', 'split squat'], m: ['quadricipiti'], s: ['glutei'],
    eq: 'manubri', p: 'lunge', rr: '8-12', rest: 110,
    c: ['Piede posteriore sulla panca, distanza tale da scendere verticale.', 'Più busto inclinato = più glutei; più verticale = più quadricipiti.'],
    e: ['Piede avanti troppo vicino alla panca.'],
  },
  {
    id: 'goblet-squat', n: 'Goblet squat', a: [], m: ['quadricipiti'], s: ['glutei', 'addome'],
    eq: 'manubri', p: 'squat', rr: '10-15', rest: 90,
    c: ['Manubrio o kettlebell al petto, gomiti dentro le ginocchia.', 'Ottimo per imparare la tecnica dello squat.'],
    e: ['Inclinare il busto in avanti.'],
  },
  {
    id: 'step-up', n: 'Step-up', a: ['salita su rialzo'], m: ['quadricipiti'], s: ['glutei'],
    eq: 'manubri', p: 'stepUp', rr: '10-12', rest: 90,
    c: ['Spingi con il tallone della gamba sul rialzo.', 'Non darti la spinta con la gamba a terra.'],
    e: ['Rimbalzare con la gamba di appoggio.'],
  },
  {
    id: 'squat-corpo-libero', n: 'Squat a corpo libero', a: ['air squat'], m: ['quadricipiti'], s: ['glutei'],
    eq: 'corpo', p: 'squat', rr: '15-25', rest: 60,
    c: ['Braccia avanti per bilanciare, schiena neutra.'],
    e: ['Ginocchia verso l’interno.'],
  },

  /* ---------------------------------------------------- POSTERIORE/GLUTEI */
  {
    id: 'stacco', n: 'Stacco da terra', a: ['deadlift', 'stacchi'], m: ['dorso', 'femorali'], s: ['glutei', 'lombari', 'trapezi'],
    eq: 'bilanciere', p: 'hinge', rr: '3-6', rest: 210,
    c: ['Bilanciere a metà piede, stinchi quasi a contatto.', 'Schiena neutra, petto alto, dorsali attivi ("spezza il bilanciere").', 'Spingi il pavimento con i piedi, non "tirare" con la schiena.', 'Anche e spalle salgono insieme: niente anticipo del bacino.', 'Blocca stringendo i glutei, senza iperestendere la lombare.'],
    e: ['Schiena arrotondata.', 'Bilanciere lontano dalle gambe.', 'Iperestensione finale del busto.'],
  },
  {
    id: 'stacco-rumeno', n: 'Stacco rumeno', a: ['romanian deadlift', 'rdl'], m: ['femorali'], s: ['glutei', 'lombari'],
    eq: 'bilanciere', p: 'hinge', rr: '8-12', rest: 120,
    c: ['Ginocchia leggermente flesse e FISSE.', 'Spingi il bacino indietro mantenendo il bilanciere a contatto con le cosce.', 'Scendi fino a sentire l’allungamento dei femorali, poi risali.'],
    e: ['Piegare le ginocchia come in uno squat.', 'Arrotondare la schiena per scendere di più.'],
  },
  {
    id: 'stacco-sumo', n: 'Stacco sumo', a: ['sumo deadlift'], m: ['quadricipiti', 'glutei'], s: ['dorso', 'adduttori'],
    eq: 'bilanciere', p: 'hinge', rr: '3-6', rest: 210,
    c: ['Piedi molto larghi, punte extraruotate, mani dentro le gambe.', 'Busto più verticale rispetto allo stacco convenzionale.'],
    e: ['Ginocchia che cedono all’interno.'],
  },
  {
    id: 'leg-curl-sdraiato', n: 'Leg curl sdraiato', a: ['lying leg curl', 'femorali sdraiato'], m: ['femorali'], s: ['polpacci'],
    eq: 'macchina', p: 'legCurl', rr: '10-15', rest: 75,
    c: ['Bacino aderente al pad, non sollevarlo.', 'Contrazione completa, discesa in 3 secondi.'],
    e: ['Alzare il bacino per aiutarsi.'],
  },
  {
    id: 'leg-curl-seduto', n: 'Leg curl seduto', a: ['seated leg curl'], m: ['femorali'], s: [],
    eq: 'macchina', p: 'legCurl', rr: '10-15', rest: 75,
    c: ['Posizione seduta: maggiore allungamento del femorale.', 'Blocca bene le cosce sotto il pad.'],
    e: ['Movimento parziale.'],
  },
  {
    id: 'nordic-curl', n: 'Nordic curl', a: ['nordic hamstring'], m: ['femorali'], s: ['glutei'],
    eq: 'corpo', p: 'legCurl', rr: '5-8', rest: 120,
    c: ['Scendi il più lentamente possibile: è un esercizio eccentrico.', 'Corpo in linea dalle ginocchia alle spalle.'],
    e: ['Piegare le anche per rendere il movimento più facile.'],
  },
  {
    id: 'hip-thrust', n: 'Hip thrust con bilanciere', a: ['ponte glutei', 'hip thrust'], m: ['glutei'], s: ['femorali'],
    eq: 'bilanciere', p: 'hipThrust', rr: '8-12', rest: 120,
    c: ['Scapole appoggiate alla panca, mento verso il petto.', 'Spingi con i talloni, blocca in alto 1 secondo.', 'In alto il busto è parallelo al suolo: non iperestendere.'],
    e: ['Iperestendere la lombare in chiusura.', 'Spingere sulle punte dei piedi.'],
  },
  {
    id: 'glute-bridge', n: 'Glute bridge', a: ['ponte a terra'], m: ['glutei'], s: ['femorali'],
    eq: 'corpo', p: 'hipThrust', rr: '12-20', rest: 60,
    c: ['A terra, talloni vicini ai glutei.', 'Contrai forte in alto per 2 secondi.'],
    e: ['Spingere con la lombare invece che con i glutei.'],
  },
  {
    id: 'abduzioni-macchina', n: 'Abduzioni alla macchina', a: ['hip abduction'], m: ['abduttori'], s: ['glutei'],
    eq: 'macchina', p: 'abduction', rr: '15-20', rest: 60,
    c: ['Busto leggermente in avanti per più medio gluteo.', 'Apertura completa con fermo di 1 secondo.'],
    e: ['Movimento a rimbalzo.'],
  },
  {
    id: 'adduzioni-macchina', n: 'Adduzioni alla macchina', a: ['hip adduction'], m: ['adduttori'], s: [],
    eq: 'macchina', p: 'adduction', rr: '15-20', rest: 60,
    c: ['Allunga bene in apertura prima di chiudere.'],
    e: ['Range eccessivo oltre la propria mobilità.'],
  },
  {
    id: 'kickback-glutei', n: 'Kickback glutei ai cavi', a: ['glute kickback'], m: ['glutei'], s: ['femorali'],
    eq: 'cavi', p: 'kickback', rr: '12-15', rest: 60,
    c: ['Busto fermo, estendi l’anca senza inarcare la schiena.', 'Contrai il gluteo in chiusura.'],
    e: ['Compensare con la lombare.'],
  },
  {
    id: 'good-morning', n: 'Good morning', a: [], m: ['femorali'], s: ['lombari', 'glutei'],
    eq: 'bilanciere', p: 'hinge', rr: '8-12', rest: 120,
    c: ['Carico leggero, schiena rigidamente neutra.', 'Cerniera d’anca pura: il ginocchio resta quasi fermo.'],
    e: ['Carico eccessivo.', 'Flettere la colonna.'],
  },
  {
    id: 'kb-swing', n: 'Kettlebell swing', a: ['swing'], m: ['glutei'], s: ['femorali', 'lombari', 'cardio'],
    eq: 'kettlebell', p: 'hinge', rr: '15-20', rest: 75,
    c: ['È una cerniera d’anca esplosiva, non uno squat.', 'Il kettlebell sale per inerzia: non alzarlo con le braccia.', 'Blocca glutei e addome in alto.'],
    e: ['Squattare invece di flettere le anche.', 'Iperestendere la schiena in alto.'],
  },

  /* ---------------------------------------------------------- POLPACCI -- */
  {
    id: 'calf-raise-piedi', n: 'Calf raise in piedi', a: ['standing calf raise', 'polpacci in piedi'], m: ['polpacci'], s: [],
    eq: 'macchina', p: 'calfRaise', rr: '12-20', rest: 60,
    c: ['Massimo allungamento in basso (2 secondi) e picco in alto.', 'Ginocchia tese: lavora il gastrocnemio.'],
    e: ['Rimbalzare sfruttando il tendine.'],
  },
  {
    id: 'calf-raise-seduto', n: 'Calf raise seduto', a: ['seated calf raise'], m: ['polpacci'], s: [],
    eq: 'macchina', p: 'calfRaise', rr: '15-20', rest: 60,
    c: ['Ginocchia a 90°: enfasi sul soleo.', 'Range completo, tempo sotto tensione alto.'],
    e: ['Movimento troppo rapido.'],
  },
  {
    id: 'calf-press', n: 'Calf press alla leg press', a: [], m: ['polpacci'], s: [],
    eq: 'macchina', p: 'calfRaise', rr: '12-20', rest: 60,
    c: ['Avampiede sul bordo della pedana, ginocchia morbide.'],
    e: ['Piegare le ginocchia per spingere.'],
  },

  /* ------------------------------------------------------------ ADDOME -- */
  {
    id: 'crunch', n: 'Crunch a terra', a: ['crunches'], m: ['addome'], s: [],
    eq: 'corpo', p: 'crunch', rr: '15-25', rest: 45,
    c: ['Solleva solo le scapole arrotondando la colonna dorsale.', 'Espira in chiusura, mani che non spingono la testa.'],
    e: ['Tirare il collo con le mani.', 'Fare un sit-up completo.'],
  },
  {
    id: 'crunch-cavi', n: 'Crunch ai cavi', a: ['cable crunch'], m: ['addome'], s: [],
    eq: 'cavi', p: 'crunch', rr: '12-20', rest: 60,
    c: ['In ginocchio, corda dietro la nuca, anche ferme.', 'Arrotola la colonna portando i gomiti verso le cosce.'],
    e: ['Usare le anche come una cerniera.'],
  },
  {
    id: 'leg-raise', n: 'Leg raise alla sbarra', a: ['hanging leg raise', 'sollevamento gambe'], m: ['addome'], s: ['avambracci'],
    eq: 'corpo', p: 'legRaise', rr: '10-15', rest: 75,
    c: ['Parti retroversando il bacino: non solo sollevare le gambe.', 'Controlla la discesa, niente oscillazioni.'],
    e: ['Dondolare usando lo slancio.'],
  },
  {
    id: 'leg-raise-terra', n: 'Leg raise a terra', a: [], m: ['addome'], s: [],
    eq: 'corpo', p: 'legRaise', rr: '12-20', rest: 45,
    c: ['Lombare sempre a contatto con il pavimento.', 'Mani sotto i glutei per aiutarti all’inizio.'],
    e: ['Inarcare la schiena quando le gambe scendono.'],
  },
  {
    id: 'plank', n: 'Plank', a: ['front plank'], m: ['addome'], s: ['spalle', 'lombari'],
    eq: 'corpo', p: 'plank', rr: '30-60 s', rest: 60, timed: true,
    c: ['Gomiti sotto le spalle, corpo in linea.', 'Retroverti leggermente il bacino e contrai i glutei.', 'Respira normalmente.'],
    e: ['Bacino troppo alto o troppo basso.', 'Trattenere il respiro.'],
  },
  {
    id: 'plank-laterale', n: 'Plank laterale', a: ['side plank'], m: ['addome'], s: ['spalle'],
    eq: 'corpo', p: 'plank', rr: '30-45 s', rest: 45, timed: true,
    c: ['Spinta attiva verso l’alto con l’anca.', 'Corpo su un unico piano.'],
    e: ['Bacino che cede verso il basso.'],
  },
  {
    id: 'russian-twist', n: 'Russian twist', a: ['torsioni russe'], m: ['addome'], s: [],
    eq: 'corpo', p: 'twist', rr: '20-30', rest: 45,
    c: ['Busto a 45°, ruota dal torace non solo con le braccia.'],
    e: ['Muovere solo le mani senza ruotare il tronco.'],
  },
  {
    id: 'ab-wheel', n: 'Ab wheel (ruota addominale)', a: ['ruota'], m: ['addome'], s: ['dorso', 'spalle'],
    eq: 'corpo', p: 'abwheel', rr: '8-15', rest: 75,
    c: ['Parti in ginocchio, bacino retroverso.', 'Estendi solo fin dove riesci a NON inarcare la lombare.'],
    e: ['Perdere il controllo e inarcare la schiena.'],
  },
  {
    id: 'mountain-climber', n: 'Mountain climber', a: [], m: ['addome'], s: ['cardio', 'spalle'],
    eq: 'corpo', p: 'mountain', rr: '30-45 s', rest: 45, timed: true,
    c: ['Bacino basso, ritmo costante.'],
    e: ['Alzare il sedere a ogni cambio.'],
  },
  {
    id: 'crunch-macchina', n: 'Crunch alla macchina', a: ['ab machine'], m: ['addome'], s: [],
    eq: 'macchina', p: 'crunch', rr: '12-20', rest: 60,
    c: ['Arrotola la colonna, non flettere solo le anche.'],
    e: ['Tirare con le braccia.'],
  },
  {
    id: 'woodchopper', n: 'Woodchopper ai cavi', a: ['cable woodchop'], m: ['addome'], s: ['spalle'],
    eq: 'cavi', p: 'twist', rr: '12-15', rest: 60,
    c: ['Ruota dal tronco mantenendo le braccia tese.', 'Piedi fermi, perno sull’anca.'],
    e: ['Tirare solo con le braccia.'],
  },

  /* ------------------------------------------------------- AVAMBRACCI --- */
  {
    id: 'curl-polsi', n: 'Curl ai polsi', a: ['wrist curl'], m: ['avambracci'], s: [],
    eq: 'bilanciere', p: 'wristCurl', rr: '15-20', rest: 45,
    c: ['Avambracci appoggiati, muovi solo i polsi.', 'Lascia rotolare il bilanciere fino alle dita in allungamento.'],
    e: ['Muovere i gomiti.'],
  },
  {
    id: 'curl-polsi-inverso', n: 'Curl ai polsi inverso', a: ['reverse wrist curl'], m: ['avambracci'], s: [],
    eq: 'bilanciere', p: 'wristCurl', rr: '15-20', rest: 45,
    c: ['Carichi leggeri, movimento lento.'],
    e: ['Esagerare con il peso.'],
  },
  {
    id: 'farmer-walk', n: 'Farmer walk', a: ['camminata del contadino'], m: ['avambracci'], s: ['trapezi', 'addome'],
    eq: 'manubri', p: 'farmer', rr: '30-45 s', rest: 90, timed: true,
    c: ['Spalle basse e indietro, addome attivo.', 'Passi corti e controllati.'],
    e: ['Spalle che collassano in avanti.'],
  },

  /* ------------------------------------------------------------ CARDIO -- */
  {
    id: 'tapis-corsa', n: 'Corsa su tapis roulant', a: ['treadmill', 'running'], m: ['cardio'], s: ['quadricipiti', 'polpacci'],
    eq: 'cardio', p: 'cardio', rr: '20-40 min', rest: 0, timed: true, cardio: true,
    c: ['Parti con 5 minuti di riscaldamento progressivo.', 'Appoggio sotto il baricentro, cadenza alta.'],
    e: ['Reggersi alle maniglie.'],
  },
  {
    id: 'camminata-inclinata', n: 'Camminata inclinata', a: ['incline walk'], m: ['cardio'], s: ['glutei', 'femorali'],
    eq: 'cardio', p: 'cardio', rr: '20-45 min', rest: 0, timed: true, cardio: true,
    c: ['Inclinazione 10-15%, velocità 5-6 km/h.', 'Ottimo cardio a basso impatto articolare.'],
    e: ['Appoggiarsi al corrimano annullando il lavoro.'],
  },
  {
    id: 'cyclette', n: 'Cyclette', a: ['bike', 'bici'], m: ['cardio'], s: ['quadricipiti'],
    eq: 'cardio', p: 'bike', rr: '20-40 min', rest: 0, timed: true, cardio: true,
    c: ['Sella all’altezza dell’anca: ginocchio quasi esteso in basso.'],
    e: ['Sella troppo bassa: stress sul ginocchio.'],
  },
  {
    id: 'vogatore', n: 'Vogatore', a: ['rower', 'remoergometro'], m: ['cardio'], s: ['dorso', 'quadricipiti'],
    eq: 'cardio', p: 'rowErg', rr: '10-25 min', rest: 0, timed: true, cardio: true,
    c: ['Sequenza: gambe → busto → braccia. Al ritorno: braccia → busto → gambe.', '60% del lavoro viene dalle gambe.'],
    e: ['Tirare prima con le braccia.', 'Arrotondare la schiena.'],
  },
  {
    id: 'ellittica', n: 'Ellittica', a: ['elliptical'], m: ['cardio'], s: [],
    eq: 'cardio', p: 'cardio', rr: '20-40 min', rest: 0, timed: true, cardio: true,
    c: ['Postura eretta, usa anche le braccia.'],
    e: ['Appoggiarsi in avanti sulle maniglie fisse.'],
  },
  {
    id: 'corda', n: 'Salto con la corda', a: ['jump rope'], m: ['cardio'], s: ['polpacci'],
    eq: 'cardio', p: 'rope', rr: '5-15 min', rest: 60, timed: true, cardio: true,
    c: ['Salti bassi, rotazione dai polsi.'],
    e: ['Saltare troppo in alto.'],
  },
  {
    id: 'burpee', n: 'Burpee', a: [], m: ['cardio'], s: ['petto', 'quadricipiti'],
    eq: 'corpo', p: 'burpee', rr: '10-20', rest: 75,
    c: ['Mantieni il ritmo, atterra morbido.'],
    e: ['Schiena inarcata nel piegamento.'],
  },

  /* ------------------------------------------------------ FULL BODY ----- */
  {
    id: 'power-clean', n: 'Girata al petto (power clean)', a: ['clean'], m: ['quadricipiti', 'trapezi'], s: ['dorso', 'glutei', 'spalle'],
    eq: 'bilanciere', p: 'clean', rr: '3-5', rest: 180,
    c: ['Prima tirata lenta, esplosione dalle anche al passaggio del ginocchio.', 'Gomiti velocissimi sotto al bilanciere in ricezione.'],
    e: ['Tirare con le braccia troppo presto.', 'Ricevere con la schiena curva.'],
  },
  {
    id: 'thruster', n: 'Thruster', a: [], m: ['quadricipiti', 'spalle'], s: ['glutei', 'tricipiti'],
    eq: 'bilanciere', p: 'thruster', rr: '6-10', rest: 150,
    c: ['Front squat completo e spinta sopra la testa in un unico gesto fluido.'],
    e: ['Spezzare il movimento perdendo l’inerzia.'],
  },
  {
    id: 'sled-push', n: 'Spinta slitta (sled push)', a: ['prowler'], m: ['quadricipiti'], s: ['glutei', 'cardio'],
    eq: 'cardio', p: 'sled', rr: '20-30 m', rest: 120, timed: true,
    c: ['Busto inclinato, passi corti e potenti.'],
    e: ['Braccia molli che assorbono la spinta.'],
  },
];

/* ---------------------------------------------------------------- index -- */

export const EX_BY_ID = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));

export function getEx(id) {
  return EX_BY_ID[id] || { id, n: id, m: [], s: [], eq: 'manubri', p: 'misc', rr: '8-12', rest: 90, c: [], e: [] };
}

/** Incremento di carico consigliato in base all'attrezzo e al distretto. */
export function stepFor(ex) {
  if (!ex) return 2.5;
  const lower = ['quadricipiti', 'femorali', 'glutei', 'polpacci'].some((m) => (ex.m || []).includes(m));
  switch (ex.eq) {
    case 'manubri': return 2;
    case 'cavi': case 'macchina': return lower ? 5 : 2.5;
    case 'bilanciere': case 'smith': case 'ez': return lower ? 5 : 2.5;
    case 'corpo': return 1.25;
    default: return 2.5;
  }
}

/** Normalizza una stringa per il matching (accenti, punteggiatura, spazi). */
export function norm(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Ricerca fuzzy: punteggio su nome + alias + muscoli + attrezzo. */
export function searchEx(q, list = EXERCISES) {
  const nq = norm(q);
  if (!nq) return list;
  const toks = nq.split(' ');
  return list
    .map((e) => {
      const hay = norm([e.n, ...(e.a || []), ...(e.m || []), EQUIP[e.eq] || ''].join(' '));
      const name = norm(e.n);
      let sc = 0;
      if (name === nq) sc += 100;
      if (name.startsWith(nq)) sc += 50;
      if (hay.includes(nq)) sc += 30;
      for (const t of toks) {
        if (!t) continue;
        if (name.includes(t)) sc += 10;
        else if (hay.includes(t)) sc += 5;
        else sc -= 6;
      }
      return { e, sc };
    })
    .filter((x) => x.sc > 0)
    .sort((a, b) => b.sc - a.sc)
    .map((x) => x.e);
}

/** Miglior corrispondenza per l'import testuale di una scheda. */
export function matchEx(name) {
  const r = searchEx(name);
  return r.length ? r[0] : null;
}

/* ------------------------------------------------- esercizi personalizzati */

/** Esercizi creati dall'utente (persistiti nello stato e iniettati qui all'avvio). */
export const CUSTOM = [];

export function registerCustom(list = []) {
  CUSTOM.length = 0;
  for (const e of list) {
    const ex = { p: 'misc', m: [], s: [], eq: 'manubri', rr: '8-12', rest: 90, c: [], e: [], a: [], ...e, custom: true };
    CUSTOM.push(ex);
    EX_BY_ID[ex.id] = ex;
    if (!EXERCISES.some((x) => x.id === ex.id)) EXERCISES.push(ex);
  }
}

export function makeCustom(name) {
  const base = norm(name).replace(/ /g, '-').slice(0, 40) || 'esercizio';
  let id = 'c-' + base, i = 2;
  while (EX_BY_ID[id]) id = `c-${base}-${i++}`;
  return { id, n: name.trim(), custom: true, p: 'misc', m: [], s: [], eq: 'manubri', rr: '8-12', rest: 90, c: [], e: [], a: [] };
}
