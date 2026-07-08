// const num = 10000;
// let localIdString = String(num);

// if (num >= 9999) {
//   // Dynamically pad relative to its current length to force an extra zero
//   localIdString = localIdString.padStart(localIdString.length + 1, '0'); // Result: "010000"
// } else {
//   // Standard fixed block sizing
//   localIdString = localIdString.padStart(4, '0'); // Result: "0999"
// }


// 

// let targetLocalId: number;

// if (customer.localId) {
//   // Parse incoming payload string "0024" or number 24 down to a database integer
//   targetLocalId = typeof customer.localId === 'string' 
//     ? parseInt(customer.localId, 10) 
//     : customer.localId;
// } else {
//   // Fallback fallback handling if a webhook payload completely omits it
//   const lastCustomer = await tx.customer.findFirst({
//     orderBy: { localId: 'desc' },
//     select: { localId: true }
//   });
//   targetLocalId = lastCustomer?.localId ? lastCustomer.localId + 1 : 1;
// }