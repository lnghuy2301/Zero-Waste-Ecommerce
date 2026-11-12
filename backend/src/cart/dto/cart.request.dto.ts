import { IsInt, IsNotEmpty, IsOptional, Min, Max } from 'class-validator';

export class CartRequestDto {
  @IsNotEmpty({ message: 'ID tài khoản không được bỏ trống' })
  @IsInt()
  accountId: number;

  @IsNotEmpty({ message: 'ID biến thể không được bỏ trống' })
  @IsInt()
  variantId: number;

  @IsOptional()
  @IsInt()
  bundleId?: number;

  @IsNotEmpty({ message: 'Số lượng không được bỏ trống' })
  @IsInt()
  @Min(1)
  @Max(20)
  quantity: number;
}
