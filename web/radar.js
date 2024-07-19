
//const myboard = 'micropython-weather-01seba0264e833638ff4'
//const broker = 'wss://proxy.marconicloud.it:8884'; // Sostituisci con l'URL del tuo broker MQTT e assicurati che utilizzi wss (WebSocket Secure) se necessario
//const topic = 'radar/misure'; // Sostituisci con il tuo topic MQTT

// data structure where the measurements sent by the device via MQTT (PUSH mode) are stored
var boardData = {
				radarData: {
					x: [0, 0, 0],
					y: [0, 0, 0],
					vel: [0, 0, 0],
					distres: [0, 0, 0],
					rot: 0,
				},
				tempData: {
					temp: "N/A",
					press: "N/A",
					hum: "N/A",
					gas: "N/A",
				},
				luxData: {
					visible: "N/A",
					infrared: "N/A",
					total: "N/A",
				},
				timestamp: "N/A",
			};
			
var fw = "";


// Map of the functions to be executed on a certain path of the received commands (statuses).
// They must coincide with the corresponding paths of the JSON object being transmitted.
// Read-only commands are parameterless and can be invoked in JSON as cells in a command list. For example, with JSON
// "radar": [polltime, servel] 
// but they must be stored as field-value pairs of an object because in JS associative arrays are encoded as objects.
// Write-only commands are parameterized and must be invoked in JSON as field, value pairs. For example, with JSON
// "radar": {
// 	"write":{
// 		polltime: 1
// 		servel: 115200
// 	},
// }
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

// List of MQTT brokers to connect to
// the main broker is the preferred broker
// The backup broker is choosen only when the main broker is unavailable
// If the backup broker is active, the main broker is periodically tested and
// selected if again avalilable
// The same behaviour is applied by the IoT device
const brokerUrls = [
    broker1, // main broker
    broker2 // backup broker
];

