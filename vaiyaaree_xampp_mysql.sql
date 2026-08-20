-- ====================================================
-- VAIYAAREE SAREES — XAMPP MYSQL DATABASE MIGRATION SCRIPT
-- Database: vaiyaaree_db
-- Generated: 2026-08-20T13:19:08.976Z
-- ====================================================

CREATE DATABASE IF NOT EXISTS `vaiyaaree_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `vaiyaaree_db`;


CREATE TABLE IF NOT EXISTS `products` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `price` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `image_url` TEXT,
  `stock` INT NOT NULL DEFAULT 0,
  `category` VARCHAR(100),
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `discount` DECIMAL(5, 2) DEFAULT 0.00,
  `product_group` VARCHAR(100),
  `weight` VARCHAR(50),
  `length` VARCHAR(50),
  `width` VARCHAR(50),
  `height` VARCHAR(50),
  `sku` VARCHAR(100),
  `hsn_code` VARCHAR(50),
  `tax_rate` DECIMAL(5, 2) DEFAULT 5.00,
  `type` VARCHAR(50) DEFAULT 'simple',
  `alert_threshold` INT DEFAULT 5,
  `total_added` INT DEFAULT 0,
  `total_sold` INT DEFAULT 0,
  `product_catalog_image_id` VARCHAR(100),
  `is_featured` TINYINT(1) DEFAULT 0,
  `tax_class` VARCHAR(50),
  `purchase_price` DECIMAL(12, 2) DEFAULT 0.00,
  `weight_kg` DECIMAL(8, 3) DEFAULT 0.500,
  `dimensions` VARCHAR(100),
  `tags` TEXT,
  `gallery_image` TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Dumping data for table `products` (17 rows)
INSERT INTO `products` (`id`, `name`, `description`, `price`, `image_url`, `stock`, `category`, `is_active`, `created_at`, `discount`, `product_group`, `weight`, `length`, `width`, `height`, `sku`, `hsn_code`, `tax_rate`, `type`, `alert_threshold`, `total_added`, `total_sold`, `product_catalog_image_id`, `is_featured`, `tax_class`, `purchase_price`, `weight_kg`, `dimensions`, `tags`, `gallery_image`) VALUES ('74403b78-a345-4b71-b31d-32621efeaa48', 'Plain sarees with contrasting blouse', 'Saree length 6.25 metres with running blouse and 1 metre contrast blouse.

Height 47 inches

Easy to wash and maintain.Starch not required.
Print wont fade. You can machine wash as well after two times by hand.

Delivery time : We take 2-3 business days to ship any product. After the shipment, it takes 5- 7 working days to deliver the product.

', 730, 'https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with-watermark/CAT-C3FNP_1780653461488.jpg', 2, 'Designer', 1, '2026-06-05 09:58:14', 0, NULL, 300, 30, 25, 5, '1009', '5007', 5, 'simple', 0, 10, 7, 'CAT-C3FNP', 0, 'GST_5', 0, 0, NULL, '[]', '[]') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `products` (`id`, `name`, `description`, `price`, `image_url`, `stock`, `category`, `is_active`, `created_at`, `discount`, `product_group`, `weight`, `length`, `width`, `height`, `sku`, `hsn_code`, `tax_rate`, `type`, `alert_threshold`, `total_added`, `total_sold`, `product_catalog_image_id`, `is_featured`, `tax_class`, `purchase_price`, `weight_kg`, `dimensions`, `tags`, `gallery_image`) VALUES ('46225cf2-645b-4ee3-927a-1f6a3ea23c5f', 'South cotton Saree', '', 23234, 'https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with-watermark/CAT-BNR6S_1782444128915.jpg', 19, 'Silk Saree', 1, '2026-06-26 03:22:17', 0, NULL, 300, 30, 25, 5, '1010', '5007', 5, 'simple', 0, 20, 2, 'CAT-BNR6S', 0, 'GST_5', 0, 0, NULL, '[]', '[]') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `products` (`id`, `name`, `description`, `price`, `image_url`, `stock`, `category`, `is_active`, `created_at`, `discount`, `product_group`, `weight`, `length`, `width`, `height`, `sku`, `hsn_code`, `tax_rate`, `type`, `alert_threshold`, `total_added`, `total_sold`, `product_catalog_image_id`, `is_featured`, `tax_class`, `purchase_price`, `weight_kg`, `dimensions`, `tags`, `gallery_image`) VALUES ('fdc7d577-3ed8-407a-a1d0-9a5703ef32f1', 'Semi silk cotton sarees with korvai border', '', 3750, 'https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with-watermark/CAT-HSZ16_1780638581090.jpg', 46, 'Silk Saree', 1, '2026-06-05 05:49:46', 0, 'EXPLORE', 300, 30, 25, 5, '1001', '5007', 5, 'simple', 10, 46, 0, 'CAT-HSZ16', 1, 'GST_5', 0, 0, NULL, '[]', '[]') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `products` (`id`, `name`, `description`, `price`, `image_url`, `stock`, `category`, `is_active`, `created_at`, `discount`, `product_group`, `weight`, `length`, `width`, `height`, `sku`, `hsn_code`, `tax_rate`, `type`, `alert_threshold`, `total_added`, `total_sold`, `product_catalog_image_id`, `is_featured`, `tax_class`, `purchase_price`, `weight_kg`, `dimensions`, `tags`, `gallery_image`) VALUES ('ca0d227f-d3f8-4b81-a636-50ae82b44ee3', ' Blended south cotton saree with readymade blouse', '', 950, 'https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with-watermark/CAT-Q9CDL_1786447039095.jpg', 2, 'Silk Saree', 1, '2026-08-11 11:19:18', 0, 'EXPLORE', 300, 30, 25, 5, '1011', '5007', 5, 'simple', 0, 6, 0, 'CAT-Q9CDL', 1, 'GST_5', 0, 0, NULL, '["Silk"]', '[]') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `products` (`id`, `name`, `description`, `price`, `image_url`, `stock`, `category`, `is_active`, `created_at`, `discount`, `product_group`, `weight`, `length`, `width`, `height`, `sku`, `hsn_code`, `tax_rate`, `type`, `alert_threshold`, `total_added`, `total_sold`, `product_catalog_image_id`, `is_featured`, `tax_class`, `purchase_price`, `weight_kg`, `dimensions`, `tags`, `gallery_image`) VALUES ('60e0ebff-cb01-4644-8d17-1a26c3447012', 'Semi silk cotton sarees with korvai border', '', 3750, 'https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with-watermark/CAT-YUXK6_1780638631419.jpg', 49, 'Silk Saree', 1, '2026-06-05 05:50:56', 0, 'EXPLORE', 300, 30, 25, 5, '1002', '5007', 5, 'simple', 0, 50, 1, 'CAT-YUXK6', 1, 'GST_5', 0, 0, NULL, '[]', '[]') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `products` (`id`, `name`, `description`, `price`, `image_url`, `stock`, `category`, `is_active`, `created_at`, `discount`, `product_group`, `weight`, `length`, `width`, `height`, `sku`, `hsn_code`, `tax_rate`, `type`, `alert_threshold`, `total_added`, `total_sold`, `product_catalog_image_id`, `is_featured`, `tax_class`, `purchase_price`, `weight_kg`, `dimensions`, `tags`, `gallery_image`) VALUES ('494a9deb-0914-42dc-9a2e-c7383eb9e614', 'Blended south cotton saree with readymade blouse', '', 1025, 'https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with-watermark/CAT-M41QC_1786530627561.jpg', 14, 'Cotton Saree', 1, '2026-08-12 10:31:40', 0, 'EXPLORE', 300, 30, 25, 5, '1012', '5007', 5, 'simple', 0, 15, 0, 'CAT-M41QC', 0, 'GST_5', 0, 0, NULL, '["Cotton","Pure"]', '[]') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `products` (`id`, `name`, `description`, `price`, `image_url`, `stock`, `category`, `is_active`, `created_at`, `discount`, `product_group`, `weight`, `length`, `width`, `height`, `sku`, `hsn_code`, `tax_rate`, `type`, `alert_threshold`, `total_added`, `total_sold`, `product_catalog_image_id`, `is_featured`, `tax_class`, `purchase_price`, `weight_kg`, `dimensions`, `tags`, `gallery_image`) VALUES ('41e80765-4c2e-4967-839d-24f82163bfc3', 'Kota Doria with embroidery', '', 955, 'https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with-watermark/CAT-V738Y_1786702538745.jpg', 19, 'Silk Saree', 1, '2026-08-14 10:15:41', 0, NULL, 300, 30, 25, 5, '1015', '5007', 5, 'simple', 5, 21, 0, 'CAT-V738Y', 0, 'GST_5', 0, 0, NULL, '["mrp:1200"]', '[]') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `products` (`id`, `name`, `description`, `price`, `image_url`, `stock`, `category`, `is_active`, `created_at`, `discount`, `product_group`, `weight`, `length`, `width`, `height`, `sku`, `hsn_code`, `tax_rate`, `type`, `alert_threshold`, `total_added`, `total_sold`, `product_catalog_image_id`, `is_featured`, `tax_class`, `purchase_price`, `weight_kg`, `dimensions`, `tags`, `gallery_image`) VALUES ('cc17e0c8-714c-46fd-87f5-d925b49c1ed0', 'Blended South Cotton Printed sarees with contrasting blouse', '', 975, 'https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with-watermark/CAT-XZ8NL_1780639099964.jpg', 50, 'Silk Saree', 1, '2026-06-05 05:58:23', 0, 'EXPLORE', 300, 30, 25, 5, '1006', '5007', 5, 'simple', 0, 50, 0, 'CAT-XZ8NL', 1, 'GST_5', 0, 0, NULL, '[]', '[]') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `products` (`id`, `name`, `description`, `price`, `image_url`, `stock`, `category`, `is_active`, `created_at`, `discount`, `product_group`, `weight`, `length`, `width`, `height`, `sku`, `hsn_code`, `tax_rate`, `type`, `alert_threshold`, `total_added`, `total_sold`, `product_catalog_image_id`, `is_featured`, `tax_class`, `purchase_price`, `weight_kg`, `dimensions`, `tags`, `gallery_image`) VALUES ('91afa7cb-f8f4-4819-8115-97006c775723', 'Baghalpuri Tissue silk sarees', '', 1115, 'https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with-watermark/CAT-RPX8M_1780639172860.jpg', 42, 'Silk Saree', 1, '2026-06-05 05:59:40', 0, 'EXPLORE', 300, 30, 25, 5, '1007', '5007', 5, 'simple', 0, 43, 1, 'CAT-RPX8M', 1, 'GST_5', 0, 0, NULL, '[]', '[]') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `products` (`id`, `name`, `description`, `price`, `image_url`, `stock`, `category`, `is_active`, `created_at`, `discount`, `product_group`, `weight`, `length`, `width`, `height`, `sku`, `hsn_code`, `tax_rate`, `type`, `alert_threshold`, `total_added`, `total_sold`, `product_catalog_image_id`, `is_featured`, `tax_class`, `purchase_price`, `weight_kg`, `dimensions`, `tags`, `gallery_image`) VALUES ('16e214c0-5385-4af6-91b1-0db38877a2ee', 'surat Silk saree', '', 1200, 'https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with-watermark/CAT-WJ7DA_1786708419783.jpg', 58, 'Silk Saree', 1, '2026-08-14 11:53:42', 0, NULL, 300, 30, 25, 5, '1016', '5007', 5, 'simple', 10, 220, 0, 'CAT-WJ7DA', 0, 'GST_5', 0, 0, NULL, '["mrp:1400"]', '[]') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `products` (`id`, `name`, `description`, `price`, `image_url`, `stock`, `category`, `is_active`, `created_at`, `discount`, `product_group`, `weight`, `length`, `width`, `height`, `sku`, `hsn_code`, `tax_rate`, `type`, `alert_threshold`, `total_added`, `total_sold`, `product_catalog_image_id`, `is_featured`, `tax_class`, `purchase_price`, `weight_kg`, `dimensions`, `tags`, `gallery_image`) VALUES ('06513dbe-b962-4cd8-9667-7d860a83013f', 'Plain sarees with contrasting blouse', '', 730, 'https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with-watermark/CAT-ZUYOA_1780638761502.jpg', 48, 'Cotton Saree', 1, '2026-06-05 05:53:24', 0, 'EXPLORE', 300, 30, 25, 5, '1003', '5007', 5, 'simple', 0, 50, 2, 'CAT-ZUYOA', 1, 'GST_5', 0, 0, NULL, '[]', '[]') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `products` (`id`, `name`, `description`, `price`, `image_url`, `stock`, `category`, `is_active`, `created_at`, `discount`, `product_group`, `weight`, `length`, `width`, `height`, `sku`, `hsn_code`, `tax_rate`, `type`, `alert_threshold`, `total_added`, `total_sold`, `product_catalog_image_id`, `is_featured`, `tax_class`, `purchase_price`, `weight_kg`, `dimensions`, `tags`, `gallery_image`) VALUES ('005bb8c7-a9b7-4834-a527-08961916767c', 'Blended South Cotton Printed sarees with contrasting blouse', '', 975, 'https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with-watermark/CAT-AMB6I_1780639015058.jpg', 41, 'Silk Saree', 1, '2026-06-05 05:57:03', 0, 'EXPLORE', 300, 30, 25, 5, '1005', '5007', 5, 'simple', 0, 43, 1, 'CAT-AMB6I', 1, 'GST_5', 0, 0, NULL, '[]', '[]') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `products` (`id`, `name`, `description`, `price`, `image_url`, `stock`, `category`, `is_active`, `created_at`, `discount`, `product_group`, `weight`, `length`, `width`, `height`, `sku`, `hsn_code`, `tax_rate`, `type`, `alert_threshold`, `total_added`, `total_sold`, `product_catalog_image_id`, `is_featured`, `tax_class`, `purchase_price`, `weight_kg`, `dimensions`, `tags`, `gallery_image`) VALUES ('c10f44d2-9b31-451f-bf27-aa233858fa0a', 'Blended south cotton saree with readymade blouse', '', 975, 'https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with-watermark/CAT-90QR8_1786623128600.jpg', 20, 'Cotton Saree', 1, '2026-08-13 12:12:37', 0, 'EXPLORE', 300, 30, 25, 5, '1013', '5007', 5, 'simple', 0, 20, 0, 'CAT-90QR8', 0, 'GST_5', 0, 0, NULL, '["Cotton","Pure"]', '[]') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `products` (`id`, `name`, `description`, `price`, `image_url`, `stock`, `category`, `is_active`, `created_at`, `discount`, `product_group`, `weight`, `length`, `width`, `height`, `sku`, `hsn_code`, `tax_rate`, `type`, `alert_threshold`, `total_added`, `total_sold`, `product_catalog_image_id`, `is_featured`, `tax_class`, `purchase_price`, `weight_kg`, `dimensions`, `tags`, `gallery_image`) VALUES ('ff49ef8a-d9e4-4e04-b95a-34652f1ef8c4', 'Mirror work saree with contrasting blouse', '', 3500, 'https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with-watermark/CAT-GXIQC_1786695172330.jpg', 23, 'Silk Saree', 1, '2026-08-14 08:12:36', 0, NULL, 300, 30, 25, 5, '1014', '5007', 5, 'simple', 5, 0, 0, 'CAT-GXIQC', 0, 'GST_5', 0, 0, NULL, '[]', '[]') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `products` (`id`, `name`, `description`, `price`, `image_url`, `stock`, `category`, `is_active`, `created_at`, `discount`, `product_group`, `weight`, `length`, `width`, `height`, `sku`, `hsn_code`, `tax_rate`, `type`, `alert_threshold`, `total_added`, `total_sold`, `product_catalog_image_id`, `is_featured`, `tax_class`, `purchase_price`, `weight_kg`, `dimensions`, `tags`, `gallery_image`) VALUES ('531cd140-8dc4-48f0-ac61-f1ed850dc0f5', 'Plain sarees with contrasting blouse', '', 750, 'https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with-watermark/CAT-CUT2L_1780638894357.jpg', 50, 'Silk Saree', 1, '2026-06-05 05:55:04', 0, 'EXPLORE', 300, 30, 25, 5, '1004', '5007', 5, 'simple', 0, 50, 0, 'CAT-CUT2L', 1, 'GST_5', 0, 0, NULL, '[]', '[]') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `products` (`id`, `name`, `description`, `price`, `image_url`, `stock`, `category`, `is_active`, `created_at`, `discount`, `product_group`, `weight`, `length`, `width`, `height`, `sku`, `hsn_code`, `tax_rate`, `type`, `alert_threshold`, `total_added`, `total_sold`, `product_catalog_image_id`, `is_featured`, `tax_class`, `purchase_price`, `weight_kg`, `dimensions`, `tags`, `gallery_image`) VALUES ('05134b15-bc05-4d11-82b2-a7b9ee2c695b', 'Semi silk cotton sarees with korvai border', '', 3750, 'https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with-watermark/CAT-25RUK_1780638448395.jpg', 40, 'Silk Saree', 1, '2026-06-05 05:47:57', 0, 'EXPLORE', 300, 30, 25, 5, '1000', '5007', 5, 'simple', 0, 42, 1, 'CAT-25RUK', 1, 'GST_5', 0, 0, NULL, '[]', '[]') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `products` (`id`, `name`, `description`, `price`, `image_url`, `stock`, `category`, `is_active`, `created_at`, `discount`, `product_group`, `weight`, `length`, `width`, `height`, `sku`, `hsn_code`, `tax_rate`, `type`, `alert_threshold`, `total_added`, `total_sold`, `product_catalog_image_id`, `is_featured`, `tax_class`, `purchase_price`, `weight_kg`, `dimensions`, `tags`, `gallery_image`) VALUES ('4b2b853f-ccf4-4561-a1d6-985b62033000', 'Baghalpuri Tissue silk sarees', '', 1115, 'https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with-watermark/CAT-34H8O_1780639251590.jpg', 30, 'Designer', 1, '2026-06-05 06:01:01', 0, 'EXPLORE', 300, 30, 25, 5, '1008', '5007', 5, 'simple', 0, 50, 20, 'CAT-34H8O', 1, 'GST_5', 0, 0, NULL, '[]', '[]') ON DUPLICATE KEY UPDATE `id`=`id`;


CREATE TABLE IF NOT EXISTS `customers` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `phone` VARCHAR(50),
  `name` VARCHAR(255),
  `email` VARCHAR(255),
  `address` TEXT,
  `city` VARCHAR(100),
  `state` VARCHAR(100),
  `pincode` VARCHAR(20),
  `role` VARCHAR(50) DEFAULT 'user',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `last_login` DATETIME,
  `cart_data` LONGTEXT,
  `is_verified` TINYINT(1) DEFAULT 1,
  `admin_notes` LONGTEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Dumping data for table `customers` (9 rows)
INSERT INTO `customers` (`id`, `phone`, `name`, `email`, `address`, `city`, `state`, `pincode`, `role`, `created_at`, `last_login`, `cart_data`, `is_verified`, `admin_notes`) VALUES ('cdcce68c-41fb-45b3-940f-70fac9da816a', '918667793292', 'Dhanush Kumar', 'rdhanushkumarramalingam@gmail.com', NULL, NULL, NULL, NULL, 'user', '2026-08-20 11:59:47', '2026-08-20 11:59:47', '[]', 1, '{"pwd":"c8288f42c40c1378a1ba04223b56a7d0735e11b868e3d5e87e48683543025d47"}') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `customers` (`id`, `phone`, `name`, `email`, `address`, `city`, `state`, `pincode`, `role`, `created_at`, `last_login`, `cart_data`, `is_verified`, `admin_notes`) VALUES ('4a232cd7-ab3b-42ce-abd4-576348bcd445', '917904601573', 'Adharsha', 'adharsha@spagylo.com', NULL, NULL, NULL, NULL, 'user', '2026-08-20 12:22:25', '2026-08-20 12:22:25', '[]', 1, '{"pwd":"8285ed4751816ed412e8d8e5e74b024f8937982b9d1c385a7546a1910f0b63a8"}') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `customers` (`id`, `phone`, `name`, `email`, `address`, `city`, `state`, `pincode`, `role`, `created_at`, `last_login`, `cart_data`, `is_verified`, `admin_notes`) VALUES ('c46653b8-71f4-4ddb-9cfb-c1bc53ee5481', '919600961099', 'Hari Pranesh', NULL, '9/17 SomaSundara street RC Nagar premier Mills Othakalmndapam', 'COIMBATORE', 'Tamil Nadu', NULL, 'user', '2026-06-05 07:08:34', '2026-06-05 07:08:34', '[]', 0, NULL) ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `customers` (`id`, `phone`, `name`, `email`, `address`, `city`, `state`, `pincode`, `role`, `created_at`, `last_login`, `cart_data`, `is_verified`, `admin_notes`) VALUES ('066022da-f90d-4b12-b9db-96ea8a7744ca', '918754633465', 'manikandan', NULL, 'karur,tamilnadu,india', 'karur', 'Tamil Nadu', NULL, 'user', '2026-06-25 13:11:15', '2026-06-25 13:11:15', '[]', 0, NULL) ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `customers` (`id`, `phone`, `name`, `email`, `address`, `city`, `state`, `pincode`, `role`, `created_at`, `last_login`, `cart_data`, `is_verified`, `admin_notes`) VALUES ('69e21ad6-fece-4d73-a165-f8e28751fd34', '15551678232', 'Test Customer', NULL, NULL, NULL, NULL, NULL, 'user', '2026-08-11 09:59:21', '2026-08-11 09:59:21', '[]', 0, NULL) ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `customers` (`id`, `phone`, `name`, `email`, `address`, `city`, `state`, `pincode`, `role`, `created_at`, `last_login`, `cart_data`, `is_verified`, `admin_notes`) VALUES ('6445bab4-d853-4045-8d09-78153ad0df67', '919876543210', 'Test New Customer', 'newcustomer@vaiyaaree.com', '123 Silk Street, Race Course, Coimbatore - 641018 (Tamil Nadu, India)', 'Coimbatore', 'Tamil Nadu', NULL, 'user', '2026-06-25 08:33:20', '2026-06-25 08:33:20', '[]', 0, NULL) ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `customers` (`id`, `phone`, `name`, `email`, `address`, `city`, `state`, `pincode`, `role`, `created_at`, `last_login`, `cart_data`, `is_verified`, `admin_notes`) VALUES ('1982b0e5-a4f1-43a7-9a21-34961aad3082', '918190952901', 'Mano Sebastin', 'manosebastin7@gmail.com', '281,Sivanthi Puram,Athumedu,Virudhunagar', 'Virudhunagar', 'Tamil Nadu', '626001', 'user', '2026-08-11 05:30:04', '2026-08-20 12:56:01', '[]', 1, '{"pwd":"fe3a11d42dbead0dab4bd89dc6e905942db8b0290289de9cf5ae3daf5dbb2892"}') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `customers` (`id`, `phone`, `name`, `email`, `address`, `city`, `state`, `pincode`, `role`, `created_at`, `last_login`, `cart_data`, `is_verified`, `admin_notes`) VALUES ('e1e7f61d-c1c2-406c-b9d1-d7105d02b2fc', '917558189732', 'Dhanush', NULL, NULL, NULL, NULL, NULL, 'user', '2026-06-05 09:50:27', '2026-08-14 05:33:22', '[]', 1, NULL) ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `customers` (`id`, `phone`, `name`, `email`, `address`, `city`, `state`, `pincode`, `role`, `created_at`, `last_login`, `cart_data`, `is_verified`, `admin_notes`) VALUES ('17a5243c-215e-405f-abc6-934d2c1e97b9', '919443451640', 'Ram', 'dhanush@spagylo.com', '23,East Car street', 'Namakal', 'Tamil Nadu', '678393', 'user', '2026-06-26 05:10:41', '2026-08-18 10:47:48', '[]', 1, NULL) ON DUPLICATE KEY UPDATE `id`=`id`;


CREATE TABLE IF NOT EXISTS `orders` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `customer_name` VARCHAR(255),
  `customer_phone` VARCHAR(50),
  `total_amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `status` VARCHAR(50) DEFAULT 'PLACED',
  `payment_method` VARCHAR(50) DEFAULT 'COD',
  `transaction_id` VARCHAR(255),
  `invoice_url` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `delivery_address` TEXT,
  `source` VARCHAR(50) DEFAULT 'web',
  `customer_email` VARCHAR(255),
  `billing_address` TEXT,
  `customer_country` VARCHAR(100) DEFAULT 'India',
  `customer_state` VARCHAR(100),
  `shipping_method` VARCHAR(100),
  `shipping_cost` DECIMAL(12, 2) DEFAULT 0.00,
  `subtotal` DECIMAL(12, 2) DEFAULT 0.00,
  `tax_amount` DECIMAL(12, 2) DEFAULT 0.00,
  `tax_type` VARCHAR(50),
  `cgst_amount` DECIMAL(12, 2) DEFAULT 0.00,
  `sgst_amount` DECIMAL(12, 2) DEFAULT 0.00,
  `igst_amount` DECIMAL(12, 2) DEFAULT 0.00,
  `razorpay_order_id` VARCHAR(255),
  `razorpay_payment_id` VARCHAR(255),
  `currency` VARCHAR(10) DEFAULT 'INR',
  `shipping_state` VARCHAR(100),
  `cgst` DECIMAL(12, 2) DEFAULT 0.00,
  `sgst` DECIMAL(12, 2) DEFAULT 0.00,
  `igst` DECIMAL(12, 2) DEFAULT 0.00,
  `shipping_zone_id` VARCHAR(100),
  `courier_name` VARCHAR(100),
  `tracking_number` VARCHAR(100),
  `tracking_url` TEXT,
  `customer_id` VARCHAR(100),
  `cod_charge` DECIMAL(12, 2) DEFAULT 0.00,
  `shipping_address` TEXT,
  `customer_notes` TEXT,
  `admin_notes` TEXT,
  `ip_address` VARCHAR(100),
  `user_agent` TEXT,
  `is_guest` TINYINT(1) DEFAULT 0,
  `email_sent` TINYINT(1) DEFAULT 0,
  `email_sent_at` DATETIME,
  `refund_amount` DECIMAL(12, 2) DEFAULT 0.00,
  `refund_status` VARCHAR(50),
  `return_status` VARCHAR(50),
  `return_reason` TEXT,
  `return_requested_at` DATETIME,
  `billing_email` VARCHAR(255),
  `shipping_email` VARCHAR(255),
  `billing_phone` VARCHAR(50),
  `shipping_phone` VARCHAR(50)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Dumping data for table `orders` (3 rows)
