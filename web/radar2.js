
var boardData = [];
var fw = "";
var currBoardId;

// List of MQTT brokers to connect to
const brokerUrls = [
    broker1,
    broker2
];

let currentBrokerIndex = 0;
var client = null;

// Function to connect to MQTT broker
function connectToBroker() {
	console.log(currentBrokerIndex);
    const brokerUrl = brokerUrls[currentBrokerIndex];
	
	try{
		client = mqtt.connect(brokerUrl);

		client.on('connect', () => {
		   console.log(`Connected to MQTT broker: ${brokerUrl}`);
		   // Subscribe to topics, publish messages, etc.
		   client.subscribe(pushtopic);
		   client.subscribe(statetopic);
		});

		client.on('offline', (err) => {
			console.error(`Error with MQTT broker ${brokerUrl}`);
			// Handle error, optionally switch to the next broker
			switchToNextBroker();
		});
		
		
		client.on('error', (error) => {
			console.error('Errore di connessione MQTT:', error);
			//switchToNextBroker();
		});
		
		client.on('close', () => {
			console.log('Connessione MQTT chiusa');
			switchToNextBroker();
		});
		
		client.on('message', (topic, message) => {
			let data = JSON.parse(message.toString());
			let boardID = data.boardID;
			let r;
			
			console.log('Topic:', topic);
			console.log('Pushtopic:', pushtopic);
			console.log('Statetopic:', statetopic);
			
			if( topic === pushtopic){
				// Verifica se esiste già un elemento per questo boardID
				if (!boardData[boardID]) {
					// Se non esiste, crea una nuova sezione HTML per questo boardID
					createBoardSection(boardID);
					createCanvasInstances(boardID); // Crea il canvas per questo boardID
					setInputListeners(boardID);
				}
			   
				// Aggiorna i dati per questo boardID (vengono letti dalla funzione draw delle canvas)
				if (!boardData[boardID])
					r = 0
				else
					r = boardData[boardID].radarData.rot
				
				boardData[boardID] = {
					radarData: {
						x: roundArrTo(data.radar.x, 2, 1000),
						y: roundArrTo(data.radar.y, 2, 1000),
						vel: roundArrTo(data.radar.vel, 2),
						distres: roundArrTo(data.radar.distres, 2),
						rot: r
					},
					tempData: {
						temp: roundTo(data.tempSensor.temp, 2),
						press: data.tempSensor.press,
						hum: roundTo(data.tempSensor.hum, 2),
						gas: data.tempSensor.gas
					},
					luxData: {
						visible: roundTo(data.luxSensor.visible, 4),
						infrared: roundTo(data.luxSensor.infrared, 4),
						total: roundTo(data.luxSensor.total, 4)
					},
					timestamp: data.timestamp
				};

				// Aggiorna l'interfaccia utente con le misure (sono periodiche e tutte)
				updateBoardUI(boardID);
			}else if(topic === statetopic){	
				currBoardId = boardID;
				console.log('Msg:', data);
				processJson(commandMap, data);	// Aggiorna l'interfaccia utente con gli stati (sono asincroni e singoli)	
			}
		});
	}catch(e){
		console.log('Error try:', e.message);
	}	
}

// Function to switch to the next MQTT broker
function switchToNextBroker() {
    // Disconnect from the current broker
    if (client) {
        client.end();
        client = null;
    }

    // Move to the next broker in the list
    currentBrokerIndex = (currentBrokerIndex + 1) % brokerUrls.length;

    // Attempt to connect to the next broker
    connectToBroker();
}

// Initial connection attempt
connectToBroker();

