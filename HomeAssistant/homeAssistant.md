> [Ritorna alla pagina principale](/README.md)


# **Integrazione con Home Assistant**

Per configurare Home Assistant per ricevere e visualizzare queste misure tramite MQTT, possiamo utilizzare il componente mqtt per i sensori. Home Assistant può ricevere il payload JSON e utilizzare template per estrarre i singoli valori.

## **Passaggi da seguire**

1. **Configurare il broker** MQTT in Home Assistant: assicurati che Home Assistant sia configurato per connettersi al tuo broker MQTT.
2. **Creare le entità** dei sensori MQTT con un template: configura i sensori MQTT in Home Assistant per per eseguire il parsing del payload JSON.

Esempio di impostazione del file ```configuration.yaml```:

```yaml
mqtt:
  broker: "your_mqtt_broker"
  username: "your_username"
  password: "your_password"


sensor:
  - platform: mqtt
    name: "Temperature"
    state_topic: "your_topic/measures"
    value_template: "{{ value_json.measures.tempSensor.temp }}"
    unit_of_measurement: "°C"

  - platform: mqtt
    name: "Pressure"
    state_topic: "your_topic/measures"
    value_template: "{{ value_json.measures.tempSensor.press }}"
    unit_of_measurement: "hPa"

  - platform: mqtt
    name: "Humidity"
    state_topic: "your_topic/measures"
    value_template: "{{ value_json.measures.tempSensor.hum }}"
    unit_of_measurement: "%"

  - platform: mqtt
    name: "Gas"
    state_topic: "your_topic/measures"
    value_template: "{{ value_json.measures.tempSensor.gas }}"
    unit_of_measurement: "ppm"

  - platform: mqtt
    name: "Visible Light"
    state_topic: "your_topic/measures"
    value_template: "{{ value_json.measures.luxSensor.visible }}"
    unit_of_measurement: "lx"

  - platform: mqtt
    name: "Infrared Light"
    state_topic: "your_topic/measures"
    value_template: "{{ value_json.measures.luxSensor.infrared }}"
    unit_of_measurement: "lx"

  - platform: mqtt
    name: "Total Light"
    state_topic: "your_topic/measures"
    value_template: "{{ value_json.measures.luxSensor.total }}"
    unit_of_measurement: "lx"

  - platform: mqtt
    name: "Radar X"
    state_topic: "your_topic/measures"
    value_template: "{{ value_json.measures.radar.x }}"
    unit_of_measurement: "m"

  - platform: mqtt
    name: "Radar Y"
    state_topic: "your_topic/measures"
    value_template: "{{ value_json.measures.radar.y }}"
    unit_of_measurement: "m"

  - platform: mqtt
    name: "Radar Velocity"
    state_topic: "your_topic/measures"
    value_template: "{{ value_json.measures.radar.vel }}"
    unit_of_measurement: "m/s"

  - platform: mqtt
    name: "Radar Distance"
    state_topic: "your_topic/measures"
    value_template: "{{ value_json.measures.radar.distres }}"
    unit_of_measurement: "m"
```

## **Integrazione della griglia di monitoraggio**


La **griglia di monitoraggio** può essere integrata nella dashboard di Home Assistant utilizzando la** Lovelace iframe card**. Questa card ti permette di inserire una pagina web esterna (come il file HTML che abbiamo creato) direttamente nella dashboard di Home Assistant.

### **Passaggi per Integrare la Pagina HTML nella Dashboard di Home Assistant**

1. Pubblica il File HTML: assicurati che il file HTML sia accessibile tramite un server web. Puoi ospitare questo file su un server web locale o su un servizio di hosting di file.
2. Usa una iframe Card in Lovelace: configura una card iframe in Lovelace per includere la pagina HTML.

Aggiungi l'URL del file ```radar.html``` ospitato alla tua configurazione di Lovelace usando un'iframe card.

```yaml
# ui-lovelace.yaml
title: Home
views:
  - title: Dashboard
    cards:
      - type: iframe
        url: "http://your_local_server/radar.html"
        aspect_ratio: 100%
        title: Radar Coordinate Display
```

Oppure aggiungi l'URL del file ```radar2.html``` ospitato alla tua configurazione di Lovelace usando un'iframe card.

```yaml
# ui-lovelace.yaml
title: Home
views:
  - title: Dashboard
    cards:
      - type: iframe
        url: "http://your_local_server/radar2.html"
        aspect_ratio: 100%
        title: Radar Coordinate Display
```

Sitografia:
- chatGPT per integrazione con Home Assistant
  
> [Ritorna alla pagina principale](/README.md)
