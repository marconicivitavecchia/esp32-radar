
> [Return to main page](README.md)

# **JSON parser**

## **Definition of topic and payload**

Map of the functions to be executed on a certain path of the received commands (statuses).
They must coincide with the corresponding paths of the JSON object being transmitted.
Read-only commands are parameterless and can be invoked in JSON as cells in a command list. For example, with JSON
"radar": [polltime, servel] 
but they must be stored as field-value pairs of an object because in Python dictionary arrays are encoded as objects.
Write-only commands are parameterized and must be invoked in JSON as field, value pairs. For example, with JSON
``` Json
"radar": {
 	"write":{
 		polltime: 1
 		servel: 115200
 	},
 }
```

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

> [Return to main page](README.md)
