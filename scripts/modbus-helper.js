import { SerialPort } from 'serialport';
import crc from 'crc'; // npm install crc

// Common Modbus commands
const READ_SLAVE_ID = Buffer.from([0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x85, 0xDB]);
const SET_SLAVE_ID_01 = Buffer.from([0x00, 0x10, 0x00, 0x00, 0x00, 0x01, 0x02, 0x00, 0x01, 0x6A, 0x00]);
const SET_SLAVE_ID_02 = Buffer.from([0x00, 0x10, 0x00, 0x00, 0x00, 0x01, 0x02, 0x00, 0x02, 0x2A, 0x01]);
const SET_SLAVE_ID_03 = Buffer.from([0x00, 0x10, 0x00, 0x00, 0x00, 0x01, 0x02, 0x00, 0x03, 0xEB, 0xC1]);
const SET_SLAVE_ID_04 = Buffer.from([0x00, 0x10, 0x00, 0x00, 0x00, 0x01, 0x02, 0x00, 0x04, 0x8B, 0xC1]);

// Default serial port settings
const DEFAULT_SETTINGS = {
  baudRate: 9600,
  parity: 'none',
  stopBits: 1,
  dataBits: 8
};

// Helper function to convert buffer to hex string for display
function bufferToHexString(buffer) {
  return Array.from(buffer)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join(' ');
}

// Generate command to set slave ID
function generateSetSlaveIdCommand(newSlaveId) {
  // Convert newSlaveId to number if it's a string
  const slaveIdNum = parseInt(newSlaveId, 10);
  
  // Validate slave ID
  if (isNaN(slaveIdNum) || slaveIdNum < 1 || slaveIdNum > 247) {
    throw new Error("Slave ID must be a number between 1 and 247");
  }
  
  // Use pre-defined commands for common slave IDs
  if (slaveIdNum === 1) return SET_SLAVE_ID_01;
  if (slaveIdNum === 2) return SET_SLAVE_ID_02;
  if (slaveIdNum === 3) return SET_SLAVE_ID_03;
  if (slaveIdNum === 4) return SET_SLAVE_ID_04;
  
  // For other slave IDs, create a base buffer
  const base = Buffer.from([
    0x00, 0x10,           // Function Code (16 = Write Multiple Registers)
    0x00, 0x00,           // Starting Address (0x0000)
    0x00, 0x01,           // Quantity of Registers (1)
    0x02,                 // Byte Count (2)
    0x00, slaveIdNum      // New Slave ID (2 bytes)
  ]);
  
  // Calculate CRC16-Modbus
  const crcValue = crc.crc16modbus(base);
  
  // Create buffer for CRC (low byte first, then high byte)
  const crcBuffer = Buffer.alloc(2);
  crcBuffer.writeUInt16LE(crcValue, 0);
  
  // Concatenate base + CRC
  return Buffer.concat([base, crcBuffer]);
}

// Create a Modbus helper object
function createModbusHelper(portPath, settings = DEFAULT_SETTINGS) {
  let port = null;
  
  return {
    // Commands
    READ_SLAVE_ID,
    SET_SLAVE_ID_01,
    SET_SLAVE_ID_02,
    SET_SLAVE_ID_03,
    SET_SLAVE_ID_04,
    
    // Open serial port
    openPort() {
      return new Promise((resolve, reject) => {
        port = new SerialPort({
          path: portPath,
          ...settings
        });
        
        port.on('open', resolve);
        port.on('error', reject);
      });
    },
    
    // Close serial port
    closePort() {
      return new Promise((resolve, reject) => {
        if (!port) {
          resolve();
          return;
        }
        
        port.close((err) => {
          if (err) {
            console.error(`Error closing port: ${err.message}`);
            reject(err);
          } else {
            console.log('Serial port closed');
            resolve();
          }
        });
      });
    },
    
    // Send command and wait for response
    sendCommand(command, description) {
      return new Promise((resolve, reject) => {
        if (!port) {
          reject(new Error('Serial port not opened'));
          return;
        }
        
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
    },
    
    // Generate set slave ID command
    generateSetSlaveIdCommand
  };
}

export {
  bufferToHexString,
  createModbusHelper,
  generateSetSlaveIdCommand
};