import utime
import math

class KalmanFilter:
    def __init__(self):
        #self.Q = 0.001  # Rumore processo
        #self.R = 0.1    # Rumore misura
        #self.P = 1.0    # Stima errore
        #self.K = 0.0    # Guadagno Kalman
        #self.x = 0.0    # Stima stato
        
        self.Q = 0.005  # Rumore processo
        self.R = 0.1    # Rumore misura
        self.P = 1.0    # Stima errore
        self.K = 0.0    # Guadagno Kalman
        self.x = 0.0    # Stima stato
        
    def update(self, measurement):
        # Predizione
        self.P += self.Q
        
        # Aggiornamento
        self.K = self.P / (self.P + self.R)
        self.x += self.K * (measurement - self.x)
        self.P = (1 - self.K) * self.P
        
        return self.x
 
"""
filtro di Kalman scalare (1D) che assume:

Un modello statico (F = 1)
Nessun input di controllo
Osservazione diretta dello stato (H = 1)
Parametri Q e R fissi

Il filtro Complementare mostrato è anch'esso una versione base che:

Assume una semplice integrazione lineare della velocità
Non considera la direzione del movimento
Usa un singolo parametro alpha fisso
"""
"""
class ComplementaryFilter:
    def __init__(self, alpha=0.96):
        self.alpha = alpha
        
    def update(self, pos_measurement, vel_measurement, dt):
        # Integra velocità
        pos_from_vel = vel_measurement * dt
        
        # Combina le misure
        filtered_pos = self.alpha * pos_measurement + (1 - self.alpha) * pos_from_vel
        return filtered_pos
"""
class ComplementaryFilter:
    def __init__(self, alpha=0.7):  # ridotto da 0.8 per maggiore velocità
        self.alpha = alpha
        self.last_pos = {'x': 0, 'y': 0}
        self.last_time = utime.ticks_ms()
        
    def update(self, pos, velocity):
        current_time = utime.ticks_ms()
        dt = utime.ticks_diff(current_time, self.last_time) / 1000.0

        # Stima direzione del movimento
        dx_num = pos['x'] - self.last_pos['x']
        dy_num = pos['y'] - self.last_pos['y']
        denominator = math.sqrt(dx_num*dx_num + dy_num*dy_num + 1e-6)

        dx = velocity * dt * dx_num / denominator
        dy = velocity * dt * dy_num / denominator

        # Stima posizione dalla velocità
        pos_from_vel = {
            'x': self.last_pos['x'] + dx,
            'y': self.last_pos['y'] + dy
        }

        # Fusione complementare
        filtered_pos = {
            'x': self.alpha * pos['x'] + (1 - self.alpha) * pos_from_vel['x'],
            'y': self.alpha * pos['y'] + (1 - self.alpha) * pos_from_vel['y']
        }

        self.last_pos = filtered_pos
        self.last_time = current_time

        return filtered_pos
 
"""
 class AdaptiveKalmanFilter:
    def __init__(self, window_size=30):
        # Parametri base Kalman
        self.Q = 0.001  # Rumore processo iniziale
        self.R = 0.1    # Rumore misura iniziale
        self.P = 1.0    # Stima errore
        self.K = 0.0    # Guadagno Kalman
        self.x = 0.0    # Stima stato
        
        # Per adattività
        self.window_size = window_size
        self.measurements = []
        self.innovations = []  # differenza tra predizione e misura
        
        # Limiti
        #self.Q_min = 0.001
        self.Q_min = 0.01  # aumentato da 0.001
        self.R_min = 0.1
        
    def calc_variance(self, data):
        if not data:
            return 0
        mean = sum(data) / len(data)
        variance = sum((x - mean) ** 2 for x in data) / len(data)
        return variance
        
    def update(self, measurement):
        # Predizione
        self.P += self.Q
        
        # Innovazione
        innovation = measurement - self.x
        self.innovations.append(innovation)
        self.measurements.append(measurement)
        
        # Mantieni finestra mobile
        if len(self.measurements) > self.window_size:
            self.measurements.pop(0)
            self.innovations.pop(0)
            
            # Adatta parametri
            innovation_variance = self.calc_variance(self.innovations)
            self.R = max(self.R_min, innovation_variance)
            
            # Calcola Q dalla dinamica delle misure
            measurement_diffs = []
            for i in range(1, len(self.measurements)):
                measurement_diffs.append(self.measurements[i] - self.measurements[i-1])
            dynamics_variance = self.calc_variance(measurement_diffs)
            #self.Q = max(self.Q_min, dynamics_variance * 0.01)
            self.Q = max(self.Q_min, dynamics_variance * 0.05)  # aumentato da 0.01
            
        # Update Kalman
        self.K = self.P / (self.P + self.R)
        self.x += self.K * innovation
        self.P = (1 - self.K) * self.P
        
        return self.x
"""
 
