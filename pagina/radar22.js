// URL del broker MQTT e topic MQTT
//const broker = 'wss://proxy.marconicloud.it:8884'; // Sostituisci con l'URL del tuo broker MQTT
//const topic = 'radar/misure'; // Sostituisci con il tuo topic MQTT

var boardData = []; // data structure where the measurements sent by the device via MQTT (PUSH mode) are stored
var currBoardId;

// List of MQTT brokers to connect to
// the main broker is the preferred broker
// The backup broker is choosen only when the main broker is unavailable
// If the backup broker is active, the main broker is periodically tested and
// selected if again avalilable
// The same behaviour is applied by the IoT device
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
					 boardData[boardID] = {
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
						fw: "N/A",
					};
		
					// Se non esiste, crea una nuova sezione HTML per questo boardID
					createBoardSection(boardID);
					createCanvasInstances(boardID); // Crea il canvas per questo boardID
					setInputListeners(boardID);
				}
			    
				try{
					// Update the data structure for this boardId. 
					// Radar measurements are read periodically by the canvas draw() function 
					// The sensor data are immediately printed on the output boxes by the updateBoardUI() function.
					
					val = data.measures.radar
					if ('null' != val){
						boardData[boardID].radarData = {
							x: roundArrTo(getFieldIfExists(val,'x'), 2, 1000),
							y: roundArrTo(getFieldIfExists(val,'y'), 2, 1000),
							vel: roundArrTo(getFieldIfExists(val,'vel'), 2),
							distres: roundArrTo(getFieldIfExists(val,'distres'), 2),
							rot: boardData[boardID].radarData.rot
						};
					}
					val = data.measures.tempSensor
					if ('null' != val){
						boardData[boardID].tempData = {
							temp: roundTo(getFieldIfExists(val,'temp'), 2),
							press: roundTo(getFieldIfExists(val,'press'), 1),
							hum: roundTo(getFieldIfExists(val,'hum'), 2),
							gas: roundTo(getFieldIfExists(val,'gas'), 1),
						};
					}
					val = data.measures.luxSensor
					if ('null' != val){
						boardData[boardID].luxData = {
							visible: roundTo(getFieldIfExists(val,'visible'), 4),
							infrared: roundTo(getFieldIfExists(val,'infrared'), 4),
							total: roundTo(getFieldIfExists(val,'total'), 4)
						};
					}
					boardData.timestamp =  data.timestamp;
				}catch(e){
					console.log('Error parsing:', e.message);
				}	
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

