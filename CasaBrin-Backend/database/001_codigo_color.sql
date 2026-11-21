/* =====================================================================
   Casa Brin — Migración 001: código de color de la tela
   ---------------------------------------------------------------------
   Agrega la columna Telas.CodigoColor (código de color del proveedor,
   p. ej. "AZ-210"). Es opcional (NULL) y no modifica datos existentes.
   Se puede ejecutar varias veces sin efecto adicional (idempotente).
   ===================================================================== */

-- Requerido por SQL Server para crear índices filtrados (sqlcmd lo trae apagado por defecto).
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF COL_LENGTH('dbo.Telas', 'CodigoColor') IS NULL
BEGIN
    ALTER TABLE dbo.Telas ADD CodigoColor NVARCHAR(30) NULL;
    PRINT 'Columna Telas.CodigoColor creada.';
END
ELSE
    PRINT 'La columna Telas.CodigoColor ya existía; no se hizo nada.';
GO

/* Índice para buscar rápido por código de color (filtrado: solo filas con código). */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Telas_CodigoColor' AND object_id = OBJECT_ID('dbo.Telas'))
    CREATE INDEX IX_Telas_CodigoColor ON dbo.Telas (CodigoColor) WHERE CodigoColor IS NOT NULL;
GO
