class MovingMaxMin:
    def __init__(self, window_size, num_sensors):
        """
        Initialize the SimpleMovingQuantile class.

        Parameters:
        window_size (int): The number of data points to consider in the moving quantile.
        num_sensors (int): The number of sensors providing data.
        quantile (float): The quantile to calculate (between 0 and 1).
        """
        self.window_size = window_size
        self.num_sensors = num_sensors
        self.data_queues_min = [[] for _ in range(num_sensors)]
        self.data_queues_max = [[] for _ in range(num_sensors)]
        self.sorted_windows_min = [[] for _ in range(num_sensors)]
        self.sorted_windows_max = [[] for _ in range(num_sensors)]
    
    def bisect_left(self, a, x, lo=0, hi=None):
        if lo < 0:
            raise ValueError('lo must be non-negative')
        if hi is None:
            hi = len(a)
        while lo < hi:
            mid = (lo + hi) // 2
            if a[mid] < x:
                lo = mid + 1
            else:
                hi = mid
        return lo

    def insort(self, a, x, lo=0, hi=None):
        lo = self.bisect_left(a, x, lo, hi)
        a.insert(lo, x)
        
    def update_min(self, new_values):
        for i in range(self.num_sensors):
            if len(self.data_queues_min[i]) == self.window_size:
                oldest_value = self.data_queues_min[i].pop(0)
                index = self.bisect_left(self.sorted_windows_min[i], oldest_value)
                self.sorted_windows_min[i].pop(index)

            self.data_queues_min[i].append(new_values[i])
            self.insort(self.sorted_windows_min[i], new_values[i])

        return [self.sorted_windows_min[i][0] for i in range(self.num_sensors)]

    def update_max(self, new_values):
        for i in range(self.num_sensors):
            if len(self.data_queues_max[i]) == self.window_size:
                oldest_value = self.data_queues_max[i].pop(0)
                index = self.bisect_left(self.sorted_windows_max[i], oldest_value)
                self.sorted_windows_max[i].pop(index)

            self.data_queues_max[i].append(new_values[i])
            self.insort(self.sorted_windows_max[i], new_values[i])

        return [self.sorted_windows_max[i][-1] for i in range(self.num_sensors)]
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

# Initialize the SimpleMovingQuantile class with a window size of 3, 3 sensors, and 0.5 quantile (median)
smq_calculator = SimpleMovingQuantile(window_size=3, num_sensors=3, quantile=0.5)

# Update the SMQ with each set of sensor data and print the results
for data in sensor_data:
    smq = smq_calculator.update_smq(data)
    print(f"Updated SMQ values: {smq}")
"""
