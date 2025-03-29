const {SerialPort} = require('serialport');
const portPath = "COM5"; // Change to your actual COM port
const baudRate = 9600;
const RESPONSE_TIMEOUT = 2000; // 2 seconds timeout

const port = new SerialPort({
  path: portPath,
  baudRate: baudRate,
  parity: "none",
  dataBits: 8,
  stopBits: 1,
  autoOpen: false // Don't auto open the port
});

// Modbus command: 00 03 00 00 01 85 dB
// Format: [Slave ID] [Function Code] [Start Address] [Quantity] [CRC Low] [CRC High]
const rawCommand = Buffer.from([0x00, 0x03, 0x00, 0x00, 0x01, 0x85, 0xDB]);

let responseBuffer = Buffer.alloc(0);
let timeoutId;

function closePort() {
  if (port.isOpen) {
    port.close();
  }
  process.exit();
}

function waitForResponse() {
  timeoutId = setTimeout(() => {
    if (responseBuffer.length === 0) {
      console.error(" No response received within timeout period");
    } else {
      console.log(" Response received:", responseBuffer.toString("hex"));
    }
    closePort();
  }, RESPONSE_TIMEOUT);
}

// Function to calculate CRC for Modbus
function calculateCRC(buffer) {
  let crc = 0xFFFF;
  for (let i = 0; i < buffer.length; i++) {
    crc ^= buffer[i];
    for (let j = 0; j < 8; j++) {
      if (crc & 0x0001) {
        crc = (crc >> 1) ^ 0xA001;
      } else {
        crc = crc >> 1;
      }
    }
  }
  return [(crc & 0xFF), ((crc >> 8) & 0xFF)];
}

// Verify and log the command
console.log(" Command details:");
console.log(`  - Slave ID: ${rawCommand[0].toString(16)}`);
console.log(`  - Function: ${rawCommand[1].toString(16)}`);
console.log(`  - Start Address: ${rawCommand[2].toString(16)}${rawCommand[3].toString(16)}`);
console.log(`  - Quantity: ${rawCommand[4].toString(16)}${rawCommand[5].toString(16)}`);
console.log(`  - CRC: ${rawCommand[6].toString(16)}${rawCommand[7].toString(16)}`);

// Open the port manually
port.open((err) => {
  if (err) {
    console.error(" Error opening port:", err);
    closePort();
    return;
  }
  
  console.log(" Serial port opened");
  
  // Send the command
  port.write(rawCommand, (err) => {
    if (err) {
      console.error(" Error sending raw command:", err);
      closePort();
    } else {
      console.log(" Successfully sent raw command");
      console.log("  - Command sent:", rawCommand.toString("hex"));
      waitForResponse();
    }
  });
});

port.on("data", (data) => {
  console.log(" Received raw data:", data.toString("hex"));
  responseBuffer = Buffer.concat([responseBuffer, data]);
  
  // Check if we have a complete response (minimum expected length is 7 bytes)
  if (responseBuffer.length >= 7) {
    const responseHex = responseBuffer.toString("hex");
    console.log(" Complete response:", responseHex);
    
    // Parse the response
    try {
      const slaveId = responseBuffer[0].toString(16).padStart(2, '0');
      const functionCode = responseBuffer[1].toString(16).padStart(2, '0');
      const byteCount = responseBuffer[2];
      const dataBytes = responseBuffer.slice(3, 3 + byteCount);
      
      console.log(" Response details:");
      console.log(`  - Slave ID: 0x${slaveId}`);
      console.log(`  - Function: 0x${functionCode}`);
      console.log(`  - Data: ${dataBytes.toString('hex')}`);
      
      // If function code is 0x03 (Read Holding Registers), parse the data
      if (functionCode === '03') {
        const value = dataBytes.readUInt16BE(0);
        console.log(`  - Value: ${value}`);
      }
    } catch (error) {
      console.error(" Error parsing response:", error.message);
    }
    
    // Clear timeout if we got a response
    clearTimeout(timeoutId);
    closePort();
  }
});

port.on("error", (err) => {
  console.error(" Serial port error:", err);
  closePort();
});

// Handle process exit
process.on('SIGINT', closePort);
process.on('SIGTERM', closePort);
process.on('exit', closePort);