function getFieldIfExists(obj, field) {
    if (obj && obj.hasOwnProperty(field)) {
        return obj[field];
    }
    return null;
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
			state: {
				fw: (value) => {
						console.log('Setting fw to', value);
						boardData[boardID].fw = value;
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

// Sends, via a JSON, the command to perform configuration settings on the IoT device in a PUSH mode.
// These are commands with parameters that call functions with arguments.
function pubAtt(att, val, bId, type) {// type: write, read
	//const timestamp = getTimestamp();
	const message = JSON.stringify({
		boardID: bId,
		config: {
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

// Sends, via a JSON, the command to execute the request, in a PULL mode, for status information on the IoT device.
// These are commands without parameters that call functions without arguments encoded in the JSON as a list of names in an array.
function pubReadAtt(bId, att) {// type: write, read
	//const timestamp = getTimestamp();
	const message = JSON.stringify({
		boardID: bId,
		config: {
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
	if (array != null){
		const factor = Math.pow(10, decimals);
		return array.map(val => Math.round(val * factor/div) / factor);
	}else{
		return null;
	}
}

function roundTo(val, decimals) {
	if (val != null){
		const factor = Math.pow(10, decimals);
		return Math.round(val * factor) / factor;
	}else{
		return 0;
	}
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Identifies, in the web interface, the value fields of the objects modified by a command.
// Reports the value actually set on the device obtained from the feedback channel via MQTT
function setElem(boardID, type, val, target='.send'){
	console.log('boardID', boardID);
	console.log('type', type);
	console.log('val', val);
	console.log('str', `${type}-${boardID}`);
	let elem = document.getElementById(`${type}-${boardID}`);
	elem.style.backgroundColor = "#ffffff"; // resets the wait signal for command feedback
	let inputelem = elem.querySelector(target);
		inputelem.value = val;
}

// Recursive parser of JSON data received asynchronously (representing the state of the device) 
// Returns the path of the command in the received JSON data structure. 
// The path must correspond to the path of the function to be called in the data structure of the command map. 
// Invokes the function which, in the command map, has its pointer on that path.
function processJson(commandMap, jsonObj, basePath = [], measures = []) {
	let measure = false;
	if(measures.includes(basePath[basePath.length-1])){
		measure = true;
	}

    for (const key in jsonObj) {
        if (jsonObj.hasOwnProperty(key)) {
            const value = jsonObj[key];
            const currentPath = [...basePath, key];
            if (typeof value === 'object' && !Array.isArray(value) && !measure) {
				processJson(commandMap, value, currentPath, measures);          
            } else if (Array.isArray(value)) {// if it is a list of functions without parameters
                for (const item of value) {
                    executeCommand(commandMap, [...currentPath, item]);
                }
            } else {// if it is a primitive value, the field (key, value) corresponding to the pair (function name, list of function parameters)
                executeCommand(commandMap, currentPath, value); // value is a primitive value 
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

// Create the dashboard of measurements and commands
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
	
	pubReadAtt(boardID, "allstate");
}

// Bind command listeners to input elements 
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
		poll1.style.backgroundColor = "#E67E22"; // activate the wait signal for command feedback
	}
	
	let servel = document.getElementById(`servel-${boardID}`);// Trova l'id del contenitore grid degli input
	let servelsend = servel.querySelector('.send');// Trova la classe dell'oggetto di input che riceve l'evento utente
	let servelval = servel.querySelector('.servel');// Trova la classe dell'oggetto di input da leggere ogni evento utente
	servelsend.onclick = () => {
		const serValue = servelval.value;	
		console.log('serValue', serValue);
		pubAtt("servel", serValue, boardID, "write");
		servel.style.backgroundColor = "#E67E22"; // activate the wait signal for command feedback
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
		radarmode.style.backgroundColor = "#E67E22"; // activate the wait signal for command feedback
	}
	
	let radareboot = document.getElementById(`radareboot-${boardID}`);// Trova l'id del contenitore grid degli input
	let radarebootsend = radareboot.querySelector('.send');// Trova la classe dell'oggetto di input che riceve l'evento utente
	radarebootsend.onclick = () => {
		pubAtt("radareboot", "1", boardID, "write");
		radareboot.style.backgroundColor = "#E67E22"; // activate the wait signal for command feedback
	}
	
	let radarstate = document.getElementById(`radarstate-${boardID}`);// Trova l'id del contenitore grid degli input
	let radarstatesend = radarstate.querySelector('.send');// Trova la classe dell'oggetto di input che riceve l'evento utente
	radarstatesend.onclick = () => {
		pubAtt("radartoggle", "1", boardID, "write");
		radarstate.style.backgroundColor = "#E67E22"; // activate the wait signal for command feedback
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

// Massive update of measurement outputs
// is used for the massive update of all measurements
function updateBoardUI(boardID) {
   
    let timestampElement = document.querySelector(`#timestamp-${boardID}`);
    timestampElement.innerText = convertDateTimeToHumanReadable(boardData[boardID].timestamp) + "   -   FW version: " + boardData[boardID].timestamp.fw;

    let sensorDataElement = document.querySelector(`#sensorData-${boardID}`);
    sensorDataElement.querySelector('.temp').innerText = `${boardData[boardID].tempData.temp} °C`;
    sensorDataElement.querySelector('.press').innerText = `${boardData[boardID].tempData.press} Pa`;
    sensorDataElement.querySelector('.hum').innerText = `${boardData[boardID].tempData.hum} %`;
    sensorDataElement.querySelector('.gas').innerText = `${boardData[boardID].tempData.gas}`;
    sensorDataElement.querySelector('.visible').innerText = `${boardData[boardID].luxData.visible} Lux`;
    sensorDataElement.querySelector('.infrared').innerText = `${boardData[boardID].luxData.infrared} Lux`;
    sensorDataElement.querySelector('.total').innerText = `${boardData[boardID].luxData.total} Lux`;
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
			if(radarData && radarData.x){
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