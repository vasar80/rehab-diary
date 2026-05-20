# Cammino — fotogrammi del ciclo del passo

Salva qui l'immagine sorgente generata dall'AI a partire dalla sequenza Muybridge:

```
public/modules/walking/cycle.png
```

## Requisiti dell'immagine

- **Formato**: PNG o JPG (il codice usa `.png` di default; cambia in `frames.config.ts` se serve)
- **Layout**: 7 fotogrammi affiancati orizzontalmente, equidistanti
- **Ordine**: dal primo al settimo del ciclo del cammino (canonico, non casuale)
- **Aspect ratio per fotogramma**: idealmente verticale (es. 280×400 px per ogni fotogramma → 1960×400 totale), ma il sistema si adatta
- **Larghezza totale consigliata**: 1400–2100 px per nitidezza retina su mobile

L'ordine canonico (corrisponde all'ordine dei fotogrammi nell'immagine):

1. Right heel strike — gamba destra avanti, sinistra indietro, entrambe a terra
2. Right loading response — peso sulla destra, sinistra che si solleva
3. Right mid-stance — destra verticale, sinistra in volo a metà swing
4. Right terminal stance / toe-off — destra che spinge indietro, sinistra avanti
5. Left heel strike — speculare di 1
6. Left loading response — speculare di 2
7. Left mid-stance — speculare di 3

Una volta salvato il file, aggiornare la app non richiede altro: il sistema lo legge automaticamente.
