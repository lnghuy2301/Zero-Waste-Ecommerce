-- Bring the original migration up to date with the application schema.
-- Preserve existing profile associations before reversing the foreign key.
BEGIN;

ALTER TABLE "SAN_PHAM"
  ADD COLUMN "so_luong_da_ban" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "danh_gia_trung_binh" DOUBLE PRECISION DEFAULT 0,
  ADD COLUMN "so_luong_danh_gia" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "DANH_MUC_SAN_PHAM" ADD COLUMN "hinh_anh" VARCHAR(500);
ALTER TABLE "SAN_PHAM_BIEN_THE" ADD COLUMN "hinh_anh" VARCHAR(500);
ALTER TABLE "CHI_TIET_SET_QUA_TANG" ADD COLUMN "hinh_anh" VARCHAR(500);
ALTER TABLE "BINH_LUAN" ADD COLUMN "da_an" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "TAI_KHOAN"
  ADD COLUMN "anh_dai_dien" VARCHAR(255),
  ADD COLUMN "ma_khoi_phuc" VARCHAR(255),
  ADD COLUMN "han_khoi_phuc" TIMESTAMP(3);

ALTER TABLE "THONG_TIN_KHACH_HANG" ADD COLUMN "id_tai_khoan" INTEGER;
UPDATE "THONG_TIN_KHACH_HANG" AS profile
SET "id_tai_khoan" = account.id
FROM "TAI_KHOAN" AS account
WHERE account."id_thong_tin_khach_hang" = profile.id;

-- This deliberately fails and rolls back if legacy orphan profiles exist.
-- Reconcile them on a backup of the old DB; do not silently delete personal data.
ALTER TABLE "THONG_TIN_KHACH_HANG" ALTER COLUMN "id_tai_khoan" SET NOT NULL;
CREATE UNIQUE INDEX "THONG_TIN_KHACH_HANG_id_tai_khoan_key" ON "THONG_TIN_KHACH_HANG"("id_tai_khoan");
ALTER TABLE "TAI_KHOAN" DROP CONSTRAINT "TAI_KHOAN_id_thong_tin_khach_hang_fkey";
DROP INDEX "TAI_KHOAN_id_thong_tin_khach_hang_key";
ALTER TABLE "TAI_KHOAN" DROP COLUMN "id_thong_tin_khach_hang";
ALTER TABLE "THONG_TIN_KHACH_HANG" ADD CONSTRAINT "THONG_TIN_KHACH_HANG_id_tai_khoan_fkey"
  FOREIGN KEY ("id_tai_khoan") REFERENCES "TAI_KHOAN"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
