# Promemoria personali per Chrome

Una piccola estensione Chrome per creare attività e ricevere notifiche all'orario scelto. Non richiede bot Telegram, server o account: attività e scadenze restano nello spazio locale dell'estensione nel tuo profilo Chrome.

## Funzioni

- Aggiunta di attività con data e ora.
- Notifiche desktop all'ora impostata.
- Elenco delle attività, completamento ed eliminazione.
- Interfaccia in italiano.

## Installazione in Chrome

1. Scarica questa repository sul computer (GitHub: **Code → Download ZIP**) ed estrai lo ZIP, oppure clonala con Git.
2. Apri `chrome://extensions` in Chrome.
3. Attiva **Modalità sviluppatore**.
4. Fai clic su **Carica estensione non pacchettizzata** e seleziona la cartella che contiene `manifest.json`.
5. Fissa l'estensione dalla barra degli strumenti, se vuoi averla sempre a portata di mano.
6. Consenti le notifiche di Chrome quando richiesto e aggiungi il primo promemoria.

## Uso

Fai clic sull'icona dell'estensione, scrivi l'attività, scegli una data e un orario futuri e premi **Aggiungi promemoria**. Puoi poi segnare un'attività come completata o eliminarla.

## Note

- È un'estensione locale per Chrome, non un bot Telegram e non invia dati a servizi esterni.
- Chrome deve poter eseguire le notifiche. Se chiudi completamente Chrome, il promemoria potrebbe apparire solo quando Chrome viene riaperto; il comportamento dipende anche dalle impostazioni di sistema e del browser.
- Disinstallando l'estensione o cancellandone i dati, le attività salvate possono andare perse.
- Per sviluppare l'estensione, modifica i file e premi **Ricarica** nella pagina `chrome://extensions`.

## Licenza

Non è ancora stata scelta una licenza per il riutilizzo del codice. Aggiungine una se vuoi permettere ad altri di usarlo o modificarlo.
