// modules/products/services/product.service.ts

import {
  createProduct,
  updateProduct,
} from "@/lib/inflow/data/products";

import { UpsertProductDto } from "../types/product.dto";

export class ProductService {
  async create(dto: UpsertProductDto) {
    return createProduct({
      sku: dto.sku,
      name: dto.name,
      description: dto.description,

      categoryId: dto.categoryId,

      itemType:
        dto.itemType ?? "StockedProduct",

      isActive:
        dto.isActive ?? true,

      weight: dto.weight,
      length: dto.length,
      width: dto.width,
      height: dto.height,

      hsTariffNumber:
        dto.hsTariffNumber,

      originCountry:
        dto.originCountry,

      remarks: dto.remarks,
    });
  }

  async update(
    productId: string,
    dto: Partial<UpsertProductDto>
  ) {
    return updateProduct(productId, {
      sku: dto.sku,
      name: dto.name,
      description: dto.description,

      categoryId: dto.categoryId,

      itemType: dto.itemType,

      isActive: dto.isActive,

      weight: dto.weight,
      length: dto.length,
      width: dto.width,
      height: dto.height,

      hsTariffNumber:
        dto.hsTariffNumber,

      originCountry:
        dto.originCountry,

      remarks: dto.remarks,
    });
  }
}