INSERT INTO `orders` (`id`, `customer_name`, `customer_phone`, `total_amount`, `status`, `payment_method`, `transaction_id`, `invoice_url`, `created_at`, `delivery_address`, `source`, `customer_email`, `billing_address`, `customer_country`, `customer_state`, `shipping_method`, `shipping_cost`, `subtotal`, `tax_amount`, `tax_type`, `cgst_amount`, `sgst_amount`, `igst_amount`, `razorpay_order_id`, `razorpay_payment_id`, `currency`, `shipping_state`, `cgst`, `sgst`, `igst`, `shipping_zone_id`, `courier_name`, `tracking_number`, `tracking_url`, `customer_id`, `cod_charge`, `shipping_address`, `customer_notes`, `admin_notes`, `ip_address`, `user_agent`, `is_guest`, `email_sent`, `email_sent_at`, `refund_amount`, `refund_status`, `return_status`, `return_reason`, `return_requested_at`, `billing_email`, `shipping_email`, `billing_phone`, `shipping_phone`) VALUES ('WEB-0001', 'Mano Sebastin', '918190952901', 1271, 'DELIVERED', 'COD', NULL, NULL, '2026-08-19 09:54:30', NULL, 'WEBSITE', 'manosebastin7@gmail.com', '{"name":"Mano Sebastin","phone":"8190952901","email":"manosebastin7@gmail.com","address":"281,Sivanthi Puram,Athumedu,Virudhunagar","city":"Virudhunagar","state":"Tamil Nadu","pincode":"626001","country":"India"}', 'IN', NULL, NULL, 100, 0, 56, NULL, 0, 0, 0, NULL, NULL, 'INR', NULL, 28, 28, NULL, '1b0a63d5-f034-44dd-a0a9-1ef14c77aa6a', 'Blue Dart', '893758947850', 'https://delhivery.com/track?awb=893758947850', '1982b0e5-a4f1-43a7-9a21-34961aad3082', 0, '{"city":"Virudhunagar","name":"Mano Sebastin","email":"manosebastin7@gmail.com","phone":"8190952901","state":"Tamil Nadu","address":"281,Sivanthi Puram,Athumedu,Virudhunagar","country":"India","pincode":"626001"}', NULL, NULL, NULL, NULL, 0, 1, '2026-08-19 09:54:44', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL) ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `orders` (`id`, `customer_name`, `customer_phone`, `total_amount`, `status`, `payment_method`, `transaction_id`, `invoice_url`, `created_at`, `delivery_address`, `source`, `customer_email`, `billing_address`, `customer_country`, `customer_state`, `shipping_method`, `shipping_cost`, `subtotal`, `tax_amount`, `tax_type`, `cgst_amount`, `sgst_amount`, `igst_amount`, `razorpay_order_id`, `razorpay_payment_id`, `currency`, `shipping_state`, `cgst`, `sgst`, `igst`, `shipping_zone_id`, `courier_name`, `tracking_number`, `tracking_url`, `customer_id`, `cod_charge`, `shipping_address`, `customer_notes`, `admin_notes`, `ip_address`, `user_agent`, `is_guest`, `email_sent`, `email_sent_at`, `refund_amount`, `refund_status`, `return_status`, `return_reason`, `return_requested_at`, `billing_email`, `shipping_email`, `billing_phone`, `shipping_phone`) VALUES ('WEB-0002', 'Mano Sebastin', '918190952901', 1123, 'SHIPPED', 'COD', NULL, NULL, '2026-08-19 17:48:15', NULL, 'WEBSITE', 'manosebastin7@gmail.com', '{"name":"Mano Sebastin","phone":"8190952901","email":"manosebastin7@gmail.com","address":"281,Sivanthi Puram,Athumedu,Virudhunagar","city":"Virudhunagar","state":"Tamil Nadu","pincode":"626001","country":"India"}', 'IN', NULL, NULL, 100, 0, 48, NULL, 0, 0, 0, NULL, NULL, 'INR', NULL, 24, 24, NULL, '1b0a63d5-f034-44dd-a0a9-1ef14c77aa6a', 'DHL', 'i844885859j', 'https://www.dhl.com/in-en/home/customer-service.html', '1982b0e5-a4f1-43a7-9a21-34961aad3082', 0, '{"city":"Virudhunagar","name":"Mano Sebastin","email":"manosebastin7@gmail.com","phone":"8190952901","state":"Tamil Nadu","address":"281,Sivanthi Puram,Athumedu,Virudhunagar","country":"India","pincode":"626001"}', NULL, NULL, NULL, NULL, 0, 1, '2026-08-19 17:48:32', 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL) ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `orders` (`id`, `customer_name`, `customer_phone`, `total_amount`, `status`, `payment_method`, `transaction_id`, `invoice_url`, `created_at`, `delivery_address`, `source`, `customer_email`, `billing_address`, `customer_country`, `customer_state`, `shipping_method`, `shipping_cost`, `subtotal`, `tax_amount`, `tax_type`, `cgst_amount`, `sgst_amount`, `igst_amount`, `razorpay_order_id`, `razorpay_payment_id`, `currency`, `shipping_state`, `cgst`, `sgst`, `igst`, `shipping_zone_id`, `courier_name`, `tracking_number`, `tracking_url`, `customer_id`, `cod_charge`, `shipping_address`, `customer_notes`, `admin_notes`, `ip_address`, `user_agent`, `is_guest`, `email_sent`, `email_sent_at`, `refund_amount`, `refund_status`, `return_status`, `return_reason`, `return_requested_at`, `billing_email`, `shipping_email`, `billing_phone`, `shipping_phone`) VALUES ('WEB-0003', 'Test New Customer', '919876543210', 3938, 'PLACED', 'COD', NULL, NULL, '2026-08-20 09:24:12', NULL, 'WEBSITE', 'newcustomer@vaiyaaree.com', '{"name":"Test New Customer","phone":"9876543210","email":"newcustomer@vaiyaaree.com","address":"123 Silk Street, Race Course","city":"Coimbatore","state":"Tamil Nadu","pincode":"641018","country":"India"}', 'IN', NULL, NULL, 0, 0, 188, NULL, 0, 0, 0, NULL, NULL, 'INR', 'Tamil Nadu', 94, 94, NULL, NULL, NULL, NULL, NULL, '6445bab4-d853-4045-8d09-78153ad0df67', 0, '{"city":"Coimbatore","name":"Test New Customer","email":"newcustomer@vaiyaaree.com","phone":"9876543210","state":"Tamil Nadu","address":"123 Silk Street, Race Course","country":"India","pincode":"641018"}', NULL, NULL, NULL, NULL, 0, 0, NULL, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL) ON DUPLICATE KEY UPDATE `id`=`id`;


