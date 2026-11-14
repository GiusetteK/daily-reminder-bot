# Promemoria personali per Chrome

Una estensione Chrome per organizzare attività e ricevere notifiche. Include una dashboard responsive, tema scuro e promemoria giornalieri ricorrenti. Non richiede bot Telegram, server o account: le attività e le preferenze restano nel profilo Chrome locale.

## Funzioni

- Dashboard responsive, con sezioni per tutte le attività, oggi, prossime e completate.
- Popup per aggiunta rapida e dashboard per gestione completa.
- Categorie, priorità, ricerca, filtri e ordinamento.
- Modifica, completamento, eliminazione e rimozione delle attività completate.
- Tema chiaro/scuro, condiviso tra popup e dashboard e ricordato sul dispositivo.
- Promemoria singoli o giornalieri, con notifica desktop e aggiornamento automatico della prossima scadenza.
- Tutti i dati restano localmente nel profilo Chrome.

## Installazione in Chrome

1. Scarica la repository (**Code → Download ZIP**) ed estrai lo ZIP, oppure clonala con Git.
2. Apri `chrome://extensions` in Chrome e attiva **Modalità sviluppatore**.
3. Seleziona **Carica estensione non pacchettizzata** e scegli la cartella che contiene `manifest.json`.
4. Fissa l'estensione, se vuoi, dalla barra degli strumenti.
5. Aggiungi un promemoria dal popup o apri la dashboard con il pulsante ↗.

## Ripetizione giornaliera

Nel campo **Ripetizione**, seleziona **Ogni giorno**. Dopo ogni notifica l'estensione pianifica la ricorrenza per il giorno successivo mantenendo l'orario locale. Per interromperla, modifica l'attività e scegli **Una volta**, oppure elimina/completa l'attività. Se Chrome è chiuso all'ora prevista, la notifica può essere mostrata al successivo avvio di Chrome e la ricorrenza prosegue dalla prossima data utile.

## Privacy e notifiche

- Non vengono inviati dati a servizi esterni.
- Le notifiche dipendono da Chrome e dalle impostazioni del sistema operativo; chiudendo completamente Chrome potrebbero arrivare solo alla riapertura.
- Disinstallando l'estensione o cancellandone i dati, le attività e le preferenze locali possono andare perse.
- Dopo aver aggiornato il codice, apri `chrome://extensions` e premi **Ricarica** sull'estensione.

## Licenza

Non è ancora stata scelta una licenza per il riutilizzo del codice.
