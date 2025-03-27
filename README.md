# Modbus RTU Relay Controller

This Express.js application provides a REST API to control Modbus RTU relays through RS485 via USB.

## Setup

1. Connect your USB-RS485 converter to your computer
2. Install dependencies:
   ```bash
   npm install
   ```
3. Update the serial port in `app.js` if needed (default is `/dev/ttyUSB0`)

## Running the Application

```bash
npm start
```

The server will start on port 3000.

## API Endpoints

### Get Relay State
- **GET** `/relay/:number`
- Returns the state of a specific relay
- Example: `GET http://localhost:3000/relay/1`

### Set Single Relay State
- **POST** `/relay/:number`
- Sets the state of a specific relay
- Body: `{ "state": true }` or `{ "state": false }`
- Example: `POST http://localhost:3000/relay/1`

### Set Multiple Relay States
- **POST** `/relays`
- Sets multiple relay states at once
- Body: `{ "states": [true, false, true] }`
- Example: `POST http://localhost:3000/relays`

## Configuration

Default Modbus RTU settings:
- Baud Rate: 9600
- Data Bits: 8
- Stop Bits: 1
- Parity: None
- Device ID: 1

Adjust these settings in `app.js` if your device requires different parameters.