"""
 class AdaptiveKalmanFilter:
    def __init__(self, window_size=15):
        self.Q = 0.01  # Rumore processo iniziale
        self.R = 0.1   # Rumore misura iniziale
        self.P = 1.0   # Stima errore
        self.K = 0.0   # Guadagno Kalman
        self.x = 0.0   # Stima stato
        
        self.window_size = window_size
        self.measurements = []
        self.innovations = []
        
        self.Q_min = 0.01
        self.R_min = 0.1
        
        # Soglia per reset
        self.reset_threshold = 1000
        
    def update(self, measurement):
        # Check per reset
        if abs(self.x - measurement) > self.reset_threshold:
            print("Kalman reset - gap troppo grande")
            self.x = measurement
            self.P = 1.0
            self.measurements = []
            self.innovations = []
            return measurement
        
        self.P += self.Q
        innovation = measurement - self.x
        self.innovations.append(innovation)
        self.measurements.append(measurement)
        
        if len(self.measurements) > self.window_size:
            self.measurements.pop(0)
            self.innovations.pop(0)
            
            innovation_variance = self.calc_variance(self.innovations)
            self.R = max(self.R_min, innovation_variance)
            
            measurement_diffs = []
            for i in range(1, len(self.measurements)):
                measurement_diffs.append(self.measurements[i] - self.measurements[i-1])
            dynamics_variance = self.calc_variance(measurement_diffs)
            self.Q = max(self.Q_min, dynamics_variance * 0.05)
            
        self.K = self.P / (self.P + self.R)
        self.x += self.K * innovation
        self.P = (1 - self.K) * self.P
        
        return self.x
"""

class AdaptiveKalmanFilter:
    def __init__(self, window_size=15):
        self.Q = 0.01  # Rumore processo iniziale
        self.R = 0.1   # Rumore misura iniziale
        self.P = 1.0   # Stima errore
        self.K = 0.0   # Guadagno Kalman
        self.x = 0.0   # Stima stato
        
        self.window_size = window_size
        self.measurements = []
        self.innovations = []
        
        self.Q_min = 0.01
        self.R_min = 0.1
        
        # Soglie
        self.reset_threshold = 1000
        self.velocity_threshold = 500  # mm/s
        
    def calc_variance(self, data):
        if not data:
            return 0
        mean = sum(data) / len(data)
        variance = sum((x - mean) ** 2 for x in data) / len(data)
        return variance
        
    def update(self, measurement):
        # Check per movimento veloce
        if self.measurements and len(self.measurements) > 1:
            dt = 0.004  # assumendo 250Hz
            velocity = abs(measurement - self.measurements[-1]) / dt
            if velocity > self.velocity_threshold:
                print("Movimento veloce rilevato")
                self.Q = max(self.Q, 0.1)
                self.P *= 2
        
        # Reset se la stima diventa negativa con misura positiva
        if measurement >= 0 and self.x < 0:
            print("Reset per stima negativa")
            self.x = measurement
            self.P = 1.0
            self.measurements = []
            self.innovations = []
            return measurement
            
        # Reset normale per divergenza eccessiva
        if abs(self.x - measurement) > self.reset_threshold:
            print("Reset per gap troppo grande")
            self.x = measurement
            self.P = 1.0
            self.measurements = []
            self.innovations = []
            return measurement
        
        # Normale update di Kalman
        self.P += self.Q
        innovation = measurement - self.x
        self.innovations.append(innovation)
        self.measurements.append(measurement)
        
        if len(self.measurements) > self.window_size:
            self.measurements.pop(0)
            self.innovations.pop(0)
            
            innovation_variance = self.calc_variance(self.innovations)
            self.R = max(self.R_min, innovation_variance)
            
            measurement_diffs = []
            for i in range(1, len(self.measurements)):
                measurement_diffs.append(self.measurements[i] - self.measurements[i-1])
            dynamics_variance = self.calc_variance(measurement_diffs)
            self.Q = max(self.Q_min, dynamics_variance * 0.05)
            
        self.K = self.P / (self.P + self.R)
        self.x += self.K * innovation
        self.P = (1 - self.K) * self.P
        
        return self.x