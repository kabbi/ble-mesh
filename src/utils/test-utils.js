require('./add-debug-formatters');

expect.extend({
  /* Unfortunately, this seems to break flow types, so I'm not using it right now */
  toBeHex(received, argument) {
    const pass = received.toString('hex') === argument;
    if (pass) {
      return {
        message: () => `expected buffer ${received} not to equal ${argument}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected buffer ${received} to equal ${argument}`,
        pass: false,
      };
    }
  },
});
