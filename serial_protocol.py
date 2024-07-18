from machine import UART
import binascii
import time

class Radar:
    COMMAND_HEADER = b'\xfd\xfc\xfb\xfa'
    COMMAND_TAIL = b'\x04\x03\x02\x01'
    REPORT_HEADER = b'\xaa\xff\x03\x00'
    REPORT_TAIL = b'\x55\xcc'


    def __init__(self, uart):
        self.uart = uart
        # Definizione delle costanti in MicroPython
        COMMAND_HEADER = bytes.fromhex('FDFCFBFA')
        COMMAND_TAIL = bytes.fromhex('04030201')
        REPORT_HEADER = bytes.fromhex('AAFF0300')
        REPORT_TAIL = bytes.fromhex('55CC')
        # Stampa per verificare che le variabili siano definite correttamente
        print('COMMAND_HEADER:', COMMAND_HEADER)
        print('COMMAND_TAIL:', COMMAND_TAIL)
        print('REPORT_HEADER:', REPORT_HEADER)
        print('REPORT_TAIL:', REPORT_TAIL)
    
    def to_hex_string(self, byte_list):
        # Funzione per convertire una lista di byte in una stringa esadecimale
        if byte_list is None:
            return 'N/A'  # Oppure puoi restituire un messaggio come 'N/A'
        return ' '.join(f'{b:02x}' for b in byte_list)
    
    def from_signed_bytes(self, data):
        #print("data", data)
        #print("data0", data[0])
        value = 2**15
        
        #print("sign_bit", data[0] & sign_bit)
        
        value = (data[0] | (data[1] << 8));
        
        if data[1] & 0x80:
            value -= 2**15
        else:
            value = -value
    
        #print("value", value)
        
        #0E 03 B1 86
        #Target 1 X coordinate: 0x0E + 0x03 * 256 = 782 0    - 782 = -782 mm
        #Target 1 Y coordinate: 0xB1 + 0x86 * 256 = 34481    34481 - 2^15 = 1713 mm
         
        return value
    
    def from_unsigned_bytes(self, data):
        value = (data[0] | (data[1] << 8));  
        return value
    
    def flushUart(self):
        num = self.uart.any()
        self.uart.read(num)
    
    def read_until(self, tail, timeout=5):
        buffer = bytearray()
        start_time = time.ticks_ms()
        lentail = len(tail)
        
        while True:
            num = self.uart.any()
            #print(f'num: {num}')
            if num:  # Controlla se ci sono dati disponibili nel buffer di ricezione
                byte = self.uart.read(lentail)  # Legge un byte dalla UART
                if byte:
                    #print(f'Byte letto: {byte}')  # Stampa di debug per il byte letto
                    buffer.extend(byte)  # Aggiunge il byte letto al buffer
                    if buffer[-lentail:] == tail:  # Verifica se gli ultimi byte del buffer corrispondono al tail
                        #print(f'Tail trovato: {tail}')  # Stampa di debug per il tail trovato
                        break
            #else:
            if time.ticks_diff(time.ticks_ms(), start_time) > timeout * 1000:
                print("Timeout: non è stato possibile trovare il tail.")
                return None
            #time.sleep(0.01)  # Small delay to prevent a busy loop
            
        return bytes(buffer[-30:])  # Restituisce i dati letti come un oggetto bytes


    def _send_command(self, intra_frame_length, command_word, command_value):
        '''
        Send a command to the radar (see docs 2.1.2)
        Parameters:
        - intra_frame_length (bytes): the intra frame length
        - command_word (bytes): the command word
        - command_value (bytes): the command value
        Returns:
        - response (bytes): the response from the radar
        '''
        # Create the command
        command = self.COMMAND_HEADER + intra_frame_length + command_word + command_value + self.COMMAND_TAIL
        self.uart.write(command)
        print('command', self.to_hex_string(command), 'len', len(command) if command is not None else 0)
        response = self.read_until(self.COMMAND_TAIL)
        #print('response: ', response)
        print('response', self.to_hex_string(response), 'len', len(response) if response is not None else 0)
        if response is None:
            print('No response received from the radar.')
        return response

    def _get_command_success(self, response)->bool:
        '''
        Check if the command was sent successfully
        Parameters:
        - response (bytes): the response from the radar
        Returns:
        - success (bool): True if the command was sent successfully, False otherwise
        '''
        if response is None:
            return False
        success_int = int.from_bytes(response[8:10], 'little', False)
        return success_int == 0

    def enable_configuration_mode(self)->bool:
        '''
        Set the radar to configuration mode (see docs 2.2.1)
        Returns:
        - success (bool): True if the configuration mode was successfully enabled, False otherwise
        '''
        intra_frame_length = (4).to_bytes(2, 'little')
        command_word = b'\xFF\x00'
        command_value = b'\x01\x00'

        response = self._send_command(intra_frame_length, command_word, command_value)
        command_successful = self._get_command_success(response)
        if command_successful:
            print('Configuration mode enabled')
        else:
            print('Configuration enable failed')
        return command_successful

    def end_configuration_mode(self)->bool:
        '''
        End the configuration mode (see docs 2.2.2)
        Returns:
        - success (bool): True if the configuration mode was successfully ended, False otherwise
        '''
        intra_frame_length = (2).to_bytes(2, 'little')
        command_word = b'\xFE\x00'
        command_value = b''

        response = self._send_command(intra_frame_length, command_word, command_value)
        command_successful = self._get_command_success(response)
        if command_successful:
            print('Configuration mode disabled')
        else:
            print('Configuration disable failed')
        return command_successful

    def single_target_tracking(self)->bool:
        '''
        Set the radar to single target tracking mode (see docs 2.2.3)
        Returns:
        - success (bool): True if the single target tracking mode was successfully enabled, False otherwise
        '''
        intra_frame_length = (2).to_bytes(2, 'little')
        command_word = b'\x80\x00'
        command_value = b''

        response = self._send_command(intra_frame_length, command_word, command_value)
        command_successful = self._get_command_success(response)
        if command_successful:
            print('Single target tracking mode enabled')
        else:
            print('Single target tracking mode enable failed')
        return command_successful

    def multi_target_tracking(self)->bool:
        '''
        Set the radar to multi target tracking mode (see docs 2.2.4)
        Returns:
        - success (bool): True if the multiple target tracking mode was successfully enabled, False otherwise
        '''
        intra_frame_length = (2).to_bytes(2, 'little')
        command_word = b'\x90\x00'
        command_value = b''

        response = self._send_command(intra_frame_length, command_word, command_value)
        command_successful = self._get_command_success(response)
        if command_successful:
            print('Multi target tracking mode enabled')
        else:
            print('Multi target tracking mode enable failed')
        return command_successful

    def query_target_tracking(self)->int:
        '''
        Query the target tracking mode, the default mode is multi target tracking (see docs 2.2.5)
        Returns:
        - tracking mode (int): 1 for single target tracking, 2 for multi target tracking
        '''
        intra_frame_length = (2).to_bytes(2, 'little')
        command_word = b'\x91\x00'
        command_value = b''

        response = self._send_command(intra_frame_length, command_word, command_value)
        command_successful = self._get_command_success(response)
        if command_successful:
            tracking_type_int = int.from_bytes(response[10:12], 'little', True)
            print(f'Tracking mode: {tracking_type_int}')
            return tracking_type_int
        else:
            print('Query target tracking mode failed')
            return None

    def read_firmware_version(self)->str:
        '''
        Read the firmware version of the radar (see docs 2.2.6)
        Returns:
        - firmware_version (str): the firmware version of the radar
        '''
        #intra_frame_length = int(2).to_bytes(2, byteorder='little', signed=True)
        # Converto l'intero 2 in una sequenza di byte di lunghezza 2
        intra_frame_length = (2).to_bytes(2, 'little')
        command_word = bytes.fromhex('A000') 
        command_value = bytes.fromhex('')
        
        response = self._send_command(intra_frame_length, command_word, command_value)
        command_successful = self._get_command_success(response)
        if command_successful:            
            firmware_type = int.from_bytes(response[10:12], 'little', False)
            major_version_number = int.from_bytes(response[12:14], 'little', False)
            minor_version_number = int.from_bytes(response[14:18], 'little', False)
            firmware_version = f'V{firmware_type}.{major_version_number}.{minor_version_number}'
            print(f'Firmware version: {firmware_version}')
            return firmware_version
        else:
            print('Read firmware version failed')
            return None

    def set_serial_port_baud_rate(self, baud_rate=256000)->bool:
        '''
        Set the serial port baud rate of the radar (see docs 2.2.7)
        Parameters:
        - baud_rate (int): the baud rate of the radar
        Returns:
        - success (bool): True if the baud rate was successfully set, False otherwise
        '''
        possible_baud_rates = [9600, 19200, 38400, 57600, 115200, 230400, 256000, 460800]
        if baud_rate not in possible_baud_rates:
            raise ValueError('The baud rate must be one of the following: 9600, 19200, 38400, 57600, 115200, 230400, 256000, 460800')   

        intra_frame_length = (4).to_bytes(2, 'little')
        command_word = b'\xA1\x00'
        baudrate_index = possible_baud_rates.index(baud_rate)
        print('Index baud rate', baudrate_index)
        command_value = (baudrate_index+1).to_bytes(2, 'little')

        response = self._send_command(intra_frame_length, command_word, command_value)
        command_successful = self._get_command_success(response)
        if command_successful:
            print(f'Serial port baud rate set to {baud_rate}')
        else:
            print('Set serial port baud rate failed')
        return command_successful

    def restore_factory_settings(self)->bool:
        '''
        Restore the factory settings of the radar (see docs 2.2.8)
        Returns:
        - success (bool): True if the factory settings were successfully restored, False otherwise
        '''
        intra_frame_length = (2).to_bytes(2, 'little')
        command_word = b'\xA2\x00'
        command_value = b''

        response = self._send_command(intra_frame_length, command_word, command_value)
        command_successful = self._get_command_success(response)
        if command_successful:
            print('Factory settings restored')
        else:
            print('Restore factory settings failed')
        return command_successful

    def restart_module(self)->bool:
        '''
        Restart the radar module (see docs 2.2.9)
        Returns:
        - success (bool): True if the radar module was successfully restarted, False otherwise
        '''
        intra_frame_length = (2).to_bytes(2, 'little')
        command_word = b'\xA3\x00'
        command_value = b''

        response = self._send_command(intra_frame_length, command_word, command_value)
        command_successful = self._get_command_success(response)
        if command_successful:
            print('Module restarted')
        else:
            print('Module restart failed')
        return command_successful

    def bluetooth_setup(self, bluetooth_on=True)->bool:
        '''
        Turn the radar bluetooth on or off (see docs 2.2.10)
        Parameters:
        - bluetooth_on (bool): True to turn on bluetooth, False to turn off bluetooth
        Returns:
        - success (bool): True if the bluetooth setup was successful, False otherwise
        '''
        intra_frame_length = (4).to_bytes(2, 'little')
        command_word = b'\xA4\x00'
        command_value = b'\x01\x00' if bluetooth_on else b'\x00\x00'

        response = self._send_command(intra_frame_length, command_word, command_value)
        command_successful = self._get_command_success(response)
        if command_successful:
            print(f'Bluetooth {"enabled" if bluetooth_on else "disabled"}')
        else:
            print('Bluetooth setup failed')
        return command_successful

    def get_mac_address(self)->str:
        '''
        Get the bluetooth MAC address of the radar (see docs 2.2.11)
        Returns:
        - mac_address (str): the bluetooth MAC address of the radar
        '''
        intra_frame_length = (4).to_bytes(2, 'little')
        command_word = b'\xA5\x00'
        command_value = b'\x01\x00'

        response = self._send_command(intra_frame_length, command_word, command_value)
        command_successful = self._get_command_success(response)
        if command_successful:
            mac_address = response[10:22].decode('utf-8')
            print(f'MAC address: {mac_address}')
            return mac_address
        else:
            print('Get MAC address failed')
            return None

    def query_zone_filtering(self)->tuple[13]:
        '''
        Query the zone filtering mode of the radar (see docs 2.2.12)
        Returns:
        - region_coordinates (tuple): the coordinates of the zone filtering regions
        '''
        intra_frame_length = (2).to_bytes(2, 'little')
        command_word = b'\xC1\x00'
        command_value = b''

        response = self._send_command(intra_frame_length, command_word, command_value)
        command_successful = self._get_command_success(response)
        if command_successful:
            zone_filtering_mode = int.from_bytes(response[10:12], 'little', True)
            region1_x1 = int.from_bytes(response[12:14], 'little', True)
            region1_y1 = int.from_bytes(response[14:16], 'little', True)
            region1_x2 = int.from_bytes(response[16:18], 'little', True)
            region1_y2 = int.from_bytes(response[18:20], 'little', True)
            region2_x1 = int.from_bytes(response[20:22], 'little', True)
            region2_y1 = int.from_bytes(response[22:24], 'little', True)
            region2_x2 = int.from_bytes(response[24:26], 'little', True)
            region2_y2 = int.from_bytes(response[26:28], 'little', True)
            region_coordinates = (
                (region1_x1, region1_y1, region1_x2, region1_y2),
                (region2_x1, region2_y1, region2_x2, region2_y2)
            )
            print(f'Zone filtering mode: {zone_filtering_mode}')
            print(f'Region 1: {region_coordinates[0]}')
            print(f'Region 2: {region_coordinates[1]}')
            return region_coordinates
        else:
            print('Query zone filtering failed')
            return None

    def read_radar_data(self)->tuple[12]:
        '''
        Read the basic mode data from the serial port line (see docs 2.3)
        Parameters:
        - serial_port_line (bytes): the serial port line
        Returns:
        - radar_data (tuple[12]): the radar data
            - [0-3] x, y, speed, distance_resolution of target 1
            - [4-7] x, y, speed, distance_resolution of target 2
            - [8-11] x, y, speed, distance_resolution of target 3
        '''
         
        
        serial_port_line = self.read_until(self.REPORT_TAIL)
        
        # Check if the frame header and tail are present
        if serial_port_line  is not None and self.REPORT_HEADER in serial_port_line and self.REPORT_TAIL in serial_port_line:
            # Interpret the target data
            if len(serial_port_line) == 30:
                #print('AllMsg: ', self.to_hex_string(serial_port_line), 'len', len(serial_port_line) if serial_port_line is not None else 0)
                target1_bytes = serial_port_line[4:12]
                target2_bytes = serial_port_line[12:20]
                target3_bytes = serial_port_line[20:28]
              
                #print('t1', self.to_hex_string(target1_bytes), 'len', len(target1_bytes) if target1_bytes is not None else 0)
                #print('t2', self.to_hex_string(target2_bytes), 'len', len(target2_bytes) if target2_bytes is not None else 0)
                #print('t3', self.to_hex_string(target3_bytes), 'len', len(target3_bytes) if target3_bytes is not None else 0)
                #print('-' * 30)
                
                all_targets_bytes = [target1_bytes, target2_bytes, target3_bytes]

                all_targets_data = []

                for target_bytes in all_targets_bytes:
                    x = self.from_signed_bytes(target_bytes[0:2])
                    y = self.from_signed_bytes(target_bytes[2:4])
                    speed = self.from_signed_bytes(target_bytes[4:6])
                    distance_resolution = self.from_unsigned_bytes(target_bytes[6:8])
        
                    #substract 2^15 depending if negative or positive
                    #x = x if x >= 0 else -2**15 - x
                    #y = y if y >= 0 else -2**15 - y
                    #speed = speed if speed >= 0 else -2**15 - speed

                    # append ftarget data to the list and flatten
                    all_targets_data.extend([x, y, speed, distance_resolution])
                
                return tuple(all_targets_data)
            
            # if the target data is not 17 bytes long the line is corrupted
            else:
                print("Serial port line corrupted - not 30 bytes long")
                return None
        # if the header and tail are not present the line is corrupted
        else: 
            print("Serial port line corrupted - header or tail not present")
            return None

    def printTargets(self):
        try:
            all_target_values = self.read_radar_data()
            
            if all_target_values is None:
                return

            target1_x, target1_y, target1_speed, target1_distance_res, \
            target2_x, target2_y, target2_speed, target2_distance_res, \
            target3_x, target3_y, target3_speed, target3_distance_res \
                = all_target_values

            # Print the interpreted information for all targets
            #print(f'Target 1 x-coordinate: {target1_x} mm')
            #print(f'Target 1 y-coordinate: {target1_y} mm')
            #print(f'Target 1 speed: {target1_speed} cm/s')
            #print(f'Target 1 distance res: {target1_distance_res} mm')

            #print(f'Target 2 x-coordinate: {target2_x} mm')
            #print(f'Target 2 y-coordinate: {target2_y} mm')
            #print(f'Target 2 speed: {target2_speed} cm/s')
            #print(f'Target 2 distance res: {target2_distance_res} mm')

            #print(f'Target 3 x-coordinate: {target3_x} mm')
            #print(f'Target 3 y-coordinate: {target3_y} mm')
            #print(f'Target 3 speed: {target3_speed} cm/s')
            #print(f'Target 3 distance res: {target3_distance_res} mm')

            #print('-' * 30)
            
            result = {
                'lista_x': [target1_x, target2_x, target3_x],
                'lista_y': [target1_y, target2_y, target3_y],
                'lista_v': [target1_speed, target2_speed, target3_speed],
                'lista_dr': [target1_distance_res, target2_distance_res, target3_distance_res]
            }
            
            return result

        except KeyboardInterrupt:
            # Close the serial port on keyboard interrupt
            ser.close()
            print("Serial port closed.")



