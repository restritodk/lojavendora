<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Vendora Multi-Loja

O Vendora é multi-loja. Cada lojista tem seu próprio painel administrativo e seu próprio site público.

- Toda funcionalidade nova deve derivar a loja atual pelo usuário autenticado no painel ou pelo `slug` público da loja.
- Toda query de criação, leitura, atualização e exclusão de dados da loja deve usar `storeId`.
- Produtos, categorias, clientes, pedidos, promoções, relatórios, páginas, configurações, integrações, credenciais, apps, logos, imagens e arquivos pertencem sempre a uma loja específica.
- Nunca implemente dados globais para recursos da loja quando o correto for isolar por `storeId`.
- Imagens e arquivos de lojistas devem ser enviados para Cloudflare R2 quando configurado, usando prefixos com `storeId`, por exemplo `stores/{storeId}/...`.
- PDFs, relatórios, páginas públicas e telas do painel devem carregar a logo e os dados da loja dona do `storeId` atual.
