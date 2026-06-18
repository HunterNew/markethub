-- Site theme setting stored in platform_settings table
INSERT INTO platform_settings (`key`, value) VALUES ('site_theme', '"default"')
ON DUPLICATE KEY UPDATE `key` = `key`;
