# Ranking Colaborativo — Medicina de Emergência

Aplicação Next.js pequena para o grupo comparar notas e duas opções de programas de Medicina de Emergência do ENARE 2026/2027.

## Rodar localmente

1. Crie um projeto gratuito no [Supabase](https://supabase.com/).
2. No SQL Editor, execute primeiro `supabase/schema.sql` e depois `supabase/seed.sql`.
3. Copie `.env.example` para `.env.local` e preencha a URL e a chave `anon` do projeto.
4. Instale e inicie:

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

## Publicar na Vercel

Importe este repositório na Vercel e adicione as mesmas variáveis `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` em **Settings → Environment Variables**. O comando de build padrão é `npm run build`.

## Dados dos programas

O seed contém os 25 registros cujo campo **Especialidade** consta como **MEDICINA DE EMERGÊNCIA** no Anexo II oficial de vagas de Residência Médica (Acesso Direto), edição ENARE 2026/2027, atualizado em 31 de agosto de 2026. Cada cenário de prática é uma linha própria — inclusive Hospital Regional Norte e Hospital Regional do Cariri, no Ceará.

Fonte oficial: https://enare2026.conhecimento.fgv.br/vagas/medica-acesso-direto/

## Observação de privacidade

Não há login nesta versão. Por isso, as políticas RLS permitem leitura e inserção públicas, coerente com o ranking que fica visível ao grupo. Não inclua dados sensíveis no formulário.
