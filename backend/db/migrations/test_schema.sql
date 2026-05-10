-- test_schema.sql
-- Script completo de testes do schema StockRoute
-- Executar em um banco de testes para não afetar dados de produção

BEGIN; -- Inicia uma transação que será desfeita ao final

DO $$
DECLARE
    v_admin_id UUID;
    v_estoq_id UUID;
    v_prod_un_id UUID;
    v_prod_cx_id UUID;
    v_prod_sc_id UUID;
    v_prod_pc_id UUID;
    v_prod_ct_id UUID;
    v_prod_pr_id UUID;
    v_prod_m_id UUID;
    v_order_id UUID;
    v_order_id_2 UUID;
    v_item_id UUID;
    v_item_id_2 UUID;
    v_item_id_edge UUID;
    v_evid_id UUID;
    v_missing_id UUID;
    
    -- Variáveis auxiliares para queries
    v_count INTEGER;
    rec RECORD;
BEGIN
    RAISE NOTICE '==================================================';
    RAISE NOTICE 'INICIANDO TESTES DO SCHEMA STOCKROUTE';
    RAISE NOTICE '==================================================';

    -------------------------------------------------------------------
    -- BLOCO 1: Testes de Inserção Válida (devem passar)
    -------------------------------------------------------------------
    RAISE NOTICE '>> BLOCO 1: Testes de Inserção Válida';
    
    -- Inserir ADMIN válido
    INSERT INTO users (name, email, password_hash, role)
    VALUES ('Admin Teste', 'admin@teste.com', 'hash123', 'ADMIN')
    RETURNING id INTO v_admin_id;
    RAISE NOTICE '[OK] Usuário ADMIN inserido com sucesso';

    -- Inserir ESTOQUISTA válido
    INSERT INTO users (name, email, password_hash, role)
    VALUES ('Estoquista Teste', 'estoque@teste.com', 'hash123', 'ESTOQUISTA')
    RETURNING id INTO v_estoq_id;
    RAISE NOTICE '[OK] Usuário ESTOQUISTA inserido com sucesso';

    -- Inserir produtos com cada uma das 7 unidades
    INSERT INTO products (sku, name, unit) VALUES ('SKU-UN', 'Prod UN', 'UN') RETURNING id INTO v_prod_un_id;
    INSERT INTO products (sku, name, unit) VALUES ('SKU-CX', 'Prod CX', 'CX') RETURNING id INTO v_prod_cx_id;
    INSERT INTO products (sku, name, unit) VALUES ('SKU-SC', 'Prod SC', 'SC') RETURNING id INTO v_prod_sc_id;
    INSERT INTO products (sku, name, unit) VALUES ('SKU-PC', 'Prod PC', 'PC') RETURNING id INTO v_prod_pc_id;
    INSERT INTO products (sku, name, unit) VALUES ('SKU-CT', 'Prod CT', 'CT') RETURNING id INTO v_prod_ct_id;
    INSERT INTO products (sku, name, unit) VALUES ('SKU-PR', 'Prod PR', 'PR') RETURNING id INTO v_prod_pr_id;
    INSERT INTO products (sku, name, unit) VALUES ('SKU-M',  'Prod M',  'M')  RETURNING id INTO v_prod_m_id;
    RAISE NOTICE '[OK] 7 Produtos inseridos com sucesso (todas as unidades)';

    -- Inserir pedido válido (PENDING)
    INSERT INTO orders (order_number, customer_name, status)
    VALUES ('ORD-001', 'Cliente Teste', 'PENDING')
    RETURNING id INTO v_order_id;
    RAISE NOTICE '[OK] Pedido PENDING inserido com sucesso';

    -- Inserir item de pedido com quantidades consistentes
    INSERT INTO order_items (order_id, product_id, quantity, picked_quantity, missing_quantity, status)
    VALUES (v_order_id, v_prod_un_id, 10, 5, 0, 'PARTIAL')
    RETURNING id INTO v_item_id;
    RAISE NOTICE '[OK] Item de pedido inserido com sucesso';

    -- Inserir evidência fotográfica
    INSERT INTO picking_evidences (order_item_id, image_url, created_by)
    VALUES (v_item_id, 'https://img.url/foto.jpg', v_estoq_id)
    RETURNING id INTO v_evid_id;
    RAISE NOTICE '[OK] Evidência fotográfica inserida com sucesso';

    -- Inserir item faltante
    INSERT INTO missing_items (order_item_id, reason, created_by)
    VALUES (v_item_id, 'Produto quebrado na prateleira', v_estoq_id)
    RETURNING id INTO v_missing_id;
    RAISE NOTICE '[OK] Registro de item faltante inserido com sucesso';


    -------------------------------------------------------------------
    -- BLOCO 2: Testes de Constraints (devem falhar)
    -------------------------------------------------------------------
    RAISE NOTICE '>> BLOCO 2: Testes de Constraints (Erros Esperados)';

    BEGIN
        INSERT INTO users (name, email, password_hash, role) VALUES ('X', 'gerente@teste.com', 'x', 'GERENTE');
        RAISE EXCEPTION 'FALHA: Permitiu inserir role inválida';
    EXCEPTION WHEN check_violation THEN RAISE NOTICE '[OK] Impediu role inválida (GERENTE)'; END;

    BEGIN
        INSERT INTO users (name, email, password_hash, role) VALUES ('X2', 'admin@teste.com', 'x', 'ADMIN');
        RAISE EXCEPTION 'FALHA: Permitiu email duplicado';
    EXCEPTION WHEN unique_violation THEN RAISE NOTICE '[OK] Impediu email duplicado'; END;

    BEGIN
        INSERT INTO products (sku, name, unit) VALUES ('SKU-ERR', 'Prod Err', 'KG');
        RAISE EXCEPTION 'FALHA: Permitiu unit inválida';
    EXCEPTION WHEN check_violation THEN RAISE NOTICE '[OK] Impediu unit inválida (KG)'; END;

    BEGIN
        INSERT INTO products (sku, name, unit) VALUES ('SKU-UN', 'Prod Dup', 'UN');
        RAISE EXCEPTION 'FALHA: Permitiu SKU duplicado';
    EXCEPTION WHEN unique_violation THEN RAISE NOTICE '[OK] Impediu SKU duplicado'; END;

    BEGIN
        INSERT INTO orders (order_number, customer_name, status) VALUES ('ORD-ERR', 'X', 'ENVIADO');
        RAISE EXCEPTION 'FALHA: Permitiu status de pedido inválido';
    EXCEPTION WHEN check_violation THEN RAISE NOTICE '[OK] Impediu status de pedido inválido'; END;

    BEGIN
        INSERT INTO orders (order_number, customer_name, status) VALUES ('ORD-001', 'X2', 'PENDING');
        RAISE EXCEPTION 'FALHA: Permitiu order_number duplicado';
    EXCEPTION WHEN unique_violation THEN RAISE NOTICE '[OK] Impediu order_number duplicado'; END;

    BEGIN
        INSERT INTO order_items (order_id, product_id, quantity) VALUES (v_order_id, v_prod_un_id, 0);
        RAISE EXCEPTION 'FALHA: Permitiu quantity = 0';
    EXCEPTION WHEN check_violation THEN RAISE NOTICE '[OK] Impediu quantity = 0'; END;

    BEGIN
        INSERT INTO order_items (order_id, product_id, quantity) VALUES (v_order_id, v_prod_un_id, -5);
        RAISE EXCEPTION 'FALHA: Permitiu quantity negativa';
    EXCEPTION WHEN check_violation THEN RAISE NOTICE '[OK] Impediu quantity negativa'; END;

    BEGIN
        INSERT INTO order_items (order_id, product_id, quantity, picked_quantity) VALUES (v_order_id, v_prod_un_id, 10, -1);
        RAISE EXCEPTION 'FALHA: Permitiu picked_quantity negativa';
    EXCEPTION WHEN check_violation THEN RAISE NOTICE '[OK] Impediu picked_quantity negativa'; END;

    BEGIN
        INSERT INTO order_items (order_id, product_id, quantity, missing_quantity) VALUES (v_order_id, v_prod_un_id, 10, -1);
        RAISE EXCEPTION 'FALHA: Permitiu missing_quantity negativa';
    EXCEPTION WHEN check_violation THEN RAISE NOTICE '[OK] Impediu missing_quantity negativa'; END;

    BEGIN
        INSERT INTO order_items (order_id, product_id, quantity, picked_quantity, missing_quantity) VALUES (v_order_id, v_prod_un_id, 10, 6, 5);
        RAISE EXCEPTION 'FALHA: Permitiu picked + missing > quantity';
    EXCEPTION WHEN check_violation THEN RAISE NOTICE '[OK] Impediu picked_quantity + missing_quantity > quantity'; END;

    BEGIN
        INSERT INTO order_items (order_id, product_id, quantity, status) VALUES (v_order_id, v_prod_un_id, 10, 'FINALIZADO');
        RAISE EXCEPTION 'FALHA: Permitiu status de item inválido';
    EXCEPTION WHEN check_violation THEN RAISE NOTICE '[OK] Impediu status de item inválido (FINALIZADO)'; END;

    BEGIN
        INSERT INTO picking_evidences (order_item_id, image_url, created_by) VALUES (v_item_id, NULL, v_estoq_id);
        RAISE EXCEPTION 'FALHA: Permitiu evidência sem image_url';
    EXCEPTION WHEN not_null_violation THEN RAISE NOTICE '[OK] Impediu evidência sem image_url (NULL)'; END;

    BEGIN
        INSERT INTO missing_items (order_item_id, reason, created_by) VALUES (v_item_id, NULL, v_estoq_id);
        RAISE EXCEPTION 'FALHA: Permitiu missing_item sem reason';
    EXCEPTION WHEN not_null_violation THEN RAISE NOTICE '[OK] Impediu missing_item sem reason (NULL)'; END;


    -------------------------------------------------------------------
    -- BLOCO 3: Testes de CASCADE e RESTRICT
    -------------------------------------------------------------------
    RAISE NOTICE '>> BLOCO 3: Testes de CASCADE e RESTRICT';
    
    -- RESTRICT: Tentar deletar produto que tem item de pedido
    BEGIN
        DELETE FROM products WHERE id = v_prod_un_id;
        RAISE EXCEPTION 'FALHA: Permitiu deletar produto vinculado a pedido';
    EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE '[OK] RESTRICT: Impediu exclusão de produto com pedidos'; END;

    -- RESTRICT: Tentar deletar usuário que tem evidência
    BEGIN
        DELETE FROM users WHERE id = v_estoq_id;
        RAISE EXCEPTION 'FALHA: Permitiu deletar usuário com evidências/faltas';
    EXCEPTION WHEN foreign_key_violation THEN RAISE NOTICE '[OK] RESTRICT: Impediu exclusão de usuário vinculados'; END;

    -- CASCADE: Deletar item de pedido deve apagar evidências e missing items
    DELETE FROM order_items WHERE id = v_item_id;
    SELECT count(*) INTO v_count FROM picking_evidences WHERE order_item_id = v_item_id;
    IF v_count = 0 THEN RAISE NOTICE '[OK] CASCADE: Evidências deletadas ao deletar o order_item';
    ELSE RAISE EXCEPTION 'FALHA: Evidências órfãs permaneceram'; END IF;

    SELECT count(*) INTO v_count FROM missing_items WHERE order_item_id = v_item_id;
    IF v_count = 0 THEN RAISE NOTICE '[OK] CASCADE: Missing items deletados ao deletar o order_item';
    ELSE RAISE EXCEPTION 'FALHA: Missing items órfãos permaneceram'; END IF;

    -- Recriar item e evidências para testar o CASCADE do order_id
    INSERT INTO order_items (order_id, product_id, quantity) VALUES (v_order_id, v_prod_un_id, 10) RETURNING id INTO v_item_id;
    INSERT INTO picking_evidences (order_item_id, image_url, created_by) VALUES (v_item_id, 'url', v_admin_id);
    INSERT INTO missing_items (order_item_id, reason, created_by) VALUES (v_item_id, 'reason', v_admin_id);

    -- CASCADE: Deletar pedido deve apagar order_items (e por consequência evidências/faltas)
    DELETE FROM orders WHERE id = v_order_id;
    SELECT count(*) INTO v_count FROM order_items WHERE order_id = v_order_id;
    IF v_count = 0 THEN RAISE NOTICE '[OK] CASCADE: Itens deletados ao deletar o order';
    ELSE RAISE EXCEPTION 'FALHA: Itens órfãos permaneceram após deletar pedido'; END IF;

    -------------------------------------------------------------------
    -- BLOCO 4: Testes de Queries Críticas do Sistema
    -------------------------------------------------------------------
    RAISE NOTICE '>> BLOCO 4: Testes de Queries Críticas';
    
    -- Setup de dados limpos para as queries
    INSERT INTO orders (order_number, customer_name, status) VALUES ('ORD-QUERY', 'Query Customer', 'PENDING') RETURNING id INTO v_order_id_2;
    INSERT INTO order_items (order_id, product_id, quantity) VALUES (v_order_id_2, v_prod_cx_id, 20) RETURNING id INTO v_item_id_2;
    INSERT INTO picking_evidences (order_item_id, image_url, created_by) VALUES (v_item_id_2, 'http://evid.jpg', v_estoq_id);
    INSERT INTO missing_items (order_item_id, reason, created_by) VALUES (v_item_id_2, 'Avaria', v_estoq_id);

    -- Buscar pedido por order_number
    SELECT * INTO rec FROM orders WHERE order_number = 'ORD-QUERY';
    IF FOUND THEN RAISE NOTICE '[OK] Busca de pedido por order_number funcionou'; END IF;

    -- Buscar todos os itens de um pedido com nome e unidade do produto
    SELECT oi.id INTO rec FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = v_order_id_2 LIMIT 1;
    IF FOUND THEN RAISE NOTICE '[OK] JOIN de order_items com products funcionou'; END IF;

    -- Buscar evidências com nome do usuário
    SELECT pe.id INTO rec FROM picking_evidences pe JOIN users u ON pe.created_by = u.id WHERE pe.order_item_id = v_item_id_2 LIMIT 1;
    IF FOUND THEN RAISE NOTICE '[OK] JOIN de picking_evidences com users funcionou'; END IF;

    -- Buscar faltas com nome do usuário
    SELECT mi.id INTO rec FROM missing_items mi JOIN users u ON mi.created_by = u.id WHERE mi.order_item_id = v_item_id_2 LIMIT 1;
    IF FOUND THEN RAISE NOTICE '[OK] JOIN de missing_items com users funcionou'; END IF;

    -- Buscar pedidos filtrados por status
    SELECT count(*) INTO v_count FROM orders WHERE status = 'PENDING';
    IF v_count >= 1 THEN RAISE NOTICE '[OK] Busca de pedidos por status com índice funcionou'; END IF;

    -- Buscar produto por SKU
    SELECT count(*) INTO v_count FROM products WHERE sku = 'SKU-CX';
    IF v_count = 1 THEN RAISE NOTICE '[OK] Busca de produto por SKU funcionou'; END IF;


    -------------------------------------------------------------------
    -- BLOCO 5: Testes de Edge Cases
    -------------------------------------------------------------------
    RAISE NOTICE '>> BLOCO 5: Testes de Edge Cases';

    -- Inserir item com limite exato (picked + missing == quantity)
    INSERT INTO order_items (order_id, product_id, quantity, picked_quantity, missing_quantity) 
    VALUES (v_order_id_2, v_prod_cx_id, 10, 8, 2);
    RAISE NOTICE '[OK] EDGE: Permitiu picked + missing exatamente igual a quantity';

    -- Inserir item totalmente PICKED (picked = quantity, missing = 0)
    INSERT INTO order_items (order_id, product_id, quantity, picked_quantity, missing_quantity) 
    VALUES (v_order_id_2, v_prod_sc_id, 5, 5, 0);
    RAISE NOTICE '[OK] EDGE: Permitiu PICKED total (picked = quantity, missing = 0)';

    -- Pedido sem pdf_url (já testamos, mas validamos aqui)
    INSERT INTO orders (order_number, customer_name, pdf_url) VALUES ('ORD-EDGE1', 'C', NULL);
    RAISE NOTICE '[OK] EDGE: Permitiu pedido sem pdf_url (NULL)';

    -- Produto sem image_url
    INSERT INTO products (sku, name, unit, image_url) VALUES ('SKU-EDGE', 'N', 'UN', NULL);
    RAISE NOTICE '[OK] EDGE: Permitiu produto sem image_url (NULL)';

    -- Dois itens do mesmo produto no mesmo pedido
    INSERT INTO order_items (order_id, product_id, quantity) VALUES (v_order_id_2, v_prod_pc_id, 1);
    INSERT INTO order_items (order_id, product_id, quantity) VALUES (v_order_id_2, v_prod_pc_id, 2);
    RAISE NOTICE '[OK] EDGE: Permitiu múltiplos itens do mesmo produto no mesmo pedido';

    -- updated_at default checks
    SELECT updated_at INTO rec FROM users WHERE id = v_admin_id;
    IF rec.updated_at IS NOT NULL THEN RAISE NOTICE '[OK] EDGE: updated_at preenchido automaticamente (NOW())'; END IF;

    RAISE NOTICE '==================================================';
    RAISE NOTICE 'TODOS OS TESTES FORAM CONCLUÍDOS COM SUCESSO!';
    RAISE NOTICE 'Fazendo ROLLBACK para manter o banco intacto...';
    RAISE NOTICE '==================================================';
END $$;

ROLLBACK; -- Desfaz todas as inserções e deleções do teste
