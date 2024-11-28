from kalman import *
import utime
import math
"""
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
"""    
class EMAFilter:
    def __init__(self, alpha=0.6):
        self.alpha = alpha
        self.value = None
        self.reset_threshold = 1000
        
    def update(self, new_value):
        if self.value is None:
            self.value = new_value
        elif abs(self.value - new_value) > self.reset_threshold:
            print("EMA reset - gap troppo grande")
            self.value = new_value
        else:
            self.value = self.alpha * new_value + (1 - self.alpha) * self.value
        return self.value

class MotionTracker:
   def __init__(self):
       # Kalman adattivi per x e y
       self.kalman_x = AdaptiveKalmanFilter(window_size=15)
       self.kalman_y = AdaptiveKalmanFilter(window_size=15)
       
       # EMA separati per x, y e velocità
       self.ema_x = EMAFilter(alpha=0.6)
       self.ema_y = EMAFilter(alpha=0.6)
       self.ema_v = EMAFilter(alpha=0.6)
       
       self.comp_filter = ComplementaryFilter(alpha=0.7)
       
       # Buffer per storia
       self.window_size = 20
       self.position_history = []
       self.velocity_history = []
       
   def update(self, x, y, v):
       # Filtraggio Kalman
       kalman_pos = {
           'x': self.kalman_x.update(float(x)),
           'y': self.kalman_y.update(float(y))
       }
       
       # Filtraggio EMA
       ema_pos = {
           'x': self.ema_x.update(float(x)),
           'y': self.ema_y.update(float(y))
       }
       
       # Media pesata delle posizioni filtrate
       filtered_pos = {
           'x': (kalman_pos['x'] + ema_pos['x']) / 2,
           'y': (kalman_pos['y'] + ema_pos['y']) / 2
       }
       
       # Filtraggio velocità
       filtered_v = self.ema_v.update(float(v))
       
       # Aggiorna buffers
       self.update_histories(filtered_pos, filtered_v)
       
       return {
           'position': filtered_pos,
           'velocity': filtered_v,
           'kalman_pos': kalman_pos,
           'ema_pos': ema_pos
       }
       
   def update_histories(self, pos, vel):
       # Aggiorna buffer
       self.position_history.append(pos)
       self.velocity_history.append(vel)
       
       # Mantieni dimensione finestra
       if len(self.position_history) > self.window_size:
           self.position_history.pop(0)
           self.velocity_history.pop(0)
        
class MotionPlotter:
    def __init__(self):
        self.tracker = MotionTracker()
        self.figure = plt.figure(figsize=(12, 6))
        
    def update_plot(self, x, y, v):
        # Ottieni dati filtrati
        motion_data = self.tracker.update(x, y, v)
        
        # Plot traiettoria
        plt.subplot(1, 2, 1)
        self.plot_trajectory(motion_data['position'])
        
        # Plot velocità
        plt.subplot(1, 2, 2)
        self.plot_velocity(motion_data['velocity'])
        
        plt.tight_layout()
        plt.draw()
    
    def plot_trajectory(self, position):
        plt.clf()
        plt.plot(position['x'], position['y'], 'b.')
        plt.title('Traiettoria XY')
        plt.xlabel('X')
        plt.ylabel('Y')
        plt.grid(True)
    
    def plot_velocity(self, velocity):
        plt.clf()
        t = np.arange(len(self.tracker.velocity_history))
        plt.plot(t, self.tracker.velocity_history, 'r-', label='Velocità')
        plt.title('Velocità')
        plt.xlabel('Campioni')
        plt.ylabel('Velocità')
        plt.legend()
        plt.grid(True)
"""      
    # Inizializzazione
    plotter = MotionPlotter()

    # Nel loop principale
    while True:
        # Lettura dati LD2450
        x, y = read_position()
        v = read_velocity()
        
        # Aggiorna plot con dati filtrati
        plotter.update_plot(x, y, v)
"""

"""
Aggiunto filtro complementare che:

- Usa la velocità scalare per stimare lo spostamento nella direzione del movimento
- Fonde questa stima con le posizioni misurate
- Considera il dt tra misure


Pipeline di filtraggio a due stadi:

- Prima Kalman su x,y separatamente
- Poi fusione complementare con la velocità


Il filtro complementare aiuta a:

- Ridurre il rumore nelle misure di posizione
- Migliorare la continuità del movimento
- Sfruttare l'informazione di velocità per stimare meglio gli spostamenti

Questa soluzione dovrebbe darti un tracciamento più fluido e preciso.
"""
