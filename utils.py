import time
import network
import utime
import math
import ujson
import os

def save_config(filename, config):
    with open(filename, 'w') as f:
        ujson.dump(config, f)

def load_config(filename):
    try:
        with open(filename, 'r') as f:
            return ujson.load(f)
    except OSError:
        return None

def is_connected(client):
    try:
        client.ping()  # Send a ping to the broker
        return True
    except Exception as e:
        #print(f"Connection check failed: {e}")
        return False
    
def check_and_process_messages(client, client1, client2, topic):
    if client == client1:
        try:
            client1.check_msg()  # Controlla i messaggi in arrivo
        except Exception as e:
            print(f"Error with primary broker: {e}")
            #client1.disconnect()
            if not is_connected(client):
                connect_and_subscribe(client2, topic)  # Passa al secondo broker
                client = client2
    elif client == client2:
        try:
            client2.check_msg()  # Controlla i messaggi in arrivo
        except Exception as e:
            print(f"Error with backup broker: {e}")
            #client2.disconnect()
            if not is_connected(client):
                connect_and_subscribe(client1, topic)  # Passa al primo broker
                client = client1
    
    return client
        
def connect_and_subscribe(client, topic):
    try:
        client.connect()
        client.subscribe(topic)
        print(f"Connected to {client.server} and subscribed to {topic}")
        return True
    except Exception as e:
        print(f"Failed to connect to {client.server}: {e}")
        return False
    
#import ntptime
def constrain(value, min_val, max_val):
    # Limita il valore all'intervallo compreso tra min_val e max_val
    return max(min(value, max_val), min_val)

def arduino_map(value, from_low, from_high, to_low, to_high):
    # Mappa il valore da from_low - from_high a to_low - to_high
    return (value - from_low) * (to_high - to_low) // (from_high - from_low) + to_low

def random_string(length=8):
    import uos
    _randomstring = ''
    _source = 'abcdefghijklmnopqrstuvwxyz'
    x = 0
    while x < length:
        _randomstring = _randomstring + _source[uos.urandom(1)[0] % len(_source)]
        x += 1
    return _randomstring

def bin2hex(bin):
    import ubinascii
    return ubinascii.hexlify(bin).decode()

def mac2eui(mac):
    import re
    #mac = bin2hex(mac)
    '''
    Convert a MAC address to a EUI64 address
    or, with prefix provided, a full IPv6 address
    '''
    # http://tools.ietf.org/html/rfc4291#section-2.5.1
    eui64 = re.sub(r'[.:-]', '', mac).lower()
    eui64 = eui64[0:6] + 'fffe' + eui64[6:]
    eui64 = hex(int(eui64[0:2], 16) ^ 2)[2:] + eui64[2:]
    return eui64

def wifi_connect(ssid, key):
    try:
        sta_if = network.WLAN(network.STA_IF)
        sta_if.active(True)
        sta_if.connect(ssid, key)
        while not sta_if.isconnected():
            print(".", end="")
            time.sleep(0.1)
        ip = sta_if.ifconfig()[0]
        wlan_mac = sta_if.config('mac')
        #ntptime.settime()
        return (ip,wlan_mac, sta_if)
    except OSError as e:
        raise  # re raises the previous exception

# Function that retrieves and invoke the function at the command path
def execute_command(command_map, command_path, parameters=None):
    current_level = command_map
    for key in command_path:
        if key in current_level:
            current_level = current_level[key]
        else:
            print(f"Comando sconosciuto: {'/'.join(command_path)}")
            return
    
    if callable(current_level):
        if parameters is not None:
            current_level(parameters)
        else:
            current_level()
    else:
        print(f"Comando finale non è una funzione: {'/'.join(command_path)}")

# Recursive parser of JSON data received asynchronously (representing the commands from the web interface) 
# Returns the path of the command in the received JSON data structure. 
# The path must correspond to the path of the function to be called in the data structure of the command map. 
# Invokes the function which, in the command map, has its pointer on that path.
def process_json(command_map, json_obj, base_path=[]):
    for key, value in json_obj.items():
        current_path = base_path + [key]
        print('current_path',current_path)
        print('value',value)
        if isinstance(value, dict):
            process_json(command_map, value, current_path)
        elif isinstance(value, list):# se è una lista di funzioni senza parametri
            for item in value:
                execute_command(command_map, current_path + [item])
        else:# se è il campo chiave (nome della funzione) - valore (funzione con parametro) 
            execute_command(command_map, current_path, value)
        
# Date and time
# Time is a tuple like this:
# (year, month, mday, hour, minute, second, weekday, yearday)
# gmtime() is a UTC tuple, localtime() is a local time tuple
# Tuple format is
# (year, month 1-12, day of the month 1-31, hour 0-23, minutes 0-59,
# seconds 0-59, day of the week 0-6 (mon-sun), day of the year 1-366)
def date_time():
    date_time = time.localtime()
    # anno, mese, giorno, ora, minuti, secondi, week_day, year_day = time.localtime()
    return date_time

def utc_time():
    return time.mktime(time.localtime())

def getTimestamp():
    anno, mese, giorno, ora, minuti, secondi, week_day, year_day = get_local_datetime()
    return f"{anno}-{mese:02d}-{giorno:02d}T{ora:02d}:{minuti:02d}:{secondi:02d}"

def get_sensor_id(dust_sensor):
    id1 = hex(dust_sensor.id1)
    id2 = hex(dust_sensor.id2)
    return id1[2:].upper() + id2[2:].upper()

def waitUntilInputLow(self,btn,t):
        while btn.value():
            time.sleep_ms(t)
            
