-- Imagens padrão para os produtos do sandbox.
-- Só preenche o que está sem imagem, então roda depois do seed_004 sem
-- sobrescrever as ilustrações específicas dele e é seguro repetir a cada boot.

UPDATE products SET image_url = CASE
  WHEN name ILIKE '%dobrad%'                                     THEN '/demo/product-hinge.svg'
  WHEN name ILIKE '%fita%'  OR name ILIKE '%estopa%'             THEN '/demo/product-tape.svg'
  WHEN name ILIKE '%pistao%' OR name ILIKE '%pistão%'            THEN '/demo/product-piston.svg'
  WHEN name ILIKE '%corred%' OR name ILIKE '%pux%'
    OR name ILIKE '%perfil%' OR name ILIKE '%trilho%'            THEN '/demo/product-slide.svg'
  WHEN name ILIKE '%mdf%'   OR name ILIKE '%tapa%'
    OR name ILIKE '%chapa%' OR name ILIKE '%fita de borda%'      THEN '/demo/product-board.svg'
  WHEN name ILIKE '%parafuso%' OR name ILIKE '%cavilha%'
    OR name ILIKE '%pino%'     OR name ILIKE '%bucha%'
    OR name ILIKE '%conect%'   OR name ILIKE '%cantoneira%'
    OR name ILIKE '%minifix%'  OR name ILIKE '%rafix%'           THEN '/demo/product-fastener.svg'
  ELSE '/demo/product-generic.svg'
END
WHERE image_url IS NULL;
