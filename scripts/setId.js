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

const rawCommand = Buffer.from([0x00, 0x10, 0x00, 0x00, 0x01, 0x02, 0x00, 0x01, 0x6A, 0x00]);

port.on("open", () => {
  console.log("✅ Serial port opened");
  port.write(rawCommand, (err) => {
    if (err) {
      console.error("❌ Error sending raw command:", err);
    } else {
      console.log("✅ Successfully sent raw command");
    }
    port.drain(() => port.close());
  });
});

port.on("error", (err) => {
  console.error("❌ Serial port error:", err);
});
