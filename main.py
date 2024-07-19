from machine import UART
from machine import reset as machine_reset
from bme680 import *
from utils import *


# Manage debug
import esp

esp.osdebug(None)  # turn off vendor O/S debugging messages
# esp.osdebug(0)          # redirect vendor O/S debugging messages to UART(0)

# Run Garbage Collector
import gc
import machine
gc.collect()
from config import *
import ujson
import time
import ntptime
from machine import deepsleep
from umqtt.simple import MQTTClient
from machine import Pin, SoftI2C
import utime
from collections import OrderedDict
import json
from serial_protocol import *
from adafruit_ltr329_ltr303 import LTR329

S_ON = Pin(42, Pin.OUT) # PIN RADAR POWER MENAGEMENT
S_ON.value(1)
Pin(18, Pin.IN, Pin.PULL_UP)
#Pin(17, Pin.IN, Pin.PULL_UP)
# Serial configuration
print("Configuring serial...")
# Carica la configurazione all'avvio
config = load_config('config.json')
if config:
    radarvel = int(config.get('serial_speed', 256000))
    print("radarvel ", radarvel)
    #another_setting = config.get('another_setting', 'default_value')
else:
    # Configurazione di default
    radarvel = 256000
    #another_setting = 'default_value'
    config = {
        'serial_speed': 256000,
        #'another_setting': 'value'
    }
    save_config('config.json', config)
#test_speeds = [9600, 19200, 38400, 57600, 115200, 230400, 256000, 460800]
#for speed in test_speeds:
#radarvel = 230400 # CAMBIA QUESTA VELOCITA'. Quando hai trovato la imposti nella pagina e poi commenti la riga
S_ON.value(1)
time.sleep(0.5)
uart = UART(1, radarvel, rx=18, tx=17)
uart.init(radarvel, bits=8, parity=None, stop=1)
time.sleep(0.5)
print('Baud rate', radarvel)
radar = Radar(uart)    
# Sensor configuration
print("Configuring sensor...")
time.sleep(0.1)
i2c = SoftI2C(scl=Pin(14),sda=Pin(13))
#i2c = I2C(-1, sda=Pin(13), scl=Pin(14))
print('Scan i2c bus...')
devices = i2c.scan()
bme = BME680_I2C(i2c=i2c, address=0x76)
# Create Radar instance
#radar = Radar(uart)

def pubStateAtt(att, val):
     timestamp = getTimestamp()
     message = ujson.dumps(
        {
            "radar": {
                att: val,
            },
            "boardID": esp32_unique_id,
            "timestamp": timestamp,
        }
     )
     print(f"Reporting to MQTT topic {MQTT_STATETOPIC}: {message}")
     client.publish(MQTT_STATETOPIC, message)
     
def pubAllState():
     timestamp = getTimestamp()
     polltimeval = pollTime
     radarmodeval = readRadarMode()
     fwval = radarFW
     rstate = "on" if S_ON.value() else "off"
     message = ujson.dumps(
        {
            "radar": {
                "fw": fwval,
                "servel": radarvel,
                "polltime": polltimeval,
                "radarmode": radarmodeval,
                "radarstate": rstate,
                "radareboot": 1,
            },
            "boardID": esp32_unique_id,
            "timestamp": timestamp,
        }
     )
     
     print(f"Reporting to MQTT topic {MQTT_STATETOPIC}: {message}")
     client.publish(MQTT_STATETOPIC, message)

# Callback function to manage incoming messages
def sub_cb(topic, msg):
    print("Message received on topic %s: %s" % (topic, msg))
    try:
        # Decodifica il messaggio JSON
        data = ujson.loads(msg)
        if data['boardID'] == MY_MQTT_CLIENT_ID:
            # Processa il JSON per eseguire i comandi
            process_json(command_map, data)
    except ValueError as e:
        print("Errore di decodifica JSON:", e)

