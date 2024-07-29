
> [Ritorna alla pagina principale](README.md)

# **JSON parser**

È un **parser ricorsivo** dei dati JSON che vengono normalmente ricevuti in **modo asincrono** mediante un topic MQTT. Esegue nell'ordine:
1. Ricerca di un **comando** all'interno dell'oggetto JSON ricevuto
2. Restituzione del **percorso** del comando corrente all'interno della struttura dati JSON ricevuta. Il percorso restituito deve corrispondere al percorso della funzione da chiamare nella struttura dati della mappa dei comandi.
3. **Invocazione** della funzione che, nella **mappa dei comandi**, ha il suo puntatore su quel percorso.
4. Passaggio al **comando successivo** non ancora interpretato.

Se un comando non viene trovato nella mappa dei comandi, viene segnalato un errore e si passa al parsing del comando successivo.

Il parser permette la lettura di **elenchi parziali** di comandi, nel senso che non devono essere necessariamente tutti presenti nello stesso ogetto JSON. I **comandi** sono **entità atomiche** interpretate **singolarmente** in **maniera asincrona** (non periodica) al momento dell'arrivo del messaggio e viene invocata **una funzione** per **ogni singolo campo** interpretato.

## **Device parser**

E' un **parser** che lavora sui messaggi **pubblicati** dall'**interfaccia web** o dal **server applicativo** e i **comandi JSON** corrispondenti vengono inviati  su un:
- **topic di configurazione** in cui solo il server applicativo è un publisher mentre tutti gli altri dispositivi IoT sono subscriber. Serve ad **impostare da remoto** i parametri di funzionamento del dispositivo.
  
**Mappa delle funzioni** di **lettura** da eseguire su un determinato percorso dei comandi ricevuti (stati):
- Devono **coincidere** con i percorsi corrispondenti dell'oggetto JSON trasmesso.
- I comandi di **sola lettura** sono **senza parametri** e possono essere rappresentati nel JSON come **celle in un elenco** di comandi.

Ad esempio, il JSON seguente è inviato dalla **applicazione web** sul **topic di configurazione** e rappresenta i **comandi di lettura** delle impostazioni per il polling delle misure e per la velocità della porta seriale si possono codificare nel JSON:

```Json
"config": {
        "read": ["polltime", "servel"]
}
```

**Mappa delle funzioni** di **scrittura** da eseguire su un determinato percorso dei comandi ricevuti (stati):
- Devono **coincidere** con i percorsi corrispondenti dell'oggetto JSON trasmesso.
- I comandi di **scrittura** sono **con parametri** e devono essere rappresentati nel JSON come **coppie chiave-valore** di comandi.

Ad esempio, il JSON seguente è inviato dalla **applicazione web** sul **topic di configurazione** e rappresenta i comandi di **scrittura** delle impostazioni per il polling delle misure e per la velocità della porta seriale si possono codificare nel JSON:

