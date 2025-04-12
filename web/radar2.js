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
			
			if(topic === pushtopic){
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
								narea: [1, 2, 3, 4, 5, 6, 7, 8, 9],
								ntarget: [0, 0, 0, 0, 0, 0, 0, 0, 0],
								shape: [0, 0, 0, 0, 0, 0, 0, 0, 0],
								type: [0, 0, 0, 0, 0, 0, 0, 0, 0],
								enabled: [0, 0, 0, 0, 0, 0, 0, 0, 0],
								radarmode: [1, 1, 1, 1, 1, 1, 1, 1, 1],
								selected: 1,
								polilines: [],
								dar : [null, null, null, null, null, null],
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
					alertUser("#FFA500");
					pubReadAtt(boardID, "allstate")
				}
			}else if(topic === statetopic){	
				console.log('Msg:', data);		
			}
			currBoardId = boardID;
			console.log('CURRENT BOARDID: ', currBoardId);
			//ms = ["measures"];
			ms = ["measures","tempSensor", "luxSensor", "radar", "state"];
			vals = ["radarmode"];
			processJson(commandMap, data, [], ms, vals);
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

//alertUser(boardID, "#FFA500");
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
						let iotmsg = document.getElementById(`iotstate-${currBoardId}`);
						iotmsg.style.backgroundColor = "red";
						iotmsg.style.color = "white";
						iotmsg.value = "Iot OFF";
						console.log('Iot OFF');
					});
				}
				setElem(currBoardId, "poll1", millisToTimeString(value), '.poll1');
			},
		servel: (value) => {
				console.log('Setting servel to', value);
				setElem(currBoardId, "servel", value, '.servel');
			},
		radarfactory: () => {
			console.log('Restoring radar');
			setElem(currBoardId, "radarfactory", '','.rep');
		},
		radarstate: (value) => {
			console.log('radarstate receive');
			setElem(currBoardId, "radarstate", value,'.rep');
		},
		radarmode: (value) => {
			let r = boardData[currBoardId].radarData.regions;
			r.radarmode = value.map(Number);
			console.log(r.radarmode);
			// aggiornamento cumulativo dei feedback degli input delle regioni (type, radarmode, filter mode)
			updateInputsFromBoardDataRegion(currBoardId);
			setElem(currBoardId, "radarmode", '', '');
		},
		regions: (value) => {
			console.log('regions receive ', value);
			console.log('currBoardId ', currBoardId);
			// update boardData region from state feedback
			let r = boardData[currBoardId].radarData.regions;
			r.narea = value.narea.map(Number);
			r.type = value.type.map(Number);
			r.enabled = value.enabled.map(Number);
			plns = value.polilines;
			console.log('plns ', plns);
			r.polilines = plns;// save regions on boardData 
			if(plns){
				for(i=0; i<9; i++){
					console.log('i ',i);
					console.log('label ', r.dar[i].label);
					r.dar[i].enabled = Number(r.enabled[i]);
					r.shape[i] = r.dar[i].isScalingRect;
					r.dar[i].importPointsInMeters(plns[i]);
					r.dar[i].setType(Number(r.type[i]))
				}
			}				
			r.radarmode = value.radarmode.map(Number);
			console.log('Setting radarMode to', value)
			console.log('regions receive ENABLED', r.enabled);
			setElem(currBoardId, "areaenable", '', '');
			setElem(currBoardId, "areatypesel", '', '');
			setElem(currBoardId, "areavertices", '', '');
			setElem(currBoardId, "areasel", '', '');
			setElem(currBoardId, "areaenable", '', '');
			setElem(currBoardId, "areareset", '', '');
			// aggiornamento cumulativo dei feedback degli input delle regioni (type, radarmode, filter mode)
			updateInputsFromBoardDataRegion(currBoardId);
		},
		ntarget: (value) => {
			console.log('ntarget receive');
			boardData[currBoardId].regions.ntarget = value;
			console.log('ntarget'+value);
			//setElem("bho", value,'.rep');
		},
	},
	timestamp: (val) => {
		if(boardData[currBoardId]){
			boardData[currBoardId].timestamp = convertDateTimeToHumanReadable(val);
			//let timestampElement = document.querySelector(`#timestamp-${currBoardId}`);
			//timestampElement.innertext = boardData[currBoardId].timestamp + "   -   FW version: " + boardData[currBoardId].fw;
		}
	},
	boardID: (val) => {
		console.log('boardID ', val);
		let elem = document.getElementById(`sensorData-${currBoardId}`);
		if(elem){
			let inputelem = elem.querySelector('.boardID');
			inputelem.innerHTML = val.trim();
		}
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
function processJson(commandMap, jsonObj, basePath = [], measures = [], valueArrayFields = []) {
	let measure = false;
	if(measures.includes(basePath[basePath.length-1])){
		measure = true;
	}

    for (const key in jsonObj) {
        if (jsonObj.hasOwnProperty(key)) {
            const value = jsonObj[key];
            const currentPath = [...basePath, key];
			
            if (typeof value === 'object' && !Array.isArray(value) && !measure) {
				processJson(commandMap, value, currentPath, measures, valueArrayFields);          
            } else if (Array.isArray(value)) {// if it is a list of functions without parameters
				if (valueArrayFields.includes(key)) {
					// Trattalo come array di valori
					executeCommand(commandMap, currentPath, value);
				} else {
					// Trattalo come lista di metodi
					for (const item of value) {
						executeCommand(commandMap, [...currentPath, item]);
					}
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
// Disegna la griglia tachimetrica
function drawGrid(sketch) {
   sketch.stroke(100);
   sketch.strokeWeight(0.5);

    // Linee verticali
    for (let x = -sketch.width / 2; x <= sketch.width / 2 ; x += sketch.width * 0.05) {
        sketch.line(x, -sketch.height, x, 0);
    }

    // Linee orizzontali
    for (let y = 0; y >= -sketch.height; y -= sketch.width * 0.05) {
        sketch.line(-sketch.width/2, y, sketch.width/2 , y);
    }
}


function drawDistanceCircles(sketch, bid) {
    const maxDistance = 10; // La distanza massima del radar
    const numCircles = 5; // Numero di cerchi da disegnare
	
	let radarData = boardData[bid].radarData;

	for (let i = 2; i <= 2*sketch.radius; i+=2) {
        let d = sketch.map(i, 0, sketch.radius*2, 0, sketch.width);
		if(!boardData[bid].radarData.rot){
			sketch.ellipse(0, 0, d, d);
		}else{
			sketch.ellipse(0, -sketch.height, d, d);
		}
        
        // Etichette di distanza
        sketch.textSize(12);
        sketch.textAlign(sketch.CENTER);
        let rounded = Math.round(i * 10) / 10;
        sketch.text(`${rounded} m`, d-13, -5 + boardData[bid].radarData.rot*(20 - sketch.height));
    }
}

// Create the dashboard of measurements and commands
function createBoardSection(boardID) {
    let gridContainer = document.querySelector('.grid-container');

	const tmpl1 = document.createElement("template");
	tmpl1.innerHTML = `<div class='col-12 col-s-12' id='txt-banner'  class="header">
	<h2 class="header">Monitoraggio radar</h2></div>
	<div class='col-12 col-s-12'><span id="timestamp-${boardID}">Pippo</span></div>
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
			<div class="txt"><p>Tipo area</p>
			</div>
			<select name="areatype" class="sel button-large">
				<option value="0">Monitor</option>
				<option value="1">Filter</option>
				<option value="2">Crop</option>
			</select>
			<input type="button" class="send button-blue" value="Invia">
		</div>
		<div class='col-1 col-s-12' id='areasel-${boardID}'>
			<div class="txt"><p>Seleziona area</p></div>
			<select name="target" class="sel button-large">
				<option value="1">Area 1</option>
				<option value="2">Area 2</option>
				<option value="3">Area 3</option>
				<option value="4">Area 4</option>
				<option value="5">Area 5</option>
				<option value="6">Area 6</option>
				<option value="7">Area in 1</option>
				<option value="8">Area in 2</option>
				<option value="9">Area in 3</option>
			</select>
			<input class="send button-small button-blue" type="button" value="Invia punti"/>
		</div>
		<div class='col-1 col-s-12' id='areareset-${boardID}'>
			<div class="txt"><p >Cancella tutte</p></div>
			<input type="text"  value="0">
			<input type="button" class="send button-blue" value="Invia">
		</div>		
		<div class='col-1 col-s-12' id='radarinvert-${boardID}'>
			<p>Inverti griglia</p>
			<input type="text" class="txt" value="0">
			<input type="button"  class="send button-blue" value="Invia">
		</div> 
		<div class='col-2 col-s-12' id='areavertices-${boardID}'>
			<div class="txt"><p>Indicatori di stato</p><br></div>

			<div class="button-container" id='connstate-${boardID}'>
				<div><input id='iotstate-${boardID}' class="button-text" type="text" value="IoT OFF"/></div>
				<div><input class="connmsg button-text" type="text" value="MQTT OFF"/></div>
			</div>
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
	/// RADAR AREA MODE (AREA ID BASED) ///////////////////////////////////////////////////////////////////////////////////////
	let radarmode = document.getElementById(`radarmode-${boardID}`);// Trova l'id del contenitore grid degli input
	let radarmodesel = radarmode.querySelector('.sel');
	let radarmodesend = radarmode.querySelector('.send');// Trova la classe dell'oggetto di input che riceve l'evento utente
	radarmodesend.onclick = () => {// modifica selettiva del solo campo radarmode
		let r = boardData[currBoardId].radarData.regions;
		const val = {	
			narea: r.selected, // recupera l'area selezionata!
			radarmode: radarmodesel.value,
		};
		console.log('radar type send', val);
    	pubAtt("radarmode", val, currBoardId, "write"); //serializza e invia
		radarmode.style.backgroundColor = "#E67E22"; // activate the wait signal for command feedback	
	}
	/// RADAR AREA FACTORY (GENERALE) ///////////////////////////////////////////////////////////////////////////////////////
	let radarfactory = document.getElementById(`radarfactory-${boardID}`);// Trova l'id del contenitore grid degli input
	let radarfactorysend = radarfactory.querySelector('.send');// Trova la classe dell'oggetto di input che riceve l'evento utente
	radarfactorysend.onclick = () => {
		pubAtt("radarfactory", "1", boardID, "write");
		radarfactory.style.backgroundColor = "#E67E22"; // activate the wait signal for command feedback
	}
	/// RADAR STATE ON/OFF (GENERALE) ///////////////////////////////////////////////////////////////////////////////////////
	let radarstate = document.getElementById(`radarstate-${boardID}`);// Trova l'id del contenitore grid degli input
	let radarstatesend = radarstate.querySelector('.send');// Trova la classe dell'oggetto di input che riceve l'evento utente
	radarstatesend.onclick = () => {
		pubAtt("radartoggle", "1", boardID, "write");
		radarstate.style.backgroundColor = "#E67E22"; // activate the wait signal for command feedback
	}
	/// RADAR AREA CONFIG (AREA ID BASED)  ///////////////////////////////////////////////////////////////////////////////////////
	let areatypesel = document.getElementById(`areatypesel-${boardID}`);// Trova l'id del contenitore grid degli inputlet areavertices = document.getElementById('areavertices');// Trova l'id del contenitore grid degli input
	let areaenable = document.getElementById(`areaenable-${boardID}`);// Trova l'id del contenitore grid degli input
	let areavertices = document.getElementById(`areavertices-${boardID}`);// Trova l'id del contenitore grid degli input
	let areaenablesel = areaenable.querySelector('.sel');
	let areatypeselsel = areatypesel.querySelector('.sel');
	dataentry = [areaenablesel, areatypeselsel, radarmodesel];

	let areasel = document.getElementById(`areasel-${boardID}`);
	let areaselsend = areasel.querySelector('.send');// Trova la classe dell'oggetto di input che riceve l'evento utente
	areaselsend.onclick = () => {
		// update boardData region from user input
		let r = boardData[currBoardId].radarData.regions;
		let selectedPoliline = r.selected-1;
		let typeval= areatypeselsel.value;
		let enabledval = areaenablesel.value;
		r.type[selectedPoliline] = Number(typeval);
		r.enabled[selectedPoliline] = Number(enabledval);
		r.narea[selectedPoliline] = Number(selectedPoliline);
		console.log('selectedPoliline', selectedPoliline);
		console.log('r.polilines[selectedPoliline]', r.polilines[selectedPoliline]);
		const region = {	
			narea: r.selected,
			type: typeval,
			enabled: enabledval,
			shape:Number(r.dar[selectedPoliline].isScalingRect),
			polilines: r.polilines[selectedPoliline],
			radarmode: r.radarmode[selectedPoliline]
		};	
		/*
		v = {
			'narea': 0,
			'type': 0,
			'shape': 0,
			'points': [
			]    
		}
		*/		
		console.log('region send', region);
		pubAtt("region", region, currBoardId, "write"); //serializza e invia
		areavertices.style.backgroundColor = "#E67E22"; // activate the wait signal for command feedback
		areasel.style.backgroundColor = "#E67E22"; // activate the wait signal for command feedback
		areatypesel.style.backgroundColor = "#E67E22"; // activate the wait signal for command feedback
	}
	/// RADAR AREA TYPE SETTING (AREA ID BASED) ///////////////////////////////////////////////////////////////////////////////////////
	let areatypesend = areatypesel.querySelector('.send');
	areatypesend.onclick = () => {
		let r = boardData[currBoardId].radarData.regions;
		const val = {	
			narea: r.selected,
			type: areatypeselsel.value,
			shape:0,
		};
		console.log('radar type send', val);
    	pubAtt("areatype", val, currBoardId, "write"); //serializza e invia
		areatypesel.style.backgroundColor = "#E67E22";
	}	
	/// RADAR AREA ENABLE/DISABLE (AREA ID BASED) ///////////////////////////////////////////////////////////////////////////////////////
	let areaselsel = areasel.querySelector('.sel');
	areaselsel.onchange = () => {
		console.log("areaselsel.onchange: "+ areaselsel.value);
		boardData[currBoardId].radarData.regions.selected = Number(areaselsel.value);
		updateInputsFromBoardDataRegion(currBoardId);
	}
	/// RADAR AREA ENABLE/DISABLE (AREA ID BASED) ///////////////////////////////////////////////////////////////////////////////////////
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
			for(i=0; i<6; i++){
				r.dar[i].rot = true;
			}
		}else{
			boardData[currBoardId].radarData.rot = 0;
			radarinvertxt.value = "Non ruotata";
			for(i=0; i<6; i++){
				r.dar[i].rot = false;
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

function alertUser(boardID, color){
	// Seleziona tutti gli elementi con la classe 'msg'
    let connstate = document.getElementById(`connstate-${boardID}`);
	if(connstate !== null){
		let elem = connstate.querySelector('.connmsg');

		elem.style.backgroundColor = color;
		elem.style.color = "white";
		if(color=="green"){
			elem.value = "MQTT "+(currentBrokerIndex+1)+" ON ";
		}else{
			elem.value = "MQTT "+(currentBrokerIndex+1)+" OFF ";
		}
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
	let elem = document.getElementById(`iotstate-${boardID}`);
	elem.style.backgroundColor = color;
	elem.style.color = "white";
	if(color=="green"){
		elem.value = "Iot ON";
	}else{
		elem.value = "Iot OFF";
	}
}

class PolylineEditor {
	constructor(points = null, width, height, defColor, label, radiusMeter, sketch, rect= false) {
        this.points = points || [];  // Se points è null, inizializza un array vuoto
        if (!Array.isArray(this.points)) {
            this.points = [];        // Assicura che this.points sia sempre un array
        }
		this.sketch = sketch;
        this.draggingIndex = -1;   // Indice del punto che si sta draggando
        this.dragOffsetX = 0;      // Offset per il dragging
        this.dragOffsetY = 0;
        this.vertexRadius = 8;     // Raggio dei vertici per il rendering
        this.snapThreshold = 15;   // Distanza entro la quale si può selezionare un vertice
        this.width = width;
        this.height = height;
        this.mouseX;
        this.mouseY;
        this.editMode = true;   
        this.isClosed = false;     // Flag per indicare se la curva è chiusa
        this.mergeThreshold = 15;  // Distanza entro la quale unire i vertici
        // doppio click
        this.lastClickTime = 0;          // per gestire il doppio click
        this.doubleClickDelay = 300;     // millisecondi tra i click
        this.lastClickPos = { x: 0, y: 0 }; // posizione dell'ultimo click
        // drag
        this.isDraggingWhole = false;    // flag per il drag dell'intera curva
        this.dragStartX = 0;             // posizione iniziale per il drag
        this.dragStartY = 0;
        //colore ed etichetta
        this.areaColor = defColor;  // colore default blu semi-trasparente
        this.label = "";  // etichetta/numero dell'area
		this.label1 = "";  // etichetta/numero dell'area
        //this.setAreaColor(defColor);
        this.setLabel(label);
        //flag creazione rettangoli
        this.isCreatingRect = false;  // flag per la creazione del rettangolo
        this.rectStartPoint = null;   // punto iniziale del rettangolo
        //mano libera
        this.mode = 'freehand'; // 'freehand' o 'rectangle'
        this.report = false;
        this.radiusx = radiusMeter;
        this.ratio = this.height/this.width*2;
        this.radiusy = radiusMeter * this.ratio;
        this.enabled = false;
        // Modalità rettangolo scalabile
        this.isScalingRect = rect;
		this.type = "";
    }

	setType(type) {
		if(type == 0){
			this.type = "(monitor)";
		}else if(type == 1){
			this.type = "(filter)";
		}else if(type == 2){
        	this.type = "(crop)";
		}
		this.label = `${this.label1} ${this.type}`;
    }
	
	setScalingRectMode(enabled) {
        if (this.isScalingRect === enabled) return;
        
        this.isScalingRect = enabled;
        if (enabled) {
            this.approximateToRectangle();
        }
    }

	mapInverse(value, start2, stop2, start1, stop1) {
		return (value - start2) * (stop1 - start1) / (stop2 - start2) + start1;
	}

	map2(value, start1, stop1, start2, stop2) {
		return (value - start1) * (stop2 - start2) / (stop1 - start1) + start2;
	}

	// Gestisce lo scaling proporzionale del rettangolo
	handleRectScaling() {
		// Il punto che stiamo trascinando
		const dragPoint = this.points[this.draggingIndex];
		
		// Il punto opposto (che rimane fisso) è sempre a 2 posizioni di distanza nell'array
		const oppositeIndex = ((this.draggingIndex + 2) % 4);
		const oppositePoint = this.points[oppositeIndex];

		// Calcola le nuove coordinate del punto trascinato relative al punto opposto
		const newX = this.mouseX - this.dragOffsetX;
		const newY = this.mouseY - this.dragOffsetY;
		
		// Calcola la differenza tra il nuovo punto e il punto opposto
		const dx = newX - oppositePoint.x;
		const dy = newY - oppositePoint.y;

		// Calcola la nuova larghezza mantenendo il segno (positivo/negativo)
		let newWidth = Math.abs(dx);
		// Calcola la nuova altezza basata sull'aspect ratio originale
		let newHeight = newWidth / this.originalAspectRatio;

		// Determina in quale direzione stiamo scalando
		const signX = dx >= 0 ? 1 : -1;
		const signY = dy >= 0 ? 1 : -1;

		// Aggiorna tutti i punti del rettangolo in base al vertice trascinato
		switch (this.draggingIndex) {
			case 0: // Top-left
				this.points[0] = { 
					x: oppositePoint.x - newWidth * signX,
					y: oppositePoint.y - newHeight * signY 
				};
				this.points[1] = { 
					x: oppositePoint.x,
					y: this.points[0].y 
				};
				this.points[3] = { 
					x: this.points[0].x,
					y: oppositePoint.y 
				};
				break;

			case 1: // Top-right
				this.points[1] = { 
					x: oppositePoint.x + newWidth * signX,
					y: oppositePoint.y - newHeight * signY 
				};
				this.points[0] = { 
					x: oppositePoint.x,
					y: this.points[1].y 
				};
				this.points[2] = { 
					x: this.points[1].x,
					y: oppositePoint.y 
				};
				break;

			case 2: // Bottom-right
				this.points[2] = { 
					x: oppositePoint.x + newWidth * signX,
					y: oppositePoint.y + newHeight * signY 
				};
				this.points[1] = { 
					x: this.points[2].x,
					y: oppositePoint.y 
				};
				this.points[3] = { 
					x: oppositePoint.x,
					y: this.points[2].y 
				};
				break;

			case 3: // Bottom-left
				this.points[3] = { 
					x: oppositePoint.x - newWidth * signX,
					y: oppositePoint.y + newHeight * signY 
				};
				this.points[0] = { 
					x: this.points[3].x,
					y: oppositePoint.y 
				};
				this.points[2] = { 
					x: oppositePoint.x,
					y: this.points[3].y 
				};
				break;
		}
	}

	setReport(yes){
		if(yes){
			this.report = true;
		}else{
			this.report = false;
		}
	}

	approximateToRectangle() {
		if (!this.editMode || !this.isClosed || this.points.length < 3) return;
	
		// Salva colore e etichetta
		let originalColor = this.areaColor;
		let originalLabel = this.label;
	
		// Trova i limiti del bounding box
		let minX = Math.min(...this.points.map(p => p.x));
		let maxX = Math.max(...this.points.map(p => p.x));
		let minY = Math.min(...this.points.map(p => p.y));
		let maxY = Math.max(...this.points.map(p => p.y));
	
		// Crea i nuovi punti del rettangolo
		this.points = [
			{ x: minX, y: minY },
			{ x: maxX, y: minY },
			{ x: maxX, y: maxY },
			{ x: minX, y: maxY }
		];
	
		// Ripristina colore e etichetta
		this.areaColor = originalColor;
		this.label = originalLabel;
		this.isClosed = true;
	}

	clearFigure() {
		if (this.points.length > 0 && this.editMode) {
			console.log("Clearing figure");  // debug
			this.points = [];
			this.isClosed = false;
			this.draggingIndex = -1;
			this.isDraggingWhole = false;
			//this.label = "";
			//this.areaColor = color(0, 0, 255, 30);
			this.isCreatingRect = false;
			this.rectStartPoint = null;
		}
	}

	// Metodi per gestire colore e etichetta
	setAreaColor(r, g, b, a = 30) {
        this.areaColor = this.sketch.color(r, g, b, a);
    }

    setLabel(label) {
        this.label1 = label;
    }

    // Modifica savePoints per includere i nuovi attributi
    savePoints() {
        const saveData = {
            points: this.points.map(p => ({x: p.x, y: p.y})),
            isClosed: this.isClosed,
            areaColor: {
                r: red(this.areaColor),
                g: green(this.areaColor),
                b: blue(this.areaColor),
                a: alpha(this.areaColor)
            },
            label: this.label
        };
        return saveData;
    }

    // Modifica loadPoints per caricare i nuovi attributi
    loadPoints(saveData) {
        if (!saveData || !Array.isArray(saveData.points)) {
            console.error("Formato dati non valido");
            return false;
        }

        try {
            this.points = saveData.points.map(p => ({x: p.x, y: p.y}));
            this.isClosed = saveData.isClosed;
            
            // Carica il colore se presente
            if (saveData.areaColor) {
                this.areaColor = color(
                    saveData.areaColor.r,
                    saveData.areaColor.g,
                    saveData.areaColor.b,
                    saveData.areaColor.a
                );
            }
            
            // Carica l'etichetta se presente
            this.label = saveData.label || "";
            
            this.draggingIndex = -1;
            this.isDraggingWhole = false;
            return true;
        } catch (error) {
            console.error("Errore nel caricamento dei punti:", error);
            return false;
        }
    }

	startRectangle(x, y) {
        this.points = [];  // pulisce punti esistenti
        this.isCreatingRect = true;
        this.rectStartPoint = { x: x, y: y };
        this.points.push({ x: x, y: y }); // primo punto
        // aggiungiamo temporaneamente gli altri punti
        this.points.push({ x: x, y: y });
        this.points.push({ x: x, y: y });
        this.points.push({ x: x, y: y });
    }

    updateRectangle(x, y) {
        if (!this.isCreatingRect) return;
        
        // Aggiorna i quattro punti del rettangolo
        this.points[0] = { x: this.rectStartPoint.x, y: this.rectStartPoint.y };  // punto iniziale
        this.points[1] = { x: x, y: this.rectStartPoint.y };                      // punto a destra
        this.points[2] = { x: x, y: y };                                          // punto opposto
        this.points[3] = { x: this.rectStartPoint.x, y: y };                      // punto a sinistra
    }

    finishRectangle() {
        if (!this.isCreatingRect) return;
        
        this.isCreatingRect = false;
        this.rectStartPoint = null;
        this.isClosed = true;
    }

	createRectangle(x, y, width, height) {
		this.points = [];
		this.points.push({ x: x, y: y });                 // top-left
		this.points.push({ x: x + width, y: y });         // top-right
		this.points.push({ x: x + width, y: y + height}); // bottom-right
		this.points.push({ x: x, y: y + height });        // bottom-left
		this.isClosed = true;
	}

	setMode(mode) {
        this.mode = mode;
        this.points = [];  // opzionale: pulisce i punti esistenti
        this.isClosed = false;
        this.isCreatingRect = false;
    }

	// Verifica se la spezzata è chiusa
    checkIfClosed() {
        if (this.points.length < 3) return false;
        
        let first = this.points[0];
        let last = this.points[this.points.length - 1];
        let d = dist(first.x, first.y, last.x, last.y);
        
        console.log("Controllo chiusura:");
        console.log("Primo punto:", first);
        console.log("Ultimo punto:", last);
        console.log("Distanza:", d);
        
        this.isClosed = d < this.mergeThreshold;
        return this.isClosed;
    }
	
    findMergeCandidates(x, y) {
        let nearest = {
            index: -1,
            distance: Infinity
        };

        // Non considerare punti consecutivi o il punto che stiamo trascinando
        for (let i = 0; i < this.points.length; i++) {
            if (i === this.draggingIndex || 
                i === (this.draggingIndex + 1) % this.points.length || 
                i === (this.draggingIndex - 1 + this.points.length) % this.points.length) {
                continue;
            }

            let d = dist(x, y, this.points[i].x, this.points[i].y);
            if (d < nearest.distance && d < this.mergeThreshold) {
                nearest.distance = d;
                nearest.index = i;
            }
        }

        return nearest;
    }

	isPointInside(x, y) {
		if (!this.isClosed || this.points.length < 3) return false;
		if (this.isDraggingWhole) return true;  // mantieni inside solo durante il drag

		// Prima controlla se siamo vicini a qualche segmento
		let nearestSeg = this.findNearestSegment(x, y);
		if (nearestSeg.distance < this.snapThreshold * 1.5) {
			return false;  // Troppo vicino al bordo
		}
	
		// Poi controlla se siamo vicini a qualche punto
		let nearestPoint = this.findNearestPoint(x, y);
		if (nearestPoint.distance < this.snapThreshold * 1.5) {
			return false;  // Troppo vicino a un vertice
		}
	
		let inside = false;
		let j = this.points.length - 1;
	
		for (let i = 0; i < this.points.length; i++) {
			let pi = this.points[i];
			let pj = this.points[j];
	
			if (((-pi.y > -y) != (-pj.y > -y)) &&
				(x < (pj.x - pi.x) * (-y - -pi.y) / (-pj.y - -pi.y) + pi.x)) {
				inside = !inside;
			}
			j = i;
		}
	
		//console.log("Inside:", inside); // debug
		return inside;
	}
	
	setResize(width, height){
		this.width = width;
        this.height = height;
		console.log("setResize: "+width+" - "+height);
	}

	scalexy() {		
		//console.log("scalexy: "+this.mouseX+" - "+this.mouseY);
		if(boardData[currBoardId].radarData.rot){// calcola il passaggio dei vertici dal riferimento ruotato al non ruotato
			this.mouseX = -(this.sketch.mouseX - this.width /2);
			this.mouseY = this.sketch.mouseY;
		}else{
			//console.log("scalexy: "+mouseX+" - "+mouseY);
			this.mouseX = this.sketch.mouseX - this.width /2;
			this.mouseY = this.height - this.sketch.mouseY;
		}
    }

    addPoint(x, y) {
		if (this.isClosed) {
			console.log("Curva chiusa - non si possono aggiungere punti");
			return;
		}
		this.points.push({ x: x, y: y });
	}
	
	insertPoint(index, x, y) {
		if (this.isClosed) {
			console.log("Curva chiusa - non si possono inserire nuovi punti");
			return;
		}
		this.points.splice(index, 0, { x: x, y: y });
	}

    // Rimuove un punto dalla spezzata
    removePoint(index) {
		if (!this.editMode) return;
        if (index >= 0 && index < this.points.length) {
            this.points.splice(index, 1);
        }
    }

	removeLastPoint(){
		this.removePoint(this.points.length - 1);// rimuovi l'ultimo
	}

	mousePressed() {
		console.log("Mouse pressed 1");
        if (this.points.length === 0 && this.sketch.mouseButton === this.sketch.LEFT && !this.editMode) {
            this.startEditing();
        }
        if (Math.abs(this.mouseX) > this.width/2 || this.mouseY < 0) return;
        
        if (!this.editMode) return;
        this.scalexy();
    
        if (this.points.length === 0 && this.sketch.mouseButton === this.sketch.LEFT) {
            this.isCreatingRect = true;
            this.rectStartPoint = { x: this.mouseX, y: this.mouseY };
            
            let initialSize = 40;
            this.points = [
                { x: this.mouseX, y: this.mouseY + initialSize },
                { x: this.mouseX + initialSize, y: this.mouseY + initialSize},
                { x: this.mouseX + initialSize, y: this.mouseY },
                { x: this.mouseX, y: this.mouseY }
            ];
            this.isClosed = true;
            this.isCreatingRect = false;
    
            this.sketch.cursor('grab');
            return;
        }
    
        if (this.isClosed) {
            let isInside = this.isPointInside(this.mouseX, this.mouseY);
            if (isInside) {
                this.isDraggingWhole = true;
                this.dragStartX = this.mouseX;
                this.dragStartY = this.mouseY;
                this.sketch.cursor('grab');
                return;
            }
        }
    
        let nearestPoint = this.findNearestPoint(this.mouseX, this.mouseY);
    
        if (this.sketch.mouseButton === this.sketch.LEFT) {
            const currentTime = this.sketch.millis();
            if (nearestPoint.distance < this.snapThreshold && !this.isScalingRect) {
                if (currentTime - this.lastClickTime < this.doubleClickDelay) {
                    if (this.points.length > 3) {
                        this.points.splice(nearestPoint.index, 1);
                        this.lastClickTime = 0;
                        return;
                    }
                } else {
                    this.lastClickTime = currentTime;
                }
            }
    
            if (nearestPoint.distance < this.snapThreshold) {
                this.draggingIndex = nearestPoint.index;
                
                if (this.isScalingRect) {
                    this.oppositeIndex = (this.draggingIndex + 2) % 4;
                    this.oppositePoint = { ...this.points[this.oppositeIndex] };
                }
                
                this.dragOffsetX = this.mouseX - this.points[nearestPoint.index].x;
                this.dragOffsetY = this.mouseY - this.points[nearestPoint.index].y;
                this.sketch.cursor('grab');
                return;
            }
    
            if (!this.isScalingRect) {
                let nearestSeg = this.findNearestSegment(this.mouseX, this.mouseY);
                if (nearestSeg.distance < this.snapThreshold) {
                    this.insertPoint(nearestSeg.index + 1, nearestSeg.point.x, nearestSeg.point.y);
                    this.draggingIndex = nearestSeg.index + 1;
                    this.dragOffsetX = this.mouseX - nearestSeg.point.x;
                    this.dragOffsetY = this.mouseY - nearestSeg.point.y;
                    this.sketch.cursor('grab');
                    return;
                }
    
                if (!this.isClosed) {
                    this.addPoint(this.mouseX, this.mouseY);
                    this.draggingIndex = -1;
					this.sketch.cursor(ARROW);
                }
            }
        }
    }

    mouseDragged() {
        if (!this.editMode) return;
        this.scalexy();
        let retp = [];
    
        if (this.isDraggingWhole) {
            let dx = this.mouseX - this.dragStartX;
            let dy = this.mouseY - this.dragStartY;
            
            for (let point of this.points) {
                point.x += dx;
                point.y += dy;
            }
            
            this.dragStartX = this.mouseX;
            this.dragStartY = this.mouseY;
            this.sketch.cursor('grabbing');
        } else if (this.draggingIndex >= 0) {
            if (this.isScalingRect) {
                const dragPoint = this.points[this.draggingIndex];
                const oppositeIndex = (this.draggingIndex + 2) % 4;
                const oppositePoint = this.points[oppositeIndex];

                const newX = this.mouseX - this.dragOffsetX;
                const newY = this.mouseY - this.dragOffsetY;

                if (this.draggingIndex === 0 || this.draggingIndex === 2) {
                    dragPoint.x = newX;
                    dragPoint.y = newY;
                    
                    const nextIndex = (this.draggingIndex + 1) % 4;
                    const prevIndex = (this.draggingIndex + 3) % 4;
                    
                    this.points[nextIndex].x = oppositePoint.x;
                    this.points[nextIndex].y = dragPoint.y;
                    this.points[prevIndex].x = dragPoint.x;
                    this.points[prevIndex].y = oppositePoint.y;
                } else {
                    dragPoint.x = newX;
                    dragPoint.y = newY;
                    
                    const nextIndex = (this.draggingIndex + 1) % 4;
                    const prevIndex = (this.draggingIndex + 3) % 4;
                    
                    this.points[nextIndex].x = dragPoint.x;
                    this.points[nextIndex].y = oppositePoint.y;
                    this.points[prevIndex].x = oppositePoint.x;
                    this.points[prevIndex].y = dragPoint.y;
                }
            } else {
                this.points[this.draggingIndex].x = this.mouseX - this.dragOffsetX;
                this.points[this.draggingIndex].y = this.mouseY - this.dragOffsetY;
            }
            this.sketch.cursor('grabbing');
        }
        return this.getPointsInMeters(); 
    }

	mouseReleased() {
        if (!this.editMode) return;
        
        if (this.draggingIndex >= 0) {
            this.checkForMerge();
        }
        
        this.draggingIndex = -1;
        this.isDraggingWhole = false;
        this.sketch.cursor(this.sketch.ARROW);
    }
	
	// Modifichiamo anche insertPoint per permettere sempre l'inserimento
	insertPoint(index, x, y) {
		// Rimuoviamo il controllo this.isClosed
		this.points.splice(index, 0, { x: x, y: y });
	}
	
	// addPoint rimane bloccato per curve chiuse
	addPoint(x, y) {
		if (this.isClosed) {
			console.log("Curva chiusa - non si possono aggiungere nuovi punti alla fine");
			return;
		}
		this.points.push({ x: x, y: y });
	}
	
	 // Trova il punto più vicino alla posizione del mouse
    findNearestPoint(x, y) {
        let nearest = {
            index: -1,
            distance: Infinity
        };

        for (let i = 0; i < this.points.length; i++) {
            let d = this.sketch.dist(x, y, this.points[i].x, this.points[i].y);
            if (d < nearest.distance) {
                nearest.distance = d;
                nearest.index = i;
            }
        }

        return nearest;
    }

	// Nuovo metodo per controllare e gestire le unioni
    checkForMerge() {
        if (this.points.length < 3) return;

        let dragPoint = this.points[this.draggingIndex];
        
        // Prima controlla se stiamo chiudendo la curva
        if (!this.isClosed) {
            let firstPoint = this.points[0];
            let d = this.sketch.dist(dragPoint.x, dragPoint.y, firstPoint.x, firstPoint.y);
            
            if (d < this.mergeThreshold && this.draggingIndex !== 0) {
                console.log("Chiusura curva");
                this.isClosed = true;
                return;
            }
        }

        // Poi controlla altre possibili unioni se la curva è già chiusa
        if (this.isClosed) {
            for (let i = 0; i < this.points.length; i++) {
                if (i === this.draggingIndex) continue;
                
                let point = this.points[i];
                let d = this.sketch.dist(dragPoint.x, dragPoint.y, point.x, point.y);
                
                if (d < this.mergeThreshold) {
                    console.log(`Unione punti ${this.draggingIndex} e ${i}`);
                    // Unisci i punti alla posizione media
                    let midX = (this.points[this.draggingIndex].x + this.points[i].x) / 2;
                    let midY = (this.points[this.draggingIndex].y + this.points[i].y) / 2;
                    this.points[this.draggingIndex].x = midX;
                    this.points[this.draggingIndex].y = midY;
                    this.points[i].x = midX;
                    this.points[i].y = midY;
                    return;
                }
            }
        }
    }

	findNearestClosedCurve(point) {
		console.log("\nPunto trascinato:");
		console.log("- Originale:", point);
		console.log("- Punto zero di riferimento: (0,0)");
		
		for (let i = 0; i < this.points.length; i++) {
			if (i === this.draggingIndex) continue;
			
			let curvePoint = this.points[i];
			let d = this.sketch.dist(point.x, point.y, curvePoint.x, curvePoint.y);
			
			console.log(`\nConfrontando con punto ${i}:`);
			console.log("- Originale:", curvePoint);
			console.log("- Distanza:", d);
			
			if (d < this.mergeThreshold) {
				console.log("MATCH TROVATO!");
				return i;
			}
		}
		return -1;
	}
	
	mergeCurves(index1, index2) {
        console.log("\nTentativo di unione tra i punti", index1, "e", index2);
        console.log("isClosed:", this.isClosed);
        console.log("Punti prima dell'unione:", this.points);
        
        // Non controlliamo più this.isClosed qui
        let newPoints = [];
        
        // Aggiungi i punti nella nuova sequenza
        for (let i = 0; i <= index1; i++) {
            newPoints.push({...this.points[i]});
        }
        
        let j = index2;
        while (j < this.points.length) {
            newPoints.push({...this.points[j]});
            j++;
        }
        j = 0;
        while (j < index2) {
            newPoints.push({...this.points[j]});
            j++;
        }

        console.log("Punti dopo l'unione:", newPoints);
        this.points = newPoints;
        this.isClosed = true;  // La curva risultante sarà chiusa
    }
	
	rotablePoint(p){
		let q = {x:0, y:0};
		if(boardData[currBoardId].radarData.rot){// calcola il passaggio dei vertici dal riferimento ruotato al non ruotato
			let px = -p.x;
			let py = this.height - p.y;
			q = {x:px, y:py};
		}else{
			q = {x:p.x, y:p.y};
		}
		//console.log("q: "+q.x+" - "+q.y);
		return q;
	}

	checkInside(x, y) {
		if (!this.isClosed || this.points.length < 3) return false;
	
		let inside = false;
		let j = this.points.length - 1;
	
		for (let i = 0; i < this.points.length; i++) {
			let pi = this.points[i];
			let pj = this.points[j];
	
			if (((-pi.y > -y) != (-pj.y > -y)) &&
				(x < (pj.x - pi.x) * (-y - -pi.y) / (-pj.y - -pi.y) + pi.x)) {
				inside = !inside;
			}
			j = i;
		}
	
		return inside;
	}

	draw() {
		if(this.enabled || this.editMode && this.points.length>0){
			this.scalexy();
			//console.log("this.mouseX: "+this.mouseX+" this.mouseY: "+this.mouseY);
			//circle(mouseX, mousey, this.mergeThreshold * 2);
			//circle(this.mouseX, -this.mousey, this.mergeThreshold * 2);
			// Prima disegniamo l'evidenziazione se il mouse è dentro
			if (this.editMode && this.isClosed) {
				if (this.isPointInside(this.mouseX, this.mouseY) || this.isDraggingWhole) {
					this.sketch.fill(this.areaColor);
					this.sketch.noStroke();
					this.sketch.beginShape();
					// disegna i punti
					for (let point of this.points) {
						let pp = this.rotablePoint(point);
						this.sketch.vertex(pp.x, pp.y);
					}
					this.sketch.endShape(this.sketch.CLOSE);
					this.sketch.cursor('grab');
				}
			}
			// Disegna la spezzata principale
			this.sketch.stroke(this.areaColor);
			this.sketch.strokeWeight(2);
			if(this.report){
				this.sketch.fill(this.areaColor);
			}else{
				this.sketch.noFill();
			}
			this.sketch.beginShape();
			for (let point of this.points) {
				let pp = this.rotablePoint(point);
				this.sketch.vertex(pp.x, -pp.y);
			}
			if (this.isClosed && this.points.length > 0) {
				let init = this.rotablePoint(this.points[0]);
				this.sketch.vertex(init.x, -init.y);
			}
			this.sketch.endShape();
		
			// Debug info
			if (this.editMode) {

				// Disegna i vertici
				for (let i = 0; i < this.points.length; i++) {
					let point = this.points[i];
					let pp = this.rotablePoint(point);
					
					// Evidenzia il punto se è quello selezionato
					if (i === this.draggingIndex) {
						this.sketch.fill(this.areaColor);
					} else {
						// Controlla se il mouse è sopra questo punto e abbiamo abbastanza punti
						let d = this.sketch.dist(this.mouseX, this.mouseY, pp.x, -pp.y);
						if (d < this.snapThreshold && this.points.length > 3) {
							this.sketch.fill(255, 165, 0);  // arancione per indicare che può essere eliminato
						} else {
							this.sketch.fill(this.areaColor);
						}
					}
					
					this.sketch.noStroke();
					this.sketch.circle(pp.x, -pp.y, this.vertexRadius * 2);
					
					// Mostra indici e coordinate dei punti
					this.sketch.fill(255);
					let pm = this.getPointInMeters(point);
					this.sketch.textAlign(this.sketch.CENTER, this.sketch.BOTTOM);
					this.sketch.text(`${i}`, pp.x, -(pp.y - this.vertexRadius));
					this.sketch.textAlign(this.sketch.LEFT, this.sketch.CENTER);
					this.sketch.text(`(${pm.x.toFixed(2)}, ${pm.y.toFixed(2)})`, pp.x + 10, -pp.y);
				}
		
				// Se stiamo trascinando un punto
				if (this.draggingIndex >= 0) {
					let current = this.rotablePoint(this.points[this.draggingIndex]);
					
					// Cerchio di aggancio
					this.sketch.noFill();
					this.sketch.stroke(200);
					this.sketch.strokeWeight(1);
					this.sketch.circle(current.x, -current.y, this.mergeThreshold * 2);
					
					// Mostra distanze dai punti vicini
					for (let i = 0; i < this.points.length; i++) {
						if (i !== this.draggingIndex) {
							let other = this.points[i];
							let d = this.sketch.dist(current.x, current.y, other.x, other.y);
							if (d < this.mergeThreshold * 2) {
								this.sketch.stroke(0, 255, 0);
								this.sketch.line(current.x, -current.y, other.x, -other.y);
								this.sketch.fill(255);
								this.sketch.noStroke();
								this.sketch.text(`d: ${d.toFixed(1)}`, 
									(current.x + other.x)/2, 
									-(current.y + other.y)/2);
							}
						}
					}
				}		
			} else {
				this.sketch.fill(0);
				this.sketch.noStroke();
				this.sketch.textAlign(this.sketch.LEFT, this.sketch.TOP);
				this.sketch.text(`Edit Mode OFF (Enter to resume) - ${this.isClosed ? 'Closed' : 'Open'} curve`, 10, 10);
			}
			// Se c'è un'etichetta e la curva è chiusa, mostrala al centro
			if (this.isClosed && this.label) {
				let centerX = 0, centerY = 0;
				for (let point of this.points) {
					let pp = this.rotablePoint(point);
					centerX += pp.x;
					centerY += pp.y;
				}
				centerX /= this.points.length;
				centerY /= this.points.length;

				this.sketch.fill(this.areaColor);
				this.sketch.noStroke();
				this.sketch.textAlign(this.sketch.CENTER, this.sketch.CENTER);
				this.sketch.textSize(16);
				this.sketch.text(this.label, centerX, -centerY);
			}
		}
	}

    // Restituisce l'array dei punti
    getPoints() {
        return this.points;
    }

	getPointsInMeters() {
		let arr = [];
		if(this.points.length > 0){
			arr = this.points.map((p)=>{
				let x = this.mapInverse(p.x, -this.width/2, this.width/2,-this.radiusx, this.radiusx);
				let y = this.mapInverse(p.y, 0, -this.height, 0, -this.radiusy);
				return  [x, y];
			});
			if(this.isScalingRect){
				
				//arr = [[arr[0][0], arr[0][1]], [arr[2][0], arr[2][1]]];
				arr = [[arr[1][0], arr[1][1]], [arr[3][0], arr[3][1]]];
			}
		}
		return arr;
    }

	importPointsInMeters(list, scale=1){
		console.log("imports "+this.label);
		console.log(this.points);
		this.points = []; // va quà, vanno scritte anche le liste vuote
		if (list.length != 0){
			let parr = list.map((p) => {	
				let xv = Number(p[0])*scale;
				let yv = Number(p[1])*scale;
				return this.getPointInPixel({x: xv, y: yv}); 
			});
			//this.isCreatingRect = true;
			this.rectStartPoint = parr[0];
			if(!this.isScalingRect){
				this.points = parr;
			}else{
				this.points = [{x: parr[0].x, y: parr[0].y}, {x: parr[1].x, y: parr[0].y}, {x: parr[1].x, y: parr[1].y},{x: parr[0].x, y: parr[1].y}];
				console.log("rect");
			}	
			console.log(this.points);
			console.log(parr);
			this.isClosed = true;  // impostiamo subito isClosed a true
			//this.isCreatingRect = false;  // non serve più, il rettangolo è già creato
			this.editMode = false;
		}
	}

	getPointInMeters(p) {
		let xx = this.mapInverse(p.x, -this.width/2, this.width/2, -this.radiusx, this.radiusx);
		let yy = this.mapInverse(p.y, 0, -this.height, 0, -this.radiusx);
        return { x: xx, y: yy*this.ratio };
    }

	getPointInPixel(p) {
		let xx = this.map2(p.x, -this.radiusx, this.radiusx, -this.width/2, this.width/2);
		let yy = this.map2(p.y, 0, -this.radiusx*this.ratio, 0, -this.height);
        return { x: xx, y: yy };
    }

    // Imposta un nuovo array di punti
    setPoints(points) {
		if (!this.editMode) return;
        this.points = points;
    }
	
	startEditing() {
        this.editMode = true;
    }

    stopEditing() {
        this.editMode = false;
        this.draggingIndex = -1;
        this.sketch.cursor(this.sketch.ARROW);
    }

    toggleEditing() {
        if (this.editMode) {
            this.stopEditing();
        } else {
            this.startEditing();
        }
    }

    isEditing() {
        return this.editMode;
    }
	
	// Calcola la distanza tra un punto e un segmento
    distanceToSegment(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const len_sq = C * C + D * D;
        let param = -1;

        if (len_sq != 0) param = dot / len_sq;

        let xx, yy;

        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = px - xx;
        const dy = py - yy;
        return {
            distance: Math.sqrt(dx * dx + dy * dy),
            point: { x: xx, y: yy }
        };
    }

    findNearestSegment(x, y) {
		let nearest = {
			index: -1,  // Indice del primo punto del segmento
			distance: Infinity,
			point: null
		};
	
		// Numero di segmenti da controllare
		let numSegments = this.isClosed ? this.points.length : this.points.length - 1;
	
		for (let i = 0; i < numSegments; i++) {
			const p1 = this.points[i];
			// Se è l'ultimo segmento di una curva chiusa, collega con il primo punto
			const p2 = this.points[(i + 1) % this.points.length];
			
			const result = this.distanceToSegment(x, y, p1.x, p1.y, p2.x, p2.y);
	
			if (result.distance < nearest.distance) {
				nearest.distance = result.distance;
				nearest.index = i;
				nearest.point = result.point;
			}
		}
	
		return nearest;
	}
	/*
	Riassumiamo le funzionalità che abbiamo implementato:

Editing base:

Aggiunta punti
Drag dei singoli vertici
Inserimento punti sui segmenti
Rimozione punti con doppio click


Gestione curva chiusa:

Chiusura automatica quando i punti si avvicinano
Drag dell'intera area cliccando all'interno
Area evidenziata al passaggio del mouse
Zona "buffer" vicino ai bordi per evitare conflitti


Feedback visivo:

Colore personalizzabile dell'area
Etichetta al centro
Indicatori di distanza
Evidenziazione punti selezionabili
Cursori appropriati per le varie azioni


Salvataggio e caricamento:

Salvataggio configurazione completa
Caricamento da dati salvati
Persistenza di colori ed etichette
	*/
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
/*
function updateBoardUI(boardID) {
   
    let timestampElement = document.getElementById(`timestamp-${boardID}`);
    timestampElement.innerthis.sketch.text = convertDateTimeToHumanReadable(boardData[boardID].timestamp) + "   -   FW version: " + boardData[boardID].fw;

    let sensorDataElement = document.getElementById(`sensorData-${boardID}`);
    sensorDataElement.querySelector('.temp').innerthis.sketch.text = `${boardData[boardID].tempData.temp} °C`;
    sensorDataElement.querySelector('.press').innerthis.sketch.text = `${boardData[boardID].tempData.press} Pa`;
    sensorDataElement.querySelector('.hum').innerthis.sketch.text = `${boardData[boardID].tempData.hum} %`;
    sensorDataElement.querySelector('.gas').innerthis.sketch.text = `${boardData[boardID].tempData.gas}`;
    sensorDataElement.querySelector('.visible').innerthis.sketch.text = `${boardData[boardID].luxData.visible} Lux`;
    sensorDataElement.querySelector('.infrared').innerthis.sketch.text = `${boardData[boardID].luxData.infrared} Lux`;
    sensorDataElement.querySelector('.total').innerthis.sketch.text = `${boardData[boardID].luxData.total} Lux`;
}
*/
// Creazione funzione di setup e loop di disegno di ogni canvas
function createCanvasInstances(boardID) {
    new p5(function(sketch) {
		sketch.width;
        sketch.height;
        sketch.radius;
        sketch.radiusx;
        sketch.radiusy;

        sketch.setup = function() {
            let container = document.getElementById(`radar-${boardID}`);
            let width = container.offsetWidth * 0.988;
            let height = width * 1.2 / 2;
			sketch.radius = 10;
			sketch.width = width;
        	sketch.height = height;
			sketch.radiusx = sketch.radius;
            sketch.radiusy = sketch.radiusx * sketch.height / sketch.width * 2;

			console.log("width: "+width);
			console.log("height: "+height);

			let r = boardData[boardID].radarData.regions;
			const colors = [
				sketch.color(255, 182, 193, 100), // LightPink     #FFB6C1
				sketch.color(173, 216, 230, 100), // LightBlue     #ADD8E6
				sketch.color(144, 238, 144, 100), // LightGreen    #90EE90
				sketch.color(255, 218, 185, 100), // PeachPuff     #FFDAB9
				sketch.color(221, 160, 221, 100), // Plum          #DDA0DD
				sketch.color(176, 196, 222, 100), // LightSteelBlue #B0C4DE
				sketch.color(255, 160, 122, 100), // LightSalmon   #FFA07A
				sketch.color(152, 251, 152, 100), // PaleGreen     #98FB98
				sketch.color(135, 206, 235, 100)  // SkyBlue       #87CEEB
			];
			console.log("INIT DAR: ");
			r.dar = [
				new PolylineEditor([], width, height, colors[0], "Area 1", sketch.radius, sketch),
				new PolylineEditor([], width, height, colors[1], "Area 2", sketch.radius, sketch),
				new PolylineEditor([], width, height, colors[2], "Area 3", sketch.radius, sketch),
				new PolylineEditor([], width, height, colors[3], "Area 4", sketch.radius, sketch),
				new PolylineEditor([], width, height, colors[4], "Area 5", sketch.radius, sketch),
				new PolylineEditor([], width, height, colors[5], "Area 6", sketch.radius, sketch),
				new PolylineEditor([], width, height, colors[6], "Area in 1", sketch.radius, sketch, true),
				new PolylineEditor([], width, height, colors[7], "Area in 2", sketch.radius, sketch, true),
				new PolylineEditor([], width, height, colors[8], "Area in 3", sketch.radius, sketch, true),
			];
		
			for(i=0; i< r.dar.length; i++){
				r.dar[i].enabled = Number(r.enabled[i]);
				r.shape[i] = Number(r.dar[i].isScalingRect);
			}	

            canvas = sketch.createCanvas(width, height).parent(container);
        };
    
        sketch.draw = function() {
            sketch.background(0);
            sketch.translate(sketch.width / 2, sketch.height); // Sposta l'origine in basso al centro
            
			let r = boardData[boardID].radarData.regions;
			for(i=0; i<9; i++){
				r.dar[i].draw();
				r.dar[i].setReport(r.ntarget[i]);
			}
			drawGrid(sketch);
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

					if(boardData[boardID].radarData.rot){
						// Scala i valori per adattarli allo schermo
						scaledX = sketch.map(x, sketch.radiusx, -sketch.radiusx, -sketch.width/2 , sketch.width/2 );
						scaledY = sketch.map(y, sketch.radiusy, 0, 0, -sketch.height);
					}else{
						scaledX = sketch.map(x, -sketch.radiusx, sketch.radiusx, -sketch.width/2, sketch.width/2 );
						scaledY = sketch.map(y, 0, sketch.radiusy, 0, -sketch.height);
					}
					// Disegna il punto
					sketch.fill(0, 255, 0);
					sketch.noStroke();
					if(scaledX || scaledY && scaledY != -sketch.height ){
						sketch.ellipse(scaledX, scaledY, 10, 10);
						// Etichette
						sketch.fill(255);
						sketch.textSize(12);
						sketch.text(`X: ${x}`, scaledX + 5, scaledY - 20);
						sketch.text(`Y: ${y}`, scaledX + 5, scaledY - 10);
					}        
				}
			}
        };
        
        sketch.windowResized = function () {
            let container = document.getElementById(`radar-${boardID}`);
            let width = container.offsetWidth * 0.988;
            let height = width * 1.1 / 2;

            sketch.resizeCanvas(width, height);
			let r = boardData[boardID].radarData.regions;

			for(i=0; i<9; i++){
				r.dar[i].setResize(width, height); 
			}
        };

		sketch.mousePressed = function() {
			let r = boardData[boardID].radarData.regions;
			let plns = r.polilines;
			let selectedRectangle = r.selected -1;
			//console.log("selectedRectangle mousePressed: "+selectedRectangle);
			r.dar[selectedRectangle].mousePressed();
			plns[selectedRectangle] = r.dar[selectedRectangle].getPointsInMeters();
		}
		
		sketch.mouseDragged = function() {
			let r = boardData[boardID].radarData.regions;
			let selectedRectangle = r.selected -1;
			let plns = r.polilines;
			plns[selectedRectangle] = r.dar[selectedRectangle].mouseDragged();
			//console.log("selRect "+plns[selectedRectangle]);
		}

		sketch.mouseReleased = function() {
			let r = boardData[boardID].radarData.regions;
			let plns = r.polilines;
			let selectedRectangle = r.selected -1;
			//console.log("selectedRectangle released: "+selectedRectangle);
			r.dar[selectedRectangle].mouseReleased();
			plns[selectedRectangle] = r.dar[selectedRectangle].getPointsInMeters();
		}

		// Opzionale: rimuove l'ultimo punto quando si preme il tasto 'z'
		sketch.keyPressed = function () {
			console.log("key: "+sketch.key);
			let r = boardData[currBoardId].radarData.regions;
			let selectedRectangle = r.selected -1;
			let editor = r.dar[selectedRectangle];
			if (sketch.key === 'z' || sketch.key === 'Z') {
				editor.removeLastPoint();
			}else if(sketch.key ==='Escape'){
				console.log("Escape ");
				editor.stopEditing();
			}else if(sketch.key ==='Enter'){
				console.log("Enter ");
				editor.startEditing();
			}else if(sketch.key ==='Backspace'){
				console.log("Backspace ");
				editor.toggleEditing();
			}else if(sketch.key ==='Delete' || sketch.key ==='d' || sketch.key ==='D'){
				// Se ci sono punti da cancellare
				editor.clearFigure();
			}else if(sketch.key ==='r' || sketch.key ==='R'){
				editor.approximateToRectangle();
			}	
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
	let selectedRectangle = r.selected -1;// recupera la selezione dell'utente
	dataentry[0].value = roundTo(r.enabled[selectedRectangle], 1);// imposta solo quelli selezionati dall'utente!!!
	dataentry[1].value = roundTo(r.type[selectedRectangle], 1);// imposta solo quelli selezionati dall'utente!!!
	dataentry[2].value = roundTo(r.radarmode[selectedRectangle], 1);// imposta solo quelli selezionati dall'utente!!!
}
