-- =====================================================================
-- Bike Store · Migración 001 · Base heredada del laboratorio CRUD
-- ---------------------------------------------------------------------
-- Origen: sql/lab_crud.sql del laboratorio.
-- Cambios respecto al original:
--   * Base de datos renombrada de `laboratorio_crud` a `bike_store`
--     (el .env.example del laboratorio apuntaba a `lab_crud`: no coincidían).
--   * Sin otros cambios de esquema. Las tablas de Bike Store
--     (productos, categorías, carrito, pedidos...) llegan en migraciones
--     002+ durante los sprints.
-- Regla: nunca se edita una migración ya integrada a `develop`;
--        cualquier cambio va en un archivo nuevo con el siguiente número.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS bike_store
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE bike_store;

DROP TABLE IF EXISTS equipos;
DROP TABLE IF EXISTS usuarios;

CREATE TABLE usuarios (
  id_usuario INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  rol ENUM('admin', 'cliente') NOT NULL DEFAULT 'cliente',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE equipos (
  id_equipo INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  marca VARCHAR(100),
  modelo VARCHAR(100),
  imagen VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO equipos (nombre, marca, modelo) VALUES
('Portátil', 'Lenovo', 'ThinkPad'),
('Monitor', 'LG', 'UltraWide'),
('Teclado', 'Logitech', 'K120');
