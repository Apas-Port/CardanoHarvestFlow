// Double decode the last one
const hex = '333033303330333033303330333033303566333033303330333033303331';
const firstDecode = Buffer.from(hex, 'hex').toString('utf8');
console.log('First decode:', firstDecode);

try {
  const secondDecode = Buffer.from(firstDecode, 'hex').toString('utf8');
  console.log('Second decode:', secondDecode);
} catch (e) {
  console.log('Cannot double decode');
}