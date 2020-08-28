const { typeSet } = require("./sensor");

const { hex } = require("../utils/tags");
const { parse } = require("../utils/binary")({
  'jBinary.littleEndian': true,
  ...typeSet
});

describe("models/sensor", () => {
  it("parses sensor status message with two values", () => {
    const data = parse("SensorStatus", hex`820a540ba20e6810`);
    expect(data).toMatchSnapshot();
  });
});
