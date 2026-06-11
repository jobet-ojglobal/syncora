// await prisma.productBarcode.upsert({
//   where: {
//     inflowProductBarcodeId:
//       barcode.productBarcodeId,
//   },

//   create: {
//     inflowProductBarcodeId:
//       barcode.productBarcodeId,

//     productId:
//       barcode.productId,

//     barcode:
//       barcode.barcode,

//     lineNum:
//       barcode.lineNum,

//     timestamp:
//       barcode.timestamp,
//   },

//   update: {
//     barcode:
//       barcode.barcode,

//     lineNum:
//       barcode.lineNum,

//     timestamp:
//       barcode.timestamp,
//   },
// });