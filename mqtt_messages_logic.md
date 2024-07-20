> [Return to main page](README.md)

# **MQTT Messages**

## **Confirmed Messages**

The **confirmation** of messages sent by the receiver is normally not necessary in the case of **sensors**. In fact, if a sending by a sensor is not successful, it is useless to request the retransmission of data that will soon arrive with a more updated measurement.

Confirmation, on the other hand, is expected for **command** or **configuration** functions. For example, in the case of buttons, transit detectors or alarms in which the sending of the message occurs sporadically and in a completely **asynchronous** manner (i.e. not predictable by the receiver), it might be desirable to have feedback from the protocol through a confirmation mechanism based on **ack**. But this is not always possible.

**Confirmation**, however, could also be managed only by the **application layer** (not by the protocol) using a **feedback topic** (or state) to send the value of the current state immediately after it is affected by an incoming command on the device.

## **Definition of topic and payload**

Often, in the IP distribution network there is a server with the role of **MQTT broker** to which are associated:
- on a **measurement topic**:
    - the **sensor** device is registered on the broker with the role of **publisher** because it wants to use this output channel to **send the measurements** to the **application server**
    - the **application server** is registered as a subscriber because it is interested in receiving, on an input channel, the measurements of **all** sensors distributed in the network.
- on an **actuation topic (command)**:
    - the **sensor** device is registered on the broker with the role of **publisher** because it wants to use this output channel to **send the command** to the actuator
    - the **actuator** device is registered on the broker with the role of **subscriber** because it is interested in receiving, on an input channel, any actuation commands (motors, gates).
- on a **feedback topic (state)** (from the terminal device, to the broker), useful to the application server to receive confirmation of the actuator state change but also useful to the user to know the new state:
    - the **actuator** device is registered on the broker with the role of **publisher** because it intends to use this output channel to **send feedback** with its state to a **display** associated with the command sensor.
    - the **sensor** device, or better yet the **display** device associated with the sensor device (an LED or a screen), is registered on the broker with the role of **subscriber** because it is interested in receiving, on an input channel, any **feedback** on the actuator status to **show** them to the user. In this case, it is up to the user, and not the protocol, to **decide** whether and how many times to repeat the command, in case the device status is not yet the desired one.
- on a **configuration topic** where only the application server can publish while all other IoT devices are subscribers:
    - both **sensor** devices and **actuator** devices register on the broker with the role of **subscriber** because they intend to use this **input** channel to receive **configuration commands** such as, for example, activation/deactivation, frequency of a measurement, duration of stand by, firmware updates via wireless (OTA mode), etc.
    - the **application server** is responsible for defining the configuration settings and decides **which** to send and to **who**.

**In reality**, the configuration topic, while theoretically appropriate, could also be incorporated into the command topic, perhaps providing for a higher level of authorization than the commands related to ordinary functions.

## **Management of measurement topics**

We could now insert the temperature and pressure measurement into the more general topic of measurements that we will call ```measurements``` and register the living room temperature and presence sensor to the topic ```/living room/measurements``` as publisher, while we could register the management server to the topic ```+/measurements``` as subscriber of the measurements of all environments. The message could be the JSON

``` Json
{
"envSensor": {
"temp": 43,
"press": 1001,
"hum": 27.5,
"gas": 1400,
},
"deviceID": "01",
"timestamp": "2024-07-20T09:43:27",
}
```
If we wanted to select only one device, there are two alternative ways:
- insert the **mqtt prefix** of the device directly **in the path** ```/soggiorno/misure/mydevice1-98F4ABF298AD/{"envSensor": {....}}```
- insert an **id** of the device **in the JSON** ```/soggiorno/misure/{"deviceid":"01", "envSensor": {....},"deviceID": "01",}```, where ```01``` indicates a unique address only within the subgroup ```/living_room/measurements```.

## **Managing command topics**

At this point we could insert the lights command in the more general topic of measures and actuations that we will call ```commands``` and register the living room buttons to the topic ```lights/living room/commands``` as a publisher, while we could register the lamp actuations to the same topic as a subscriber. The command could be the JSON ```{"toggle":"true"}```, so in the end the entire path would become ```lights/living_room/commands/{"toggle":"true"}```. If we wanted to select only one device, two alternative ways are possible:
- insert the **mqtt prefix** of the device directly **in the path** ```luci/soggiorno/comandi/mydevice1-98F4ABF298AD/{"toggle":"true"}```
- insert an **id** of the device **in the JSON** ```luci/soggiorno/comandi/{"deviceid":"01", "toggle":"true"}```, where ```01``` indicates a unique address only within the subgroup ```luci/soggiorno```. With this solution, the device must be able to manage a second level of addresses independent of the topic path mechanism.

## **Status topic management**

This channel is used to send the **status** of a device to all those who are interested in it. The interest could arise for several reasons:
- **Confirmation** of the **implementation**. Upon **receiving** a command (for example "on":"true"), the **actuator** may be required to **notify** (in PUSH mode), to the **display** associated with the transmitting sensor (or **process server**), its **current state**, so that the **user** (or the process server) can verify the actual **effectiveness** of the last actuation command.
- **PULL** synchronization of the **process server**. The process server may **fetch** on the status topic, via a **request command** sent to the terminal device on the command topic, the **state** of the actuators to update a general command panel or perform statistics or to retrieve the inputs of an algorithm that it must execute.
- **PULL** synchronization of a **control panel**. A **web control panel** could **fetch** on the status topic, via a **request command** sent to the terminal device on the command topic, the **state** of the actuators:
    - just once, at the beginning, when the page has been **loaded/reloaded** by the user
    - **periodically**, to be sure to always have the **most up-to-date state**, even in the event of a network **disconnection** that has prevented the recording of the latest feedback by the actuator.
- **PUSH synchronization**. The same actuator could take the initiative to **periodically send** its state to all those interested (process servers or all web displays that control it), without anyone sending explicit requests on the command topic. It is a **PUSH alternative** to periodic PULL synchronization.

An example of **state MQTT channel** could be:
- in case of **unique identification** of the device via **MQTT path**: ```lights/living_room/state/mydevice1-98F4ABF298AD/{"state":"on"}```
- in case of **unique identification** of the device in the **JSON payload**: ```lights/living_room/state/{"deviceid":"01", "state":"on"}```

## **Configuration topic management**

This channel is used to send **configuration commands** to the device by the process server. The interest could arise for several reasons:
- perform an update of the on-board FW via wireless.
- set some characteristics in the definition of its functions such as, for example, behaving as a gate opener or as a light control.
- set the frequency of a measurement, or the trigger interval of an alarm, etc.
- change the syntax of the JSON payload or that of an MQTT path

An example of a **MQTT configuration channel** to, for example, set the automatic status publication period could be:
- in the case of **unique identification** of the device via **MQTT path**: ```luci/soggiorno/config/mydevice1-98F4ABF298AD/{"stateperiod":"3000"}```
- in the case of **unique identification** of the device in the **JSON payload**: ```luci/soggiorno/config/{"deviceid":"01", "stateperiod":"3000"}```

> [Return to main page](README.md)
