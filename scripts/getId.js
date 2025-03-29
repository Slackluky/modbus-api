const ModbusRTU = require("modbus-serial");
const client = new ModbusRTU();

async function sendRawCommand() {
  await client.connectRTUBuffered("COM5", { baudRate: 9600, parity: "none" });
  console.log("Connected to Modbus device");

  // Raw Modbus RTU request (example for reading holding register 0x0000)
  const rawCommand = Buffer.from([0x01, 0x03, 0x00, 0x00, 0x00, 0x01, 0x85, 0xDB]);

  client._port.write(rawCommand, (err) => {
    if (err) {
      console.error("Error sending raw command:", err);
      return;
    }
    console.log("Raw command sent!");

    // Listen for response
    client._port.once("data", (data) => {
      console.log("Received Response:", data.toString("hex"));
    });
  });
}

sendRawCommand();
