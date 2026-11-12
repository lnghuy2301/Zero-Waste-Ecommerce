import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductRequestDto } from './dto/product.request.dto';
import { ProductResponseDto } from './dto/product.response.dto';
import { DeleteListProductDto } from './dto/list_product_delete.dto';

@Injectable()
export class ProductRepository {
  constructor(private prismaService: PrismaService) {}

  // === CREATE PRODUCT ===
  async createProduct(data: ProductRequestDto): Promise<ProductResponseDto> {
    return this.prismaService.product.create({
      data: {
        name: data.name,
        slug: data.slug,
        categoryId: data.categoryId,
        type: data.type ?? 'RETAIL',
        status: data.status ?? 'ACTIVE',
        description: data.description,
        material: data.material,
        ecoFriendliness: data.ecoFriendliness,
        reusability: data.reusability,
        mainImage: data.mainImage ?? null,
        soLuongDaBan: data.soLuongDaBan ?? 0,
        danhGiaTrungBinh: data.danhGiaTrungBinh ?? 0,
        soLuongDanhGia: data.soLuongDanhGia ?? 0,

        // Xử lý chứng nhận xanh (one-to-many hoặc many-to-many)
        greenCerts: data.greenCertId
          ? { connect: { id: data.greenCertId } }
          : undefined,
      },
      include: {
        category: true,
        greenCerts: true,
      },
    });
  }

  // === UPDATE PRODUCT ===
  async updateProduct(
    id: number,
    data: ProductRequestDto,
  ): Promise<ProductResponseDto> {
    return this.prismaService.product.update({
      where: { id },
      data: {
        name: data.name,
        slug: data.slug,
        categoryId: data.categoryId,
        type: data.type,
        status: data.status,
        description: data.description,
        material: data.material,
        ecoFriendliness: data.ecoFriendliness,
        reusability: data.reusability,
        mainImage: data.mainImage,
        soLuongDaBan: data.soLuongDaBan,
        danhGiaTrungBinh: data.danhGiaTrungBinh,
        soLuongDanhGia: data.soLuongDanhGia,

        // Cập nhật chứng nhận xanh - DÙNG greenCertId (số ít)
        greenCerts:
          data.greenCertId !== undefined
            ? {
                set: data.greenCertId ? [{ id: data.greenCertId }] : [],
              }
            : undefined,
      },
      include: {
        category: true,
        greenCerts: true,
      },
    });
  }

  async getProductById(id: number): Promise<ProductResponseDto | null> {
    return this.prismaService.product.findUnique({
      where: { id },
      include: {
        category: true,
        greenCerts: true, // ← THÊM DÒNG NÀY
      },
    });
  }

