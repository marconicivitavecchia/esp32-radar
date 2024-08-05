> [Ritorna alla pagina principale](/README.md)


# **Integrazione con Home Assistant**

Per configurare Home Assistant per ricevere e visualizzare queste misure tramite MQTT, possiamo utilizzare il componente mqtt per i sensori. Home Assistant può ricevere il payload JSON e utilizzare template per estrarre i singoli valori.

## **Passaggi da seguire**

1. **Configurare il broker** MQTT in Home Assistant: assicurati che Home Assistant sia configurato per connettersi al tuo broker MQTT.
2. **Creare le entità** dei sensori MQTT con un template: configura i sensori MQTT in Home Assistant per per eseguire il parsing del payload JSON.

Esempio di impostazione del file ```configuration.yaml```:

```yaml
mqtt:       
    sensor:
      - name: "Temperature"
        unique_id: "{{ value_json.boardID }}"
        state_topic: "radar/misure"
        value_template: "{{ value_json.measures.tempSensor.temp }}"
        unit_of_measurement: "°C"
        
      - name: "Pressure"
        state_topic: "radar/misure"
        value_template: "{{ value_json.measures.tempSensor.press }}"
        unit_of_measurement: "hPa"
    
      - name: "Humidity"
        state_topic: "radar/misure"
        value_template: "{{ value_json.measures.tempSensor.hum }}"
        unit_of_measurement: "%"
    
      - name: "Gas"
        state_topic: "radar/misure"
        value_template: "{{ value_json.measures.tempSensor.gas }}"
        unit_of_measurement: "ppm"
    
      - name: "Visible Light"
        state_topic: "radar/misure"
        value_template: "{{ value_json.measures.luxSensor.visible }}"
        unit_of_measurement: "lx"
    
      - name: "Infrared Light"
        state_topic: "radar/misure"
        value_template: "{{ value_json.measures.luxSensor.infrared }}"
        unit_of_measurement: "lx"
    
      - name: "Total Light"
        state_topic: "radar/misure"
        value_template: "{{ value_json.measures.luxSensor.total }}"
        unit_of_measurement: "lx"
    
      - name: "Radar X"
        state_topic: "radar/misure"
        value_template: "{{ value_json.measures.radar.x[0] }}"
        unit_of_measurement: "m"
    
      - name: "Radar Y"
        state_topic: "radar/misure"
        value_template: "{{ value_json.measures.radar.y[0] }}"
        unit_of_measurement: "mm"
    
      - name: "Radar Velocity"
        state_topic: "radar/misure"
        value_template: "{{ value_json.measures.radar.vel[0] }}"
        unit_of_measurement: "cm/s"
    
      - name: "Radar Distance"
        state_topic: "radar/misure"
        value_template: "{{ value_json.measures.radar.distres[0] }}"
        unit_of_measurement: "mm"
```

## **Integrazione di una griglia di monitoraggio esterna**


La **griglia di monitoraggio** può essere integrata nella dashboard di Home Assistant utilizzando la** Lovelace iframe card**. Questa card ti permette di inserire una pagina web esterna (come il file HTML che abbiamo creato) direttamente nella dashboard di Home Assistant.

### **Passaggi per Integrare la Pagina HTML nella Dashboard di Home Assistant**

1. Pubblica il File HTML: assicurati che il file HTML sia accessibile tramite un server web. Puoi ospitare questo file su un server web locale o su un servizio di hosting di file.
2. Usa una iframe Card in Lovelace: configura una card iframe in Lovelace per includere la pagina HTML.

Aggiungi l'URL del file ```radar.html```, fornito nella cartella web del progetto, alla tua configurazione di Lovelace usando un'iframe card.

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

Oppure aggiungi l'URL del file ```radar2.html```, fornito nella cartella web del progetto, alla tua configurazione di Lovelace usando un'iframe card.

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

## **Integrazione di una griglia di monitoraggio interna**


La **griglia di monitoraggio** può essere integrata nella dashboard di Home Assistant utilizzando la** Lovelace iframe card**. Questa card ti permette di inserire una pagina web pubblicata da un web service interno alla piattaforma Home Assistant.

Crea una **Lovelace Custom Card** usando una ```canvas-gauge-card``` per visualizzare i dati.


```yaml
# configuration.yaml
sensor:
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

lovelace:
  mode: yaml
  resources:
    - url: /hacsfiles/canvas-gauge-card/canvas-gauge-card.js
      type: module
```

**Aggiungi la Custom Card in Lovelace**: modifica la tua configurazione di Lovelace per includere una custom card:

```yaml
# ui-lovelace.yaml
title: Home
views:
  - title: Dashboard
    cards:
      - type: custom:canvas-gauge-card
        entity: sensor.radar_x
        card_height: 100
        name: Radar X
        units: "m"
        min_value: 0
        max_value: 100
        style: |
          :host {
            display: flex;
            justify-content: center;
          }
        gauges:
          - type: "radial-gauge"
            title: "X Coordinate"
            value: sensor.radar_x
            width: 200
            height: 200
            minValue: 0
            maxValue: 100
            majorTicks: ["0","20","40","60","80","100"]
            highlights: [{"from": 80, "to": 100, "color": "rgba(255, 30, 0, .75)"}]

      - type: custom:canvas-gauge-card
        entity: sensor.radar_y
        card_height: 100
        name: Radar Y
        units: "m"
        min_value: 0
        max_value: 100
        style: |
          :host {
            display: flex;
            justify-content: center;
          }
        gauges:
          - type: "radial-gauge"
            title: "Y Coordinate"
            value: sensor.radar_y
            width: 200
            height: 200
            minValue: 0
            maxValue: 100
            majorTicks: ["0","20","40","60","80","100"]
            highlights: [{"from": 80, "to": 100, "color": "rgba(255, 30, 0, .75)"}]
```

Sitografia:
- chatGPT per integrazione con Home Assistant
  
> [Ritorna alla pagina principale](/README.md)