def readRadarMode():
    mode = None
    if radar.enable_configuration_mode():
        mode = radar.query_target_tracking()
        radar.end_configuration_mode()
    if mode == 1:
        return "singolo"
    else:
        return "multi"

def readFW():
    global radar
    data = None
    if radar.enable_configuration_mode():
        data = radar.read_firmware_version()
        radar.end_configuration_mode()
    return data    
        
def reboot():
    if radar.enable_configuration_mode():
        lista_x = [0, 0, 0]
        lista_y = [0, 0, 0]
        lista_v = [0, 0, 0]
        lista_dr = [0, 0, 0]
        radar.restart_module()
        radar.end_configuration_mode()

def setBaudRate(rate):
    if radar.enable_configuration_mode():
        radar.set_serial_port_baud_rate(rate)
        radar.end_configuration_mode()

def setRadarMode(mode):
    if radar.enable_configuration_mode():
        if mode:
            radar.multi_target_tracking()
        else:
            radar.single_target_tracking()
        radar.end_configuration_mode()
        
def restoreRadarFactory():
    if radar.enable_configuration_mode():
        radar.restore_factory_settings()
        radar.end_configuration_mode()

def scrivi_radarToggle(val):
    if S_ON.value():
        S_ON.value(0)
    else:
        S_ON.value(1)
    leggi_radarState()
# Funzioni di comando
def scrivi_pollTime(valore):
    global pollTime
    print(f"Scrivi pollTime a {valore}")
    pollTime = valore
    leggi_pollTime()

def scrivi_servel(valore):
    global radarvel
    global uart
    radarvel = int(valore)
    print(f"Scrivi servel a {valore}")
    config = {
        'serial_speed': radarvel,
        #'another_setting': 'value'
    }
    save_config('config.json', config)  
    setBaudRate(radarvel)
    reboot()
    uart.init(radarvel, bits=8, parity=None, stop=1)  

def scrivi_radarMode(valore):
    print(f"Scrivi radarMode a {valore}")
    if valore == "multi":
        setRadarMode(True)
    else:
        setRadarMode(False)
    leggi_radarMode()

def scrivi_radarReboot(valore):
    print(f"Scrivi radarReboot a {valore}")
    reboot()
    leggi_reboot()

def scrivi_radarFactory(valore):
    global radarvel
    print(f"Scrivi radarFactory a {valore}")
    restoreRadarFactory()
    radarvel = 256000
    print(f"Scrivi servel a {valore}")
    config = {
        'serial_speed': radarvel,
        #'another_setting': 'value'
    }
    save_config('config.json', config)
    reboot()
    uart.init(radarvel, bits=8, parity=None, stop=1)
def leggi_radarState():
    print("Leggi radarstate")
    pubStateAtt("radarstate", "on" if S_ON.value() else "off")
    
def leggi_radarfw():
    global radarFW
    print("Leggi radarfw")
    val = readFW()
    radarFW = val
    pubStateAtt("fw", val)

def leggi_servel():
    global radarvel
    print("Leggi servel")
    pubStateAtt("servel", radarvel)

def leggi_pollTime():
    global pollTime
    print("Leggi pollTime")
    pubStateAtt("polltime", pollTime)

def leggi_radarMode():
    print("Leggi radarMode")
    val = readRadarMode()
    pubStateAtt("radarmode", val)
    
def leggi_reboot():
    print("Leggi reboot")
    pubStateAtt("radareboot", 1) 
    
