import ModbusRTU from "modbus-serial";

const client = new ModbusRTU();
const port = "COM5"; // Change to your actual COM port

async function changeSlaveID() {
  try {
    await client.connectRTUBuffered(port, { baudRate: 9600, parity: "none", dataBits: 8, stopBits: 1 });

    // Convert your command to a Buffer
    const rawCommand = Buffer.from([0x00, 0x10, 0x00, 0x00, 0x01, 0x02, 0x00, 0x02, 0x2A, 0x01]); // Change ID to 2

    // Send raw buffer
    await client.writeFC16(0, rawCommand);

    console.log("✅ Slave ID changed successfully!");
    client.close();
  } catch (err) {
    console.error("❌ Error:", err);
  }
}

changeSlaveID();
