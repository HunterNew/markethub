-- Migration 006: Add vendor document and bank fields
ALTER TABLE vendors
  ADD COLUMN gst_number VARCHAR(20) NULL AFTER contact_phone,
  ADD COLUMN fssai_number VARCHAR(20) NULL AFTER gst_number,
  ADD COLUMN gst_certificate_url VARCHAR(500) NULL AFTER fssai_number,
  ADD COLUMN fssai_certificate_url VARCHAR(500) NULL AFTER gst_certificate_url,
  ADD COLUMN bank_account_name VARCHAR(200) NULL AFTER fssai_certificate_url,
  ADD COLUMN bank_account_number VARCHAR(30) NULL AFTER bank_account_name,
  ADD COLUMN bank_ifsc VARCHAR(15) NULL AFTER bank_account_number,
  ADD COLUMN bank_name VARCHAR(100) NULL AFTER bank_ifsc;
