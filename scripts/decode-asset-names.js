// Asset names from the console
const assetNames = [
  '546573744e667431373534343936313135323234',
  '48617276657374466c6f7731373534343936373231393838',
  '48617276657374466c6f7731373534343937303436383330',
  '48617276657374466c6f7731373534373335353636393933',
  '48617276657374466c6f7731373534373335363232363933',
  '333033303330333033303330333033303566333033303330333033303331'
];

console.log('Decoded asset names:');
assetNames.forEach((hex, index) => {
  try {
    const decoded = Buffer.from(hex, 'hex').toString('utf8');
    console.log(`${index}: ${hex} -> "${decoded}"`);
  } catch (e) {
    console.log(`${index}: ${hex} -> (unable to decode)`);
  }
});