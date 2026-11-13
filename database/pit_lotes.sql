-- Visor PIT (nivel 8): datos editables de los lotes del mapa.
-- Se corre UNA vez:   mysql -u USUARIO -p fideicomiso < database/pit_lotes.sql
-- Es seguro repetirlo: las tablas usan IF NOT EXISTS y la carga inicial usa INSERT IGNORE,
-- asi que NO pisa lo que ya se haya editado desde la aplicacion.
-- Los archivos .geojson del front no se tocan: el estado inicial de cada pin es el del
-- archivo donde esta hoy (pitdisponible / pitnodisponible / pitreservado) y el texto
-- original completo queda guardado en descripcion_original.
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS pit_lotes_info (
    id_mapa VARCHAR(60) NOT NULL PRIMARY KEY,         -- id del pin en el .geojson (ej: pitdisponible-1)
    estado VARCHAR(20) NOT NULL,                      -- DISPONIBLE | NO DISPONIBLE | RESERVADO
    manzana VARCHAR(20) NULL,
    lote VARCHAR(40) NULL,
    medidas VARCHAR(120) NULL,
    superficie VARCHAR(60) NULL,
    empresa VARCHAR(200) NULL,
    empresa_tipo VARCHAR(20) NULL,                    -- Boleto | Usufructo
    acceso_sin TINYINT(1) NOT NULL DEFAULT 0,
    acceso_tierra TINYINT(1) NOT NULL DEFAULT 0,
    acceso_ripio TINYINT(1) NOT NULL DEFAULT 0,
    acceso_pavimento TINYINT(1) NOT NULL DEFAULT 0,
    agua TINYINT(1) NOT NULL DEFAULT 0,
    cloacas TINYINT(1) NOT NULL DEFAULT 0,
    sumidero TINYINT(1) NOT NULL DEFAULT 0,
    cuneta_tierra TINYINT(1) NOT NULL DEFAULT 0,
    energia_mt_bt TINYINT(1) NOT NULL DEFAULT 0,
    energia_alum_publ TINYINT(1) NOT NULL DEFAULT 0,
    fibra_optica TINYINT(1) NOT NULL DEFAULT 0,
    pasto_alto TINYINT(1) NOT NULL DEFAULT 0,
    observaciones TEXT NULL,
    descripcion_original TEXT NULL,
    actualizado_por VARCHAR(60) NULL,
    actualizado_en DATETIME NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pit_lotes_historial (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_mapa VARCHAR(60) NOT NULL,
    usuario VARCHAR(60) NULL,                         -- cuil_cuit del usuario que edito
    cambios TEXT NOT NULL,                            -- JSON: {campo: {antes, despues}}
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_pit_hist_mapa (id_mapa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO pit_lotes_info (id_mapa, estado, manzana, lote, medidas, superficie, empresa, empresa_tipo, acceso_sin, acceso_tierra, acceso_ripio, acceso_pavimento, agua, cloacas, sumidero, cuneta_tierra, energia_mt_bt, energia_alum_publ, fibra_optica, pasto_alto, observaciones, descripcion_original) VALUES
('pitdisponible-1', 'DISPONIBLE', NULL, '4', '33,05x46,33', '1.186,35', NULL, NULL, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, NULL, 'DISPONIBLE

Lote	4
medidas: 33,05x46,33
Superficie m2	1.186,35
Estado lote	DISPONILE
	
 Sin Acceso  	
 Con Acceso: Tierra 	
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	 x 
 Cloacas 	 x 
 sumidero y entubado  	
 Cuneta tierra 	
 Energia: MT y BT 	
 Energia: Alum. Publ. 	
Fibra Optica	
pasto alto	 si 
Consumo Energ. Declarado	
Consumo Energ. (Kva)'),
('pitdisponible-2', 'DISPONIBLE', NULL, NULL, '73.52X81.60', '6000M2', NULL, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 'pensado para ARBOX', 'DISPONIBLE   

SUP: 6000M2
MEDIDAS:73.52X81.60
pensado para ARBOX'),
('pitdisponible-3', 'DISPONIBLE', '8', '1', '105.14x92.36', '10.015,15', NULL, 'Boleto', 0, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, NULL, 'Mz= 8
Lote	1
Superficie m2	10.015,15
medidas:   105.14x92.36
Estado lote	Disponible
 Empresa con Boleto 	
 Sin Acceso  	
 Con Acceso: Tierra 	 x 
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	 x 
 Cloacas 	 x 
 sumidero y entubado  	 x 
 Cuneta tierra 	
 Energia: MT y BT 	
 Energia: Alum. Publ. 	
Fibra Optica	
pasto alto	 si 
Consumo Energ. Declarado	
Consumo Energ. (Kva)'),
('pitdisponible-4', 'DISPONIBLE', '9', '2', '65*103.30', '6.615,11', NULL, 'Boleto', 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, NULL, 'MZ= 9
Lote	2
Superficie m2	6.615,11
MEDIDAS: 65*103.30
Estado lote	Reservado
 Empresa con Boleto 	
 Sin Acceso  	
 Con Acceso: Tierra 	 x 
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	 x 
 Cloacas 	
 sumidero y entubado  	
 Cuneta tierra 	 x 
 Energia: MT y BT 	
 Energia: Alum. Publ. 	
Fibra Optica	
pasto alto	si
Consumo Energ. Declarado	
Consumo Energ. (Kva)'),
('pitdisponible-5', 'DISPONIBLE', '9', '3', '35X103.30', '3.598,91', NULL, 'Boleto', 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, NULL, 'Manzana	9
Lote	3
Superficie m2	3.598,91
MEDIDAS: 35X103.30
Estado lote	Reservado
 Empresa con Boleto 	
 Sin Acceso  	
 Con Acceso: Tierra 	 x 
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	 x 
 Cloacas 	
 sumidero y entubado  	
 Cuneta tierra 	x
 Energia: MT y BT 	
 Energia: Alum. Publ. 	
Fibra Optica	
pasto alto	si
Consumo Energ. Declarado	
Consumo Energ. (Kva)'),
('pitdisponible-6', 'DISPONIBLE', '9', '4', '35X102.36', '3.566,01', NULL, 'Boleto', 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, NULL, 'Manzana	9
Lote	4
Superficie m2	3.566,01
MEDIDAS: 35X102.36
Estado lote	Reservado
 Empresa con Boleto 	
 Sin Acceso  	
 Con Acceso: Tierra 	 x 
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	 x 
 Cloacas 	
 sumidero y entubado  	
 Cuneta tierra 	x
 Energia: MT y BT 	
 Energia: Alum. Publ. 	
Fibra Optica	
pasto alto	si
Consumo Energ. Declarado	
Consumo Energ. (Kva)'),
('pitdisponible-7', 'DISPONIBLE', '9', '5', '35*101.42', '3.532,94', NULL, 'Boleto', 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, NULL, 'Manzana	9
Lote	5
Superficie m2	3.532,94
MEDIDAS: 35*101.42
Estado lote	Disponible
 Empresa con Boleto 	
 Sin Acceso  	
 Con Acceso: Tierra 	 x 
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	 x 
 Cloacas 	
 sumidero y entubado  	
 Cuneta tierra 	x
 Energia: MT y BT 	
 Energia: Alum. Publ. 	
Fibra Optica	
pasto alto	si
Consumo Energ. Declarado	
Consumo Energ. (Kva)'),
('pitdisponible-8', 'DISPONIBLE', NULL, '5', '26,91x39,25', '1.147,34', NULL, 'Boleto', 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, NULL, 'Lote	5
medidas: 26,91x39,25
Superficie m2	1.147,34
Estado lote	Disponible
 Empresa con Boleto 	
 Sin Acceso  	
 Con Acceso: Tierra 	
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	 x 
 Cloacas 	 x 
 sumidero y entubado  	
 Cuneta tierra 	
 Energia: MT y BT 	
 Energia: Alum. Publ. 	
Fibra Optica	
pasto alto	 si 
Consumo Energ. Declarado	
Consumo Energ. (Kva)'),
('pitdisponible-9', 'DISPONIBLE', NULL, '6', '29,99x36,92', '1.141,48', NULL, 'Boleto', 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, NULL, 'Lote	6
medidas: 29,99x36,92
Superficie m2	1.141,48
Estado lote	Disponible
 Empresa con Boleto 	
 Sin Acceso  	 x 
 Con Acceso: Tierra 	
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	 
 Cloacas 	 
 sumidero y entubado  	
 Cuneta tierra 	
 Energia: MT y BT 	
 Energia: Alum. Publ. 	
Fibra Optica	
pasto alto	 si 
Consumo Energ. Declarado	
Consumo Energ. (Kva)'),
('pitdisponible-10', 'DISPONIBLE', NULL, '7', '28,81x36,92', '1.016,78', NULL, 'Boleto', 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, NULL, 'Lote	7
medidas: 28,81x36,92
Superficie m2	1.016,78
Estado lote	Disponible
 Empresa con Boleto 	
 Sin Acceso  	 x 
 Con Acceso: Tierra 	
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	 
 Cloacas 	 
 sumidero y entubado  	
 Cuneta tierra 	
 Energia: MT y BT 	
 Energia: Alum. Publ. 	
Fibra Optica	
pasto alto	 si 
Consumo Energ. Declarado	
Consumo Energ. (Kva)'),
('pitdisponible-11', 'DISPONIBLE', '6', '9', '15x40', '600,00', NULL, 'Boleto', 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, NULL, 'mz : 6
Lote	9
medidas: 15x40
Superficie m2	600,00
Estado lote	Disponible
 Empresa con Boleto 	
 Sin Acceso  	 x 
 Con Acceso: Tierra 	
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	
 Cloacas 	
 sumidero y entubado  	
 Cuneta tierra 	
 Energia: MT y BT 	
 Energia: Alum. Publ. 	
Fibra Optica	
pasto alto	 si 
Consumo Energ. Declarado	
Consumo Energ. (Kva)'),
('pitdisponible-12', 'DISPONIBLE', '6', '10', NULL, '600,00', NULL, 'Boleto', 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, NULL, 'MZ= 6
Lote	10
Superficie m2	600,00
Estado lote	Disponible
 Empresa con Boleto 	
 Sin Acceso  	 x 
 Con Acceso: Tierra 	
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	
 Cloacas 	
 sumidero y entubado  	
 Cuneta tierra 	
 Energia: MT y BT 	
 Energia: Alum. Publ. 	
Fibra Optica	
pasto alto	 si 
Consumo Energ. Declarado	
Consumo Energ. (Kva)'),
('pitdisponible-13', 'DISPONIBLE', NULL, '8', '15x40', '717,60', NULL, 'Boleto', 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, NULL, 'Lote	8
medidas 15x40
Superficie m2	717,60
Estado lote	Disponible
 Empresa con Boleto 	
 Sin Acceso  	 x 
 Con Acceso: Tierra 	
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	
 Cloacas 	
 sumidero y entubado  	
 Cuneta tierra 	
 Energia: MT y BT 	
 Energia: Alum. Publ. 	
Fibra Optica	
pasto alto	 si 
Consumo Energ. Declarado	
Consumo Energ. (Kva)'),
('pitdisponible-14', 'DISPONIBLE', '6', '12', NULL, '600,00', NULL, 'Boleto', 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, NULL, 'MZ=   6
Lote	12
Superficie m2	600,00
Estado lote	Disponible
 Empresa con Boleto 	
 Sin Acceso  	 x 
 Con Acceso: Tierra 	
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	
 Cloacas 	
 sumidero y entubado  	
 Cuneta tierra 	
 Energia: MT y BT 	
 Energia: Alum. Publ. 	
Fibra Optica	
pasto alto	 si 
Consumo Energ. Declarado	
Consumo Energ. (Kva)'),
('pitdisponible-15', 'DISPONIBLE', '7', '2', '25x30', '750,00', NULL, 'Boleto', 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, NULL, 'MZ= 7
Lote	2
medidas: 25x30
Superficie m2	750,00
Estado lote	Disponible
 Empresa con Boleto 	
 Sin Acceso  	
 Con Acceso: Tierra 	 x 
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	
 Cloacas 	
 sumidero y entubado  	
 Cuneta tierra 	 x 
 Energia: MT y BT 	
 Energia: Alum. Publ. 	
Fibra Optica	
pasto alto	 si 
Consumo Energ. Declarado	
Consumo Energ. (Kva)'),
('pitdisponible-16', 'DISPONIBLE', '6', '11', NULL, '600,00', NULL, 'Boleto', 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, NULL, 'Mz= 6
Lote	11
Superficie m2	600,00
Estado lote	Disponible
 Empresa con Boleto 	
 Sin Acceso  	 x 
 Con Acceso: Tierra 	
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	
 Cloacas 	
 sumidero y entubado  	
 Cuneta tierra 	
 Energia: MT y BT 	
 Energia: Alum. Publ. 	
Fibra Optica	
pasto alto	 si 
Consumo Energ. Declarado	
Consumo Energ. (Kva)'),
('pitdisponible-17', 'DISPONIBLE', '3', '12', '47,47*91,17', '4.330,44', NULL, 'Boleto', 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 'ZONA INDUSTRIAL', 'Manzana	3
Medidas             47,47*91,17
Lote	12
Superficie m2	4.330,44
ZONA INDUSTRIAL
Estado lote	   (disponible)
 Empresa con Boleto 	
 Sin Acceso  	 x 
 Con Acceso: Tierra 	
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	
 Cloacas 	
 sumidero y entubado  	
 Cuneta tierra 	
 Energia: MT y BT 	
 Energia: Alum. Publ. 	
Fibra Optica	
pasto alto	 si 
Consumo Energ. Declarado	
Consumo Energ. (Kva)'),
('pitdisponible-18', 'DISPONIBLE', '1', '2', NULL, '96,074.51', NULL, NULL, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, NULL, 'Manzana	1 
Lote	2
Superficie m2	96,074.51

Estado lote	disponible

 Sin Acceso  	
 Con Acceso: Tierra 	 x 
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	 x 
 Cloacas 	 x 
 sumidero y entubado  	
 Cuneta tierra 	 x 
 Energia: MTx	
 Energia: Alum. Publ. 	
Fibra Optica	
pasto alto	si
Consumo Energ. Declarado	
Consumo Energ. (Kva)	'),
('pitdisponible-19', 'DISPONIBLE', '3', 'E.P.4', '109,78*91,28', '9.997,15', NULL, 'Boleto', 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, NULL, 'Manzana	3
Medidas             109,78*91,28
Lote	E.P.4
Superficie m2	9.997,15
Estado lote	 E.P.4 Disponible
 Empresa con Boleto 	
 Sin Acceso  	 x 
 Con Acceso: Tierra 	
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	
 Cloacas 	
 sumidero y entubado  	
 Cuneta tierra 	 x 
 Energia: MT y BT 	
 Energia: Alum. Publ. 	
Fibra Optica	
pasto alto	 si 
Consumo Energ. Declarado	
Consumo Energ. (Kva)'),
('pitdisponible-20', 'DISPONIBLE', '3', 'EP3', '42,75*88,53 más ochava', NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, NULL, 'Manzana	3
Medidas            42,75*88,53 más ochava
Lote	EP3'),
('pitdisponible-21', 'DISPONIBLE', '2', 'E.P.1', NULL, '8.996,82', NULL, 'Boleto', 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0, NULL, 'Manzana	2
Lote	E.P.1
Superficie m2	8.996,82
Estado lote	 E.P.1 
 Empresa con Boleto 	
 Sin Acceso  	
 Con Acceso: Tierra 	 x 
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	 x 
 Cloacas 	 x 
 sumidero y entubado  	
 Cuneta tierra 	 x 
 Energia: MT y BT 	
 Energia: Alum. Publ. 	
Fibra Optica	
pasto alto	
Consumo Energ. Declarado	
Consumo Energ. (Kva)'),
('pitdisponible-22', 'DISPONIBLE', '1', NULL, NULL, NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 'EP 7 EQUIPAMIENTO DEL PARQUE
Parcela: Ep7
(159x194) = 31.521,75', 'EP 7 EQUIPAMIENTO DEL PARQUE
Mza 1 	
Parcela: Ep7
(159x194) = 31.521,75'),
('pitdisponible-23', 'DISPONIBLE', '9', 'E.P.6', 'IRREGULAR', '44.325,53', NULL, 'Boleto', 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, NULL, 'MZ= 9
Lote	E.P.6
Superficie m2	44.325,53
MEDIDAS IRREGULAR
Estado lote	 E.P.6 
 Empresa con Boleto 	
 Sin Acceso  	
 Con Acceso: Tierra 	 x 
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	 x 
 Cloacas 	
 sumidero y entubado  	
 Cuneta tierra 	 x 
 Energia: MT y BT 	
 Energia: Alum. Publ. 	
Fibra Optica	
pasto alto	si
Consumo Energ. Declarado	
Consumo Energ. (Kva)'),
('pitdisponible-24', 'DISPONIBLE', '8', '4', '59,67x100,20 + ochava', '9.828,98', NULL, 'Boleto', 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, NULL, 'MZ: 8
Lote	4
medidas: 59,67x100,20 + ochava
Superficie m2	9.828,98
Estado lote	disponible
 Empresa con Boleto 	
 Sin Acceso  	
 Con Acceso: Tierra 	 x 
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	 x 
 Cloacas 	 x 
 sumidero y entubado  	
 Cuneta tierra 	 x 
 Energia: MT y BT 	
 Energia: Alum. Publ. 	
Fibra Optica	
pasto alto	 si 
Consumo Energ. Declarado	
Consumo Energ. (Kva)'),
('pitdisponible-25', 'DISPONIBLE', '4', '1', NULL, '162440.91m2', NULL, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 'ZONA CON LITIGIO
ZONA TECNOLOGICA', 'MZ:4
LOTE: 1
SUP: 162440.91m2
 ZONA CON LITIGIO 
ZONA TECNOLOGICA'),
('pitdisponible-26', 'DISPONIBLE', '12', 'A.V.6', '62.7*64.60', '4.143,31', NULL, NULL, 0, 0, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1, 'tanque de agua', 'Manzana	12
Lote	A.V.6
Superficie m2	4.143,31
medidas:      62.7*64.60
Estado lote	 A.V.6 
                                                  tanque de agua 
 Sin Acceso  	
 Con Acceso: Tierra 	
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	 x 
 Agua 	 x 
 Cloacas 	 x 
 sumidero y entubado  	 x 
 Cuneta tierra 	
 Energia: MT y BT 	 x 
 Energia: Alum. Publ. 	 x 
Fibra Optica	
pasto alto	 si 
Consumo Energ. Declarado	-
Consumo Energ. (Kva)	-'),
('pitnodisponible-1', 'NO DISPONIBLE', NULL, NULL, NULL, '15641.46M2', NULL, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 'EP2
FUTURA ESTACIÓN TRANSFORMADORA', 'EP2
SUP: 15641.46M2

FUTURA ESTACIÓN TRANSFORMADORA'),
('pitnodisponible-2', 'NO DISPONIBLE', '2', '10Y11', '30x40', '1200,00', 'Martin Arengo', 'Boleto', 0, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, NULL, 'Manzana	2
Medidas             30x40
Lote	10Y11
Superficie m2	1200,00
Estado lote	no disponible
 Empresa con Boleto 	 Martin Arengo 
 Sin Acceso  	
 Con Acceso: Tierra 	 x 
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	 x 
 Cloacas 	 x 
 sumidero y entubado  	 x 
 Cuneta tierra 	 x 
 Energia: MT y BT 	
 Energia: Alum. Publ. 	
Fibra Optica	x
pasto alto	si
Consumo Energ. Declarado	40hp
Consumo Energ. (Kva)	50kva'),
('pitnodisponible-3', 'NO DISPONIBLE', '3', 'A.V.3', '21,6*30', '648,00', NULL, 'Boleto', 0, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0, NULL, 'Manzana	3
Medidas             21,6*30
Lote	A.V.3
Superficie m2	648,00
Estado lote	 A.V.3 
 Empresa con Boleto 	
 Sin Acceso  	
 Con Acceso: Tierra 	
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	 x 
 Agua 	 x 
 Cloacas 	 x 
 sumidero y entubado  	 x 
 Cuneta tierra 	
 Energia: MT y BT 	 x 
 Energia: Alum. Publ. 	 x 
Fibra Optica	x
pasto alto	 no 
Consumo Energ. Declarado	
Consumo Energ. (Kva)'),
('pitnodisponible-4', 'NO DISPONIBLE', '3', '7', '10*30', '300,00', 'Gustavo Defazy - Fabrica MDF', 'Boleto', 0, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0, NULL, 'Manzana	3
Medidas              10*30
Lote	7
Superficie m2	300,00
Estado lote	No Disponible
 Empresa con Boleto 	Gustavo Defazy - Fabrica MDF
 Sin Acceso  	
 Con Acceso: Tierra 	
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	x
 Agua 	 x 
 Cloacas 	 x 
 sumidero y entubado  	 x 
 Cuneta tierra 	
 Energia: MT y BT 	x
 Energia: Alum. Publ. 	x
Fibra Optica	x
pasto alto	 no 
Consumo Energ. Declarado	25hp
Consumo Energ. (Kva)	50kva'),
('pitnodisponible-5', 'NO DISPONIBLE', '3', '6', '30*30', '900,00', 'Agua Noble', 'Boleto', 0, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0, NULL, 'Manzana	3
Medidas             30*30
Lote	6
Superficie m2	900,00
Estado lote	No Disponible
 Empresa con Boleto 	 Agua Noble 
 Sin Acceso  	
 Con Acceso: Tierra 	
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	 x 
 Agua 	 x 
 Cloacas 	 x 
 sumidero y entubado  	 x 
 Cuneta tierra 	
 Energia: MT y BT 	 x 
 Energia: Alum. Publ. 	 x 
Fibra Optica	x
pasto alto	 no 
Consumo Energ. Declarado	25 hp
Consumo Energ. (Kva)	40kva'),
('pitnodisponible-6', 'NO DISPONIBLE', '3', '5', '10*30', '300,00', 'Bogado Sebastian', 'Boleto', 0, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, NULL, 'Manzana	3
Medidas            10*30
Lote	5
Superficie m2	300,00
Estado lote	No Disponible
 Empresa con Boleto 	 Bogado Sebastian 
 Sin Acceso  	
 Con Acceso: Tierra 	
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	 x 
 Agua 	 x 
 Cloacas 	 x 
 sumidero y entubado  	 x 
 Cuneta tierra 	
 Energia: MT y BT 	 x 
 Energia: Alum. Publ. 	 x 
Fibra Optica	x
pasto alto	 si 
Consumo Energ. Declarado	25hp
Consumo Energ. (Kva)	40kva'),
('pitnodisponible-7', 'NO DISPONIBLE', '3', '3', '30*23,50', '705,00', 'Bizarro Juan - Bizarro Luis', 'Boleto', 0, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, NULL, 'Manzana	3
Medidas             30*23,50
Lote	3
Superficie m2	705,00
Estado lote	No Disponible
 Empresa con Boleto 	 Bizarro Juan - Bizarro Luis 
 Sin Acceso  	
 Con Acceso: Tierra 	
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	 x 
 Agua 	 x 
 Cloacas 	 x 
 sumidero y entubado  	 x 
 Cuneta tierra 	
 Energia: MT y BT 	 x 
 Energia: Alum. Publ. 	 x 
Fibra Optica	x
pasto alto	 si 
Consumo Energ. Declarado	25hp
Consumo Energ. (Kva)	40kva'),
('pitnodisponible-8', 'NO DISPONIBLE', '3', '1', NULL, '19.866,11', 'Plamecor', 'Boleto', 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, NULL, 'Manzana	3
Lote	1
Superficie m2	19.866,11
Estado lote	 No disonible
 Empresa con Boleto 	 Plamecor 
 Sin Acceso  	 x 
 Con Acceso: Tierra 	
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	
 Cloacas 	
 sumidero y entubado  	
 Cuneta tierra 	
 Energia: MT y BT 	
 Energia: Alum. Publ. 	
Fibra Optica	
pasto alto	si
Consumo Energ. Declarado	25hp
Consumo Energ. (Kva)	50kva'),
('pitnodisponible-9', 'NO DISPONIBLE', NULL, 's/n', '100X100', '10.015,0', 'WORMS', 'Usufructo', 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 'Energia:
Energia:', 'Lote	s/n
medidas= 100X100
Superficie m2	10.015,0
Estado lote	No Disponible
 Empresa con Usufructo 	 WORMS 
 Sin Acceso  	
 Con Acceso: Tierra 	 x 
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	
 Cloacas 	
 sumidero y entubado  	
 Cuneta tierra 	 x 
 Energia:  	
 Energia:  	
Fibra Optica	
pasto alto	 si 
Consumo Energ. Declarado	--hp
Consumo Energ. (Kva)	--kva'),
('pitnodisponible-10', 'NO DISPONIBLE', NULL, 's/n', 'irregular', '400.000', 'ENCORSA-CORAL', 'Usufructo', 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 'Energia:  	GENERACIÓN FOTOVOLTAICA 20MW
Energia:', 'Lote	s/n
medidas= irregular
Superficie m2	400.000
Estado lote	No Disponible
 Empresa con Usufructo 	 ENCORSA-CORAL 
 Sin Acceso  	
 Con Acceso: Tierra 	 x 
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	
 Cloacas 	
 sumidero y entubado  	
 Cuneta tierra 	 
 Energia:  	GENERACIÓN FOTOVOLTAICA 20MW
 Energia:  	
Fibra Optica	
pasto alto	 NO 
Consumo Energ. Declarado	--hp
Consumo Energ. (Kva)	--kva'),
('pitnodisponible-11', 'NO DISPONIBLE', '6', '13 a 16', NULL, '2400 m2', 'UICORR', 'Boleto', 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 'medias: 60x40', 'Mz= 6
Lote	13 a 16
medias: 60x40
Superficie m2	2400 m2
Estado lote	Disponible
 Empresa con Boleto 	 UICORR 
 Sin Acceso  	 x 
 Con Acceso: Tierra 	
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	
 Cloacas 	
 sumidero y entubado  	
 Cuneta tierra 	
 Energia: MT y BT 	
 Energia: Alum. Publ. 	
Fibra Optica	
pasto alto	 si 
Consumo Energ. Declarado	25hp
Consumo Energ. (Kva)	40kva'),
('pitnodisponible-12', 'NO DISPONIBLE', '2', '3', NULL, '600.00', 'Tecnord', 'Boleto', 0, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 'TECNORD - JORGE G. CUBILLAS
Medida 40x15', 'TECNORD - JORGE G. CUBILLAS

Manzana	2
Lote	3
Medida 40x15
Superficie m2	600.00
Estado lote	No Disponible
Empresa con Boleto Tecnord 
Sin Acceso 
Con Acceso: Tierra 
Con Acceso: Ripio 
Con Acceso: Pavimento x 
Agua x 
Cloacas x 
sumidero y entubado x 
Cuneta tierra 
Energia: MT y BT x 
Energia: Alum. Publ. x 
Fibra Optica	x
pasto alto	no
Consumo Energ. Declarado	
Consumo Energ. (Kva)'),
('pitnodisponible-13', 'NO DISPONIBLE', '13', '9', NULL, '1,000.00', 'Martin Bike', 'Boleto', 0, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 'MARTIN BIKE', 'MARTIN BIKE

Manzana	13
Lote	9
Superficie m2	1,000.00
Estado lote	No Disponible
Empresa con Boleto Martin Bike 
Sin Acceso 
Con Acceso: Tierra h 
Con Acceso: Ripio x 
Con Acceso: Pavimento x 
Agua x 
Cloacas x 
sumidero y entubado x 
Cuneta tierra x 
Energia: MT y BT 
Energia: Alum. Publ. x 
Fibra Optica	x
pasto alto	 si 
Consumo Energ. Declarado	-
Consumo Energ. (Kva)	20kva'),
('pitnodisponible-14', 'NO DISPONIBLE', '13', '10y11', '50*60+ochava', '3.251,49', 'Nea Servicios', 'Boleto', 0, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, NULL, 'Manzana	13
Lote	10y11
Superficie m2	3.251,49
medidas: 50*60+ochava

Estado lote	No Disponible
 Empresa con Boleto 	 Nea Servicios  
 Sin Acceso  	
 Con Acceso: Tierra 	
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	 x 
 Agua 	 x 
 Cloacas 	 x 
 sumidero y entubado  	 x 
 Cuneta tierra 	
 Energia: MT y BT 	 x 
 Energia: Alum. Publ. 	 x 
Fibra Optica	x
pasto alto	 si 
Consumo Energ. Declarado	-
Consumo Energ. (Kva)	20kva'),
('pitnodisponible-15', 'NO DISPONIBLE', '13', '19', 'irregular 40x80', '2600.00', 'Puigbo Martin Federico', 'Boleto', 0, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 'JUMAR - MARTIN PUIGBO', 'JUMAR - MARTIN PUIGBO

Manzana	13
Lote	19
Superficie m2	2600.00
medidas irregular 40x80
Estado lote	No Disponible
Empresa con Boleto Puigbo Martin Federico 
Sin Acceso 
Con Acceso: Tierra x 
Con Acceso: Ripio 
Con Acceso: Pavimento x 
Agua x 
Cloacas x 
sumidero y entubado x 
Cuneta tierra 
Energia: MT y BT x 
Energia: Alum. Publ. x 
Fibra Optica	x
pasto alto	 si 
Consumo Energ. Declarado	100hp
Consumo Energ. (Kva)	100kva'),
('pitnodisponible-16', 'NO DISPONIBLE', '12', '1y 6', '54.02x149.75', '10.660,75', 'Acumuladores Arcle SRL', 'Boleto', 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 'Arcle Baterias', 'Arcle Baterias

Manzana	12
Lote	1y 6
Superficie m2	10.660,75
medidas: 54.02x149.75

Estado lote	No Disponible
 Empresa con Boleto 	 Acumuladores Arcle SRL 
 Sin Acceso  	
 Con Acceso: Tierra 	
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	 x 
 Agua 	 x 
 Cloacas 	 x 
 sumidero y entubado  	 x 
 Cuneta tierra 	 x 
 Energia: MT y BT 	 x 
 Energia: Alum. Publ. 	 x 
Fibra Optica	x
pasto alto	 no 
Consumo Energ. Declarado	60hp
Consumo Energ. (Kva)	200kva'),
('pitnodisponible-17', 'NO DISPONIBLE', '3', '2', '40*40*Más ochava', '1.511,52', 'Enlace', 'Boleto', 0, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0, NULL, 'Manzana	3
Medidas             40*40*Más ochava
Lote	2
Superficie m2	1.511,52
Estado lote	No Disponible
 Empresa con Boleto 	 Enlace 
 Sin Acceso  	
 Con Acceso: Tierra 	
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	 x 
 Agua 	 x 
 Cloacas 	 x 
 sumidero y entubado  	 x 
 Cuneta tierra 	
 Energia: MT y BT 	 x 
 Energia: Alum. Publ. 	 x 
Fibra Optica	x
pasto alto	 no 
Consumo Energ. Declarado	25hp
Consumo Energ. (Kva)	35kva'),
('pitnodisponible-18', 'NO DISPONIBLE', NULL, '21', '45x40 irregular', '2089,89', 'Cerveceria Morel', 'Boleto', 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, NULL, 'Lote	21
medidas: 45x40 irregular
Superficie m2	2089,89
Estado lote	Disponible
 Empresa con Boleto 	 Cerveceria Morel 
 Sin Acceso  	
 Con Acceso: Tierra 	 x 
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	
 Cloacas 	
 sumidero y entubado  	
 Cuneta tierra 	 x 
 Energia: MT y BT 	
 Energia: Alum. Publ. 	
Fibra Optica	
pasto alto	 si 
Consumo Energ. Declarado	15hp
Consumo Energ. (Kva)	40kva'),
('pitnodisponible-19', 'NO DISPONIBLE', NULL, '20', '50,96x85,66', '4.295,59', 'Imagen Digital S.A', 'Boleto', 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, NULL, 'Lote	20
medidas: 50,96x85,66
Superficie m2	4.295,59
Estado lote	No Disponible
 Empresa con Boleto 	 Imagen Digital S.A 
 Sin Acceso  	
 Con Acceso: Tierra 	 
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	 x 
 Cloacas 	
 sumidero y entubado  	
 Cuneta tierra 	
 Energia: MT y BT 	
 Energia: Alum. Publ. 	
Fibra Optica	
pasto alto	 si 
Consumo Energ. Declarado	60hp
Consumo Energ. (Kva)	85kva'),
('pitnodisponible-20', 'NO DISPONIBLE', '7', '5 y 6', '40x30', '700', 'Gabriel Atilio Massacesi', 'Boleto', 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, NULL, 'MZ= 7
Lote	5 y 6
medidas: 40x30
Superficie m2	700
Estado lote	No Disponible
 Empresa con Boleto 	 Gabriel Atilio Massacesi 
 Sin Acceso  	
 Con Acceso: Tierra 	 x 
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	
 Cloacas 	
 sumidero y entubado  	
 Cuneta tierra 	 x 
 Energia: MT y BT 	
 Energia: Alum. Publ. 	
Fibra Optica	
pasto alto	 si 
Consumo Energ. Declarado	25hp
Consumo Energ. (Kva)	40kva'),
('pitnodisponible-21', 'NO DISPONIBLE', '12', '4', '64.22x98.81', '6.639,35', 'Aguas Aras', 'Boleto', 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, NULL, 'Manzana	12
Lote	4
Superficie m2	6.639,35
medidas: 64.22x98.81
Estado lote	No Disponible
 Empresa con Boleto 	 Aguas Aras 
 Sin Acceso  	
 Con Acceso: Tierra 	 x 
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	 x 
 Cloacas 	 x 
 sumidero y entubado  	
 Cuneta tierra 	 x 
 Energia: MT y BT 	
 Energia: Alum. Publ. 	
Fibra Optica	
pasto alto	 si 
Consumo Energ. Declarado	
Consumo Energ. (Kva)'),
('pitnodisponible-22', 'NO DISPONIBLE', '6', '2', '32,16x54,06', '1.564,23', 'Comytel S.A.', 'Boleto', 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, NULL, 'Manzana	6
Lote	2
medidas=32,16x54,06
Superficie m2	1.564,23
Estado lote	No Disponible
 Empresa con Boleto 	 Comytel S.A. 
 Sin Acceso  	
 Con Acceso: Tierra 	
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	 x 
 Cloacas 	 x 
 sumidero y entubado  	
 Cuneta tierra 	
 Energia: MT y BT 	
 Energia: Alum. Publ. 	
Fibra Optica	
pasto alto	 si 
Consumo Energ. Declarado	100 hp
Consumo Energ. (Kva)	135 kwa'),
('pitnodisponible-23', 'NO DISPONIBLE', '12', '3', '69.47*64.50 + ochava', '5.461,33', 'Frozen SRL - Xavier Albarracin', 'Boleto', 0, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0, NULL, 'Manzana	12
Lote	3
Superficie m2	5.461,33
medidas: 69.47*64.50 + ochava
Estado lote	No Disponible
 Empresa con Boleto 	Frozen SRL - Xavier Albarracin
 Sin Acceso  	
 Con Acceso: Tierra 	
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	x
 Agua 	 x 
 Cloacas 	 x 
 sumidero y entubado  	x
 Cuneta tierra 	
 Energia: MT y BT 	x
 Energia: Alum. Publ. 	x
Fibra Optica	x
pasto alto	 no 
Consumo Energ. Declarado	100kva
Consumo Energ. (Kva)	135kva'),
('pitnodisponible-24', 'NO DISPONIBLE', '5', '29', NULL, '17.808,52m2', 'Patagonia Construcciones - Sinat', 'Boleto', 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, NULL, 'MZ=5
Lote	29
Superficie m2	17.808,52m2
Estado lote	No Disponible
Empresa con Boleto Patagonia Construcciones - Sinat
Sin Acceso x
Con Acceso: Tierra 
Con Acceso: Ripio 
Con Acceso: Pavimento 
Agua 
Cloacas 
sumidero y entubado 
Cuneta tierra x
Energia: MT y BT 
Energia: Alum. Publ. 
Fibra Optica	
pasto alto	 si 
Consumo Energ. Declarado 130kva
Consumo Energ. (Kva)	500kva( declarado por el propietario, sabe que debe ponerse su setin)'),
('pitnodisponible-25', 'NO DISPONIBLE', '12', '5', '66.32*83.51', '5.153,95', 'Juan Carlos Gaillard', 'Boleto', 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0, NULL, 'Manzana	12
Lote	5
Superficie m2	5.153,95
medidas: 66.32*83.51
Estado lote	No Disponible
 Empresa con Boleto 	 Juan Carlos Gaillard 
 Sin Acceso  	
 Con Acceso: Tierra 	 x 
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	 x 
 Cloacas 	 x 
 sumidero y entubado  	
 Cuneta tierra 	 x 
 Energia: MT y BT 	
 Energia: Alum. Publ. 	
Fibra Optica	
pasto alto	 no 
Consumo Energ. Declarado	25hp
Consumo Energ. (Kva)	50kva'),
('pitnodisponible-26', 'NO DISPONIBLE', '11', '4', '54.91*91.97', '5.138,06', 'Checamba Materiales', 'Boleto', 0, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, NULL, 'Manzana	11
Lote	4
Superficie m2	5.138,06
MEDIDAS: 54.91*91.97
Estado lote	No Disponible
 Empresa con Boleto 	 Checamba Materiales 
 Sin Acceso  	
 Con Acceso: Tierra 	 x 
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	 x 
 Cloacas 	 x 
 sumidero y entubado  	 x 
 Cuneta tierra 	 x 
 Energia: MT y BT 	 x 
 Energia: Alum. Publ. 	
Fibra Optica	
pasto alto	si
Consumo Energ. Declarado	60hp
Consumo Energ. (Kva)	85kva'),
('pitnodisponible-27', 'NO DISPONIBLE', '11', '5', '56.46*91.97 + OCHAVA', '6.761,62', 'Canavesio', 'Boleto', 0, 1, 0, 0, 1, 1, 1, 0, 1, 0, 1, 0, NULL, 'Manzana	11
Lote	5
Superficie m2	6.761,62
MEDIDAS: 56.46*91.97 + OCHAVA
Estado lote	No Disponible
 Empresa con Boleto 	 Canavesio 
 Sin Acceso  	
 Con Acceso: Tierra 	 x 
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	 x 
 Cloacas 	 x 
 sumidero y entubado  	 x 
 Cuneta tierra 	
 Energia: MT y BT 	 x 
 Energia: Alum. Publ. 	
Fibra Optica	x
pasto alto	 no 
Consumo Energ. Declarado	60hp
Consumo Energ. (Kva)	85kva'),
('pitnodisponible-28', 'NO DISPONIBLE', '11', '7', '78.15*96.67', '7.112,82', 'Logistica Hermanos', 'Boleto', 0, 1, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, NULL, 'Manzana	11
Lote	7
Superficie m2	7.112,82
MEDIDAS: 78.15*96.67
Estado lote	No Disponible
 Empresa con Boleto 	 Logistica Hermanos 
 Sin Acceso  	
 Con Acceso: Tierra 	 x 
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	 x 
 Cloacas 	 x 
 sumidero y entubado  	 x 
 Cuneta tierra 	 x 
 Energia: MT y BT 	
 Energia: Alum. Publ. 	
Fibra Optica	
pasto alto	 si 
Consumo Energ. Declarado	100hp
Consumo Energ. (Kva)	135kva'),
('pitnodisponible-29', 'NO DISPONIBLE', '8', '5 al 12', NULL, '16.198,89', 'Vica Neumaticos SA', 'Boleto', 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0, NULL, 'MZ= 8
Lote	5 al 12
Superficie m2	16.198,89

Estado lote	No Disponible
 Empresa con Boleto 	 Vica Neumaticos SA 
 Sin Acceso  	
 Con Acceso: Tierra 	 x 
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	 x 
 Cloacas 	 x 
 sumidero y entubado  	
 Cuneta tierra 	 x 
 Energia: MT y BT 	
 Energia: Alum. Publ. 	
Fibra Optica	
pasto alto	NO
Consumo Energ. Declarado	100hp
Consumo Energ. (Kva)	135kva'),
('pitnodisponible-30', 'NO DISPONIBLE', '11', '8', '51.03*74.59', '7.953,70', 'Yacare Containers SAS', 'Boleto', 0, 1, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, NULL, 'Manzana	11
Lote	8
MEDIDAS: 51.03*74.59
Superficie m2	7.953,70
Estado lote	No Disponible
 Empresa con Boleto 	 Yacare Containers SAS 
 Sin Acceso  	
 Con Acceso: Tierra 	 x 
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	 x 
 Cloacas 	 x 
 sumidero y entubado  	 x 
 Cuneta tierra 	 x 
 Energia: MT y BT 	
 Energia: Alum. Publ. 	
Fibra Optica	
pasto alto	no
Consumo Energ. Declarado	25hp
Consumo Energ. (Kva)	40kva'),
('pitnodisponible-31', 'NO DISPONIBLE', '10', '1', '160*171.50 IRREGULAR', '38.127,24', 'Urbalog SA', 'Boleto', 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, NULL, 'MZ= 10
Lote	1
Superficie m2	38.127,24
MEDIDAS: 160*171.50 IRREGULAR
Estado lote	No Disponible
 Empresa con Boleto 	 Urbalog SA 
 Sin Acceso  	
 Con Acceso: Tierra 	 x 
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	 x 
 Cloacas 	 x 
 sumidero y entubado  	
 Cuneta tierra 	 x 
 Energia: MT y BT 	
 Energia: Alum. Publ. 	
Fibra Optica	
pasto alto	si
Consumo Energ. Declarado	100hp
Consumo Energ. (Kva)	130kva'),
('pitnodisponible-32', 'NO DISPONIBLE', '10', '12', '87.50X100', '8.750,00', 'Espindola Pedro Alfredo', 'Boleto', 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, NULL, 'Manzana	10
Lote	12
MEDIDAS: 87.50X100
Superficie m2	8.750,00
Estado lote	No Disponible
 Empresa con Boleto 	 Espindola Pedro Alfredo 
 Sin Acceso  	
 Con Acceso: Tierra 	 x 
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	 x 
 Cloacas 	 x 
 sumidero y entubado  	
 Cuneta tierra 	 x 
 Energia: MT y BT 	
 Energia: Alum. Publ. 	
Fibra Optica	
pasto alto	si
Consumo Energ. Declarado	15hp
Consumo Energ. (Kva)	30kva'),
('pitnodisponible-33', 'NO DISPONIBLE', '10', '3', '87.50*100', '8.750,00', 'Espindola Jose Bernardo', 'Boleto', 0, 1, 0, 0, 1, 1, 1, 0, 1, 0, 0, 1, NULL, 'Manzana	10
Lote	3
Superficie m2	8.750,00
MEDIDAS: 87.50*100
Estado lote	No Disponible
 Empresa con Boleto 	 Espindola Jose Bernardo 
 Sin Acceso  	
 Con Acceso: Tierra 	 x 
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	 x 
 Cloacas 	 x 
 sumidero y entubado  	 x 
 Cuneta tierra 	
 Energia: MT y BT 	 x 
 Energia: Alum. Publ. 	
Fibra Optica	
pasto alto	si
Consumo Energ. Declarado	15hp
Consumo Energ. (Kva)	30kva'),
('pitnodisponible-34', 'NO DISPONIBLE', '10', '6', '81X100', '10.013,00', 'Eretz', 'Boleto', 0, 1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 1, NULL, 'Manzana	10
Lote	6
MEDIDAS: 81X100
Superficie m2	10.013,00
Estado lote	No Disponible
 Empresa con Boleto 	 Eretz 
 Sin Acceso  	
 Con Acceso: Tierra 	 x 
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	 x 
 Cloacas 	
 sumidero y entubado  	 x 
 Cuneta tierra 	 x 
 Energia: MT y BT 	
 Energia: Alum. Publ. 	
Fibra Optica	x
pasto alto	si
Consumo Energ. Declarado	25hp
Consumo Energ. (Kva)	40kva'),
('pitnodisponible-35', 'NO DISPONIBLE', '10', '10', '50X100', '5.000,00', 'Comercializadora Shuk', 'Boleto', 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, NULL, 'Manzana	10
Lote	10
MEDIDAS: 50X100
Superficie m2	5.000,00
Estado lote	No Disponible
 Empresa con Boleto 	 Comercializadora Shuk 
 Sin Acceso  	
 Con Acceso: Tierra 	 x 
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	 x 
 Cloacas 	
 sumidero y entubado  	
 Cuneta tierra 	 x 
 Energia: MT y BT 	
 Energia: Alum. Publ. 	
Fibra Optica	
pasto alto	si
Consumo Energ. Declarado	100hp
Consumo Energ. (Kva)	135kva'),
('pitnodisponible-36', 'NO DISPONIBLE', '10', '4Y11', '50 X 100 C/U', '10.000', 'Comercializadora Shuk', 'Boleto', 0, 1, 0, 0, 1, 1, 1, 0, 1, 0, 0, 1, NULL, 'Manzana	10
Lote	4Y11
Superficie m2	10.000
MEDIDAS  50 X 100 C/U
Estado lote	No Disponible
 Empresa con Boleto 	 Comercializadora Shuk 
 Sin Acceso  	
 Con Acceso: Tierra 	 x 
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	 x 
 Cloacas 	 x 
 sumidero y entubado  	 x 
 Cuneta tierra 	
 Energia: MT y BT 	 x 
 Energia: Alum. Publ. 	
Fibra Optica	
pasto alto	si
Consumo Energ. Declarado	100hp
Consumo Energ. (Kva)	135kva'),
('pitnodisponible-37', 'NO DISPONIBLE', '10', '13', '81X100 IRREGULAR', '7515.05', 'Oncolitoral', 'Boleto', 0, 1, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, NULL, 'Manzana	10
Lote	13
Superficie m2	7515.05
MEDIDAS: 81X100 IRREGULAR
Estado lote	No Disponible
 Empresa con Boleto 	 Oncolitoral 
 Sin Acceso  	
 Con Acceso: Tierra 	 x 
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	 x 
 Cloacas 	
 sumidero y entubado  	 x 
 Cuneta tierra 	 x 
 Energia: MT y BT 	
 Energia: Alum. Publ. 	
Fibra Optica	
pasto alto	si
Consumo Energ. Declarado	25hp
Consumo Energ. (Kva)	40kva'),
('pitnodisponible-38', 'NO DISPONIBLE', '10', '7', '49X51', '2.499,00', 'Lasa SA', 'Boleto', 0, 1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 1, NULL, 'Manzana	10

Lote	7
MEDIDAS: 49X51
Superficie m2	2.499,00
Estado lote	No Disponible
 Empresa con Boleto 	 Lasa SA 
 Sin Acceso  	
 Con Acceso: Tierra 	 x 
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	 x 
 Cloacas 	
 sumidero y entubado  	 x 
 Cuneta tierra 	 x 
 Energia: MT y BT 	
 Energia: Alum. Publ. 	
Fibra Optica	x
pasto alto	si
Consumo Energ. Declarado	25hp
Consumo Energ. (Kva)	40kva'),
('pitnodisponible-39', 'NO DISPONIBLE', '13', '16y17', '40*30', '1200', 'Grunen SRL', 'Boleto', 0, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0, NULL, 'Manzana	13
Lote	16y17
Superficie m2	1200
medidas: 40*30
Estado lote	No Disponible
 Empresa con Boleto 	 Grunen SRL 
 Sin Acceso  	
 Con Acceso: Tierra 	
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	 x 
 Agua 	 x 
 Cloacas 	 x 
 sumidero y entubado  	 x 
 Cuneta tierra 	
 Energia: MT y BT 	 x 
 Energia: Alum. Publ. 	 x 
Fibra Optica	x
pasto alto	 no 
Consumo Energ. Declarado	100hp
Consumo Energ. (Kva)	135kva'),
('pitnodisponible-40', 'NO DISPONIBLE', '13', '3y4', '40*50', '2.000,00', 'All Matic', 'Boleto', 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 1, NULL, 'Manzana	13
Lote	3y4
Superficie m2	2.000,00
medidas: 40*50
Estado lote	No Disponible
 Empresa con Boleto 	             All Matic 
 Sin Acceso  	
 Con Acceso: Tierra 	 x 
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	 x 
 Cloacas 	 x 
 sumidero y entubado  	
 Cuneta tierra 	 x 
 Energia: MT y BT 	
 Energia: Alum. Publ. 	
Fibra Optica	x
pasto alto	 si 
Consumo Energ. Declarado	20hp
Consumo Energ. (Kva)	35kva'),
('pitnodisponible-41', 'NO DISPONIBLE', '13', '15', '20*30', '600,00', 'Avena - Tonutti', 'Boleto', 0, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, NULL, 'Manzana	13
Lote	15
Superficie m2	600,00
medidas:20*30
Estado lote	No Disponible
 Empresa con Boleto 	 Avena - Tonutti 
 Sin Acceso  	
 Con Acceso: Tierra 	
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	 x 
 Agua 	 x 
 Cloacas 	 x 
 sumidero y entubado  	 x 
 Cuneta tierra 	
 Energia: MT y BT 	 x 
 Energia: Alum. Publ. 	 x 
Fibra Optica	x
pasto alto	 si 
Consumo Energ. Declarado	25hp
Consumo Energ. (Kva)	40kva'),
('pitnodisponible-42', 'NO DISPONIBLE', '9', '12', '105X95,76', '10.202,98', 'Albo Distribuciones - Bogado', 'Boleto', 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, NULL, 'MZ= 9
Lote	12
Superficie m2	10.202,98
MEDIDAS= 105X95,76
Estado lote	No Disponible
 Empresa con Boleto 	Albo Distribuciones - Bogado
 Sin Acceso  	
 Con Acceso: Tierra 	 x 
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	 x 
 Cloacas 	
 sumidero y entubado  	
 Cuneta tierra 	x
 Energia: MT y BT 	
 Energia: Alum. Publ. 	
Fibra Optica	
pasto alto	si
Consumo Energ. Declarado	100hp
Consumo Energ. (Kva)	60kva (factibilidad dpec)'),
('pitnodisponible-43', 'NO DISPONIBLE', '11', '1Y2', NULL, '8.144,16', 'Cantecor', 'Boleto', 0, 1, 0, 0, 1, 1, 1, 1, 1, 0, 1, 0, NULL, 'Manzana	11
Lote	1Y2
Superficie m2	8.144,16

Estado lote	No Disponible
 Empresa con Boleto 	 Cantecor 
 Sin Acceso  	
 Con Acceso: Tierra 	 x 
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	 x 
 Cloacas 	 x 
 sumidero y entubado  	 x 
 Cuneta tierra 	 x 
 Energia: MT y BT 	 x 
 Energia: Alum. Publ. 	
Fibra Optica	x
pasto alto	 no 
Consumo Energ. Declarado	60hp
Consumo Energ. (Kva)	85kva'),
('pitnodisponible-44', 'NO DISPONIBLE', NULL, 'E.P.5', '42,56x85,75+ ochava', '5.033,29', 'CEC', NULL, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, NULL, 'Lote	E.P.5
medidas= 42,56x85,75+ ochava
Superficie m2	5.033,29
Estado lote	 E.P.5 
 Empresa                       	 CEC 
 Sin Acceso  	
 Con Acceso: Tierra 	 x 
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	 x 
 Agua 	 x 
 Cloacas 	 x 
 sumidero y entubado  	 x 
 Cuneta tierra 	 x 
 Energia: MT y BT 	 x 
 Energia: Alum. Publ. 	 x 
Fibra Optica	x
pasto alto	 no 
Consumo Energ. Declarado	 sin datos 
Consumo Energ. (Kva)	sin datos'),
('pitnodisponible-45', 'NO DISPONIBLE', '7', '7', '40x30', '700', 'Tricobalto SASU', 'Boleto', 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, NULL, 'MZ= 7
Lote	7
medidas= 40x30
Superficie m2	700
Estado lote	No Disponible
 Empresa con Boleto 	 Tricobalto SASU 
 Sin Acceso  	
 Con Acceso: Tierra 	 x 
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	
 Cloacas 	
 sumidero y entubado  	
 Cuneta tierra 	 x 
 Energia: MT y BT 	
 Energia: Alum. Publ. 	
Fibra Optica	
pasto alto	 si 
Consumo Energ. Declarado	10hp
Consumo Energ. (Kva)	20kva'),
('pitnodisponible-46', 'NO DISPONIBLE', '8', '2y3', '109,42x100,83 + ochava', '14180,14', 'Cloronor SA', 'Boleto', 0, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, NULL, 'Mz= 8 
Lote	2y3
medidas: 109,42x100,83 + ochava
Superficie m2	14180,14
Estado lote	No Disponible
 Empresa con Boleto 	 Cloronor SA 
 Sin Acceso  	
 Con Acceso: Tierra 	 x 
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	 x 
 Cloacas 	 x 
 sumidero y entubado  	 x 
 Cuneta tierra 	
 Energia: MT y BT 	
 Energia: Alum. Publ. 	
Fibra Optica	
pasto alto	 si 
Consumo Energ. Declarado	100hp
Consumo Energ. (Kva)	111kva'),
('pitnodisponible-47', 'NO DISPONIBLE', '9', '11', '32X94.82', '3.335,02', 'Rs Argentina - Eugenio Vidal', 'Boleto', 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, NULL, 'MZ=9 
Lote	11
MEDIDAS: 32X94.82
Superficie m2	3.335,02
Estado lote	Reservado
 Empresa con Boleto 	 Rs Argentina - Eugenio Vidal 
 Sin Acceso  	
 Con Acceso: Tierra 	 x 
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	 x 
 Cloacas 	
 sumidero y entubado  	
 Cuneta tierra 	 x 
 Energia: MT y BT 	
 Energia: Alum. Publ. 	
Fibra Optica	
pasto alto	si
Consumo Energ. Declarado	25hp
Consumo Energ. (Kva)	40kva'),
('pitnodisponible-48', 'NO DISPONIBLE', '9', '7', '35*99.59', '3.466,97', 'Forestal San Jose Obrero', 'Boleto', 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, NULL, 'MZ= 9
Lote	7
Superficie m2	3.466,97
MEDIDAS: 35*99.59
Estado lote	No Disponible
 Empresa con Boleto 	 Forestal San Jose Obrero 
 Sin Acceso  	
 Con Acceso: Tierra 	 x 
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	 x 
 Cloacas 	
 sumidero y entubado  	
 Cuneta tierra 	 x 
 Energia: MT y BT 	
 Energia: Alum. Publ. 	
Fibra Optica	
pasto alto	si
Consumo Energ. Declarado	25hp
Consumo Energ. (Kva)	50kva'),
('pitnodisponible-49', 'NO DISPONIBLE', '9', '6', '35*100.47', '3.499,87', 'Expreso Ara Vera', 'Boleto', 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, NULL, 'Lote	6
MZ=9
MEDIDAS: 35*100.47
Superficie m2	3.499,87
Estado lote	Disponible
 Empresa con Boleto 	 Expreso Ara Vera 
 Sin Acceso  	
 Con Acceso: Tierra 	 x 
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	 x 
 Cloacas 	
 sumidero y entubado  	
 Cuneta tierra 	 x 
 Energia: MT y BT 	
 Energia: Alum. Publ. 	
Fibra Optica	
pasto alto	si
Consumo Energ. Declarado	25hp
Consumo Energ. (Kva)	40kva'),
('pitnodisponible-50', 'NO DISPONIBLE', '13', '1', '38.03*50', '1.815,57', 'Inoxidables Norte SAS', 'Boleto', 0, 1, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, NULL, 'Manzana	13
Lote	1
Superficie m2	1.815,57
medidas: 38.03*50
Estado lote	No Disponible
 Empresa con Boleto 	 Inoxidables Norte SAS 
 Sin Acceso  	
 Con Acceso: Tierra 	 x 
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	 x 
 Cloacas 	 x 
 sumidero y entubado  	 x 
 Cuneta tierra 	 x 
 Energia: MT y BT 	
 Energia: Alum. Publ. 	
Fibra Optica	
pasto alto	 no 
Consumo Energ. Declarado	25hp
Consumo Energ. (Kva)	50kva'),
('pitnodisponible-51', 'NO DISPONIBLE', '13', '5,6,13 y 14', '40x70', '3.200,00', 'Disanco', 'Boleto', 0, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, NULL, 'Manzana	13
Lote	5,6,13 y 14
Superficie m2	3.200,00
medidas: 40x70
Estado lote	No Disponible
 Empresa con Boleto 	 Disanco 
 Sin Acceso  	
 Con Acceso: Tierra 	 x 
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	 x 
 Cloacas 	 x 
 sumidero y entubado  	 x 
 Cuneta tierra 	 x 
 Energia: MT y BT 	
 Energia: Alum. Publ. 	
Fibra Optica	x
pasto alto	 si 
Consumo Energ. Declarado	25hp
Consumo Energ. (Kva)	40kva'),
('pitnodisponible-52', 'NO DISPONIBLE', '2', '13', '45x40', '1800', 'Promacon', 'Boleto', 0, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 0, NULL, 'Manzana	2
Lote	13
Superficie m2	1800
medidas: 45x40
Estado lote	No Disponible
 Empresa con Boleto 	 Promacon 
 Sin Acceso  	
 Con Acceso: Tierra 	 x 
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	 x 
 Cloacas 	 x 
 sumidero y entubado  	 x 
 Cuneta tierra 	 x 
 Energia: MT y BT 	
 Energia: Alum. Publ. 	
Fibra Optica	x
pasto alto	no
Consumo Energ. Declarado	20hp
Consumo Energ. (Kva)	35kva'),
('pitnodisponible-53', 'NO DISPONIBLE', '2', '14', '45x40', '1800', 'Gustavo Defazy - Marmoleria', 'Boleto', 0, 1, 0, 0, 1, 1, 1, 0, 0, 0, 1, 0, NULL, 'Manzana	2
Lote	14
Superficie m2	1800
medidas: 45x40
Estado lote	No Disponible
 Empresa con Boleto 	Gustavo Defazy - Marmoleria
 Sin Acceso  	
 Con Acceso: Tierra 	x
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	 x 
 Cloacas 	 x 
 sumidero y entubado  	 x 
 Cuneta tierra 	
 Energia: MT y BT 	
 Energia: Alum. Publ. 	
Fibra Optica	x
pasto alto	no
Consumo Energ. Declarado	25hp
Consumo Energ. (Kva)	50kva'),
('pitnodisponible-54', 'NO DISPONIBLE', '2', '12', '25*40', '1000', 'Elgert', 'Boleto', 0, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 0, NULL, 'Manzana	2
Lote	12
Superficie m2	1000
medidas: 25*40
Estado lote	No Disponible
 Empresa con Boleto 	 Elgert  
 Sin Acceso  	
 Con Acceso: Tierra 	 x 
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	 x 
 Cloacas 	 x 
 sumidero y entubado  	 x 
 Cuneta tierra 	 x 
 Energia: MT y BT 	
 Energia: Alum. Publ. 	
Fibra Optica	x
pasto alto	no
Consumo Energ. Declarado	25hp
Consumo Energ. (Kva)	40kva'),
('pitnodisponible-55', 'NO DISPONIBLE', '9', NULL, '90.42*92.36', NULL, NULL, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 'AV1- PLANTA ELEVADORA DE CLOACA
PC: AV1', 'AV1- PLANTA ELEVADORA DE CLOACA
MEDIDAS: 90.42*92.36

MZ=9
PC: AV1'),
('pitreservado-1', 'RESERVADO', '11', '3', '32.90X95.17', '2.902,70', NULL, NULL, 0, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 'RESERVA  JMS TEJIDOS MARCELO SANCHEZ
DE RESERVA 	 JMS TEJIDOS MARCELO SANCHEZ', 'RESERVA  JMS TEJIDOS MARCELO SANCHEZ 


Manzana	11
Lote	3
Superficie m2	2.902,70
MEDIDAS: 32.90X95.17
Estado lote	Reservado
 DE RESERVA 	 JMS TEJIDOS MARCELO SANCHEZ 
 Sin Acceso  	
 Con Acceso: Tierra 	 x 
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	 x 
 Cloacas 	 x 
 sumidero y entubado  	 x 
 Cuneta tierra 	 x 
 Energia: MT y BT 	 x 
 Energia: Alum. Publ. 	
Fibra Optica	
pasto alto	si
Consumo Energ. Declarado	
Consumo Energ. (Kva)'),
('pitreservado-2', 'RESERVADO', '11', '6', '86.22*76.33', '5.460,47', NULL, 'Boleto', 0, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 'AMPLIACIÓN CANAVESIO (EN EJECUCION)', 'AMPLIACIÓN CANAVESIO (EN EJECUCION)

Manzana	11
Lote	6
Superficie m2	5.460,47
MEDIDAS:86.22*76.33
Estado lote	Reservado A CANAVESIO
 Empresa con Boleto 	
 Sin Acceso  	
 Con Acceso: Tierra 	 x 
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	 x 
 Cloacas 	 x 
 sumidero y entubado  	 x 
 Cuneta tierra 	
 Energia: MT y BT 	
 Energia: Alum. Publ. 	
Fibra Optica	
pasto alto	 si 
Consumo Energ. Declarado	
Consumo Energ. (Kva)'),
('pitreservado-3', 'RESERVADO', NULL, '1', '(211x186,17)', '39,096.57', NULL, NULL, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 0, 1, 'Reserva: CLARG', 'Reserva: CLARG
medidas:  (211x186,17) 


Lote	1
Superficie m2	39,096.57
Estado lote	Reservado
	 
 Sin Acceso  	
 Con Acceso: Tierra 	 x 
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	 x 
 Cloacas 	 x 
 sumidero y entubado  	
 Cuneta tierra 	 x 
 Energia: MT y BT 	
 Energia: Alum. Publ. 	
Fibra Optica	
pasto alto	si
Consumo Energ. Declarado	25hp
Consumo Energ. (Kva)	50kva'),
('pitreservado-4', 'RESERVADO', '3', '4', NULL, '300,00', NULL, NULL, 0, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 'RESERVA            DELVALLE GROUP - Jose Maria', 'RESERVA            DELVALLE GROUP - Jose Maria 

Manzana	3
Lote	4
Superficie m2	300,00
Estado lote	Disponible

 Sin Acceso  	
 Con Acceso: Tierra 	
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	 x 
 Agua 	 x 
 Cloacas 	 x 
 sumidero y entubado  	 x 
 Cuneta tierra 	
 Energia: MT y BT 	 x 
 Energia: Alum. Publ. 	 x 
Fibra Optica	x
pasto alto	 no 
Consumo Energ. Declarado	
Consumo Energ. (Kva)'),
('pitreservado-5', 'RESERVADO', '13', '18', '38.03*30+ochava', '1.055,00', NULL, NULL, 0, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 'RESERVA         PEREZ Y MARFIL
Fraccionador gases ind', 'RESERVA         PEREZ Y MARFIL
Fraccionador gases ind

Manzana	13
Lote	18
Superficie m2	1.055,00
medidas: 38.03*30+ochava
Estado lote	Disponible
  	
 Sin Acceso  	
 Con Acceso: Tierra 	
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	 x 
 Agua 	 x 
 Cloacas 	 x 
 sumidero y entubado  	 x 
 Cuneta tierra 	
 Energia: MT y BT 	 x 
 Energia: Alum. Publ. 	 x 
Fibra Optica	x
pasto alto	 si 
Consumo Energ. Declarado	
Consumo Energ. (Kva)'),
('pitreservado-6', 'RESERVADO', '13', '2', '20*50', '1.000,00', NULL, NULL, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 'AMPLIACIÓN RESERVA           INOX NORTE', 'AMPLIACIÓN RESERVA           INOX NORTE



Manzana	13
Lote	2
Superficie m2	1.000,00
medidas: 20*50
Estado lote	      Disponible
	
 Sin Acceso  	
 Con Acceso: Tierra 	 x 
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	 x 
 Cloacas 	 x 
 sumidero y entubado  	
 Cuneta tierra 	 x 
 Energia: MT y BT 	
 Energia: Alum. Publ. 	
Fibra Optica	x
pasto alto	 no 
Consumo Energ. Declarado	
Consumo Energ. (Kva)'),
('pitreservado-7', 'RESERVADO', NULL, '3', '32,16x46,33', '1.295,83', 'Federico Schneebauer', NULL, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 'RESERVA            Federico Schneebauer', 'RESERVA            Federico Schneebauer

Lote	3
medidas: 32,16x46,33
Superficie m2	1.295,83
Estado lote	reserva
 Empresa 	Federico Schneebauer
 Sin Acceso  	
 Con Acceso: Tierra 	
 Con Acceso: Ripio 	
 Con Acceso: Pavimento 	
 Agua 	 x 
 Cloacas 	 x 
 sumidero y entubado  	
 Cuneta tierra 	
 Energia: MT y BT 	
 Energia: Alum. Publ. 	
Fibra Optica	
pasto alto	 si 
Consumo Energ. Declarado	
Consumo Energ. (Kva)');
