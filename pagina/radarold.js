
//const myboard = 'micropython-weather-01seba0264e833638ff4'
//const broker = 'wss://proxy.marconicloud.it:8884'; // Sostituisci con l'URL del tuo broker MQTT e assicurati che utilizzi wss (WebSocket Secure) se necessario
//const topic = 'radar/misure'; // Sostituisci con il tuo topic MQTT
    
// data structure where the measurements sent by the device via MQTT (PUSH mode) are stored
var boardData = {/*
				radarData: {
					x: [0, 0, 0, 0, 0],
					y: [0, 0, 0, 0, 0],
					rot: 0,
					fw: [0, 0],
					radarmode: 0,
					regions: {
						narea: [1, 2, 3],
						ntarget: [0, 0, 0],
						type: [0, 0, 0],
						x0: [0, 0, 0],
						y0: [0, 0, 0],
						x1: [0, 0, 0],
						y1: [0, 0, 0],
						color: [[255, 0, 0, 127], [0, 255, 0, 127], [0, 0, 255, 127]],
						enabled: [1, 1, 0],
						selected: 0,
						xnr0: [0, 0, 0],
						ynr0: [0, 0, 0],
						xnr1: [0, 0, 0],
						ynr1: [0, 0, 0],
					}
				},
				*/
				radarData: {
					x: [0, 1, 0, 0, 0],
					y: [2, 3, 0, 0, 0],
					rot: 0,
					fw: [0, 0],
					radarmode: 3,
					regions: {
						narea: [1, 2, 3],
						ntarget: [1, 1, 0],
						type: [0, 0, 0],
						x0: [1, 2, 0],
						y0: [4, 5, 0],
						x1: [3, 4, 0],
						y1: [2, 3, 0],
						color: [[255, 0, 0, 127], [0, 255, 0, 127], [0, 0, 255, 127]],
						enabled: [1, 1, 0],
						selected: 0,
						xnr0: [0, 0, 0],
						ynr0: [0, 0, 0],
						xnr1: [0, 0, 0],
						ynr1: [0, 0, 0],
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
			
var fw = "";
var n = [0, 0, 0, 0]
var width;
var height;

function alertUser(color){
	let connstate = document.getElementById(`connstate`);
	let msg = connstate.querySelector('.connmsg');
	msg.style.backgroundColor = color;
	msg.style.color = "white";
	if(color=="green"){
		msg.value = "MQTT ON";
	}else{
		msg.value = "MQTT OFF";
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

function alertUserIot(color){
	let iotstate = document.getElementById(`iotstate`);
	let iotmsg = iotstate.querySelector('.iotmsg');
	iotmsg.style.backgroundColor = color;
	iotmsg.style.color = "white";
	if(color=="green"){
		iotmsg.value = "Iot ON";
	}else{
		iotmsg.value = "Iot OFF";
	}
}
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
				fw = value;
			},
			polltime: (value) => {
				boardData.polltime = Number(value);
				if(!boardData.timer){
					boardData.timer = new MonostableTimer(boardData.polltime*2, ()=>{
						let iotstate = document.getElementById(`iotstate`);
						let iotmsg = iotstate.querySelector('.iotmsg');
						iotmsg.style.backgroundColor = "red";
						iotmsg.style.color = "white";
						iotmsg.value = "Iot OFF";
					});
				}
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
				setElem("radarmode", '', '');
			},
			radarfactory: () => {
				console.log('radarfactory radar');
				setElem("radarfactory", "", '.rep');
			},
			radarstate: (value) => {
				console.log('radarstate receive');
				setElem("radarstate", value,'.rep');
			},
			regions: (value) => {
				console.log('regions receive ', value);
				// update boardData region from state feedback
				let r = boardData.radarData.regions;
				r.x0 = value.x0.map(Number);
				r.y0 = value.y0.map(Number);
				r.x1 = value.x1.map(Number);
				r.y1 = value.y1.map(Number);
				r.narea = value.narea.map(Number);
				r.type = value.type.map(Number);
				r.enabled = value.enabled.map(Number);

				console.log('regions receive ENABLED', r.enabled);
				setElem("areaenable", '', '');
				setElem("areatypesel", '', '');
				setElem("areavertices", '', '');
				setElem("areasel", '', '');
				setElem("areaenable", '', '');
				expandBoardDataRegion();
				updateInputsFromBoardDataRegion();
				updateBoardUI();
			},
		},
		timestamp: () => {
			
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
alertUserIot("red");

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
		   alertUser("green");
		   pubReadAtt(boardId, "allstate");
		});

		client.on('offline', (err) => {
			console.error(`Error with MQTT broker ${brokerUrl}`);
			// Handle error, optionally switch to the next broker
			alertUser("red");
			switchToNextBroker();
		});
		
		client.on('error', (error) => {
			console.error('Errore di connessione MQTT:', error);
			//switchToNextBroker();
			alertUser("red");
		});
		
		client.on('close', () => {
			console.log('Connessione MQTT chiusa');
			//switchToNextBroker();
			alertUser("red");
		});
		
		client.on('message', (topic, message) => {
			let data = JSON.parse(message.toString());
			let boardID = data.boardID;
			
			if(boardID == boardId){
				currBoardId = boardID;
				
				console.log('Topic:', topic);
				console.log('Pushtopic:', pushtopic);
				console.log('Statetopic:', statetopic);
				alertUser("green");
				
				if( topic === pushtopic){	   
					// Update the data structure for this boardId. 
					// Radar measurements are read periodically by the canvas draw() function 
					// The sensor data are immediately printed on the output boxes by the updateBoardUI() function.
					try{
						val = data.measures.radar
						if ('null' != val){
							boardData.radarData.x = roundArrTo(getFieldIfExists(val,'x'), 2);
							boardData.radarData.y = roundArrTo(getFieldIfExists(val,'y'), 2);
							boardData.radarData.regions.ntarget = val.n.map(Number);
							alertUserIot("green");
							if(boardData.timer){
								boardData.timer.start();
							}
						}
						val = data.measures.tempSensor
						if ('null' != val){
							boardData.tempData = {
								temp: roundTo(getFieldIfExists(val,'temp'), 2),
								press: roundTo(getFieldIfExists(val,'press'), 1),
								hum: roundTo(getFieldIfExists(val,'hum'), 2),
								gas: roundTo(getFieldIfExists(val,'gas'), 1),
							};
						}
						val = data.measures.luxSensor
						if ('null' != val){
							boardData.luxData = {
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
					updateBoardUI();
				}else if(topic === statetopic){	
					console.log('State msg rcv:', data);
					let ms = ["state"];
					processJson(commandMap, data, [], ms);
					//processJson(commandMap, data);	// Aggiorna l'interfaccia utente con gli stati (sono asincroni e singoli)	
				}
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
setInputListeners();
expandBoardDataRegion();// for local test only

// window.onload = pubReadAtt(boardId, "allState");
		
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
function setElem(type, val, target='.send'){
	console.log('type', type);
	console.log('val', val);
	console.log('str', `${type}`);
	let elem = document.getElementById(`${type}`);
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

// Bind command listeners to input elements
function setInputListeners() {
    let poll1div = document.getElementById('poll1');// Trova l'id del contenitore grid degli input
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
		pubAtt("polltime", milliseconds, boardId, "write");
		poll1div.style.backgroundColor = "#E67E22"; // activate the wait signal for command feedback
	}
	/// RADAR SERIAL VEL SETTING ///////////////////////////////////////////////////////////////////////////////////////
	let servel = document.getElementById('servel');// Trova l'id del contenitore grid degli input
	let servelsend = servel.querySelector('.send');// Trova la classe dell'oggetto di input che riceve l'evento utente
	let servelval = servel.querySelector('.servel');// Trova la classe dell'oggetto di input da leggere ogni evento utente
	servelsend.onclick = () => {
		const serValue = servelval.value;	
		console.log('serValue', serValue);
		pubAtt("servel", serValue, boardId, "write");
		servel.style.backgroundColor = "#E67E22"; // activate the wait signal for command feedback
	}
	/// RADAR MODE  ///////////////////////////////////////////////////////////////////////////////////////
	let radarmode = document.getElementById('radarmode');// Trova l'id del contenitore grid degli input
	let radarmodesel = radarmode.querySelector('.sel');
	let radarmodesend = radarmode.querySelector('.send');// Trova la classe dell'oggetto di input che riceve l'evento utente
	radarmodesend.onclick = () => {
		val = radarmodesel.value;
		pubAtt("radarmode", val, boardId, "write");
		radarmode.style.backgroundColor = "#E67E22"; // activate the wait signal for command feedback	
	}
	/// RADAR AREA FACTORY  ///////////////////////////////////////////////////////////////////////////////////////
	let radarfactory = document.getElementById('radarfactory');// Trova l'id del contenitore grid degli input
	let radafactorysend = radarfactory.querySelector('.send');// Trova la classe dell'oggetto di input che riceve l'evento utente
	radafactorysend.onclick = () => {
		pubAtt("radarfactory", "1", boardId, "write");
		radarfactory.style.backgroundColor = "#E67E22"; // activate the wait signal for command feedback
	}
	/// RADAR STATE ON/OFF  ///////////////////////////////////////////////////////////////////////////////////////
	let radarstate = document.getElementById('radarstate');// Trova l'id del contenitore grid degli input
	let radarstatesend = radarstate.querySelector('.send');// Trova la classe dell'oggetto di input che riceve l'evento utente
	radarstatesend.onclick = () => {
		pubAtt("radartoggle", "1", boardId, "write");
		radarstate.style.backgroundColor = "#E67E22"; // activate the wait signal for command feedback
	}
	/// RADAR AREA CONFIG  ///////////////////////////////////////////////////////////////////////////////////////
	let x0= areavertices.querySelector('.x0');// Trova la classe dell'oggetto di input da leggere ogni evento utente
	let y0= areavertices.querySelector('.y0');
	let x1= areavertices.querySelector('.x1');
	let y1= areavertices.querySelector('.y1');
	let areatypesel = document.getElementById('areatypesel');// Trova l'id del contenitore grid degli inputlet areavertices = document.getElementById('areavertices');// Trova l'id del contenitore grid degli input
	let areaenable = document.getElementById('areaenable');// Trova l'id del contenitore grid degli input
	let areaenablesel = areaenable.querySelector('.sel');
	let areatypeselsel = areatypesel.querySelector('.sel');
	dataentry = [x0, y0, x1, y1, areaenablesel, areatypeselsel];

	let areasel = document.getElementById('areasel');
	let areaselsend = areasel.querySelector('.send');// Trova la classe dell'oggetto di input che riceve l'evento utente
	areaselsend.onclick = () => {
		// update boardData region from user input
		let r = boardData.radarData.regions;
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
			narea: boardData.radarData.regions.selected,
			type: typeval,
			enabled: enabledval,
			x0: x0.value,
			y0: y0.value,
			x1: x1.value,
			y1: y1.value,
		};			
		console.log('region send', region);
		pubAtt("region", region, boardId, "write"); //serializza e invia
		areavertices.style.backgroundColor = "#E67E22"; // activate the wait signal for command feedback
		areasel.style.backgroundColor = "#E67E22"; // activate the wait signal for command feedback
		areatypesel.style.backgroundColor = "#E67E22"; // activate the wait signal for command feedback
	}
	/// RADAR AREA ENABLE/DISABLE  ///////////////////////////////////////////////////////////////////////////////////////
	let areaselsel = areasel.querySelector('.sel');
	areaselsel.onchange = () => {
		console.log("areaselsel.onchange: "+ areaselsel.value);
		let r = boardData.radarData.regions;
		r.selected = Number(areaselsel.value);
		updateInputsFromBoardDataRegion();
	}
	/// RADAR AREA ENABLE/DISABLE  ///////////////////////////////////////////////////////////////////////////////////////
	let areaenablesend = areaenable.querySelector('.send');
	areaenablesend.onclick = () => {
		let areaenablesel = areaenable.querySelector('.sel');
		let enabled = Number(areaenablesel.value);
		
		let r = boardData.radarData.regions;
		let region = r.selected;
		if(enabled){
			console.log('areenable '+region);
			r.enabled[region-1] = 1;
			pubAtt("areaenable", region, boardId, "write"); //serializza e invia
		}else{
			console.log('areadisable '+region);
			r.enabled[region-1] = 0;
			pubAtt("areadisable", region, boardId, "write"); //serializza e invia
		}
		areaenable.style.backgroundColor = "#E67E22"; // activate the wait signal for command feedback
	}
	/// RADAR GRID INVERT ///////////////////////////////////////////////////////////////////////////////////////
	let radarinvert = document.getElementById('radarinvert');// Trova l'id del contenitore grid degli input
	let radarinvertsend = radarinvert.querySelector('.send');// Trova la classe dell'oggetto di input che riceve l'evento utente
	let radarinvertxt = radarinvert.querySelector('.txt');
	radarinvertsend.onclick = () => {
		if(boardData.radarData.rot == 0){
			boardData.radarData.rot = 1;
			radarinvertxt.value = "Ruotata";
		}else{
			boardData.radarData.rot = 0;
			radarinvertxt.value = "Non ruotata";
		}
		//doRotTransition();
	}
	/// RADAR ALL AREAS RESET ///////////////////////////////////////////////////////////////////////////////////////
	let areareset = document.getElementById('areareset');// Trova l'id del contenitore grid degli input
	let arearesetsend = areareset.querySelector('.send');// Trova la classe dell'oggetto di input che riceve l'evento utente
	arearesetsend.onclick = () => {
		console.log('areareset');
		pubAtt("areareset", 1, boardId, "write"); //serializza e invia
		areareset.style.backgroundColor = "#E67E22"; // activate the wait signal for command feedback
	}
}
// Disabilitazione area: deve sparire dalla GUI, deve essere cancellata sul radar, deve essere memorizzata sulla EEEPROM
// Abilitazione area: deve essere copiata dalla EEEPROM sul radar, deve essere aggiornata sulla GUI, deve comparire sulla GUI.

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

function expandBoardDataRegion() {	// espande nel riferimento NON ruotato
	let r = boardData.radarData.regions;
	//let selectedRectangle = r.selected-1;

	let container1 = document.getElementById('radar');
	let width1 = container1.offsetWidth*0.988;
	let height1 = width1*1.2/2;
	for(let i=0; i<3; i++){
		// rotated
		selectedRectangle = i;		
		// not rotated
		r.xnr0[selectedRectangle] = map(r.x0[selectedRectangle], -6, 6, -width1 * 0.3, width1 * 0.3);
		r.ynr0[selectedRectangle] = map(r.y0[selectedRectangle], 0, -6, 0, -height1);
		r.xnr1[selectedRectangle] = map(r.x1[selectedRectangle], -6, 6, -width1 * 0.3, width1 * 0.3);
		r.ynr1[selectedRectangle] = map(r.y1[selectedRectangle  ], 0, -6, 0, -height1);
	
		console.log("r.xnr0[i]:"+r.xnr0[selectedRectangle]);
		console.log("r.ynr0[i] :"+r.ynr0[selectedRectangle]);
		console.log("r.xnr1[i] :"+r.xnr1[selectedRectangle]);
	}
	console.log("r.ynr1[i] :"+r.ynr1[selectedRectangle]);
}

function setup() {
    // Ottieni il div contenitore
    let container = document.getElementById('radar');
    // Ottieni la larghezza e l'altezza del div contenitore
    var width = container.offsetWidth*0.988;
    //let height = width*1.1/2;
	var height = width*1.2/2;
	
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
	drawRegions();
    stroke(255);
    noFill();
	drawDistanceCircles();
	let x = 0;
	let y = 0;
	let scaledX = 0;
	let scaledY = 0;
	
	if(boardData.radarData.x){
		for (let i = 0; i < boardData.radarData.x.length; i++) {
			x = Number(boardData.radarData.x[i]);
			y = Number(boardData.radarData.y[i]);
			
			//x = 2;
			//y = 2;
		
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
			text(`X: ${x}`, scaledX + 5, scaledY - 20);
			text(`Y: ${y}`, scaledX + 5, scaledY - 10);

			//text(`X: ${x}`, scaledX + 5, scaledY - 20+boardData.radarData.rot*20);
			//text(`Y: ${y}`, scaledX + 5, scaledY - 10+boardData.radarData.rot*20);
		}
	}
}

// Disegna la griglia delle aree
function drawRegions(bid) {
    //stroke(255);
    strokeWeight(1);
	
	let r = boardData.radarData.regions;
	
	// draw areas rectangles
	for(i=0; i<3; i++){
		//console.log("r.enabled: "+ r);
		if(r.enabled[i]){
			//console.log("r: "+[r.x0[i], r.y0[i], r.x1[i], r.y1[i]]);
			// Il riferimento di stampa è il riferimento non ruotato
			if(boardData.radarData.rot){// calcola il passaggio dei vertici dal riferimento ruotato al non ruotato
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
			noFill();
			stroke(r.color[i]);
			rectMode(CORNERS);
			
			//console.log("rect: "+[scaledX0, scaledY0, scaledX1, scaledY1]);
			let x = scaledX0; // Minimo tra le coordinate X per ottenere il lato sinistro
			let y = scaledY0; // Minimo tra le coordinate Y per ottenere il lato superiore
			
			// Disegna il punto
			//fill(0, 255, 0);
		
			ellipse(scaledX0, -scaledY0, 5, 5);

			ellipse(scaledX1, -scaledY1, 5, 5);

			if (r.ntarget[i]==1) {
				// Imposta il colore di riempimento a rosso con trasparenza (alpha)
				fill(r.color[i]);  // Rosso semitrasparente (alpha=127 su 255)
			} else {
				// Imposta un colore di riempimento predefinito (ad esempio bianco)
				noFill();
			}

			// Ora, ricorda che l'asse Y è invertito con la nuova origine
			rect(x, -y, scaledX1, -scaledY1); // Disegna il rettangolo
		}
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
    const maxDistance = 10; // La distanza massima del radar
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
        text(`${rounded} m`, radius-13, -5 + boardData.radarData.rot*(20 - height));
    }
}

function resizeCanvasToDiv() {
    // Ottieni nuovamente le dimensioni del div contenitore
    let container = document.getElementById('radar');
     // Ottieni la larghezza e l'altezza del div contenitore
    let width = container.offsetWidth*0.988;
    let height = width*1.2/2;
	
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
// p5.JS listeners-----------------------------------------------------------------------------------------------------------------------------
function updateInputsFromBoardDataRegion() {
	let r = boardData.radarData.regions;
	let selectedRectangle = r.selected -1;
	dataentry[0].value = roundTo(r.x0[selectedRectangle], 1);
	dataentry[1].value = roundTo(r.y0[selectedRectangle], 1);
	dataentry[2].value = roundTo(r.x1[selectedRectangle], 1);
	dataentry[3].value = roundTo(r.y1[selectedRectangle], 1);
	dataentry[4].value = roundTo(r.enabled[selectedRectangle], 1);
	dataentry[5].value = roundTo(r.type[selectedRectangle], 1);			
}

let dragging = false;
let resizing = false;
let offsetX = 0;
let offsetY = 0;
let selectedCorner = null;
let rotated = false;

function mousePressed() {
	let scaledX = 0;
	let scaledY = 0;
	let r = boardData.radarData.regions;
	let selectedRectangle = r.selected -1;
	let rect = [];	
	
	// passaggio dell'input del mouse al riferimento non ruotato
	scaledX = mouseX - width /2;
	scaledY = height - mouseY;
	
	if(boardData.radarData.rot){
		// traduzione del rettangolo ruotato in una immaggine nel riferimento non ruotato
		rect[0] = -r.xnr0[selectedRectangle];
		rect[1] = height - r.ynr0[selectedRectangle];
		rect[2] = -r.xnr1[selectedRectangle];
		rect[3] = height - r.ynr1[selectedRectangle];
		console.log("rect rot----------------------------");
	}else{		
		// traduzione del rettangolo non ruotato in una immaggine nel riferimento non ruotato
		rect[0] = r.xnr0[selectedRectangle];
		rect[1] = r.ynr0[selectedRectangle];
		rect[2] = r.xnr1[selectedRectangle];
		rect[3] = r.ynr1[selectedRectangle];
		// Scala i valori del mouse per adattarli al riferimento dello schermo!!!
		console.log("rect no rot----------------------------");
	}
	
	///---------CALCOLO DELL'OFFSET NEL RIFERIMENTO NON RUOTATO--------------------------
	console.log("mousePressed----------------------------");
	console.log("rect: "+rect);
	console.log("scaledX-rect[0]: "+scaledX+"-"+rect[0]);
	console.log("scaledY- rect[1]: "+scaledY+"-"+rect[1]);
	// Check if mouse is near any corner for resizing
	const resizeThreshold = 10;
	let inside1 = scaledX > rect[0] && scaledX < rect[2] && scaledY > rect[3] && scaledY < rect[1];
	let inside2 = scaledX > rect[2] && scaledX < rect[0] && scaledY > rect[1] && scaledY < rect[3];
	if (isNearCorner(scaledX, scaledY, rect[0], rect[1], resizeThreshold)) {
		dragging = false;
		resizing = true;
		selectedCorner = 'topLeft';
		console.log("Near topleft");
	} else if (isNearCorner(scaledX, scaledY, rect[2], rect[1], resizeThreshold)) {
		dragging = false;
		resizing = true;
		selectedCorner = 'topRight';
		console.log("Near topRight");
	} else if (isNearCorner(scaledX, scaledY, rect[0], rect[3], resizeThreshold)) {
		dragging = false;
		resizing = true;
		selectedCorner = 'bottomLeft';
		console.log("Near bottomLeft");
	} else if (isNearCorner(scaledX, scaledY, rect[2], rect[3], resizeThreshold)) {
		dragging = false;
		resizing = true;
		selectedCorner = 'bottomRight';
		console.log("Near bottomRight");
	} else if (inside1 || inside2) {
		cursor("grab");
		console.log("Near inside for dragging");
		// Otherwise check if inside the rectangle for dragging 
		// Traslazione
		dragging = true;
		offsetX = scaledX - rect[0]; 
		offsetY = scaledY - rect[1];
		console.log("offset: "+offsetX+" - "+offsetY);
	}else{
		cursor(ARROW);
	}
}

function mouseDragged() {
	let scaledX = 0;
	let scaledY = 0;
	let r = boardData.radarData.regions;
	let selectedRectangle = r.selected -1;
	let rect = [];

	// passaggio dell'input del mouse al riferimento non ruotato
	scaledX = mouseX - width /2;
	scaledY = height - mouseY;
	
	if(boardData.radarData.rot){
		// traduzione del rettangolo ruotato in una immagine nel riferimento non ruotato
		rect[0] = -r.xnr0[selectedRectangle];
		rect[1] = height - r.ynr0[selectedRectangle];
		rect[2] = -r.xnr1[selectedRectangle];
		rect[3] = height - r.ynr1[selectedRectangle];
		console.log("rect rot----------------------------");
	}else{		
		// traduzione del rettangolo non ruotato in una immagine nel riferimento non ruotato
		rect[0] = r.xnr0[selectedRectangle];
		rect[1] = r.ynr0[selectedRectangle];
		rect[2] = r.xnr1[selectedRectangle];
		rect[3] = r.ynr1[selectedRectangle];
		console.log("rect no rot----------------------------");
	}
		
///---------CALCOLO DEL DRAG & DROP NEL RIFERIMENTO NON RUOTATO A PARTIRE DALL'OFFSET--------------------------		
	if (dragging) {
			// Move the entire rectangle
			let widthd = rect[2] - rect[0];
			let heightd = rect[3] - rect[1];
			
			rect[0] = scaledX - offsetX;
			rect[1] = scaledY - offsetY;
			rect[2] = rect[0] + widthd;
			rect[3] = rect[1] + heightd;
	} else if (resizing) {	
		// Resize the rectangle based on selected corner
		if (selectedCorner === 'topLeft') {
			console.log("drag topLeft");
			rect[0] = scaledX;
			rect[1] = scaledY;
		} else if (selectedCorner === 'topRight') {
			console.log("drag topRight");
			rect[2] = scaledX;
			rect[1] = scaledY;
		} else if (selectedCorner === 'bottomLeft') {
			console.log("drag bottomLeft");
			rect[0] = scaledX;
			rect[3] = scaledY;
		} else if (selectedCorner === 'bottomRight') {
			rect[2] = scaledX;
			rect[3] = scaledY;
		}
		console.log("resize: "+scaledX+" - "+scaledY);
	}	
	if(boardData.radarData.rot){
		// passaggio del risultato nel riferimento ruotato
		r.xnr0[selectedRectangle] = -rect[0];
		r.ynr0[selectedRectangle] = height - rect[1];
		r.xnr1[selectedRectangle] = -rect[2];
		r.ynr1[selectedRectangle] = height - rect[3];
	}else{
		// passaggio del risultato nel riferimento non ruotato
		r.xnr0[selectedRectangle] = rect[0];
		r.ynr0[selectedRectangle] = rect[1];
		r.xnr1[selectedRectangle] = rect[2];
		r.ynr1[selectedRectangle] = rect[3];
	}
	// calcola i vertici base del rettangolo in metri
	r.x0[selectedRectangle] = mapInverse(r.xnr0[selectedRectangle], -width * 0.3, width * 0.3, -6, 6);
	r.y0[selectedRectangle] = mapInverse(r.ynr0[selectedRectangle], 0, -height, 0, -6);
	r.x1[selectedRectangle] = mapInverse(r.xnr1[selectedRectangle], -width * 0.3, width * 0.3, -6, 6);
	r.y1[selectedRectangle] = mapInverse(r.ynr1[selectedRectangle], 0, -height, 0, -6);
	updateInputsFromBoardDataRegion();// aggiorna feedback nella GUI
}

function mouseReleased() {
	dragging = false;
	resizing = false;
	selectedCorner = null;
	cursor(ARROW);
}

// Utility to check if mouse is near a corner for resizing
function isNearCorner(mx, my, x, y, threshold) {
	let d = dist(mx, my, x, y);
	console.log("Dist: "+d);
	return d  < threshold;
}

function mapInverse(value, start2, stop2, start1, stop1) {
  return (value - start2) * (stop1 - start1) / (stop2 - start2) + start1;
}

function map(value, start1, stop1, start2, stop2) {
  return (value - start1) * (stop2 - start2) / (stop1 - start1) + start2;
}
