> [Ritorna alla pagina principale](/README.md)


# **Integrazione con Home Assistant**

Per configurare Home Assistant per ricevere e visualizzare queste misure tramite MQTT, possiamo utilizzare il componente mqtt per i sensori. Home Assistant può ricevere il payload JSON e utilizzare template per estrarre i singoli valori.

## **Passaggi da seguire**

Configurare MQTT tramite l'interfaccia utente di Home Assistant
1. Aggiungere l'Integrazione MQTT:
    - Vai su Configurazione nel menu principale.
    - Clicca su Dispositivi e Servizi.
    - Clicca su Aggiungi Integrazione in basso a destra.
    - Cerca e seleziona MQTT.
    - Inserisci i dettagli del broker (indirizzo, porta, nome utente e password).
2. Configurare Sensori MQTT in configuration.yaml:
    - Aggiungi la configurazione dei sensori MQTT nel file configuration.yaml sotto la sezione sensor:.

Esempio di impostazione del file ```configuration.yaml```:

```yaml
# Loads default set of integrations. Do not remove.
default_config:

# Load frontend themes from the themes folder
frontend:
  themes: !include_dir_merge_named themes

automation: !include automations.yaml
script: !include scripts.yaml
scene: !include scenes.yaml

mqtt:       
    sensor:
      - name: "Temperature"
        unique_id: "{{ value_json.boardID }}.temp"
        state_topic: "radar/misure"
        value_template: "{{ value_json.measures.tempSensor.temp }}"
        unit_of_measurement: "°C"
        
      - name: "Pressure"
        unique_id: "{{ value_json.boardID }}.press"
        state_topic: "radar/misure"
        value_template: "{{ value_json.measures.tempSensor.press }}"
        unit_of_measurement: "hPa"
    
      - name: "Humidity"
        unique_id: "{{ value_json.boardID }}.hum"
        state_topic: "radar/misure"
        value_template: "{{ value_json.measures.tempSensor.hum }}"
        unit_of_measurement: "%"
    
      - name: "Gas"
        unique_id: "{{ value_json.boardID }}.gas"
        state_topic: "radar/misure"
        value_template: "{{ value_json.measures.tempSensor.gas }}"
        unit_of_measurement: "ppm"
    
      - name: "Visible Light"
        unique_id: "{{ value_json.boardID }}.visible"
        state_topic: "radar/misure"
        value_template: "{{ value_json.measures.luxSensor.visible }}"
        unit_of_measurement: "lx"
    
      - name: "Infrared Light"
        unique_id: "{{ value_json.boardID }}.infrared"
        state_topic: "radar/misure"
        value_template: "{{ value_json.measures.luxSensor.infrared }}"
        unit_of_measurement: "lx"
    
      - name: "Total Light"
        unique_id: "{{ value_json.boardID }}.total"
        state_topic: "radar/misure"
        value_template: "{{ value_json.measures.luxSensor.total }}"
        unit_of_measurement: "lx"
    
      - name: "Radar X"
        unique_id: "{{ value_json.boardID }}.radar.x"
        state_topic: "radar/misure"
        value_template: "{{ value_json.measures.radar.x[0] }}"
        unit_of_measurement: "m"
    
      - name: "Radar Y"
        state_topic: "radar/misure"
        unique_id: "{{ value_json.boardID }}.radar.y"
        value_template: "{{ value_json.measures.radar.y[0] }}"
        unit_of_measurement: "mm"
    
      - name: "Radar Velocity"
        unique_id: "{{ value_json.boardID }}.radar.vel"
        state_topic: "radar/misure"
        value_template: "{{ value_json.measures.radar.vel[0] }}"
        unit_of_measurement: "cm/s"
    
      - name: "Radar Distance"
        unique_id: "{{ value_json.boardID }}.radar.distres"
        state_topic: "radar/misure"
        value_template: "{{ value_json.measures.radar.distres[0] }}"
        unit_of_measurement: "mm"
```

## **Integrazione di una griglia di monitoraggio esterna**


