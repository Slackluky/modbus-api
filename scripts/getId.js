import  { bufferToHexString, createModbusHelper } from './modbus-helper.js';

// Configuration - update these values based on your setup
const PORT_PATH = process.argv[2] || 'COM5'; // Use command line argument or default to COM5

// Main function to get the slave ID
async function main() {
  const modbus = createModbusHelper(PORT_PATH);
  
  try {
    console.log(`Connecting to Modbus device on ${PORT_PATH}...`);
    await modbus.openPort();
    console.log('Connected successfully');
    
    // Read slave ID
    console.log('\n--- Reading slave ID ---');
    const response = await modbus.sendCommand(modbus.READ_SLAVE_ID, 'Read Slave ID');
    
    if (response.length >= 5) {
      const slaveId = response[4];
      console.log(`\nCurrent slave ID: ${slaveId} (0x${slaveId.toString(16)})`);
    } else {
      console.error('Invalid response format. Unable to determine slave ID.');
    }
    
  } catch (error) {
    console.error(`Error: ${error.message}`);
  } finally {
    await modbus.closePort();
  }
}

// Run the main function
main();

// Display usage instructions
console.log('Usage: node get-slave-id.js [PORT_PATH]');
console.log('Example: node get-slave-id.js COM5');
console.log('If no port is provided, it defaults to COM5');