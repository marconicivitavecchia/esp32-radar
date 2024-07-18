from machine import I2C, Pin
import time

class LTR329:
    ADDR = 0x29

    # Register addresses
    ALS_CONTR = 0x80
    ALS_MEAS_RATE = 0x85
    ALS_DATA_CH1_0 = 0x88
    ALS_DATA_CH1_1 = 0x89
    ALS_DATA_CH0_0 = 0x8A
    ALS_DATA_CH0_1 = 0x8B

    # Control values
    ALS_CONTR_ACTIVE = 0x01
    ALS_CONTR_STANDBY = 0x00

    def __init__(self, i2c, address=ADDR):
        self.i2c = i2c
        self.address = address
        self.activate()

    def activate(self):
        self.i2c.writeto_mem(self.address, self.ALS_CONTR, bytearray([self.ALS_CONTR_ACTIVE]))
        self.i2c.writeto_mem(self.address, self.ALS_MEAS_RATE, bytearray([0x1C]))  # Integration time 100ms, measurement rate 500ms
        time.sleep(0.01)  # Delay for initialization

    def read_data(self):
        ch1_data = self.i2c.readfrom_mem(self.address, self.ALS_DATA_CH1_0, 2)
        ch0_data = self.i2c.readfrom_mem(self.address, self.ALS_DATA_CH0_0, 2)
        
        ch1 = ch1_data[1] << 8 | ch1_data[0]
        ch0 = ch0_data[1] << 8 | ch0_data[0]
        
        return ch0, ch1
    
    # Convert raw data in CH0 & CH1 registers to lux
    # Input:
    # CHRegs: register values, results of lux() function
    # returns the resulting lux calculation
    #         lux = -1 IF EITHER SENSOR WAS SATURATED (0XFFFF) OR CHRegs[0] == 0x0000
    def raw2Lux(self, ch0, ch1):
        # initial setup.
        # The initialization parameters in LTR329ALS01.py are:
        # gain: ALS_GAIN_1X, integration time: ALS_INT_100
        #
        gain = 0                        # gain: 0 (1X) or 7 (96X)
        integrationTimeMsec = 100       # integration time in ms

        # Determine if either sensor saturated (0xFFFF)
        # If so, abandon ship (calculation will not be accurate)
        if ((ch0 == 0xFFFF) or (ch1 == 0xFFFF)):
            lux = -1
            return(lux)
        # to calc correctly ratio, the CHRegs[0] must be != 0
        if (ch0 == 0x0000):
            lux = -1
            return(lux)
        
        # Convert from unsigned integer to floating point
        d0 = float(ch0)
        d1 = float(ch1)

        # We will need the ratio for subsequent calculations
        ratio = d1 / d0;

        # Normalize for integration time
        d0 = d0 * (402.0/integrationTimeMsec)
        d1 = d1 * (402.0/integrationTimeMsec)

        # Normalize for gain
        if (gain == 0):
            d0 = d0 * 16
            d1 = d1 * 16

        # Determine lux per datasheet equations:
        if (ratio < 0.5):
            lux = 0.0304 * d0 - 0.062 * d0 * math.pow(ratio,1.4)
            return(lux)

        if (ratio < 0.61):
            lux = 0.0224 * d0 - 0.031 * d1
            return(lux)

        if (ratio < 0.80):
            lux = 0.0128 * d0 - 0.0153 * d1
            return(lux)

        if (ratio < 1.30):
            lux = 0.00146 * d0 - 0.00112 * d1
            return(lux)

        lux = 0.0           # if (ratio > 1.30)
        return(lux)

    def calculate_lux_components(self, ch0, ch1):
        d0 = float(ch0)
        d1 = float(ch1)
        # Calcolo del rapporto
        ratio = d1 / (d0 + d1) if (d0 + d1) != 0 else 0
        print(f"Ratio: {ratio}")  # Debug print

        # Formula per i lux della luce visibile (esempio ipotetico, controlla la documentazione del sensore per formule precise)
        if ratio <= 0.50:
            lux_visible = 0.0304 * d0 - 0.062 * d0 * (ratio ** 1.4)
        elif ratio <= 0.61:
            lux_visible = 0.0224 * d0 - 0.031 * d1
        elif ratio <= 0.80:
            lux_visible = 0.0128 * d0 - 0.0153 * d1
        elif ratio <= 1.30:
            lux_visible = 0.00146 * d0 - 0.00112 * d1
        else:
            lux_visible = 0

        lux_visible = max(lux_visible, 0)
        
        # Formula per i lux dell'infrarosso (utilizzando i dati grezzi letti dal sensore LTR329)
        lux_ir = 0.0224 * d1 - 0.031 * d0 if ch0 + d1 != 0 else 0
        lux_ir = max(lux_ir, 0)
        return lux_visible, lux_ir

    def get_lux(self):
        ch0, ch1 = self.read_data()
        lux_visible, lux_ir = self.calculate_lux_components(ch0, ch1)
        #lux_visible = self.raw2Lux(ch0, ch1)
        total_lux = lux_ir + lux_visible
        return ch0, ch1, lux_visible, lux_ir, total_lux

