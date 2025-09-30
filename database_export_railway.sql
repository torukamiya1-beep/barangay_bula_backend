-- MySQL dump 10.13  Distrib 8.4.6, for Win64 (x86_64)
--
-- Host: localhost    Database: barangay_management_system
-- ------------------------------------------------------
-- Server version	5.5.5-10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `barangay_management_system`
--

CREATE DATABASE IF NOT EXISTS `railway` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci */;

USE `railway`;

--
-- Table structure for table `admin_employee_accounts`
--

DROP TABLE IF EXISTS `admin_employee_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_employee_accounts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('admin','employee') NOT NULL,
  `status` enum('active','inactive','suspended') DEFAULT 'active',
  `last_login` timestamp NULL DEFAULT NULL,
  `password_changed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  KEY `idx_username` (`username`),
  KEY `idx_role` (`role`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admin_employee_accounts`
--

LOCK TABLES `admin_employee_accounts` WRITE;
/*!40000 ALTER TABLE `admin_employee_accounts` DISABLE KEYS */;
INSERT INTO `admin_employee_accounts` VALUES (32,'admin12345','$2a$12$kCOtZxNsQcSEXo1RnIEN/O5owaxnATpggrNE4gJViPQw9cafFiK6y','admin','active','2025-09-30 11:40:01','2025-08-15 11:53:33','2025-07-07 14:08:18','2025-09-30 11:40:01'),(34,'mark12345','$2a$12$J/taBPxmpXv7YSwfZk91SuEQGp95GiQrpDIwgyK4Xy5wYlFPOEEeO','admin','active','2025-08-15 21:23:35','2025-08-15 19:26:09','2025-08-15 19:26:09','2025-09-16 11:04:34'),(35,'amelia12345','$2a$12$OE001v7FuPeMD0fES4a9befNbUm8KpaYlKpB3OcviLxAUdOdg3qBS','admin','inactive','2025-08-15 21:36:08','2025-08-15 21:35:38','2025-08-15 21:35:38','2025-08-15 21:37:13');
/*!40000 ALTER TABLE `admin_employee_accounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `admin_employee_profiles`
--

DROP TABLE IF EXISTS `admin_employee_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_employee_profiles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `account_id` int(11) NOT NULL,
  `employee_id` varchar(20) DEFAULT NULL,
  `first_name` varchar(100) NOT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) NOT NULL,
  `suffix` varchar(10) DEFAULT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `profile_picture` varchar(255) DEFAULT NULL,
  `position` varchar(100) DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `hire_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_id` (`employee_id`),
  UNIQUE KEY `email` (`email`),
  KEY `account_id` (`account_id`),
  KEY `idx_employee_id` (`employee_id`),
  KEY `idx_email` (`email`),
  KEY `idx_full_name` (`last_name`,`first_name`),
  CONSTRAINT `admin_employee_profiles_ibfk_1` FOREIGN KEY (`account_id`) REFERENCES `admin_employee_accounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admin_employee_profiles`
--

LOCK TABLES `admin_employee_profiles` WRITE;
/*!40000 ALTER TABLE `admin_employee_profiles` DISABLE KEYS */;
INSERT INTO `admin_employee_profiles` VALUES (27,32,'123123345345','Roco','Jomas','Manalo','Jr','09955958343','adminaccount@gmail.com',NULL,'Department Head','ICTD','2016-01-02','2025-07-07 14:08:44','2025-08-15 19:37:56'),(29,34,NULL,'Mark','','Ford','Jr','09955958343','2024_bula_fordmark@gov.ph',NULL,NULL,NULL,NULL,'2025-08-15 19:26:09','2025-09-16 11:04:34'),(30,35,NULL,'Amelia',NULL,'Milie',NULL,'09073625112','2034_cete_milieamelia@online.htcgsc.edu.ph',NULL,NULL,NULL,NULL,'2025-08-15 21:35:38','2025-08-15 21:35:38');
/*!40000 ALTER TABLE `admin_employee_profiles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `user_type` enum('admin','employee','client') NOT NULL,
  `action` varchar(100) NOT NULL,
  `table_name` varchar(100) DEFAULT NULL,
  `record_id` int(11) DEFAULT NULL,
  `old_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`old_values`)),
  `new_values` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`new_values`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_action` (`action`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=83 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
INSERT INTO `audit_logs` VALUES (28,32,'admin','login_success',NULL,NULL,NULL,'{\"timestamp\":\"2025-09-16T15:24:00.640Z\",\"username\":\"admin12345\",\"login_time\":\"2025-09-16T15:24:00.640Z\",\"role\":\"admin\",\"account_status\":\"active\",\"profile_complete\":true}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0','2025-09-16 15:24:00'),(29,59,'client','client_registration_success','client_accounts',59,NULL,'{\"registration_timestamp\":\"2025-09-16T15:24:47.163Z\",\"username\":\"Rhaijana\",\"email\":\"rhaijanaabdilah@gmail.com\",\"account_id\":59,\"registration_step\":\"account_created\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0','2025-09-16 15:24:47'),(30,59,'client','login_success',NULL,NULL,NULL,'{\"timestamp\":\"2025-09-16T15:28:01.358Z\",\"username\":\"Rhaijana\",\"login_time\":\"2025-09-16T15:28:01.358Z\",\"account_status\":\"active\",\"profile_complete\":true}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0','2025-09-16 15:28:01'),(31,59,'client','document_request_submit','document_requests',189,NULL,'{\"document_type\":\"Unknown Document Type\",\"request_number\":\"CED-2025-000001\",\"submit_time\":\"2025-09-16T15:33:13.556Z\",\"document_type_id\":1,\"purpose_category_id\":1,\"purpose_details\":null,\"payment_method_id\":1,\"delivery_method\":\"pickup\",\"priority\":\"normal\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0','2025-09-16 15:33:13'),(32,59,'client','document_request_submit','document_requests',190,NULL,'{\"document_type\":\"Unknown Document Type\",\"request_number\":\"BC-2025-000001\",\"submit_time\":\"2025-09-16T15:38:06.612Z\",\"document_type_id\":2,\"purpose_category_id\":1,\"purpose_details\":null,\"payment_method_id\":2,\"delivery_method\":\"pickup\",\"priority\":\"normal\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0','2025-09-16 15:38:06'),(33,59,'client','payment_submit','payment_transactions',0,NULL,'{\"amount\":150,\"payment_method\":\"Online Payment Via PayMongo\",\"transaction_time\":\"2025-09-16T16:02:42.060Z\",\"request_id\":190,\"request_number\":\"BC-2025-000001\",\"document_type\":\"Barangay Clearance\",\"payment_provider\":\"PayMongo\",\"link_id\":\"link_6o1v8V5u8dB1x9wqzxbFC6MV\",\"reference_number\":\"3gfr4zC\",\"convenience_fee\":0,\"net_amount\":150}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0','2025-09-16 16:02:42'),(34,59,'client','login_success',NULL,NULL,NULL,'{\"timestamp\":\"2025-09-17T10:16:55.118Z\",\"username\":\"Rhaijana\",\"login_time\":\"2025-09-17T10:16:55.118Z\",\"account_status\":\"active\",\"profile_complete\":true}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0','2025-09-17 10:16:55'),(35,32,'admin','login_success',NULL,NULL,NULL,'{\"timestamp\":\"2025-09-17T10:47:09.536Z\",\"username\":\"admin12345\",\"login_time\":\"2025-09-17T10:47:09.534Z\",\"role\":\"admin\",\"account_status\":\"active\",\"profile_complete\":true}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0','2025-09-17 10:47:09'),(36,59,'client','login_success',NULL,NULL,NULL,'{\"timestamp\":\"2025-09-17T10:52:20.070Z\",\"username\":\"Rhaijana\",\"login_time\":\"2025-09-17T10:52:20.070Z\",\"account_status\":\"active\",\"profile_complete\":true}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0','2025-09-17 10:52:20'),(37,32,'admin','login_success',NULL,NULL,NULL,'{\"timestamp\":\"2025-09-17T11:51:38.278Z\",\"username\":\"admin12345\",\"login_time\":\"2025-09-17T11:51:38.278Z\",\"role\":\"admin\",\"account_status\":\"active\",\"profile_complete\":true}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0','2025-09-17 11:51:38'),(38,59,'client','login_success',NULL,NULL,NULL,'{\"timestamp\":\"2025-09-17T12:15:25.920Z\",\"username\":\"Rhaijana\",\"login_time\":\"2025-09-17T12:15:25.919Z\",\"account_status\":\"active\",\"profile_complete\":true}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0','2025-09-17 12:15:25'),(39,59,'client','login_success',NULL,NULL,NULL,'{\"timestamp\":\"2025-09-17T12:23:27.953Z\",\"username\":\"Rhaijana\",\"login_time\":\"2025-09-17T12:23:27.953Z\",\"account_status\":\"active\",\"profile_complete\":true}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0','2025-09-17 12:23:27'),(40,60,'client','client_registration_success','client_accounts',60,NULL,'{\"registration_timestamp\":\"2025-09-17T15:52:45.264Z\",\"username\":\"cady3414\",\"email\":\"cadyscience12@gmail.com\",\"account_id\":60,\"registration_step\":\"account_created\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0','2025-09-17 15:52:45'),(41,60,'client','login_success',NULL,NULL,NULL,'{\"timestamp\":\"2025-09-17T15:57:45.522Z\",\"username\":\"kris3414\",\"login_time\":\"2025-09-17T15:57:45.521Z\",\"account_status\":\"active\",\"profile_complete\":true}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0','2025-09-17 15:57:45'),(42,32,'admin','login_success',NULL,NULL,NULL,'{\"timestamp\":\"2025-09-17T15:58:13.079Z\",\"username\":\"admin12345\",\"login_time\":\"2025-09-17T15:58:13.079Z\",\"role\":\"admin\",\"account_status\":\"active\",\"profile_complete\":true}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0','2025-09-17 15:58:13'),(43,60,'client','document_request_submit','document_requests',191,NULL,'{\"document_type\":\"Unknown Document Type\",\"request_number\":\"CED-2025-000002\",\"submit_time\":\"2025-09-17T16:02:32.616Z\",\"document_type_id\":1,\"purpose_category_id\":1,\"purpose_details\":null,\"payment_method_id\":1,\"delivery_method\":\"pickup\",\"priority\":\"normal\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0','2025-09-17 16:02:32'),(44,60,'client','login_success',NULL,NULL,NULL,'{\"timestamp\":\"2025-09-17T16:57:46.210Z\",\"username\":\"kris3414\",\"login_time\":\"2025-09-17T16:57:46.209Z\",\"account_status\":\"active\",\"profile_complete\":true}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0','2025-09-17 16:57:46'),(45,61,'client','client_registration_success','client_accounts',61,NULL,'{\"registration_timestamp\":\"2025-09-17T18:23:04.942Z\",\"username\":\"rica1255\",\"email\":\"gemmaford605@gmail.com\",\"account_id\":61,\"registration_step\":\"account_created\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0','2025-09-17 18:23:04'),(46,62,'client','client_registration_success','client_accounts',62,NULL,'{\"registration_timestamp\":\"2025-09-17T18:41:37.822Z\",\"username\":\"thea144\",\"email\":\"gemmaford605@gmail.com\",\"account_id\":62,\"registration_step\":\"account_created\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0','2025-09-17 18:41:37'),(47,63,'client','client_registration_success','client_accounts',63,NULL,'{\"registration_timestamp\":\"2025-09-17T18:44:00.366Z\",\"username\":\"thea122\",\"email\":\"gemmaford605@gmail.com\",\"account_id\":63,\"registration_step\":\"account_created\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0','2025-09-17 18:44:00'),(48,64,'client','client_registration_success','client_accounts',64,NULL,'{\"registration_timestamp\":\"2025-09-17T19:07:59.657Z\",\"username\":\"thea122\",\"email\":\"gemmaford605@gmail.com\",\"account_id\":64,\"registration_step\":\"account_created\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0','2025-09-17 19:07:59'),(49,65,'client','client_registration_success','client_accounts',65,NULL,'{\"registration_timestamp\":\"2025-09-17T19:12:07.127Z\",\"username\":\"thea111\",\"email\":\"gemmaford605@gmail.com\",\"account_id\":65,\"registration_step\":\"account_created\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0','2025-09-17 19:12:07'),(50,66,'client','client_registration_success','client_accounts',66,NULL,'{\"registration_timestamp\":\"2025-09-17T19:21:55.666Z\",\"username\":\"thea1111\",\"email\":\"gemmaford605@gmail.com\",\"account_id\":66,\"registration_step\":\"account_created\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0','2025-09-17 19:21:55'),(51,67,'client','client_registration_success','client_accounts',67,NULL,'{\"registration_timestamp\":\"2025-09-17T19:24:36.448Z\",\"username\":\"thea1111\",\"email\":\"gemmaford605@gmail.com\",\"account_id\":67,\"registration_step\":\"account_created\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0','2025-09-17 19:24:36'),(52,68,'client','client_registration_success','client_accounts',68,NULL,'{\"registration_timestamp\":\"2025-09-17T19:47:06.412Z\",\"username\":\"thea11111\",\"email\":\"gemmaford605@gmail.com\",\"account_id\":68,\"registration_step\":\"account_created\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0','2025-09-17 19:47:06'),(53,69,'client','client_registration_success','client_accounts',69,NULL,'{\"registration_timestamp\":\"2025-09-17T20:18:04.394Z\",\"username\":\"thea11111\",\"email\":\"gemmaford605@gmail.com\",\"account_id\":69,\"registration_step\":\"account_created\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0','2025-09-17 20:18:04'),(54,69,'client','login_success',NULL,NULL,NULL,'{\"timestamp\":\"2025-09-17T20:20:01.164Z\",\"username\":\"thea11111\",\"login_time\":\"2025-09-17T20:20:01.161Z\",\"account_status\":\"active\",\"profile_complete\":true}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0','2025-09-17 20:20:01'),(55,32,'admin','login_success',NULL,NULL,NULL,'{\"timestamp\":\"2025-09-19T02:42:16.139Z\",\"username\":\"admin12345\",\"login_time\":\"2025-09-19T02:42:16.139Z\",\"role\":\"admin\",\"account_status\":\"active\",\"profile_complete\":true}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0','2025-09-19 02:42:16'),(56,59,'client','login_success',NULL,NULL,NULL,'{\"timestamp\":\"2025-09-19T02:43:07.149Z\",\"username\":\"Rhaijana\",\"login_time\":\"2025-09-19T02:43:07.149Z\",\"account_status\":\"active\",\"profile_complete\":true}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0','2025-09-19 02:43:07'),(57,59,'client','login_success',NULL,NULL,NULL,'{\"timestamp\":\"2025-09-29T16:00:27.309Z\",\"username\":\"Rhaijana\",\"login_time\":\"2025-09-29T16:00:27.309Z\",\"account_status\":\"active\",\"profile_complete\":true}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0','2025-09-29 16:00:27'),(58,32,'admin','login_success',NULL,NULL,NULL,'{\"timestamp\":\"2025-09-29T16:00:37.629Z\",\"username\":\"admin12345\",\"login_time\":\"2025-09-29T16:00:37.629Z\",\"role\":\"admin\",\"account_status\":\"active\",\"profile_complete\":true}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0','2025-09-29 16:00:37'),(59,70,'client','client_registration_success','client_accounts',70,NULL,'{\"registration_timestamp\":\"2025-09-30T03:52:34.451Z\",\"username\":\"eva234\",\"email\":\"torukamiya1@gmail.com\",\"account_id\":70,\"registration_step\":\"account_created\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0','2025-09-30 03:52:34'),(60,32,'admin','login_success',NULL,NULL,NULL,'{\"timestamp\":\"2025-09-30T03:57:10.314Z\",\"username\":\"admin12345\",\"login_time\":\"2025-09-30T03:57:10.314Z\",\"role\":\"admin\",\"account_status\":\"active\",\"profile_complete\":true}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0','2025-09-30 03:57:10'),(61,70,'client','login_success',NULL,NULL,NULL,'{\"timestamp\":\"2025-09-30T03:58:59.021Z\",\"username\":\"eva234\",\"login_time\":\"2025-09-30T03:58:59.021Z\",\"account_status\":\"active\",\"profile_complete\":true}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0','2025-09-30 03:58:59'),(62,70,'client','login_success',NULL,NULL,NULL,'{\"timestamp\":\"2025-09-30T04:00:39.011Z\",\"username\":\"eva234\",\"login_time\":\"2025-09-30T04:00:39.011Z\",\"account_status\":\"active\",\"profile_complete\":true}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0','2025-09-30 04:00:39'),(63,70,'client','document_request_submit','document_requests',192,NULL,'{\"document_type\":\"Unknown Document Type\",\"request_number\":\"CED-2025-000003\",\"submit_time\":\"2025-09-30T04:01:17.517Z\",\"document_type_id\":1,\"purpose_category_id\":1,\"purpose_details\":null,\"payment_method_id\":2,\"delivery_method\":\"pickup\",\"priority\":\"normal\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0','2025-09-30 04:01:17'),(64,32,'admin','login_success',NULL,NULL,NULL,'{\"timestamp\":\"2025-09-30T04:01:28.800Z\",\"username\":\"admin12345\",\"login_time\":\"2025-09-30T04:01:28.800Z\",\"role\":\"admin\",\"account_status\":\"active\",\"profile_complete\":true}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0','2025-09-30 04:01:28'),(65,70,'client','login_success',NULL,NULL,NULL,'{\"timestamp\":\"2025-09-30T04:05:34.388Z\",\"username\":\"eva234\",\"login_time\":\"2025-09-30T04:05:34.387Z\",\"account_status\":\"active\",\"profile_complete\":true}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0','2025-09-30 04:05:34'),(66,70,'client','document_request_submit','document_requests',193,NULL,'{\"document_type\":\"Unknown Document Type\",\"request_number\":\"CED-2025-000003\",\"submit_time\":\"2025-09-30T04:06:10.921Z\",\"document_type_id\":1,\"purpose_category_id\":1,\"purpose_details\":null,\"payment_method_id\":2,\"delivery_method\":\"pickup\",\"priority\":\"normal\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0','2025-09-30 04:06:10'),(67,32,'admin','login_success',NULL,NULL,NULL,'{\"timestamp\":\"2025-09-30T04:07:15.990Z\",\"username\":\"admin12345\",\"login_time\":\"2025-09-30T04:07:15.990Z\",\"role\":\"admin\",\"account_status\":\"active\",\"profile_complete\":true}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0','2025-09-30 04:07:15'),(68,70,'client','payment_submit','payment_transactions',0,NULL,'{\"amount\":100,\"payment_method\":\"Online Payment Via PayMongo\",\"transaction_time\":\"2025-09-30T04:08:59.670Z\",\"request_id\":193,\"request_number\":\"CED-2025-000003\",\"document_type\":\"Cedula\",\"payment_provider\":\"PayMongo\",\"link_id\":\"link_YzkuwRuNMTxuDifRc3jr6cVz\",\"reference_number\":\"gu7v1tF\",\"convenience_fee\":0,\"net_amount\":100}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0','2025-09-30 04:08:59'),(69,32,'admin','login_success',NULL,NULL,NULL,'{\"timestamp\":\"2025-09-30T09:54:52.868Z\",\"username\":\"admin12345\",\"login_time\":\"2025-09-30T09:54:52.868Z\",\"role\":\"admin\",\"account_status\":\"active\",\"profile_complete\":true}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0','2025-09-30 09:54:52'),(70,71,'client','client_registration_success','client_accounts',71,NULL,'{\"registration_timestamp\":\"2025-09-30T10:18:21.897Z\",\"username\":\"bonbon35\",\"email\":\"torukamiya1@gmail.com\",\"account_id\":71,\"registration_step\":\"account_created\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0','2025-09-30 10:18:21'),(71,72,'client','client_registration_success','client_accounts',72,NULL,'{\"registration_timestamp\":\"2025-09-30T10:25:11.723Z\",\"username\":\"kloykloy22\",\"email\":\"torukamiya1@gmail.com\",\"account_id\":72,\"registration_step\":\"account_created\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0','2025-09-30 10:25:11'),(72,73,'client','client_registration_success','client_accounts',73,NULL,'{\"registration_timestamp\":\"2025-09-30T10:43:24.706Z\",\"username\":\"dandan22\",\"email\":\"torukamiya1@gmail.com\",\"account_id\":73,\"registration_step\":\"account_created\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0','2025-09-30 10:43:24'),(73,74,'client','client_registration_success','client_accounts',74,NULL,'{\"registration_timestamp\":\"2025-09-30T10:47:55.854Z\",\"username\":\"kloykloy22\",\"email\":\"torukamiya1@gmail.com\",\"account_id\":74,\"registration_step\":\"account_created\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0','2025-09-30 10:47:55'),(74,75,'client','client_registration_success','client_accounts',75,NULL,'{\"registration_timestamp\":\"2025-09-30T10:55:36.478Z\",\"username\":\"kloykloy22\",\"email\":\"torukamiya1@gmail.com\",\"account_id\":75,\"registration_step\":\"account_created\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0','2025-09-30 10:55:36'),(75,76,'client','client_registration_success','client_accounts',76,NULL,'{\"registration_timestamp\":\"2025-09-30T11:02:50.809Z\",\"username\":\"kloykloy22\",\"email\":\"torukamiya1@gmail.com\",\"account_id\":76,\"registration_step\":\"account_created\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0','2025-09-30 11:02:50'),(76,76,'client','login_success',NULL,NULL,NULL,'{\"timestamp\":\"2025-09-30T11:04:13.703Z\",\"username\":\"kloykloy22\",\"login_time\":\"2025-09-30T11:04:13.701Z\",\"account_status\":\"active\",\"profile_complete\":true}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0','2025-09-30 11:04:13'),(77,77,'client','client_registration_success','client_accounts',77,NULL,'{\"registration_timestamp\":\"2025-09-30T11:14:10.715Z\",\"username\":\"kristle11\",\"email\":\"torukamiya1@gmail.com\",\"account_id\":77,\"registration_step\":\"account_created\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0','2025-09-30 11:14:10'),(78,78,'client','client_registration_success','client_accounts',78,NULL,'{\"registration_timestamp\":\"2025-09-30T11:34:22.488Z\",\"username\":\"kristle11\",\"email\":\"torukamiya1@gmail.com\",\"account_id\":78,\"registration_step\":\"account_created\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0','2025-09-30 11:34:22'),(79,78,'client','login_success',NULL,NULL,NULL,'{\"timestamp\":\"2025-09-30T11:35:38.611Z\",\"username\":\"kristle11\",\"login_time\":\"2025-09-30T11:35:38.610Z\",\"account_status\":\"active\",\"profile_complete\":true}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0','2025-09-30 11:35:38'),(80,79,'client','client_registration_success','client_accounts',79,NULL,'{\"registration_timestamp\":\"2025-09-30T11:38:12.901Z\",\"username\":\"george12\",\"email\":\"torukamiya1@gmail.com\",\"account_id\":79,\"registration_step\":\"account_created\"}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0','2025-09-30 11:38:12'),(81,79,'client','login_success',NULL,NULL,NULL,'{\"timestamp\":\"2025-09-30T11:39:50.035Z\",\"username\":\"george12\",\"login_time\":\"2025-09-30T11:39:50.035Z\",\"account_status\":\"active\",\"profile_complete\":true}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0','2025-09-30 11:39:50'),(82,32,'admin','login_success',NULL,NULL,NULL,'{\"timestamp\":\"2025-09-30T11:40:01.740Z\",\"username\":\"admin12345\",\"login_time\":\"2025-09-30T11:40:01.740Z\",\"role\":\"admin\",\"account_status\":\"active\",\"profile_complete\":true}','::1','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0','2025-09-30 11:40:01');
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `authorization_documents`
--

DROP TABLE IF EXISTS `authorization_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `authorization_documents` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `authorized_pickup_person_id` int(11) NOT NULL,
  `document_type` varchar(100) NOT NULL,
  `document_name` varchar(200) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_size` int(11) DEFAULT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `is_verified` tinyint(1) DEFAULT 0,
  `verified_by` int(11) DEFAULT NULL,
  `verified_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `verification_notes` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `verified_by` (`verified_by`),
  KEY `idx_pickup_person_id` (`authorized_pickup_person_id`),
  KEY `idx_document_type` (`document_type`),
  CONSTRAINT `authorization_documents_ibfk_1` FOREIGN KEY (`authorized_pickup_person_id`) REFERENCES `authorized_pickup_persons` (`id`) ON DELETE CASCADE,
  CONSTRAINT `authorization_documents_ibfk_2` FOREIGN KEY (`verified_by`) REFERENCES `admin_employee_accounts` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Stores authorization documents (letters, IDs) for pickup persons';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `authorization_documents`
--

LOCK TABLES `authorization_documents` WRITE;
/*!40000 ALTER TABLE `authorization_documents` DISABLE KEYS */;
INSERT INTO `authorization_documents` VALUES (11,29,'authorization_letter','authorize_letter_pickup_by_somene.jpg','uploads\\verification\\pickup_authorization\\pickup_auth_29_1758036793728.jpg',131614,'image/jpeg',0,NULL,NULL,'2025-09-16 15:33:13',NULL);
/*!40000 ALTER TABLE `authorization_documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `authorized_pickup_persons`
--

DROP TABLE IF EXISTS `authorized_pickup_persons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `authorized_pickup_persons` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `request_id` int(11) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) NOT NULL,
  `suffix` varchar(10) DEFAULT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `id_type` varchar(50) DEFAULT NULL,
  `id_number` varchar(50) DEFAULT NULL,
  `id_expiry_date` date DEFAULT NULL,
  `authorization_letter_path` varchar(500) DEFAULT NULL,
  `relationship_to_beneficiary` varchar(100) DEFAULT NULL,
  `is_verified` tinyint(1) DEFAULT 0,
  `verified_by` int(11) DEFAULT NULL,
  `verified_at` timestamp NULL DEFAULT NULL,
  `verification_notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `id_image_path` varchar(500) DEFAULT NULL,
  `id_image_name` varchar(200) DEFAULT NULL,
  `id_image_size` int(11) DEFAULT NULL,
  `id_image_mime_type` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `verified_by` (`verified_by`),
  KEY `idx_request_id` (`request_id`),
  KEY `idx_full_name` (`last_name`,`first_name`),
  KEY `idx_id_number` (`id_number`),
  KEY `idx_verification_status` (`is_verified`),
  KEY `idx_pickup_verification_status` (`is_verified`),
  CONSTRAINT `authorized_pickup_persons_ibfk_1` FOREIGN KEY (`request_id`) REFERENCES `document_requests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `authorized_pickup_persons_ibfk_2` FOREIGN KEY (`verified_by`) REFERENCES `admin_employee_accounts` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Stores information about people authorized to pick up documents on behalf of others';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `authorized_pickup_persons`
--

LOCK TABLES `authorized_pickup_persons` WRITE;
/*!40000 ALTER TABLE `authorized_pickup_persons` DISABLE KEYS */;
INSERT INTO `authorized_pickup_persons` VALUES (29,189,'Rachma','Tiboron','Abdilah',NULL,'09534280428',NULL,NULL,NULL,NULL,'uploads\\verification\\pickup_authorization\\pickup_auth_29_1758036793728.jpg','spouse',0,NULL,NULL,NULL,'2025-09-16 15:33:09','2025-09-16 15:33:13','uploads\\verification\\pickup_ids\\pickup_id_29_1758036793667.jpg','GOV_ID.jpg',110985,'image/jpeg');
/*!40000 ALTER TABLE `authorized_pickup_persons` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `barangay_clearance_applications`
--

DROP TABLE IF EXISTS `barangay_clearance_applications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `barangay_clearance_applications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `request_id` int(11) NOT NULL,
  `has_pending_cases` tinyint(1) DEFAULT 0,
  `pending_cases_details` text DEFAULT NULL,
  `voter_registration_status` tinyint(1) DEFAULT NULL COMMENT 'Voter registration status: 1=registered, 0=not registered, NULL=not specified',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `request_id` (`request_id`),
  CONSTRAINT `barangay_clearance_applications_ibfk_1` FOREIGN KEY (`request_id`) REFERENCES `document_requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=68 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `barangay_clearance_applications`
--

LOCK TABLES `barangay_clearance_applications` WRITE;
/*!40000 ALTER TABLE `barangay_clearance_applications` DISABLE KEYS */;
INSERT INTO `barangay_clearance_applications` VALUES (67,190,0,NULL,1,'2025-09-16 15:38:06','2025-09-16 15:38:06');
/*!40000 ALTER TABLE `barangay_clearance_applications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `beneficiary_verification_documents`
--

DROP TABLE IF EXISTS `beneficiary_verification_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `beneficiary_verification_documents` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `beneficiary_id` int(11) NOT NULL,
  `document_type` varchar(100) NOT NULL,
  `document_name` varchar(200) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_size` int(11) DEFAULT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `is_verified` tinyint(1) DEFAULT 0,
  `verified_by` int(11) DEFAULT NULL,
  `verified_at` timestamp NULL DEFAULT NULL,
  `verification_notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `beneficiary_verification_documents`
--

LOCK TABLES `beneficiary_verification_documents` WRITE;
/*!40000 ALTER TABLE `beneficiary_verification_documents` DISABLE KEYS */;
/*!40000 ALTER TABLE `beneficiary_verification_documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cedula_applications`
--

DROP TABLE IF EXISTS `cedula_applications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cedula_applications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `request_id` int(11) NOT NULL,
  `occupation` varchar(100) DEFAULT NULL,
  `employer_name` varchar(200) DEFAULT NULL,
  `employer_address` text DEFAULT NULL,
  `monthly_income` decimal(12,2) DEFAULT NULL,
  `annual_income` decimal(12,2) DEFAULT NULL,
  `business_name` varchar(200) DEFAULT NULL,
  `business_address` text DEFAULT NULL,
  `business_type` varchar(100) DEFAULT NULL,
  `business_income` decimal(12,2) DEFAULT NULL,
  `business_gross_receipts` decimal(15,2) DEFAULT 0.00,
  `has_real_property` tinyint(1) DEFAULT 0,
  `has_personal_property` tinyint(1) DEFAULT 0,
  `personal_property_value` decimal(15,2) DEFAULT 0.00,
  `property_assessed_value` decimal(15,2) DEFAULT NULL,
  `property_location` text DEFAULT NULL,
  `tin_number` varchar(20) DEFAULT NULL,
  `previous_ctc_number` varchar(50) DEFAULT NULL,
  `previous_ctc_date_issued` date DEFAULT NULL,
  `previous_ctc_place_issued` varchar(100) DEFAULT NULL,
  `computed_tax` decimal(10,2) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `request_id` (`request_id`),
  KEY `idx_tin_number` (`tin_number`),
  KEY `idx_occupation` (`occupation`),
  CONSTRAINT `cedula_applications_ibfk_1` FOREIGN KEY (`request_id`) REFERENCES `document_requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=103 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cedula_applications`
--

LOCK TABLES `cedula_applications` WRITE;
/*!40000 ALTER TABLE `cedula_applications` DISABLE KEYS */;
INSERT INTO `cedula_applications` VALUES (99,189,'Not specified',NULL,NULL,0.00,15000.00,NULL,NULL,NULL,0.00,0.00,1,1,10000.00,5000.00,'street durian, blk 19 lot 17-20 brgy. bula general santos city',NULL,NULL,NULL,NULL,100.00,'2025-09-16 15:33:13','2025-09-16 15:33:13'),(100,191,'Not specified',NULL,NULL,0.00,20000.00,NULL,NULL,NULL,0.00,0.00,0,0,0.00,0.00,NULL,NULL,NULL,NULL,NULL,100.00,'2025-09-17 16:02:32','2025-09-17 16:02:32'),(102,193,'Not specified',NULL,NULL,0.00,30000.00,NULL,NULL,NULL,0.00,0.00,0,0,0.00,0.00,NULL,NULL,NULL,NULL,NULL,100.00,'2025-09-30 04:06:08','2025-09-30 04:06:08');
/*!40000 ALTER TABLE `cedula_applications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `civil_status`
--

DROP TABLE IF EXISTS `civil_status`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `civil_status` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `status_name` varchar(20) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `status_name` (`status_name`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `civil_status`
--

LOCK TABLES `civil_status` WRITE;
/*!40000 ALTER TABLE `civil_status` DISABLE KEYS */;
INSERT INTO `civil_status` VALUES (1,'Single','2025-06-08 08:27:00'),(2,'Married','2025-06-08 08:27:00'),(3,'Divorced','2025-06-08 08:27:00'),(4,'Widowed','2025-06-08 08:27:00'),(5,'Separated','2025-06-08 08:27:00');
/*!40000 ALTER TABLE `civil_status` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `client_accounts`
--

DROP TABLE IF EXISTS `client_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `client_accounts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `status` enum('active','inactive','suspended','pending_verification','pending_residency_verification','residency_rejected') DEFAULT 'pending_verification',
  `email_verified` tinyint(1) DEFAULT 0,
  `phone_verified` tinyint(1) DEFAULT 0,
  `last_login` timestamp NULL DEFAULT NULL,
  `password_changed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  KEY `idx_username` (`username`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=80 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `client_accounts`
--

LOCK TABLES `client_accounts` WRITE;
/*!40000 ALTER TABLE `client_accounts` DISABLE KEYS */;
INSERT INTO `client_accounts` VALUES (59,'Rhaijana','$2a$12$j2K4EYma/yJeyAX2e/.JFesGHRH7D5GS37VoRHvDKBkmKodTMOJfy','active',1,0,'2025-09-29 16:00:27','2025-09-16 15:24:47','2025-09-16 15:24:47','2025-09-29 16:00:27'),(60,'kris3414','$2a$12$FxJ5oGE8VHWQEEk2FcNOQeT4.g/YO0nsHfw0rxux/5f/z8PB4qNAW','active',1,0,'2025-09-17 16:57:46','2025-09-17 15:52:45','2025-09-17 15:52:45','2025-09-17 16:57:46'),(69,'thea11111','$2a$12$ojD7bZmg.3.lZejfWLlrT.bp/OyTZzgGTeYjm1UMB6HPO0Gc7oW9a','active',1,0,'2025-09-17 20:20:01','2025-09-17 20:18:04','2025-09-17 20:18:04','2025-09-17 20:20:01'),(70,'eva234','$2a$12$tC2wpthXbszO61CREfW6F.rHS5cfnkjlgYMp7pNrW9Q0iciaj349e','active',1,0,'2025-09-30 04:05:34','2025-09-30 03:52:34','2025-09-30 03:52:34','2025-09-30 04:05:34'),(71,'bonbon35','$2a$12$7s5vbSYbmvNERu9K4.CCJOHXDE7ZkMh3HhEGr.RPF3uyTqAZwJaFy','active',1,0,NULL,'2025-09-30 10:18:21','2025-09-30 10:18:21','2025-09-30 10:23:15'),(76,'kloykloy22','$2a$12$gC6VrMEUsWSu5ZRh3E0h.uA8tUZxD/KvMgMJh4QmlfYO2VW2ziph6','active',1,0,'2025-09-30 11:04:13','2025-09-30 11:02:50','2025-09-30 11:02:50','2025-09-30 11:04:13'),(78,'kristle11','$2a$12$/F4QEEZGzcJWqwqYSu7zk.T1cPCamEbUJocCIjZm7wzaPGPAH.Q.u','active',1,0,'2025-09-30 11:35:38','2025-09-30 11:34:22','2025-09-30 11:34:22','2025-09-30 11:35:38'),(79,'george12','$2a$12$RF6Mrng55Kulgiqac/q7iuySfdusXpAB9VDQBOlvvOMEMLyawnPsy','active',1,0,'2025-09-30 11:39:50','2025-09-30 11:38:12','2025-09-30 11:38:12','2025-09-30 11:39:50');
/*!40000 ALTER TABLE `client_accounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `client_profiles`
--

DROP TABLE IF EXISTS `client_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `client_profiles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `account_id` int(11) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) NOT NULL,
  `suffix` varchar(10) DEFAULT NULL,
  `birth_date` date NOT NULL,
  `gender` enum('male','female') NOT NULL,
  `civil_status_id` int(11) NOT NULL,
  `nationality` varchar(50) DEFAULT 'Filipino',
  `phone_number` varchar(20) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `house_number` varchar(20) DEFAULT NULL,
  `street` varchar(100) DEFAULT NULL,
  `subdivision` varchar(100) DEFAULT NULL,
  `barangay` varchar(100) NOT NULL,
  `city_municipality` varchar(100) NOT NULL,
  `province` varchar(100) NOT NULL,
  `region` varchar(100) DEFAULT NULL,
  `region_code` varchar(20) DEFAULT NULL,
  `province_code` varchar(20) DEFAULT NULL,
  `city_code` varchar(20) DEFAULT NULL,
  `barangay_code` varchar(20) DEFAULT NULL,
  `postal_code` varchar(10) DEFAULT NULL,
  `years_of_residency` int(11) DEFAULT NULL,
  `months_of_residency` int(11) DEFAULT NULL,
  `profile_picture` varchar(255) DEFAULT NULL,
  `is_verified` tinyint(1) DEFAULT 0,
  `residency_verified` tinyint(1) DEFAULT 0,
  `residency_verified_by` int(11) DEFAULT NULL,
  `residency_verified_at` timestamp NULL DEFAULT NULL,
  `verified_by` int(11) DEFAULT NULL,
  `verified_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `account_id` (`account_id`),
  KEY `civil_status_id` (`civil_status_id`),
  KEY `verified_by` (`verified_by`),
  KEY `idx_full_name` (`last_name`,`first_name`),
  KEY `idx_birth_date` (`birth_date`),
  KEY `idx_barangay` (`barangay`),
  KEY `idx_email` (`email`),
  KEY `idx_phone` (`phone_number`),
  KEY `residency_verified_by` (`residency_verified_by`),
  KEY `idx_residency_verified` (`residency_verified`),
  CONSTRAINT `client_profiles_ibfk_1` FOREIGN KEY (`account_id`) REFERENCES `client_accounts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `client_profiles_ibfk_2` FOREIGN KEY (`civil_status_id`) REFERENCES `civil_status` (`id`),
  CONSTRAINT `client_profiles_ibfk_3` FOREIGN KEY (`verified_by`) REFERENCES `admin_employee_accounts` (`id`),
  CONSTRAINT `client_profiles_ibfk_4` FOREIGN KEY (`residency_verified_by`) REFERENCES `admin_employee_accounts` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=57 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `client_profiles`
--

LOCK TABLES `client_profiles` WRITE;
/*!40000 ALTER TABLE `client_profiles` DISABLE KEYS */;
INSERT INTO `client_profiles` VALUES (36,59,'Rhaijana','Tiboron','Abdilah','','2004-03-08','female',1,'Filipino','09526574063','rhaijanaabdilah@gmail.com','blk 19 lot 17-20','durian',NULL,'Bula','General Santos City (Dadiangas)','South Cotabato','Region XII (SOCCSKSARGEN)','12','1263','126303','126303005','9500',5,5,NULL,0,1,32,'2025-09-16 15:28:30',NULL,NULL,'2025-09-16 15:26:00','2025-09-16 15:28:30'),(37,60,'Kris','','Barbosa','','1999-02-21','female',1,'Filipino','09068295558','cadyscience12@gmail.com','21','San Pedro',NULL,'Bula','General Santos City (Dadiangas)','South Cotabato','Region XII (SOCCSKSARGEN)','12','1263','126303','126303005','9500',12,3,NULL,0,1,32,'2025-09-17 15:58:50',NULL,NULL,'2025-09-17 15:54:10','2025-09-17 18:21:16'),(46,69,'Thea','','Sy','','2000-02-21','female',1,'Filipino','09507173723','gemmaford605@gmail.com','21','Rizal',NULL,'Bula','General Santos City (Dadiangas)','South Cotabato','Region XII (SOCCSKSARGEN)','12','1263','126303','126303005','9500',10,5,NULL,0,1,32,'2025-09-19 01:49:02',NULL,NULL,'2025-09-17 20:18:48','2025-09-19 01:49:02'),(47,70,'Eva','','Chua','','1999-01-21','female',1,'Filipino','09955958358','eva4231@gmail.com','21','Magsaysay',NULL,'Bula','General Santos City (Dadiangas)','South Cotabato','Region XII (SOCCSKSARGEN)','12','1263','126303','126303005','9500',10,7,NULL,0,1,32,'2025-09-30 03:57:29',NULL,NULL,'2025-09-30 03:53:49','2025-09-30 10:16:34'),(48,71,'Bon','','Lamorte','','1995-09-21','male',1,'Filipino','09955958358','booonbbooon1@gmail.com','2','Asay',NULL,'Bula','General Santos City (Dadiangas)','South Cotabato','Region XII (SOCCSKSARGEN)','12','1263','126303','126303005',NULL,10,9,NULL,0,0,NULL,NULL,NULL,NULL,'2025-09-30 10:19:27','2025-09-30 10:23:34'),(53,76,'Danny','','Esco','','2000-02-04','male',1,'Filipino','09955958358','escodandan443@gmail.com','2','Asay',NULL,'Bula','General Santos City (Dadiangas)','South Cotabato','Region XII (SOCCSKSARGEN)','12','1263','126303','126303005','9500',5,9,NULL,0,0,NULL,NULL,NULL,NULL,'2025-09-30 11:03:04','2025-09-30 11:13:21'),(55,78,'kristle','','Chua','','2000-04-04','male',1,'Filipino','09955958358','krisc@gmail.com','2','Asay',NULL,'Bula','General Santos City (Dadiangas)','South Cotabato','Region XII (SOCCSKSARGEN)','12','1263','126303','126303005','9500',5,9,NULL,0,0,NULL,NULL,NULL,NULL,'2025-09-30 11:34:32','2025-09-30 11:37:49'),(56,79,'George','','Grandia','JR.','2000-04-21','male',1,'Filipino','09955958358','torukamiya1@gmail.com','2','Asay',NULL,'Bula','General Santos City (Dadiangas)','South Cotabato','Region XII (SOCCSKSARGEN)','12','1263','126303','126303005','9500',5,9,NULL,0,0,NULL,NULL,NULL,NULL,'2025-09-30 11:38:53','2025-09-30 11:38:53');
/*!40000 ALTER TABLE `client_profiles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `document_beneficiaries`
--

DROP TABLE IF EXISTS `document_beneficiaries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `document_beneficiaries` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `request_id` int(11) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) NOT NULL,
  `suffix` varchar(10) DEFAULT NULL,
  `birth_date` date NOT NULL,
  `gender` enum('male','female') NOT NULL,
  `civil_status_id` int(11) NOT NULL,
  `nationality` varchar(50) DEFAULT 'Filipino',
  `phone_number` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `house_number` varchar(20) DEFAULT NULL,
  `street` varchar(100) DEFAULT NULL,
  `subdivision` varchar(100) DEFAULT NULL,
  `barangay` varchar(100) NOT NULL,
  `city_municipality` varchar(100) NOT NULL,
  `province` varchar(100) NOT NULL,
  `region` varchar(100) DEFAULT NULL,
  `region_code` varchar(20) DEFAULT NULL,
  `province_code` varchar(20) DEFAULT NULL,
  `city_code` varchar(20) DEFAULT NULL,
  `barangay_code` varchar(20) DEFAULT NULL,
  `postal_code` varchar(10) DEFAULT NULL,
  `years_of_residency` int(11) DEFAULT NULL,
  `months_of_residency` int(11) DEFAULT NULL,
  `relationship_to_requestor` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `verification_image_path` varchar(500) DEFAULT NULL,
  `verification_image_name` varchar(200) DEFAULT NULL,
  `verification_image_size` int(11) DEFAULT NULL,
  `verification_image_mime_type` varchar(100) DEFAULT NULL,
  `verification_status` enum('pending','approved','rejected') DEFAULT 'pending',
  `verified_by` int(11) DEFAULT NULL,
  `verified_at` timestamp NULL DEFAULT NULL,
  `verification_notes` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `civil_status_id` (`civil_status_id`),
  KEY `idx_request_id` (`request_id`),
  KEY `idx_full_name` (`last_name`,`first_name`),
  KEY `idx_birth_date` (`birth_date`),
  CONSTRAINT `document_beneficiaries_ibfk_1` FOREIGN KEY (`request_id`) REFERENCES `document_requests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `document_beneficiaries_ibfk_2` FOREIGN KEY (`civil_status_id`) REFERENCES `civil_status` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `document_beneficiaries`
--

LOCK TABLES `document_beneficiaries` WRITE;
/*!40000 ALTER TABLE `document_beneficiaries` DISABLE KEYS */;
INSERT INTO `document_beneficiaries` VALUES (16,189,'Mangi','Dindong','Abdilah',NULL,'1967-05-15','male',2,'Filipino','09168387858','rhaijanaabdilah@gmail.com','blk 19 lot 17-20','durian',NULL,'Bula','General Santos City (Dadiangas)','South Cotabato',NULL,'12','1263','126303','126303005',NULL,NULL,NULL,'parent','2025-09-16 15:33:09','2025-09-16 15:33:13','uploads\\verification\\beneficiaries\\beneficiary_16_1758036793623.jpg','fam_valid_ID.jpg',2510080,'image/jpeg','pending',NULL,NULL,NULL),(17,189,'Mangi','Dindong','Abdilah',NULL,'1967-05-15','male',2,'Filipino','09168387858','rhaijanaabdilah@gmail.com','blk 19 lot 17-20','durian',NULL,'Bula','General Santos City (Dadiangas)','South Cotabato',NULL,'12','1263','126303','126303005',NULL,NULL,NULL,'parent','2025-09-16 15:33:13','2025-09-16 15:33:13',NULL,NULL,NULL,NULL,'pending',NULL,NULL,NULL);
/*!40000 ALTER TABLE `document_beneficiaries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `document_requests`
--

DROP TABLE IF EXISTS `document_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `document_requests` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `request_number` varchar(50) NOT NULL,
  `client_id` int(11) NOT NULL,
  `is_third_party_request` tinyint(1) DEFAULT 0,
  `document_type_id` int(11) NOT NULL,
  `purpose_category_id` int(11) NOT NULL,
  `purpose_details` text DEFAULT NULL,
  `requestor_notes` text DEFAULT NULL,
  `status_id` int(11) NOT NULL,
  `priority` enum('normal','urgent') DEFAULT 'normal',
  `processed_by` int(11) DEFAULT NULL,
  `approved_by` int(11) DEFAULT NULL,
  `processed_at` timestamp NULL DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `payment_method_id` int(11) DEFAULT NULL,
  `payment_status` enum('pending','processing','paid','failed','refunded','cancelled') DEFAULT 'pending',
  `payment_reference` varchar(100) DEFAULT NULL,
  `payment_provider_reference` varchar(100) DEFAULT NULL,
  `paid_at` timestamp NULL DEFAULT NULL,
  `delivery_method` enum('pickup','delivery') DEFAULT 'pickup',
  `delivery_address` text DEFAULT NULL,
  `total_document_fee` decimal(10,2) NOT NULL DEFAULT 0.00,
  `requested_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `target_completion_date` date DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `request_number` (`request_number`),
  KEY `purpose_category_id` (`purpose_category_id`),
  KEY `processed_by` (`processed_by`),
  KEY `approved_by` (`approved_by`),
  KEY `idx_request_number` (`request_number`),
  KEY `idx_client_id` (`client_id`),
  KEY `idx_document_type` (`document_type_id`),
  KEY `idx_status` (`status_id`),
  KEY `idx_payment_status` (`payment_status`),
  KEY `idx_payment_method` (`payment_method_id`),
  KEY `idx_requested_at` (`requested_at`),
  KEY `idx_total_document_fee` (`total_document_fee`),
  CONSTRAINT `document_requests_ibfk_1` FOREIGN KEY (`client_id`) REFERENCES `client_accounts` (`id`),
  CONSTRAINT `document_requests_ibfk_2` FOREIGN KEY (`document_type_id`) REFERENCES `document_types` (`id`),
  CONSTRAINT `document_requests_ibfk_3` FOREIGN KEY (`purpose_category_id`) REFERENCES `purpose_categories` (`id`),
  CONSTRAINT `document_requests_ibfk_4` FOREIGN KEY (`status_id`) REFERENCES `request_status` (`id`),
  CONSTRAINT `document_requests_ibfk_5` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods` (`id`),
  CONSTRAINT `document_requests_ibfk_6` FOREIGN KEY (`processed_by`) REFERENCES `admin_employee_accounts` (`id`),
  CONSTRAINT `document_requests_ibfk_7` FOREIGN KEY (`approved_by`) REFERENCES `admin_employee_accounts` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=194 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `document_requests`
--

LOCK TABLES `document_requests` WRITE;
/*!40000 ALTER TABLE `document_requests` DISABLE KEYS */;
INSERT INTO `document_requests` VALUES (189,'CED-2025-000001',59,1,1,1,NULL,NULL,11,'normal',NULL,32,NULL,'2025-09-16 15:34:00',1,'pending',NULL,NULL,NULL,'pickup',NULL,100.00,'2025-09-16 15:33:09',NULL,NULL,'2025-09-16 15:33:09','2025-09-29 16:33:32'),(190,'BC-2025-000001',59,0,2,1,NULL,NULL,7,'normal',32,32,'2025-09-29 16:34:04','2025-09-16 15:38:46',2,'paid',NULL,'link_6o1v8V5u8dB1x9wqzxbFC6MV','2025-09-19 02:34:13','pickup',NULL,150.00,'2025-09-16 15:38:03',NULL,NULL,'2025-09-16 15:38:03','2025-09-29 16:34:55'),(191,'CED-2025-000002',60,0,1,1,NULL,NULL,7,'normal',32,32,'2025-09-17 17:12:00','2025-09-17 16:03:32',1,'pending',NULL,NULL,NULL,'pickup',NULL,100.00,'2025-09-17 16:02:28',NULL,NULL,'2025-09-17 16:02:28','2025-09-17 17:16:19'),(193,'CED-2025-000003',70,0,1,1,NULL,NULL,7,'normal',32,32,'2025-09-30 04:10:28','2025-09-30 04:08:28',2,'paid',NULL,'link_YzkuwRuNMTxuDifRc3jr6cVz','2025-09-30 04:09:32','pickup',NULL,100.00,'2025-09-30 04:06:04',NULL,NULL,'2025-09-30 04:06:04','2025-09-30 04:11:02');
/*!40000 ALTER TABLE `document_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `document_types`
--

DROP TABLE IF EXISTS `document_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `document_types` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `type_name` varchar(50) NOT NULL,
  `description` text DEFAULT NULL,
  `base_fee` decimal(10,2) NOT NULL DEFAULT 0.00,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `type_name` (`type_name`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `document_types`
--

LOCK TABLES `document_types` WRITE;
/*!40000 ALTER TABLE `document_types` DISABLE KEYS */;
INSERT INTO `document_types` VALUES (1,'Cedula','Community Tax Certificate',30.00,1,'2025-06-08 08:27:00'),(2,'Barangay Clearance','Certificate of Good Moral Character',150.00,1,'2025-06-08 08:27:00');
/*!40000 ALTER TABLE `document_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `generated_documents`
--

DROP TABLE IF EXISTS `generated_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `generated_documents` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `request_id` int(11) NOT NULL,
  `document_number` varchar(100) NOT NULL,
  `document_path` varchar(500) DEFAULT NULL,
  `qr_code_data` text DEFAULT NULL,
  `issued_date` date NOT NULL,
  `expiry_date` date DEFAULT NULL,
  `is_valid` tinyint(1) DEFAULT 1,
  `issued_by` int(11) NOT NULL,
  `authorized_signatory` varchar(200) DEFAULT NULL,
  `security_hash` varchar(255) DEFAULT NULL,
  `verification_code` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `document_number` (`document_number`),
  KEY `request_id` (`request_id`),
  KEY `issued_by` (`issued_by`),
  KEY `idx_document_number` (`document_number`),
  KEY `idx_verification_code` (`verification_code`),
  KEY `idx_issued_date` (`issued_date`),
  CONSTRAINT `generated_documents_ibfk_1` FOREIGN KEY (`request_id`) REFERENCES `document_requests` (`id`),
  CONSTRAINT `generated_documents_ibfk_2` FOREIGN KEY (`issued_by`) REFERENCES `admin_employee_accounts` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `generated_documents`
--

LOCK TABLES `generated_documents` WRITE;
/*!40000 ALTER TABLE `generated_documents` DISABLE KEYS */;
/*!40000 ALTER TABLE `generated_documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `recipient_type` enum('admin','client') NOT NULL DEFAULT 'admin',
  `recipient_id` int(11) DEFAULT NULL,
  `type` varchar(50) NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `priority` enum('low','normal','high','urgent') DEFAULT 'normal',
  `is_read` tinyint(1) DEFAULT 0,
  `read_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_recipient_type` (`recipient_type`),
  KEY `idx_recipient_id` (`recipient_id`),
  KEY `idx_type` (`type`),
  KEY `idx_priority` (`priority`),
  KEY `idx_is_read` (`is_read`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=444 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
INSERT INTO `notifications` VALUES (259,'admin',32,'new_request','New Document Request','Jerome Revo submitted a new Cedula request (CED-2025-000001)','{\"request_id\":115,\"request_number\":\"CED-2025-000001\",\"document_type\":\"Cedula\",\"client_name\":\"Jerome Revo\",\"priority\":\"normal\",\"admin_id\":32,\"admin_username\":\"admin12345\"}','normal',1,'2025-09-17 17:28:20','2025-07-23 09:29:31','2025-09-17 17:28:20'),(260,'client',12,'status_change','Request Status Updated','Your Cedula request (CED-2025-000001) status has been updated to \"approved\"','{\"request_id\":115,\"request_number\":\"CED-2025-000001\",\"document_type\":\"Cedula\",\"old_status\":\"pending\",\"new_status\":\"approved\"}','normal',0,NULL,'2025-07-23 09:30:01','2025-07-23 09:30:01'),(261,'admin',32,'payment_confirmed','Payment Confirmed','Payment confirmed for Cedula request #CED-2025-000001 by Jerome Revo','{\"request_id\":115,\"request_number\":\"CED-2025-000001\",\"document_type\":\"Cedula\",\"client_name\":\"Jerome Revo\",\"amount\":100,\"payment_id\":\"link_ayWhUdrdpB26pCsSZzjYmEgr\",\"status\":\"paid\"}','high',1,'2025-09-17 17:28:20','2025-07-23 09:31:50','2025-09-17 17:28:20'),(262,'admin',32,'payment_confirmed','Payment Confirmed','Payment confirmed for Cedula request #CED-2025-000001 by Jerome Revo','{\"request_id\":115,\"request_number\":\"CED-2025-000001\",\"document_type\":\"Cedula\",\"client_name\":\"Jerome Revo\",\"amount\":100,\"payment_id\":\"pay_oDenXW8FX5EKCAxW7R2sRtua\",\"status\":\"paid\"}','high',1,'2025-09-17 17:28:20','2025-07-23 09:31:50','2025-09-17 17:28:20'),(263,'client',12,'status_change','Request Status Updated','Your Cedula request (CED-2025-000001) status has been updated to \"processing\"','{\"request_id\":115,\"request_number\":\"CED-2025-000001\",\"document_type\":\"Cedula\",\"old_status\":\"payment_confirmed\",\"new_status\":\"processing\"}','high',0,NULL,'2025-07-23 09:33:01','2025-07-23 09:33:01'),(264,'client',12,'status_change','Request Status Updated','Your Cedula request (CED-2025-000001) status has been updated to \"ready_for_pickup\"','{\"request_id\":115,\"request_number\":\"CED-2025-000001\",\"document_type\":\"Cedula\",\"old_status\":\"processing\",\"new_status\":\"ready_for_pickup\"}','normal',0,NULL,'2025-07-23 09:35:38','2025-07-23 09:35:38'),(265,'client',12,'status_change','Request Status Updated','Your Cedula request (CED-2025-000001) status has been updated to \"completed\"','{\"request_id\":115,\"request_number\":\"CED-2025-000001\",\"document_type\":\"Cedula\",\"old_status\":\"ready_for_pickup\",\"new_status\":\"completed\"}','normal',0,NULL,'2025-07-23 09:36:12','2025-07-23 09:36:12'),(266,'admin',32,'new_request','New Document Request','Jerome Revo submitted a new Barangay Clearance request (BC-2025-000001)','{\"request_id\":116,\"request_number\":\"BC-2025-000001\",\"document_type\":\"Barangay Clearance\",\"client_name\":\"Jerome Revo\",\"priority\":\"normal\",\"admin_id\":32,\"admin_username\":\"admin12345\"}','normal',1,'2025-09-17 17:28:20','2025-07-23 10:03:38','2025-09-17 17:28:20'),(267,'client',12,'status_change','Request Status Updated','Your Barangay Clearance request (BC-2025-000001) status has been updated to \"approved\"','{\"request_id\":116,\"request_number\":\"BC-2025-000001\",\"document_type\":\"Barangay Clearance\",\"old_status\":\"pending\",\"new_status\":\"approved\"}','normal',0,NULL,'2025-07-23 10:03:56','2025-07-23 10:03:56'),(268,'admin',32,'payment_confirmed','Payment Confirmed','Payment confirmed for Barangay Clearance request #BC-2025-000001 by Jerome Revo','{\"request_id\":116,\"request_number\":\"BC-2025-000001\",\"document_type\":\"Barangay Clearance\",\"client_name\":\"Jerome Revo\",\"amount\":163,\"payment_id\":\"pay_ESC6vvKwgMPug9zXbXeUjMAa\",\"status\":\"paid\"}','high',1,'2025-09-17 17:28:20','2025-07-23 10:04:52','2025-09-17 17:28:20'),(269,'admin',32,'payment_confirmed','Payment Confirmed','Payment confirmed for Barangay Clearance request #BC-2025-000001 by Jerome Revo','{\"request_id\":116,\"request_number\":\"BC-2025-000001\",\"document_type\":\"Barangay Clearance\",\"client_name\":\"Jerome Revo\",\"amount\":163,\"payment_id\":\"link_2snQrcdLQZ2K1SHJc4ZB5VYN\",\"status\":\"paid\"}','high',1,'2025-09-17 17:28:20','2025-07-23 10:04:52','2025-09-17 17:28:20'),(270,'admin',32,'new_request','New Document Request','Jerome Revo submitted a new Cedula request (CED-2025-000002)','{\"request_id\":117,\"request_number\":\"CED-2025-000002\",\"document_type\":\"Cedula\",\"client_name\":\"Jerome Revo\",\"priority\":\"normal\",\"admin_id\":32,\"admin_username\":\"admin12345\"}','normal',1,'2025-09-17 17:28:20','2025-07-23 10:22:58','2025-09-17 17:28:20'),(271,'client',12,'status_change','Request Status Updated','Your Cedula request (CED-2025-000002) status has been updated to \"approved\"','{\"request_id\":117,\"request_number\":\"CED-2025-000002\",\"document_type\":\"Cedula\",\"old_status\":\"pending\",\"new_status\":\"approved\"}','normal',0,NULL,'2025-07-23 10:24:15','2025-07-23 10:24:15'),(272,'admin',32,'payment_confirmed','Payment Confirmed','Payment confirmed for Cedula request #CED-2025-000002 by Jerome Revo','{\"request_id\":117,\"request_number\":\"CED-2025-000002\",\"document_type\":\"Cedula\",\"client_name\":\"Jerome Revo\",\"amount\":160.6,\"payment_id\":\"link_uayR9S8nKKLJHce6gTGFj4He\",\"status\":\"paid\"}','high',1,'2025-09-17 17:28:20','2025-07-23 10:25:17','2025-09-17 17:28:20'),(273,'admin',32,'payment_confirmed','Payment Confirmed','Payment confirmed for Cedula request #CED-2025-000002 by Jerome Revo','{\"request_id\":117,\"request_number\":\"CED-2025-000002\",\"document_type\":\"Cedula\",\"client_name\":\"Jerome Revo\",\"amount\":160.6,\"payment_id\":\"pay_mzBpj7GKojyvHX1jHUA5gmCA\",\"status\":\"paid\"}','high',1,'2025-09-17 17:28:20','2025-07-23 10:25:17','2025-09-17 17:28:20'),(274,'admin',32,'new_request','New Document Request','Jerome Revo submitted a new Cedula request (CED-2025-000003)','{\"request_id\":118,\"request_number\":\"CED-2025-000003\",\"document_type\":\"Cedula\",\"client_name\":\"Jerome Revo\",\"priority\":\"normal\",\"admin_id\":32,\"admin_username\":\"admin12345\"}','normal',1,'2025-09-17 17:28:20','2025-07-23 10:30:28','2025-09-17 17:28:20'),(275,'client',12,'status_change','Request Status Updated','Your Cedula request (CED-2025-000003) status has been updated to \"approved\"','{\"request_id\":118,\"request_number\":\"CED-2025-000003\",\"document_type\":\"Cedula\",\"old_status\":\"pending\",\"new_status\":\"approved\"}','normal',0,NULL,'2025-07-23 10:31:12','2025-07-23 10:31:12'),(276,'client',12,'status_change','Request Status Updated','Your Cedula request (CED-2025-000003) status has been updated to \"approved\"','{\"request_id\":118,\"request_number\":\"CED-2025-000003\",\"document_type\":\"Cedula\",\"old_status\":\"pending\",\"new_status\":\"approved\"}','normal',0,NULL,'2025-07-23 10:31:15','2025-07-23 10:31:15'),(277,'admin',32,'payment_confirmed','Payment Confirmed','Payment confirmed for Cedula request #CED-2025-000003 by Jerome Revo','{\"request_id\":118,\"request_number\":\"CED-2025-000003\",\"document_type\":\"Cedula\",\"client_name\":\"Jerome Revo\",\"amount\":160.6,\"payment_id\":\"link_VCMMhpC2ESBphTXV5w5PNVkS\",\"status\":\"paid\"}','high',1,'2025-09-17 17:28:20','2025-07-23 10:32:27','2025-09-17 17:28:20'),(278,'admin',32,'payment_confirmed','Payment Confirmed','Payment confirmed for Cedula request #CED-2025-000003 by Jerome Revo','{\"request_id\":118,\"request_number\":\"CED-2025-000003\",\"document_type\":\"Cedula\",\"client_name\":\"Jerome Revo\",\"amount\":160.6,\"payment_id\":\"pay_qakNqzyPKSULeHSALFoySAFU\",\"status\":\"paid\"}','high',1,'2025-09-17 17:28:20','2025-07-23 10:32:27','2025-09-17 17:28:20'),(279,'admin',32,'new_request','New Document Request','Jerome Revo submitted a new Cedula request (CED-2025-000004)','{\"request_id\":119,\"request_number\":\"CED-2025-000004\",\"document_type\":\"Cedula\",\"client_name\":\"Jerome Revo\",\"priority\":\"normal\",\"admin_id\":32,\"admin_username\":\"admin12345\"}','normal',1,'2025-08-07 23:38:43','2025-07-27 12:06:38','2025-08-07 23:38:43'),(280,'client',12,'status_change','Request Status Updated','Your Cedula request (CED-2025-000004) status has been updated to \"approved\"','{\"request_id\":119,\"request_number\":\"CED-2025-000004\",\"document_type\":\"Cedula\",\"old_status\":\"pending\",\"new_status\":\"approved\"}','normal',1,'2025-08-04 17:54:14','2025-07-27 12:06:54','2025-08-04 17:54:14'),(281,'admin',32,'payment_confirmed','Payment Confirmed','Payment confirmed for Cedula request #CED-2025-000004 by Jerome Revo','{\"request_id\":119,\"request_number\":\"CED-2025-000004\",\"document_type\":\"Cedula\",\"client_name\":\"Jerome Revo\",\"amount\":160.6,\"payment_id\":\"pay_kq2MHBCcp6VehdxE5ZJYo4Kz\",\"status\":\"paid\"}','high',1,'2025-08-03 12:26:32','2025-07-27 12:27:20','2025-08-03 12:26:32'),(282,'admin',32,'payment_confirmed','Payment Confirmed','Payment confirmed for Cedula request #CED-2025-000004 by Jerome Revo','{\"request_id\":119,\"request_number\":\"CED-2025-000004\",\"document_type\":\"Cedula\",\"client_name\":\"Jerome Revo\",\"amount\":160.6,\"payment_id\":\"link_JwvKWk3vScxNi2oRaC268eNT\",\"status\":\"paid\"}','high',1,'2025-09-17 17:28:20','2025-07-27 12:27:20','2025-09-17 17:28:20'),(283,'client',12,'residency_approved','Residency Verification Approved','Your residency verification has been approved. You can now request documents.','{\"account_id\":12,\"approved_by\":32,\"approved_at\":\"2025-08-07T11:26:38.584Z\"}','high',0,NULL,'2025-08-07 11:26:38','2025-08-07 11:26:38'),(284,'admin',NULL,'new_client_registration','New Client Registration','karol Healer (karolhealer@gmail.com) has registered and needs residency verification.','{\"client_id\":33,\"client_name\":\"karol Healer\",\"client_email\":\"karolhealer@gmail.com\",\"client_username\":\"bogart21345\",\"registration_date\":\"2025-08-07T21:04:37.159Z\"}','normal',1,'2025-08-07 23:15:39','2025-08-07 21:04:37','2025-08-07 23:15:39'),(285,'client',33,'residency_approved','Residency Verification Approved','Your residency verification has been approved. You can now request documents.','{\"account_id\":33,\"approved_by\":32,\"approved_at\":\"2025-08-07T22:08:32.751Z\"}','high',0,NULL,'2025-08-07 22:08:32','2025-08-07 22:08:32'),(286,'client',32,'residency_approved','Residency Verification Approved','Your residency verification has been approved. You can now request documents.','{\"account_id\":32,\"approved_by\":32,\"approved_at\":\"2025-08-07T22:13:07.010Z\"}','high',0,NULL,'2025-08-07 22:13:07','2025-08-07 22:13:07'),(289,'client',34,'residency_approved','Residency Verification Approved','Your residency verification has been approved. You can now request documents.','{\"account_id\":34,\"approved_by\":32,\"approved_at\":\"2025-08-08T00:53:58.784Z\"}','high',1,'2025-08-08 01:17:50','2025-08-08 00:53:58','2025-08-08 01:17:50'),(290,'client',32,'residency_approved','Residency Verification Approved','Your residency verification has been approved. You can now request documents.','{\"account_id\":32,\"approved_by\":32,\"approved_at\":\"2025-08-09T03:53:15.334Z\"}','high',0,NULL,'2025-08-09 03:53:15','2025-08-09 03:53:15'),(291,'client',12,'status_change','Request Status Updated','Your Barangay Clearance request (BC-2025-000001) status has been updated to \"ready_for_pickup\"','{\"request_id\":116,\"request_number\":\"BC-2025-000001\",\"document_type\":\"Barangay Clearance\",\"old_status\":\"completed\",\"new_status\":\"ready_for_pickup\"}','normal',0,NULL,'2025-08-10 01:24:16','2025-08-10 01:24:16'),(292,'client',12,'status_change','Request Status Updated','Your Barangay Clearance request (BC-2025-000001) status has been updated to \"completed\"','{\"request_id\":116,\"request_number\":\"BC-2025-000001\",\"document_type\":\"Barangay Clearance\",\"old_status\":\"ready_for_pickup\",\"new_status\":\"completed\"}','normal',0,NULL,'2025-08-10 01:24:23','2025-08-10 01:24:23'),(293,'client',12,'status_change','Request Status Updated','Your Barangay Clearance request (BC-2025-000001) status has been updated to \"ready_for_pickup\"','{\"request_id\":116,\"request_number\":\"BC-2025-000001\",\"document_type\":\"Barangay Clearance\",\"old_status\":\"completed\",\"new_status\":\"ready_for_pickup\"}','normal',0,NULL,'2025-08-10 01:27:17','2025-08-10 01:27:17'),(294,'client',12,'status_change','Request Status Updated','Your Barangay Clearance request (BC-2025-000001) status has been updated to \"completed\"','{\"request_id\":116,\"request_number\":\"BC-2025-000001\",\"document_type\":\"Barangay Clearance\",\"old_status\":\"ready_for_pickup\",\"new_status\":\"completed\"}','normal',0,NULL,'2025-08-10 01:27:22','2025-08-10 01:27:22'),(296,'client',34,'status_change','Request Status Updated','Your Cedula request (CED-2025-000005) status has been updated to \"approved\"','{\"request_id\":120,\"request_number\":\"CED-2025-000005\",\"document_type\":\"Cedula\",\"old_status\":\"pending\",\"new_status\":\"approved\"}','normal',1,'2025-08-10 13:46:02','2025-08-10 13:45:50','2025-08-10 13:46:02'),(298,'client',34,'status_change','Request Status Updated','Your Cedula request (CED-2025-000005) status has been updated to \"approved\"','{\"request_id\":122,\"request_number\":\"CED-2025-000005\",\"document_type\":\"Cedula\",\"old_status\":\"pending\",\"new_status\":\"approved\"}','normal',1,'2025-08-12 19:41:15','2025-08-12 18:43:23','2025-08-12 19:41:15'),(305,'admin',32,'new_request','New Document Request','Megan Taylor submitted a new Cedula request (CED-2025-000005)','{\"request_id\":135,\"request_number\":\"CED-2025-000005\",\"document_type\":\"Cedula\",\"client_name\":\"Megan Taylor\",\"priority\":\"normal\",\"admin_id\":32,\"admin_username\":\"admin12345\"}','normal',1,'2025-09-17 17:28:20','2025-08-13 03:46:16','2025-09-17 17:28:20'),(306,'admin',32,'new_request','New Document Request','Megan Taylor submitted a new Cedula request (CED-2025-000005)','{\"request_id\":138,\"request_number\":\"CED-2025-000005\",\"document_type\":\"Cedula\",\"client_name\":\"Megan Taylor\",\"priority\":\"normal\",\"admin_id\":32,\"admin_username\":\"admin12345\"}','normal',1,'2025-09-17 17:28:20','2025-08-13 04:58:01','2025-09-17 17:28:20'),(307,'admin',32,'new_request','New Document Request','Megan Taylor submitted a new Cedula request (CED-2025-000005)','{\"request_id\":140,\"request_number\":\"CED-2025-000005\",\"document_type\":\"Cedula\",\"client_name\":\"Megan Taylor\",\"priority\":\"normal\",\"admin_id\":32,\"admin_username\":\"admin12345\"}','normal',1,'2025-09-17 17:28:20','2025-08-13 06:43:20','2025-09-17 17:28:20'),(308,'admin',32,'new_request','New Document Request','karol Healer submitted a new Barangay Clearance request (BC-2025-000002)','{\"request_id\":143,\"request_number\":\"BC-2025-000002\",\"document_type\":\"Barangay Clearance\",\"client_name\":\"karol Healer\",\"priority\":\"normal\",\"admin_id\":32,\"admin_username\":\"admin12345\"}','normal',1,'2025-09-17 17:28:20','2025-08-13 07:15:48','2025-09-17 17:28:20'),(309,'admin',32,'new_request','New Document Request','Megan Taylor submitted a new Cedula request (CED-2025-000005)','{\"request_id\":144,\"request_number\":\"CED-2025-000005\",\"document_type\":\"Cedula\",\"client_name\":\"Megan Taylor\",\"priority\":\"normal\",\"admin_id\":32,\"admin_username\":\"admin12345\"}','normal',1,'2025-09-17 17:28:20','2025-08-13 07:36:10','2025-09-17 17:28:20'),(310,'admin',32,'new_request','New Document Request','Megan Taylor submitted a new Cedula request (CED-2025-000005)','{\"request_id\":145,\"request_number\":\"CED-2025-000005\",\"document_type\":\"Cedula\",\"client_name\":\"Megan Taylor\",\"priority\":\"normal\",\"admin_id\":32,\"admin_username\":\"admin12345\"}','normal',1,'2025-09-17 17:28:20','2025-08-13 07:40:31','2025-09-17 17:28:20'),(311,'admin',32,'new_request','New Document Request','karol Healer submitted a new Cedula request (CED-2025-000005)','{\"request_id\":146,\"request_number\":\"CED-2025-000005\",\"document_type\":\"Cedula\",\"client_name\":\"karol Healer\",\"priority\":\"normal\",\"admin_id\":32,\"admin_username\":\"admin12345\"}','normal',1,'2025-09-17 17:28:20','2025-08-13 07:45:32','2025-09-17 17:28:20'),(312,'admin',32,'new_request','New Document Request','karol Healer submitted a new Cedula request (CED-2025-000006)','{\"request_id\":147,\"request_number\":\"CED-2025-000006\",\"document_type\":\"Cedula\",\"client_name\":\"karol Healer\",\"priority\":\"normal\",\"admin_id\":32,\"admin_username\":\"admin12345\"}','normal',1,'2025-09-17 17:28:20','2025-08-13 07:50:06','2025-09-17 17:28:20'),(313,'admin',32,'new_request','New Document Request','Megan Taylor submitted a new Cedula request (CED-2025-000007)','{\"request_id\":149,\"request_number\":\"CED-2025-000007\",\"document_type\":\"Cedula\",\"client_name\":\"Megan Taylor\",\"priority\":\"normal\",\"admin_id\":32,\"admin_username\":\"admin12345\"}','normal',1,'2025-09-17 17:28:20','2025-08-14 00:58:24','2025-09-17 17:28:20'),(314,'admin',32,'new_request','New Document Request','Megan Taylor submitted a new Cedula request (CED-2025-000005)','{\"request_id\":150,\"request_number\":\"CED-2025-000005\",\"document_type\":\"Cedula\",\"client_name\":\"Megan Taylor\",\"priority\":\"normal\",\"admin_id\":32,\"admin_username\":\"admin12345\"}','normal',1,'2025-09-17 17:28:20','2025-08-14 04:34:13','2025-09-17 17:28:20'),(315,'admin',32,'new_request','New Document Request','Megan Taylor submitted a new Barangay Clearance request (BC-2025-000002)','{\"request_id\":151,\"request_number\":\"BC-2025-000002\",\"document_type\":\"Barangay Clearance\",\"client_name\":\"Megan Taylor\",\"priority\":\"normal\",\"admin_id\":32,\"admin_username\":\"admin12345\"}','normal',1,'2025-09-17 17:28:20','2025-08-14 04:36:18','2025-09-17 17:28:20'),(316,'admin',32,'new_request','New Document Request','Megan Taylor submitted a new Cedula request (CED-2025-000005)','{\"request_id\":152,\"request_number\":\"CED-2025-000005\",\"document_type\":\"Cedula\",\"client_name\":\"Megan Taylor\",\"priority\":\"normal\",\"admin_id\":32,\"admin_username\":\"admin12345\"}','normal',1,'2025-09-17 17:28:20','2025-08-14 10:26:45','2025-09-17 17:28:20'),(317,'admin',32,'new_request','New Document Request','Megan Taylor submitted a new Cedula request (CED-2025-000005)','{\"request_id\":153,\"request_number\":\"CED-2025-000005\",\"document_type\":\"Cedula\",\"client_name\":\"Megan Taylor\",\"priority\":\"normal\",\"admin_id\":32,\"admin_username\":\"admin12345\"}','normal',1,'2025-09-17 17:28:20','2025-08-14 10:37:29','2025-09-17 17:28:20'),(318,'admin',32,'new_request','New Document Request','Megan Taylor submitted a new Cedula request (CED-2025-000005)','{\"request_id\":154,\"request_number\":\"CED-2025-000005\",\"document_type\":\"Cedula\",\"client_name\":\"Megan Taylor\",\"priority\":\"normal\",\"admin_id\":32,\"admin_username\":\"admin12345\"}','normal',1,'2025-09-17 17:28:20','2025-08-14 12:38:49','2025-09-17 17:28:20'),(319,'admin',32,'new_request','New Document Request','Megan Taylor submitted a new Barangay Clearance request (BC-2025-000002)','{\"request_id\":155,\"request_number\":\"BC-2025-000002\",\"document_type\":\"Barangay Clearance\",\"client_name\":\"Megan Taylor\",\"priority\":\"normal\",\"admin_id\":32,\"admin_username\":\"admin12345\"}','normal',1,'2025-09-17 17:28:20','2025-08-15 08:16:05','2025-09-17 17:28:20'),(320,'client',34,'status_change','Request Status Updated','Your Cedula request (CED-2025-000005) status has been updated to \"approved\"','{\"request_id\":154,\"request_number\":\"CED-2025-000005\",\"document_type\":\"Cedula\",\"old_status\":\"under_review\",\"new_status\":\"approved\"}','normal',1,'2025-08-15 11:37:46','2025-08-15 11:29:04','2025-08-15 11:37:46'),(321,'client',12,'status_change','Request Status Updated','Your Cedula request (CED-2025-000004) status has been updated to \"processing\"','{\"request_id\":119,\"request_number\":\"CED-2025-000004\",\"document_type\":\"Cedula\",\"old_status\":\"payment_confirmed\",\"new_status\":\"processing\"}','high',0,NULL,'2025-08-15 20:49:20','2025-08-15 20:49:20'),(322,'client',12,'status_change','Request Status Updated','Your Cedula request (CED-2025-000004) status has been updated to \"ready_for_pickup\"','{\"request_id\":119,\"request_number\":\"CED-2025-000004\",\"document_type\":\"Cedula\",\"old_status\":\"processing\",\"new_status\":\"ready_for_pickup\"}','normal',0,NULL,'2025-08-15 20:49:35','2025-08-15 20:49:35'),(323,'client',12,'status_change','Request Status Updated','Your Cedula request (CED-2025-000003) status has been updated to \"processing\"','{\"request_id\":118,\"request_number\":\"CED-2025-000003\",\"document_type\":\"Cedula\",\"old_status\":\"payment_confirmed\",\"new_status\":\"processing\"}','high',0,NULL,'2025-08-15 20:49:45','2025-08-15 20:49:45'),(324,'admin',NULL,'new_client_registration','New Client Registration','Jason Dela Cruz (brayanstone120@gmail.com) has registered and needs residency verification.','{\"client_id\":37,\"client_name\":\"Jason Dela Cruz\",\"client_email\":\"brayanstone120@gmail.com\",\"client_username\":\"jason12345\",\"registration_date\":\"2025-08-25T12:54:52.347Z\"}','normal',1,'2025-09-17 17:28:20','2025-08-25 12:54:52','2025-09-17 17:28:20'),(325,'client',37,'residency_approved','Residency Verification Approved','Your residency verification has been approved. You can now request documents.','{\"account_id\":37,\"approved_by\":32,\"approved_at\":\"2025-08-25T12:56:40.109Z\"}','high',0,NULL,'2025-08-25 12:56:40','2025-08-25 12:56:40'),(326,'admin',32,'new_request','New Document Request','Megan Taylor submitted a new Cedula request (CED-2025-000005)','{\"request_id\":156,\"request_number\":\"CED-2025-000005\",\"document_type\":\"Cedula\",\"client_name\":\"Megan Taylor\",\"priority\":\"normal\",\"admin_id\":32,\"admin_username\":\"admin12345\"}','normal',1,'2025-09-17 17:28:20','2025-09-01 14:47:36','2025-09-17 17:28:20'),(327,'admin',34,'new_request','New Document Request','Megan Taylor submitted a new Cedula request (CED-2025-000005)','{\"request_id\":156,\"request_number\":\"CED-2025-000005\",\"document_type\":\"Cedula\",\"client_name\":\"Megan Taylor\",\"priority\":\"normal\",\"admin_id\":34,\"admin_username\":\"mark12345\"}','normal',0,NULL,'2025-09-01 14:47:37','2025-09-01 14:47:37'),(328,'admin',32,'new_request','New Document Request','Megan Taylor submitted a new Cedula request (CED-2025-000006)','{\"request_id\":157,\"request_number\":\"CED-2025-000006\",\"document_type\":\"Cedula\",\"client_name\":\"Megan Taylor\",\"priority\":\"normal\",\"admin_id\":32,\"admin_username\":\"admin12345\"}','normal',1,'2025-09-17 17:28:20','2025-09-08 02:13:01','2025-09-17 17:28:20'),(329,'admin',34,'new_request','New Document Request','Megan Taylor submitted a new Cedula request (CED-2025-000006)','{\"request_id\":157,\"request_number\":\"CED-2025-000006\",\"document_type\":\"Cedula\",\"client_name\":\"Megan Taylor\",\"priority\":\"normal\",\"admin_id\":34,\"admin_username\":\"mark12345\"}','normal',0,NULL,'2025-09-08 02:13:01','2025-09-08 02:13:01'),(330,'admin',32,'new_request','New Document Request','Megan Taylor submitted a new Cedula request (CED-2025-000001)','{\"request_id\":158,\"request_number\":\"CED-2025-000001\",\"document_type\":\"Cedula\",\"client_name\":\"Megan Taylor\",\"priority\":\"normal\",\"admin_id\":32,\"admin_username\":\"admin12345\"}','normal',1,'2025-09-17 17:28:20','2025-09-08 02:48:49','2025-09-17 17:28:20'),(331,'admin',34,'new_request','New Document Request','Megan Taylor submitted a new Cedula request (CED-2025-000001)','{\"request_id\":158,\"request_number\":\"CED-2025-000001\",\"document_type\":\"Cedula\",\"client_name\":\"Megan Taylor\",\"priority\":\"normal\",\"admin_id\":34,\"admin_username\":\"mark12345\"}','normal',0,NULL,'2025-09-08 02:48:49','2025-09-08 02:48:49'),(332,'admin',32,'new_request','New Document Request','Megan Taylor submitted a new Cedula request (CED-2025-000001)','{\"request_id\":159,\"request_number\":\"CED-2025-000001\",\"document_type\":\"Cedula\",\"client_name\":\"Megan Taylor\",\"priority\":\"normal\",\"admin_id\":32,\"admin_username\":\"admin12345\"}','normal',1,'2025-09-17 17:28:20','2025-09-08 02:59:01','2025-09-17 17:28:20'),(333,'admin',34,'new_request','New Document Request','Megan Taylor submitted a new Cedula request (CED-2025-000001)','{\"request_id\":159,\"request_number\":\"CED-2025-000001\",\"document_type\":\"Cedula\",\"client_name\":\"Megan Taylor\",\"priority\":\"normal\",\"admin_id\":34,\"admin_username\":\"mark12345\"}','normal',0,NULL,'2025-09-08 02:59:01','2025-09-08 02:59:01'),(334,'admin',32,'new_request','New Document Request','Megan Taylor submitted a new Cedula request (CED-2025-000001)','{\"request_id\":160,\"request_number\":\"CED-2025-000001\",\"document_type\":\"Cedula\",\"client_name\":\"Megan Taylor\",\"priority\":\"normal\",\"admin_id\":32,\"admin_username\":\"admin12345\"}','normal',1,'2025-09-17 17:28:20','2025-09-08 03:38:01','2025-09-17 17:28:20'),(335,'admin',34,'new_request','New Document Request','Megan Taylor submitted a new Cedula request (CED-2025-000001)','{\"request_id\":160,\"request_number\":\"CED-2025-000001\",\"document_type\":\"Cedula\",\"client_name\":\"Megan Taylor\",\"priority\":\"normal\",\"admin_id\":34,\"admin_username\":\"mark12345\"}','normal',0,NULL,'2025-09-08 03:38:01','2025-09-08 03:38:01'),(336,'admin',32,'new_request','New Document Request','Megan Taylor submitted a new Cedula request (CED-2025-000001)','{\"request_id\":161,\"request_number\":\"CED-2025-000001\",\"document_type\":\"Cedula\",\"client_name\":\"Megan Taylor\",\"priority\":\"normal\",\"admin_id\":32,\"admin_username\":\"admin12345\"}','normal',1,'2025-09-17 17:28:20','2025-09-08 03:53:10','2025-09-17 17:28:20'),(337,'admin',34,'new_request','New Document Request','Megan Taylor submitted a new Cedula request (CED-2025-000001)','{\"request_id\":161,\"request_number\":\"CED-2025-000001\",\"document_type\":\"Cedula\",\"client_name\":\"Megan Taylor\",\"priority\":\"normal\",\"admin_id\":34,\"admin_username\":\"mark12345\"}','normal',0,NULL,'2025-09-08 03:53:10','2025-09-08 03:53:10'),(338,'admin',32,'new_request','New Document Request','Megan Taylor submitted a new Cedula request (CED-2025-000001)','{\"request_id\":162,\"request_number\":\"CED-2025-000001\",\"document_type\":\"Cedula\",\"client_name\":\"Megan Taylor\",\"priority\":\"normal\",\"admin_id\":32,\"admin_username\":\"admin12345\"}','normal',1,'2025-09-17 17:28:20','2025-09-08 04:09:05','2025-09-17 17:28:20'),(339,'admin',34,'new_request','New Document Request','Megan Taylor submitted a new Cedula request (CED-2025-000001)','{\"request_id\":162,\"request_number\":\"CED-2025-000001\",\"document_type\":\"Cedula\",\"client_name\":\"Megan Taylor\",\"priority\":\"normal\",\"admin_id\":34,\"admin_username\":\"mark12345\"}','normal',0,NULL,'2025-09-08 04:09:05','2025-09-08 04:09:05'),(340,'admin',32,'new_request','New Document Request','Megan Taylor submitted a new Barangay Clearance request (BC-2025-000001)','{\"request_id\":163,\"request_number\":\"BC-2025-000001\",\"document_type\":\"Barangay Clearance\",\"client_name\":\"Megan Taylor\",\"priority\":\"normal\",\"admin_id\":32,\"admin_username\":\"admin12345\"}','normal',1,'2025-09-17 17:28:20','2025-09-08 04:10:37','2025-09-17 17:28:20'),(341,'admin',34,'new_request','New Document Request','Megan Taylor submitted a new Barangay Clearance request (BC-2025-000001)','{\"request_id\":163,\"request_number\":\"BC-2025-000001\",\"document_type\":\"Barangay Clearance\",\"client_name\":\"Megan Taylor\",\"priority\":\"normal\",\"admin_id\":34,\"admin_username\":\"mark12345\"}','normal',0,NULL,'2025-09-08 04:10:37','2025-09-08 04:10:37'),(342,'client',34,'status_change','Request Status Updated','Your Cedula request (CED-2025-000001) status has been updated to \"approved\"','{\"request_id\":162,\"request_number\":\"CED-2025-000001\",\"document_type\":\"Cedula\",\"old_status\":\"pending\",\"new_status\":\"approved\"}','normal',0,NULL,'2025-09-08 04:10:56','2025-09-08 04:10:56'),(343,'client',34,'status_change','Request Status Updated','Your Barangay Clearance request (BC-2025-000001) status has been updated to \"approved\"','{\"request_id\":163,\"request_number\":\"BC-2025-000001\",\"document_type\":\"Barangay Clearance\",\"old_status\":\"pending\",\"new_status\":\"approved\"}','normal',0,NULL,'2025-09-08 04:11:03','2025-09-08 04:11:03'),(344,'admin',32,'new_request','New Document Request','Megan Taylor submitted a new Cedula request (CED-2025-000001)','{\"request_id\":164,\"request_number\":\"CED-2025-000001\",\"document_type\":\"Cedula\",\"client_name\":\"Megan Taylor\",\"priority\":\"normal\",\"admin_id\":32,\"admin_username\":\"admin12345\"}','normal',1,'2025-09-17 17:28:20','2025-09-08 09:06:33','2025-09-17 17:28:20'),(345,'admin',34,'new_request','New Document Request','Megan Taylor submitted a new Cedula request (CED-2025-000001)','{\"request_id\":164,\"request_number\":\"CED-2025-000001\",\"document_type\":\"Cedula\",\"client_name\":\"Megan Taylor\",\"priority\":\"normal\",\"admin_id\":34,\"admin_username\":\"mark12345\"}','normal',0,NULL,'2025-09-08 09:06:33','2025-09-08 09:06:33'),(346,'admin',32,'request_cancelled','Document Request Cancelled','Megan Taylor cancelled their Cedula request (CED-2025-000001) - Reason: Aalis ako ng gensan','{\"request_id\":164,\"request_number\":\"CED-2025-000001\",\"document_type\":\"Cedula\",\"client_id\":34,\"client_name\":\"Megan Taylor\",\"old_status\":\"pending\",\"new_status\":\"cancelled\",\"cancellation_reason\":\"Aalis ako ng gensan\",\"cancelled_at\":\"2025-09-08T09:08:18.432Z\",\"admin_id\":32,\"admin_username\":\"admin12345\"}','normal',1,'2025-09-17 17:28:20','2025-09-08 09:08:18','2025-09-17 17:28:20'),(347,'admin',34,'request_cancelled','Document Request Cancelled','Megan Taylor cancelled their Cedula request (CED-2025-000001) - Reason: Aalis ako ng gensan','{\"request_id\":164,\"request_number\":\"CED-2025-000001\",\"document_type\":\"Cedula\",\"client_id\":34,\"client_name\":\"Megan Taylor\",\"old_status\":\"pending\",\"new_status\":\"cancelled\",\"cancellation_reason\":\"Aalis ako ng gensan\",\"cancelled_at\":\"2025-09-08T09:08:18.458Z\",\"admin_id\":34,\"admin_username\":\"mark12345\"}','normal',0,NULL,'2025-09-08 09:08:18','2025-09-08 09:08:18'),(348,'admin',32,'new_request','New Document Request','Josh Mojica submitted a new Cedula request (CED-2025-000002)','{\"request_id\":165,\"request_number\":\"CED-2025-000002\",\"document_type\":\"Cedula\",\"client_name\":\"Josh Mojica\",\"priority\":\"normal\",\"admin_id\":32,\"admin_username\":\"admin12345\"}','normal',1,'2025-09-17 17:28:20','2025-09-08 09:28:05','2025-09-17 17:28:20'),(349,'admin',34,'new_request','New Document Request','Josh Mojica submitted a new Cedula request (CED-2025-000002)','{\"request_id\":165,\"request_number\":\"CED-2025-000002\",\"document_type\":\"Cedula\",\"client_name\":\"Josh Mojica\",\"priority\":\"normal\",\"admin_id\":34,\"admin_username\":\"mark12345\"}','normal',0,NULL,'2025-09-08 09:28:05','2025-09-08 09:28:05'),(350,'admin',32,'new_request','New Document Request','Josh Mojica submitted a new Barangay Clearance request (BC-2025-000001)','{\"request_id\":166,\"request_number\":\"BC-2025-000001\",\"document_type\":\"Barangay Clearance\",\"client_name\":\"Josh Mojica\",\"priority\":\"normal\",\"admin_id\":32,\"admin_username\":\"admin12345\"}','normal',1,'2025-09-17 17:28:20','2025-09-08 09:29:06','2025-09-17 17:28:20'),(351,'admin',34,'new_request','New Document Request','Josh Mojica submitted a new Barangay Clearance request (BC-2025-000001)','{\"request_id\":166,\"request_number\":\"BC-2025-000001\",\"document_type\":\"Barangay Clearance\",\"client_name\":\"Josh Mojica\",\"priority\":\"normal\",\"admin_id\":34,\"admin_username\":\"mark12345\"}','normal',0,NULL,'2025-09-08 09:29:06','2025-09-08 09:29:06'),(352,'admin',32,'request_cancelled','Document Request Cancelled','Josh Mojica cancelled their Barangay Clearance request (BC-2025-000001) - Reason: I am not available in gensan so I cancel it','{\"request_id\":166,\"request_number\":\"BC-2025-000001\",\"document_type\":\"Barangay Clearance\",\"client_id\":32,\"client_name\":\"Josh Mojica\",\"old_status\":\"pending\",\"new_status\":\"cancelled\",\"cancellation_reason\":\"I am not available in gensan so I cancel it\",\"cancelled_at\":\"2025-09-08T09:30:08.144Z\",\"admin_id\":32,\"admin_username\":\"admin12345\"}','normal',1,'2025-09-17 17:28:20','2025-09-08 09:30:08','2025-09-17 17:28:20'),(353,'admin',34,'request_cancelled','Document Request Cancelled','Josh Mojica cancelled their Barangay Clearance request (BC-2025-000001) - Reason: I am not available in gensan so I cancel it','{\"request_id\":166,\"request_number\":\"BC-2025-000001\",\"document_type\":\"Barangay Clearance\",\"client_id\":32,\"client_name\":\"Josh Mojica\",\"old_status\":\"pending\",\"new_status\":\"cancelled\",\"cancellation_reason\":\"I am not available in gensan so I cancel it\",\"cancelled_at\":\"2025-09-08T09:30:08.173Z\",\"admin_id\":34,\"admin_username\":\"mark12345\"}','normal',0,NULL,'2025-09-08 09:30:08','2025-09-08 09:30:08'),(354,'admin',NULL,'new_client_registration','New Client Registration','Floy Areliano (ailuzuriaga14@gmail.com) has registered and needs residency verification.','{\"client_id\":49,\"client_name\":\"Floy Areliano\",\"client_email\":\"ailuzuriaga14@gmail.com\",\"client_username\":\"floy1414\",\"registration_date\":\"2025-09-16T04:49:27.706Z\"}','normal',1,'2025-09-17 17:28:20','2025-09-16 04:49:27','2025-09-17 17:28:20'),(355,'client',49,'residency_approved','Residency Verification Approved','Your residency verification has been approved. You can now request documents.','{\"account_id\":49,\"approved_by\":32,\"approved_at\":\"2025-09-16T04:51:37.505Z\"}','high',0,NULL,'2025-09-16 04:51:37','2025-09-16 04:51:37'),(356,'admin',32,'new_request','New Document Request','Floy Areliano submitted a new Barangay Clearance request (BC-2025-000002)','{\"request_id\":167,\"request_number\":\"BC-2025-000002\",\"document_type\":\"Barangay Clearance\",\"client_name\":\"Floy Areliano\",\"priority\":\"normal\",\"admin_id\":32,\"admin_username\":\"admin12345\"}','normal',1,'2025-09-17 17:28:20','2025-09-16 09:22:47','2025-09-17 17:28:20'),(357,'admin',34,'new_request','New Document Request','Floy Areliano submitted a new Barangay Clearance request (BC-2025-000002)','{\"request_id\":167,\"request_number\":\"BC-2025-000002\",\"document_type\":\"Barangay Clearance\",\"client_name\":\"Floy Areliano\",\"priority\":\"normal\",\"admin_id\":34,\"admin_username\":\"mark12345\"}','normal',0,NULL,'2025-09-16 09:22:47','2025-09-16 09:22:47'),(358,'admin',32,'new_request','New Document Request','Jerome Revo submitted a new Barangay Clearance request (BC-2025-000003)','{\"request_id\":169,\"request_number\":\"BC-2025-000003\",\"document_type\":\"Barangay Clearance\",\"client_name\":\"Jerome Revo\",\"priority\":\"normal\",\"admin_id\":32,\"admin_username\":\"admin12345\"}','normal',1,'2025-09-17 17:28:20','2025-09-16 09:37:48','2025-09-17 17:28:20'),(359,'admin',34,'new_request','New Document Request','Jerome Revo submitted a new Barangay Clearance request (BC-2025-000003)','{\"request_id\":169,\"request_number\":\"BC-2025-000003\",\"document_type\":\"Barangay Clearance\",\"client_name\":\"Jerome Revo\",\"priority\":\"normal\",\"admin_id\":34,\"admin_username\":\"mark12345\"}','normal',0,NULL,'2025-09-16 09:37:48','2025-09-16 09:37:48'),(360,'admin',32,'new_request','New Document Request','Jerome Revo submitted a new Barangay Clearance request (BC-2025-000004)','{\"request_id\":170,\"request_number\":\"BC-2025-000004\",\"document_type\":\"Barangay Clearance\",\"client_name\":\"Jerome Revo\",\"priority\":\"normal\",\"admin_id\":32,\"admin_username\":\"admin12345\"}','normal',1,'2025-09-17 17:28:20','2025-09-16 09:39:59','2025-09-17 17:28:20'),(361,'admin',34,'new_request','New Document Request','Jerome Revo submitted a new Barangay Clearance request (BC-2025-000004)','{\"request_id\":170,\"request_number\":\"BC-2025-000004\",\"document_type\":\"Barangay Clearance\",\"client_name\":\"Jerome Revo\",\"priority\":\"normal\",\"admin_id\":34,\"admin_username\":\"mark12345\"}','normal',0,NULL,'2025-09-16 09:39:59','2025-09-16 09:39:59'),(362,'admin',32,'new_request','New Document Request','Jerome Revo submitted a new Barangay Clearance request (BC-2025-000005)','{\"request_id\":171,\"request_number\":\"BC-2025-000005\",\"document_type\":\"Barangay Clearance\",\"client_name\":\"Jerome Revo\",\"priority\":\"normal\",\"admin_id\":32,\"admin_username\":\"admin12345\"}','normal',1,'2025-09-17 17:28:20','2025-09-16 09:50:18','2025-09-17 17:28:20'),(363,'admin',34,'new_request','New Document Request','Jerome Revo submitted a new Barangay Clearance request (BC-2025-000005)','{\"request_id\":171,\"request_number\":\"BC-2025-000005\",\"document_type\":\"Barangay Clearance\",\"client_name\":\"Jerome Revo\",\"priority\":\"normal\",\"admin_id\":34,\"admin_username\":\"mark12345\"}','normal',0,NULL,'2025-09-16 09:50:18','2025-09-16 09:50:18'),(364,'admin',32,'new_request','New Document Request','Jerome Revo submitted a new Barangay Clearance request (BC-2025-000006)','{\"request_id\":172,\"request_number\":\"BC-2025-000006\",\"document_type\":\"Barangay Clearance\",\"client_name\":\"Jerome Revo\",\"priority\":\"normal\",\"admin_id\":32,\"admin_username\":\"admin12345\"}','normal',1,'2025-09-17 17:28:20','2025-09-16 09:50:25','2025-09-17 17:28:20'),(365,'admin',34,'new_request','New Document Request','Jerome Revo submitted a new Barangay Clearance request (BC-2025-000006)','{\"request_id\":172,\"request_number\":\"BC-2025-000006\",\"document_type\":\"Barangay Clearance\",\"client_name\":\"Jerome Revo\",\"priority\":\"normal\",\"admin_id\":34,\"admin_username\":\"mark12345\"}','normal',0,NULL,'2025-09-16 09:50:25','2025-09-16 09:50:25'),(366,'admin',32,'new_request','New Document Request','Floy Areliano submitted a new Barangay Clearance request (BC-2025-000001)','{\"request_id\":173,\"request_number\":\"BC-2025-000001\",\"document_type\":\"Barangay Clearance\",\"client_name\":\"Floy Areliano\",\"priority\":\"normal\",\"admin_id\":32,\"admin_username\":\"admin12345\"}','normal',1,'2025-09-17 17:28:20','2025-09-16 09:57:03','2025-09-17 17:28:20'),(367,'admin',34,'new_request','New Document Request','Floy Areliano submitted a new Barangay Clearance request (BC-2025-000001)','{\"request_id\":173,\"request_number\":\"BC-2025-000001\",\"document_type\":\"Barangay Clearance\",\"client_name\":\"Floy Areliano\",\"priority\":\"normal\",\"admin_id\":34,\"admin_username\":\"mark12345\"}','normal',0,NULL,'2025-09-16 09:57:03','2025-09-16 09:57:03'),(368,'admin',32,'new_request','New Document Request','Floy Areliano submitted a new Barangay Clearance request (BC-2025-000001)','{\"request_id\":174,\"request_number\":\"BC-2025-000001\",\"document_type\":\"Barangay Clearance\",\"client_name\":\"Floy Areliano\",\"priority\":\"normal\",\"admin_id\":32,\"admin_username\":\"admin12345\"}','normal',1,'2025-09-17 17:28:20','2025-09-16 10:06:10','2025-09-17 17:28:20'),(369,'admin',34,'new_request','New Document Request','Floy Areliano submitted a new Barangay Clearance request (BC-2025-000001)','{\"request_id\":174,\"request_number\":\"BC-2025-000001\",\"document_type\":\"Barangay Clearance\",\"client_name\":\"Floy Areliano\",\"priority\":\"normal\",\"admin_id\":34,\"admin_username\":\"mark12345\"}','normal',0,NULL,'2025-09-16 10:06:10','2025-09-16 10:06:10'),(370,'admin',32,'new_request','New Document Request','Floy Areliano submitted a new Barangay Clearance request (BC-2025-000002)','{\"request_id\":175,\"request_number\":\"BC-2025-000002\",\"document_type\":\"Barangay Clearance\",\"client_name\":\"Floy Areliano\",\"priority\":\"normal\",\"admin_id\":32,\"admin_username\":\"admin12345\"}','normal',1,'2025-09-17 17:28:20','2025-09-16 10:08:25','2025-09-17 17:28:20'),(371,'admin',34,'new_request','New Document Request','Floy Areliano submitted a new Barangay Clearance request (BC-2025-000002)','{\"request_id\":175,\"request_number\":\"BC-2025-000002\",\"document_type\":\"Barangay Clearance\",\"client_name\":\"Floy Areliano\",\"priority\":\"normal\",\"admin_id\":34,\"admin_username\":\"mark12345\"}','normal',0,NULL,'2025-09-16 10:08:25','2025-09-16 10:08:25'),(372,'client',49,'status_change','Request Status Updated','Your Barangay Clearance request (BC-2025-000002) status has been updated to \"completed\"','{\"request_id\":175,\"request_number\":\"BC-2025-000002\",\"document_type\":\"Barangay Clearance\",\"old_status\":\"ready_for_pickup\",\"new_status\":\"completed\"}','normal',0,NULL,'2025-09-16 10:09:52','2025-09-16 10:09:52'),(373,'admin',32,'new_request','New Document Request','Floy Areliano submitted a new Barangay Clearance request (BC-2025-000001)','{\"request_id\":176,\"request_number\":\"BC-2025-000001\",\"document_type\":\"Barangay Clearance\",\"client_name\":\"Floy Areliano\",\"priority\":\"normal\",\"admin_id\":32,\"admin_username\":\"admin12345\"}','normal',1,'2025-09-17 17:28:20','2025-09-16 10:16:11','2025-09-17 17:28:20'),(374,'admin',34,'new_request','New Document Request','Floy Areliano submitted a new Barangay Clearance request (BC-2025-000001)','{\"request_id\":176,\"request_number\":\"BC-2025-000001\",\"document_type\":\"Barangay Clearance\",\"client_name\":\"Floy Areliano\",\"priority\":\"normal\",\"admin_id\":34,\"admin_username\":\"mark12345\"}','normal',0,NULL,'2025-09-16 10:16:11','2025-09-16 10:16:11'),(375,'admin',32,'new_request','New Document Request','Floy Areliano submitted a new Barangay Clearance request (BC-2025-000001)','{\"request_id\":177,\"request_number\":\"BC-2025-000001\",\"document_type\":\"Barangay Clearance\",\"client_name\":\"Floy Areliano\",\"priority\":\"normal\",\"admin_id\":32,\"admin_username\":\"admin12345\"}','normal',1,'2025-09-17 17:28:20','2025-09-16 10:28:07','2025-09-17 17:28:20'),(376,'admin',34,'new_request','New Document Request','Floy Areliano submitted a new Barangay Clearance request (BC-2025-000001)','{\"request_id\":177,\"request_number\":\"BC-2025-000001\",\"document_type\":\"Barangay Clearance\",\"client_name\":\"Floy Areliano\",\"priority\":\"normal\",\"admin_id\":34,\"admin_username\":\"mark12345\"}','normal',0,NULL,'2025-09-16 10:28:07','2025-09-16 10:28:07'),(377,'admin',32,'new_request','New Document Request','Floy Areliano submitted a new Barangay Clearance request (BC-2025-000001)','{\"request_id\":178,\"request_number\":\"BC-2025-000001\",\"document_type\":\"Barangay Clearance\",\"client_name\":\"Floy Areliano\",\"priority\":\"normal\",\"admin_id\":32,\"admin_username\":\"admin12345\"}','normal',1,'2025-09-17 17:28:20','2025-09-16 10:30:24','2025-09-17 17:28:20'),(378,'admin',34,'new_request','New Document Request','Floy Areliano submitted a new Barangay Clearance request (BC-2025-000001)','{\"request_id\":178,\"request_number\":\"BC-2025-000001\",\"document_type\":\"Barangay Clearance\",\"client_name\":\"Floy Areliano\",\"priority\":\"normal\",\"admin_id\":34,\"admin_username\":\"mark12345\"}','normal',0,NULL,'2025-09-16 10:30:24','2025-09-16 10:30:24'),(379,'admin',32,'new_request','New Document Request','Floy Areliano submitted a new Barangay Clearance request (BC-2025-000002)','{\"request_id\":179,\"request_number\":\"BC-2025-000002\",\"document_type\":\"Barangay Clearance\",\"client_name\":\"Floy Areliano\",\"priority\":\"normal\",\"admin_id\":32,\"admin_username\":\"admin12345\"}','normal',1,'2025-09-17 17:28:20','2025-09-16 10:30:28','2025-09-17 17:28:20'),(380,'admin',34,'new_request','New Document Request','Floy Areliano submitted a new Barangay Clearance request (BC-2025-000002)','{\"request_id\":179,\"request_number\":\"BC-2025-000002\",\"document_type\":\"Barangay Clearance\",\"client_name\":\"Floy Areliano\",\"priority\":\"normal\",\"admin_id\":34,\"admin_username\":\"mark12345\"}','normal',0,NULL,'2025-09-16 10:30:28','2025-09-16 10:30:28'),(381,'admin',32,'new_request','New Document Request','Floy Areliano submitted a new Barangay Clearance request (BC-2025-000001)','{\"request_id\":180,\"request_number\":\"BC-2025-000001\",\"document_type\":\"Barangay Clearance\",\"client_name\":\"Floy Areliano\",\"priority\":\"normal\",\"admin_id\":32,\"admin_username\":\"admin12345\"}','normal',1,'2025-09-17 17:28:20','2025-09-16 10:34:20','2025-09-17 17:28:20'),(382,'admin',34,'new_request','New Document Request','Floy Areliano submitted a new Barangay Clearance request (BC-2025-000001)','{\"request_id\":180,\"request_number\":\"BC-2025-000001\",\"document_type\":\"Barangay Clearance\",\"client_name\":\"Floy Areliano\",\"priority\":\"normal\",\"admin_id\":34,\"admin_username\":\"mark12345\"}','normal',0,NULL,'2025-09-16 10:34:21','2025-09-16 10:34:21'),(383,'admin',32,'new_request','New Document Request','Floy Areliano submitted a new Barangay Clearance request (BC-2025-000001)','{\"request_id\":181,\"request_number\":\"BC-2025-000001\",\"document_type\":\"Barangay Clearance\",\"client_name\":\"Floy Areliano\",\"priority\":\"normal\",\"admin_id\":32,\"admin_username\":\"admin12345\"}','normal',1,'2025-09-17 17:28:20','2025-09-16 10:43:15','2025-09-17 17:28:20'),(384,'admin',34,'new_request','New Document Request','Floy Areliano submitted a new Barangay Clearance request (BC-2025-000001)','{\"request_id\":181,\"request_number\":\"BC-2025-000001\",\"document_type\":\"Barangay Clearance\",\"client_name\":\"Floy Areliano\",\"priority\":\"normal\",\"admin_id\":34,\"admin_username\":\"mark12345\"}','normal',0,NULL,'2025-09-16 10:43:15','2025-09-16 10:43:15'),(385,'client',49,'status_change','Request Status Updated','Your Barangay Clearance request (BC-2025-000001) status has been updated to \"approved\"','{\"request_id\":181,\"request_number\":\"BC-2025-000001\",\"document_type\":\"Barangay Clearance\",\"old_status\":\"pending\",\"new_status\":\"approved\"}','normal',0,NULL,'2025-09-16 10:43:37','2025-09-16 10:43:37'),(386,'admin',32,'new_request','New Document Request','Floy Areliano submitted a new Barangay Clearance request (BC-2025-000001)','{\"request_id\":182,\"request_number\":\"BC-2025-000001\",\"document_type\":\"Barangay Clearance\",\"client_name\":\"Floy Areliano\",\"priority\":\"normal\",\"admin_id\":32,\"admin_username\":\"admin12345\"}','normal',1,'2025-09-17 17:28:20','2025-09-16 10:46:18','2025-09-17 17:28:20'),(387,'admin',34,'new_request','New Document Request','Floy Areliano submitted a new Barangay Clearance request (BC-2025-000001)','{\"request_id\":182,\"request_number\":\"BC-2025-000001\",\"document_type\":\"Barangay Clearance\",\"client_name\":\"Floy Areliano\",\"priority\":\"normal\",\"admin_id\":34,\"admin_username\":\"mark12345\"}','normal',0,NULL,'2025-09-16 10:46:18','2025-09-16 10:46:18'),(388,'admin',32,'new_request','New Document Request','Floy Areliano submitted a new Barangay Clearance request (BC-2025-000001)','{\"request_id\":183,\"request_number\":\"BC-2025-000001\",\"document_type\":\"Barangay Clearance\",\"client_name\":\"Floy Areliano\",\"priority\":\"normal\",\"admin_id\":32,\"admin_username\":\"admin12345\"}','normal',1,'2025-09-17 17:28:20','2025-09-16 10:55:23','2025-09-17 17:28:20'),(389,'admin',34,'new_request','New Document Request','Floy Areliano submitted a new Barangay Clearance request (BC-2025-000001)','{\"request_id\":183,\"request_number\":\"BC-2025-000001\",\"document_type\":\"Barangay Clearance\",\"client_name\":\"Floy Areliano\",\"priority\":\"normal\",\"admin_id\":34,\"admin_username\":\"mark12345\"}','normal',0,NULL,'2025-09-16 10:55:23','2025-09-16 10:55:23'),(390,'client',49,'status_change','Request Status Updated','Your Barangay Clearance request (BC-2025-000001) status has been updated to \"approved\"','{\"request_id\":183,\"request_number\":\"BC-2025-000001\",\"document_type\":\"Barangay Clearance\",\"old_status\":\"pending\",\"new_status\":\"approved\"}','normal',0,NULL,'2025-09-16 10:57:21','2025-09-16 10:57:21'),(391,'admin',NULL,'new_client_registration','New Client Registration','Rhaijana Abdilah (2022_cete_abdilahrt@online.htcgsc.edu.ph) has registered and needs residency verification.','{\"client_id\":58,\"client_name\":\"Rhaijana Abdilah\",\"client_email\":\"2022_cete_abdilahrt@online.htcgsc.edu.ph\",\"client_username\":\"Rhaijana\",\"registration_date\":\"2025-09-16T13:42:08.940Z\"}','normal',1,'2025-09-17 17:28:20','2025-09-16 13:42:08','2025-09-17 17:28:20'),(392,'client',58,'residency_approved','Residency Verification Approved','Your residency verification has been approved. You can now request documents.','{\"account_id\":58,\"approved_by\":32,\"approved_at\":\"2025-09-16T13:43:04.448Z\"}','high',0,NULL,'2025-09-16 13:43:04','2025-09-16 13:43:04'),(393,'admin',32,'new_request','New Document Request','Rhaijana Abdilah submitted a new Barangay Clearance request (BC-2025-000002)','{\"request_id\":188,\"request_number\":\"BC-2025-000002\",\"document_type\":\"Barangay Clearance\",\"client_name\":\"Rhaijana Abdilah\",\"priority\":\"normal\",\"admin_id\":32,\"admin_username\":\"admin12345\"}','normal',1,'2025-09-17 17:28:20','2025-09-16 13:57:57','2025-09-17 17:28:20'),(394,'admin',34,'new_request','New Document Request','Rhaijana Abdilah submitted a new Barangay Clearance request (BC-2025-000002)','{\"request_id\":188,\"request_number\":\"BC-2025-000002\",\"document_type\":\"Barangay Clearance\",\"client_name\":\"Rhaijana Abdilah\",\"priority\":\"normal\",\"admin_id\":34,\"admin_username\":\"mark12345\"}','normal',0,NULL,'2025-09-16 13:57:57','2025-09-16 13:57:57'),(395,'client',58,'status_change','Request Status Updated','Your Barangay Clearance request (BC-2025-000002) status has been updated to \"approved\"','{\"request_id\":188,\"request_number\":\"BC-2025-000002\",\"document_type\":\"Barangay Clearance\",\"old_status\":\"pending\",\"new_status\":\"approved\"}','normal',0,NULL,'2025-09-16 13:59:09','2025-09-16 13:59:09'),(396,'admin',NULL,'new_client_registration','New Client Registration','Rhaijana Abdilah (rhaijanaabdilah@gmail.com) has registered and needs residency verification.','{\"client_id\":59,\"client_name\":\"Rhaijana Abdilah\",\"client_email\":\"rhaijanaabdilah@gmail.com\",\"client_username\":\"Rhaijana\",\"registration_date\":\"2025-09-16T15:27:34.665Z\"}','normal',1,'2025-09-17 17:28:20','2025-09-16 15:27:34','2025-09-17 17:28:20'),(397,'client',59,'residency_approved','Residency Verification Approved','Your residency verification has been approved. You can now request documents.','{\"account_id\":59,\"approved_by\":32,\"approved_at\":\"2025-09-16T15:28:30.027Z\"}','high',0,NULL,'2025-09-16 15:28:30','2025-09-16 15:28:30'),(398,'admin',32,'new_request','New Document Request','Rhaijana Abdilah submitted a new Cedula request (CED-2025-000001)','{\"request_id\":189,\"request_number\":\"CED-2025-000001\",\"document_type\":\"Cedula\",\"client_name\":\"Rhaijana Abdilah\",\"priority\":\"normal\",\"admin_id\":32,\"admin_username\":\"admin12345\"}','normal',1,'2025-09-17 17:28:20','2025-09-16 15:33:09','2025-09-17 17:28:20'),(399,'admin',34,'new_request','New Document Request','Rhaijana Abdilah submitted a new Cedula request (CED-2025-000001)','{\"request_id\":189,\"request_number\":\"CED-2025-000001\",\"document_type\":\"Cedula\",\"client_name\":\"Rhaijana Abdilah\",\"priority\":\"normal\",\"admin_id\":34,\"admin_username\":\"mark12345\"}','normal',0,NULL,'2025-09-16 15:33:10','2025-09-16 15:33:10'),(400,'client',59,'status_change','Request Status Updated','Your Cedula request (CED-2025-000001) status has been updated to \"approved\"','{\"request_id\":189,\"request_number\":\"CED-2025-000001\",\"document_type\":\"Cedula\",\"old_status\":\"pending\",\"new_status\":\"approved\"}','normal',0,NULL,'2025-09-16 15:33:58','2025-09-16 15:33:58'),(401,'client',59,'status_change','Request Status Updated','Your Cedula request (CED-2025-000001) status has been updated to \"approved\"','{\"request_id\":189,\"request_number\":\"CED-2025-000001\",\"document_type\":\"Cedula\",\"old_status\":\"pending\",\"new_status\":\"approved\"}','normal',0,NULL,'2025-09-16 15:34:00','2025-09-16 15:34:00'),(402,'admin',32,'new_request','New Document Request','Rhaijana Abdilah submitted a new Barangay Clearance request (BC-2025-000001)','{\"request_id\":190,\"request_number\":\"BC-2025-000001\",\"document_type\":\"Barangay Clearance\",\"client_name\":\"Rhaijana Abdilah\",\"priority\":\"normal\",\"admin_id\":32,\"admin_username\":\"admin12345\"}','normal',1,'2025-09-17 17:28:20','2025-09-16 15:38:03','2025-09-17 17:28:20'),(403,'admin',34,'new_request','New Document Request','Rhaijana Abdilah submitted a new Barangay Clearance request (BC-2025-000001)','{\"request_id\":190,\"request_number\":\"BC-2025-000001\",\"document_type\":\"Barangay Clearance\",\"client_name\":\"Rhaijana Abdilah\",\"priority\":\"normal\",\"admin_id\":34,\"admin_username\":\"mark12345\"}','normal',0,NULL,'2025-09-16 15:38:03','2025-09-16 15:38:03'),(404,'client',59,'status_change','Request Status Updated','Your Barangay Clearance request (BC-2025-000001) status has been updated to \"approved\"','{\"request_id\":190,\"request_number\":\"BC-2025-000001\",\"document_type\":\"Barangay Clearance\",\"old_status\":\"pending\",\"new_status\":\"approved\"}','normal',0,NULL,'2025-09-16 15:38:46','2025-09-16 15:38:46'),(405,'admin',32,'payment_confirmed','Payment Confirmed','Payment confirmed for Barangay Clearance request #BC-2025-000001 by Rhaijana Abdilah','{\"request_id\":190,\"request_number\":\"BC-2025-000001\",\"document_type\":\"Barangay Clearance\",\"client_name\":\"Rhaijana Abdilah\",\"amount\":150,\"payment_id\":\"pay_x4UxB1seK9oo8iwyxqEvtQLd\",\"status\":\"paid\"}','high',1,'2025-09-17 17:28:20','2025-09-16 16:03:39','2025-09-17 17:28:20'),(406,'admin',34,'payment_confirmed','Payment Confirmed','Payment confirmed for Barangay Clearance request #BC-2025-000001 by Rhaijana Abdilah','{\"request_id\":190,\"request_number\":\"BC-2025-000001\",\"document_type\":\"Barangay Clearance\",\"client_name\":\"Rhaijana Abdilah\",\"amount\":150,\"payment_id\":\"pay_x4UxB1seK9oo8iwyxqEvtQLd\",\"status\":\"paid\"}','high',0,NULL,'2025-09-16 16:03:39','2025-09-16 16:03:39'),(407,'admin',32,'payment_confirmed','Payment Confirmed','Payment confirmed for Barangay Clearance request #BC-2025-000001 by Rhaijana Abdilah','{\"request_id\":190,\"request_number\":\"BC-2025-000001\",\"document_type\":\"Barangay Clearance\",\"client_name\":\"Rhaijana Abdilah\",\"amount\":150,\"payment_id\":\"link_6o1v8V5u8dB1x9wqzxbFC6MV\",\"status\":\"paid\"}','high',1,'2025-09-17 17:28:20','2025-09-16 16:03:40','2025-09-17 17:28:20'),(408,'admin',34,'payment_confirmed','Payment Confirmed','Payment confirmed for Barangay Clearance request #BC-2025-000001 by Rhaijana Abdilah','{\"request_id\":190,\"request_number\":\"BC-2025-000001\",\"document_type\":\"Barangay Clearance\",\"client_name\":\"Rhaijana Abdilah\",\"amount\":150,\"payment_id\":\"link_6o1v8V5u8dB1x9wqzxbFC6MV\",\"status\":\"paid\"}','high',0,NULL,'2025-09-16 16:03:40','2025-09-16 16:03:40'),(409,'client',59,'status_change','Request Status Updated','Your Barangay Clearance request (BC-2025-000001) status has been updated to \"processing\"','{\"request_id\":190,\"request_number\":\"BC-2025-000001\",\"document_type\":\"Barangay Clearance\",\"old_status\":\"payment_confirmed\",\"new_status\":\"processing\"}','high',0,NULL,'2025-09-16 16:04:10','2025-09-16 16:04:10'),(410,'client',59,'status_change','Request Status Updated','Your Barangay Clearance request (BC-2025-000001) status has been updated to \"ready_for_pickup\"','{\"request_id\":190,\"request_number\":\"BC-2025-000001\",\"document_type\":\"Barangay Clearance\",\"old_status\":\"processing\",\"new_status\":\"ready_for_pickup\"}','normal',0,NULL,'2025-09-16 16:04:59','2025-09-16 16:04:59'),(411,'client',59,'status_change','Request Status Updated','Your Barangay Clearance request (BC-2025-000001) status has been updated to \"completed\"','{\"request_id\":190,\"request_number\":\"BC-2025-000001\",\"document_type\":\"Barangay Clearance\",\"old_status\":\"ready_for_pickup\",\"new_status\":\"completed\"}','normal',1,'2025-09-17 10:52:45','2025-09-16 16:06:06','2025-09-17 10:52:45'),(412,'admin',NULL,'new_client_registration','New Client Registration','Kris Barbosa (cadyscience12@gmail.com) has registered and needs residency verification.','{\"client_id\":60,\"client_name\":\"Kris Barbosa\",\"client_email\":\"cadyscience12@gmail.com\",\"client_username\":\"cady3414\",\"registration_date\":\"2025-09-17T15:56:55.285Z\"}','normal',1,'2025-09-17 17:28:20','2025-09-17 15:56:55','2025-09-17 17:28:20'),(413,'client',60,'residency_approved','Residency Verification Approved','Your residency verification has been approved. You can now request documents.','{\"account_id\":60,\"approved_by\":32,\"approved_at\":\"2025-09-17T15:58:50.898Z\"}','high',0,NULL,'2025-09-17 15:58:50','2025-09-17 15:58:50'),(414,'admin',32,'new_request','New Document Request','Kris Barbosa submitted a new Cedula request (CED-2025-000002)','{\"request_id\":191,\"request_number\":\"CED-2025-000002\",\"document_type\":\"Cedula\",\"client_name\":\"Kris Barbosa\",\"priority\":\"normal\",\"admin_id\":32,\"admin_username\":\"admin12345\"}','normal',1,'2025-09-17 17:28:20','2025-09-17 16:02:28','2025-09-17 17:28:20'),(415,'admin',34,'new_request','New Document Request','Kris Barbosa submitted a new Cedula request (CED-2025-000002)','{\"request_id\":191,\"request_number\":\"CED-2025-000002\",\"document_type\":\"Cedula\",\"client_name\":\"Kris Barbosa\",\"priority\":\"normal\",\"admin_id\":34,\"admin_username\":\"mark12345\"}','normal',0,NULL,'2025-09-17 16:02:28','2025-09-17 16:02:28'),(416,'client',60,'status_change','Request Status Updated','Your Cedula request (CED-2025-000002) status has been updated to \"approved\"','{\"request_id\":191,\"request_number\":\"CED-2025-000002\",\"document_type\":\"Cedula\",\"old_status\":\"pending\",\"new_status\":\"approved\"}','normal',0,NULL,'2025-09-17 16:03:32','2025-09-17 16:03:32'),(417,'client',60,'status_change','Request Status Updated','Your Cedula request (CED-2025-000002) status has been updated to \"processing\"','{\"request_id\":191,\"request_number\":\"CED-2025-000002\",\"document_type\":\"Cedula\",\"old_status\":\"approved\",\"new_status\":\"processing\"}','high',0,NULL,'2025-09-17 17:12:00','2025-09-17 17:12:00'),(418,'client',60,'status_change','Request Status Updated','Your Cedula request (CED-2025-000002) status has been updated to \"ready_for_pickup\"','{\"request_id\":191,\"request_number\":\"CED-2025-000002\",\"document_type\":\"Cedula\",\"old_status\":\"processing\",\"new_status\":\"ready_for_pickup\"}','normal',0,NULL,'2025-09-17 17:15:17','2025-09-17 17:15:17'),(419,'client',60,'status_change','Request Status Updated','Your Cedula request (CED-2025-000002) status has been updated to \"completed\"','{\"request_id\":191,\"request_number\":\"CED-2025-000002\",\"document_type\":\"Cedula\",\"old_status\":\"ready_for_pickup\",\"new_status\":\"completed\"}','normal',0,NULL,'2025-09-17 17:16:19','2025-09-17 17:16:19'),(420,'admin',NULL,'new_client_registration','New Client Registration','Thea Sy (gemmaford605@gmail.com) has registered and needs residency verification.','{\"client_id\":69,\"client_name\":\"Thea Sy\",\"client_email\":\"gemmaford605@gmail.com\",\"client_username\":\"thea11111\",\"registration_date\":\"2025-09-17T20:19:33.271Z\"}','normal',1,'2025-09-19 01:48:36','2025-09-17 20:19:33','2025-09-19 01:48:36'),(421,'client',69,'residency_approved','Residency Verification Approved','Your residency verification has been approved. You can now request documents.','{\"account_id\":69,\"approved_by\":32,\"approved_at\":\"2025-09-19T01:49:02.065Z\"}','high',0,NULL,'2025-09-19 01:49:02','2025-09-19 01:49:02'),(422,'client',59,'status_change','Request Status Updated','Your Cedula request (CED-2025-000001) status has been updated to \"payment_confirmed\"','{\"request_id\":189,\"request_number\":\"CED-2025-000001\",\"document_type\":\"Cedula\",\"old_status\":\"approved\",\"new_status\":\"payment_confirmed\"}','normal',0,NULL,'2025-09-29 16:33:32','2025-09-29 16:33:32'),(423,'client',59,'status_change','Request Status Updated','Your Barangay Clearance request (BC-2025-000001) status has been updated to \"processing\"','{\"request_id\":190,\"request_number\":\"BC-2025-000001\",\"document_type\":\"Barangay Clearance\",\"old_status\":\"payment_confirmed\",\"new_status\":\"processing\"}','high',0,NULL,'2025-09-29 16:34:04','2025-09-29 16:34:04'),(424,'client',59,'status_change','Request Status Updated','Your Barangay Clearance request (BC-2025-000001) status has been updated to \"ready_for_pickup\"','{\"request_id\":190,\"request_number\":\"BC-2025-000001\",\"document_type\":\"Barangay Clearance\",\"old_status\":\"processing\",\"new_status\":\"ready_for_pickup\"}','normal',0,NULL,'2025-09-29 16:34:31','2025-09-29 16:34:31'),(425,'client',59,'status_change','Request Status Updated','Your Barangay Clearance request (BC-2025-000001) status has been updated to \"completed\"','{\"request_id\":190,\"request_number\":\"BC-2025-000001\",\"document_type\":\"Barangay Clearance\",\"old_status\":\"ready_for_pickup\",\"new_status\":\"completed\"}','normal',0,NULL,'2025-09-29 16:34:55','2025-09-29 16:34:55'),(426,'client',70,'residency_approved','Residency Verification Approved','Your residency verification has been approved. You can now request documents.','{\"account_id\":70,\"approved_by\":32,\"approved_at\":\"2025-09-30T03:57:29.994Z\"}','high',0,NULL,'2025-09-30 03:57:30','2025-09-30 03:57:30'),(427,'admin',32,'new_request','New Document Request','Eva Chua submitted a new Cedula request (CED-2025-000003)','{\"request_id\":192,\"request_number\":\"CED-2025-000003\",\"document_type\":\"Cedula\",\"client_name\":\"Eva Chua\",\"priority\":\"normal\",\"admin_id\":32,\"admin_username\":\"admin12345\"}','normal',1,'2025-09-30 04:40:50','2025-09-30 04:01:13','2025-09-30 04:40:50'),(428,'admin',34,'new_request','New Document Request','Eva Chua submitted a new Cedula request (CED-2025-000003)','{\"request_id\":192,\"request_number\":\"CED-2025-000003\",\"document_type\":\"Cedula\",\"client_name\":\"Eva Chua\",\"priority\":\"normal\",\"admin_id\":34,\"admin_username\":\"mark12345\"}','normal',0,NULL,'2025-09-30 04:01:13','2025-09-30 04:01:13'),(429,'client',70,'status_change','Request Status Updated','Your Cedula request (CED-2025-000003) status has been updated to \"cancelled\"','{\"request_id\":192,\"request_number\":\"CED-2025-000003\",\"document_type\":\"Cedula\",\"old_status\":\"pending\",\"new_status\":\"cancelled\"}','normal',0,NULL,'2025-09-30 04:03:47','2025-09-30 04:03:47'),(430,'admin',32,'new_request','New Document Request','Eva Chua submitted a new Cedula request (CED-2025-000003)','{\"request_id\":193,\"request_number\":\"CED-2025-000003\",\"document_type\":\"Cedula\",\"client_name\":\"Eva Chua\",\"priority\":\"normal\",\"admin_id\":32,\"admin_username\":\"admin12345\"}','normal',1,'2025-09-30 04:40:50','2025-09-30 04:06:04','2025-09-30 04:40:50'),(431,'admin',34,'new_request','New Document Request','Eva Chua submitted a new Cedula request (CED-2025-000003)','{\"request_id\":193,\"request_number\":\"CED-2025-000003\",\"document_type\":\"Cedula\",\"client_name\":\"Eva Chua\",\"priority\":\"normal\",\"admin_id\":34,\"admin_username\":\"mark12345\"}','normal',0,NULL,'2025-09-30 04:06:04','2025-09-30 04:06:04'),(432,'client',70,'status_change','Request Status Updated','Your Cedula request (CED-2025-000003) status has been updated to \"approved\"','{\"request_id\":193,\"request_number\":\"CED-2025-000003\",\"document_type\":\"Cedula\",\"old_status\":\"pending\",\"new_status\":\"approved\"}','normal',0,NULL,'2025-09-30 04:08:28','2025-09-30 04:08:28'),(433,'admin',32,'payment_failed','Payment Failed','Payment failed for Cedula request #CED-2025-000003 by Eva Chua','{\"request_id\":193,\"request_number\":\"CED-2025-000003\",\"document_type\":\"Cedula\",\"client_name\":\"Eva Chua\",\"amount\":100,\"payment_id\":\"pay_sPF7zpNyR9LjSW6aEcepFrQd\",\"status\":\"paid\"}','normal',1,'2025-09-30 04:40:50','2025-09-30 04:09:32','2025-09-30 04:40:50'),(434,'admin',34,'payment_failed','Payment Failed','Payment failed for Cedula request #CED-2025-000003 by Eva Chua','{\"request_id\":193,\"request_number\":\"CED-2025-000003\",\"document_type\":\"Cedula\",\"client_name\":\"Eva Chua\",\"amount\":100,\"payment_id\":\"pay_sPF7zpNyR9LjSW6aEcepFrQd\",\"status\":\"paid\"}','normal',0,NULL,'2025-09-30 04:09:32','2025-09-30 04:09:32'),(435,'admin',32,'payment_failed','Payment Failed','Payment failed for Cedula request #CED-2025-000003 by Eva Chua','{\"request_id\":193,\"request_number\":\"CED-2025-000003\",\"document_type\":\"Cedula\",\"client_name\":\"Eva Chua\",\"amount\":100,\"payment_id\":\"link_YzkuwRuNMTxuDifRc3jr6cVz\",\"status\":\"paid\"}','normal',1,'2025-09-30 04:40:50','2025-09-30 04:09:32','2025-09-30 04:40:50'),(436,'admin',34,'payment_failed','Payment Failed','Payment failed for Cedula request #CED-2025-000003 by Eva Chua','{\"request_id\":193,\"request_number\":\"CED-2025-000003\",\"document_type\":\"Cedula\",\"client_name\":\"Eva Chua\",\"amount\":100,\"payment_id\":\"link_YzkuwRuNMTxuDifRc3jr6cVz\",\"status\":\"paid\"}','normal',0,NULL,'2025-09-30 04:09:32','2025-09-30 04:09:32'),(437,'client',70,'status_change','Request Status Updated','Your Cedula request (CED-2025-000003) status has been updated to \"processing\"','{\"request_id\":193,\"request_number\":\"CED-2025-000003\",\"document_type\":\"Cedula\",\"old_status\":\"payment_confirmed\",\"new_status\":\"processing\"}','high',0,NULL,'2025-09-30 04:10:29','2025-09-30 04:10:29'),(438,'client',70,'status_change','Request Status Updated','Your Cedula request (CED-2025-000003) status has been updated to \"ready_for_pickup\"','{\"request_id\":193,\"request_number\":\"CED-2025-000003\",\"document_type\":\"Cedula\",\"old_status\":\"processing\",\"new_status\":\"ready_for_pickup\"}','normal',0,NULL,'2025-09-30 04:10:49','2025-09-30 04:10:49'),(439,'client',70,'status_change','Request Status Updated','Your Cedula request (CED-2025-000003) status has been updated to \"completed\"','{\"request_id\":193,\"request_number\":\"CED-2025-000003\",\"document_type\":\"Cedula\",\"old_status\":\"ready_for_pickup\",\"new_status\":\"completed\"}','normal',0,NULL,'2025-09-30 04:11:02','2025-09-30 04:11:02'),(440,'admin',NULL,'new_client_registration','New Client Registration','Danny Esco (torukamiya1@gmail.com) has registered and needs residency verification.','{\"client_id\":76,\"client_name\":\"Danny Esco\",\"client_email\":\"torukamiya1@gmail.com\",\"client_username\":\"kloykloy22\",\"registration_date\":\"2025-09-30T11:04:07.414Z\"}','normal',0,NULL,'2025-09-30 11:04:07','2025-09-30 11:04:07'),(441,'admin',NULL,'new_client_registration','New Client Registration','kristle Chua (torukamiya1@gmail.com) has registered and needs residency verification.','{\"client_id\":77,\"client_name\":\"kristle Chua\",\"client_email\":\"torukamiya1@gmail.com\",\"client_username\":\"kristle11\",\"registration_date\":\"2025-09-30T11:17:18.508Z\"}','normal',0,NULL,'2025-09-30 11:17:18','2025-09-30 11:17:18'),(442,'admin',NULL,'new_client_registration','New Client Registration','kristle Chua (torukamiya1@gmail.com) has registered and needs residency verification.','{\"client_id\":78,\"client_name\":\"kristle Chua\",\"client_email\":\"torukamiya1@gmail.com\",\"client_username\":\"kristle11\",\"registration_date\":\"2025-09-30T11:35:34.899Z\"}','normal',0,NULL,'2025-09-30 11:35:34','2025-09-30 11:35:34'),(443,'admin',NULL,'new_client_registration','New Client Registration','George Grandia (torukamiya1@gmail.com) has registered and needs residency verification.','{\"client_id\":79,\"client_name\":\"George Grandia\",\"client_email\":\"torukamiya1@gmail.com\",\"client_username\":\"george12\",\"registration_date\":\"2025-09-30T11:39:46.930Z\"}','normal',0,NULL,'2025-09-30 11:39:46','2025-09-30 11:39:46');
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `otps`
--

DROP TABLE IF EXISTS `otps`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `otps` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) DEFAULT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `otp_code` varchar(10) NOT NULL,
  `delivery_method` enum('email','sms') DEFAULT 'email',
  `purpose` enum('registration','password_reset','email_verification','login') DEFAULT 'registration',
  `expires_at` datetime NOT NULL,
  `is_used` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_email_purpose` (`email`,`purpose`),
  KEY `idx_otp_code` (`otp_code`),
  KEY `idx_expires_at` (`expires_at`),
  KEY `idx_phone_purpose` (`phone_number`,`purpose`)
) ENGINE=InnoDB AUTO_INCREMENT=146 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `otps`
--

LOCK TABLES `otps` WRITE;
/*!40000 ALTER TABLE `otps` DISABLE KEYS */;
INSERT INTO `otps` VALUES (4,'charliemarion814@gmail.com',NULL,'438352','email','email_verification','2025-06-19 20:22:08',1,'2025-06-19 12:12:08','2025-06-19 12:12:33'),(27,'barangaybula45@gmail.com',NULL,'340158','email','registration','2025-06-22 22:31:25',1,'2025-06-22 14:21:25','2025-06-22 14:21:28'),(30,'e70319070@gmail.com',NULL,'897346','email','email_verification','2025-06-22 22:42:16',1,'2025-06-22 14:32:16','2025-06-22 14:32:34'),(33,'e70319070@gmail.com',NULL,'193441','email','registration','2025-06-23 02:08:10',1,'2025-06-22 17:58:10','2025-06-22 17:58:25'),(34,'e70319070@gmail.com',NULL,'944107','email','registration','2025-06-23 02:08:15',0,'2025-06-22 17:58:15','2025-06-22 17:58:15'),(44,'vcba.auth.gateway@gmail.com',NULL,'441449','email','registration','2025-07-07 22:06:41',0,'2025-07-07 13:56:41','2025-07-07 13:56:41'),(56,'test1752431165683@example.com',NULL,'253593','email','email_verification','2025-07-14 02:36:06',0,'2025-07-13 18:26:06','2025-07-13 18:26:06'),(57,'test1752431206511@example.com',NULL,'871741','email','email_verification','2025-07-14 02:36:46',0,'2025-07-13 18:26:46','2025-07-13 18:26:46'),(58,'test1752431235904@example.com',NULL,'599885','email','email_verification','2025-07-14 02:37:16',0,'2025-07-13 18:27:16','2025-07-13 18:27:16'),(66,'karolhealer@gmail.com',NULL,'838220','email','email_verification','2025-08-08 05:12:44',1,'2025-08-07 21:02:44','2025-08-07 21:04:37'),(67,'khhjg@gmail.com',NULL,'319890','email','email_verification','2025-08-08 07:37:20',1,'2025-08-07 23:27:20','2025-08-09 04:59:23'),(68,'brayanstone120@gmail.com',NULL,'840953','email','email_verification','2025-08-25 21:03:11',1,'2025-08-25 12:53:11','2025-08-25 12:54:52'),(69,'floy1414@gmail.com',NULL,'270861','email','email_verification','2025-09-16 12:57:13',0,'2025-09-16 04:47:13','2025-09-16 04:47:13'),(70,'ailuzuriaga14@gmail.com',NULL,'996793','email','email_verification','2025-09-16 12:58:52',1,'2025-09-16 04:48:52','2025-09-16 04:49:27'),(77,'2022_cete_abdilahrt@online.htcgsc.edu.ph',NULL,'987812','email','email_verification','2025-09-16 21:50:38',1,'2025-09-16 13:40:38','2025-09-16 13:42:08'),(78,'rhaijanaabdilah@gmail.com',NULL,'552413','email','email_verification','2025-09-16 23:36:00',1,'2025-09-16 15:26:00','2025-09-16 15:27:34'),(80,NULL,'+639526574063','658110','sms','registration','2025-09-18 00:47:48',0,'2025-09-17 16:37:48','2025-09-17 16:37:48'),(81,NULL,'09068295558','461202','sms','registration','2025-09-18 01:16:54',0,'2025-09-17 17:06:54','2025-09-17 17:06:54'),(82,NULL,'09068295558','652326','sms','registration','2025-09-18 01:18:24',0,'2025-09-17 17:08:24','2025-09-17 17:08:24'),(83,NULL,'+639068295558','663358','sms','registration','2025-09-18 01:20:05',0,'2025-09-17 17:10:05','2025-09-17 17:10:05'),(84,NULL,'639068295558','748440','sms','registration','2025-09-18 01:20:33',0,'2025-09-17 17:10:33','2025-09-17 17:10:33'),(97,NULL,'09507178723','733893','sms','registration','2025-09-18 03:24:55',0,'2025-09-17 19:14:55','2025-09-17 19:14:55'),(108,'test@example.com',NULL,'850736','email','registration','2025-09-18 04:21:56',1,'2025-09-17 20:11:56','2025-09-17 20:13:03'),(110,'test@example.com',NULL,'693048','email','registration','2025-09-18 04:23:03',0,'2025-09-17 20:13:03','2025-09-17 20:13:03'),(112,'gemmaford605@gmail.com',NULL,'606510','email','email_verification','2025-09-18 04:28:48',1,'2025-09-17 20:18:48','2025-09-17 20:19:33'),(113,'gemmaford605@gmail.com',NULL,'329714','email','registration','2025-09-18 04:29:02',0,'2025-09-17 20:19:02','2025-09-17 20:19:02'),(114,NULL,'09507173723','329714','sms','registration','2025-09-18 04:29:02',0,'2025-09-17 20:19:02','2025-09-17 20:19:02'),(122,'torukamiya1@gmail.com',NULL,'556137','email','registration','2025-09-30 18:29:43',0,'2025-09-30 10:19:43','2025-09-30 10:19:43'),(126,'torukamiya1@gmail.com',NULL,'042899','email','registration','2025-09-30 18:36:38',0,'2025-09-30 10:26:38','2025-09-30 10:26:38'),(127,NULL,'09955958358','042899','sms','registration','2025-09-30 18:36:38',0,'2025-09-30 10:26:38','2025-09-30 10:26:38'),(138,'torukamiya1@gmail.com',NULL,'840082','email','email_verification','2025-09-30 19:44:32',0,'2025-09-30 11:34:32','2025-09-30 11:34:32'),(139,NULL,'09955958358','840082','sms','email_verification','2025-09-30 19:44:32',0,'2025-09-30 11:34:32','2025-09-30 11:34:32'),(140,'torukamiya1@gmail.com',NULL,'662435','email','email_verification','2025-09-30 19:44:44',1,'2025-09-30 11:34:44','2025-09-30 11:35:34'),(141,NULL,'09955958358','662435','sms','email_verification','2025-09-30 19:44:44',0,'2025-09-30 11:34:44','2025-09-30 11:34:44'),(142,'torukamiya1@gmail.com',NULL,'682091','email','email_verification','2025-09-30 19:48:53',0,'2025-09-30 11:38:53','2025-09-30 11:38:53'),(143,NULL,'09955958358','682091','sms','email_verification','2025-09-30 19:48:53',0,'2025-09-30 11:38:53','2025-09-30 11:38:53'),(144,'torukamiya1@gmail.com',NULL,'038327','email','email_verification','2025-09-30 19:49:04',1,'2025-09-30 11:39:04','2025-09-30 11:39:46'),(145,NULL,'09955958358','038327','sms','email_verification','2025-09-30 19:49:04',0,'2025-09-30 11:39:04','2025-09-30 11:39:04');
/*!40000 ALTER TABLE `otps` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment_methods`
--

DROP TABLE IF EXISTS `payment_methods`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_methods` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `method_name` varchar(50) NOT NULL,
  `method_code` varchar(20) NOT NULL,
  `description` text DEFAULT NULL,
  `is_online` tinyint(1) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `processing_fee_percentage` decimal(5,2) DEFAULT 0.00,
  `processing_fee_fixed` decimal(10,2) DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `requires_verification` tinyint(1) DEFAULT 0 COMMENT 'Whether payment method requires manual verification',
  PRIMARY KEY (`id`),
  UNIQUE KEY `method_name` (`method_name`),
  UNIQUE KEY `method_code` (`method_code`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_methods`
--

LOCK TABLES `payment_methods` WRITE;
/*!40000 ALTER TABLE `payment_methods` DISABLE KEYS */;
INSERT INTO `payment_methods` VALUES (1,'Cash Payment','CASH','Pay in cash at barangay office',0,1,0.00,0.00,'2025-06-08 08:27:00',1),(2,'Online Payment Via PayMongo','PAYMONGO_CARD','Pay online using credit or debit card via PayMongo',1,1,3.50,15.00,'2025-06-08 08:27:00',0),(3,'PayMongo - GCash','PAYMONGO_GCASH','Pay using GCash via PayMongo',1,1,2.00,10.00,'2025-06-08 08:27:00',0),(4,'PayMongo - GrabPay','PAYMONGO_GRABPAY','Pay using GrabPay via PayMongo',1,1,2.00,10.00,'2025-06-08 08:27:00',0),(5,'PayMongo - PayMaya','PAYMONGO_PAYMAYA','Pay using PayMaya via PayMongo',1,1,2.00,10.00,'2025-06-08 08:27:00',0),(6,'PayMongo - Bank Transfer','PAYMONGO_BANK','Pay via online bank transfer through PayMongo',1,1,1.50,5.00,'2025-06-08 08:27:00',0);
/*!40000 ALTER TABLE `payment_methods` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment_transactions`
--

DROP TABLE IF EXISTS `payment_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `request_id` int(11) NOT NULL,
  `payment_method_id` int(11) NOT NULL,
  `transaction_id` varchar(100) NOT NULL,
  `external_transaction_id` varchar(100) DEFAULT NULL,
  `paymongo_payment_intent_id` varchar(100) DEFAULT NULL,
  `paymongo_payment_method_id` varchar(100) DEFAULT NULL,
  `paymongo_source_id` varchar(100) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `processing_fee` decimal(10,2) DEFAULT 0.00,
  `net_amount` decimal(10,2) NOT NULL,
  `currency` varchar(3) DEFAULT 'PHP',
  `status` enum('pending','processing','succeeded','failed','cancelled','refunded') DEFAULT 'pending',
  `failure_reason` text DEFAULT NULL,
  `payment_description` text DEFAULT NULL,
  `customer_email` varchar(100) DEFAULT NULL,
  `customer_phone` varchar(20) DEFAULT NULL,
  `webhook_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`webhook_data`)),
  `callback_url` varchar(500) DEFAULT NULL,
  `success_url` varchar(500) DEFAULT NULL,
  `cancel_url` varchar(500) DEFAULT NULL,
  `initiated_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `completed_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `verified_by` int(11) DEFAULT NULL COMMENT 'Admin who verified in-person payment',
  `verified_at` timestamp NULL DEFAULT NULL COMMENT 'When payment was verified',
  `receipt_number` varchar(100) DEFAULT NULL COMMENT 'Physical receipt number for cash payments',
  `verification_notes` text DEFAULT NULL COMMENT 'Additional notes from payment verification',
  PRIMARY KEY (`id`),
  UNIQUE KEY `transaction_id` (`transaction_id`),
  KEY `payment_method_id` (`payment_method_id`),
  KEY `idx_transaction_id` (`transaction_id`),
  KEY `idx_external_transaction_id` (`external_transaction_id`),
  KEY `idx_paymongo_payment_intent` (`paymongo_payment_intent_id`),
  KEY `idx_status` (`status`),
  KEY `idx_request_id` (`request_id`),
  KEY `idx_initiated_at` (`initiated_at`),
  KEY `idx_verified_by` (`verified_by`),
  KEY `idx_verified_at` (`verified_at`),
  KEY `idx_receipt_number` (`receipt_number`),
  CONSTRAINT `fk_payment_verified_by` FOREIGN KEY (`verified_by`) REFERENCES `admin_employee_accounts` (`id`),
  CONSTRAINT `payment_transactions_ibfk_1` FOREIGN KEY (`request_id`) REFERENCES `document_requests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `payment_transactions_ibfk_2` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=88 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_transactions`
--

LOCK TABLES `payment_transactions` WRITE;
/*!40000 ALTER TABLE `payment_transactions` DISABLE KEYS */;
INSERT INTO `payment_transactions` VALUES (86,190,2,'TXN_1758038561362_2682a2b0','link_6o1v8V5u8dB1x9wqzxbFC6MV','link_6o1v8V5u8dB1x9wqzxbFC6MV',NULL,NULL,150.00,0.00,150.00,'PHP','succeeded',NULL,'BOSFDR - Barangay Clearance Request #190','rhaijanaabdilah@gmail.com',NULL,'{\"id\":\"link_6o1v8V5u8dB1x9wqzxbFC6MV\",\"type\":\"link\",\"attributes\":{\"amount\":15000,\"archived\":false,\"currency\":\"PHP\",\"description\":\"BOSFDR - Barangay Clearance Request #190\",\"livemode\":false,\"fee\":375,\"remarks\":null,\"status\":\"paid\",\"tax_amount\":null,\"taxes\":[],\"checkout_url\":\"https://pm.link/org-barangay-bula/test/3gfr4zC\",\"reference_number\":\"3gfr4zC\",\"created_at\":1758038562,\"updated_at\":1758038562,\"payments\":[{\"data\":{\"id\":\"pay_x4UxB1seK9oo8iwyxqEvtQLd\",\"type\":\"payment\",\"attributes\":{\"access_url\":null,\"amount\":15000,\"balance_transaction_id\":\"bal_txn_zjTRK9sUYWttcVC9gXSQGQwD\",\"billing\":{\"address\":{\"city\":\"Taguig\",\"country\":\"PH\",\"line1\":\"12th floor The Trade and Financial Tower u1206\",\"line2\":\"32nd street and 7th Avenue\",\"postal_code\":\"1630\",\"state\":\"Bonifacio Global City\"},\"email\":\"rhaijanaabdilah@gmail.com\",\"name\":\"Rhaijana Abdilah\",\"phone\":\"09526574063\"},\"currency\":\"PHP\",\"description\":\"BOSFDR - Barangay Clearance Request #190\",\"digital_withholding_vat_amount\":0,\"disputed\":false,\"external_reference_number\":\"3gfr4zC\",\"fee\":375,\"instant_settlement\":null,\"livemode\":false,\"net_amount\":14625,\"origin\":\"links\",\"payment_intent_id\":null,\"payout\":null,\"source\":{\"id\":\"src_WPXZjaPLLe8iDCHckuk2Dq9N\",\"type\":\"gcash\",\"provider\":{\"id\":null},\"provider_id\":null},\"statement_descriptor\":\"BOSFDR\",\"status\":\"paid\",\"tax_amount\":null,\"metadata\":{\"pm_reference_number\":\"3gfr4zC\"},\"promotion\":null,\"refunds\":[],\"taxes\":[],\"available_at\":1758272400,\"created_at\":1758038620,\"credited_at\":1758675600,\"paid_at\":1758038620,\"updated_at\":1758038620}}}]}}',NULL,NULL,NULL,'2025-09-16 16:02:42','2025-09-19 02:51:33',NULL,'2025-09-16 16:02:42','2025-09-19 02:51:33',NULL,NULL,NULL,NULL),(87,193,2,'TXN_1759205339136_bd0e77b2','link_YzkuwRuNMTxuDifRc3jr6cVz','link_YzkuwRuNMTxuDifRc3jr6cVz',NULL,NULL,100.00,0.00,100.00,'PHP','succeeded',NULL,'BOSFDR - Cedula Request #193','torukamiya1@gmail.com',NULL,'{\"id\":\"link_YzkuwRuNMTxuDifRc3jr6cVz\",\"type\":\"link\",\"attributes\":{\"amount\":10000,\"archived\":false,\"currency\":\"PHP\",\"description\":\"BOSFDR - Cedula Request #193\",\"livemode\":false,\"fee\":250,\"remarks\":null,\"status\":\"paid\",\"tax_amount\":null,\"taxes\":[],\"checkout_url\":\"https://pm.link/org-barangay-bula/test/gu7v1tF\",\"reference_number\":\"gu7v1tF\",\"created_at\":1759205338,\"updated_at\":1759205338,\"payments\":[{\"data\":{\"id\":\"pay_sPF7zpNyR9LjSW6aEcepFrQd\",\"type\":\"payment\",\"attributes\":{\"access_url\":null,\"amount\":10000,\"balance_transaction_id\":\"bal_txn_smqdWPwRNLcRbUrtfHTQSV8H\",\"billing\":{\"address\":{\"city\":\"Taguig\",\"country\":\"PH\",\"line1\":\"12th floor The Trade and Financial Tower u1206\",\"line2\":\"32nd street and 7th Avenue\",\"postal_code\":\"1630\",\"state\":\"Bonifacio Global City\"},\"email\":\"torukamiya1@gmail.com\",\"name\":\"Eva\",\"phone\":\"09955958358\"},\"currency\":\"PHP\",\"description\":\"BOSFDR - Cedula Request #193\",\"digital_withholding_vat_amount\":0,\"disputed\":false,\"external_reference_number\":\"gu7v1tF\",\"fee\":250,\"instant_settlement\":null,\"livemode\":false,\"net_amount\":9750,\"origin\":\"links\",\"payment_intent_id\":null,\"payout\":null,\"source\":{\"id\":\"src_VBfPhgRiCjQQp3QTffM9mC1Z\",\"type\":\"gcash\",\"provider\":{\"id\":null},\"provider_id\":null},\"statement_descriptor\":\"BOSFDR\",\"status\":\"paid\",\"tax_amount\":null,\"metadata\":{\"pm_reference_number\":\"gu7v1tF\"},\"promotion\":null,\"refunds\":[],\"taxes\":[],\"available_at\":1759395600,\"created_at\":1759205371,\"credited_at\":1759885200,\"paid_at\":1759205371,\"updated_at\":1759205371}}}]}}',NULL,NULL,NULL,'2025-09-30 04:08:59',NULL,NULL,'2025-09-30 04:08:59','2025-09-30 04:09:32',NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `payment_transactions` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = cp850 */ ;
/*!50003 SET character_set_results = cp850 */ ;
/*!50003 SET collation_connection  = cp850_general_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'NO_ZERO_IN_DATE,NO_ZERO_DATE,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER tr_create_receipt_on_payment_success
AFTER UPDATE ON payment_transactions
FOR EACH ROW
BEGIN
  
  IF NEW.status = 'succeeded' AND OLD.status != 'succeeded' THEN
    
    IF NOT EXISTS (SELECT 1 FROM receipts WHERE transaction_id = NEW.id) THEN
      
      INSERT INTO receipts (
        transaction_id,
        client_id,
        request_id,
        receipt_number,
        client_name,
        client_email,
        client_phone,
        request_number,
        document_type,
        payment_method,
        payment_method_code,
        amount,
        processing_fee,
        net_amount,
        currency,
        external_transaction_id,
        paymongo_payment_intent_id,
        payment_status,
        receipt_date,
        payment_date,
        description
      )
      SELECT 
        NEW.id as transaction_id,
        dr.client_id,
        NEW.request_id,
        CONCAT('RCP-', LPAD(NEW.id, 8, '0')) as receipt_number,
        CONCAT(cp.first_name, ' ', cp.last_name) as client_name,
        cp.email as client_email,
        cp.phone_number as client_phone,
        dr.request_number,
        dt.type_name as document_type,
        pm.method_name as payment_method,
        pm.method_code as payment_method_code,
        NEW.amount,
        NEW.processing_fee,
        NEW.net_amount,
        NEW.currency,
        NEW.external_transaction_id,
        NEW.paymongo_payment_intent_id,
        NEW.status as payment_status,
        COALESCE(NEW.completed_at, NOW()) as receipt_date,
        NEW.completed_at as payment_date,
        NEW.payment_description as description
      FROM document_requests dr
      JOIN client_profiles cp ON dr.client_id = cp.account_id
      JOIN document_types dt ON dr.document_type_id = dt.id
      JOIN payment_methods pm ON NEW.payment_method_id = pm.id
      WHERE dr.id = NEW.request_id;
    END IF;
  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `payment_verifications`
--

DROP TABLE IF EXISTS `payment_verifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_verifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `request_id` int(11) NOT NULL,
  `payment_method_id` int(11) NOT NULL,
  `amount_received` decimal(10,2) NOT NULL,
  `receipt_number` varchar(100) DEFAULT NULL,
  `verification_notes` text DEFAULT NULL,
  `proof_image_path` varchar(500) DEFAULT NULL,
  `verified_by` int(11) NOT NULL,
  `verified_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `request_id` (`request_id`),
  KEY `payment_method_id` (`payment_method_id`),
  KEY `verified_by` (`verified_by`),
  KEY `idx_verified_at` (`verified_at`),
  CONSTRAINT `payment_verifications_ibfk_1` FOREIGN KEY (`request_id`) REFERENCES `document_requests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `payment_verifications_ibfk_2` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods` (`id`),
  CONSTRAINT `payment_verifications_ibfk_3` FOREIGN KEY (`verified_by`) REFERENCES `admin_employee_accounts` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_verifications`
--

LOCK TABLES `payment_verifications` WRITE;
/*!40000 ALTER TABLE `payment_verifications` DISABLE KEYS */;
/*!40000 ALTER TABLE `payment_verifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment_webhooks`
--

DROP TABLE IF EXISTS `payment_webhooks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_webhooks` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `webhook_id` varchar(100) NOT NULL,
  `event_type` varchar(100) NOT NULL,
  `transaction_id` varchar(100) DEFAULT NULL,
  `payment_transaction_id` int(11) DEFAULT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`payload`)),
  `signature` varchar(500) DEFAULT NULL,
  `processed` tinyint(1) DEFAULT 0,
  `processed_at` timestamp NULL DEFAULT NULL,
  `error_message` text DEFAULT NULL,
  `retry_count` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `payment_transaction_id` (`payment_transaction_id`),
  KEY `idx_webhook_id` (`webhook_id`),
  KEY `idx_event_type` (`event_type`),
  KEY `idx_transaction_id` (`transaction_id`),
  KEY `idx_processed` (`processed`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `payment_webhooks_ibfk_1` FOREIGN KEY (`payment_transaction_id`) REFERENCES `payment_transactions` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_webhooks`
--

LOCK TABLES `payment_webhooks` WRITE;
/*!40000 ALTER TABLE `payment_webhooks` DISABLE KEYS */;
INSERT INTO `payment_webhooks` VALUES (2,'evt_test123','link.payment.paid',NULL,NULL,'{\"data\":{\"id\":\"evt_test123\",\"type\":\"event\",\"attributes\":{\"type\":\"link.payment.paid\",\"livemode\":false,\"data\":{\"id\":\"link_test123\",\"type\":\"link\",\"attributes\":{\"amount\":15725,\"currency\":\"PHP\",\"description\":\"BOSFDR - Barangay Clearance Request #97\",\"status\":\"paid\",\"metadata\":{\"request_id\":\"97\",\"transaction_id\":\"txn_test123\",\"client_id\":\"12\"},\"payments\":[{\"id\":\"pay_test123\",\"type\":\"payment\",\"attributes\":{\"amount\":15725,\"currency\":\"PHP\",\"status\":\"paid\"}}]}}}}}',NULL,1,'2025-07-16 10:05:57',NULL,0,'2025-07-16 10:05:57'),(3,'evt_test_123456789','link.payment.paid',NULL,NULL,'{\"data\":{\"id\":\"evt_test_123456789\",\"type\":\"event\",\"attributes\":{\"type\":\"link.payment.paid\",\"livemode\":false,\"data\":{\"id\":\"link_test_123456789\",\"type\":\"link\",\"attributes\":{\"amount\":16060,\"archived\":false,\"currency\":\"PHP\",\"description\":\"BOSFDR - Cedula Request #111\",\"livemode\":false,\"fee\":0,\"remarks\":null,\"status\":\"paid\",\"tax_amount\":null,\"taxes\":[],\"checkout_url\":\"https://checkout.paymongo.com/test\",\"reference_number\":\"TEST123456\",\"created_at\":1753255227,\"updated_at\":1753255227,\"payments\":[{\"id\":\"pay_test_123456789\",\"type\":\"payment\",\"attributes\":{\"amount\":16060,\"currency\":\"PHP\",\"description\":\"BOSFDR - Cedula Request #111\",\"status\":\"paid\",\"livemode\":false,\"created_at\":1753255227}}]}},\"created_at\":1753255227}}}',NULL,1,'2025-07-23 09:01:55',NULL,0,'2025-07-23 07:20:27'),(4,'evt_test_123456789','link.payment.paid',NULL,NULL,'{\"data\":{\"id\":\"evt_test_123456789\",\"type\":\"event\",\"attributes\":{\"type\":\"link.payment.paid\",\"livemode\":false,\"data\":{\"id\":\"link_test_123456789\",\"type\":\"link\",\"attributes\":{\"amount\":321060,\"archived\":false,\"currency\":\"PHP\",\"description\":\"BOSFDR - Cedula Request #112\",\"livemode\":false,\"fee\":0,\"remarks\":null,\"status\":\"paid\",\"tax_amount\":null,\"taxes\":[],\"checkout_url\":\"https://checkout.paymongo.com/test\",\"reference_number\":\"TEST123456\",\"created_at\":1753256759,\"updated_at\":1753256759,\"payments\":[{\"id\":\"pay_test_123456789\",\"type\":\"payment\",\"attributes\":{\"amount\":321060,\"currency\":\"PHP\",\"description\":\"BOSFDR - Cedula Request #112\",\"status\":\"paid\",\"livemode\":false,\"created_at\":1753256759}}]}},\"created_at\":1753256759}}}',NULL,1,'2025-07-23 09:01:55',NULL,0,'2025-07-23 07:45:59'),(5,'evt_test_123456789','link.payment.paid',NULL,NULL,'{\"data\":{\"id\":\"evt_test_123456789\",\"type\":\"event\",\"attributes\":{\"type\":\"link.payment.paid\",\"livemode\":false,\"data\":{\"id\":\"link_test_123456789\",\"type\":\"link\",\"attributes\":{\"amount\":321060,\"archived\":false,\"currency\":\"PHP\",\"description\":\"BOSFDR - Cedula Request #112\",\"livemode\":false,\"fee\":0,\"remarks\":null,\"status\":\"paid\",\"tax_amount\":null,\"taxes\":[],\"checkout_url\":\"https://checkout.paymongo.com/test\",\"reference_number\":\"TEST123456\",\"created_at\":1753257252,\"updated_at\":1753257252,\"payments\":[{\"id\":\"pay_test_123456789\",\"type\":\"payment\",\"attributes\":{\"amount\":321060,\"currency\":\"PHP\",\"description\":\"BOSFDR - Cedula Request #112\",\"status\":\"paid\",\"livemode\":false,\"created_at\":1753257252}}]}},\"created_at\":1753257252}}}',NULL,1,'2025-07-23 09:01:55',NULL,0,'2025-07-23 07:54:13'),(6,'evt_vUb59q6uxS9WLfQN579D1SG9','payment.paid',NULL,NULL,'{\"data\":{\"id\":\"evt_vUb59q6uxS9WLfQN579D1SG9\",\"type\":\"event\",\"attributes\":{\"type\":\"payment.paid\",\"livemode\":false,\"data\":{\"id\":\"pay_MtpP8FM9hpVx3B96pGeZmigJ\",\"type\":\"payment\",\"attributes\":{\"access_url\":null,\"amount\":16060,\"balance_transaction_id\":\"bal_txn_qxAwBjmE3YoDeMFCWHGq3TiK\",\"billing\":{\"address\":{\"city\":\"Taguig\",\"country\":\"PH\",\"line1\":\"12th floor The Trade and Financial Tower u1206\",\"line2\":\"32nd street and 7th Avenue\",\"postal_code\":\"1630\",\"state\":\"Bonifacio Global City\"},\"email\":\"vonchristian41@gmail.com\",\"name\":\"Sharm Maine Cruz\",\"phone\":\"09988765667\"},\"currency\":\"PHP\",\"description\":\"BOSFDR - Cedula Request #113\",\"digital_withholding_vat_amount\":0,\"disputed\":false,\"external_reference_number\":\"T34WXZ1\",\"fee\":402,\"instant_settlement\":null,\"livemode\":false,\"net_amount\":15658,\"origin\":\"links\",\"payment_intent_id\":null,\"payout\":null,\"source\":{\"id\":\"src_XJC3vxXM28Bvmqa9SU9mheqL\",\"type\":\"gcash\",\"provider\":{\"id\":null},\"provider_id\":null},\"statement_descriptor\":\"BOSFDR\",\"status\":\"paid\",\"tax_amount\":null,\"metadata\":{\"pm_reference_number\":\"T34WXZ1\"},\"promotion\":null,\"refunds\":[],\"taxes\":[],\"available_at\":1753434000,\"created_at\":1753257456,\"credited_at\":1753837200,\"paid_at\":1753257456,\"updated_at\":1753257456}},\"previous_data\":{},\"pending_webhooks\":1,\"created_at\":1753257457,\"updated_at\":1753257457}}}',NULL,1,'2025-07-23 07:57:39',NULL,0,'2025-07-23 07:57:38'),(7,'evt_1LB2rTsc2yWR8JrCkctTkaHL','link.payment.paid',NULL,NULL,'{\"data\":{\"id\":\"evt_1LB2rTsc2yWR8JrCkctTkaHL\",\"type\":\"event\",\"attributes\":{\"type\":\"link.payment.paid\",\"livemode\":false,\"data\":{\"id\":\"link_x8d6kK6Q1bR3YtLeAtQzLfe2\",\"type\":\"link\",\"attributes\":{\"amount\":16060,\"archived\":false,\"currency\":\"PHP\",\"description\":\"BOSFDR - Cedula Request #113\",\"livemode\":false,\"fee\":402,\"remarks\":null,\"status\":\"paid\",\"tax_amount\":null,\"taxes\":[],\"checkout_url\":\"https://pm.link/org-barangay-bula/test/T34WXZ1\",\"reference_number\":\"T34WXZ1\",\"created_at\":1753257385,\"updated_at\":1753257385,\"payments\":[{\"data\":{\"id\":\"pay_MtpP8FM9hpVx3B96pGeZmigJ\",\"type\":\"payment\",\"attributes\":{\"access_url\":null,\"amount\":16060,\"balance_transaction_id\":\"bal_txn_qxAwBjmE3YoDeMFCWHGq3TiK\",\"billing\":{\"address\":{\"city\":\"Taguig\",\"country\":\"PH\",\"line1\":\"12th floor The Trade and Financial Tower u1206\",\"line2\":\"32nd street and 7th Avenue\",\"postal_code\":\"1630\",\"state\":\"Bonifacio Global City\"},\"email\":\"vonchristian41@gmail.com\",\"name\":\"Sharm Maine Cruz\",\"phone\":\"09988765667\"},\"currency\":\"PHP\",\"description\":\"BOSFDR - Cedula Request #113\",\"digital_withholding_vat_amount\":0,\"disputed\":false,\"external_reference_number\":\"T34WXZ1\",\"fee\":402,\"instant_settlement\":null,\"livemode\":false,\"net_amount\":15658,\"origin\":\"links\",\"payment_intent_id\":null,\"payout\":null,\"source\":{\"id\":\"src_XJC3vxXM28Bvmqa9SU9mheqL\",\"type\":\"gcash\",\"provider\":{\"id\":null},\"provider_id\":null},\"statement_descriptor\":\"BOSFDR\",\"status\":\"paid\",\"tax_amount\":null,\"metadata\":{\"pm_reference_number\":\"T34WXZ1\"},\"promotion\":null,\"refunds\":[],\"taxes\":[],\"available_at\":1753434000,\"created_at\":1753257456,\"credited_at\":1753837200,\"paid_at\":1753257456,\"updated_at\":1753257456}}}]}},\"previous_data\":{},\"pending_webhooks\":1,\"created_at\":1753257457,\"updated_at\":1753257457}}}',NULL,1,'2025-07-23 07:57:39',NULL,0,'2025-07-23 07:57:38'),(8,'evt_test_123456789','link.payment.paid',NULL,NULL,'{\"data\":{\"id\":\"evt_test_123456789\",\"type\":\"event\",\"attributes\":{\"type\":\"link.payment.paid\",\"livemode\":false,\"data\":{\"id\":\"link_test_123456789\",\"type\":\"link\",\"attributes\":{\"amount\":321060,\"archived\":false,\"currency\":\"PHP\",\"description\":\"BOSFDR - Cedula Request #112\",\"livemode\":false,\"fee\":0,\"remarks\":null,\"status\":\"paid\",\"tax_amount\":null,\"taxes\":[],\"checkout_url\":\"https://checkout.paymongo.com/test\",\"reference_number\":\"TEST123456\",\"created_at\":1753258077,\"updated_at\":1753258077,\"payments\":[{\"id\":\"pay_test_123456789\",\"type\":\"payment\",\"attributes\":{\"amount\":321060,\"currency\":\"PHP\",\"description\":\"BOSFDR - Cedula Request #112\",\"status\":\"paid\",\"livemode\":false,\"created_at\":1753258077}}]}},\"created_at\":1753258077}}}',NULL,1,'2025-07-23 09:01:55',NULL,0,'2025-07-23 08:07:58'),(9,'evt_tdmbKJ1asZFLDHri44DuinF6','payment.paid',NULL,NULL,'{\"data\":{\"id\":\"evt_tdmbKJ1asZFLDHri44DuinF6\",\"type\":\"event\",\"attributes\":{\"type\":\"payment.paid\",\"livemode\":false,\"data\":{\"id\":\"pay_6xvy9MPVVopUvY6TVAybzToc\",\"type\":\"payment\",\"attributes\":{\"access_url\":null,\"amount\":16300,\"balance_transaction_id\":\"bal_txn_bmZvmcLM8KdB4Bs7Vyt7PnX3\",\"billing\":{\"address\":{\"city\":\"Taguig\",\"country\":\"PH\",\"line1\":\"12th floor The Trade and Financial Tower u1206\",\"line2\":\"32nd street and 7th Avenue\",\"postal_code\":\"1630\",\"state\":\"Bonifacio Global City\"},\"email\":\"41esgf@gmail.com\",\"name\":\"Kim Ashley\",\"phone\":\"09999932999\"},\"currency\":\"PHP\",\"description\":\"BOSFDR - Barangay Clearance Request #114\",\"digital_withholding_vat_amount\":0,\"disputed\":false,\"external_reference_number\":\"uSBwyp2\",\"fee\":408,\"instant_settlement\":null,\"livemode\":false,\"net_amount\":15892,\"origin\":\"links\",\"payment_intent_id\":null,\"payout\":null,\"source\":{\"id\":\"src_L2WqZEoKJheDamMp3GVN5QGs\",\"type\":\"gcash\",\"provider\":{\"id\":null},\"provider_id\":null},\"statement_descriptor\":\"BOSFDR\",\"status\":\"paid\",\"tax_amount\":null,\"metadata\":{\"pm_reference_number\":\"uSBwyp2\"},\"promotion\":null,\"refunds\":[],\"taxes\":[],\"available_at\":1753434000,\"created_at\":1753258254,\"credited_at\":1753837200,\"paid_at\":1753258255,\"updated_at\":1753258255}},\"previous_data\":{},\"pending_webhooks\":1,\"created_at\":1753258255,\"updated_at\":1753258255}}}',NULL,1,'2025-07-23 08:10:56',NULL,0,'2025-07-23 08:10:56'),(10,'evt_8u3jwBHASv1ffqkqD5hfg6Ho','link.payment.paid',NULL,NULL,'{\"data\":{\"id\":\"evt_8u3jwBHASv1ffqkqD5hfg6Ho\",\"type\":\"event\",\"attributes\":{\"type\":\"link.payment.paid\",\"livemode\":false,\"data\":{\"id\":\"link_CYjNyn7X6zdVS7s62GkyqWAr\",\"type\":\"link\",\"attributes\":{\"amount\":16300,\"archived\":false,\"currency\":\"PHP\",\"description\":\"BOSFDR - Barangay Clearance Request #114\",\"livemode\":false,\"fee\":408,\"remarks\":null,\"status\":\"paid\",\"tax_amount\":null,\"taxes\":[],\"checkout_url\":\"https://pm.link/org-barangay-bula/test/uSBwyp2\",\"reference_number\":\"uSBwyp2\",\"created_at\":1753258219,\"updated_at\":1753258219,\"payments\":[{\"data\":{\"id\":\"pay_6xvy9MPVVopUvY6TVAybzToc\",\"type\":\"payment\",\"attributes\":{\"access_url\":null,\"amount\":16300,\"balance_transaction_id\":\"bal_txn_bmZvmcLM8KdB4Bs7Vyt7PnX3\",\"billing\":{\"address\":{\"city\":\"Taguig\",\"country\":\"PH\",\"line1\":\"12th floor The Trade and Financial Tower u1206\",\"line2\":\"32nd street and 7th Avenue\",\"postal_code\":\"1630\",\"state\":\"Bonifacio Global City\"},\"email\":\"41esgf@gmail.com\",\"name\":\"Kim Ashley\",\"phone\":\"09999932999\"},\"currency\":\"PHP\",\"description\":\"BOSFDR - Barangay Clearance Request #114\",\"digital_withholding_vat_amount\":0,\"disputed\":false,\"external_reference_number\":\"uSBwyp2\",\"fee\":408,\"instant_settlement\":null,\"livemode\":false,\"net_amount\":15892,\"origin\":\"links\",\"payment_intent_id\":null,\"payout\":null,\"source\":{\"id\":\"src_L2WqZEoKJheDamMp3GVN5QGs\",\"type\":\"gcash\",\"provider\":{\"id\":null},\"provider_id\":null},\"statement_descriptor\":\"BOSFDR\",\"status\":\"paid\",\"tax_amount\":null,\"metadata\":{\"pm_reference_number\":\"uSBwyp2\"},\"promotion\":null,\"refunds\":[],\"taxes\":[],\"available_at\":1753434000,\"created_at\":1753258254,\"credited_at\":1753837200,\"paid_at\":1753258255,\"updated_at\":1753258255}}}]}},\"previous_data\":{},\"pending_webhooks\":1,\"created_at\":1753258255,\"updated_at\":1753258255}}}',NULL,1,'2025-07-23 08:10:56',NULL,0,'2025-07-23 08:10:56'),(11,'evt_test_123456789','link.payment.paid',NULL,NULL,'{\"data\":{\"id\":\"evt_test_123456789\",\"type\":\"event\",\"attributes\":{\"type\":\"link.payment.paid\",\"livemode\":false,\"data\":{\"id\":\"link_test_123456789\",\"type\":\"link\",\"attributes\":{\"amount\":321060,\"archived\":false,\"currency\":\"PHP\",\"description\":\"BOSFDR - Cedula Request #112\",\"livemode\":false,\"fee\":0,\"remarks\":null,\"status\":\"paid\",\"tax_amount\":null,\"taxes\":[],\"checkout_url\":\"https://checkout.paymongo.com/test\",\"reference_number\":\"TEST123456\",\"created_at\":1753258883,\"updated_at\":1753258883,\"payments\":[{\"id\":\"pay_test_123456789\",\"type\":\"payment\",\"attributes\":{\"amount\":321060,\"currency\":\"PHP\",\"description\":\"BOSFDR - Cedula Request #112\",\"status\":\"paid\",\"livemode\":false,\"created_at\":1753258883}}]}},\"created_at\":1753258883}}}',NULL,1,'2025-07-23 09:01:55',NULL,0,'2025-07-23 08:21:23'),(12,'evt_test_123456789','link.payment.paid',NULL,NULL,'{\"data\":{\"id\":\"evt_test_123456789\",\"type\":\"event\",\"attributes\":{\"type\":\"link.payment.paid\",\"livemode\":false,\"data\":{\"id\":\"link_test_123456789\",\"type\":\"link\",\"attributes\":{\"amount\":321060,\"archived\":false,\"currency\":\"PHP\",\"description\":\"BOSFDR - Cedula Request #112\",\"livemode\":false,\"fee\":0,\"remarks\":null,\"status\":\"paid\",\"tax_amount\":null,\"taxes\":[],\"checkout_url\":\"https://checkout.paymongo.com/test\",\"reference_number\":\"TEST123456\",\"created_at\":1753259324,\"updated_at\":1753259324,\"payments\":[{\"id\":\"pay_test_123456789\",\"type\":\"payment\",\"attributes\":{\"amount\":321060,\"currency\":\"PHP\",\"description\":\"BOSFDR - Cedula Request #112\",\"status\":\"paid\",\"livemode\":false,\"created_at\":1753259324}}]}},\"created_at\":1753259324}}}',NULL,1,'2025-07-23 09:01:55',NULL,0,'2025-07-23 08:28:45'),(13,'evt_test_123456789','link.payment.paid',NULL,NULL,'{\"data\":{\"id\":\"evt_test_123456789\",\"type\":\"event\",\"attributes\":{\"type\":\"link.payment.paid\",\"livemode\":false,\"data\":{\"id\":\"link_test_123456789\",\"type\":\"link\",\"attributes\":{\"amount\":321060,\"archived\":false,\"currency\":\"PHP\",\"description\":\"BOSFDR - Cedula Request #112\",\"livemode\":false,\"fee\":0,\"remarks\":null,\"status\":\"paid\",\"tax_amount\":null,\"taxes\":[],\"checkout_url\":\"https://checkout.paymongo.com/test\",\"reference_number\":\"TEST123456\",\"created_at\":1753260210,\"updated_at\":1753260210,\"payments\":[{\"id\":\"pay_test_123456789\",\"type\":\"payment\",\"attributes\":{\"amount\":321060,\"currency\":\"PHP\",\"description\":\"BOSFDR - Cedula Request #112\",\"status\":\"paid\",\"livemode\":false,\"created_at\":1753260210}}]}},\"created_at\":1753260210}}}',NULL,1,'2025-07-23 09:01:55',NULL,0,'2025-07-23 08:43:32'),(14,'evt_test_123456789','link.payment.paid',NULL,NULL,'{\"data\":{\"id\":\"evt_test_123456789\",\"type\":\"event\",\"attributes\":{\"type\":\"link.payment.paid\",\"livemode\":false,\"data\":{\"id\":\"link_test_123456789\",\"type\":\"link\",\"attributes\":{\"amount\":321060,\"archived\":false,\"currency\":\"PHP\",\"description\":\"BOSFDR - Cedula Request #112\",\"livemode\":false,\"fee\":0,\"remarks\":null,\"status\":\"paid\",\"tax_amount\":null,\"taxes\":[],\"checkout_url\":\"https://checkout.paymongo.com/test\",\"reference_number\":\"TEST123456\",\"created_at\":1753261313,\"updated_at\":1753261313,\"payments\":[{\"id\":\"pay_test_123456789\",\"type\":\"payment\",\"attributes\":{\"amount\":321060,\"currency\":\"PHP\",\"description\":\"BOSFDR - Cedula Request #112\",\"status\":\"paid\",\"livemode\":false,\"created_at\":1753261313}}]}},\"created_at\":1753261313}}}',NULL,1,'2025-07-23 09:01:55',NULL,0,'2025-07-23 09:01:54'),(15,'evt_TEiyiU5rHYVhqfjJJGYW5YFe','payment.paid',NULL,NULL,'{\"data\":{\"id\":\"evt_TEiyiU5rHYVhqfjJJGYW5YFe\",\"type\":\"event\",\"attributes\":{\"type\":\"payment.paid\",\"livemode\":false,\"data\":{\"id\":\"pay_oDenXW8FX5EKCAxW7R2sRtua\",\"type\":\"payment\",\"attributes\":{\"access_url\":null,\"amount\":10000,\"balance_transaction_id\":\"bal_txn_LVBokiuHhEFMRN3nHRn4zBSu\",\"billing\":{\"address\":{\"city\":\"Taguig\",\"country\":\"PH\",\"line1\":\"12th floor The Trade and Financial Tower u1206\",\"line2\":\"32nd street and 7th Avenue\",\"postal_code\":\"1630\",\"state\":\"Bonifacio Global City\"},\"email\":\"vonchristian41@gmail.com\",\"name\":\"Kyle Romano\",\"phone\":\"09785543432\"},\"currency\":\"PHP\",\"description\":\"BOSFDR - Cedula Request #115 (incl. convenience fee)\",\"digital_withholding_vat_amount\":0,\"disputed\":false,\"external_reference_number\":\"BFq9xZq\",\"fee\":250,\"instant_settlement\":null,\"livemode\":false,\"net_amount\":9750,\"origin\":\"links\",\"payment_intent_id\":null,\"payout\":null,\"source\":{\"id\":\"src_F7XnTjzDZ81pejL2isaHueHk\",\"type\":\"gcash\",\"provider\":{\"id\":null},\"provider_id\":null},\"statement_descriptor\":\"BOSFDR\",\"status\":\"paid\",\"tax_amount\":null,\"metadata\":{\"pm_reference_number\":\"BFq9xZq\"},\"promotion\":null,\"refunds\":[],\"taxes\":[],\"available_at\":1753693200,\"created_at\":1753263107,\"credited_at\":1753837200,\"paid_at\":1753263107,\"updated_at\":1753263108}},\"previous_data\":{},\"pending_webhooks\":1,\"created_at\":1753263108,\"updated_at\":1753263108}}}',NULL,1,'2025-07-23 09:31:50',NULL,0,'2025-07-23 09:31:50'),(16,'evt_HcMspsdByxLUCJmYKK8zd7mU','link.payment.paid',NULL,NULL,'{\"data\":{\"id\":\"evt_HcMspsdByxLUCJmYKK8zd7mU\",\"type\":\"event\",\"attributes\":{\"type\":\"link.payment.paid\",\"livemode\":false,\"data\":{\"id\":\"link_ayWhUdrdpB26pCsSZzjYmEgr\",\"type\":\"link\",\"attributes\":{\"amount\":10000,\"archived\":false,\"currency\":\"PHP\",\"description\":\"BOSFDR - Cedula Request #115 (incl. convenience fee)\",\"livemode\":false,\"fee\":250,\"remarks\":null,\"status\":\"paid\",\"tax_amount\":null,\"taxes\":[],\"checkout_url\":\"https://pm.link/org-barangay-bula/test/BFq9xZq\",\"reference_number\":\"BFq9xZq\",\"created_at\":1753263014,\"updated_at\":1753263014,\"payments\":[{\"data\":{\"id\":\"pay_oDenXW8FX5EKCAxW7R2sRtua\",\"type\":\"payment\",\"attributes\":{\"access_url\":null,\"amount\":10000,\"balance_transaction_id\":\"bal_txn_LVBokiuHhEFMRN3nHRn4zBSu\",\"billing\":{\"address\":{\"city\":\"Taguig\",\"country\":\"PH\",\"line1\":\"12th floor The Trade and Financial Tower u1206\",\"line2\":\"32nd street and 7th Avenue\",\"postal_code\":\"1630\",\"state\":\"Bonifacio Global City\"},\"email\":\"vonchristian41@gmail.com\",\"name\":\"Kyle Romano\",\"phone\":\"09785543432\"},\"currency\":\"PHP\",\"description\":\"BOSFDR - Cedula Request #115 (incl. convenience fee)\",\"digital_withholding_vat_amount\":0,\"disputed\":false,\"external_reference_number\":\"BFq9xZq\",\"fee\":250,\"instant_settlement\":null,\"livemode\":false,\"net_amount\":9750,\"origin\":\"links\",\"payment_intent_id\":null,\"payout\":null,\"source\":{\"id\":\"src_F7XnTjzDZ81pejL2isaHueHk\",\"type\":\"gcash\",\"provider\":{\"id\":null},\"provider_id\":null},\"statement_descriptor\":\"BOSFDR\",\"status\":\"paid\",\"tax_amount\":null,\"metadata\":{\"pm_reference_number\":\"BFq9xZq\"},\"promotion\":null,\"refunds\":[],\"taxes\":[],\"available_at\":1753693200,\"created_at\":1753263107,\"credited_at\":1753837200,\"paid_at\":1753263107,\"updated_at\":1753263108}}}]}},\"previous_data\":{},\"pending_webhooks\":1,\"created_at\":1753263108,\"updated_at\":1753263108}}}',NULL,1,'2025-07-23 09:31:50',NULL,0,'2025-07-23 09:31:50'),(17,'evt_test_duplicate_1753264486897','link.payment.paid',NULL,NULL,'{\"data\":{\"id\":\"evt_test_duplicate_1753264486897\",\"type\":\"event\",\"attributes\":{\"type\":\"link.payment.paid\",\"livemode\":false,\"data\":{\"id\":\"pay_test_duplicate\",\"type\":\"payment\",\"attributes\":{\"amount\":16060,\"currency\":\"PHP\",\"description\":\"BOSFDR - Duplicate Test\",\"livemode\":false,\"fee\":0,\"remarks\":null,\"status\":\"paid\",\"tax_amount\":null,\"taxes\":[],\"checkout_url\":\"https://checkout.paymongo.com/test\",\"reference_number\":\"TEST_DUPLICATE\",\"created_at\":1753264486,\"updated_at\":1753264486,\"paid_at\":1753264486}},\"created_at\":1753264486,\"updated_at\":1753264486}}}',NULL,1,'2025-07-23 09:54:47',NULL,0,'2025-07-23 09:54:47'),(18,'evt_TG1hb2CdSH5sguVgtCeJGfQ4','payment.paid',NULL,NULL,'{\"data\":{\"id\":\"evt_TG1hb2CdSH5sguVgtCeJGfQ4\",\"type\":\"event\",\"attributes\":{\"type\":\"payment.paid\",\"livemode\":false,\"data\":{\"id\":\"pay_ESC6vvKwgMPug9zXbXeUjMAa\",\"type\":\"payment\",\"attributes\":{\"access_url\":null,\"amount\":16300,\"balance_transaction_id\":\"bal_txn_748n1ZLBQKmaUsgGBxRNgqz2\",\"billing\":{\"address\":{\"city\":\"Taguig\",\"country\":\"PH\",\"line1\":\"12th floor The Trade and Financial Tower u1206\",\"line2\":\"32nd street and 7th Avenue\",\"postal_code\":\"1630\",\"state\":\"Bonifacio Global City\"},\"email\":\"der12aga14@gmail.com\",\"name\":\"Xian Lei\",\"phone\":\"09999932139\"},\"currency\":\"PHP\",\"description\":\"BOSFDR - Barangay Clearance Request #116\",\"digital_withholding_vat_amount\":0,\"disputed\":false,\"external_reference_number\":\"pnXE12R\",\"fee\":408,\"instant_settlement\":null,\"livemode\":false,\"net_amount\":15892,\"origin\":\"links\",\"payment_intent_id\":null,\"payout\":null,\"source\":{\"id\":\"src_HQzF7DaNNz5aRAZtT6d8gNxk\",\"type\":\"gcash\",\"provider\":{\"id\":null},\"provider_id\":null},\"statement_descriptor\":\"BOSFDR\",\"status\":\"paid\",\"tax_amount\":null,\"metadata\":{\"pm_reference_number\":\"pnXE12R\"},\"promotion\":null,\"refunds\":[],\"taxes\":[],\"available_at\":1753693200,\"created_at\":1753265089,\"credited_at\":1753837200,\"paid_at\":1753265089,\"updated_at\":1753265089}},\"previous_data\":{},\"pending_webhooks\":1,\"created_at\":1753265089,\"updated_at\":1753265089}}}',NULL,1,'2025-07-23 10:04:52',NULL,0,'2025-07-23 10:04:52'),(19,'evt_TxecasweeiCVyJw3MKVvECaT','link.payment.paid',NULL,NULL,'{\"data\":{\"id\":\"evt_TxecasweeiCVyJw3MKVvECaT\",\"type\":\"event\",\"attributes\":{\"type\":\"link.payment.paid\",\"livemode\":false,\"data\":{\"id\":\"link_2snQrcdLQZ2K1SHJc4ZB5VYN\",\"type\":\"link\",\"attributes\":{\"amount\":16300,\"archived\":false,\"currency\":\"PHP\",\"description\":\"BOSFDR - Barangay Clearance Request #116\",\"livemode\":false,\"fee\":408,\"remarks\":null,\"status\":\"paid\",\"tax_amount\":null,\"taxes\":[],\"checkout_url\":\"https://pm.link/org-barangay-bula/test/pnXE12R\",\"reference_number\":\"pnXE12R\",\"created_at\":1753265049,\"updated_at\":1753265049,\"payments\":[{\"data\":{\"id\":\"pay_ESC6vvKwgMPug9zXbXeUjMAa\",\"type\":\"payment\",\"attributes\":{\"access_url\":null,\"amount\":16300,\"balance_transaction_id\":\"bal_txn_748n1ZLBQKmaUsgGBxRNgqz2\",\"billing\":{\"address\":{\"city\":\"Taguig\",\"country\":\"PH\",\"line1\":\"12th floor The Trade and Financial Tower u1206\",\"line2\":\"32nd street and 7th Avenue\",\"postal_code\":\"1630\",\"state\":\"Bonifacio Global City\"},\"email\":\"der12aga14@gmail.com\",\"name\":\"Xian Lei\",\"phone\":\"09999932139\"},\"currency\":\"PHP\",\"description\":\"BOSFDR - Barangay Clearance Request #116\",\"digital_withholding_vat_amount\":0,\"disputed\":false,\"external_reference_number\":\"pnXE12R\",\"fee\":408,\"instant_settlement\":null,\"livemode\":false,\"net_amount\":15892,\"origin\":\"links\",\"payment_intent_id\":null,\"payout\":null,\"source\":{\"id\":\"src_HQzF7DaNNz5aRAZtT6d8gNxk\",\"type\":\"gcash\",\"provider\":{\"id\":null},\"provider_id\":null},\"statement_descriptor\":\"BOSFDR\",\"status\":\"paid\",\"tax_amount\":null,\"metadata\":{\"pm_reference_number\":\"pnXE12R\"},\"promotion\":null,\"refunds\":[],\"taxes\":[],\"available_at\":1753693200,\"created_at\":1753265089,\"credited_at\":1753837200,\"paid_at\":1753265089,\"updated_at\":1753265089}}}]}},\"previous_data\":{},\"pending_webhooks\":1,\"created_at\":1753265089,\"updated_at\":1753265089}}}',NULL,1,'2025-07-23 10:04:52',NULL,0,'2025-07-23 10:04:52'),(20,'evt_payment_paid_1753265778904','payment.paid',NULL,NULL,'{\"data\":{\"id\":\"evt_payment_paid_1753265778904\",\"type\":\"event\",\"attributes\":{\"type\":\"payment.paid\",\"livemode\":false,\"data\":{\"id\":\"pay_test_duplicate_events\",\"type\":\"payment\",\"attributes\":{\"amount\":321060,\"currency\":\"PHP\",\"description\":\"BOSFDR - Cedula Request #112\",\"livemode\":false,\"fee\":0,\"remarks\":null,\"status\":\"paid\",\"tax_amount\":null,\"taxes\":[],\"checkout_url\":\"https://checkout.paymongo.com/test\",\"reference_number\":\"TEST_DUPLICATE_EVENTS\",\"created_at\":1753265778,\"updated_at\":1753265778,\"paid_at\":1753265778}},\"created_at\":1753265778,\"updated_at\":1753265778}}}',NULL,1,'2025-07-23 10:16:19',NULL,0,'2025-07-23 10:16:19'),(21,'evt_link_payment_paid_1753265778904','link.payment.paid',NULL,NULL,'{\"data\":{\"id\":\"evt_link_payment_paid_1753265778904\",\"type\":\"event\",\"attributes\":{\"type\":\"link.payment.paid\",\"livemode\":false,\"data\":{\"id\":\"pay_test_duplicate_events\",\"type\":\"payment\",\"attributes\":{\"amount\":321060,\"currency\":\"PHP\",\"description\":\"BOSFDR - Cedula Request #112\",\"livemode\":false,\"fee\":0,\"remarks\":null,\"status\":\"paid\",\"tax_amount\":null,\"taxes\":[],\"checkout_url\":\"https://checkout.paymongo.com/test\",\"reference_number\":\"TEST_DUPLICATE_EVENTS\",\"created_at\":1753265778,\"updated_at\":1753265778,\"paid_at\":1753265778}},\"created_at\":1753265778,\"updated_at\":1753265778}}}',NULL,1,'2025-07-23 10:16:21',NULL,0,'2025-07-23 10:16:21'),(22,'evt_payment_paid_1753266061638','payment.paid',NULL,NULL,'{\"data\":{\"id\":\"evt_payment_paid_1753266061638\",\"type\":\"event\",\"attributes\":{\"type\":\"payment.paid\",\"livemode\":false,\"data\":{\"id\":\"pay_real_payment_112\",\"type\":\"payment\",\"attributes\":{\"amount\":321060,\"currency\":\"PHP\",\"description\":\"BOSFDR - Birth Certificate Request #116\",\"livemode\":false,\"fee\":0,\"remarks\":null,\"status\":\"paid\",\"tax_amount\":null,\"taxes\":[],\"checkout_url\":\"https://checkout.paymongo.com/test\",\"reference_number\":\"TEST_DUPLICATE_EVENTS\",\"created_at\":1753266061,\"updated_at\":1753266061,\"paid_at\":1753266061}},\"created_at\":1753266061,\"updated_at\":1753266061}}}',NULL,1,'2025-07-23 10:21:02',NULL,0,'2025-07-23 10:21:01'),(23,'evt_link_payment_paid_1753266061638','link.payment.paid',NULL,NULL,'{\"data\":{\"id\":\"evt_link_payment_paid_1753266061638\",\"type\":\"event\",\"attributes\":{\"type\":\"link.payment.paid\",\"livemode\":false,\"data\":{\"id\":\"pay_real_payment_112\",\"type\":\"payment\",\"attributes\":{\"amount\":321060,\"currency\":\"PHP\",\"description\":\"BOSFDR - Birth Certificate Request #116\",\"livemode\":false,\"fee\":0,\"remarks\":null,\"status\":\"paid\",\"tax_amount\":null,\"taxes\":[],\"checkout_url\":\"https://checkout.paymongo.com/test\",\"reference_number\":\"TEST_DUPLICATE_EVENTS\",\"created_at\":1753266061,\"updated_at\":1753266061,\"paid_at\":1753266061}},\"created_at\":1753266061,\"updated_at\":1753266061}}}',NULL,1,'2025-07-23 10:21:04',NULL,0,'2025-07-23 10:21:04'),(24,'evt_sZJkKXYb3vuzXgdEeJmKtYqd','payment.paid',NULL,NULL,'{\"data\":{\"id\":\"evt_sZJkKXYb3vuzXgdEeJmKtYqd\",\"type\":\"event\",\"attributes\":{\"type\":\"payment.paid\",\"livemode\":false,\"data\":{\"id\":\"pay_mzBpj7GKojyvHX1jHUA5gmCA\",\"type\":\"payment\",\"attributes\":{\"access_url\":null,\"amount\":16060,\"balance_transaction_id\":\"bal_txn_s86Eo2NuorE9UT1ApyurDBw8\",\"billing\":{\"address\":{\"city\":\"Taguig\",\"country\":\"PH\",\"line1\":\"12th floor The Trade and Financial Tower u1206\",\"line2\":\"32nd street and 7th Avenue\",\"postal_code\":\"1630\",\"state\":\"Bonifacio Global City\"},\"email\":\"jesygf@gmail.com\",\"name\":\"Von Jery\",\"phone\":\"09999932999\"},\"currency\":\"PHP\",\"description\":\"BOSFDR - Cedula Request #117\",\"digital_withholding_vat_amount\":0,\"disputed\":false,\"external_reference_number\":\"ck8kV8s\",\"fee\":402,\"instant_settlement\":null,\"livemode\":false,\"net_amount\":15658,\"origin\":\"links\",\"payment_intent_id\":null,\"payout\":null,\"source\":{\"id\":\"src_GCF4m8473XiW3cXZvbj1vnKK\",\"type\":\"gcash\",\"provider\":{\"id\":null},\"provider_id\":null},\"statement_descriptor\":\"BOSFDR\",\"status\":\"paid\",\"tax_amount\":null,\"metadata\":{\"pm_reference_number\":\"ck8kV8s\"},\"promotion\":null,\"refunds\":[],\"taxes\":[],\"available_at\":1753693200,\"created_at\":1753266315,\"credited_at\":1753837200,\"paid_at\":1753266315,\"updated_at\":1753266315}},\"previous_data\":{},\"pending_webhooks\":1,\"created_at\":1753266315,\"updated_at\":1753266315}}}',NULL,1,'2025-07-23 10:25:17',NULL,0,'2025-07-23 10:25:17'),(25,'evt_TQay8aZu3LY9RyRq53CCsvo5','link.payment.paid',NULL,NULL,'{\"data\":{\"id\":\"evt_TQay8aZu3LY9RyRq53CCsvo5\",\"type\":\"event\",\"attributes\":{\"type\":\"link.payment.paid\",\"livemode\":false,\"data\":{\"id\":\"link_uayR9S8nKKLJHce6gTGFj4He\",\"type\":\"link\",\"attributes\":{\"amount\":16060,\"archived\":false,\"currency\":\"PHP\",\"description\":\"BOSFDR - Cedula Request #117\",\"livemode\":false,\"fee\":402,\"remarks\":null,\"status\":\"paid\",\"tax_amount\":null,\"taxes\":[],\"checkout_url\":\"https://pm.link/org-barangay-bula/test/ck8kV8s\",\"reference_number\":\"ck8kV8s\",\"created_at\":1753266267,\"updated_at\":1753266267,\"payments\":[{\"data\":{\"id\":\"pay_mzBpj7GKojyvHX1jHUA5gmCA\",\"type\":\"payment\",\"attributes\":{\"access_url\":null,\"amount\":16060,\"balance_transaction_id\":\"bal_txn_s86Eo2NuorE9UT1ApyurDBw8\",\"billing\":{\"address\":{\"city\":\"Taguig\",\"country\":\"PH\",\"line1\":\"12th floor The Trade and Financial Tower u1206\",\"line2\":\"32nd street and 7th Avenue\",\"postal_code\":\"1630\",\"state\":\"Bonifacio Global City\"},\"email\":\"jesygf@gmail.com\",\"name\":\"Von Jery\",\"phone\":\"09999932999\"},\"currency\":\"PHP\",\"description\":\"BOSFDR - Cedula Request #117\",\"digital_withholding_vat_amount\":0,\"disputed\":false,\"external_reference_number\":\"ck8kV8s\",\"fee\":402,\"instant_settlement\":null,\"livemode\":false,\"net_amount\":15658,\"origin\":\"links\",\"payment_intent_id\":null,\"payout\":null,\"source\":{\"id\":\"src_GCF4m8473XiW3cXZvbj1vnKK\",\"type\":\"gcash\",\"provider\":{\"id\":null},\"provider_id\":null},\"statement_descriptor\":\"BOSFDR\",\"status\":\"paid\",\"tax_amount\":null,\"metadata\":{\"pm_reference_number\":\"ck8kV8s\"},\"promotion\":null,\"refunds\":[],\"taxes\":[],\"available_at\":1753693200,\"created_at\":1753266315,\"credited_at\":1753837200,\"paid_at\":1753266315,\"updated_at\":1753266315}}}]}},\"previous_data\":{},\"pending_webhooks\":1,\"created_at\":1753266315,\"updated_at\":1753266315}}}',NULL,1,'2025-07-23 10:25:17',NULL,0,'2025-07-23 10:25:17'),(26,'evt_iToKLTvrTWDDrPHdTwhaELKB','link.payment.paid',NULL,NULL,'{\"data\":{\"id\":\"evt_iToKLTvrTWDDrPHdTwhaELKB\",\"type\":\"event\",\"attributes\":{\"type\":\"link.payment.paid\",\"livemode\":false,\"data\":{\"id\":\"link_VCMMhpC2ESBphTXV5w5PNVkS\",\"type\":\"link\",\"attributes\":{\"amount\":16060,\"archived\":false,\"currency\":\"PHP\",\"description\":\"BOSFDR - Cedula Request #118\",\"livemode\":false,\"fee\":402,\"remarks\":null,\"status\":\"paid\",\"tax_amount\":null,\"taxes\":[],\"checkout_url\":\"https://pm.link/org-barangay-bula/test/5s8kX7x\",\"reference_number\":\"5s8kX7x\",\"created_at\":1753266692,\"updated_at\":1753266692,\"payments\":[{\"data\":{\"id\":\"pay_qakNqzyPKSULeHSALFoySAFU\",\"type\":\"payment\",\"attributes\":{\"access_url\":null,\"amount\":16060,\"balance_transaction_id\":\"bal_txn_jwQV37MG8M6jLiDzy82ZQWK4\",\"billing\":{\"address\":{\"city\":\"Taguig\",\"country\":\"PH\",\"line1\":\"12th floor The Trade and Financial Tower u1206\",\"line2\":\"32nd street and 7th Avenue\",\"postal_code\":\"1630\",\"state\":\"Bonifacio Global City\"},\"email\":\"vonchristian41@gmail.com\",\"name\":\"Mica Bit Pos\",\"phone\":\"09949392932\"},\"currency\":\"PHP\",\"description\":\"BOSFDR - Cedula Request #118\",\"digital_withholding_vat_amount\":0,\"disputed\":false,\"external_reference_number\":\"5s8kX7x\",\"fee\":402,\"instant_settlement\":null,\"livemode\":false,\"net_amount\":15658,\"origin\":\"links\",\"payment_intent_id\":null,\"payout\":null,\"source\":{\"id\":\"src_JzSQErFoJGMcqK67zz22RHEt\",\"type\":\"gcash\",\"provider\":{\"id\":null},\"provider_id\":null},\"statement_descriptor\":\"BOSFDR\",\"status\":\"paid\",\"tax_amount\":null,\"metadata\":{\"pm_reference_number\":\"5s8kX7x\"},\"promotion\":null,\"refunds\":[],\"taxes\":[],\"available_at\":1753693200,\"created_at\":1753266742,\"credited_at\":1753837200,\"paid_at\":1753266742,\"updated_at\":1753266742}}}]}},\"previous_data\":{},\"pending_webhooks\":1,\"created_at\":1753266742,\"updated_at\":1753266742}}}',NULL,1,'2025-07-23 10:32:27',NULL,0,'2025-07-23 10:32:27'),(27,'evt_TcR4aTr7D3MFf2g2Edu2qx6e','payment.paid',NULL,NULL,'{\"data\":{\"id\":\"evt_TcR4aTr7D3MFf2g2Edu2qx6e\",\"type\":\"event\",\"attributes\":{\"type\":\"payment.paid\",\"livemode\":false,\"data\":{\"id\":\"pay_qakNqzyPKSULeHSALFoySAFU\",\"type\":\"payment\",\"attributes\":{\"access_url\":null,\"amount\":16060,\"balance_transaction_id\":\"bal_txn_jwQV37MG8M6jLiDzy82ZQWK4\",\"billing\":{\"address\":{\"city\":\"Taguig\",\"country\":\"PH\",\"line1\":\"12th floor The Trade and Financial Tower u1206\",\"line2\":\"32nd street and 7th Avenue\",\"postal_code\":\"1630\",\"state\":\"Bonifacio Global City\"},\"email\":\"vonchristian41@gmail.com\",\"name\":\"Mica Bit Pos\",\"phone\":\"09949392932\"},\"currency\":\"PHP\",\"description\":\"BOSFDR - Cedula Request #118\",\"digital_withholding_vat_amount\":0,\"disputed\":false,\"external_reference_number\":\"5s8kX7x\",\"fee\":402,\"instant_settlement\":null,\"livemode\":false,\"net_amount\":15658,\"origin\":\"links\",\"payment_intent_id\":null,\"payout\":null,\"source\":{\"id\":\"src_JzSQErFoJGMcqK67zz22RHEt\",\"type\":\"gcash\",\"provider\":{\"id\":null},\"provider_id\":null},\"statement_descriptor\":\"BOSFDR\",\"status\":\"paid\",\"tax_amount\":null,\"metadata\":{\"pm_reference_number\":\"5s8kX7x\"},\"promotion\":null,\"refunds\":[],\"taxes\":[],\"available_at\":1753693200,\"created_at\":1753266742,\"credited_at\":1753837200,\"paid_at\":1753266742,\"updated_at\":1753266742}},\"previous_data\":{},\"pending_webhooks\":1,\"created_at\":1753266742,\"updated_at\":1753266742}}}',NULL,1,'2025-07-23 10:32:27',NULL,0,'2025-07-23 10:32:27'),(28,'evt_NgoRSrANgdq9ZfiwAWDrhHSC','payment.paid',NULL,NULL,'{\"data\":{\"id\":\"evt_NgoRSrANgdq9ZfiwAWDrhHSC\",\"type\":\"event\",\"attributes\":{\"type\":\"payment.paid\",\"livemode\":false,\"data\":{\"id\":\"pay_kq2MHBCcp6VehdxE5ZJYo4Kz\",\"type\":\"payment\",\"attributes\":{\"access_url\":null,\"amount\":16060,\"balance_transaction_id\":\"bal_txn_5K9GuVbCpZJcY8PnpS9RP2p1\",\"billing\":{\"address\":{\"city\":\"Taguig\",\"country\":\"PH\",\"line1\":\"12th floor The Trade and Financial Tower u1206\",\"line2\":\"32nd street and 7th Avenue\",\"postal_code\":\"1630\",\"state\":\"Bonifacio Global City\"},\"email\":\"zuma76996@gmail.com\",\"name\":\"Rico Mayer\",\"phone\":\"09955958358\"},\"currency\":\"PHP\",\"description\":\"BOSFDR - Cedula Request #119\",\"digital_withholding_vat_amount\":0,\"disputed\":false,\"external_reference_number\":\"iYBs5vb\",\"fee\":402,\"instant_settlement\":null,\"livemode\":false,\"net_amount\":15658,\"origin\":\"links\",\"payment_intent_id\":null,\"payout\":null,\"source\":{\"id\":\"src_BmxrD6WX9YgXdF2Y68TpXuJ3\",\"type\":\"gcash\",\"provider\":{\"id\":null},\"provider_id\":null},\"statement_descriptor\":\"BOSFDR\",\"status\":\"paid\",\"tax_amount\":null,\"metadata\":{\"pm_reference_number\":\"iYBs5vb\"},\"promotion\":null,\"refunds\":[],\"taxes\":[],\"available_at\":1753866000,\"created_at\":1753619239,\"credited_at\":1754442000,\"paid_at\":1753619239,\"updated_at\":1753619239}},\"previous_data\":{},\"pending_webhooks\":2,\"created_at\":1753619239,\"updated_at\":1753619239}}}',NULL,1,'2025-07-27 12:27:20',NULL,0,'2025-07-27 12:27:20'),(29,'evt_1sMKB15UMqWuqcbD9wkBhFjo','link.payment.paid',NULL,NULL,'{\"data\":{\"id\":\"evt_1sMKB15UMqWuqcbD9wkBhFjo\",\"type\":\"event\",\"attributes\":{\"type\":\"link.payment.paid\",\"livemode\":false,\"data\":{\"id\":\"link_JwvKWk3vScxNi2oRaC268eNT\",\"type\":\"link\",\"attributes\":{\"amount\":16060,\"archived\":false,\"currency\":\"PHP\",\"description\":\"BOSFDR - Cedula Request #119\",\"livemode\":false,\"fee\":402,\"remarks\":null,\"status\":\"paid\",\"tax_amount\":null,\"taxes\":[],\"checkout_url\":\"https://pm.link/org-barangay-bula/test/iYBs5vb\",\"reference_number\":\"iYBs5vb\",\"created_at\":1753619205,\"updated_at\":1753619205,\"payments\":[{\"data\":{\"id\":\"pay_kq2MHBCcp6VehdxE5ZJYo4Kz\",\"type\":\"payment\",\"attributes\":{\"access_url\":null,\"amount\":16060,\"balance_transaction_id\":\"bal_txn_5K9GuVbCpZJcY8PnpS9RP2p1\",\"billing\":{\"address\":{\"city\":\"Taguig\",\"country\":\"PH\",\"line1\":\"12th floor The Trade and Financial Tower u1206\",\"line2\":\"32nd street and 7th Avenue\",\"postal_code\":\"1630\",\"state\":\"Bonifacio Global City\"},\"email\":\"zuma76996@gmail.com\",\"name\":\"Rico Mayer\",\"phone\":\"09955958358\"},\"currency\":\"PHP\",\"description\":\"BOSFDR - Cedula Request #119\",\"digital_withholding_vat_amount\":0,\"disputed\":false,\"external_reference_number\":\"iYBs5vb\",\"fee\":402,\"instant_settlement\":null,\"livemode\":false,\"net_amount\":15658,\"origin\":\"links\",\"payment_intent_id\":null,\"payout\":null,\"source\":{\"id\":\"src_BmxrD6WX9YgXdF2Y68TpXuJ3\",\"type\":\"gcash\",\"provider\":{\"id\":null},\"provider_id\":null},\"statement_descriptor\":\"BOSFDR\",\"status\":\"paid\",\"tax_amount\":null,\"metadata\":{\"pm_reference_number\":\"iYBs5vb\"},\"promotion\":null,\"refunds\":[],\"taxes\":[],\"available_at\":1753866000,\"created_at\":1753619239,\"credited_at\":1754442000,\"paid_at\":1753619239,\"updated_at\":1753619239}}}]}},\"previous_data\":{},\"pending_webhooks\":2,\"created_at\":1753619239,\"updated_at\":1753619239}}}',NULL,1,'2025-07-27 12:27:20',NULL,0,'2025-07-27 12:27:20'),(30,'evt_TtanoSSqRZazRCYDvW1QQC5K','payment.paid',NULL,NULL,'{\"data\":{\"id\":\"evt_TtanoSSqRZazRCYDvW1QQC5K\",\"type\":\"event\",\"attributes\":{\"type\":\"payment.paid\",\"livemode\":false,\"data\":{\"id\":\"pay_x4UxB1seK9oo8iwyxqEvtQLd\",\"type\":\"payment\",\"attributes\":{\"access_url\":null,\"amount\":15000,\"balance_transaction_id\":\"bal_txn_zjTRK9sUYWttcVC9gXSQGQwD\",\"billing\":{\"address\":{\"city\":\"Taguig\",\"country\":\"PH\",\"line1\":\"12th floor The Trade and Financial Tower u1206\",\"line2\":\"32nd street and 7th Avenue\",\"postal_code\":\"1630\",\"state\":\"Bonifacio Global City\"},\"email\":\"rhaijanaabdilah@gmail.com\",\"name\":\"Rhaijana Abdilah\",\"phone\":\"09526574063\"},\"currency\":\"PHP\",\"description\":\"BOSFDR - Barangay Clearance Request #190\",\"digital_withholding_vat_amount\":0,\"disputed\":false,\"external_reference_number\":\"3gfr4zC\",\"fee\":375,\"instant_settlement\":null,\"livemode\":false,\"net_amount\":14625,\"origin\":\"links\",\"payment_intent_id\":null,\"payout\":null,\"source\":{\"id\":\"src_WPXZjaPLLe8iDCHckuk2Dq9N\",\"type\":\"gcash\",\"provider\":{\"id\":null},\"provider_id\":null},\"statement_descriptor\":\"BOSFDR\",\"status\":\"paid\",\"tax_amount\":null,\"metadata\":{\"pm_reference_number\":\"3gfr4zC\"},\"promotion\":null,\"refunds\":[],\"taxes\":[],\"available_at\":1758272400,\"created_at\":1758038620,\"credited_at\":1758675600,\"paid_at\":1758038620,\"updated_at\":1758038620}},\"previous_data\":{},\"pending_webhooks\":1,\"created_at\":1758038620,\"updated_at\":1758038620}}}',NULL,1,'2025-09-16 16:03:39',NULL,0,'2025-09-16 16:03:39'),(31,'evt_fzAawUyApGobgxQccABxpdZf','link.payment.paid',NULL,NULL,'{\"data\":{\"id\":\"evt_fzAawUyApGobgxQccABxpdZf\",\"type\":\"event\",\"attributes\":{\"type\":\"link.payment.paid\",\"livemode\":false,\"data\":{\"id\":\"link_6o1v8V5u8dB1x9wqzxbFC6MV\",\"type\":\"link\",\"attributes\":{\"amount\":15000,\"archived\":false,\"currency\":\"PHP\",\"description\":\"BOSFDR - Barangay Clearance Request #190\",\"livemode\":false,\"fee\":375,\"remarks\":null,\"status\":\"paid\",\"tax_amount\":null,\"taxes\":[],\"checkout_url\":\"https://pm.link/org-barangay-bula/test/3gfr4zC\",\"reference_number\":\"3gfr4zC\",\"created_at\":1758038562,\"updated_at\":1758038562,\"payments\":[{\"data\":{\"id\":\"pay_x4UxB1seK9oo8iwyxqEvtQLd\",\"type\":\"payment\",\"attributes\":{\"access_url\":null,\"amount\":15000,\"balance_transaction_id\":\"bal_txn_zjTRK9sUYWttcVC9gXSQGQwD\",\"billing\":{\"address\":{\"city\":\"Taguig\",\"country\":\"PH\",\"line1\":\"12th floor The Trade and Financial Tower u1206\",\"line2\":\"32nd street and 7th Avenue\",\"postal_code\":\"1630\",\"state\":\"Bonifacio Global City\"},\"email\":\"rhaijanaabdilah@gmail.com\",\"name\":\"Rhaijana Abdilah\",\"phone\":\"09526574063\"},\"currency\":\"PHP\",\"description\":\"BOSFDR - Barangay Clearance Request #190\",\"digital_withholding_vat_amount\":0,\"disputed\":false,\"external_reference_number\":\"3gfr4zC\",\"fee\":375,\"instant_settlement\":null,\"livemode\":false,\"net_amount\":14625,\"origin\":\"links\",\"payment_intent_id\":null,\"payout\":null,\"source\":{\"id\":\"src_WPXZjaPLLe8iDCHckuk2Dq9N\",\"type\":\"gcash\",\"provider\":{\"id\":null},\"provider_id\":null},\"statement_descriptor\":\"BOSFDR\",\"status\":\"paid\",\"tax_amount\":null,\"metadata\":{\"pm_reference_number\":\"3gfr4zC\"},\"promotion\":null,\"refunds\":[],\"taxes\":[],\"available_at\":1758272400,\"created_at\":1758038620,\"credited_at\":1758675600,\"paid_at\":1758038620,\"updated_at\":1758038620}}}]}},\"previous_data\":{},\"pending_webhooks\":1,\"created_at\":1758038620,\"updated_at\":1758038620}}}',NULL,1,'2025-09-16 16:03:40',NULL,0,'2025-09-16 16:03:40'),(32,'evt_wsiaBMZErUM2FsmoAfXCsho7','payment.paid',NULL,NULL,'{\"data\":{\"id\":\"evt_wsiaBMZErUM2FsmoAfXCsho7\",\"type\":\"event\",\"attributes\":{\"type\":\"payment.paid\",\"livemode\":false,\"data\":{\"id\":\"pay_sPF7zpNyR9LjSW6aEcepFrQd\",\"type\":\"payment\",\"attributes\":{\"access_url\":null,\"amount\":10000,\"balance_transaction_id\":\"bal_txn_smqdWPwRNLcRbUrtfHTQSV8H\",\"billing\":{\"address\":{\"city\":\"Taguig\",\"country\":\"PH\",\"line1\":\"12th floor The Trade and Financial Tower u1206\",\"line2\":\"32nd street and 7th Avenue\",\"postal_code\":\"1630\",\"state\":\"Bonifacio Global City\"},\"email\":\"torukamiya1@gmail.com\",\"name\":\"Eva\",\"phone\":\"09955958358\"},\"currency\":\"PHP\",\"description\":\"BOSFDR - Cedula Request #193\",\"digital_withholding_vat_amount\":0,\"disputed\":false,\"external_reference_number\":\"gu7v1tF\",\"fee\":250,\"instant_settlement\":null,\"livemode\":false,\"net_amount\":9750,\"origin\":\"links\",\"payment_intent_id\":null,\"payout\":null,\"source\":{\"id\":\"src_VBfPhgRiCjQQp3QTffM9mC1Z\",\"type\":\"gcash\",\"provider\":{\"id\":null},\"provider_id\":null},\"statement_descriptor\":\"BOSFDR\",\"status\":\"paid\",\"tax_amount\":null,\"metadata\":{\"pm_reference_number\":\"gu7v1tF\"},\"promotion\":null,\"refunds\":[],\"taxes\":[],\"available_at\":1759395600,\"created_at\":1759205371,\"credited_at\":1759885200,\"paid_at\":1759205371,\"updated_at\":1759205371}},\"previous_data\":{},\"pending_webhooks\":1,\"created_at\":1759205371,\"updated_at\":1759205371}}}',NULL,1,'2025-09-30 04:09:32',NULL,0,'2025-09-30 04:09:32'),(33,'evt_PwRJ51GNCgSBsJdH3k3bCBoU','link.payment.paid',NULL,NULL,'{\"data\":{\"id\":\"evt_PwRJ51GNCgSBsJdH3k3bCBoU\",\"type\":\"event\",\"attributes\":{\"type\":\"link.payment.paid\",\"livemode\":false,\"data\":{\"id\":\"link_YzkuwRuNMTxuDifRc3jr6cVz\",\"type\":\"link\",\"attributes\":{\"amount\":10000,\"archived\":false,\"currency\":\"PHP\",\"description\":\"BOSFDR - Cedula Request #193\",\"livemode\":false,\"fee\":250,\"remarks\":null,\"status\":\"paid\",\"tax_amount\":null,\"taxes\":[],\"checkout_url\":\"https://pm.link/org-barangay-bula/test/gu7v1tF\",\"reference_number\":\"gu7v1tF\",\"created_at\":1759205338,\"updated_at\":1759205338,\"payments\":[{\"data\":{\"id\":\"pay_sPF7zpNyR9LjSW6aEcepFrQd\",\"type\":\"payment\",\"attributes\":{\"access_url\":null,\"amount\":10000,\"balance_transaction_id\":\"bal_txn_smqdWPwRNLcRbUrtfHTQSV8H\",\"billing\":{\"address\":{\"city\":\"Taguig\",\"country\":\"PH\",\"line1\":\"12th floor The Trade and Financial Tower u1206\",\"line2\":\"32nd street and 7th Avenue\",\"postal_code\":\"1630\",\"state\":\"Bonifacio Global City\"},\"email\":\"torukamiya1@gmail.com\",\"name\":\"Eva\",\"phone\":\"09955958358\"},\"currency\":\"PHP\",\"description\":\"BOSFDR - Cedula Request #193\",\"digital_withholding_vat_amount\":0,\"disputed\":false,\"external_reference_number\":\"gu7v1tF\",\"fee\":250,\"instant_settlement\":null,\"livemode\":false,\"net_amount\":9750,\"origin\":\"links\",\"payment_intent_id\":null,\"payout\":null,\"source\":{\"id\":\"src_VBfPhgRiCjQQp3QTffM9mC1Z\",\"type\":\"gcash\",\"provider\":{\"id\":null},\"provider_id\":null},\"statement_descriptor\":\"BOSFDR\",\"status\":\"paid\",\"tax_amount\":null,\"metadata\":{\"pm_reference_number\":\"gu7v1tF\"},\"promotion\":null,\"refunds\":[],\"taxes\":[],\"available_at\":1759395600,\"created_at\":1759205371,\"credited_at\":1759885200,\"paid_at\":1759205371,\"updated_at\":1759205371}}}]}},\"previous_data\":{},\"pending_webhooks\":1,\"created_at\":1759205371,\"updated_at\":1759205371}}}',NULL,1,'2025-09-30 04:09:32',NULL,0,'2025-09-30 04:09:32');
/*!40000 ALTER TABLE `payment_webhooks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `pending_residency_verifications`
--

DROP TABLE IF EXISTS `pending_residency_verifications`;
/*!50001 DROP VIEW IF EXISTS `pending_residency_verifications`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `pending_residency_verifications` AS SELECT 
 1 AS `account_id`,
 1 AS `username`,
 1 AS `account_status`,
 1 AS `registration_date`,
 1 AS `first_name`,
 1 AS `middle_name`,
 1 AS `last_name`,
 1 AS `email`,
 1 AS `phone_number`,
 1 AS `barangay`,
 1 AS `city_municipality`,
 1 AS `province`,
 1 AS `years_of_residency`,
 1 AS `months_of_residency`,
 1 AS `document_count`,
 1 AS `latest_document_upload`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `pickup_schedules`
--

DROP TABLE IF EXISTS `pickup_schedules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pickup_schedules` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `request_id` int(11) NOT NULL,
  `authorized_pickup_person_id` int(11) DEFAULT NULL,
  `scheduled_date` date NOT NULL,
  `scheduled_time_start` time NOT NULL,
  `scheduled_time_end` time NOT NULL,
  `pickup_notes` text DEFAULT NULL,
  `scheduled_by` int(11) NOT NULL,
  `client_confirmed` tinyint(1) DEFAULT 0,
  `client_confirmed_at` timestamp NULL DEFAULT NULL,
  `actual_pickup_at` timestamp NULL DEFAULT NULL,
  `picked_up_by_name` varchar(200) DEFAULT NULL,
  `picked_up_by_id_type` varchar(50) DEFAULT NULL,
  `picked_up_by_id_number` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `request_id` (`request_id`),
  KEY `scheduled_by` (`scheduled_by`),
  KEY `idx_scheduled_date` (`scheduled_date`),
  KEY `idx_actual_pickup` (`actual_pickup_at`),
  KEY `fk_pickup_authorized_person` (`authorized_pickup_person_id`),
  CONSTRAINT `fk_pickup_authorized_person` FOREIGN KEY (`authorized_pickup_person_id`) REFERENCES `authorized_pickup_persons` (`id`),
  CONSTRAINT `pickup_schedules_ibfk_1` FOREIGN KEY (`request_id`) REFERENCES `document_requests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `pickup_schedules_ibfk_2` FOREIGN KEY (`scheduled_by`) REFERENCES `admin_employee_accounts` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pickup_schedules`
--

LOCK TABLES `pickup_schedules` WRITE;
/*!40000 ALTER TABLE `pickup_schedules` DISABLE KEYS */;
/*!40000 ALTER TABLE `pickup_schedules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purpose_categories`
--

DROP TABLE IF EXISTS `purpose_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purpose_categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `category_name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purpose_categories`
--

LOCK TABLES `purpose_categories` WRITE;
/*!40000 ALTER TABLE `purpose_categories` DISABLE KEYS */;
INSERT INTO `purpose_categories` VALUES (1,'Employment','For job application or employment purposes',1,'2025-06-08 08:27:00'),(2,'Business Registration','For business license or registration',1,'2025-06-08 08:27:00'),(3,'Travel/Visa','For travel documents or visa application',1,'2025-06-08 08:27:00'),(5,'Government Transaction','For other government-related transactions',1,'2025-06-08 08:27:00'),(6,'Bank Account','For opening bank accounts',1,'2025-06-08 08:27:00'),(7,'Insurance','For insurance applications',1,'2025-06-08 08:27:00'),(8,'Legal Proceedings','For court or legal matters',1,'2025-06-08 08:27:00'),(9,'Loan Application','For loan or credit applications',1,'2025-06-08 08:27:00'),(10,'Other','Other purposes not listed above',1,'2025-06-08 08:27:00');
/*!40000 ALTER TABLE `purpose_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `receipts`
--

DROP TABLE IF EXISTS `receipts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `receipts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `transaction_id` int(11) NOT NULL,
  `client_id` int(11) NOT NULL,
  `request_id` int(11) NOT NULL,
  `receipt_number` varchar(100) NOT NULL,
  `client_name` varchar(255) NOT NULL,
  `client_email` varchar(100) DEFAULT NULL,
  `client_phone` varchar(20) DEFAULT NULL,
  `request_number` varchar(100) NOT NULL,
  `document_type` varchar(100) NOT NULL,
  `payment_method` varchar(50) NOT NULL,
  `payment_method_code` varchar(20) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `processing_fee` decimal(10,2) DEFAULT 0.00,
  `net_amount` decimal(10,2) NOT NULL,
  `currency` varchar(3) DEFAULT 'PHP',
  `external_transaction_id` varchar(100) DEFAULT NULL,
  `paymongo_payment_intent_id` varchar(100) DEFAULT NULL,
  `payment_status` enum('pending','processing','succeeded','failed','cancelled','refunded') DEFAULT 'succeeded',
  `receipt_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `payment_date` timestamp NULL DEFAULT NULL,
  `description` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `receipt_number` (`receipt_number`),
  KEY `idx_client_id` (`client_id`),
  KEY `idx_request_id` (`request_id`),
  KEY `idx_transaction_id` (`transaction_id`),
  KEY `idx_receipt_number` (`receipt_number`),
  KEY `idx_receipt_date` (`receipt_date`),
  KEY `idx_payment_status` (`payment_status`),
  KEY `idx_external_transaction_id` (`external_transaction_id`),
  KEY `idx_receipts_client_date` (`client_id`,`receipt_date`),
  KEY `idx_receipts_status_date` (`payment_status`,`receipt_date`),
  CONSTRAINT `receipts_ibfk_1` FOREIGN KEY (`transaction_id`) REFERENCES `payment_transactions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `receipts_ibfk_2` FOREIGN KEY (`client_id`) REFERENCES `client_accounts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `receipts_ibfk_3` FOREIGN KEY (`request_id`) REFERENCES `document_requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `receipts`
--

LOCK TABLES `receipts` WRITE;
/*!40000 ALTER TABLE `receipts` DISABLE KEYS */;
INSERT INTO `receipts` VALUES (1,86,59,190,'RCP-253216-000086','Rhaijana Abdilah','rhaijanaabdilah@gmail.com','09526574063','BC-2025-000001','Barangay Clearance','Online Payment Via PayMongo','PAYMONGO_CARD',150.00,0.00,150.00,'PHP','link_6o1v8V5u8dB1x9wqzxbFC6MV','link_6o1v8V5u8dB1x9wqzxbFC6MV','succeeded','2025-09-19 02:34:13','2025-09-19 02:34:13','BOSFDR - Barangay Clearance Request #190',NULL,'2025-09-19 02:34:13','2025-09-19 02:34:13'),(2,87,70,193,'RCP-00000087','Eva Chua','torukamiya1@gmail.com','09955958358','CED-2025-000003','Cedula','Online Payment Via PayMongo','PAYMONGO_CARD',100.00,0.00,100.00,'PHP','pay_sPF7zpNyR9LjSW6aEcepFrQd','link_YzkuwRuNMTxuDifRc3jr6cVz','succeeded','2025-09-30 04:09:31','2025-09-30 04:09:31','BOSFDR - Cedula Request #193',NULL,'2025-09-30 04:09:32','2025-09-30 04:09:32');
/*!40000 ALTER TABLE `receipts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `request_status`
--

DROP TABLE IF EXISTS `request_status`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `request_status` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `status_name` varchar(30) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `status_name` (`status_name`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `request_status`
--

LOCK TABLES `request_status` WRITE;
/*!40000 ALTER TABLE `request_status` DISABLE KEYS */;
INSERT INTO `request_status` VALUES (1,'pending','Request submitted and pending review','2025-06-08 08:27:00'),(2,'under_review','Request is being reviewed by staff','2025-06-08 08:27:00'),(4,'approved','Request approved and ready for processing','2025-06-08 08:27:00'),(5,'processing','Document is being prepared','2025-06-08 08:27:00'),(6,'ready_for_pickup','Document is ready for pickup','2025-06-08 08:27:00'),(7,'completed','Request completed successfully','2025-06-08 08:27:00'),(8,'cancelled','Request cancelled by client','2025-06-08 08:27:00'),(9,'rejected','Request rejected by authority','2025-06-08 08:27:00'),(11,'payment_confirmed','Payment verified and confirmed','2025-07-13 07:24:38');
/*!40000 ALTER TABLE `request_status` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `request_status_history`
--

DROP TABLE IF EXISTS `request_status_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `request_status_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `request_id` int(11) NOT NULL,
  `old_status_id` int(11) DEFAULT NULL,
  `new_status_id` int(11) NOT NULL,
  `changed_by` int(11) NOT NULL,
  `change_reason` text DEFAULT NULL,
  `changed_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `old_status_id` (`old_status_id`),
  KEY `new_status_id` (`new_status_id`),
  KEY `changed_by` (`changed_by`),
  KEY `idx_request_id` (`request_id`),
  KEY `idx_changed_at` (`changed_at`),
  CONSTRAINT `request_status_history_ibfk_1` FOREIGN KEY (`request_id`) REFERENCES `document_requests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `request_status_history_ibfk_2` FOREIGN KEY (`old_status_id`) REFERENCES `request_status` (`id`),
  CONSTRAINT `request_status_history_ibfk_3` FOREIGN KEY (`new_status_id`) REFERENCES `request_status` (`id`),
  CONSTRAINT `request_status_history_ibfk_4` FOREIGN KEY (`changed_by`) REFERENCES `admin_employee_accounts` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=182 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `request_status_history`
--

LOCK TABLES `request_status_history` WRITE;
/*!40000 ALTER TABLE `request_status_history` DISABLE KEYS */;
INSERT INTO `request_status_history` VALUES (159,189,1,4,32,NULL,'2025-09-16 15:33:58'),(160,189,1,4,32,NULL,'2025-09-16 15:34:00'),(161,190,1,4,32,NULL,'2025-09-16 15:38:46'),(162,190,4,11,32,'SYSTEM: Payment confirmed via PayMongo webhook','2025-09-16 16:03:40'),(163,190,11,11,32,'SYSTEM: Payment confirmed via PayMongo webhook','2025-09-16 16:03:40'),(164,190,11,5,32,NULL,'2025-09-16 16:04:10'),(165,190,5,6,32,NULL,'2025-09-16 16:04:59'),(166,190,6,7,32,NULL,'2025-09-16 16:06:06'),(167,191,1,4,32,NULL,'2025-09-17 16:03:32'),(168,191,4,5,32,NULL,'2025-09-17 17:12:00'),(169,191,5,6,32,NULL,'2025-09-17 17:15:17'),(170,191,6,7,32,NULL,'2025-09-17 17:16:19'),(171,189,4,11,32,NULL,'2025-09-29 16:33:32'),(172,190,11,5,32,NULL,'2025-09-29 16:34:04'),(173,190,5,6,32,NULL,'2025-09-29 16:34:31'),(174,190,6,7,32,NULL,'2025-09-29 16:34:55'),(176,193,1,4,32,NULL,'2025-09-30 04:08:28'),(177,193,4,11,32,'SYSTEM: Payment confirmed via PayMongo webhook','2025-09-30 04:09:31'),(178,193,11,11,32,'SYSTEM: Payment confirmed via PayMongo webhook','2025-09-30 04:09:32'),(179,193,11,5,32,NULL,'2025-09-30 04:10:28'),(180,193,5,6,32,NULL,'2025-09-30 04:10:49'),(181,193,6,7,32,NULL,'2025-09-30 04:11:02');
/*!40000 ALTER TABLE `request_status_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `residency_documents`
--

DROP TABLE IF EXISTS `residency_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `residency_documents` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `account_id` int(11) NOT NULL,
  `document_type` enum('utility_bill','barangay_certificate','valid_id','lease_contract','other') NOT NULL,
  `document_name` varchar(255) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_size` int(11) DEFAULT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `verification_status` enum('pending','approved','rejected') DEFAULT 'pending',
  `verified_by` int(11) DEFAULT NULL,
  `verified_at` timestamp NULL DEFAULT NULL,
  `rejection_reason` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `verified_by` (`verified_by`),
  KEY `idx_account_id` (`account_id`),
  KEY `idx_verification_status` (`verification_status`),
  KEY `idx_document_type` (`document_type`),
  CONSTRAINT `residency_documents_ibfk_1` FOREIGN KEY (`account_id`) REFERENCES `client_accounts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `residency_documents_ibfk_2` FOREIGN KEY (`verified_by`) REFERENCES `admin_employee_accounts` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=46 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `residency_documents`
--

LOCK TABLES `residency_documents` WRITE;
/*!40000 ALTER TABLE `residency_documents` DISABLE KEYS */;
INSERT INTO `residency_documents` VALUES (19,59,'utility_bill','images (1).png','1758036429647_59_document_images__1_.png',6426,'image/png','approved',32,'2025-09-16 15:28:30',NULL,'2025-09-16 15:27:09','2025-09-16 15:28:30'),(20,59,'barangay_certificate','thumb_1200_1553.png','1758036429647_59_document_thumb_1200_1553.png',619105,'image/png','approved',32,'2025-09-16 15:28:30',NULL,'2025-09-16 15:27:09','2025-09-16 15:28:30'),(21,59,'valid_id','GOV_ID.jpg','1758036429654_59_document_GOV_ID.jpg',110985,'image/jpeg','approved',32,'2025-09-16 15:28:30',NULL,'2025-09-16 15:27:09','2025-09-16 15:28:30'),(22,59,'lease_contract','prof_of_residency.png','1758036429656_59_document_prof_of_residency.png',619105,'image/png','approved',32,'2025-09-16 15:28:30',NULL,'2025-09-16 15:27:09','2025-09-16 15:28:30'),(23,59,'other','images (1).png','1758036429672_59_document_images__1_.png',6426,'image/png','approved',32,'2025-09-16 15:28:30',NULL,'2025-09-16 15:27:09','2025-09-16 15:28:30'),(24,60,'utility_bill','electricity_bill.png','1758124599847_60_document_electricity_bill.png',670886,'image/png','approved',32,'2025-09-17 15:58:50',NULL,'2025-09-17 15:56:39','2025-09-17 15:58:50'),(25,60,'valid_id','Screenshot 2025-09-17 235554.png','1758124599906_60_document_Screenshot_2025_09_17_235554.png',493130,'image/png','approved',32,'2025-09-17 15:58:50',NULL,'2025-09-17 15:56:40','2025-09-17 15:58:50'),(35,69,'utility_bill','electricity_bill.png','1758140342620_69_document_electricity_bill.png',670886,'image/png','approved',32,'2025-09-19 01:49:02',NULL,'2025-09-17 20:19:02','2025-09-19 01:49:02'),(36,70,'valid_id','valid-id-sample.jpg','1759204470473_70_document_valid_id_sample.jpg',17858,'image/jpeg','approved',32,'2025-09-30 03:57:29',NULL,'2025-09-30 03:54:30','2025-09-30 03:57:29'),(37,71,'valid_id','valid-id-sample.jpg','1759227583754_71_document_valid_id_sample.jpg',17858,'image/jpeg','pending',NULL,NULL,NULL,'2025-09-30 10:19:43','2025-09-30 10:19:43'),(42,76,'valid_id','valid-id-sample.jpg','1759230200518_76_document_valid_id_sample.jpg',17858,'image/jpeg','pending',NULL,NULL,NULL,'2025-09-30 11:03:20','2025-09-30 11:03:20'),(44,78,'valid_id','valid-id-sample.jpg','1759232083880_78_document_valid_id_sample.jpg',17858,'image/jpeg','pending',NULL,NULL,NULL,'2025-09-30 11:34:43','2025-09-30 11:34:43'),(45,79,'valid_id','valid-id-sample.jpg','1759232344467_79_document_valid_id_sample.jpg',17858,'image/jpeg','pending',NULL,NULL,NULL,'2025-09-30 11:39:04','2025-09-30 11:39:04');
/*!40000 ALTER TABLE `residency_documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `supporting_documents`
--

DROP TABLE IF EXISTS `supporting_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `supporting_documents` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `request_id` int(11) NOT NULL,
  `document_name` varchar(200) NOT NULL,
  `document_type` varchar(100) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_size` int(11) DEFAULT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `uploaded_by` int(11) NOT NULL,
  `is_verified` tinyint(1) DEFAULT 0,
  `verified_by` int(11) DEFAULT NULL,
  `verified_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `uploaded_by` (`uploaded_by`),
  KEY `verified_by` (`verified_by`),
  KEY `idx_request_id` (`request_id`),
  KEY `idx_document_type` (`document_type`),
  CONSTRAINT `supporting_documents_ibfk_1` FOREIGN KEY (`request_id`) REFERENCES `document_requests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `supporting_documents_ibfk_2` FOREIGN KEY (`uploaded_by`) REFERENCES `client_accounts` (`id`),
  CONSTRAINT `supporting_documents_ibfk_3` FOREIGN KEY (`verified_by`) REFERENCES `admin_employee_accounts` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=67 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `supporting_documents`
--

LOCK TABLES `supporting_documents` WRITE;
/*!40000 ALTER TABLE `supporting_documents` DISABLE KEYS */;
INSERT INTO `supporting_documents` VALUES (64,190,'GOV_ID.jpg','government_id','D:\\sept16_cap2_rhai_front_and_back\\cap2_rhai_front_and_back\\rhai_backend\\uploads\\documents\\1758037086638_190_government_id_GOV_ID.jpg',110985,'image/jpeg',59,0,NULL,NULL,'2025-09-16 15:38:06'),(65,190,'prof_of_residency.png','proof_of_residency','D:\\sept16_cap2_rhai_front_and_back\\cap2_rhai_front_and_back\\rhai_backend\\uploads\\documents\\1758037086639_190_proof_of_residency_prof_of_residency.png',619105,'image/png',59,0,NULL,NULL,'2025-09-16 15:38:06'),(66,190,'cedula.jpg','cedula','D:\\sept16_cap2_rhai_front_and_back\\cap2_rhai_front_and_back\\rhai_backend\\uploads\\documents\\1758037086644_190_cedula_cedula.jpg',12789,'image/jpeg',59,0,NULL,NULL,'2025-09-16 15:38:06');
/*!40000 ALTER TABLE `supporting_documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `system_settings`
--

DROP TABLE IF EXISTS `system_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `system_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text DEFAULT NULL,
  `setting_type` enum('string','number','boolean','json') DEFAULT 'string',
  `description` text DEFAULT NULL,
  `is_public` tinyint(1) DEFAULT 0,
  `updated_by` int(11) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `setting_key` (`setting_key`),
  KEY `updated_by` (`updated_by`),
  KEY `idx_setting_key` (`setting_key`),
  CONSTRAINT `system_settings_ibfk_1` FOREIGN KEY (`updated_by`) REFERENCES `admin_employee_accounts` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `system_settings`
--

LOCK TABLES `system_settings` WRITE;
/*!40000 ALTER TABLE `system_settings` DISABLE KEYS */;
INSERT INTO `system_settings` VALUES (1,'system_name','Barangay Management System','string','Name of the system',1,NULL,'2025-06-08 08:27:00'),(2,'barangay_name','Barangay Sample','string','Name of the barangay',1,NULL,'2025-06-08 08:27:00'),(3,'barangay_address','Sample Address, City, Province','string','Complete address of barangay',1,NULL,'2025-06-08 08:27:00'),(4,'barangay_contact','+63 123 456 7890','string','Contact number of barangay',1,NULL,'2025-06-08 08:27:00'),(5,'barangay_email','sample@barangay.gov.ph','string','Email address of barangay',1,NULL,'2025-06-08 08:27:00'),(6,'cedula_base_fee','30.00','number','Base fee for cedula',0,NULL,'2025-06-08 08:27:00'),(7,'clearance_base_fee','150.00','number','Base fee for barangay clearance',0,NULL,'2025-07-15 12:31:01'),(8,'processing_days_cedula','3','number','Standard processing days for cedula',1,NULL,'2025-06-08 08:27:00'),(9,'processing_days_clearance','5','number','Standard processing days for clearance',1,NULL,'2025-06-08 08:27:00'),(10,'max_file_upload_size','5242880','number','Maximum file upload size in bytes (5MB)',0,NULL,'2025-06-08 08:27:00'),(11,'allowed_file_types','[\"jpg\",\"jpeg\",\"png\",\"pdf\",\"doc\",\"docx\"]','json','Allowed file types for upload',0,NULL,'2025-06-08 08:27:00'),(12,'paymongo_public_key','pk_test_your_public_key_here','string','PayMongo public key for frontend',0,NULL,'2025-06-08 08:27:00'),(13,'paymongo_secret_key','sk_test_your_secret_key_here','string','PayMongo secret key for backend',0,NULL,'2025-06-08 08:27:00'),(14,'paymongo_webhook_secret','whsec_your_webhook_secret_here','string','PayMongo webhook secret for verification',0,NULL,'2025-06-08 08:27:00'),(15,'enable_online_payments','true','boolean','Enable or disable online payment options',1,NULL,'2025-06-08 08:27:00'),(16,'payment_timeout_minutes','30','number','Payment session timeout in minutes',0,NULL,'2025-06-08 08:27:00');
/*!40000 ALTER TABLE `system_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `v_client_complete`
--

DROP TABLE IF EXISTS `v_client_complete`;
/*!50001 DROP VIEW IF EXISTS `v_client_complete`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_client_complete` AS SELECT 
 1 AS `account_id`,
 1 AS `username`,
 1 AS `account_status`,
 1 AS `email_verified`,
 1 AS `phone_verified`,
 1 AS `profile_id`,
 1 AS `full_name`,
 1 AS `first_name`,
 1 AS `middle_name`,
 1 AS `last_name`,
 1 AS `suffix`,
 1 AS `birth_date`,
 1 AS `age`,
 1 AS `gender`,
 1 AS `civil_status`,
 1 AS `nationality`,
 1 AS `phone_number`,
 1 AS `email`,
 1 AS `complete_address`,
 1 AS `barangay`,
 1 AS `city_municipality`,
 1 AS `province`,
 1 AS `years_of_residency`,
 1 AS `months_of_residency`,
 1 AS `is_verified`,
 1 AS `verified_at`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_document_requests_complete`
--

DROP TABLE IF EXISTS `v_document_requests_complete`;
/*!50001 DROP VIEW IF EXISTS `v_document_requests_complete`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_document_requests_complete` AS SELECT 
 1 AS `request_id`,
 1 AS `request_number`,
 1 AS `document_type`,
 1 AS `purpose_category`,
 1 AS `purpose_details`,
 1 AS `current_status`,
 1 AS `priority`,
 1 AS `total_fee`,
 1 AS `base_fee`,
 1 AS `payment_status`,
 1 AS `payment_method`,
 1 AS `is_online_payment`,
 1 AS `payment_reference`,
 1 AS `payment_provider_reference`,
 1 AS `paid_at`,
 1 AS `delivery_method`,
 1 AS `requested_at`,
 1 AS `target_completion_date`,
 1 AS `completed_at`,
 1 AS `client_name`,
 1 AS `client_phone`,
 1 AS `client_email`,
 1 AS `client_address`,
 1 AS `processed_by_name`,
 1 AS `approved_by_name`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_document_requests_with_beneficiary`
--

DROP TABLE IF EXISTS `v_document_requests_with_beneficiary`;
/*!50001 DROP VIEW IF EXISTS `v_document_requests_with_beneficiary`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_document_requests_with_beneficiary` AS SELECT 
 1 AS `id`,
 1 AS `request_number`,
 1 AS `client_id`,
 1 AS `is_third_party_request`,
 1 AS `document_type_id`,
 1 AS `purpose_category_id`,
 1 AS `purpose_details`,
 1 AS `requestor_notes`,
 1 AS `status_id`,
 1 AS `priority`,
 1 AS `processed_by`,
 1 AS `approved_by`,
 1 AS `processed_at`,
 1 AS `approved_at`,
 1 AS `base_fee`,
 1 AS `total_document_fee`,
 1 AS `payment_method_id`,
 1 AS `payment_status`,
 1 AS `payment_reference`,
 1 AS `payment_provider_reference`,
 1 AS `paid_at`,
 1 AS `delivery_method`,
 1 AS `delivery_address`,
 1 AS `requested_at`,
 1 AS `target_completion_date`,
 1 AS `completed_at`,
 1 AS `created_at`,
 1 AS `updated_at`,
 1 AS `document_type`,
 1 AS `purpose_category`,
 1 AS `status`,
 1 AS `payment_method`,
 1 AS `requestor_name`,
 1 AS `requestor_email`,
 1 AS `requestor_phone`,
 1 AS `beneficiary_name`,
 1 AS `beneficiary_email`,
 1 AS `beneficiary_phone`,
 1 AS `relationship_to_requestor`,
 1 AS `pickup_person_name`,
 1 AS `pickup_person_phone`,
 1 AS `pickup_person_id_type`,
 1 AS `pickup_person_id_number`,
 1 AS `pickup_person_relationship`,
 1 AS `pickup_authorization_verified`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_payment_audit_trail`
--

DROP TABLE IF EXISTS `v_payment_audit_trail`;
/*!50001 DROP VIEW IF EXISTS `v_payment_audit_trail`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_payment_audit_trail` AS SELECT 
 1 AS `transaction_id`,
 1 AS `reference_number`,
 1 AS `request_number`,
 1 AS `document_name`,
 1 AS `payment_method`,
 1 AS `amount`,
 1 AS `processing_fee`,
 1 AS `net_amount`,
 1 AS `payment_status`,
 1 AS `initiated_at`,
 1 AS `verified_at`,
 1 AS `receipt_number`,
 1 AS `verification_notes`,
 1 AS `client_name`,
 1 AS `verified_by_name`,
 1 AS `payment_type`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_payment_transactions_complete`
--

DROP TABLE IF EXISTS `v_payment_transactions_complete`;
/*!50001 DROP VIEW IF EXISTS `v_payment_transactions_complete`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_payment_transactions_complete` AS SELECT 
 1 AS `transaction_id`,
 1 AS `internal_transaction_id`,
 1 AS `external_transaction_id`,
 1 AS `paymongo_payment_intent_id`,
 1 AS `request_number`,
 1 AS `request_id`,
 1 AS `client_name`,
 1 AS `client_email`,
 1 AS `client_phone`,
 1 AS `payment_method`,
 1 AS `payment_method_code`,
 1 AS `amount`,
 1 AS `processing_fee`,
 1 AS `net_amount`,
 1 AS `currency`,
 1 AS `payment_status`,
 1 AS `failure_reason`,
 1 AS `initiated_at`,
 1 AS `completed_at`,
 1 AS `expires_at`,
 1 AS `document_type`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_payment_verification_queue`
--

DROP TABLE IF EXISTS `v_payment_verification_queue`;
/*!50001 DROP VIEW IF EXISTS `v_payment_verification_queue`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_payment_verification_queue` AS SELECT 
 1 AS `request_id`,
 1 AS `request_number`,
 1 AS `status_id`,
 1 AS `status_name`,
 1 AS `document_name`,
 1 AS `base_fee`,
 1 AS `payment_method`,
 1 AS `requires_verification`,
 1 AS `client_name`,
 1 AS `client_email`,
 1 AS `request_date`,
 1 AS `approved_at`,
 1 AS `payment_status`,
 1 AS `transaction_id`,
 1 AS `payment_amount`,
 1 AS `transaction_status`,
 1 AS `verified_by`,
 1 AS `verified_at`,
 1 AS `receipt_number`,
 1 AS `verified_by_name`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_receipts_complete`
--

DROP TABLE IF EXISTS `v_receipts_complete`;
/*!50001 DROP VIEW IF EXISTS `v_receipts_complete`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_receipts_complete` AS SELECT 
 1 AS `id`,
 1 AS `transaction_id`,
 1 AS `client_id`,
 1 AS `request_id`,
 1 AS `receipt_number`,
 1 AS `client_name`,
 1 AS `client_email`,
 1 AS `client_phone`,
 1 AS `request_number`,
 1 AS `document_type`,
 1 AS `payment_method`,
 1 AS `payment_method_code`,
 1 AS `amount`,
 1 AS `processing_fee`,
 1 AS `net_amount`,
 1 AS `currency`,
 1 AS `external_transaction_id`,
 1 AS `paymongo_payment_intent_id`,
 1 AS `payment_status`,
 1 AS `receipt_date`,
 1 AS `payment_date`,
 1 AS `description`,
 1 AS `notes`,
 1 AS `created_at`,
 1 AS `updated_at`,
 1 AS `payment_initiated_at`,
 1 AS `payment_completed_at`,
 1 AS `request_status_id`,
 1 AS `request_status`,
 1 AS `document_type_full`,
 1 AS `document_base_fee`*/;
SET character_set_client = @saved_cs_client;

--
-- Current Database: `barangay_management_system`
--

USE `railway`;

--
-- Final view structure for view `pending_residency_verifications`
--

/*!50001 DROP VIEW IF EXISTS `pending_residency_verifications`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `pending_residency_verifications` AS select `ca`.`id` AS `account_id`,`ca`.`username` AS `username`,`ca`.`status` AS `account_status`,`ca`.`created_at` AS `registration_date`,`cp`.`first_name` AS `first_name`,`cp`.`middle_name` AS `middle_name`,`cp`.`last_name` AS `last_name`,`cp`.`email` AS `email`,`cp`.`phone_number` AS `phone_number`,`cp`.`barangay` AS `barangay`,`cp`.`city_municipality` AS `city_municipality`,`cp`.`province` AS `province`,`cp`.`years_of_residency` AS `years_of_residency`,`cp`.`months_of_residency` AS `months_of_residency`,count(`rd`.`id`) AS `document_count`,max(`rd`.`created_at`) AS `latest_document_upload` from ((`client_accounts` `ca` left join `client_profiles` `cp` on(`ca`.`id` = `cp`.`account_id`)) left join `residency_documents` `rd` on(`ca`.`id` = `rd`.`account_id`)) where `ca`.`status` in ('pending_residency_verification','residency_rejected') group by `ca`.`id`,`ca`.`username`,`ca`.`status`,`ca`.`created_at`,`cp`.`first_name`,`cp`.`middle_name`,`cp`.`last_name`,`cp`.`email`,`cp`.`phone_number`,`cp`.`barangay`,`cp`.`city_municipality`,`cp`.`province`,`cp`.`years_of_residency`,`cp`.`months_of_residency` order by `ca`.`created_at` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_client_complete`
--

/*!50001 DROP VIEW IF EXISTS `v_client_complete`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_client_complete` AS select `ca`.`id` AS `account_id`,`ca`.`username` AS `username`,`ca`.`status` AS `account_status`,`ca`.`email_verified` AS `email_verified`,`ca`.`phone_verified` AS `phone_verified`,`cp`.`id` AS `profile_id`,concat(`cp`.`first_name`,case when `cp`.`middle_name` is not null then concat(' ',`cp`.`middle_name`) else '' end,' ',`cp`.`last_name`,case when `cp`.`suffix` is not null then concat(' ',`cp`.`suffix`) else '' end) AS `full_name`,`cp`.`first_name` AS `first_name`,`cp`.`middle_name` AS `middle_name`,`cp`.`last_name` AS `last_name`,`cp`.`suffix` AS `suffix`,`cp`.`birth_date` AS `birth_date`,year(curdate()) - year(`cp`.`birth_date`) - (date_format(curdate(),'%m%d') < date_format(`cp`.`birth_date`,'%m%d')) AS `age`,`cp`.`gender` AS `gender`,`cs`.`status_name` AS `civil_status`,`cp`.`nationality` AS `nationality`,`cp`.`phone_number` AS `phone_number`,`cp`.`email` AS `email`,concat_ws(', ',nullif(concat_ws(' ',`cp`.`house_number`,`cp`.`street`),''),nullif(`cp`.`subdivision`,''),`cp`.`barangay`,`cp`.`city_municipality`,`cp`.`province`,nullif(`cp`.`postal_code`,'')) AS `complete_address`,`cp`.`barangay` AS `barangay`,`cp`.`city_municipality` AS `city_municipality`,`cp`.`province` AS `province`,`cp`.`years_of_residency` AS `years_of_residency`,`cp`.`months_of_residency` AS `months_of_residency`,`cp`.`is_verified` AS `is_verified`,`cp`.`verified_at` AS `verified_at` from ((`client_accounts` `ca` join `client_profiles` `cp` on(`ca`.`id` = `cp`.`account_id`)) join `civil_status` `cs` on(`cp`.`civil_status_id` = `cs`.`id`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_document_requests_complete`
--

/*!50001 DROP VIEW IF EXISTS `v_document_requests_complete`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_document_requests_complete` AS select `dr`.`id` AS `request_id`,`dr`.`request_number` AS `request_number`,`dt`.`type_name` AS `document_type`,`pc`.`category_name` AS `purpose_category`,`dr`.`purpose_details` AS `purpose_details`,`rs`.`status_name` AS `current_status`,`dr`.`priority` AS `priority`,`dr`.`total_document_fee` AS `total_fee`,`dt`.`base_fee` AS `base_fee`,`dr`.`payment_status` AS `payment_status`,`pm`.`method_name` AS `payment_method`,`pm`.`is_online` AS `is_online_payment`,`dr`.`payment_reference` AS `payment_reference`,`dr`.`payment_provider_reference` AS `payment_provider_reference`,`dr`.`paid_at` AS `paid_at`,`dr`.`delivery_method` AS `delivery_method`,`dr`.`requested_at` AS `requested_at`,`dr`.`target_completion_date` AS `target_completion_date`,`dr`.`completed_at` AS `completed_at`,`vc`.`full_name` AS `client_name`,`vc`.`phone_number` AS `client_phone`,`vc`.`email` AS `client_email`,`vc`.`complete_address` AS `client_address`,concat(`aep_processed`.`first_name`,' ',`aep_processed`.`last_name`) AS `processed_by_name`,concat(`aep_approved`.`first_name`,' ',`aep_approved`.`last_name`) AS `approved_by_name` from (((((((((`document_requests` `dr` join `document_types` `dt` on(`dr`.`document_type_id` = `dt`.`id`)) join `purpose_categories` `pc` on(`dr`.`purpose_category_id` = `pc`.`id`)) join `request_status` `rs` on(`dr`.`status_id` = `rs`.`id`)) join `v_client_complete` `vc` on(`dr`.`client_id` = `vc`.`account_id`)) left join `payment_methods` `pm` on(`dr`.`payment_method_id` = `pm`.`id`)) left join `admin_employee_accounts` `aea_processed` on(`dr`.`processed_by` = `aea_processed`.`id`)) left join `admin_employee_profiles` `aep_processed` on(`aea_processed`.`id` = `aep_processed`.`account_id`)) left join `admin_employee_accounts` `aea_approved` on(`dr`.`approved_by` = `aea_approved`.`id`)) left join `admin_employee_profiles` `aep_approved` on(`aea_approved`.`id` = `aep_approved`.`account_id`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_document_requests_with_beneficiary`
--

/*!50001 DROP VIEW IF EXISTS `v_document_requests_with_beneficiary`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_document_requests_with_beneficiary` AS select `dr`.`id` AS `id`,`dr`.`request_number` AS `request_number`,`dr`.`client_id` AS `client_id`,`dr`.`is_third_party_request` AS `is_third_party_request`,`dr`.`document_type_id` AS `document_type_id`,`dr`.`purpose_category_id` AS `purpose_category_id`,`dr`.`purpose_details` AS `purpose_details`,`dr`.`requestor_notes` AS `requestor_notes`,`dr`.`status_id` AS `status_id`,`dr`.`priority` AS `priority`,`dr`.`processed_by` AS `processed_by`,`dr`.`approved_by` AS `approved_by`,`dr`.`processed_at` AS `processed_at`,`dr`.`approved_at` AS `approved_at`,`dt`.`base_fee` AS `base_fee`,`dr`.`total_document_fee` AS `total_document_fee`,`dr`.`payment_method_id` AS `payment_method_id`,`dr`.`payment_status` AS `payment_status`,`dr`.`payment_reference` AS `payment_reference`,`dr`.`payment_provider_reference` AS `payment_provider_reference`,`dr`.`paid_at` AS `paid_at`,`dr`.`delivery_method` AS `delivery_method`,`dr`.`delivery_address` AS `delivery_address`,`dr`.`requested_at` AS `requested_at`,`dr`.`target_completion_date` AS `target_completion_date`,`dr`.`completed_at` AS `completed_at`,`dr`.`created_at` AS `created_at`,`dr`.`updated_at` AS `updated_at`,`dt`.`type_name` AS `document_type`,`pc`.`category_name` AS `purpose_category`,`rs`.`status_name` AS `status`,`pm`.`method_name` AS `payment_method`,concat(`cp_requestor`.`first_name`,' ',coalesce(concat(`cp_requestor`.`middle_name`,' '),''),`cp_requestor`.`last_name`,coalesce(concat(' ',`cp_requestor`.`suffix`),'')) AS `requestor_name`,`cp_requestor`.`email` AS `requestor_email`,`cp_requestor`.`phone_number` AS `requestor_phone`,case when `dr`.`is_third_party_request` = 1 then concat(`db`.`first_name`,' ',coalesce(concat(`db`.`middle_name`,' '),''),`db`.`last_name`,coalesce(concat(' ',`db`.`suffix`),'')) else concat(`cp_requestor`.`first_name`,' ',coalesce(concat(`cp_requestor`.`middle_name`,' '),''),`cp_requestor`.`last_name`,coalesce(concat(' ',`cp_requestor`.`suffix`),'')) end AS `beneficiary_name`,case when `dr`.`is_third_party_request` = 1 then `db`.`email` else `cp_requestor`.`email` end AS `beneficiary_email`,case when `dr`.`is_third_party_request` = 1 then `db`.`phone_number` else `cp_requestor`.`phone_number` end AS `beneficiary_phone`,case when `dr`.`is_third_party_request` = 1 then `db`.`relationship_to_requestor` else 'self' end AS `relationship_to_requestor`,case when `app`.`id` is not null then concat(`app`.`first_name`,' ',coalesce(concat(`app`.`middle_name`,' '),''),`app`.`last_name`,coalesce(concat(' ',`app`.`suffix`),'')) else NULL end AS `pickup_person_name`,`app`.`phone_number` AS `pickup_person_phone`,`app`.`id_type` AS `pickup_person_id_type`,`app`.`id_number` AS `pickup_person_id_number`,`app`.`relationship_to_beneficiary` AS `pickup_person_relationship`,`app`.`is_verified` AS `pickup_authorization_verified` from (((((((`document_requests` `dr` join `document_types` `dt` on(`dr`.`document_type_id` = `dt`.`id`)) join `purpose_categories` `pc` on(`dr`.`purpose_category_id` = `pc`.`id`)) join `request_status` `rs` on(`dr`.`status_id` = `rs`.`id`)) left join `payment_methods` `pm` on(`dr`.`payment_method_id` = `pm`.`id`)) join `client_profiles` `cp_requestor` on(`dr`.`client_id` = `cp_requestor`.`account_id`)) left join `document_beneficiaries` `db` on(`dr`.`id` = `db`.`request_id`)) left join `authorized_pickup_persons` `app` on(`dr`.`id` = `app`.`request_id`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_payment_audit_trail`
--

/*!50001 DROP VIEW IF EXISTS `v_payment_audit_trail`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_payment_audit_trail` AS select `pt`.`id` AS `transaction_id`,`pt`.`transaction_id` AS `reference_number`,`dr`.`request_number` AS `request_number`,`dt`.`type_name` AS `document_name`,`pm`.`method_name` AS `payment_method`,`pt`.`amount` AS `amount`,`pt`.`processing_fee` AS `processing_fee`,`pt`.`net_amount` AS `net_amount`,`pt`.`status` AS `payment_status`,`pt`.`created_at` AS `initiated_at`,`pt`.`verified_at` AS `verified_at`,`pt`.`receipt_number` AS `receipt_number`,`pt`.`verification_notes` AS `verification_notes`,concat(`cp`.`first_name`,' ',`cp`.`last_name`) AS `client_name`,concat(`ap`.`first_name`,' ',`ap`.`last_name`) AS `verified_by_name`,case when `pm`.`is_online` = 1 then 'Online' else 'In-Person' end AS `payment_type` from (((((((`payment_transactions` `pt` join `document_requests` `dr` on(`pt`.`request_id` = `dr`.`id`)) join `document_types` `dt` on(`dr`.`document_type_id` = `dt`.`id`)) join `payment_methods` `pm` on(`pt`.`payment_method_id` = `pm`.`id`)) join `client_accounts` `ca` on(`dr`.`client_id` = `ca`.`id`)) join `client_profiles` `cp` on(`ca`.`id` = `cp`.`account_id`)) left join `admin_employee_accounts` `admin` on(`pt`.`verified_by` = `admin`.`id`)) left join `admin_employee_profiles` `ap` on(`admin`.`id` = `ap`.`account_id`)) order by `pt`.`created_at` desc */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_payment_transactions_complete`
--

/*!50001 DROP VIEW IF EXISTS `v_payment_transactions_complete`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_payment_transactions_complete` AS select `pt`.`id` AS `transaction_id`,`pt`.`transaction_id` AS `internal_transaction_id`,`pt`.`external_transaction_id` AS `external_transaction_id`,`pt`.`paymongo_payment_intent_id` AS `paymongo_payment_intent_id`,`dr`.`request_number` AS `request_number`,`dr`.`id` AS `request_id`,`vc`.`full_name` AS `client_name`,`vc`.`email` AS `client_email`,`vc`.`phone_number` AS `client_phone`,`pm`.`method_name` AS `payment_method`,`pm`.`method_code` AS `payment_method_code`,`pt`.`amount` AS `amount`,`pt`.`processing_fee` AS `processing_fee`,`pt`.`net_amount` AS `net_amount`,`pt`.`currency` AS `currency`,`pt`.`status` AS `payment_status`,`pt`.`failure_reason` AS `failure_reason`,`pt`.`initiated_at` AS `initiated_at`,`pt`.`completed_at` AS `completed_at`,`pt`.`expires_at` AS `expires_at`,`dt`.`type_name` AS `document_type` from ((((`payment_transactions` `pt` join `document_requests` `dr` on(`pt`.`request_id` = `dr`.`id`)) join `payment_methods` `pm` on(`pt`.`payment_method_id` = `pm`.`id`)) join `document_types` `dt` on(`dr`.`document_type_id` = `dt`.`id`)) join `v_client_complete` `vc` on(`dr`.`client_id` = `vc`.`account_id`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_payment_verification_queue`
--

/*!50001 DROP VIEW IF EXISTS `v_payment_verification_queue`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_payment_verification_queue` AS select `dr`.`id` AS `request_id`,`dr`.`request_number` AS `request_number`,`dr`.`status_id` AS `status_id`,`rs`.`status_name` AS `status_name`,`dt`.`type_name` AS `document_name`,`dt`.`base_fee` AS `base_fee`,`pm`.`method_name` AS `payment_method`,`pm`.`requires_verification` AS `requires_verification`,concat(`cp`.`first_name`,' ',`cp`.`last_name`) AS `client_name`,`ca`.`username` AS `client_email`,`dr`.`created_at` AS `request_date`,`dr`.`approved_at` AS `approved_at`,`dr`.`payment_status` AS `payment_status`,`pt`.`transaction_id` AS `transaction_id`,`pt`.`amount` AS `payment_amount`,`pt`.`status` AS `transaction_status`,`pt`.`verified_by` AS `verified_by`,`pt`.`verified_at` AS `verified_at`,`pt`.`receipt_number` AS `receipt_number`,concat(`ap`.`first_name`,' ',`ap`.`last_name`) AS `verified_by_name` from ((((((((`document_requests` `dr` join `request_status` `rs` on(`dr`.`status_id` = `rs`.`id`)) join `document_types` `dt` on(`dr`.`document_type_id` = `dt`.`id`)) join `payment_methods` `pm` on(`dr`.`payment_method_id` = `pm`.`id`)) join `client_accounts` `ca` on(`dr`.`client_id` = `ca`.`id`)) join `client_profiles` `cp` on(`ca`.`id` = `cp`.`account_id`)) left join `payment_transactions` `pt` on(`dr`.`id` = `pt`.`request_id`)) left join `admin_employee_accounts` `admin` on(`pt`.`verified_by` = `admin`.`id`)) left join `admin_employee_profiles` `ap` on(`admin`.`id` = `ap`.`account_id`)) where `dr`.`status_id` = 4 and `pm`.`requires_verification` = 1 and (`dr`.`payment_status` = 'pending' or `dr`.`payment_status` is null) order by `dr`.`created_at` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_receipts_complete`
--

/*!50001 DROP VIEW IF EXISTS `v_receipts_complete`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = cp850 */;
/*!50001 SET character_set_results     = cp850 */;
/*!50001 SET collation_connection      = cp850_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_receipts_complete` AS select `r`.`id` AS `id`,`r`.`transaction_id` AS `transaction_id`,`r`.`client_id` AS `client_id`,`r`.`request_id` AS `request_id`,`r`.`receipt_number` AS `receipt_number`,`r`.`client_name` AS `client_name`,`r`.`client_email` AS `client_email`,`r`.`client_phone` AS `client_phone`,`r`.`request_number` AS `request_number`,`r`.`document_type` AS `document_type`,`r`.`payment_method` AS `payment_method`,`r`.`payment_method_code` AS `payment_method_code`,`r`.`amount` AS `amount`,`r`.`processing_fee` AS `processing_fee`,`r`.`net_amount` AS `net_amount`,`r`.`currency` AS `currency`,`r`.`external_transaction_id` AS `external_transaction_id`,`r`.`paymongo_payment_intent_id` AS `paymongo_payment_intent_id`,`r`.`payment_status` AS `payment_status`,`r`.`receipt_date` AS `receipt_date`,`r`.`payment_date` AS `payment_date`,`r`.`description` AS `description`,`r`.`notes` AS `notes`,`r`.`created_at` AS `created_at`,`r`.`updated_at` AS `updated_at`,`pt`.`initiated_at` AS `payment_initiated_at`,`pt`.`completed_at` AS `payment_completed_at`,`dr`.`status_id` AS `request_status_id`,`rs`.`status_name` AS `request_status`,`dt`.`type_name` AS `document_type_full`,`dt`.`base_fee` AS `document_base_fee` from ((((`receipts` `r` join `payment_transactions` `pt` on(`r`.`transaction_id` = `pt`.`id`)) join `document_requests` `dr` on(`r`.`request_id` = `dr`.`id`)) join `request_status` `rs` on(`dr`.`status_id` = `rs`.`id`)) join `document_types` `dt` on(`dr`.`document_type_id` = `dt`.`id`)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-09-30 21:55:29

