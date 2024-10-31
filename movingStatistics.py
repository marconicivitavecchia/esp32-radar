from collections import deque
import bisect

class MovingStatistics:
    def __init__(self, window_size, num_sensors, alpha=0.1):
        """
        Initialize the MovingStatistics class.

        Parameters:
        window_size (int): The number of data points to consider in the moving calculations.
        num_sensors (int): The number of sensors providing data.
        alpha (float): Smoothing factor for the EMA.
        """
        self.window_size = window_size
        self.num_sensors = num_sensors
        self.alpha = alpha
        self.data_queues = [deque() for _ in range(num_sensors)]
        self.sorted_windows = [[] for _ in range(num_sensors)]
        self.sums = [0] * num_sensors
        self.ema_values = [None] * num_sensors
    
    def setNumSensors(self, num_sensors):
        self.num_sensors = num_sensors
        
    def update(self, new_values):
        """
        Update the statistics with new sensor data.

        Parameters:
        new_values (list of floats): New measurements from all sensors.
        """
        for i in range(self.num_sensors):
            if len(self.data_queues[i]) == self.window_size:
                # Remove the oldest value from the deque and sorted window
                oldest_value = self.data_queues[i].popleft()
                self.sums[i] -= oldest_value
                index = bisect.bisect_left(self.sorted_windows[i], oldest_value)
                self.sorted_windows[i].pop(index)

            # Add the new value to the deque and the sorted window
            self.data_queues[i].append(new_values[i])
            bisect.insort(self.sorted_windows[i], new_values[i])
            self.sums[i] += new_values[i]

            # Update EMA
            if self.ema_values[i] is None:
                self.ema_values[i] = new_values[i]
            else:
                self.ema_values[i] = self.alpha * new_values[i] + (1 - self.alpha) * self.ema_values[i]

    def sma(self):
        """
        Calculate the Simple Moving Average (SMA) for each sensor.

        Returns:
        list of floats: The SMA values for each sensor.
        """
        return [self.sums[i] / len(self.data_queues[i]) if self.data_queues[i] else 0 for i in range(self.num_sensors)]

    def smm(self):
        """
        Calculate the Simple Moving Median (SMM) for each sensor.

        Returns:
        list of floats: The SMM values for each sensor.
        """
        medians = []
        for i in range(self.num_sensors):
            n = len(self.sorted_windows[i])
            if n == 0:
                medians.append(0)
            elif n % 2 == 1:
                medians.append(self.sorted_windows[i][n // 2])
            else:
                medians.append((self.sorted_windows[i][n // 2 - 1] + self.sorted_windows[i][n // 2]) / 2)
        return medians

    def smq(self, quantile):
        """
        Calculate the Simple Moving Quantile (SMQ) for each sensor.

        Parameters:
        quantile (float): The quantile to calculate (between 0 and 1).

        Returns:
        list of floats: The SMQ values for each sensor.
        """
        quantiles = []
        for i in range(self.num_sensors):
            n = len(self.sorted_windows[i])
            if n == 0:
                quantiles.append(0)
            else:
                quantile_index = int(quantile * (n - 1))
                quantiles.append(self.sorted_windows[i][quantile_index])
        return quantiles

    def minimum(self):
        """
        Get the minimum value in the current window for each sensor.

        Returns:
        list of floats: The minimum values for each sensor.
        """
        return [self.sorted_windows[i][0] if self.sorted_windows[i] else 0 for i in range(self.num_sensors)]

    def maximum(self):
        """
        Get the maximum value in the current window for each sensor.

        Returns:
        list of floats: The maximum values for each sensor.
        """
        return [self.sorted_windows[i][-1] if self.sorted_windows[i] else 0 for i in range(self.num_sensors)]

    def ema(self):
        """
        Get the Exponential Moving Average (EMA) for each sensor.

        Returns:
        list of floats: The EMA values for each sensor.
        """
        return self.ema_values
"""
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
    ms.update(data)
    print(f"SMA: {ms.sma()}")
    print(f"SMM: {ms.smm()}")
    print(f"SMQ (0.5 quantile): {ms.smq(0.5)}")
    print(f"Min: {ms.minimum()}")
    print(f"Max: {ms.maximum()}")
    print(f"EMA: {ms.ema()}")
"""