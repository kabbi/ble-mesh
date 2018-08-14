const typeSet = require('./packets');
const { hex } = require('./utils/tags');
const { parse } = require('./utils/binary')(typeSet);

describe('parsers', () => {
  describe('Advertisement', () => {
    it('parses network ad', () => {
      const data = parse('Advertisement', hex`003637d51523539028`);
      expect(data).toMatchSnapshot();
    });
    it('parses corrupted ad', () => {
      const data = parse('Advertisement', hex`023637d51523539028`);
      expect(data).toMatchSnapshot();
    });
  });
  describe('ProxyPDU', () => {
    it("parses first PDU I've ever received in my life", () => {
      const data = parse(
        'ProxyPDU',
        hex`0101003637d51523539028000000007bcfa6acdc7623bb`,
      );
      expect(data).toMatchSnapshot();
    });
  });
});
