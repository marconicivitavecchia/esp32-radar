import time

class EMAFilter:
   def __init__(self, alpha):
       self.alpha = alpha
       self.value = None
   import time
   def update(self, new_value):
       if self.value is None:
           self.value = new_value
       else:
           self.value = self.alpha * new_value + (1 - self.alpha) * self.value
       return self.value

class JumpDetection:
    def __init__(self):
        # jump properties
        self.h0z = [0, 0, 0]
        self.g = 9.81
        self.h1z = [0, 0, 0]
        self.is_jumping = [False, False, False]
        self.initial_vz = [0, 0, 0]
        self.isCalibration = [False, False, False]
        self.calibrated = [0, 0, 0]
        self.sampleCount = [0, 0, 0]
        self.showJump = [False, False, False] 
        self.startTime = [0, 0, 0]
        
        # Filtri EMA
        self.alpha = 0.2  
        self.ema_z = [EMAFilter(self.alpha) for _ in range(3)]
        self.ema_vz = [EMAFilter(self.alpha) for _ in range(3)]
       
        # Pattern detection
        self.HISTORY_SIZE = 5
        self.TREND_SIZE = 3
        self.z_history = [[] for _ in range(3)]
        self.trend_buffer = [[] for _ in range(3)]
        self.last_filtered_z = [0, 0, 0]
        
    def update_buffers(self, i, z, vz):
        # Aggiorna EMA
        filtered_z = self.ema_z[i].update(z)
        filtered_vz = self.ema_vz[i].update(vz)

        # Aggiorna storia posizioni
        self.z_history[i].append(filtered_z)
        if len(self.z_history[i]) > self.HISTORY_SIZE:
           self.z_history[i].pop(0)
           
        # Calcola trend
        if len(self.z_history[i]) >= 2:
           trend = self.z_history[i][-1] - self.z_history[i][-2]
           self.trend_buffer[i].append(trend)
           if len(self.trend_buffer[i]) > self.TREND_SIZE:
               self.trend_buffer[i].pop(0)
           
        return filtered_z, filtered_vz
    
    def is_vertical_motion(self, i):
       VERTICAL_THRESHOLD = 200  # mm
       CONSISTENCY_THRESHOLD = 0.8
       
       if len(self.trend_buffer[i]) < self.TREND_SIZE:
           return False
           
       # Verifica direzione consistente
       trends = self.trend_buffer[i]
       positive_trends = sum(1 for t in trends if t > 0)
       negative_trends = sum(1 for t in trends if t < 0)
       
       # Calcola movimento medio (prevalente)
       avg_movement = sum(abs(t) for t in trends) / len(trends)
       
       # Movimento è verticale se:
       # 1. È abbastanza ampio
       # 2. Ha direzione consistente
       consistency = max(positive_trends, negative_trends) / len(trends)# forchetta
       return avg_movement > VERTICAL_THRESHOLD and consistency > CONSISTENCY_THRESHOLD

    def calculate_theoretical_height(self, v0):
        return (v0 * v0) / (2 * self.g)
        
    def startCalibration(self, index, timeout=10):
        self.timeout = timeout*1000
        self.isCalibration[index] = True
        self.showJump[index] = False
        self.startTime[index] = time.ticks_ms()
   
    def detect_jump(self, z, vz):
        VELOCITY_THRESHOLD = 0.5      # 0.5 m/s = 500 mm/s
        LANDING_VELOCITY = 0.3        # -0.3 m/s = -300 mm/s
        LANDING_HEIGHT_MARGIN = 0.05  # 5cm = 50 mm
        VERTICAL_THRESHOLD = 0.0002   # mm movimento minimo verticale
        measured_height = 0
        theoretical_height = 0
        
        result = {
            'hzre':[],
            'hzth': [],
            'vz0': [],
            'vert': [],  # m/s
            'cal': [],
        }
        
        l = len(z)
        if(l>0):
            for i in range(l):# per ogni target
                # Aggiorna filtri e buffer
                filtered_z, filtered_vz = self.update_buffers(i, z[i], vz[i])
                is_vertical = self.is_vertical_motion(i)
           
                if self.isCalibration[i]:
                        print(f"Sto calibrando il target {i}")
                        self.h0z[i] = self.h0z[i] + filtered_z
                        self.sampleCount[i] = self.sampleCount[i] + 1
                        measured_height = 0
                        theoretical_height = 0
                    
                        if self.isCalibration[i] and time.ticks_diff(time.ticks_ms(), self.startTime[i]) > self.timeout:
                            self.h0z[i] = self.h0z[i] / self.sampleCount[i]
                            self.isCalibration[i] = False
                            print(f"Initial height calibrated: x: {self.h0z}")
                            print(f"Stato fine calibrazione {i}")
                else:
                    print(f"Params: filtered_z {filtered_z}, filtered_vz {filtered_vz}, is_vertical {is_vertical}")
                    
                    # Se non è in corso un salto e viene rilevata velocità verticale positiva
                     # Inizio salto: velocità significativa e movimento verticale
                    if not self.is_jumping and vz[i] > VELOCITY_THRESHOLD and is_vertical:  
                        self.is_jumping[i] = True
                        self.h1z[i] = filtered_z# Memorizza altezza CORRENTE come prima della sequenza di salto
                        self.initial_vz[i] = filtered_vz# Memorizza velocità iniziale
                        print(f"Stato salto per {i}")
                        print(f"Con velocità iniziale {self.initial_vz[i]}")
                    elif self.is_jumping[i]:
                        self.showJump[i] = True
                        # Aggiorna massima altezza raggiunta (in metri)
                        if filtered_z > self.h1z[i]:
                            self.h1z[i] = filtered_z
                            print(f"Sto saltando a {self.h1z[i]}")
                        # Atterraggio: velocità verso il basso e quota vicina all'iniziale
                        if filtered_vz > LANDING_VELOCITY  and filtered_z <= self.h0z[i] + LANDING_HEIGHT_MARGIN:  # Atterraggio
                            measured_height = self.h1z[i] - self.h0z[i]
                            theoretical_height = self.calculate_theoretical_height(filtered_vz)
                            self.is_jumping[i] = False
                            print(f"Stato atterraggio per {i}")
                
                result['hzre'].append(measured_height)
                result['hzth'].append(theoretical_height)
                result['vz0'].append(vz[i])
                result['vert'].append(self.showJump[i])
                result['cal'].append(self.isCalibration[i])
                
        return result
        
"""
Miglioramenti:

- Filtro EMA su posizione e velocità
- Buffer per analisi trend
- Verifica consistenza direzione movimento
- Soglie movimento verticale più robuste
- Output dati raw e filtrati
- Gestione storia movimento
- Analisi trend per riconoscimento pattern

Le soglie vanno calibrate in base al rumore del sensore.
"""
