noble-mesh
----------

This is **VERY EXPERIMENTAL**, **WORK IN PROGRESS** implementation of BLE Mesh v1.0 specification on top of `noble` library, allowing it to work on PCs, Macs and Raspberry PIs.

Try it now (if you have provisioned mesh network):

```bash
cp ./keychain.json.example ./keychain.json
vi ./keychain.json # Add your mesh keys here
npm run blink 0x0001 # Specify the target device with Generic OnOff model here
# Voila, the blink should commence
```

### Working features:
- basic mesh crypto
- handling segmented incoming messages
- sending and receiving generic on-off messages

### TODO:
- node provisioning (it's easier to do that with mobile app anyway)
- handling segmented outgoing messages
- figure out seq numbers saving and restoring
- better api for high-level mesh operations
- web bluetooth support and demo app
- node and element discovery

### Development

This project is using `flow` for static type checking and `jest` to ensure everything works as expected. Run `npm test -- --watch` anytime you want to change something.

I was mostly using [Nordic nRF Mesh app](https://github.com/NordicSemiconductor/Android-nRF-Mesh-Library) to provision and test my devices, and to capture network packet dump to test my implementation. Thank you, Nordic team!

Interesting code places:
- `src/layers/*.js` - low-level mesh network layers implementation, handling binary parsing, security, etc.
- `src/models/*.js` - model message definitions, add your vendor and sig models here
- `src/utils/mesh-crypto.js` - main crypto implementation
- `src/packets.js` - base packet structure definitions
- `decrypt.js` - simple tool to decrypt received messages, useful for debugging