# Map of the functions to be executed on a certain path of the received commands (statuses).
# They must coincide with the corresponding paths of the JSON object being transmitted.
# Read-only commands are parameterless and can be invoked in JSON as cells in a command list. For example, with JSON
# "radar": [polltime, servel] 
# but they must be stored as field-value pairs of an object because in Python dictionary arrays are encoded as objects.
# Write-only commands are parameterized and must be invoked in JSON as field, value pairs. For example, with JSON
# "radar": {
# 	"write":{
# 		polltime: 1
# 		servel: 115200
# 	},
# }
command_map = {
    #"boardID": check_id,
    "configs": {
        "write": {# funzioni con parametri
            "polltime": scrivi_pollTime,
            "servel": scrivi_servel,
            "radarmode": scrivi_radarMode,
            "radareboot": scrivi_radarReboot,
            "radartoggle": scrivi_radarToggle #scrivi_radarFactory,
        },
        "read": {# funzioni senza parametri, sono liste ma possono essere trattate come campi di un oggetto
            "radarfw": leggi_radarfw,
            "servel": leggi_servel,
            "pollTime": leggi_pollTime,
            "radarMode": leggi_radarMode,
            "allState": pubAllState,
            "radarstate": leggi_radarState,
        }
    }
}

if len(devices) == 0:
  print("No i2c device !")
else:
  print('i2c devices found:',len(devices))

  for device in devices:  
    print("Decimal address: ",device)

  for _ in range(3):
    print(bme.temperature, bme.humidity, bme.pressure, bme.gas)
    time.sleep(1)
    

radarFW = readFW()

i = 0
ok = False
temp = bme.temperature
press = bme.pressure
hum =  bme.humidity
gas = bme.gas

t1 =DiffTimer()
t2 =DiffTimer2()
t3 =DiffTimer2()
t1.start()
t2.setBase(500)
t2.start()
t3.setBase(500)
t3.start()

sensor = LTR329(i2c)
ch0, ch1, lux_ch0, lux_ch1, total_lux = sensor.get_lux()
print("Canale 0 (luce visibile):", ch0, "lux")
print("Canale 1 (luce infrarossa):", ch1, "lux")
print("Lux luce visibile:", lux_ch0, "lux")
print("Lux luce infrarossa:", lux_ch1, "lux")
print("Lux totale:", total_lux, "lux")

# Costante di smoothing per la media esponenziale pesata (0 < alpha <= 1)
alpha = 0.125
beta = 0.25
pollTime = 2000
data = radar.printTargets()
if data is None:
    lista_x = [0, 0, 0]
    lista_y = [0, 0, 0]
    lista_v = [0, 0, 0]
    lista_dr = [0, 0, 0]
else:
    lista_x = data.get('lista_x', [])
    lista_y = data.get('lista_y', [])
    lista_v = data.get('lista_v', [])
    lista_dr = data.get('lista_dr', [])
    edelta = [0, 0, 0]
    soglia = [0, 0, 0]
    cdelta = [0, 0, 0]


while not ok:
    try:
        # WiFi configuration
        print(f"Connecting to WiFi {WIFI_SSID}...", end="")
        (ip, wlan_mac, sta_if) = wifi_connect(WIFI_SSID, WIFI_PASSWORD)
        print(" Connected!")
        print(f"ip: {ip}, mac: {bin2hex(wlan_mac)}")
        esp32_unique_id = MQTT_CLIENT_ID + bin2hex(wlan_mac)
        # MQTT init
        #MQTT_CLIENT_ID_RND = MQTT_CLIENT_ID + random_string()
        MY_MQTT_CLIENT_ID = MQTT_CLIENT_ID + str(bin2hex(wlan_mac))#+":"+ random_string()
        client1 = MQTTClient(MY_MQTT_CLIENT_ID, MQTT_BROKER1, user=MQTT_USER, password=MQTT_PASSWORD)
        client2 = MQTTClient(MY_MQTT_CLIENT_ID, MQTT_BROKER2, user=MQTT_USER, password=MQTT_PASSWORD)
        # Imposta la funzione di callback per la sottoscrizione
        client1.set_callback(sub_cb)
        client2.set_callback(sub_cb)        
        time.sleep(0.5)
        ntptime.host = NTP_SERVER
        ntptime.timeout = 5
        ntptime.settime()
        lastTimeUpdate = time.time()
        interval = 60*60*5
        print("NTP connected.")
        ok = True
    except OSError as e:
        print(e)
        i += 1
        time.sleep(i)