```Json
"config": {
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
    "config": {
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

### **Topic di feedback (stato)**

Ad esempio, il JSON seguente è inviato dal **dispositivo IoT** sul **topic di feedback** (stato) e rappresenta i **comandi di scrittura** delle impostazioni complessive del sistema (stato corrente) sulla **dashboard** della pagina web si possono codificare nel JSON:

```Json
{
  "state": {
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

Per cui, la rappresentazione di tutti i comandi, che siano parametrizzati o meno, è sostanzialmente uniforme, cioè si realizza allo stesso modo per entrambe le tipologie di funzioni. La **mappa** corrispondente ai json di **stato** è:

```js
const commandMap = {
        state: {
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

### **Topic di misura**

Ad esempio, il JSON seguente è inviato dal **dispositivo IoT** sul **topic di misura** e rappresenta rappresenta i **comandi di scrittura** delle misure di radar e sensori di ambiente sulla dashboard della pagina web si possono codificare nel JSON:

```Json
{
  "measures": {
        "tempSensor": {
            "temp": 26.58,
            "press": 10006,
            "hum": 15.87,
            "gas": 125356,
        },
        "luxSensor": {
            "visible": 2.67,
            "infrared": 0,
            "total": 2.67,
        },
        "radar": {
            "x": 16.78,
            "y": 4.34,
            "vel": 2.12,
            "distres": 360,
        },
   }
  "boardID": "04-12345678",
  "timestamp": "20/07/2024 18:10:34"
}
```

Quest'ultimo messaggio, nella versione **radar1.html** dell'applicazione web, non viene gestito dal **parser JSON ricorsivo** della pagina perchè, nella attuale implementazione del FW del dispositivo, ha la particolarità di essere **periodico** e **atomico a livello di oggetto**, cioè **tutti i campi** sono sempe presenti e non è necessaria una loro **interpretazione parziale**. Più semplicemente, viene effettuata la **trasformazione** da stringa JSON a oggetto JS dell'intero messaggio per il quale viene poi invocata un'**unica funzione** che gestisce **tutti i campi**.

L'**invocazione iniziale** del **parser** viene eseguita, nel file ```radar1.js```, **solamente** all'arrivo dei messaggi sul **topic di stato** mediante la funzione ```processJson(commandMap, data)```, impostata con basePath = [] basePath = [], measures = [], cioè con path iniziale del parsing nullo e lista degli oggetti a profondità di parsing ridotta **nulla**.

#### **Parser a profondità variabile**

Invece, lo stesso messaggio, nella versione **radar2.html** dell'applicazione web, viene gestito direttamente dal **parser JSON ricorsivo** della pagina perchè si è utilizzata la sua particolarità di avere una **profondità di parsing** impostabile in base al  al **nome** della misura. In questo caso i campi  ```"tempSensor"```, ```"luxSensor``` e ```"radar"``` sono interpretati come oggetti e non come tipi primitivi e sono passati ad una funzione della command map che legge tutti i valori primitivi dell'oggetto e li inserisce nella loro posizione di output nell'interfaccia grafica.

L'**invocazione iniziale** del **parser** viene eseguita, nel file ```radar2.js```, all'arrivo di **tutti i messaggi**, sia quelli in arrivo sul **topic di stato** che quelli in arrivo sul **topic di misura** mediante la funzione ```processJson(commandMap, data, [], ["tempSensor", "luxSensor", "radar"])```, impostata con basePath = [] basePath = [], measures = ["tempSensor", "luxSensor", "radar"], cioè con path iniziale del parsing nullo e lista degli oggetti a profondità di parsing ridotta **nonulla**.

In **quest'ultimo caso** la **command map** che raccoglie tutte le callback che eseguono le azioni di parsing diventa:

```js
const commandMap = {
	measures: {
		radar: (value) =>{
			console.log('radar ', value);
			boardData[currBoardId].radarData = {
				x: roundArrTo(getFieldIfExists(value,'x'), 2, 1000),
				y: roundArrTo(getFieldIfExists(value,'y'), 2, 1000),
				vel: roundArrTo(getFieldIfExists(value,'vel'), 2),
				distres: roundArrTo(getFieldIfExists(value,'distres'), 2),
				rot: boardData[currBoardId].radarData.rot
			}
		},
		tempSensor: (value) =>{
			console.log('tempSensor ', value);
			boardData[currBoardId].tempData = {
				temp: roundTo(getFieldIfExists(value,'temp'), 2),
				press: roundTo(getFieldIfExists(value,'press'), 1),
				hum: roundTo(getFieldIfExists(value,'hum'), 2),
				gas: roundTo(getFieldIfExists(value,'gas'), 1),
			}
			let sensorDataElement = document.querySelector(`#sensorData-${currBoardId}`);
			sensorDataElement.querySelector('.temp').innerText = `${boardData[currBoardId].tempData.temp} °C`;
			sensorDataElement.querySelector('.press').innerText = `${boardData[currBoardId].tempData.press} Pa`;
			sensorDataElement.querySelector('.hum').innerText = `${boardData[currBoardId].tempData.hum} %`;
			sensorDataElement.querySelector('.gas').innerText = `${boardData[currBoardId].tempData.gas}`;
		},
		luxSensor: (value) =>{
			console.log('luxSensor ', value);
			boardData[currBoardId].luxData = {
				visible: roundTo(getFieldIfExists(value,'visible'), 4),
				infrared: roundTo(getFieldIfExists(value,'infrared'), 4),
				total: roundTo(getFieldIfExists(value,'total'), 4)
			}
			let sensorDataElement = document.querySelector(`#sensorData-${currBoardId}`);
			sensorDataElement.querySelector('.visible').innerText = `${boardData[currBoardId].luxData.visible} Lux`;
			sensorDataElement.querySelector('.infrared').innerText = `${boardData[currBoardId].luxData.infrared} Lux`;
			sensorDataElement.querySelector('.total').innerText = `${boardData[currBoardId].luxData.total} Lux`;
		}
	},
	state: {
		fw: (value) => {
				console.log('Setting fw to', value);
				boardData[currBoardId].fw = value;
				let timestampElement = document.querySelector(`#timestamp-${currBoardId}`);
				timestampElement.innerText = boardData[currBoardId].timestamp + " - FW version: " + boardData[currBoardId].fw;
			},
		polltime: (value) => {
				console.log('Setting pollTime to', value);
				setElem(currBoardId, "poll1", millisToTimeString(value), '.poll1');
			},
		servel: (value) => {
				console.log('Setting servel to', value);
				setElem(currBoardId, "servel", value, '.servel');
			},
		radarmode: (value) => {
			console.log('Setting radarMode to', value)
			value = "Inverti " + value;
			setElem(currBoardId, "radarmode", value);
		},
		radareboot: () => {
			console.log('Rebooting radar');
			setElem(currBoardId, "radareboot", "Invia");
		},
		radarstate: (value) => {
			console.log('radarstate');
			value = "Inverti " + value;
			setElem(currBoardId, "radarstate", value);
		},
	},
	timestamp: (val) => {
		boardData[currBoardId].timestamp = convertDateTimeToHumanReadable(val);
		let timestampElement = document.querySelector(`#timestamp-${currBoardId}`);
		timestampElement.innerText = boardData[currBoardId].timestamp + " - FW version: " + boardData[currBoardId].fw;
	},
	boardID: (val) => {
		console.log('boardID');
		let elem = document.getElementById(`sensorData-${currBoardId}`);
		let inputelem = elem.querySelector('.boardID');
		inputelem.innerHTML = val;
	},
};
```

Sitografia:
- chatGPT per parser con mappa di funzioni.

> [Ritorna alla pagina principale](README.md)
