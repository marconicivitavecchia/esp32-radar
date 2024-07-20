
> [Return to main page](README.md)

# **JSON parser**

Is a recursive parser of JSON data received asynchronously (representing the commands from the web interface). Returns the path of the command in the received JSON data structure. 

The path must correspond to the path of the function to be called in the data structure of the command map. Invokes the function which, in the command map, has its pointer on that path.

## **Device parser**

The corrisponding JSON commands are sent by the application server or by the web interface and it is a parser that works on messages posted by the user on:
- a **feedback topic (state)** to indicate to the device the state information that tne application server is intersted to know. 
- a **configuration topic** where only the application server can publish while all other IoT devices are subscribers.
  
Map of the functions to be executed on a certain path of the received commands (statuses):
- They must coincide with the corresponding paths of the JSON object being transmitted.
- Read-only commands are parameterless and can be invoked in JSON as cells in a command list. For example, with JSON
```Json
"configs": {
        "read": ["polltime", "servel"]
}
```
but they must be stored as field-value pairs of an object because in Python dictionary arrays are encoded as objects.
- Write-only commands are parameterized and must be invoked in JSON as field, value pairs. For example, with JSON:

```Json
"configs": {
        "write":{
                "polltime": 1
                "servel": 115200
        },
 }
```

Ultimately, the configuration JSON is interpreted:
- by invoking functions with parameters that modify the current state of the device.
- by invoking functions without parameters that read the current state of the device.
  
The map of function pointers tha are corresponding to the configuration and state json is:

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
            "pollTime": leggi_pollTime,
            "radarMode": leggi_radarMode,
            "allState": pubAllState,
            "radarstate": leggi_radarState,
        }
    }
}
```
## **Application parser**

The corrisponding JSON commands are sent by theIoT device and it is a parser that works on messages posted by the IoT device on
- a **measurement topic** and invokes the function with the responsability of show the measures in the user interface or to collects them into a database. 
- a **feedback topic (state)** (from the terminal device, to the broker), useful to the application server to receive confirmation of the actuator state change but also useful to the user to know the new state.

Map of the functions to be executed on a certain path of the received commands (statuses):
- They must coincide with the corresponding paths of the JSON object being transmitted.

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
but they must be stored as field-value pairs of an object because in Python dictionary arrays are encoded as objects.
- Write-only commands are parameterized and must be invoked in JSON as field, value pairs. For example, with JSON:

The map of function pointers tha are corresponding to the configuration and state json is:

```Jscript
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

> [Return to main page](README.md)