let currentBrokerIndex = 0;
let client = null;

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
		   pubReadAtt(boardId, "allState");
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
			//switchToNextBroker();
		});
		
		client.on('message', (topic, message) => {
			let data = JSON.parse(message.toString());
			let boardID = data.boardID;
			
			if(boardID == boardId){
			
				console.log('Topic:', topic);
				console.log('Pushtopic:', pushtopic);
				console.log('Statetopic:', statetopic);
				
				if( topic === pushtopic){		   
					// Update the data structure for this boardId. 
					// Radar measurements are read periodically by the canvas draw() function 
					// The sensor data are immediately printed on the output boxes by the updateBoardUI() function.
					boardData = {
						radarData: {
							x: roundArrTo(data.radar.x, 2, 1000),
							y: roundArrTo(data.radar.y, 2, 1000),
							vel: roundArrTo(data.radar.vel, 2),
							distres: roundArrTo(data.radar.distres, 2),
							rot: boardData.radarData.rot
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
					updateBoardUI();
				}else if(topic === statetopic){	
					console.log('Msg:', data);
					processJson(commandMap, data);	// Aggiorna l'interfaccia utente con gli stati (sono asincroni e singoli)	
				}
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
setInputListeners();

//window.onload = pubReadAtt(boardId, "allState");
		
// Function to publish a generic asynchronous command with parameter via MQTT
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

// Function to publish a read-only asynchronous command via MQTT (functions without parameters)
function pubReadAtt(bId, att) {// type: write, read
	//const timestamp = getTimestamp();
	const message = JSON.stringify({
		boardID: bId,
		configs: {
			read:[att],//list of read only commands without parameters
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

// Identifies, in the web interface, the value fields of the objects modified by a command.
// Reports the value actually set on the device obtained from the feedback channel via MQTT
function setElem(type, val, target='.send'){
	console.log('type', type);
	console.log('val', val);
	console.log('str', `${type}`);
	let elem = document.getElementById(`${type}`);
	elem.style.backgroundColor = "#ffffff"; // resets the wait signal for command feedback
	let inputelem = elem.querySelector(target);
	inputelem.value = val;
}

// Recursive parser of JSON data received asynchronously (representing the state of the device) 
// Returns the path of the command in the received JSON data structure. 
// The path must correspond to the path of the function to be called in the data structure of the command map. 
// Invokes the function which, in the command map, has its pointer on that path.
function processJson(commandMap, jsonObj, basePath = []) {
    for (const key in jsonObj) {
        if (jsonObj.hasOwnProperty(key)) {
            const value = jsonObj[key];
            const currentPath = [...basePath, key];
            if (typeof value === 'object' && !Array.isArray(value)) {
				console.log('currentPath:', currentPath);
				console.log('value:', value);
                processJson(commandMap, value, currentPath);
            } else if (Array.isArray(value)) {// if it is a list of functions without parameters
                for (const item of value) {
                    executeCommand(commandMap, [...currentPath, item]);
                }
            } else {// if it is the field (key, value) corresponding to the pair (function name, list of function parameters)
                executeCommand(commandMap, currentPath, value);  
            }
        }
    }
}

// Function that retrieves and invoke the function at the command path
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

// Bind command listeners to input elements
function setInputListeners() {
    let poll1div = document.getElementById('poll1');// Trova l'id del contenitore grid degli input
	let poll1send = poll1div.querySelector('.send');// Trova la classe dell'oggetto di input che riceve l'evento utente
	let poll1val = poll1div.querySelector('.poll1');// Trova la classe dell'oggetto di input da leggere ogni evento utente
	
	poll1send.onclick = () => {
		const timeValue = poll1val.value;
		console.log('timeValue:', timeValue);
		// Dividi il valore in ore, minuti e secondi
		const [hours, minutes, seconds] = timeValue.split(':').map(Number);
		// Calcola i millisecondi
		const milliseconds = ((hours * 3600) + (minutes * 60) + seconds) * 1000;
		pubAtt("polltime", milliseconds, boardId, "write");
		poll1div.style.backgroundColor = "#E67E22"; // activate the wait signal for command feedback
	}
	
	let servel = document.getElementById('servel');// Trova l'id del contenitore grid degli input
	let servelsend = servel.querySelector('.send');// Trova la classe dell'oggetto di input che riceve l'evento utente
	let servelval = servel.querySelector('.servel');// Trova la classe dell'oggetto di input da leggere ogni evento utente
	servelsend.onclick = () => {
		const serValue = servelval.value;	
		console.log('serValue', serValue);
		pubAtt("servel", serValue, boardId, "write");
		servel.style.backgroundColor = "#E67E22"; // activate the wait signal for command feedback
	}
	
	let radarmode = document.getElementById('radarmode');// Trova l'id del contenitore grid degli input
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
		pubAtt("radarmode", val, boardId, "write");
		radarmode.style.backgroundColor = "#E67E22"; // activate the wait signal for command feedback
	}
	
	let radareboot = document.getElementById('radareboot');// Trova l'id del contenitore grid degli input
	let radarebootsend = radareboot.querySelector('.send');// Trova la classe dell'oggetto di input che riceve l'evento utente
	radarebootsend.onclick = () => {
		pubAtt("radareboot", "1", boardId, "write");
		radareboot.style.backgroundColor = "#E67E22"; // activate the wait signal for command feedback
	}
	
	let radarstate = document.getElementById('radarstate');// Trova l'id del contenitore grid degli input
	let radarstatesend = radarstate.querySelector('.send');// Trova la classe dell'oggetto di input che riceve l'evento utente
	radarstatesend.onclick = () => {
		pubAtt("radartoggle", "1", boardId, "write");
		radarstate.style.backgroundColor = "#E67E22"; // activate the wait signal for command feedback
	}
	
	let radarinvert = document.getElementById('radarinvert');// Trova l'id del contenitore grid degli input
	let radarinvertsend = radarinvert.querySelector('.send');// Trova la classe dell'oggetto di input che riceve l'evento utente
	radarinvertsend.onclick = () => {
		if(boardData.radarData.rot == 0){
			boardData.radarData.rot = 1;
			radarinvertsend.value = "Griglia ruotata";
		}else{
			boardData.radarData.rot = 0;
			radarinvertsend.value = "Griglia non ruotata";
		}
	}
}

// Massive update of measurement outputs
// is used for the massive update of all measurements
function updateBoardUI() {
   
    let timestampElement = document.getElementById('timestamp');
    timestampElement.innerText = convertDateTimeToHumanReadable(boardData.timestamp) + "   -   FW version: " + fw;

    let sensorDataElement = document.getElementById('sensorData');
    sensorDataElement.querySelector('.temp').innerText = `${boardData.tempData.temp} °C`;
    sensorDataElement.querySelector('.press').innerText = `${boardData.tempData.press} Pa`;
    sensorDataElement.querySelector('.hum').innerText = `${boardData.tempData.hum} %`;
    sensorDataElement.querySelector('.gas').innerText = `${boardData.tempData.gas}`;
    sensorDataElement.querySelector('.visible').innerText = `${boardData.luxData.visible} Lux`;
    sensorDataElement.querySelector('.infrared').innerText = `${boardData.luxData.infrared} Lux`;
    sensorDataElement.querySelector('.total').innerText = `${boardData.luxData.total} Lux`;
}


function setup() {
    // Ottieni il div contenitore
    let container = document.getElementById('radar');
    // Ottieni la larghezza e l'altezza del div contenitore
    let width = container.offsetWidth*0.988;
    let height = width*1.1/2;
	
	console.log("width: "+width);
	console.log("height: "+height);

    // Crea il canvas con le dimensioni del div contenitore
    let canvas = createCanvas(width, height);
    canvas.parent('radar'); // Collega il canvas al div con id 'radar'
    window.addEventListener('resize', resizeCanvasToDiv);
}

function draw() {
    background(0);
    translate(width / 2, height); // Sposta l'origine in basso al centro
    drawGrid(); // Aggiungi questa funzione per disegnare la griglia
    stroke(255);
    noFill();
	drawDistanceCircles();
	let x = 0;
	let y = 0;
	let scaledX = 0;
	let scaledY = 0;
	
    for (let i = 0; i < boardData.radarData.x.length; i++) {
		x = Number(boardData.radarData.x[i]);
		y = Number(boardData.radarData.y[i]);
        
        let vel = boardData.radarData.vel[i];
        let distres = boardData.radarData.distres[i];
		
		if(boardData.radarData.rot){
			// Scala i valori per adattarli allo schermo
			scaledX = map(x, 6, -6, -width * 0.3, width * 0.3);
			scaledY = map(y, 6, 0, 0, -height);
		}else{
			scaledX = map(x, -6, 6, -width * 0.3, width * 0.3);
            scaledY = map(y, 0, 6, 0, -height);
		}
        // Disegna il punto
        fill(0, 255, 0);
        noStroke();        
		ellipse(scaledX, scaledY, 10, 10);
        // Etichette
        fill(255);
        textSize(12);
        text(`X: ${x}`, scaledX + 5, scaledY - 20+boardData.radarData.rot*20);
        text(`Y: ${y}`, scaledX + 5, scaledY - 10+boardData.radarData.rot*20);
        text(`V: ${vel}`, scaledX + 5, scaledY+boardData.radarData.rot*20);
        text(`D: ${distres}`, scaledX + 5, scaledY + 10+boardData.radarData.rot*20);
    }
}

function drawGrid() {
    stroke(100);
    strokeWeight(0.5);

    // Linee verticali
    for (let x = -width * 0.3*2; x <= width * 0.3*2; x += width * 0.05) {
        line(x, -height, x, 0);
    }

    // Linee orizzontali
    for (let y = 0; y >= -height; y -= height * 0.05) {
        line(-width * 0.3*2, y, width * 0.3*2, y);
    }
}

function drawDistanceCircles() {
    const maxDistance = 6; // La distanza massima del radar
    const numCircles = 5; // Numero di cerchi da disegnare

	
	for (let i = 1; i <= numCircles; i++) {
        let radius = map(i, 0, numCircles, 0, width / 2);
		if(!boardData.radarData.rot){
			ellipse(0, 0, radius * 2, radius * 2);
		}else{
			ellipse(0, -height, radius * 2, radius * 2);
		}
        
        // Etichette di distanza
        textSize(12);
        textAlign(CENTER);
        let rounded = Math.round((maxDistance / numCircles) * i * 10) / 10;
        text(`${rounded} m`, radius, -5 + boardData.radarData.rot*(20 - height));
    }
}

function resizeCanvasToDiv() {
    // Ottieni nuovamente le dimensioni del div contenitore
    let container = document.getElementById('radar');
     // Ottieni la larghezza e l'altezza del div contenitore
    let width = container.offsetWidth*0.988;
    let height = width*1.1/2;
	
	console.log("width: "+width);
	console.log("height: "+height);
    
    // Ridimensiona il canvas
    resizeCanvas(width, height);
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