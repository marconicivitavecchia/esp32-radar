// URL del broker MQTT e topic MQTT
//const broker = 'wss://proxy.marconicloud.it:8884'; // Sostituisci con l'URL del tuo broker MQTT
//const topic = 'radar/misure'; // Sostituisci con il tuo topic MQTT

var boardData = []; // data structure where the measurements sent by the device via MQTT (PUSH mode) are stored
var currBoardId;
var ms;
var mqttAttempts = 0;
const maxMqttAttempts = 2;
var backuptimer = null;

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

var currentBrokerIndex = 0;
var client = null;
let testPrimary = false;

// Funzione per generare un clientId casuale in JS
function generateClientId(prefix = 'client') {
    const randomId = Math.random().toString(16).substring(2, 10);  // Stringa casuale esadecimale
    return `${prefix}_${randomId}`;
}

// Function to connect to MQTT broker
function connectToBroker() {
	console.log(currentBrokerIndex);
    const brokerUrl = brokerUrls[currentBrokerIndex];
	
	try{
		const options = {
			clientId: "generateClientId(prefix = 'radar-')",  // Qui definisci il clientId
			//username: 'tuo_username',     // Se serve, specifica anche username e password
			//password: 'tua_password'
		};

		client = mqtt.connect(brokerUrl, options);

		client.on('connect', () => {
			console.log(`Connected to MQTT broker: ${brokerUrl}`);
			// Subscribe to topics, publish messages, etc.
			client.subscribe(pushtopic);
			client.subscribe(statetopic);
			alertUser("green");
			mqttAttempts = 0;
			//pubReadAtt(boardId, "allstate");
			if(currentBrokerIndex == 1){// mqtt di backup
				 console.log('Start backup conn timer:');
				 backuptimer = new MonostableTimer(60000, ()=>{
					 console.log('Timeout backup conn timer:');
					 testPrimary =true;
					 switchToNextBroker();
				 });
				 backuptimer.start();
			 }else{
				 //backuptimer.stop();
				 backuptimer = null;
			 }
		 });
 
		 client.on('offline', (err) => {
			 console.error(`Error with MQTT broker ${brokerUrl}`);
			 // Handle error, optionally switch to the next broker
			 alertUser("red");
			 //switchToNextBroker();
		 });
		 
		 client.on('error', (error) => {
			 console.error('Errore di connessione MQTT:', error);
			 //if (!client.connected) {
			 //	client.reconnect();
			 //}
			 //switchToNextBroker();
			 //alertUser("red");
		 });
		 
		 client.on('close', () => {
			 console.log('Connessione MQTT chiusa');
			 if(mqttAttempts > maxMqttAttempts){
				 alertUser("red");
			 }else{
				 alertUser("#FFA500");
			 }
			 if(testPrimary){
				 testPrimary = false;
			 }
			 switchToNextBroker();
		 });
		
		client.on('message', (topic, message) => {
			let data = JSON.parse(message.toString());
			let boardID = data.boardID;
			let r;
			
			console.log('Topic:', topic);
			console.log('Pushtopic:', pushtopic);
			console.log('Statetopic:', statetopic);
			alertUser("green");
			
			if( topic === pushtopic){
				// Verifica se esiste già un elemento per questo boardID
				if (!boardData[boardID]){	
					console.log('New boardID:', boardID);
					boardData[boardID] = {
						radarData: {
							x: [0, 0, 0, 0, 0],
							y: [0, 0, 0, 0, 0],
							rot: 0,
							fw: [0, 0],
							radarmode: 0,
							regions: {
								narea: [0, 0, 0],
								ntarget: [0, 0, 0],
								type: [0, 0, 0],
								x0: [0, 0, 0],
								y0: [0, 0, 0],
								x1: [0, 0, 0],
								y1: [0, 0, 0],
								color: [[255, 0, 0, 127], [0, 255, 0, 127], [0, 0, 255, 127]],
								enabled: [0, 0, 0],
								selected: 1,
								xnr0: [0, 0, 0],
								ynr0: [0, 0, 0],
								xnr1: [0, 0, 0],
								ynr1: [0, 0, 0],
								fw: [0, 0],
								dar : [null, null, null],
							}
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
						polltime: 0,
						timer: null,
					};
					// Se non esiste, crea una nuova sezione HTML per questo boardID
					createBoardSection(boardID);
					createCanvasInstances(boardID); // Crea il canvas per questo boardID
					setInputListeners(boardID);
					alertUserIot(boardID, "red");
					pubReadAtt(boardID, "allstate")
				}
			}else if(topic === statetopic){	
				console.log('Msg:', data);		
			}
			currBoardId = boardID;
			console.log('CURRENT BOARDID: ', currBoardId);
			//ms = ["measures"];
			ms = ["measures","tempSensor", "luxSensor", "radar", "state"];
			processJson(commandMap, data, [], ms);
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
	if(!testPrimary){
		// Disconnect from the current broker
		if (client) {
			client.end();
			client = null;
		}
	
		// Move to the next broker in the list
		currentBrokerIndex = (currentBrokerIndex + 1) % brokerUrls.length;
		mqttAttempts++;
	
		// Attempt to connect to the next broker
	}else{
		currentBrokerIndex = 0;
	}
	connectToBroker();
}

alertUser("#FFA500");
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
	measures: {
		radar: (value) =>{
			console.log('radar ', value);
			let rd = boardData[currBoardId].radarData;
			rd.x = roundArrTo(getFieldIfExists(value,'x'), 2);
			rd.y = roundArrTo(getFieldIfExists(value,'y'), 2);
			rd.regions.ntarget = value.n.map(Number);
			console.log('rd.x ', rd.x);
			console.log('rd.y ', rd.y);
			console.log('rd.regions.ntarget ', rd.regions.ntarget);
			alertUserIot(currBoardId, "green");
			if(boardData[currBoardId].timer){
				boardData[currBoardId].timer.start();
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
				timestampElement.innerText = boardData[currBoardId].timestamp + "   -   FW version: " + boardData[currBoardId].fw;
			},
		polltime: (value) => {
				console.log('Setting pollTime to', value);
				boardData[currBoardId].polltime = Number(value);
				if(!boardData[currBoardId].timer){
					boardData[currBoardId].timer = new MonostableTimer(boardData[currBoardId].polltime*2, ()=>{
						let iotmsg = document.getElementById(`iotmsg-${currBoardId}`);
						iotmsg.style.backgroundColor = "red";
						iotmsg.style.color = "white";
						iotmsg.value = "Iot OFF";
					});
				}
				setElem(currBoardId, "poll1", millisToTimeString(value), '.poll1');
			},
		servel: (value) => {
				console.log('Setting servel to', value);
				setElem(currBoardId, "servel", value, '.servel');
			},
		radarmode: (value) => {
			console.log('Setting radarMode to', value)
			setElem(currBoardId, "radarmode", value, '.sel');
		},
		radarfactory: () => {
			console.log('Restoring radar');
			setElem(currBoardId, "radarfactory", "Invia");
		},
		radarstate: (value) => {
			console.log('radarstate receive');
			setElem(currBoardId, "radarstate", value,'.rep');
		},
		regions: (value) => {
			console.log('regions receive ', value);
			console.log('currBoardId ', currBoardId);
			//console.log('currregion ', boardData[currBoardId].radarData);
			// update boardData region from state feedback
			let r = boardData[currBoardId].radarData.regions;
			r.x0 = value.x0.map(Number);
			r.y0 = value.y0.map(Number);
			r.x1 = value.x1.map(Number);
			r.y1 = value.y1.map(Number);
			r.narea = value.narea.map(Number);
			r.type = value.type.map(Number);
			r.enabled = value.enabled.map(Number);

			console.log('regions receive ENABLED', r.enabled);
			setElem(currBoardId, "areaenable", '', '');
			setElem(currBoardId, "areatypesel", '', '');
			setElem(currBoardId, "areavertices", '', '');
			setElem(currBoardId, "areasel", '', '');
			expandBoardDataRegion(currBoardId);
			updateInputsFromBoardDataRegion(currBoardId);
			//updateBoardUI(currBoardId);
		},
		ntarget: (value) => {
			console.log('ntarget receive');
			boardData[currBoardId].regions.ntarget = value;
			console.log('ntarget'+value);
			//setElem("bho", value,'.rep');
		},
	},
	timestamp: (val) => {
		boardData[currBoardId].timestamp = convertDateTimeToHumanReadable(val);
		let timestampElement = document.querySelector(`#timestamp-${currBoardId}`);
		timestampElement.innerText = boardData[currBoardId].timestamp + "   -   FW version: " + boardData[currBoardId].fw;
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
	if(target != ''){
		let inputelem = elem.querySelector(target);
		inputelem.value = val;
	}
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
						
// Disegna la griglia delle aree
function drawRegions(sketch, bid) {
    //stroke(255);
    sketch.strokeWeight(1);
	
	let r = boardData[bid].radarData.regions;
	
	// draw areas rectangles
	for(i=0; i<3; i++){
		//console.log("r.enabled: "+ r);
		if(r.enabled[i]){
			//console.log("r: "+[r.x0[i], r.y0[i], r.x1[i], r.y1[i]]);
			// Il riferimento di stampa è il riferimento non ruotato
			if(boardData[bid].radarData.rot){// calcola il passaggio dei vertici dal riferimento ruotato al non ruotato
				// Scala i valori per adattarli allo schermo
				//console.log("r: "+[r.xr0[i], r.yr0[i], r.xr1[i], r.yr1[i]]);
				scaledX0 = -r.xnr0[i];
				scaledY0 = height - r.ynr0[i];
				scaledX1 = -r.xnr1[i]
				scaledY1 = height - r.ynr1[i];
			}else{// lascia i vertici nel riferimento NON ruotato
				//console.log("r: "+[r.xnr0[i], r.ynr0[i], r.xnr1[i], r.ynr1[i]]);
				scaledX0 = r.xnr0[i];
				scaledY0 = r.ynr0[i];
				scaledX1 = r.xnr1[i];
				scaledY1 = r.ynr1[i];
			}
			//fill(r.color || [255, 0, 0]);
			sketch.noFill();
			sketch.stroke(r.color[i]);
			sketch.rectMode(sketch.CORNERS);
			
			//console.log("rect: "+[scaledX0, scaledY0, scaledX1, scaledY1]);
			let x = scaledX0; // Minimo tra le coordinate X per ottenere il lato sinistro
			let y = scaledY0; // Minimo tra le coordinate Y per ottenere il lato superiore
			
			// Disegna il punto
			//fill(0, 255, 0);
		
			sketch.ellipse(scaledX0, -scaledY0, 5, 5);

			sketch.ellipse(scaledX1, -scaledY1, 5, 5);

			if (r.ntarget[i]==1) {
				// Imposta il colore di riempimento a rosso con trasparenza (alpha)
				sketch.fill(r.color[i]);  // Rosso semitrasparente (alpha=127 su 255)
			} else {
				// Imposta un colore di riempimento predefinito (ad esempio bianco)
				sketch.noFill();
			}

			// Ora, ricorda che l'asse Y è invertito con la nuova origine
			sketch.rect(x, -y, scaledX1, -scaledY1); // Disegna il rettangolo
		}
	}
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

function drawDistanceCircles(sketch, bid) {
    const maxDistance = 10; // La distanza massima del radar
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
        sketch.text(`${rounded} m`, radius-13, -5 + radarData.rot*(20 - sketch.height));
    }
}

// Create the dashboard of measurements and commands
function createBoardSection(boardID) {
    let gridContainer = document.querySelector('.grid-container');

	const tmpl1 = document.createElement("template");
	tmpl1.innerHTML = `<div class='col-12 col-s-12' id='txt-banner'  class="header">
	<h2 class="header">Monitoraggio radar</h2></div>
	<div class='col-12 col-s-12' id="timestamp-${boardID}"></div>
	<div class='col-9 col-s-12 boxed' id='radar-${boardID}'></div>
	<div class='col-3 col-s-12 boxed' id='sensorData-${boardID}'>
		<p>Board ID: <span class="boardID">${boardID}</span></p>
		<p>Temperatura: <span class="temp">N/A</span></p>
		<p>Pressione: <span class="press">N/A</span></p>
		<p>Umidità: <span class="hum">N/A</span></p>
		<p>Gas: <span class="gas">N/A</span></p>
		<p>Luce visibile: <span class="visible">N/A</span></p>
		<p>Luce infrarossa: <span class="infrared">N/A</span></p>
		<p>Luce totale: <span class="total">N/A</span></p>
	</div>
			
	<div id='poll1-${boardID}' class='col-1 col-s-12'>
		<div class="txt"><p >Polling time</p></div>
		<input class="poll1 button-large" type="time" step="1" />
		<input class="send button-small button-blue" type="button" value="Invia"/>
	</div>
	<div class='col-1 col-s-12' id='servel-${boardID}'>
		<div class="txt"><p >Radar serial</p></div>
		<select name="vels" class="servel button-large">
			<option value="9600">9600</option>
			<option value="19200">19200</option>
			<option value="38400">38400</option>
			<option value="57600">57600</option>
			<option value="115200">115200</option>
			<option value="230400">230400</option>
			<option value="256000">256000</option>
			<option value="460800">460800</option>
		</select>
		<input class="send button-small button-blue" type="button" value="Invia"/>
	</div>
	<div class='col-1 col-s-12' id='radarstate-${boardID}'>
		<div class="txt"><p >Radar state</p></div>
		<input type="text"  value="0" class="rep">
		<input type="button" class="send button-blue" value="Invia">
	</div>
	<div class='col-1 col-s-12' id='radarfactory-${boardID}'>
		<div class="txt"><p >Radar factory</p></div>
		<input type="text"  value="0" class="rep">
		<input type="button" class="send button-blue" value="Invia">
	</div>
	<div class='col-1 col-s-12' id='radarmode-${boardID}'>
		<div class="txt"><p >Radar mode</p></div>
		<select name="target" class="sel button-large">
			<option value="1">Track</option>
			<option value="2">Report</option>
			<option value="3">Both</option>
		</select>
		<input type="button" class="send button-blue" value="Invia">
	</div>	
	<div class='col-1 col-s-12' id='areaenable-${boardID}'>
		<div class="txt"><p class="txt">Stato area</p></div>
		<select name="areaenable" class="sel button-large">
			<option value="1">Enabled</option>
			<option value="0">Disabled</option>
		</select>
		<input type="button" class="send button-blue" value="Invia">
	</div> 
	<div class='col-1 col-s-12' id='areatypesel-${boardID}'>
		<div class="txt"><p >Tipo area</p></div>
		<select name="areatype" class="sel button-large">
			<option value="0">Monitor</option>
			<option value="1">Filter</option>
		</select>
		<div><input id='iotmsg-${boardID}' class="iotmsg button-text" type="text" value="IoT OFF"/></div>
	</div>
	<div class='col-2 col-s-12' id='areavertices-${boardID}'>
		<div class="txt"><p >Vertici area</p></div>
		<div class="button-container">
			<label class="poll1 button-small">V1</label> 
			<label class="poll1 button-small">V2</label> 
		</div>
		<div class="button-container">
			<input class="poll1 button-small x0" type="text" />
			<input class="poll1 button-small y0" type="text" />
			<input class="poll1 button-small x1" type="text" />
			<input class="poll1 button-small y1" type="text"/>
		</div>
		<div class="button-container" id='connstatel'>
			<input id='connmsg-${boardID}' class="connmsg button-text" type="text" value="MQTT OFF"/>
		</div>
	</div>
	<div class='col-1 col-s-12' id='areasel-${boardID}'>
		<div class="txt"><p>Seleziona area</p></div>
			<select name="target" class="sel button-large">
				<option value="1">Area 1</option>
				<option value="2">Area 2</option>
				<option value="3">Area 3</option>
			</select>
			<input class="send button-small button-blue" type="button" value="Invia"/>
	</div>
	<div class='col-1 col-s-12' id='areareset-${boardID}'>
		<div class="txt"><p >Cancella tutte</p></div>
		<input type="text"  value="0">
		<input type="button" class="send button-blue" value="Invia">
	</div>		
	<div class='col-1 col-s-12' id='radarinvert-${boardID}'>
		<p>Inverti griglia</p>
		<input type="text"  class="txt"value="0">
		<input type="button"  class="send button-blue" value="Invia">
	</div> `
	
	var body = tmpl1.content.cloneNode(true);

	const tmpl2 = document.createElement("template");
	tmpl2.innerHTML = `<div class='col-12 col-s-12' id='txt-nulla' class='footer'><h2 class="footer">Monitoraggio radar</h2></div>`
	var footer = tmpl2.content.cloneNode(true);

	gridContainer.appendChild(body);
	gridContainer.appendChild(footer);
	pubReadAtt(boardID, "allstate");
}

// Bind command listeners to input elements 
function setInputListeners(boardID) {
    let poll1div = document.getElementById(`poll1-${boardID}`);// Trova l'id del contenitore grid degli input
	let poll1send = poll1div.querySelector('.send');// Trova la classe dell'oggetto di input che riceve l'evento utente
	let poll1val = poll1div.querySelector('.poll1');// Trova la classe dell'oggetto di input da leggere ogni evento utente
	/// POLL TIME SETTING  ///////////////////////////////////////////////////////////////////////////////////////
	poll1send.onclick = () => {
		const timeValue = poll1val.value;
		console.log('timeValue:', timeValue);
		// Dividi il valore in ore, minuti e secondi
		const [hours, minutes, seconds] = timeValue.split(':').map(Number);
		// Calcola i millisecondi
		const milliseconds = ((hours * 3600) + (minutes * 60) + seconds) * 1000;
		pubAtt("polltime", milliseconds, boardID, "write");
		poll1div.style.backgroundColor = "#E67E22"; // activate the wait signal for command feedback
	}
	/// RADAR SERIAL VEL SETTING ///////////////////////////////////////////////////////////////////////////////////////
	let servel = document.getElementById(`servel-${boardID}`);// Trova l'id del contenitore grid degli input
	let servelsend = servel.querySelector('.send');// Trova la classe dell'oggetto di input che riceve l'evento utente
	let servelval = servel.querySelector('.servel');// Trova la classe dell'oggetto di input da leggere ogni evento utente
	servelsend.onclick = () => {
		const serValue = servelval.value;	
		console.log('serValue', serValue);
		pubAtt("servel", serValue, boardID, "write");
		servel.style.backgroundColor = "#E67E22"; // activate the wait signal for command feedback
	}
	/// RADAR MODE  ///////////////////////////////////////////////////////////////////////////////////////
	let radarmode = document.getElementById(`radarmode-${boardID}`);// Trova l'id del contenitore grid degli input
	let radarmodesel = radarmode.querySelector('.sel');
	let radarmodesend = radarmode.querySelector('.send');// Trova la classe dell'oggetto di input che riceve l'evento utente
	radarmodesend.onclick = () => {
		val = radarmodesel.value;
		pubAtt("radarmode", val, boardID, "write");
		radarmode.style.backgroundColor = "#E67E22"; // activate the wait signal for command feedback	
	}
	/// RADAR AREA FACTORY  ///////////////////////////////////////////////////////////////////////////////////////
	let radarfactory = document.getElementById(`radarfactory-${boardID}`);// Trova l'id del contenitore grid degli input
	let radarfactorysend = radarfactory.querySelector('.send');// Trova la classe dell'oggetto di input che riceve l'evento utente
	radarfactorysend.onclick = () => {
		pubAtt("radarfactory", "1", boardID, "write");
		radarfactory.style.backgroundColor = "#E67E22"; // activate the wait signal for command feedback
	}
	/// RADAR STATE ON/OFF  ///////////////////////////////////////////////////////////////////////////////////////
	let radarstate = document.getElementById(`radarstate-${boardID}`);// Trova l'id del contenitore grid degli input
	let radarstatesend = radarstate.querySelector('.send');// Trova la classe dell'oggetto di input che riceve l'evento utente
	radarstatesend.onclick = () => {
		pubAtt("radartoggle", "1", boardID, "write");
		radarstate.style.backgroundColor = "#E67E22"; // activate the wait signal for command feedback
	}
	/// RADAR AREA CONFIG  ///////////////////////////////////////////////////////////////////////////////////////
	let areavertices = document.getElementById(`areavertices-${boardID}`);
	let x0= areavertices.querySelector('.x0');// Trova la classe dell'oggetto di input da leggere ogni evento utente
	let y0= areavertices.querySelector('.y0');
	let x1= areavertices.querySelector('.x1');
	let y1= areavertices.querySelector('.y1');
	let areatypesel = document.getElementById(`areatypesel-${boardID}`);// Trova l'id del contenitore grid degli inputlet areavertices = document.getElementById('areavertices');// Trova l'id del contenitore grid degli input
	let areaenable = document.getElementById(`areaenable-${boardID}`);// Trova l'id del contenitore grid degli input
	let areaenablesel = areaenable.querySelector('.sel');
	let areatypeselsel = areatypesel.querySelector('.sel');
	dataentry = [x0, y0, x1, y1, areaenablesel, areatypeselsel];

	let areasel = document.getElementById(`areasel-${boardID}`);
	let areaselsend = areasel.querySelector('.send');// Trova la classe dell'oggetto di input che riceve l'evento utente
	areaselsend.onclick = () => {
		// update boardData region from user input
		let r = boardData[currBoardId].radarData.regions;
		let selectedRectangle = r.selected-1;
		let typeval= areatypeselsel.value;
		//let i= areaselsel.value;
		let enabledval = areaenablesel.value;
		//boardData.radarData.regions.selected = i;
		r.x0[selectedRectangle] = Number(x0.value);
		r.y0[selectedRectangle] = Number(y0.value);
		r.x1[selectedRectangle] = Number(x1.value);
		r.y1[selectedRectangle] = Number(y1.value);
		r.type[selectedRectangle] = Number(typeval);
		r.enabled[selectedRectangle] = Number(enabledval);
		r.narea[selectedRectangle] = Number(selectedRectangle);
		//expandBoardDataRegion();		

		const region = {	
			narea: boardData[currBoardId].radarData.regions.selected,
			type: typeval,
			enabled: enabledval,
			x0: x0.value,
			y0: y0.value,
			x1: x1.value,
			y1: y1.value,
		};			
		console.log('region send', region);
		pubAtt("region", region, boardID, "write"); //serializza e invia
		areavertices.style.backgroundColor = "#E67E22"; // activate the wait signal for command feedback
		areasel.style.backgroundColor = "#E67E22"; // activate the wait signal for command feedback
		areatypesel.style.backgroundColor = "#E67E22"; // activate the wait signal for command feedback
	}
	/// RADAR AREA ENABLE/DISABLE  ///////////////////////////////////////////////////////////////////////////////////////
	let areaselsel = areasel.querySelector('.sel');
	areaselsel.onchange = () => {
		console.log("areaselsel.onchange: "+ areaselsel.value);
		boardData[currBoardId].radarData.regions.selected = Number(areaselsel.value);
		updateInputsFromBoardDataRegion(currBoardId);
	}
	/// RADAR AREA ENABLE/DISABLE  ///////////////////////////////////////////////////////////////////////////////////////
	let areaenablesend = areaenable.querySelector('.send');
	areaenablesend.onclick = () => {
		let areaenable = document.getElementById(`areaenable-${boardID}`);
		let areaenablesel = areaenable.querySelector('.sel');
		let enabled = Number(areaenablesel.value);
		
		let r = boardData[currBoardId].radarData.regions;
		let region = r.selected;
		if(enabled){
			console.log('areenable '+region);
			r.enabled[region-1] = 1;
			pubAtt("areaenable", region, boardID, "write"); //serializza e invia
		}else{
			console.log('areadisable '+region);
			r.enabled[region-1] = 0;
			pubAtt("areadisable", region, boardID, "write"); //serializza e invia
		}
		areaenable.style.backgroundColor = "#E67E22"; // activate the wait signal for command feedback
	}
	/// RADAR GRID INVERT ///////////////////////////////////////////////////////////////////////////////////////
	let radarinvert = document.getElementById(`radarinvert-${boardID}`);// Trova l'id del contenitore grid degli input
	let radarinvertsend = radarinvert.querySelector('.send');// Trova la classe dell'oggetto di input che riceve l'evento utente
	let radarinvertxt = radarinvert.querySelector('.txt');
	radarinvertsend.onclick = () => {
		let r = boardData[currBoardId].radarData.regions;
		if(boardData[currBoardId].radarData.rot == 0){
			boardData[currBoardId].radarData.rot = 1;
			radarinvertxt.value = "Ruotata";
			for(i=0; i<3; i++){
				r.dar[i].setRotation(true);
			}
		}else{
			boardData[currBoardId].radarData.rot = 0;
			radarinvertxt.value = "Non ruotata";
			for(i=0; i<3; i++){
				r.dar[i].setRotation(false);
			}
		}
	}
	/// RADAR ALL AREAS RESET ///////////////////////////////////////////////////////////////////////////////////////
	let areareset = document.getElementById(`areareset-${boardID}`);// Trova l'id del contenitore grid degli input
	let arearesetsend = areareset.querySelector('.send');// Trova la classe dell'oggetto di input che riceve l'evento utente
	arearesetsend.onclick = () => {
		console.log('areareset');
		pubAtt("areareset", 1, boardID, "write"); //serializza e invia
		areareset.style.backgroundColor = "#E67E22"; // activate the wait signal for command feedback
	}
}

function alertUser(color){
	// Seleziona tutti gli elementi con la classe 'msg'
    var msglist = document.querySelectorAll(".connmsg");

    // Itera su tutti gli elementi selezionati e imposta lo sfondo giallo
    msglist.forEach(function(elem) {
        elem.style.backgroundColor = color;
		elem.style.color = "white";
		if(color=="green"){
			elem.value = "MQTT "+(currentBrokerIndex+1)+" ON ";
		}else{
			elem.value = "MQTT "+(currentBrokerIndex+1)+" OFF ";
		}
    });
}

function alertUserIot(boardID, color){
	let iotmsg = document.getElementById(`iotmsg-${boardID}`);
	iotmsg.style.backgroundColor = color;
	iotmsg.style.color = "white";
	if(color=="green"){
		iotmsg.value = "Iot ON";
	}else{
		iotmsg.value = "Iot OFF";
	}
}

class DragAndResize{
    constructor(sketch, reg, width, height) {
		this.dragging = false;  // Durata del timer in millisecondi
		this.resizing = false;  // Funzione da eseguire al termine del timer
		this.offsetX = 0;  
        this.offsetY = 0;  
        this.selectedCorner = null;  
        this.rotated = false;  
        this.region = reg;
        this.rot = false;
        this.rect = [0, 0, 0, 0];
        this.width = width;
        this.height = height;
		this.rect[0] = this.region[0];
		this.rect[1] = this.region[1];
		this.rect[2] = this.region[2];
		this.rect[3] = this.region[3];
		this.sketch = sketch;
		console.log("rect init "+this.rect);
	}

	setResize(width, height){
		this.width = width;
        this.height = height;
		this.setRotation(this.rot)
	}

	getRegion(){
		return this.region;
	}

	setRegion(reg){
		this.region = reg;
		this.rect[0] = this.region[0];
		this.rect[1] = this.region[1];
		this.rect[2] = this.region[2];
		this.rect[3] = this.region[3];
		this.setRotation(this.rot)
	}

    setRotation(rot){
        this.rot = rot;
        if(this.rot){
            // traduzione del rettangolo ruotato in una immagine nel riferimento non ruotato
            this.rect[0] = -this.region[0];
            this.rect[1] = this.height - this.region[1];
            this.rect[2] = -this.region[2];
            this.rect[3] = this.height - this.region[3];
            console.log("rect rot----------------------------");
        }else{		
            // traduzione del rettangolo non ruotato in una immagine nel riferimento non ruotato
            this.rect[0] = this.region[0];
            this.rect[1] = this.region[1];
            this.rect[2] = this.region[2];
            this.rect[3] = this.region[3];
            // Scala i valori del mouse per adattarli al riferimento dello schermo!!!
            console.log("rect no rot----------------------------");
        }
    }

    mousePressed() {
        let scaledX = 0;
        let scaledY = 0;
        
		//console.log("this.sketch.mouseX: "+this.sketch.mouseX);
		//console.log("this.sketch.mouseY: "+this.sketch.mouseY);
        // passaggio dell'input del mouse al riferimento non ruotato
        scaledX = this.sketch.mouseX - this.width /2;
        scaledY = this.height - this.sketch.mouseY;
        
        ///---------CALCOLO DELL'OFFSET NEL RIFERIMENTO NON RUOTATO--------------------------
        console.log("mousePressed----------------------------");
        console.log("rect: "+this.rect);
        console.log("scaledX-rect[0]: "+scaledX+"-"+this.rect[0]);
        console.log("scaledY- rect[1]: "+scaledY+"-"+this.rect[1]);
        // Check if mouse is near any corner for resizing
        const resizeThreshold = 10;
        let inside1 = scaledX > this.rect[0] && scaledX < this.rect[2] && scaledY > this.rect[3] && scaledY < this.rect[1];
        let inside2 = scaledX > this.rect[2] && scaledX < this.rect[0] && scaledY > this.rect[1] && scaledY < this.rect[3];
        if (this.isNearCorner(this.sketch, scaledX, scaledY, this.rect[0], this.rect[1], resizeThreshold)) {
            this.dragging = false;
            this.resizing = true;
            this.selectedCorner = 'topLeft';
            console.log("Near topleft");
        } else if (this.isNearCorner(this.sketch, scaledX, scaledY, this.rect[2], this.rect[1], resizeThreshold)) {
            this.dragging = false;
            this.resizing = true;
            this.selectedCorner = 'topRight';
            console.log("Near topRight");
        } else if (this.isNearCorner(this.sketch, scaledX, scaledY, this.rect[0], this.rect[3], resizeThreshold)) {
            this.dragging = false;
            this.resizing = true;
            this.selectedCorner = 'bottomLeft';
            console.log("Near bottomLeft");
        } else if (this.isNearCorner(this.sketch, scaledX, scaledY, this.rect[2], this.rect[3], resizeThreshold)) {
            this.dragging = false;
            this.resizing = true;
            this.selectedCorner = 'bottomRight';
            console.log("Near bottomRight");
        } else if (inside1 || inside2) {
            this.sketch.cursor("grab");
            console.log("Near inside for dragging");
            // Otherwise check if inside the rectangle for dragging 
            // Traslazione
            this.dragging = true;
            this.offsetX = scaledX - this.rect[0]; 
            this.offsetY = scaledY - this.rect[1];
            console.log("offset: "+this.offsetX+" - "+this.offsetY);
        }else{
            this.sketch.cursor(this.sketch.ARROW);
        }
    }

    mouseDragged() {
        let scaledX = 0;
        let scaledY = 0;

        // passaggio dell'input del mouse al riferimento non ruotato
        scaledX = this.sketch.mouseX - this.width /2;
        scaledY = this.height - this.sketch.mouseY;

    ///---------CALCOLO DEL DRAG & DROP NEL RIFERIMENTO NON RUOTATO A PARTIRE DALL'OFFSET--------------------------		
        if (this.dragging) {
                // Move the entire rectangle
                let widthd = this.rect[2] - this.rect[0];
                let heightd = this.rect[3] - this.rect[1];
                
                this.rect[0] = scaledX - this.offsetX;
                this.rect[1] = scaledY - this.offsetY;
                this.rect[2] = this.rect[0] + widthd;
                this.rect[3] = this.rect[1] + heightd;
        } else if (this.resizing) {	
            // Resize the rectangle based on selected corner
            if (this.selectedCorner === 'topLeft') {
                console.log("drag topLeft");
                this.rect[0] = scaledX;
                this.rect[1] = scaledY;
            } else if (this.selectedCorner === 'topRight') {
                console.log("drag topRight");
                this.rect[2] = scaledX;
                this.rect[1] = scaledY;
            } else if (this.selectedCorner === 'bottomLeft') {
                console.log("drag bottomLeft");
                this.rect[0] = scaledX;
                this.rect[3] = scaledY;
            } else if (this.selectedCorner === 'bottomRight') {
                this.rect[2] = scaledX;
                this.rect[3] = scaledY;
            }
            console.log("resize: "+scaledX+" - "+scaledY);
        }	
        if(this.rot){
            // passaggio del risultato nel riferimento ruotato
            this.region[0] = -this.rect[0];
            this.region[1] = this.height - this.rect[1];
            this.region[2] = -this.rect[2];
            this.region[3] = this.height - this.rect[3];
        }else{
            // passaggio del risultato nel riferimento non ruotato
            this.region[0] = this.rect[0];
            this.region[1] = this.rect[1];
            this.region[2] = this.rect[2];
            this.region[3] = this.rect[3];
        }
		console.log("region: "+this.region);

		return this.region;
    }

    mouseReleased() {
        this.dragging = false;
        this.resizing = false;
        this.selectedCorner = null;
        this.sketch.cursor(this.sketch.ARROW);
    }

    // Utility to check if mouse is near a corner for resizing
    isNearCorner(sketch, mx, my, x, y, threshold) {
        let d = this.sketch.dist(mx, my, x, y);
        console.log("Dist: "+d);
        return d  < threshold;
    }
}

// Definisci la classe MonostableTimer
class MonostableTimer {
	constructor(timeoutDuration, callback) {
		this.timeoutDuration = timeoutDuration;  // Durata del timer in millisecondi
		this.callback = callback;  // Funzione da eseguire al termine del timer
		// this.callback = callback.bind(this);
		this.timeoutId = null;  // ID del timeout
	}

	// Avvia o resetta il timer
	start() {
		// Se esiste un timer attivo, resettalo
		if (this.timeoutId) {
			clearTimeout(this.timeoutId);
			console.log("Timer resettato");
		}

		// Imposta un nuovo timer
		this.timeoutId = setTimeout(() => {
			// Verifica che la callback sia una funzione prima di chiamarla
			if (typeof this.callback === 'function') {
				this.callback();  // Esegue la callback
			} else {
				console.error("Callback non è una funzione!");
			}
		}, this.timeoutDuration);

		console.log("Timer avviato per " + this.timeoutDuration + " millisecondi.");
	}

	// Ferma il timer (se necessario)
	stop() {
		if (this.timeoutId) {
			clearTimeout(this.timeoutId);
			console.log("Timer fermato");
		}
		this.timeoutId = null;
	}
}

// Massive update of measurement outputs
// is used for the massive update of all measurements
function updateBoardUI(boardID) {
   
    let timestampElement = document.getElementById(`timestamp-${boardID}`);
    timestampElement.innerText = convertDateTimeToHumanReadable(boardData[boardID].timestamp) + "   -   FW version: " + boardData[boardID].fw;

    let sensorDataElement = document.getElementById(`sensorData-${boardID}`);
    sensorDataElement.querySelector('.temp').innerText = `${boardData[boardID].tempData.temp} °C`;
    sensorDataElement.querySelector('.press').innerText = `${boardData[boardID].tempData.press} Pa`;
    sensorDataElement.querySelector('.hum').innerText = `${boardData[boardID].tempData.hum} %`;
    sensorDataElement.querySelector('.gas').innerText = `${boardData[boardID].tempData.gas}`;
    sensorDataElement.querySelector('.visible').innerText = `${boardData[boardID].luxData.visible} Lux`;
    sensorDataElement.querySelector('.infrared').innerText = `${boardData[boardID].luxData.infrared} Lux`;
    sensorDataElement.querySelector('.total').innerText = `${boardData[boardID].luxData.total} Lux`;
}

function expandBoardDataRegion(boardID) {	
	let r = boardData[boardID].radarData.regions;
	//let selectedRectangle = r.selected-1;

	let container1 = document.getElementById(`radar-${boardID}`);
	let width1 = container1.offsetWidth*0.988;
	let height1 = width1*1.2/2;
	for(let i=0; i<3; i++){
		// rotated
		selectedRectangle = i;
		r.xnr0[selectedRectangle] = map2(r.x0[selectedRectangle], -6, 6, -width1 * 0.3, width1 * 0.3);
		r.ynr0[selectedRectangle] = map2(r.y0[selectedRectangle], 0, -6, 0, -height1);
		r.xnr1[selectedRectangle] = map2(r.x1[selectedRectangle], -6, 6, -width1 * 0.3, width1 * 0.3);
		r.ynr1[selectedRectangle] = map2(r.y1[selectedRectangle  ], 0, -6, 0, -height1);
		
		console.log("r.xnr0[i]:"+r.xnr0[selectedRectangle]);
		console.log("r.ynr0[i] :"+r.ynr0[selectedRectangle]);
		console.log("r.xnr1[i] :"+r.xnr1[selectedRectangle]);
	}
	console.log("r.ynr1[i] :"+r.ynr1[selectedRectangle]);
	// Aggiorna le coordinate delle aree
	for(let i=0; i<3; i++){
		r.dar[i].setRegion([r.xnr0[i], r.ynr0[i], r.xnr1[i], r.ynr1[i]]);
	}
}

// Creazione funzione di setup e loop di disegno di ogni canvas
function createCanvasInstances(boardID) {
    new p5(function(sketch) {
        let canvas;
		let dragging = false;
		let resizing = false;
		let offsetX = 0;
		let offsetY = 0;
		let selectedCorner = null;
		let width;
		let height;

        sketch.setup = function() {
            let container = document.getElementById(`radar-${boardID}`);
            let width = container.offsetWidth * 0.988;
            let height = width * 1.2 / 2;
			console.log("width: "+width);
			console.log("height: "+height);

			let r = boardData[boardID].radarData.regions;
			r.dar = [
				new DragAndResize(sketch, [r.xnr0[0], r.ynr0[0], r.xnr1[0], r.ynr1[0]], width, height), 
				new DragAndResize(sketch, [r.xnr0[1], r.ynr0[1], r.xnr1[1], r.ynr1[1]], width, height), 
				new DragAndResize(sketch, [r.xnr0[2], r.ynr0[2], r.xnr1[2], r.ynr1[2]], width, height) 
			];

            let canvas = sketch.createCanvas(width, height).parent(container);
        };
    
        sketch.draw = function() {
            sketch.background(0);
            sketch.translate(sketch.width / 2, sketch.height); // Sposta l'origine in basso al centro
            drawGrid(sketch);
			drawRegions(sketch, boardID);
            sketch.stroke(255);
            sketch.noFill();
            drawDistanceCircles(sketch, boardID);
			let x = 0;
			let y = 0;
			let scaledX = 0;
			let scaledY = 0;

            let radarData = boardData[boardID].radarData;
			if(radarData.x){
				for (let i = 0; i < radarData.x.length; i++) {
					x = Number(radarData.x[i]);
					y = Number(radarData.y[i]);

					if(radarData.rot){
						// Scala i valori per adattarli allo schermo
						scaledX = sketch.map(x, 6, -6, -sketch.width * 0.3, sketch.width * 0.3);
						scaledY = sketch.map(y, 6, 0, 0, -height);
					}else{
						scaledX = sketch.map(x, -6, 6, -sketch.width * 0.3, sketch.width * 0.3);
						scaledY = sketch.map(y, 0, 6, 0, -sketch.height);
					}
					// Disegna il punto
					sketch.fill(0, 255, 0);
					sketch.noStroke();        
					sketch.ellipse(scaledX, scaledY, 10, 10);
					// Etichette
					sketch.fill(255);
					sketch.textSize(12);
					sketch.text(`X: ${x}`, scaledX + 5, scaledY - 20+radarData.rot*20);
					sketch.text(`Y: ${y}`, scaledX + 5, scaledY - 10+radarData.rot*20);
				}
			}
        };
        
        sketch.windowResized = function () {
            let container = document.getElementById(`radar-${boardID}`);
            let width = container.offsetWidth * 0.988;
            let height = width * 1.1 / 2;

            sketch.resizeCanvas(width, height);
			let r = boardData[boardID].radarData.regions;

			for(i=0; i<3; i++){
				r.dar[i].setResize(width, height); 
			}
        };

		sketch.mousePressed = function() {
			let r = boardData[boardID].radarData.regions;
			let selectedRectangle = r.selected -1;
			//console.log("selectedRectangle mousePressed: "+selectedRectangle);
			r.dar[selectedRectangle].mousePressed();
		}
		
		sketch.mouseDragged = function() {
			let container = document.getElementById(`radar-${boardID}`);
            let width = container.offsetWidth * 0.988;
            let height = width * 1.1 / 2;

			let r = boardData[boardID].radarData.regions;
			let selectedRectangle = r.selected -1;
			//console.log("selectedRectangle dragged: "+selectedRectangle);
			// seleziona gestore del resizing dell'area corrente
			let selRect = r.dar[selectedRectangle].mouseDragged();
			//console.log("rrrrrrrA: "+selRect);
			// aggiorna vertici dell'area corrente per la stampa
			r.xnr0[selectedRectangle] = selRect[0];
			r.ynr0[selectedRectangle] = selRect[1];
			r.xnr1[selectedRectangle] = selRect[2];
			r.ynr1[selectedRectangle] = selRect[3];
			// calcola i vertici base dell'area corrente in metri
			r.x0[selectedRectangle] = mapInverse(r.xnr0[selectedRectangle], -width * 0.3, width * 0.3, -6, 6);
			r.y0[selectedRectangle] = mapInverse(r.ynr0[selectedRectangle], 0, -height, 0, -6);
			r.x1[selectedRectangle] = mapInverse(r.xnr1[selectedRectangle], -width * 0.3, width * 0.3, -6, 6);
			r.y1[selectedRectangle] = mapInverse(r.ynr1[selectedRectangle], 0, -height, 0, -6);
			// aggiorna feedback nella GUI
			//console.log("rrrrrrr.x0: "+width+"-"+height);
			updateInputsFromBoardDataRegion(boardID);
		}	

		sketch.mouseReleased = function () {
			let r = boardData[boardID].radarData.regions;
			let selectedRectangle = r.selected -1;
			//console.log("selectedRectangle released: "+selectedRectangle);
			r.dar[selectedRectangle].mouseReleased();
		}
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

function updateInputsFromBoardDataRegion(boardID) {
	let r = boardData[boardID].radarData.regions;
	let selectedRectangle = r.selected -1;
	dataentry[0].value = roundTo(r.x0[selectedRectangle], 1);
	dataentry[1].value = roundTo(r.y0[selectedRectangle], 1);
	dataentry[2].value = roundTo(r.x1[selectedRectangle], 1);
	dataentry[3].value = roundTo(r.y1[selectedRectangle], 1);
	dataentry[4].value = roundTo(r.enabled[selectedRectangle], 1);
	dataentry[5].value = roundTo(r.type[selectedRectangle], 1);
}

function mapInverse(value, start2, stop2, start1, stop1) {
  return (value - start2) * (stop1 - start1) / (stop2 - start2) + start1;
}

function map2(value, start1, stop1, start2, stop2) {
  return (value - start1) * (stop2 - start2) / (stop1 - start1) + start2;
}