CREATE TABLE IF NOT EXISTS `order_items` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `order_id` VARCHAR(100) NOT NULL,
  `product_id` VARCHAR(100),
  `quantity` INT NOT NULL DEFAULT 1,
  `price_at_time` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `product_name` VARCHAR(255),
  `variant_id` VARCHAR(100),
  `variant_name` VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Dumping data for table `order_items` (2 rows)
INSERT INTO `order_items` (`id`, `order_id`, `product_id`, `quantity`, `price_at_time`, `product_name`, `variant_id`, `variant_name`) VALUES ('9e4bca2a-efff-4f70-8c36-42aea61628cc', 'WEB-0001', '4b2b853f-ccf4-4561-a1d6-985b62033000', 1, 1115, 'Baghalpuri Tissue silk sarees', NULL, NULL) ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `order_items` (`id`, `order_id`, `product_id`, `quantity`, `price_at_time`, `product_name`, `variant_id`, `variant_name`) VALUES ('3b1bf34c-04ac-42f4-95d9-b8f1c255c5f6', 'WEB-0002', '005bb8c7-a9b7-4834-a527-08961916767c', 1, 975, 'Blended South Cotton Printed sarees with contrasting blouse', NULL, NULL) ON DUPLICATE KEY UPDATE `id`=`id`;