// Mappa delle funzioni da eseguire su un certo path dei comandi ricevuti (stati)
// devono coincidere con i path corrispondenti dell'oggetto JSON in trasmissione
// sono tutti comandi di aggiornamento stato e quindi richiamano solo funzioni con parametri (no liste di funzioni senza parametri)
// è utilizzata per il parsing dei comandi singoli
const commandMap = {
			radar: {
				fw: (value) => {
						console.log('Setting fw to', value);
						fw = value;
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
			timestamp: () => {
				console.log('Rebooting radar');
				
			},
			boardID: (val) => {
				console.log('boardID');
				let elem = document.getElementById(`sensorData-${currBoardId}`);
				let inputelem = elem.querySelector('.boardID');
				inputelem.innerHTML = val;
			},
		};		

// Funzione per pubblicare via MQTT un comando asincrono con parametro
function pubAtt(att, val, bId, type) {// type: write, read
	//const timestamp = getTimestamp();
	const message = JSON.stringify({
		boardID: bId,
		configs: {
			[type]: {// comandi con parametri
				[att]: val, // coppia nome_comando, parametro_comando
			}
		},
	});
	client.publish(cmdtopic, message, (error) => {
		if (error) {
			console.error('Errore nella pubblicazione:', error);
		} else {
			console.log('Messaggio pubblicato:', message);
		}
	});
}

// Funzione per pubblicare via MQTT un comando asincrono di lettura (senza parametri)
function pubReadAtt(bId, att) {// type: write, read
	//const timestamp = getTimestamp();
	const message = JSON.stringify({
		boardID: bId,
		configs: {
			read:[att],// lista comandi di lettura senza parametri
			}
	});
	client.publish(cmdtopic, message, (error) => {
		if (error) {
			console.error('Errore nella pubblicazione:', error);
		} else {
			console.log('Messaggio pubblicato:', message);
		}
	});
}

// Funzione per arrotondare ciascun valore a un numero specificato di cifre decimali
function roundArrTo(array, decimals, div=1) {
    const factor = Math.pow(10, decimals);
    return array.map(val => Math.round(val * factor/div) / factor);
}

function roundTo(val, decimals) {
    const factor = Math.pow(10, decimals);
    return Math.round(val * factor) / factor;
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Individua i campi di valore degli oggetti modificati da un comando
// riporta il valore effettivamente impostato sul dispositivo
function setElem(boardID, type, val, target='.send'){
	console.log('boardID', boardID);
	console.log('type', type);
	console.log('val', val);
	console.log('str', `${type}-${boardID}`);
	let elem = document.getElementById(`${type}-${boardID}`);
	elem.style.backgroundColor = "#ffffff";
	let inputelem = elem.querySelector(target);
		inputelem.value = val;
}

// Parser dei dati JSON ricevuti (stati asincroni) ricorsivo
// Restituisce il path del command map da eseguire e lo richiama
function processJson(commandMap, jsonObj, basePath = []) {
    for (const key in jsonObj) {
        if (jsonObj.hasOwnProperty(key)) {
            const value = jsonObj[key];
            const currentPath = [...basePath, key];
            if (typeof value === 'object' && !Array.isArray(value)) {
				console.log('currentPath:', currentPath);
				console.log('value:', value);
                processJson(commandMap, value, currentPath);
            } else if (Array.isArray(value)) {// se è una lista di funzioni senza parametri
                for (const item of value) {
                    executeCommand(commandMap, [...currentPath, item]);
                }
            } else {// se è il campo chiave (nome della funzione) - valore (funzione con parametro)
                executeCommand(commandMap, currentPath, value);  
            }
        }
    }
}

// Funzione che richiama il path di comando generato dal parser dei comandi JSON
function executeCommand(commandMap, commandPath, parameters = null) {
    let currentLevel = commandMap;
    for (const key of commandPath) {
        if (currentLevel[key]) {
            currentLevel = currentLevel[key];
        } else {
            console.error(`Unknown command: ${commandPath.join('/')}`);
            return;
        }
    }

    if (typeof currentLevel === 'function') {
        if (parameters !== null) {
            currentLevel(parameters);
        } else {
            currentLevel();
        }
    } else {
        console.error(`Final command is not a function: ${commandPath.join('/')}`);
    }
}

function millisToTimeString(millis) {
    let hours = Math.floor(millis / (1000 * 60 * 60));
    let minutes = Math.floor((millis % (1000 * 60 * 60)) / (1000 * 60));
    let seconds = Math.floor((millis % (1000 * 60)) / 1000);

    // Aggiungi uno zero davanti ai numeri minori di 10
    hours = hours < 10 ? '0' + hours : hours;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    seconds = seconds < 10 ? '0' + seconds : seconds;

    return `${hours}:${minutes}:${seconds}`;
}

// Disegna la griglia tachimetrica
function drawGrid(sketch) {
    sketch.stroke(100);
    sketch.strokeWeight(0.5);

    // Linee verticali
    for (let x = -sketch.width * 0.3 * 2; x <= sketch.width * 0.3 * 2; x += sketch.width * 0.05) {
        sketch.line(x, -sketch.height, x, 0);
    }

    // Linee orizzontali
    for (let y = 0; y >= -sketch.height; y -= sketch.height * 0.05) {
        sketch.line(-sketch.width * 0.3 * 2, y, sketch.width * 0.3 * 2, y);
    }
}

// Disegna i cerchi tachimetrici
function drawDistanceCircles(sketch, bid) {
    const maxDistance = 6; // La distanza massima del radar
    const numCircles = 5; // Numero di cerchi da disegnare
	
	let radarData = boardData[bid].radarData;

    for (let i = 1; i <= numCircles; i++) {
        let radius = sketch.map(i, 0, numCircles, 0, sketch.width / 2);
		if(!radarData.rot){
			sketch.ellipse(0, 0, radius * 2, radius * 2);
		}else{
			sketch.ellipse(0, -sketch.height, radius * 2, radius * 2);
		}
        
        // Etichette di distanza
        sketch.textSize(12);
        sketch.textAlign(sketch.CENTER);
        let rounded = Math.round((maxDistance / numCircles) * i * 10) / 10;
        sketch.text(`${rounded} m`, radius, -5 + radarData.rot*(20 - sketch.height));
    }
}

// Crea il cruscotto di misure e comandi
function createBoardSection(boardID) {
    let gridContainer = document.querySelector('.grid-container');

	let timestamp = document.createElement('div');
	timestamp.setAttribute("id", `timestamp-${boardID}`);
	timestamp.setAttribute("class", 'col-12 col-s-12');
	let radar = document.createElement('div');
	radar.setAttribute("id", `radar-${boardID}`);
	radar.setAttribute("class", "col-9 col-s-12 boxed");
	let sensorData = document.createElement('div');
    sensorData.setAttribute("id", `sensorData-${boardID}`);
	sensorData.setAttribute("class", "col-3 col-s-12 boxed");
	sensorData.innerHTML = `<p>Board ID: <span class="boardID">${boardID}</span></p>
            <p>Temperatura: <span class="temp">N/A</span></p>
            <p>Pressione: <span class="press">N/A</span></p>
            <p>Umidità: <span class="hum">N/A</span></p>
            <p>Gas: <span class="gas">N/A</span></p>
            <p>Luce visibile: <span class="visible">N/A</span></p>
            <p>Luce infrarossa: <span class="infrared">N/A</span></p>
            <p>Luce totale: <span class="total">N/A</span></p>`;	
	
	let poll1 = document.createElement('div');
	poll1.setAttribute("id", `poll1-${boardID}`);
	poll1.setAttribute("class", 'col-2 col-s-12');
	poll1.innerHTML = `<div class="txt"><p >Polling time</p></div><div class="button-container">
			<input class="poll1 button-large" type="time" step="1" /><input class="send button-small button-blue" type="button" value="Invia"/></div>`;
	let servel = document.createElement('div');
	servel.setAttribute("id", `servel-${boardID}`);
	servel.setAttribute("class", 'col-2 col-s-12');
	servel.innerHTML = `<div class="txt"><p >Radar serial</p></div><div class="button-container">
			<select name="vels" class="servel button-large">
				<option value="9600">9600</option>
				<option value="19200">19200</option>
				<option value="38400">38400</option>
				<option value="57600">57600</option>
				<option value="115200">115200</option>
				<option value="230400">230400</option>
				<option value="256000">256000</option>
				<option value="460800">460800</option>
			</select><input class="send button-small button-blue" type="button" value="Invia"/></div>`;
	let radarmode = document.createElement('div');
	radarmode.setAttribute("id", `radarmode-${boardID}`);
	radarmode.setAttribute("class", 'col-2 col-s-12');
	radarmode.innerHTML = `<div class="txt"><p >Radar mode</p></div><input type="button" class="send button-blue">`;
	let radareboot = document.createElement('div');
	radareboot.setAttribute("id", `radareboot-${boardID}`);
	radareboot.setAttribute("class", 'col-2 col-s-12');
	radareboot.innerHTML = `<div class="txt"><p >Radar reboot</p></div><input type="button" class="send button-blue" value="Invia">`;
	let radarstate = document.createElement('div');
	radarstate.setAttribute("id", `radarstate-${boardID}`);
	radarstate.setAttribute("class", 'col-2 col-s-12');
	radarstate.innerHTML = `<div class="txt"><p >Radar state</p></div><input type="button" class="send button-blue" value="Invia">`;
	let radarinvert = document.createElement('div');
	radarinvert.setAttribute("id", `radarinvert-${boardID}`);
	radarinvert.setAttribute("class", 'col-2 col-s-12');
	radarinvert.innerHTML = `<div class="txt"><p >Inverti griglia</p><input type="button" class="send button-blue" value="Invia">`;
	
	const tmpl2 = document.createElement("template");
	tmpl2.innerHTML = `<div class='col-12 col-s-12' id='txt-nulla' class='footer'><h2 class="footer">Monitoraggio radar</h2></div>`
			
    gridContainer.appendChild(timestamp);
	gridContainer.appendChild(radar);
	gridContainer.appendChild(sensorData);
	gridContainer.appendChild(poll1);
	gridContainer.appendChild(servel);
	gridContainer.appendChild(radarmode);
	gridContainer.appendChild(radareboot);
	gridContainer.appendChild(radarstate);
	gridContainer.appendChild(radarinvert);
	var footer = tmpl2.content.cloneNode(true);
	gridContainer.appendChild(footer);
	
	pubReadAtt(boardID, "allState");
}

// Associa i listener dei comandi agli elementi di input
function setInputListeners(boardID) {
    let poll1 = document.getElementById(`poll1-${boardID}`);// Trova l'id del contenitore grid degli input
	let poll1send = poll1.querySelector('.send');// Trova la classe dell'oggetto di input che riceve l'evento utente
	let poll1val = poll1.querySelector('.poll1');// Trova la classe dell'oggetto di input da leggere ogni evento utente
	poll1send.onclick = () => {
		const timeValue = poll1val.value;
		console.log('timeValue:', timeValue);
		// Dividi il valore in ore, minuti e secondi
		const [hours, minutes, seconds] = timeValue.split(':').map(Number);
		// Calcola i millisecondi
		const milliseconds = ((hours * 3600) + (minutes * 60) + seconds) * 1000;
		pubAtt("polltime", milliseconds, boardID, "write");
		poll1.style.backgroundColor = "#E67E22";
	}
	
	let servel = document.getElementById(`servel-${boardID}`);// Trova l'id del contenitore grid degli input
	let servelsend = servel.querySelector('.send');// Trova la classe dell'oggetto di input che riceve l'evento utente
	let servelval = servel.querySelector('.servel');// Trova la classe dell'oggetto di input da leggere ogni evento utente
	servelsend.onclick = () => {
		const serValue = servelval.value;	
		console.log('serValue', serValue);
		pubAtt("servel", serValue, boardID, "write");
		servel.style.backgroundColor = "#E67E22";
	}
	
	let radarmode = document.getElementById(`radarmode-${boardID}`);// Trova l'id del contenitore grid degli input
	let radarmodesend = radarmode.querySelector('.send');// Trova la classe dell'oggetto di input che riceve l'evento utente
	radarmodesend.onclick = () => {
		let mode = radarmodesend.value;	
		let val = "singolo";
		
		console.log('mode', mode);
		
		//const [prima, dopo] = mode.split(' ');
		
		if (mode === "Inverti singolo"){
			val  = "multi";
		}else if (mode === "Inverti multi"){
			val = "singolo";
		}	
		pubAtt("radarmode", val, boardID, "write");
		radarmode.style.backgroundColor = "#E67E22";
	}
	
	let radareboot = document.getElementById(`radareboot-${boardID}`);// Trova l'id del contenitore grid degli input
	let radarebootsend = radareboot.querySelector('.send');// Trova la classe dell'oggetto di input che riceve l'evento utente
	radarebootsend.onclick = () => {
		pubAtt("radareboot", "1", boardID, "write");
		radareboot.style.backgroundColor = "#E67E22";
	}
	
	let radarstate = document.getElementById(`radarstate-${boardID}`);// Trova l'id del contenitore grid degli input
	let radarstatesend = radarstate.querySelector('.send');// Trova la classe dell'oggetto di input che riceve l'evento utente
	radarstatesend.onclick = () => {
		pubAtt("radartoggle", "1", boardID, "write");
		radarstate.style.backgroundColor = "#E67E22";
	}
	
	let radarinvert = document.getElementById(`radarinvert-${boardID}`);// Trova l'id del contenitore grid degli input
	let radarinvertsend = radarinvert.querySelector('.send');// Trova la classe dell'oggetto di input che riceve l'evento utente
	radarinvertsend.onclick = () => {
		if(boardData[boardID].radarData.rot == 0){
			boardData[boardID].radarData.rot = 1;
			radarinvertsend.value = "Griglia ruotata";
		}else{
			boardData[boardID].radarData.rot = 0;
			radarinvertsend.value = "Griglia non ruotata";
		}
	}
}

// Aggiornamento massivo degli output misure
// è utilizzata per l'aggiornamento massivo di tutte le misure 
function updateBoardUI(boardID) {
   
    let timestampElement = document.querySelector(`#timestamp-${boardID}`);
    timestampElement.innerText = convertDateTimeToHumanReadable(boardData[boardID].timestamp) + "   -   FW version: " + fw;

    let sensorDataElement = document.querySelector(`#sensorData-${boardID}`);
    sensorDataElement.querySelector('.temp').innerText = `${boardData[boardID].tempData.temp} °C`;
    sensorDataElement.querySelector('.press').innerText = `${boardData[boardID].tempData.press} Pa`;
    sensorDataElement.querySelector('.hum').innerText = `${boardData[boardID].tempData.hum} %`;
    sensorDataElement.querySelector('.gas').innerText = `${boardData[boardID].tempData.gas}`;
    sensorDataElement.querySelector('.visible').innerText = `${boardData[boardID].luxData.visible} Lux`;
    sensorDataElement.querySelector('.infrared').innerText = `${boardData[boardID].luxData.infrared} Lux`;
    sensorDataElement.querySelector('.total').innerText = `${boardData[boardID].luxData.total} Lux`;

    // Aggiorna il radar (sezione 3D) se necessario
}

// Creazione funzione di setup e loop di disegno di ogni canvas
function createCanvasInstances(boardID) {
    new p5(function(sketch) {
        let canvas;
        sketch.setup = function() {
            let container = document.getElementById(`radar-${boardID}`);
            let width = container.offsetWidth * 0.988;
            let height = width * 1.1 / 2;

            let canvas = sketch.createCanvas(width, height).parent(container);
        };
    
        sketch.draw = function() {
            sketch.background(0);
            sketch.translate(sketch.width / 2, sketch.height); // Sposta l'origine in basso al centro
            drawGrid(sketch);
            sketch.stroke(255);
            sketch.noFill();
            drawDistanceCircles(sketch, boardID);

            let radarData = boardData[boardID].radarData;
            for (let i = 0; i < radarData.x.length; i++) {
                let x = radarData.x[i];
                let y = radarData.y[i];
                let vel = radarData.vel[i];
                let distres = radarData.distres[i];
				let scaledX = 0;
				let scaledY = 0;

				if(radarData.rot){
					// Scala i valori per adattarli allo schermo
					scaledX = sketch.map(x, 6, -6, -sketch.width * 0.3, sketch.width * 0.3);
					scaledY = sketch.map(y, 6, 0, 0, -sketch.height);
				}else{
					scaledX = sketch.map(x, -6, 6, -sketch.width * 0.3, sketch.width * 0.3);
					scaledY = sketch.map(y, 0, 6, 0, -sketch.height);
				}

                sketch.fill(0, 255, 0);
                sketch.noStroke();
                sketch.ellipse(scaledX, scaledY, 10, 10);

                sketch.fill(255);
                sketch.textSize(12);
                sketch.text(`X: ${x}`, scaledX + 5, scaledY - 20+radarData.rot*20);
				sketch.text(`Y: ${y}`, scaledX + 5, scaledY - 10+radarData.rot*20);
				sketch.text(`V: ${vel}`, scaledX + 5, scaledY+radarData.rot*20);
				sketch.text(`D: ${distres}`, scaledX + 5, scaledY + 10+radarData.rot*20);
            }
        };
        
        function resizeCanvasToDiv() {
            let container = document.getElementById(`radar-${boardID}`);
            let width = container.offsetWidth * 0.988;
            let height = width * 1.1 / 2;

            sketch.resizeCanvas(width, height);
        }
        
        sketch.windowResized = resizeCanvasToDiv;
        
    }, `radar-${boardID}`);
}

function convertDateTimeToHumanReadable(dateTimeString) {
    const adjustedDateTime = adjustDateTime(dateTimeString);
    
    // Creazione di un oggetto Data da una stringa
    const dateTime = new Date(adjustedDateTime);

    // Ottenere componenti data e ora
    const year = dateTime.getFullYear();
    const month = padZero(dateTime.getMonth() + 1); // I mesi partono da 0 (gennaio)
    const day = padZero(dateTime.getDate());
    const hours = padZero(dateTime.getHours());
    const minutes = padZero(dateTime.getMinutes());
    const seconds = padZero(dateTime.getSeconds());

    // Creazione di una stringa comprensibile per l'utente
    const readableDateTime = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;

    return readableDateTime;
}

// Funzione per aggiungere lo zero davanti alle cifre singole
function padZero(num) {
    return num.toString().padStart(2, '0');
}

function adjustDateTime(dateTimeString) {
    // Creazione di un oggetto Date dalla stringa fornita
    const dateTime = new Date(dateTimeString);

    // Fuso orario per l'Italia
    const userTimeZone = 'Europe/Rome'; // 'Europe/Rome' è il fuso orario dell'Italia

    // Calcolo dell'offset in millisecondi rispetto a UTC
    const offset = dateTime.getTimezoneOffset() * 60 * 1000;

    // Creazione di un nuovo oggetto Date con l'offset aggiunto per ottenere la data/ora corretta per il fuso orario specificato
    const adjustedDate = new Date(dateTime.getTime() - offset);

    return adjustedDate;
}