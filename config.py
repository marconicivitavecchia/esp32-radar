WIFI_SSID1 = "xxxxxxxxx1"
WIFI_PASSWORD1 = "yyyyyyyy1"
WIFI_SSID2 = "xxxxxx2"
WIFI_PASSWORD2 = "yyyyyyy2"
MQTT_CLIENT_ID = "radar-"
# The main broker is the preferred broker
# The backup broker is choosen only when the main broker is unavailable
# If the backup broker is active, the main broker is periodically tested and
# selected if again avalilable
# The same behaviour is applied by the IoT device
MQTT_BROKER1 = "mqtt1.example.com"
MQTT_BROKER2 = "mqtt2.example.com"
NTP_SERVER = "3.pool.ntp.org"
MQTT_USER = ""
MQTT_PASSWORD = ""
MQTT_PUSHTOPIC = "radar/misure"
MQTT_CMDTOPIC = "radar/comandi"
MQTT_STATETOPIC = "radar/stato"