La **griglia di monitoraggio** può essere integrata nella dashboard di Home Assistant utilizzando la **Lovelace iframe card**. Questa card ti permette di inserire una pagina web esterna (come il file HTML che abbiamo creato) direttamente nella dashboard di Home Assistant.

### **Passaggi per integrare misure e griglia nella Dashboard di Home Assistant**

L'**obiettivo** è integrare un set di misure e la griglia del radar in due **schede** della stessa **plancia** (dashboard).

1. Pubblica il File HTML su un server web. Puoi ospitare questo file:
    - su un server web locale caricando i file in una cartella con nome ```www``` posta dentro la cartella ```homeassistant``` che contiene il file principale di configurazione ```configuration.yaml``` 
    - su un servizio di hosting di pagine web esterno raggiungibile dal server homeassistant
2. cliccare sulla matita in alto a destra di una delle plancie (dashboard) per attivare la funzione di modifica con cui si possono gestire le schede esistenti creandole, cancellandole e modificandone la visibilità
3. cliccare sui tre punti in alto a destra da cui si può scegliere tra:
    - selezionare le entità da utilizzare
    - fa partire un editor di configurazione testuale con cui modifcare gli oggetti inclusi nella plancia
    - gestire le plancie esistenti creandole, cancellandole e modificandone la visibilità
    - gestire le risorse esistenti creandole, cancellandole e modificandone la visibilità
4. Nel menù di configurazione testuale inserire il codice seguente che sostanzialmente genera due schede, una con le misure dei sensori e una con la iframe della griglia del radar

```yaml
views:
  - title: Home
    icon: mdi:account
    cards:
      - type: entities
        entities:
          - entity: sensor.gas
          - entity: sensor.humidity
          - entity: sensor.infrared_light
          - entity: sensor.pressure
          - entity: sensor.temperature
          - entity: sensor.total_light
          - entity: sensor.visible_light
  - title: Monitoraggio radar
    path: monitoraggio-radar
    cards:
      - type: iframe
        url: https://home_assistant_url/local/radar2.html
        aspect_ratio: 100%
        title: Monitoraggio radar
```

<img src="/img/card1.png" alt="alt text" width="1000">

<img src="/img/card2.png" alt="alt text" width="1000">

### **Passaggi per integrare la griglia nella Dashboard di Home Assistant**

L'**obiettivo** è integrare la griglia del radar come **iframe** che occupa una intera **plancia** (dashboard).

 1. Pubblica il File HTML su un server web. Puoi ospitare questo file:
    - su un server web locale caricando i file in una cartella con nome ```www``` posta dentro la cartella ```homeassistant``` che contiene il file principale di configurazione ```configuration.yaml``` 
    - su un servizio di hosting di pagine web esterno raggiungibile dal server homeassistant
 2. cliccare sulla matita in alto a destra di una delle plancie (dashboard) per attivare la funzione di modifica con cui si possono gestire le schede esistenti creandole, cancellandole e modificandone la visibilità
 3. cliccare sui tre punti in alto a destra da cui e scegliere gestire le plancie esistenti
 4. premere il pulsante in basso a destra per creare una nuova plancia
 5. selezionere la voce "Includi una pagina web come plancia" per includere la pagina della griglia ```radar.html``` o ```radar2.html``` nella plancia sotto forma di **iframe** incollando il percorso dell'uno o dell'altro similmente a ```https://home_assistant_url/local/radar2.html```, dove local corrisponde alla cartella ```www``` dove sono conservati i file da pubblicare, se pubblicati localmente.

<img src="/img/dashboard1.png" alt="alt text" width="1000">

**Sitografia**:
- chatGPT per integrazione con Home Assistant
- https://github.com/covrig/homeassistant-iframe-card
- https://www.home-assistant.io/dashboards/
- https://github.com/sebastianomelita/ArduinoBareMetal/blob/master/sensornetworkshort.md#reti-di-sensori-e-attuatori
  
> [Ritorna alla pagina principale](/README.md)