  async getAllProducts(
    search?: string, // <--- Thêm tham số nhận vào
    categoryId?: number,
    minPrice?: number,
    maxPrice?: number,
    material?: string,
    greenCertId?: number,
    minEco?: number,
    minRating?: number,
    sort?: string,
  ): Promise<ProductResponseDto[]> {
    const where: any = {};
    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive', // Tìm kiếm không phân biệt hoa thường
      };
    }
    if (categoryId) where.categoryId = categoryId;
    if (material) where.material = { contains: material, mode: 'insensitive' };
    if (minEco !== undefined) where.ecoFriendliness = { gte: minEco };
    if (minRating !== undefined) where.danhGiaTrungBinh = { gte: minRating };

    // Lọc chứng nhận xanh (many-to-many)
    if (greenCertId) {
      where.greenCerts = { some: { id: greenCertId } };
    }

    // Lọc giá qua biến thể (price nằm ở ProductVariant)
    const variantConditions: any = {};
    if (minPrice !== undefined) variantConditions.price = { gte: minPrice };
    if (maxPrice !== undefined) {
      variantConditions.price = variantConditions.price || {};
      variantConditions.price.lte = maxPrice;
    }

    const orderBy: any = { createdAt: 'desc' }; // mặc định mới nhất

    if (sort === 'sold_desc') orderBy.soLuongDaBan = 'desc';
    else if (sort === 'rating_desc') orderBy.danhGiaTrungBinh = 'desc';

    if (Object.keys(variantConditions).length)
      where.variants = { some: variantConditions };
    const products = await this.prismaService.product.findMany({
      where,
      include: { category: true, greenCerts: true, variants: true },
      orderBy,
    });
    if (sort === 'price_asc' || sort === 'price_desc') {
      const minPriceOf = (product: (typeof products)[number]) =>
        product.variants.length
          ? Math.min(...product.variants.map((v) => Number(v.price)))
          : Number.POSITIVE_INFINITY;
      products.sort((a, b) =>
        sort === 'price_asc'
          ? minPriceOf(a) - minPriceOf(b)
          : minPriceOf(b) - minPriceOf(a),
      );
    }
    return products;
  }

  async deleteProduct(id: number): Promise<ProductResponseDto | null> {
    const linked = await this.prismaService.orderDetail.count({
      where: { variant: { productId: id } },
    });
    if (linked)
      throw new BadRequestException(
        'Sản phẩm đã có đơn hàng. Hãy chuyển sang INACTIVE để giữ lịch sử.',
      );
    return this.prismaService.product.delete({
      where: { id },
      include: { category: true },
    });
  }

  async deleteListProducts(
    dto: DeleteListProductDto,
  ): Promise<{ count: number }> {
    const linked = await this.prismaService.orderDetail.count({
      where: { variant: { productId: { in: dto.Ids } } },
    });
    if (linked)
      throw new BadRequestException(
        'Danh sách chứa sản phẩm đã có đơn hàng. Hãy chuyển sang INACTIVE.',
      );
    return this.prismaService.product.deleteMany({
      where: { id: { in: dto.Ids } },
    });
  }

  async uploadMainImage(id: number, file: Express.Multer.File) {
    const updated = await this.prismaService.product.update({
      where: { id },
      data: {
        mainImage: `/uploads/${file.filename}`,
      },
      include: { category: true },
    });

    return updated;
  }
  // Tổng tồn kho của tất cả sản phẩm (tổng stock của tất cả biến thể)
  async getTotalInventory() {
    const result = await this.prismaService.productVariant.aggregate({
      _sum: { stock: true },
    });
    return result._sum.stock || 0;
  }

  // Tổng số lượng đã bán của tất cả sản phẩm
  async getTotalSold() {
    const result = await this.prismaService.product.aggregate({
      _sum: { soLuongDaBan: true },
    });
    return result._sum.soLuongDaBan || 0;
  }
  // === MỚI: CHI TIẾT ĐÃ BÁN + DOANH THU THEO TỪNG BIẾN THỂ (đã có từ lần trước) ===
  async getSoldVariantsDetails() {
    const result = await this.prismaService.$queryRaw<
      {
        variantId: number;
        variantName: string;
        productName: string;
        sku: string;
        soldQuantity: bigint;
        revenue: string;
      }[]
    >`
      SELECT 
        pv.id AS "variantId",
        pv."ten_bien_the" AS "variantName",
        p."ten_san_pham" AS "productName",
        pv.sku,
        COALESCE(SUM(od."so_luong"), 0)::bigint AS "soldQuantity",
        COALESCE(SUM(od."don_gia_luc_mua" * od."so_luong"), 0)::numeric(20,2) AS "revenue"
      FROM "SAN_PHAM_BIEN_THE" pv
      LEFT JOIN (
        SELECT 
          od."id_bien_the",
          od."so_luong",
          od."don_gia_luc_mua"
        FROM "CHI_TIET_DON_HANG" od
        INNER JOIN "DON_HANG" o 
          ON o.id = od."id_don_hang"
        WHERE o."trang_thai" IN ('PAID', 'SHIPPING', 'COMPLETED')
      ) od ON od."id_bien_the" = pv.id
      LEFT JOIN "SAN_PHAM" p ON pv."id_san_pham" = p.id
      GROUP BY 
        pv.id, 
        pv."ten_bien_the", 
        p."ten_san_pham", 
        pv.sku
      ORDER BY "soldQuantity" DESC;
    `;

    return result.map((item) => ({
      variantId: Number(item.variantId),
      variantName: item.variantName,
      productName: item.productName,
      sku: item.sku,
      soldQuantity: Number(item.soldQuantity),
      revenue: Number(item.revenue),
    }));
  }

  // === MỚI: CHI TIẾT ĐÃ BÁN + DOANH THU THEO SẢN PHẨM (tổng tất cả biến thể) ===
  async getSoldProductsDetails() {
    const result = await this.prismaService.$queryRaw<
      {
        productId: number;
        productName: string;
        totalSoldQuantity: bigint;
        totalRevenue: string;
      }[]
    >`
      SELECT 
        p.id AS "productId",
        p."ten_san_pham" AS "productName",
        COALESCE(SUM(od."so_luong"), 0)::bigint AS "totalSoldQuantity",
        COALESCE(SUM(od."don_gia_luc_mua" * od."so_luong"), 0)::numeric(20,2) AS "totalRevenue"
      FROM "SAN_PHAM" p
      LEFT JOIN (
        SELECT 
          pv."id_san_pham",
          od."so_luong",
          od."don_gia_luc_mua"
        FROM "CHI_TIET_DON_HANG" od
        INNER JOIN "SAN_PHAM_BIEN_THE" pv ON pv.id = od."id_bien_the"
        INNER JOIN "DON_HANG" o ON o.id = od."id_don_hang"
        WHERE o."trang_thai" IN ('PAID', 'SHIPPING', 'COMPLETED')
      ) od ON od."id_san_pham" = p.id
      GROUP BY p.id, p."ten_san_pham"
      ORDER BY "totalSoldQuantity" DESC;
    `;

    return result.map((item) => ({
      productId: Number(item.productId),
      productName: item.productName,
      totalSoldQuantity: Number(item.totalSoldQuantity),
      totalRevenue: Number(item.totalRevenue),
    }));
  }
}
