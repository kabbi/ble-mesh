// flow-typed signature: 87570e261fa5f8035393906f7adf9412
// flow-typed version: <<STUB>>/noble_v^1.9.0/flow_v0.66.0

declare module 'noble' {
  declare class EventEmitter<Events: Object> {
    on<Event: $Keys<Events>>(
      event: Event,
      listener: (...$ElementType<Events, Event>) => any,
    ): this;
    once<Event: $Keys<Events>>(
      event: Event,
      listener: (...$ElementType<Events, Event>) => any,
    ): this;
    removeAllListeners(event?: $Keys<Events>): this;
    removeListener(event: $Keys<Events>, listener: Function): this;
    setMaxListeners(n: number): this;
    getMaxListeners(): number;
  }

  declare type DescriptorEvents = {
    valueRead: [Buffer],
    valueWrite: [],
  };

  declare class Descriptor extends EventEmitter<DescriptorEvents> {
    uuid: string;
    readValue(callback?: (error: Error, data: Buffer) => void): void;
    writeValue(data: Buffer, callback?: (error: Error) => void): void;
  }

  declare type ServiceEvents = {
    includedServicesDiscover: [string[]],
    characteristicsDiscover: [Characteristic[]],
  };

  declare class Service {
    discoverIncludedServices(
      serviceUUIDs?: string[],
      callback?: (error: Error, includedServices: Service[]) => void,
    ): void;
    discoverCharacteristics(
      characteristicUUIDs?: string[],
      callback?: (error: Error, characteristics: Characteristic[]) => void,
    ): void;
  }

  declare type CharProperty =
    | 'broadcast'
    | 'read'
    | 'writeWithoutResponse'
    | 'write'
    | 'notify'
    | 'indicate'
    | 'authenticatedSignedWrites'
    | 'extendedProperties';

  declare type CharacteristicEvents = {
    // @deprecated, use 'data' event
    read: [Buffer, ?boolean],
    data: [Buffer, ?boolean],
    write: [boolean],
    broadcast: [boolean],
    notify: [boolean],
    descriptorsDiscover: [Descriptor[]],
  };

  declare class Characteristic extends EventEmitter<CharacteristicEvents> {
    uuid: string;
    properties: CharProperty[];

    read(callback?: (error: Error, data: Buffer) => void): void;
    write(
      data: Buffer,
      withoutResponse: boolean,
      callback?: (error: Error) => void,
    ): void;
    broadcast(enable: boolean, callback?: (error: Error) => void): void;
    subscribe(callback?: (error: Error) => void): void;
    unsubscribe(callback?: (error: Error) => void): void;
    discoverDescriptors(
      callback?: (error: Error, descriptors: Descriptor[]) => void,
    ): void;
  }

  declare type PeripheralEvents = {
    connect: [],
    disconnect: [],
    rssiUpdate: [number],
    servicesDiscover: [Service[]],
  };

  declare class Peripheral extends EventEmitter<PeripheralEvents> {
    id: string;
    address: string;
    addressType: 'public' | 'random' | 'unknown';
    connectable: boolean;
    rssi: number;
    advertisement: {
      localName: string,
      txPowerLevel: number,
      serviceUuids: string[],
      serviceSolicitationUuid: string[],
      manufacturerData: Buffer,
      serviceData: [
        {
          uuid: String,
          data: Buffer,
        },
      ],
    };

    connect(callback?: (error: Error) => void): void;
    disconnect(callback?: (error: Error) => void): void;
    updateRssi(callback?: (error: Error, rssi: number) => void): void;
    discoverAllServicesAndCharacteristics(
      callback?: (error: Error, services: Service[]) => void,
    ): void;
    discoverServices(
      uuids?: string[],
      callback?: (error: Error, services: Service[]) => void,
    ): void;
    discoverSomeServicesAndCharacteristics(
      serviceUUIDs: string[],
      characteristicUUIDs: string[],
      callback?: (
        error: Error,
        services: Service[],
        characteristics: Characteristic[],
      ) => void,
    ): void;
    readHandle(
      handle: string,
      callback: (error: Error, data: Buffer) => void,
    ): void;
    writeHandle(
      handle: string,
      data: Buffer,
      withoutResponse: boolean,
      callback: (error: Error) => void,
    ): void;
  }

  declare type NobleEvents = {
    stateChange: [AdapterState],
    discover: [Peripheral],
    scanStart: [],
    warning: [string],
  };

  declare type AdapterState =
    | 'unknown'
    | 'resetting'
    | 'unsupported'
    | 'unauthorized'
    | 'poweredOff'
    | 'poweredOn';

  declare class Noble extends EventEmitter<NobleEvents> {
    state: AdapterState;
    startScanning(
      serviceUUIDs?: string[],
      allowDuplicates?: boolean,
      callback?: (error: Error) => void,
    ): void;
    stopScanning(): void;
  }

  declare module.exports: Noble;
}
