// export function calculateLineItemPrice(product: number, pricingScheme, quantity) {
//   // Find the price record matching this product and scheme
//   const priceRecord = product.prices.find(p => p.pricingSchemeId === pricingScheme.id);
  
//   if (priceRecord.priceType === 'FixedPrice') {
//     // Return the hardcoded unit price directly
//     return priceRecord.unitPrice; 
//   } 
  
//   if (priceRecord.priceType === 'FixedMarkup') {
//     // Dynamically calculate price based on live product cost + markup
//     return product.cost + priceRecord.fixedMarkup;
//   }
// }