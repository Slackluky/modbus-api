const { createModbusHelper } = require('./modbus-helper');

// Get command line arguments
const portPath = process.argv[2] || 'COM5'; // Default to COM5 if not specified
const newSlaveId = process.argv[3] || '1';  // Default to slave ID 1 if not specified

// Main function to set the slave ID
async function main() {
  const modbus = createModbusHelper(portPath);
  
  try {
    console.log(`Connecting to Modbus device on ${portPath}...`);
    await modbus.openPort();
    console.log('Connected successfully');
    
    // Read current slave ID
    console.log('\n--- Reading current slave ID ---');
    const readResponse = await modbus.sendCommand(modbus.READ_SLAVE_ID, 'Read Slave ID');
    
    if (readResponse.length >= 5) {
      const currentSlaveId = readResponse[4];
      console.log(`Current slave ID: ${currentSlaveId}`);
    }
    
    // Set the new slave ID
    console.log(`\n--- Setting slave ID to ${newSlaveId} ---`);
    const command = modbus.generateSetSlaveIdCommand(parseInt(newSlaveId, 10));
    await modbus.sendCommand(command, 'Set Slave ID');
    
    // Verify the change by reading again
    console.log('\n--- Verifying new slave ID ---');
    const verifyResponse = await modbus.sendCommand(modbus.READ_SLAVE_ID, 'Read Slave ID');
    
    if (verifyResponse.length >= 5) {
      const newSlaveIdResponse = verifyResponse[4];
      console.log(`New slave ID: ${newSlaveIdResponse}`);
      
      if (newSlaveIdResponse !== parseInt(newSlaveId, 10)) {
        console.warn('WARNING: The device reported a different slave ID than requested!');
      }
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
console.log('Usage: node set-slave-id.js [PORT_PATH] [SLAVE_ID]');
console.log('Example: node set-slave-id.js COM5 2');
console.log('If no port is provided, it defaults to COM5');
console.log('If no slave ID is provided, it defaults to 1');