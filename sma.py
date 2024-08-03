class SimpleMovingAverage:
    def __init__(self, window_size, num_sensors):
        """
        https://en.wikipedia.org/wiki/Moving_average#Simple_moving_average
        
        Initialize the SimpleMovingAverage class.

        Parameters:
        window_size (int): The number of data points to consider in the moving average.
        num_sensors (int): The number of sensors providing data.
        """
        self.window_size = window_size
        self.num_sensors = num_sensors
        self.data_queues = [[] for _ in range(num_sensors)]
        self.sma_values = [0] * num_sensors
        self.sums = [0] * num_sensors
           
    def update_sma(self, new_values):
        for i in range(self.num_sensors):
            if len(self.data_queues[i]) == self.window_size:
                oldest_value = self.data_queues[i].pop(0)
                self.sums[i] -= oldest_value
                
            self.data_queues[i].append(new_values[i])
            self.sums[i] += new_values[i]

        return [self.sums[i] / len(self.data_queues[i]) for i in range(self.num_sensors)]
