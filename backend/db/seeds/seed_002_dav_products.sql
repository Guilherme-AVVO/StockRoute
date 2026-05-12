-- Produtos extraídos dos DAVs reais 113364, 113372 e 113347.
-- SKUs usam o código de 14 dígitos conforme aparece no PDF DAV.
-- Itens KT (kit) e itens de serviço estão excluídos.

INSERT INTO products (sku, name, unit) VALUES
  -- DAV 113364 — REVITALIZE PLANEJADOS
  ('00000000002671', 'PARAFUSO 35 X 16MM PHS 100 UND PROMOB',                         'UN'),
  ('00000000001649', 'PARAFUSO 40 X 40MM PHS 100 UND',                                 'SC'),
  ('00000000000322', 'CAVILHA 8 X 30MM 100UNID',                                        'UN'),
  ('00000000001638', 'PARAFUSO 35 X 16MM ZINCADO PHS 50 UND',                           'SC'),
  ('00000000004585', 'BUCHA U-BS 08MM - USAF',                                           'UN'),
  ('00000000004523', 'DOBRAD 110G C/AMORT CURVA - RENNA',                               'UN'),
  ('00000000001884', 'FITA INST. BCO TX 0.7 X 22MM - TB',                               'M'),
  ('00000000000703', 'MDF BRANCO 2F 15MM 1850 X 2750 / MULTIMARCAS',                   'UN'),
  ('00000000004477', 'DOBRAD 110G C/AMORT RETA - RENNA',                                'UN'),
  ('00000000002991', 'CONECT RASANT RED TAB 16MM MDF 15MM ZMK NIQ',                    'UN'),
  ('00000000000003', 'CANTONEIRA MACICA 2 FUROS NIQ',                                   'UN'),
  ('00000000001641', 'PARAFUSO 35 X 30 PHS 100 UND',                                    'SC'),
  ('00000000002062', 'PARAFUSO 40 X 50MM PHS 100 UND',                                  'SC'),
  ('00000000001640', 'PARAFUSO 35 X 25MM PHS 100 UND',                                  'SC'),
  ('00000000000598', 'MDF MEIA CHAPA BRANCO 06MM 922 X 2750 MULTIMARCAS',              'UN'),
  ('00000000002027', 'PARAFUSO 60 X 60MM ZINCADO 25 UND',                               'SC'),
  ('00000000003149', 'MDF CORINGA 06MM - CHAPA 1',                                      'UN'),
  ('00000000002225', 'FITA INST. CORINGA 1 - 0.4 X 22MM',                              'UN'),
  ('00000000001166', 'TAPA FUROS BRANCO TX 13MM (C/ 50 UND)',                           'CT'),
  ('00000000000323', 'CAVILHA 8 X 40MM 100UNID',                                        'UN'),
  ('00000000000447', 'MDF MEIA CHAPA BRANCO 2F 15MM 922 X 2750 MULTIMARCAS',           'UN'),
  ('00000000003422', 'PUX ROMA SOBREPOSTO 8015 CAPUCCINO 082MM (C/ FURACAO)',           'UN'),
  ('00000000001052', 'CORRED TELESCOP LARGA 400MM ZIN',                                 'PR'),
  ('00000000000122', 'PISTAO FGV INVERSO BRANCO 80N',                                   'PC'),
  ('00000000001030', 'TAPA FUROS BRANCO TX 19MM (C/ 30 UND)',                           'CT'),
  ('00000000000935', 'MDF BRANCO 2F 06MM 1840 X 2750 / MULTIMARCAS',                   'UN'),
  ('00000000001378', 'MDF CORINGA 15MM - CHAPA 1',                                      'UN'),

  -- DAV 113372 — EDUARDO DA SILVA ANTUNES
  ('00000000002369', 'TAPA FUROS ITAPUA 13MM DURATEX (C/ 50 UND)',                     'CT'),
  ('00000000002405', 'TAPA FUROS ITAPUA 19MM DURATEX (C/ 30 UND)',                     'CT'),
  ('00000000003803', 'BATENTE DE SILIC TRANSP 15MM QUAD 50 UND',                       'CT'),
  ('00000000002718', 'PUX PERFIL CAVA 15MM ANOD',                                      'UN'),
  ('00000000000159', 'PISTAO FGV NORMAL CINZA 80N',                                    'UN'),
  ('00000000001045', 'THINNER P/ LIMPEZA 1540 900ML (FARBEN)',                         'UN'),
  ('00000000002589', 'FITA BORDA 0.4 X 44MM CINZA SAGRADO DURATEX - TB',              'M'),
  ('00000000002279', 'MDF CINZA SAGRADO ESSENCIAL 2F 15MM 1840 X 2750 / DURATEX',     'UN'),
  ('00000000002817', 'ACAB PUX PERFIL CAVA 15MM ANOD',                                 'PR'),
  ('00000000002410', 'TAPA FUROS CINZA SAGRADO 13MM DURATEX (C/ 50 UND)',              'CT'),
  ('00000000002960', 'DOBRAD 105G CLICK C/ AMORT RETA NIQ',                            'UN'),
  ('00000000003058', 'FITA INST. CINZA SAGRADO 0.7 X 22MM DURATEX - TB',              'M'),
  ('00000000002965', 'DOBRAD 165G CLICK C/ AMORT RETA ZMK NIQ - HAFELE',              'UN'),
  ('00000000000243', 'ESTOPA BRANCA EXTRA 400G',                                        'SC'),
  ('00000000002390', 'TAPA FUROS CINZA SAGRADO CRISTALLO 19MM DURATEX (C/ 30 UND)',   'CT'),

  -- DAV 113347 — DREAMS HOME MOVEIS E DECORACOES LTDA
  ('00000000005684', 'PUX UNO IL280 ALUM 082MM ANOD',                                  'UN'),
  ('00000000002537', 'MDF ITAPUA 2F 15MM 1850 X 2750 / DURATEX',                       'UN'),
  ('00000000001465', 'PINO MINIFIX S200 5X9MM ACO ZIN (HAFELE)',                        'UN'),
  ('00000000000219', 'CONECT RAFIX (VB) PLAST BCO MDF 15MM - HAFELE',                  'UN'),
  ('00000000000487', 'PINO RAFIX M20 5X7.5MM ROSCA CURTA ZMK NAT (HAFELE)',            'UN'),
  ('00000000002705', 'FITA INST. ITAPUA 0.7 X 22MM DURATEX - TB',                     'M'),
  ('00000000000117', 'PISTAO FGV NORMAL BRANCO 80N',                                   'UN'),
  ('00000000005174', 'MDF NUVEM 2F 15MM 1850 X 2750 / GUARARAPES',                    'UN'),
  ('00000000000216', 'CONECT MINIFIX 15/15 ZMK NAT',                                   'UN'),
  ('00000000005016', 'FITA INST. NUVEM 0.7 X 22MM GUARARAPES - TB',                   'M')
ON CONFLICT (sku) DO NOTHING;
