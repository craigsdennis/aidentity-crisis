type BluetoothRemoteGATTCharacteristicLike = {
  writeValue(value: BufferSource): Promise<void>;
};

type BluetoothRemoteGATTServiceLike = {
  getCharacteristic(uuid: string): Promise<BluetoothRemoteGATTCharacteristicLike>;
};

type BluetoothRemoteGATTServerLike = {
  connect(): Promise<BluetoothRemoteGATTServerLike>;
  getPrimaryService(uuid: string): Promise<BluetoothRemoteGATTServiceLike>;
  disconnect(): void;
  connected?: boolean;
};

type BluetoothDeviceLike = {
  gatt?: BluetoothRemoteGATTServerLike;
};

type BluetoothNavigatorLike = {
  requestDevice(options: {
    filters?: Array<{ namePrefix?: string }>;
    optionalServices?: string[];
  }): Promise<BluetoothDeviceLike>;
};

declare global {
  interface Navigator {
    bluetooth?: BluetoothNavigatorLike;
  }
}

const UART_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const UART_TX_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e"; // TX characteristic for micro:bit v2

export class Hand {
  private bluetoothDevice?: BluetoothDeviceLike;
  private uartService?: BluetoothRemoteGATTCharacteristicLike;

  async connect(): Promise<boolean> {
    try {
      if (!navigator.bluetooth) {
        alert("Web Bluetooth is not available in this browser.");
        return false;
      }

      const device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: "BBC" }], // Filter for devices with names starting with "BBC"
        optionalServices: [UART_SERVICE_UUID],
      });

      const gatt = device.gatt;
      if (!gatt) {
        alert("Selected device does not expose a GATT server.");
        return false;
      }

      const server = await gatt.connect();
      const service = await server.getPrimaryService(UART_SERVICE_UUID);
      this.uartService = await service.getCharacteristic(UART_TX_UUID);
      this.bluetoothDevice = device;

      console.log("Connected to hand!");
      return true;
    } catch (error) {
      console.error("Failed to connect to hand:", error);
      alert("Failed to connect to hand. Please try again.");
      return false;
    }
  }

  async sendCommand(actionNumber: number): Promise<boolean> {
    if (this.uartService === undefined) {
      console.error("Not connected to micro:bit");
      alert("Please connect to Hand first!");
      return false;
    }
    try {
      // Convert action number to hex and pad to two characters
      const hexAction = actionNumber
        .toString(16)
        .toUpperCase()
        .padStart(2, "0");
      const command = `CMD|0F|${hexAction}|$`;
      const encoder = new TextEncoder();
      await this.uartService.writeValue(encoder.encode(command));
      console.log(`Command sent: ${command}`);
      return true;
    } catch (error) {
      console.error("Failed to send command:", error);
      alert("Failed to send command to Yorick.");
      return false;
    }
  }

  get isConnected(): boolean {
    return this.bluetoothDevice?.gatt?.connected === true;
  }

  disconnect(): void {
    if (this.bluetoothDevice?.gatt?.connected) {
      this.bluetoothDevice.gatt.disconnect();
    }
  }
}
