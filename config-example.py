WIFI_SSID = "WiFi-example"
WIFI_PASSWORD = "0123456789"
MQTT_CLIENT_ID = "radar-01"
# The main broker is the preferred broker
# The backup broker is choosen only when the main broker is unavailable
# If the backup broker is active, the main broker is periodically tested and
# selected if again avalilable
# The same behaviour is applied by the IoT device
MQTT_BROKER1 = "mqtt.example.com"
MQTT_BROKER2 = "mqtt2.example.com"
MQTT_USER = ""
MQTT_PASSWORD = ""
MQTT_PUSHTOPIC = "radar/measures"
MQTT_CMDTOPIC = "radar/commands"
MQTT_STATETOPIC = "radar/state"
