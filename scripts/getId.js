const {SerialPort} = require('serialport');
const portPath = "COM5"; // Change to your actual COM port
const baudRate = 9600;

const port = new SerialPort({
  path: portPath,
  baudRate: baudRate,
  parity: "none",
  dataBits: 8,
  stopBits: 1,
});

// Modbus command: 00 03 00 00 01 85 dB
const rawCommand = Buffer.from([0x00, 0x03, 0x00, 0x00, 0x01, 0x85, 0xDB]);

let responseBuffer = Buffer.alloc(0);

port.on("open", () => {
  console.log(" Serial port opened");
  port.write(rawCommand, (err) => {
    if (err) {
      console.error("Error sending raw command:", err);
    } else {
      console.log("Successfully sent raw command");
    }
  });
});

port.on("data", (data) => {
  responseBuffer = Buffer.concat([responseBuffer, data]);
  console.log("Received data:", data.toString("hex"));
  
  // Check if we have a complete response (minimum expected length is 7 bytes)
  if (responseBuffer.length >= 7) {
    const responseHex = responseBuffer.toString("hex");
    console.log("Complete response:", responseHex);
    
    // Parse the response
    try {
      const slaveId = responseBuffer[0].toString(16).padStart(2, '0');
      const functionCode = responseBuffer[1].toString(16).padStart(2, '0');
      const byteCount = responseBuffer[2];
      const dataBytes = responseBuffer.slice(3, 3 + byteCount);
      
      console.log("Response details:");
      console.log(`  - Slave ID: 0x${slaveId}`);
      console.log(`  - Function: 0x${functionCode}`);
      console.log(`  - Data: ${dataBytes.toString('hex')}`);
      
      // If function code is 0x03 (Read Holding Registers), parse the data
      if (functionCode === '03') {
        const value = dataBytes.readUInt16BE(0);
        console.log(`  - Value: ${value}`);
      }
    } catch (error) {
      console.error("Error parsing response:", error.message);
    }
  }
});

port.on("error", (err) => {
  console.error("Serial port error:", err);
});

// Cleanup when script exits
process.on('exit', () => {
  port.close();
});
