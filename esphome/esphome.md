
> [Ritorna alla pagina principale](/README.md)


```yaml
esphome:
  name: your_device_name
  platform: ESP8266
  board: nodemcuv2

wifi:
  ssid: "your_ssid"
  password: "your_password"

mqtt:
  broker: "your_mqtt_broker"
  username: "your_username"
  password: "your_password"

sensor:
  - platform: template
    name: "Temperature"
    id: tempSensor_temp
    unit_of_measurement: "°C"
    accuracy_decimals: 2
    lambda: |-
      return id(tempSensor_temp_value).state;
    update_interval: never

  - platform: template
    name: "Pressure"
    id: tempSensor_press
    unit_of_measurement: "hPa"
    accuracy_decimals: 0
    lambda: |-
      return id(tempSensor_press_value).state;
    update_interval: never

  - platform: template
    name: "Humidity"
    id: tempSensor_hum
    unit_of_measurement: "%"
    accuracy_decimals: 2
    lambda: |-
      return id(tempSensor_hum_value).state;
    update_interval: never

  - platform: template
    name: "Gas"
    id: tempSensor_gas
    unit_of_measurement: "ppm"
    accuracy_decimals: 0
    lambda: |-
      return id(tempSensor_gas_value).state;
    update_interval: never

  - platform: template
    name: "Visible Light"
    id: luxSensor_visible
    unit_of_measurement: "lx"
    accuracy_decimals: 2
    lambda: |-
      return id(luxSensor_visible_value).state;
    update_interval: never

  - platform: template
    name: "Infrared Light"
    id: luxSensor_infrared
    unit_of_measurement: "lx"
    accuracy_decimals: 2
    lambda: |-
      return id(luxSensor_infrared_value).state;
    update_interval: never

  - platform: template
    name: "Total Light"
    id: luxSensor_total
    unit_of_measurement: "lx"
    accuracy_decimals: 2
    lambda: |-
      return id(luxSensor_total_value).state;
    update_interval: never

  - platform: template
    name: "Radar X"
    id: radar_x
    unit_of_measurement: "m"
    accuracy_decimals: 2
    lambda: |-
      return id(radar_x_value).state;
    update_interval: never

  - platform: template
    name: "Radar Y"
    id: radar_y
    unit_of_measurement: "m"
    accuracy_decimals: 2
    lambda: |-
      return id(radar_y_value).state;
    update_interval: never

  - platform: template
    name: "Radar Velocity"
    id: radar_vel
    unit_of_measurement: "m/s"
    accuracy_decimals: 2
    lambda: |-
      return id(radar_vel_value).state;
    update_interval: never

  - platform: template
    name: "Radar Distance"
    id: radar_distres
    unit_of_measurement: "m"
    accuracy_decimals: 0
    lambda: |-
      return id(radar_distres_value).state;
    update_interval: never

text_sensor:
  - platform: template
    id: json_data

globals:
  - id: tempSensor_temp_value
    type: float
    initial_value: '0.0'

  - id: tempSensor_press_value
    type: float
    initial_value: '0.0'

  - id: tempSensor_hum_value
    type: float
    initial_value: '0.0'

  - id: tempSensor_gas_value
    type: float
    initial_value: '0.0'

  - id: luxSensor_visible_value
    type: float
    initial_value: '0.0'

  - id: luxSensor_infrared_value
    type: float
    initial_value: '0.0'

  - id: luxSensor_total_value
    type: float
    initial_value: '0.0'

  - id: radar_x_value
    type: float
    initial_value: '0.0'

  - id: radar_y_value
    type: float
    initial_value: '0.0'

  - id: radar_vel_value
    type: float
    initial_value: '0.0'

  - id: radar_distres_value
    type: float
    initial_value: '0.0'

mqtt:
  on_json_message:
    topic: your_device_name/measures
    then:
      - lambda: |-
          auto call = id(json_data).make_call();
          call.set_value(x["tempSensor"]["temp"].as<float>());
          id(tempSensor_temp_value) = call.get_value();
          call.set_value(x["tempSensor"]["press"].as<float>());
          id(tempSensor_press_value) = call.get_value();
          call.set_value(x["tempSensor"]["hum"].as<float>());
          id(tempSensor_hum_value) = call.get_value();
          call.set_value(x["tempSensor"]["gas"].as<float>());
          id(tempSensor_gas_value) = call.get_value();
          call.set_value(x["luxSensor"]["visible"].as<float>());
          id(luxSensor_visible_value) = call.get_value();
          call.set_value(x["luxSensor"]["infrared"].as<float>());
          id(luxSensor_infrared_value) = call.get_value();
          call.set_value(x["luxSensor"]["total"].as<float>());
          id(luxSensor_total_value) = call.get_value();
          call.set_value(x["radar"]["x"].as<float>());
          id(radar_x_value) = call.get_value();
          call.set_value(x["radar"]["y"].as<float>());
          id(radar_y_value) = call.get_value();
          call.set_value(x["radar"]["vel"].as<float>());
          id(radar_vel_value) = call.get_value();
          call.set_value(x["radar"]["distres"].as<float>());
          id(radar_distres_value) = call.get_value();
```


> [Ritorna alla pagina principale](README.md)
