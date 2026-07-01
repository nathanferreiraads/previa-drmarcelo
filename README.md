# LP Dr. Marcelo Marciano

Landing page de captação (consulta via WhatsApp). HTML/CSS/JS puro, deploy estático na Netlify.

## Configurar
Edite apenas `js/config.js` (Tintim, GTM, Supabase, CRM/RQE, Doctoralia). Cada campo tem comentário.

## Rodar local
```
node ../.claude/static-server.js "$PWD" 8080
# ou qualquer servidor estatico apontando para esta pasta
```

## Deploy
GitHub + Netlify. `netlify.toml` publica esta pasta como raiz. Domínio: `lp.drmarcelomarciano.com` (CNAME no HostGator apontando para o destino Netlify).

## Notas
- `noindex, nofollow` ativo: é página de tráfego pago, não deve indexar.
- Conversão: no envio do form dispara `generate_lead` + `contact` no dataLayer (com `event_id` para dedupe) e redireciona pelo link rastreável do Tintim.
- Sem travessão em nenhum texto (compliance CFM 2.336/2023).
