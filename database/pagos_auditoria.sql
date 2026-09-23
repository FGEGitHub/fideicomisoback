-- Auditoría de ediciones/cancelaciones de pagos (cartera general / PIT).
-- El backend la crea sola la primera vez que se edita o cancela un pago
-- (CREATE TABLE IF NOT EXISTS), pero si el usuario de MySQL de producción
-- no tiene permiso CREATE, correr este script una vez a mano.
CREATE TABLE IF NOT EXISTS pagos_auditoria (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_pago INT NOT NULL,
    id_cuota INT NULL,
    accion VARCHAR(20) NOT NULL,          -- 'EDITAR' | 'CANCELAR'
    monto_anterior DOUBLE NULL,
    monto_nuevo DOUBLE NULL,
    fecha_anterior VARCHAR(15) NULL,
    fecha_nueva VARCHAR(15) NULL,
    motivo VARCHAR(255) NULL,
    cuil_usuario VARCHAR(45) NULL,        -- quién hizo el cambio
    snapshot TEXT NULL,                   -- fila completa de `pagos` antes del cambio (JSON)
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_pagos_aud_pago (id_pago),
    INDEX idx_pagos_aud_cuota (id_cuota)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