class DiffTimer(object):
    def __init__(self,elapsed):
        self.elapsed = elapsed
        self.timerState = False
        self.last = 0
    def __init__(self):
        self.elapsed = 0
        self.timerState = False
        self.last = 0
    def reset(self): # transizione di un pulsante
        self.elapsed = 0
        self.last = time.ticks_ms()
    def stop(self):
        if self.timerState:
            self.timerState = False
            self.elapsed = self.elapsed + time.ticks_ms() - self.last
    def start(self):
        if not self.timerState:
            self.timerState = True
            self.last = time.ticks_ms()
    def get(self):
        if self.timerState:
            return time.ticks_ms() - self.last + self.elapsed
        return self.elapsed
    def set(self, e):
        reset()
        self.elapsed = e

class DiffTimer2(object):
    def __init__(self,elapsed):
        self.elapsed = elapsed
        self.timerState = False
        self.tbase = 1
    def __init__(self):
        self.elapsed = 0
        self.timerState = False
    def reset(self): # transizione di un pulsante
        self.elapsed = 0
    def stop(self):
        if self.timerState:
            self.timerState = False
    def start(self):
        if not self.timerState:
            self.timerState = True
    def update(self):
        if self.timerState:
            self.elapsed = self.elapsed + self.tbase
        return self.elapsed
    def peek(self):
        return self.elapsed
    def set(self, e):
        reset()
        self.elapsed = e
    def setBase(self, e):
        self.tbase = e
      
def get_local_datetime():
    # Ottieni il tempo Unix epoch (secondi dal 1 gennaio 1970)
    now_epoch = utime.time()
    
    # Ottieni i componenti di data e ora locale
    # localtime() restituisce una tupla (anno, mese, giorno, ora, minuto, secondo, giorno_settimana, giorno_anno, ora_legale)
    local_time = utime.localtime(now_epoch)
    
    # Estrai i componenti di data e ora locale
    year = local_time[0]
    month = local_time[1]
    day = local_time[2]
    hour = local_time[3]
    minute = local_time[4]
    second = local_time[5]
    weekday = local_time[6]  # 0 = lunedì, ..., 6 = domenica
    yearday = local_time[7]  # Giorno dell'anno (1-365/366)
    
    return year, month, day, hour, minute, second, weekday, yearday

def to_hex_string(byte_list):
    if byte_list is None:
        return 'N/A'  # Oppure puoi restituire un messaggio come 'N/A'
    return ' '.join(f'{b:02x}' for b in byte_list)

# Funzione per calcolare la media esponenziale pesata
def update_ema(new_values, ema_values, alpha):
    for i in range(len(new_values)):
        ema_values[i] = alpha * new_values[i] + (1 - alpha) * ema_values[i]
    return ema_values

def update_sliding_window_ma(sensor_data, window_size):
    # Verifica se i dati dei sensori sono vuoti
    if len(sensor_data) == 0:
        raise ValueError("Sensor data should not be empty")
    
    # Numero di sensori (assumiamo che ogni campione abbia lo stesso numero di misurazioni di sensori)
    num_sensors = len(sensor_data[0])
    # Numero di campioni (lunghezza dell'array dei dati dei sensori)
    num_samples = len(sensor_data)
    
    # Verifica che tutti i campioni abbiano lo stesso numero di misurazioni di sensori
    if any(len(sample) != num_sensors for sample in sensor_data):
        raise ValueError("All samples must have the same number of sensor measurements")
    
    # Verifica che la dimensione della finestra sia valida rispetto al numero di campioni
    if window_size > num_samples:
        raise ValueError("Window size must be less than or equal to the number of samples")
    
    # Inizializza le liste per memorizzare le medie mobili per ogni sensore
    averages = [[] for _ in range(num_sensors)]
    
    # Calcola la media mobile per ciascun sensore
    for sensor_idx in range(num_sensors):
        # Calcola la somma iniziale della finestra per il sensore corrente
        window_sum = sum(sensor_data[i][sensor_idx] for i in range(window_size))
        # Aggiungi la media della prima finestra alla lista delle medie per il sensore corrente
        averages[sensor_idx].append(window_sum / window_size)
        
        # Aggiorna la somma della finestra e calcola la media per ogni campione successivo
        for i in range(window_size, num_samples):
            window_sum += sensor_data[i][sensor_idx] - sensor_data[i - window_size][sensor_idx]
            averages[sensor_idx].append(window_sum / window_size)
    
    return averages

# Funzione per arrotondare ciascun valore a due cifre decimali
def round_2(array):
    return [round(val, 2) for val in array]

def modulo_a(x, y):
    if len(x) != len(y):
        raise ValueError("Gli array x e y devono avere la stessa lunghezza")
    
    moduli = []
    for i in range(len(x)):
        modulo = math.sqrt(x[i]**2 + y[i]**2)
        moduli.append(modulo)
    
    return moduli

def modulo_b(dd, d):
    if len(d) != len(dd):
        raise ValueError("Gli array x e y devono avere la stessa lunghezza")
    
    moduli = []
    for i in range(len(d)):
        modulo = abs(d[i]-dd[i])
        moduli.append(modulo)
    
    return moduli
        
def modulo_d(x1, x2, y1, y2):
    if len(x1) != len(y1):
        raise ValueError("Gli array x e y devono avere la stessa lunghezza")
    
    moduli = []
    for i in range(len(x1)):
        modulo = math.sqrt((x1[i]-x2[i])**2 + (y1[i]-y2[i])**2)
        moduli.append(modulo)
    
    return moduli

