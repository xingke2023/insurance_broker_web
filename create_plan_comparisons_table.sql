CREATE TABLE IF NOT EXISTS `plan_comparisons` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `pdf1_name` varchar(255) NOT NULL,
  `pdf1_base64` longtext NOT NULL,
  `pdf2_name` varchar(255) NOT NULL,
  `pdf2_base64` longtext NOT NULL,
  `pdf3_name` varchar(255) NOT NULL DEFAULT '',
  `pdf3_base64` longtext NOT NULL DEFAULT '',
  `comparison_report` longtext NOT NULL DEFAULT '',
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  `user_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `plan_comparisons_user_id_idx` (`user_id`),
  CONSTRAINT `plan_comparisons_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `auth_user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