# Prova a connettersi al primo broker
print("Connecting to primary broker...")
client = client1
if not connect_and_subscribe(client1, MQTT_CMDTOPIC):
    print("Switching to backup broker...")
    connect_and_subscribe(client2, MQTT_CMDTOPIC)
    client = client2

time.sleep(0.5)
while True:
    try:
        if S_ON.value():
            data = radar.printTargets()
            if data is not None:
                d = modulo_a(data.get('lista_x', []), data.get('lista_y', []))# campione P attuale
                lista_v = update_ema(data.get('lista_v', []), lista_v, alpha)
                lista_dr = update_ema(data.get('lista_dr', []), lista_dr, alpha)
                update_ema(data.get('lista_x', []), lista_x, alpha)# stima candidata x
                update_ema(data.get('lista_y', []), lista_y, alpha)# stima candidata y
        else:
            lista_x = [0, 0, 0]
            lista_y = [0, 0, 0]
            lista_v = [0, 0, 0]
            lista_dr = [0, 0, 0]
            
        client = check_and_process_messages(client, client1, client2, MQTT_CMDTOPIC)
        if t1.get() > 500:
            #print('t2',t2.peek())
            t1.reset()
            
            # The main broker is the preferred broker
            # The backup broker is choosen only when the main broker is unavailable
            # If the backup broker is active, the main broker is periodically tested and
            # selected if again avalilable
            # The same behaviour is applied by the IoT device
            if t3.update() > 60000:
                t3.reset()
                if  client == client2:
                    print("Tentativo di riconnessione su broker 1")
                    if connect_and_subscribe(client1, MQTT_CMDTOPIC):
                        client = client1
                        print("Riconnessione su broker 1 avvenuta con successo")
                            
            if t2.update() > pollTime:
                t2.reset()
                print('Acceso',S_ON.value())
                
                if not sta_if.isconnected():
                    (ip, wlan_mac, sta_if) = wifi_connect(WIFI_SSID, WIFI_PASSWORD)
                    time.sleep(1)
                    client.connect()
                if time.time() - lastTimeUpdate > interval:
                    lastTimeUpdate = time.time()
                    ntptime.settime()
                    print('NTP time updated.')
                                
                if False:
                    temp = 1
                    press = 1
                    hum =  1
                    gas = 1
                else:
                    temp = bme.temperature
                    press = bme.pressure
                    hum =  bme.humidity
                    gas = bme.gas
                    
                ch0, ch1, lux_ch0, lux_ch1, total_lux = sensor.get_lux()               
                visible = lux_ch0
                infrared = lux_ch1
                total = total_lux
                
                #if S_ON.value():
                #    radar.flushUart()
                #    data = radar.printTargets()
                                    
                timestamp = getTimestamp()
                      
                message = ujson.dumps(
                    {
                        "tempSensor": {
                            "temp": temp,
                            "press": press,
                            "hum": hum,
                            "gas": gas,
                        },
                        "luxSensor": {
                            "visible": visible,
                            "infrared": infrared,
                            "total": total,
                        },
                        "radar": {
                            "x": round_2(lista_x),
                            "y": round_2(lista_y),
                            "vel": round_2(lista_v),
                            "distres": round_2(lista_dr),
                        },
                        "boardID": esp32_unique_id,
                        "timestamp": timestamp,
                    }
                )
               
                print(f"Reporting to MQTT topic {MQTT_PUSHTOPIC}: {message}")
                # mqtt message publishing
                client.publish(MQTT_PUSHTOPIC, message)                             
                #S_ON.value(0)
        elif t2.peek() == 1500:
                pass
                #S_ON.value(1)
                #time.sleep(0.5)
                #print('Accendo radar')
                #reboot()
                
    except ValueError as ve:
        print(ve)
    except OSError as e:
                print(e)    
            #time.sleep(5)
