from sma import *
from smm import *
from smq import *
from maxmin import *
from smm_smq import *

class MovingStatistics:
    def __init__(self, window_size, num_sensors, alpha=0.1, quantile=0.5, quantile_low=0.25, quantile_high=0.75):
        self.window_size = window_size
        self.num_sensors = num_sensors
        self.alpha = alpha
        self.ema_values = [None] * num_sensors
        
        self.smm = SimpleMovingMedian(window_size, num_sensors)
        self.sma = SimpleMovingAverage(window_size, num_sensors)
        self.smq = SimpleMovingQuantile(window_size, num_sensors, quantile)
        self.smq1 = SimpleMovingQuantile(window_size, num_sensors, quantile)
        self.smq2 = SimpleMovingMedianQuantile(window_size, num_sensors, quantile)
        self.maxmin = MovingMaxMin(window_size, num_sensors)        
    
    def setNumSensors(self, num_sensors):
        self.num_sensors = num_sensors
        
    def getNumSensors(self):
        return self.num_sensors
        
    def update(self, new_values, stats_to_update):
        results = {}
        
        if 'sma' in stats_to_update:
            results['sma'] = self.sma.update_sma(new_values)
        if 'ema' in stats_to_update:
            results['ema'] = self.update_ema(new_values)
        if 'median' in stats_to_update:
            results['median'] = self.smm.update_median(new_values)
        if 'quantile' in stats_to_update:
            results['quantile'] = self.smq.update_quantile(new_values)
        if 'min' in stats_to_update:
            results['min'] = self.maxmin.update_min(new_values)
        if 'max' in stats_to_update:
            results['max'] = self.maxmin.update_max(new_values)
        if 'filter' in stats_to_update:
            results['filter'] = self.update_filter(new_values)
        if 'emafilter' in stats_to_update:
            results['emafilter'] = self.update_emafilter(new_values)
        if 'smafilter' in stats_to_update:
            results['smafilter'] = self.update_smafilter(new_values)
        
        return results

    def update_ema(self, new_values):
        for i in range(self.num_sensors):
            if self.ema_values[i] is None:
                self.ema_values[i] = new_values[i]
            else:
                self.ema_values[i] = self.alpha * new_values[i] + (1 - self.alpha) * self.ema_values[i]

        return self.ema_values.copy()
      
    def update_filter(self, new_values):    
        q_low = self.smq1.update_quantile(new_values)
        [median, q_high] = self.smq2.update_median_quantile(new_values)

        if median is None:
            raise ValueError("Median values must be calculated before filtering.")
        
        filtered_values = []
        for i in range(self.num_sensors):
            if q_low[i] <= new_values[i] <= q_high[i]:
                filtered_values.append(new_values[i])
            else:
                filtered_values.append(median[i])
                        
        return filtered_values
    
    def update_emafilter(self, new_values):
        filtered_values = self.update_filter(new_values)
        emafiltered = self.update_ema(filtered_values)
        
        return filtered_values
        
    def update_smafilter(self, new_values):                
        filtered_values = self.update_filter(new_values)
        smafiltered = self.sma.update_sma(filtered_values)
        
        return filtered_values
        
'''
# Example usage:
sensor_data = [
    [1, 10, 100],  # Measurements at time t0: sensor 1 = 1, sensor 2 = 10, sensor 3 = 100
    [2, 11, 101],  # Measurements at time t1
    [3, 12, 102],  # Measurements at time t2
    [4, 13, 103],  # Measurements at time t3
    [5, 14, 104],  # Measurements at time t4
    [6, 15, 105],  # Measurements at time t5
]

# Initialize the MovingStatistics class with a window size of 3, 3 sensors, and alpha for EMA
ms = MovingStatistics(window_size=3, num_sensors=3, alpha=0.1)

# Update the statistics with each set of sensor data and print the results
for data in sensor_data:
    results = ms.update(data, ['sma', 'ema', 'median', 'quantile', 'min', 'max'])
    print(f"SMA: {results.get('sma')}")
    print(f"EMA: {results.get('ema')}")
    print(f"Median: {results.get('median')}")
    print(f"Quantile (0.5): {results.get('quantile')}")
    print(f"Min: {results.get('min')}")
    print(f"Max: {results.get('max')}")
'''