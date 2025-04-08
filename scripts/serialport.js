const { SerialPort } = require('serialport');
const crc = require('crc'); // npm install crc
// Configuration - update these values based on your setup
const PORT_PATH = 'COM5'; // Change this to your serial port
const BAUD_RATE = 9600;
const PARITY = 'none';
const STOP_BITS = 1;
const DATA_BITS = 8;

// Commands in Buffer format
const READ_SLAVE_ID = Buffer.from([0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x85, 0xDB]);
const SET_SLAVE_ID_01 = Buffer.from([0x00, 0x10, 0x00, 0x00, 0x00, 0x01, 0x02, 0x00, 0x01, 0x6A, 0x00]);
const SET_SLAVE_ID_02 = Buffer.from([0x00, 0x10, 0x00, 0x00, 0x00, 0x01, 0x02, 0x00, 0x02, 0x2A, 0x01]);
const SET_SLAVE_ID_03 = Buffer.from([0x00, 0x10, 0x00, 0x00, 0x00, 0x01, 0x02, 0x00, 0x03, 0xEB, 0xC1]);


function generateSetSlaveIdCommand(newSlaveId) {
    const base = Buffer.from([
      0x00, 0x10,             // Function Code + Sub-function?
      0x00, 0x00,             // Starting Address
      0x00, 0x01,             // Quantity of Registers
      0x02,                   // Byte Count
      0x00, newSlaveId        // New Slave ID (2 bytes)
    ]);
  // Compute CRC16-Modbus (LE)
  const crcValue = crc.crc16modbus(base);
  const crcBuffer = Buffer.alloc(2);
  crcBuffer.writeUInt16LE(crcValue, 0);

  // Concatenate base + CRC
  return Buffer.concat([base, crcBuffer]);
}
// Create a serial port instance
const port = new SerialPort({
  path: PORT_PATH,
  baudRate: BAUD_RATE,
  parity: PARITY,
  stopBits: STOP_BITS,
  dataBits: DATA_BITS
});

// Helper function to convert buffer to hex string for display
function bufferToHexString(buffer) {
  return Array.from(buffer)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join(' ');
}

// Function to send a command and wait for response
function sendCommand(command, description) {
  return new Promise((resolve, reject) => {
    const responseData = [];
    const responseHandler = (data) => {
      responseData.push(...data);
      
      // Check if we have a complete response
      // For simplicity, we'll wait a short time and assume the response is complete
      setTimeout(() => {
        port.removeListener('data', responseHandler);
        const responseBuffer = Buffer.from(responseData);
        console.log(`${description} Response: ${bufferToHexString(responseBuffer)}`);
        resolve(responseBuffer);
      }, 500);
    };
    
    port.on('data', responseHandler);
    
    console.log(`Sending ${description}: ${bufferToHexString(command)}`);
    port.write(command, (err) => {
      if (err) {
        port.removeListener('data', responseHandler);
        console.error(`Error sending command: ${err.message}`);
        reject(err);
      }
    });
  });
}

// Main function to execute the commands
async function main() {
  try {
    // Wait for port to open
    await new Promise((resolve, reject) => {
      port.on('open', resolve);
      port.on('error', reject);
    });
    
    console.log('Serial port opened successfully');
    
    // Read current slave ID
    console.log('\n--- Reading current slave ID ---');
    const readResponse = await sendCommand(READ_SLAVE_ID, 'Read Slave ID');
    
    // If response format is as expected, extract the slave ID
    if (readResponse.length >= 5) {
      const currentSlaveId = readResponse[4];
      console.log(`Current slave ID: ${currentSlaveId}`);
    }
    
    // Ask user which ID to set
    const newSlaveId = process.argv[2] || '1'; // Default to 1 if not specified
    
    console.log(`\n--- Setting slave ID to ${newSlaveId} ---`);
    
    // Set the new slave ID based on user input
    const command = generateSetSlaveIdCommand(newSlaveId);
    await sendCommand(SET_SLAVE_ID_01, 'Set Slave ID');
    
    // Verify the change by reading again
    console.log('\n--- Verifying new slave ID ---');
    const verifyResponse = await sendCommand(READ_SLAVE_ID, 'Read Slave ID');
    
    if (verifyResponse.length >= 5) {
      const newSlaveId = verifyResponse[4];
      console.log(`New slave ID: ${newSlaveId}`);
    }
    
  } catch (error) {
    console.error(`Error: ${error.message}`);
  } finally {
    // Close the port
    port.close((err) => {
      if (err) {
        console.error(`Error closing port: ${err.message}`);
      } else {
        console.log('Serial port closed');
      }
    });
  }
}

// Run the main function
main();

// Usage instructions
console.log('Usage: node modbus-slave-id.js [slave_id]');
console.log('Example: node modbus-slave-id.js 2');
console.log('If no slave_id is provided, it defaults to 1');