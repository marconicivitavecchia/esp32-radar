
> [Return to main page](README.md)

# **JSON parser**

Is a recursive parser of JSON data received asynchronously (representing the commands from the web interface). Returns the path of the command in the received JSON data structure. 

The path must correspond to the path of the function to be called in the data structure of the command map. Invokes the function which, in the command map, has its pointer on that path.

## **Device parser**

It is a parser that works on messages posted by the user
-  on **feedback topic (state)** that are useful to the application server to receive confirmation of the actuator state change but also useful to the user to know the new state.
- on a **configuration topic** where only the application server can publish while all other IoT devices are subscribers:

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



> [Return to main page](README.md)