CREATE TABLE IF NOT EXISTS `app_settings` (
  `key` VARCHAR(100) NOT NULL PRIMARY KEY,
  `value` LONGTEXT,
  `description` TEXT,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Dumping data for table `app_settings` (105 rows)
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('meta_CAT-NKKH9', '{"catalog_id":"CAT-NKKH9","original_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without-watermark/CAT-NKKH9.jpg","watermarked_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with-watermark/CAT-NKKH9.jpg","created_at":"2026-04-06T06:55:44.413Z"}', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('gallery_images', '["https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without-watermark/CAT-34H8O_1780639251590.jpg","https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without-watermark/CAT-C3FNP_1780653461488.jpg","https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without-watermark/CAT-RPX8M_1780639172860.jpg","https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without-watermark/CAT-XZ8NL_1780639099964.jpg","https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without-watermark/CAT-AMB6I_1780639015058.jpg","https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without-watermark/CAT-HSZ16_1780638581090.jpg","https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without-watermark/CAT-25RUK_1780638448395.jpg","https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without-watermark/CAT-ZUYOA_1780638761502.jpg","https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without-watermark/CAT-YUXK6_1780638631419.jpg","https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with-watermark/CAT-Q9CDL_1786447091932.jpg","https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without-watermark/V7UF4_1786531819060.jpg"]', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('meta_CAT-UCAEZ', '{"catalog_id":"CAT-UCAEZ","original_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without-watermark/CAT-UCAEZ.jpg","watermarked_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with-watermark/CAT-UCAEZ.jpg","created_at":"2026-04-06T06:44:13.804Z"}', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('currency', 'INR', 'Default currency', '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('business_state', 'Tamil Nadu', 'Business state code (for CGST/SGST vs IGST)', '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('meta_CAT-W1ZDU', '{"catalog_id":"CAT-W1ZDU","original_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without-watermark/CAT-W1ZDU.jpg","watermarked_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with-watermark/CAT-W1ZDU.jpg","created_at":"2026-04-06T07:09:51.726Z"}', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('vat_tin', '33132028969', NULL, '2026-08-17 17:09:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('razorpay_key_id', '', 'Razorpay Key ID', '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('fb_page_id', '1002430712957804', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('gstin', '', 'GSTIN Number', '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('meta_CAT-SCPU0', '{"catalog_id":"CAT-SCPU0","original_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without_watermark/CAT-SCPU0.jpg","watermarked_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with_watermark/CAT-SCPU0.jpg","created_at":"2026-04-06T07:43:21.396Z"}', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('phonepe_salt_key', '', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('meta_CAT-1UG5G', '{"catalog_id":"CAT-1UG5G","original_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without_watermark/CAT-1UG5G.jpg","watermarked_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with_watermark/CAT-1UG5G.jpg","created_at":"2026-04-06T11:01:02.801Z"}', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('meta_CAT-ABC8G', '{"catalog_id":"CAT-ABC8G","original_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without_watermark/CAT-ABC8G.jpg","watermarked_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with_watermark/CAT-ABC8G.jpg","created_at":"2026-04-06T11:48:35.935Z"}', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('meta_CAT-LZKJI', '{"catalog_id":"CAT-LZKJI","original_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without_watermark/CAT-LZKJI.jpg","watermarked_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with_watermark/CAT-LZKJI.jpg","created_at":"2026-04-06T10:45:14.605Z"}', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('cst_no', '1091562', NULL, '2026-08-17 17:09:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('pan_no', 'AAIFG6568K', NULL, '2026-08-17 17:09:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('bank_name', 'STATE BANK INDIA', NULL, '2026-08-17 17:09:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('bank_account', '170902000000962', NULL, '2026-08-17 17:09:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('bank_ifsc', 'SBI0001709', NULL, '2026-08-17 17:09:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('admin_password', 'mano@123', NULL, '2026-08-18 08:18:28') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('customer_reset_otp_rdhanushkumarramalingam@gmail.com', '{"code":"894971","expires_at":1787227793623,"email":"rdhanushkumarramalingam@gmail.com"}', NULL, '2026-08-20 11:59:53') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('meta_CAT-8KZ6H', '{"catalog_id":"CAT-8KZ6H","original_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without-watermark/CAT-8KZ6H.jpg","watermarked_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with-watermark/CAT-8KZ6H.jpg","created_at":"2026-04-06T06:57:46.842Z"}', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('meta_CAT-ZX8Q1', '{"catalog_id":"CAT-ZX8Q1","original_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without-watermark/CAT-ZX8Q1.jpg","watermarked_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with-watermark/CAT-ZX8Q1.jpg","created_at":"2026-04-06T06:33:23.685Z"}', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('company_vat_tin', '33132028969', NULL, '2026-08-17 17:23:29') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('fb_page_name', 'Aiswarya sarees', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('wa_contact_message', '📞 *Contact Support*\\n\\nFor assistance, please call us at:\\n+91 75581 89732\\n\\nOr email:\\vaiyaaree.official@gmail.com', 'Contact support message', '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('wa_welcome_message', '🌸 *Welcome to Vaiyaaree Sarees * 🌸 \\n\\nHow may we assist you today?', 'Main greeting message sent on Hi/Menu', '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('fb_user_access_token', 'EAANKotEZAqPABQ8DBDiY2Ba28iJnFK6WEpHAm5Q6KbQGwtZBAsR0H0HogR1nET4KgtyY3cGtOaZBEdalkcXPJvDuwyXziMKhKAumW7OIi8PHdLZBEMOgOxMb60GDFutuK5tRipzYdsgXWoChnZC4ATvlejDcGTv0Wd8XLY5bO7MeI92S3Ndm0uZAHL2DDg', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('fb_available_pages', '[{"access_token":"EAANKotEZAqPABQ7ZAzZBtGHLay59mOr97ZAuDZAZCldB6q2m2Ly4dz9QeMVA2daQlfFd3gQPzlmXbQUTa62xkSAikbZBZCevGOSxcFov9CyGQE4n3PPkw3t3m3HsDS6fsnysbcqkyEhCa6BgTUZAP5l4YXkoAqW7lGzrMHVhwzU793CyotOo8Cv8Fx8FJ0WLsvfw3UUoj0SAU","category":"Clothing shop","category_list":[{"id":"186230924744328","name":"Clothes shop"}],"name":"Aiswarya sarees","id":"1002430712957804","tasks":["MODERATE","MESSAGING","ANALYZE","ADVERTISE","CREATE_CONTENT","MANAGE"]}]', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('company_cst_no', '1091562', NULL, '2026-08-17 17:23:29') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('shipping_origin_country', 'IN', 'Shipping origin country', '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('phonepe_env', 'sandbox', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('meta_CAT-9D9KA', '{"catalog_id":"CAT-9D9KA","original_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without-watermark/CAT-9D9KA.jpg","watermarked_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with-watermark/CAT-9D9KA.jpg","created_at":"2026-04-06T06:52:08.123Z"}', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('admin_username', 'rithik', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('admin_email', 'gtroyal363@gmail.com', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('meta_CAT-UIRZ6', '{"catalog_id":"CAT-UIRZ6","original_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without-watermark/CAT-UIRZ6.jpg","watermarked_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with-watermark/CAT-UIRZ6.jpg","created_at":"2026-04-06T06:57:47.512Z"}', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('meta_CAT-F9QQA', '{"catalog_id":"CAT-F9QQA","original_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without_watermark/CAT-F9QQA.jpg","watermarked_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with_watermark/CAT-F9QQA.jpg","created_at":"2026-04-06T07:41:38.080Z"}', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('company_pan_no', 'AAIFG6568K', NULL, '2026-08-17 17:23:29') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('meta_CAT-3G95M', '{"catalog_id":"CAT-3G95M","original_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without-watermark/CAT-3G95M.jpg","watermarked_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with-watermark/CAT-3G95M.jpg","created_at":"2026-04-06T06:49:24.187Z"}', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('razorpay_key_secret', '', 'Razorpay Key Secret', '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('phonepe_merchant_id', '', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('pan', '', 'PAN Number', '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('business_address', '', 'Registered business address', '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('business_country', 'IN', 'Business country code', '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('support_phone', '+91 75581 89732', 'Support WhatsApp number', '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('admin_reset_otp', '', NULL, '2026-08-18 08:18:28') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('meta_CAT-N80JV', '{"catalog_id":"CAT-N80JV","original_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without_watermark/CAT-N80JV.jpg","watermarked_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with_watermark/CAT-N80JV.jpg","created_at":"2026-04-06T11:45:59.222Z"}', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('meta_CAT-ABLTQ', '{"catalog_id":"CAT-ABLTQ","original_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without_watermark/CAT-ABLTQ.jpg","watermarked_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with_watermark/CAT-ABLTQ.jpg","created_at":"2026-04-06T11:46:01.474Z"}', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('instagram_url', '', 'Instagram profile URL', '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('reset_otp_manosebastin7_gmail_com', '', NULL, '2026-08-18 08:18:28') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('facebook_url', '', 'Facebook page URL', '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('wa_catalog_header', 'PREMIUM COLLECTIONS', 'Header for the main catalog list', '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('default_tax_rate', '5', 'Default GST rate %', '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('tax_inclusive', 'false', 'Are prices inclusive of tax?', '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('wa_welcome_image', 'https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without-watermark/OG8QX_1786531836597.jpg', 'Image URL for the welcome message', '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('shipping_origin_state', 'TN', 'Shipping origin state', '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('phonepe_salt_index', '1', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('meta_CAT-Y5EXW', '{"catalog_id":"CAT-Y5EXW","original_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without_watermark/CAT-Y5EXW.jpg","watermarked_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with_watermark/CAT-Y5EXW.jpg","created_at":"2026-04-06T10:36:00.364Z"}', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('wa_catalog_body', 'Curated just for you:', 'Body text for the main catalog list', '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('store_description', 'Premium Silk & Cotton Saree Collection', 'Store description / SEO', '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('meta_CAT-8H0BE', '{"catalog_id":"CAT-8H0BE","original_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without_watermark/CAT-8H0BE.jpg","watermarked_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with_watermark/CAT-8H0BE.jpg","created_at":"2026-04-06T10:36:20.035Z"}', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('meta_CAT-HPDHW', '{"catalog_id":"CAT-HPDHW","original_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without_watermark/CAT-HPDHW.jpg","watermarked_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with_watermark/CAT-HPDHW.jpg","created_at":"2026-04-06T10:45:15.184Z"}', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('store_status', 'active', 'active or maintenance', '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('store_name', 'Vaiyaaree', 'Store display name', '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('support_email', 'support@vaiyaaree.com', 'Support email', '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('meta_CAT-3FV0R', '{"catalog_id":"CAT-3FV0R","original_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without_watermark/CAT-3FV0R.jfif","watermarked_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with_watermark/CAT-3FV0R.jfif","created_at":"2026-04-06T11:21:33.757Z"}', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('meta_CAT-R5VRD', '{"catalog_id":"CAT-R5VRD","original_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without_watermark/CAT-R5VRD.jpg","watermarked_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with_watermark/CAT-R5VRD.jpg","created_at":"2026-04-06T11:54:30.543Z"}', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('meta_CAT-EFMI3', '{"catalog_id":"CAT-EFMI3","original_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without-watermark/CAT-EFMI3.jpg","watermarked_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with-watermark/CAT-EFMI3.jpg","created_at":"2026-04-06T06:52:37.976Z"}', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('fb_page_access_token', 'EAANKotEZAqPABQ7ZAzZBtGHLay59mOr97ZAuDZAZCldB6q2m2Ly4dz9QeMVA2daQlfFd3gQPzlmXbQUTa62xkSAikbZBZCevGOSxcFov9CyGQE4n3PPkw3t3m3HsDS6fsnysbcqkyEhCa6BgTUZAP5l4YXkoAqW7lGzrMHVhwzU793CyotOo8Cv8Fx8FJ0WLsvfw3UUoj0SAU', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('admin_recovery_pin', '8190', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('meta_CAT-UHJH9', '{"catalog_id":"CAT-UHJH9","original_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without-watermark/CAT-UHJH9.jpg","watermarked_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with-watermark/CAT-UHJH9.jpg","created_at":"2026-04-06T07:08:46.495Z"}', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('meta_CAT-SI4HI', '{"catalog_id":"CAT-SI4HI","original_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without_watermark/CAT-SI4HI.jpg","watermarked_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with_watermark/CAT-SI4HI.jpg","created_at":"2026-04-06T10:31:07.576Z"}', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('meta_CAT-EU1MC', '{"catalog_id":"CAT-EU1MC","original_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without_watermark/CAT-EU1MC.jpg","watermarked_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with_watermark/CAT-EU1MC.jpg","created_at":"2026-04-06T10:41:16.302Z"}', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('order_sequence_counter', '3', NULL, '2026-08-20 09:24:11') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('meta_CAT-051KG', '{"catalog_id":"CAT-051KG","original_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without-watermark/CAT-051KG.jpg","watermarked_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with-watermark/CAT-051KG.jpg","created_at":"2026-04-06T07:08:45.679Z"}', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('meta_CAT-EXWZH', '{"catalog_id":"CAT-EXWZH","original_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without_watermark/CAT-EXWZH.jpg","watermarked_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with_watermark/CAT-EXWZH.jpg","created_at":"2026-04-06T10:57:23.494Z"}', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('meta_CAT-DJ53Y', '{"catalog_id":"CAT-DJ53Y","original_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without_watermark/CAT-DJ53Y.jpg","watermarked_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with_watermark/CAT-DJ53Y.jpg","created_at":"2026-04-06T11:21:35.277Z"}', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('meta_CAT-G7WSH', '{"catalog_id":"CAT-G7WSH","original_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without_watermark/CAT-G7WSH.jpg","watermarked_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with_watermark/CAT-G7WSH.jpg","created_at":"2026-04-06T12:03:07.320Z"}', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('meta_CAT-ORTKD', '{"catalog_id":"CAT-ORTKD","original_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without-watermark/CAT-ORTKD.jpg","watermarked_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with-watermark/CAT-ORTKD.jpg","created_at":"2026-04-06T06:31:18.905Z"}', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('meta_CAT-OUO5H', '{"catalog_id":"CAT-OUO5H","original_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without-watermark/CAT-OUO5H.jpg","watermarked_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with-watermark/CAT-OUO5H.jpg","created_at":"2026-04-06T06:52:48.073Z"}', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('meta_CAT-QNE8F', '{"catalog_id":"CAT-QNE8F","original_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without-watermark/CAT-QNE8F.jpg","watermarked_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with-watermark/CAT-QNE8F.jpg","created_at":"2026-04-06T07:09:50.806Z"}', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('meta_CAT-VSUEH', '{"catalog_id":"CAT-VSUEH","original_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without_watermark/CAT-VSUEH.jpg","watermarked_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with_watermark/CAT-VSUEH.jpg","created_at":"2026-04-06T10:31:30.065Z"}', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('meta_CAT-8QG25', '{"catalog_id":"CAT-8QG25","original_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without_watermark/CAT-8QG25.jpg","watermarked_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with_watermark/CAT-8QG25.jpg","created_at":"2026-04-06T10:41:16.835Z"}', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('meta_CAT-OGNML', '{"catalog_id":"CAT-OGNML","original_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without_watermark/CAT-OGNML.jpg","watermarked_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with_watermark/CAT-OGNML.jpg","created_at":"2026-04-06T11:00:43.519Z"}', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('shop_name', 'Vaiyaaree', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('shop_address', '16, Dhanalakshmi Nagar Extension, Masakalipalayam Road, Uppili Palayam, Coimbatore, Tamil Nadu - 641015.', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('shop_gstin', '84739393083', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('bill_terms', 'Goods once sold will not be taken back or exchanged unless defective', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('bill_footer', 'Thank you for shopping with Vaiyaaree!', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('shop_logo', '/images/cp-logo.png', NULL, '2026-08-20 05:53:50') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('business_phone', '+91 86677 93292', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('shop_phone', '8667793292', NULL, '2026-08-20 06:33:00') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('shop_website', 'https://www.vaiyaaree.com', NULL, '2026-08-20 06:33:00') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('no_watermark_images', '["https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without-watermark/HJIS1_1786711566468.jpg","https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without-watermark/8OHYV_1786711579111.jpg"]', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('shop_instagram', 'https://www.instagram.com/vaiyaaree', NULL, '2026-08-20 06:33:01') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('hero_slider_images', '["https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without-watermark/CAT-C3FNP_1780653461488.jpg","https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without-watermark/CAT-34H8O_1780639251590.jpg","https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without-watermark/CAT-RPX8M_1780639172860.jpg","https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without-watermark/CAT-XZ8NL_1780639099964.jpg","https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without-watermark/CAT-AMB6I_1780639015058.jpg","https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without-watermark/CAT-HSZ16_1780638581090.jpg","https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without-watermark/CAT-25RUK_1780638448395.jpg","https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without-watermark/CAT-ZUYOA_1780638761502.jpg","https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without-watermark/CAT-YUXK6_1780638631419.jpg","https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with-watermark/CAT-Q9CDL_1786447091932.jpg","https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without-watermark/V7UF4_1786531819060.jpg"]', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('instagram_handle', '@vaiyaaree', NULL, '2026-08-20 06:33:01') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('watermark_images', '["https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with-watermark/CAT-25RUK_1780638448395.jpg","https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with-watermark/CAT-HSZ16_1780638581090.jpg","https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with-watermark/CAT-YUXK6_1780638631419.jpg","https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with-watermark/CAT-ZUYOA_1780638761502.jpg","https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with-watermark/CAT-CUT2L_1780638894357.jpg","https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with-watermark/CAT-AMB6I_1780639015058.jpg","https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with-watermark/CAT-XZ8NL_1780639099964.jpg","https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with-watermark/CAT-RPX8M_1780639172860.jpg","https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with-watermark/CAT-34H8O_1780639251590.jpg","https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with-watermark/CAT-C3FNP_1780653461488.jpg","https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with-watermark/CAT-BNR6S_1782444128915.jpg","https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with-watermark/CAT-Q9CDL_1786447039095.jpg","https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with-watermark/CAT-Q9CDL_1786447091932.jpg","https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with-watermark/CAT-M41QC_1786530627561.jpg","https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with-watermark/CAT-90QR8_1786623128600.jpg","https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with-watermark/CAT-5JZYF_1786693551086.jpg","https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with-watermark/CAT-UCIBY_1786693815049.jpg","https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with-watermark/CAT-Q734X_1786693860408.jpg","https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with-watermark/CAT-GXIQC_1786695172330.jpg","https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with-watermark/CAT-V738Y_1786702538745.jpg","https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with-watermark/CAT-WJ7DA_1786708419783.jpg","https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with-watermark/CAT-R0A2F_1786942585632.jpg"]', NULL, '2026-08-17 04:56:26') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('meta_CAT-2CVAG', '{"catalog_id":"CAT-2CVAG","original_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without-watermark/CAT-2CVAG.jpg","watermarked_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with-watermark/CAT-2CVAG.jpg","created_at":"2026-04-06T06:30:58.302Z"}', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('meta_CAT-SBGND', '{"catalog_id":"CAT-SBGND","original_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without_watermark/CAT-SBGND.jpg","watermarked_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with_watermark/CAT-SBGND.jpg","created_at":"2026-04-06T10:36:59.751Z"}', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('meta_CAT-0M9RC', '{"catalog_id":"CAT-0M9RC","original_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without_watermark/CAT-0M9RC.jpg","watermarked_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with_watermark/CAT-0M9RC.jpg","created_at":"2026-04-06T10:57:21.033Z"}', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('meta_CAT-40GN7', '{"catalog_id":"CAT-40GN7","original_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without_watermark/CAT-40GN7.jpg","watermarked_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with_watermark/CAT-40GN7.jpg","created_at":"2026-04-06T11:20:59.421Z"}', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('meta_CAT-7DBLW', '{"catalog_id":"CAT-7DBLW","original_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without_watermark/CAT-7DBLW.jpg","watermarked_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with_watermark/CAT-7DBLW.jpg","created_at":"2026-04-06T11:49:18.515Z"}', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;
INSERT INTO `app_settings` (`key`, `value`, `description`, `updated_at`) VALUES ('meta_CAT-AHPJW', '{"catalog_id":"CAT-AHPJW","original_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/without_watermark/CAT-AHPJW.jpg","watermarked_url":"https://fmqgrqxjsoidmyafeavk.supabase.co/storage/v1/object/public/media/with_watermark/CAT-AHPJW.jpg","created_at":"2026-04-06T11:21:37.542Z"}', NULL, '2026-08-17 04:20:42') ON DUPLICATE KEY UPDATE `key`=`key`;


CREATE TABLE IF NOT EXISTS `admin_users` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `username` VARCHAR(100) UNIQUE,
  `password` VARCHAR(255),
  `full_name` VARCHAR(255),
  `role` VARCHAR(50) DEFAULT 'Admin',
  `is_active` TINYINT(1) DEFAULT 1,
  `last_login` DATETIME,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `email` VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Dumping data for table `admin_users` (2 rows)
INSERT INTO `admin_users` (`id`, `username`, `password`, `full_name`, `role`, `is_active`, `last_login`, `created_at`, `updated_at`, `email`) VALUES ('295ab919-9123-413b-affd-30b2697ca9b3', 'dhanush', '4256fe2a343ace3314d036d6bee2fcfca8c9e53880ccbfebb64c9749b64583eb', 'Dhanush Kumar', 'manager', 1, '2026-08-11 11:37:34', '2026-08-11 11:36:58', '2026-08-11 18:11:59', 'kawasakilover57@gmail.com') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `admin_users` (`id`, `username`, `password`, `full_name`, `role`, `is_active`, `last_login`, `created_at`, `updated_at`, `email`) VALUES ('14f72ae9-be41-44c3-a8f3-20d1eec25423', 'castprintz', '4256fe2a343ace3314d036d6bee2fcfca8c9e53880ccbfebb64c9749b64583eb', 'Super Admin', 'super_admin', 1, '2026-08-20 09:48:50', '2026-04-07 07:45:14', '2026-08-20 09:48:50', NULL) ON DUPLICATE KEY UPDATE `id`=`id`;


CREATE TABLE IF NOT EXISTS `shipping_zones` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `rate` DECIMAL(12, 2) DEFAULT 0.00,
  `free_threshold` DECIMAL(12, 2) DEFAULT 0.00,
  `is_international` TINYINT(1) DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `cod_charge` DECIMAL(12, 2) DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Dumping data for table `shipping_zones` (1 rows)
INSERT INTO `shipping_zones` (`id`, `name`, `rate`, `free_threshold`, `is_international`, `created_at`, `cod_charge`) VALUES ('1b0a63d5-f034-44dd-a0a9-1ef14c77aa6a', 'Domestic Group', 100, 2005, 0, '2026-08-11 13:22:14', 0) ON DUPLICATE KEY UPDATE `id`=`id`;


CREATE TABLE IF NOT EXISTS `shipping_zone_states` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `zone_id` VARCHAR(100) NOT NULL,
  `state_name` VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Dumping data for table `shipping_zone_states` (2 rows)
INSERT INTO `shipping_zone_states` (`id`, `zone_id`, `state_name`) VALUES (124, '1b0a63d5-f034-44dd-a0a9-1ef14c77aa6a', 'Andhra Pradesh') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `shipping_zone_states` (`id`, `zone_id`, `state_name`) VALUES (125, '1b0a63d5-f034-44dd-a0a9-1ef14c77aa6a', 'Kerala') ON DUPLICATE KEY UPDATE `id`=`id`;


CREATE TABLE IF NOT EXISTS `returns` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `order_id` VARCHAR(100) NOT NULL,
  `status` VARCHAR(50) DEFAULT 'PENDING',
  `reason` TEXT,
  `refund_amount` DECIMAL(12, 2) DEFAULT 0.00,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE IF NOT EXISTS `refunds` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `order_id` VARCHAR(100) NOT NULL,
  `amount` DECIMAL(12, 2) DEFAULT 0.00,
  `reason` TEXT,
  `refund_method` VARCHAR(50),
  `bank_account_details` TEXT,
  `status` VARCHAR(50) DEFAULT 'PENDING',
  `transaction_id` VARCHAR(255),
  `processed_by` VARCHAR(100),
  `processed_at` DATETIME,
  `notes` TEXT,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Dumping data for table `refunds` (2 rows)
INSERT INTO `refunds` (`id`, `order_id`, `amount`, `reason`, `refund_method`, `bank_account_details`, `status`, `transaction_id`, `processed_by`, `processed_at`, `notes`, `created_at`, `updated_at`) VALUES ('63b9a977-2411-4809-abc9-bdfa7ea55f2f', 'WEB-0001', 10, NULL, 'original', NULL, 'pending', NULL, NULL, NULL, NULL, '2026-08-20 06:39:44', '2026-08-20 06:39:44') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `refunds` (`id`, `order_id`, `amount`, `reason`, `refund_method`, `bank_account_details`, `status`, `transaction_id`, `processed_by`, `processed_at`, `notes`, `created_at`, `updated_at`) VALUES ('24d823c4-c839-4f7c-8f71-20a0a47515d5', 'WEB-0002', 975, 'Wrong Product Received', 'UPI', 'mano@sbiokki', 'APPROVED', NULL, NULL, '2026-08-20 06:43:15', 'ok check it', '2026-08-20 06:42:05', '2026-08-20 06:43:15') ON DUPLICATE KEY UPDATE `id`=`id`;


CREATE TABLE IF NOT EXISTS `couriers` (
  `id` VARCHAR(100) NOT NULL PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `tracking_url_template` TEXT,
  `phone` VARCHAR(50),
  `email` VARCHAR(255),
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Dumping data for table `couriers` (2 rows)
INSERT INTO `couriers` (`id`, `name`, `tracking_url_template`, `phone`, `email`, `is_active`, `created_at`) VALUES ('1d017288-4f37-4fca-a067-5c691ec174ea', 'Blue Dart', 'https://delhivery.com/track?awb={821011}', '9600961099', 'samypranesh@gmail.com', 1, '2026-04-17 05:32:28') ON DUPLICATE KEY UPDATE `id`=`id`;
INSERT INTO `couriers` (`id`, `name`, `tracking_url_template`, `phone`, `email`, `is_active`, `created_at`) VALUES ('0d8307e8-6781-4d2f-81f0-91121deb98f7', 'DHL', 'https://www.dhl.com/in-en/home/customer-service.html', '9909893223', 'support@DHLCorrier.com', 1, '2026-08-11 11:34:19') ON DUPLICATE KEY UPDATE `id`=`id`;


CREATE TABLE IF NOT EXISTS `whatsapp_cart` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `phone` VARCHAR(50) NOT NULL,
  `product_id` VARCHAR(100) NOT NULL,
  `product_name` VARCHAR(255),
  `price` DECIMAL(12, 2) DEFAULT 0.00,
  `quantity` INT DEFAULT 1,
  `image_url` TEXT,
  `variant_id` VARCHAR(100),
  `variant_name` VARCHAR(255),
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

