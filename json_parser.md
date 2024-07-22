
> [Ritorna alla pagina principale](README.md)

# **JSON parser**

È un **parser ricorsivo** dei dati JSON che vengono normalmente ricevuti in **modo asincrono** mediante un topic MQTT. Esegue nell'ordine:
1. Ricerca di un **comando** all'interno dell'oggetto JSON ricevuto
2. Restituzione del **percorso** del comando corrente all'interno della struttura dati JSON ricevuta. Il percorso restituito deve corrispondere al percorso della funzione da chiamare nella struttura dati della mappa dei comandi.
3. **Invocazione** della funzione che, nella **mappa dei comandi**, ha il suo puntatore su quel percorso.
4. Passaggio al **comando successivo** non ancora interpretato.

Se un comando non viene trovato nella mappa dei comandi, viene segnalato un errore e si passa al parsing del comando successivo

## **Device parser**

E' un **parser** che lavora sui messaggi **pubblicati** dall'**interfaccia web** o dal **server applicativo** e i **comandi JSON** corrispondenti vengono inviati  su un:
- **topic di configurazione** in cui solo il server applicativo è un publisher mentre tutti gli altri dispositivi IoT sono subscriber. Serve ad **impostare da remoto** i parametri di funzionamento del dispositivo.
- **topic di feedback (stato)** per indicare al dispositivo le informazioni sullo **stato** che il server applicativo o l'utente sono interessati a conoscere.
  
**Mappa delle funzioni** di **lettura** da eseguire su un determinato percorso dei comandi ricevuti (stati):
- Devono **coincidere** con i percorsi corrispondenti dell'oggetto JSON trasmesso.
- I comandi di **sola lettura** sono **senza parametri** e possono essere rappresentati nel JSON come **celle in un elenco** di comandi.

Ad esempio, il JSON che rappresenta i **comandi di lettura** del polling delle misure e della velocità della porta seriale si possono codificare nel JSON:

```Json
"configs": {
        "read": ["polltime", "servel"]
}
```

**Mappa delle funzioni** di **scrittura** da eseguire su un determinato percorso dei comandi ricevuti (stati):
- Devono **coincidere** con i percorsi corrispondenti dell'oggetto JSON trasmesso.
- I comandi di **scrittura** sono **con parametri** e devono essere rappresentati nel JSON come **coppie chiave-valore** di comandi.

Ad esempio, il JSON che rappresenta i comandi di **scrittura** del polling delle misure e della velocità della porta seriale si possono codificare nel JSON:

```Json
"configs": {
        "write":{
                "polltime": 1
                "servel": 115200
        },
 }
```

In definitiva, i JSON di configurazione vengono interpretati:
- con l'invocazione di funzioni **dotate di parametri** che **modificano lo stato** corrente del dispositivo.
- con con funzioni **prive di parametri** che leggono lo stato corrente del dispositivo.

Per quanto riguarda la codifica dei comandi nella mappa dei comandi bisogna tenere presente che le liste di puntatori a funzioni con chiave stringa (il nome del comando associato) costituiscono degli array associativi. Gli array associativi in Python vengono comunque rappresentati come oggetti che contengono liste di coppie campo-valore. 

Per questo motivo, la rappresentazione di tutti i comandi, che siano parametrizzati o meno, è sostanzialmente uniforme, cioè si realizza allo stesso modo per entrambe le tipologie di funzioni. La **mappa** corrispondente ai json di **configurazione** e **stato** è:

``` Python
command_map = {
    #"boardID": check_id,
    "configs": {
        "write": {# commands whose reception causes a configuration action on the system
            "polltime": scrivi_pollTime,
            "servel": scrivi_servel,
            "radarmode": scrivi_radarMode,
            "radareboot": scrivi_radarReboot,
            "radartoggle": scrivi_radarToggle #scrivi_radarFactory,
        },
        "read": {# commands whose reception causes the sending of a system status
            "radarfw": leggi_radarfw,
            "servel": leggi_servel,
            "polltime": leggi_pollTime,
            "radarmode": leggi_radarMode,
            "allstate": pubAllState,
            "radarstate": leggi_radarState,
        }
    }
}
```
## **Application parser**

E' un **parser** che lavora sui messaggi **pubblicati** dal **dispositivo IoT** e i **comandi JSON** corrispondenti vengono inviati  su un:
- **topic di misura** e invoca la funzione con la responsabilità di mostrare le misure nell'interfaccia utente o di raccoglierle in un database.
- **topic di feedback (stato)** (dal dispositivo terminale, al broker), utile all'application server per ricevere conferma del cambio di stato dell'attuatore ma anche utile all'utente per conoscere il nuovo stato.

I **comandi** per **entrambi i topic** sono, in questo caso, generalmente **tutti parametrizzati** e le funzioni associate sono **tutte di scrittura** e chiaramente valorizzate con almeno un **parametro**.

La **mappa delle funzioni** di **scrittura** da eseguire su un determinato percorso dei comandi ricevuti (stati):
- Devono **coincidere** con i percorsi corrispondenti dell'oggetto JSON trasmesso.
- I comandi di **scrittura** sono **con parametri** e devono essere rappresentati nel JSON come **coppie chiave-valore** di comandi.

```Json
{
"radar": {
        "fw": "V256.516.588257557",
        "servel": 256000,
        "polltime": 1,
        "radarmode": "multi",
        "radarstate": "on",
        "radareboot": "1",
    },
    "boardID": "04",
    "timestamp": "20/07/2024 18:10:34",
}
```
Gli array associativi in JS vengono comunque rappresentati come oggetti che contengono liste di coppie campo-valore.

Per cui, la rappresentazione di tutti i comandi, che siano parametrizzati o meno, è sostanzialmente uniforme, cioè si realizza allo stesso modo per entrambe le tipologie di funzioni. La **mappa** corrispondente ai json di **misura** e **stato** è:

```js
const commandMap = {
        radar: {
                fw: (value) => {
                                console.log('Setting fw to', value);
                                fw = value;
                        },
                polltime: (value) => {
                                console.log('Setting pollTime to', value);
                                setElem("poll1", millisToTimeString(value), '.poll1');
                        },
                servel: (value) => {
                                console.log('Setting servel to', value);
                                setElem("servel", value, '.servel');
                        },
                radarmode: (value) => {
                        console.log('Setting radarMode to', value)
                        //value = capitalizeFirstLetter(value);
                        value = "Inverti " + value;
                        setElem("radarmode", value);
                },
                radareboot: () => {
                        console.log('Rebooting radar');
                        setElem("radareboot", "Invia");
                },
                radarstate: (value) => {
                        console.log('radarstate radar');
                        value = "Inverti " + value;
                        setElem("radarstate", value);
                },
        },
        timestamp: () => {
                console.log('Rebooting radar');
                
        },
        boardID: (val) => {
                console.log('boardID');
                let elem = document.getElementById('sensorData');
                let inputelem = elem.querySelector('.boardID');
                inputelem.innerHTML = val;
        },
};		
```

Sitografia:
- chatGPT per parser con mappa di funzioni.

> [Ritorna alla pagina principale](README.md)
