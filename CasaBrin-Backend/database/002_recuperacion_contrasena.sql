/* =====================================================================
   Casa Brin — Migración 002: recuperación de contraseña sin correo
   ---------------------------------------------------------------------
   Agrega a dbo.Usuarios:
     - CodigoRecuperacionHash : hash del código de recuperación de un solo uso.
     - DebeCambiarContrasena  : obliga a cambiar una clave temporal al ingresar.
     - IntentosFallidos       : intentos fallidos consecutivos (login/recuperación).
     - BloqueadoHasta         : bloqueo temporal de la cuenta (UTC).
   No modifica datos existentes. Es idempotente (se puede ejecutar varias veces).
   ===================================================================== */

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF COL_LENGTH('dbo.Usuarios', 'CodigoRecuperacionHash') IS NULL
    ALTER TABLE dbo.Usuarios ADD CodigoRecuperacionHash NVARCHAR(100) NULL;
GO

IF COL_LENGTH('dbo.Usuarios', 'DebeCambiarContrasena') IS NULL
    ALTER TABLE dbo.Usuarios ADD DebeCambiarContrasena BIT NOT NULL
        CONSTRAINT DF_Usuarios_DebeCambiarContrasena DEFAULT (0);
GO

IF COL_LENGTH('dbo.Usuarios', 'IntentosFallidos') IS NULL
    ALTER TABLE dbo.Usuarios ADD IntentosFallidos INT NOT NULL
        CONSTRAINT DF_Usuarios_IntentosFallidos DEFAULT (0);
GO

IF COL_LENGTH('dbo.Usuarios', 'BloqueadoHasta') IS NULL
    ALTER TABLE dbo.Usuarios ADD BloqueadoHasta DATETIME2 NULL;
GO

PRINT 'Migración 002 aplicada (columnas de recuperación y bloqueo en Usuarios).';
GO
