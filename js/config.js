/* ============================================================
   CONFIG  ·  Landing Page Dr. Marcelo Marciano
   ------------------------------------------------------------
   Este e o UNICO arquivo que voce precisa editar para ligar a
   pagina. Cada valor abaixo tem um comentario do que e e de
   onde tirar. Enquanto um valor estiver com placeholder, a
   parte correspondente fica inerte (a pagina continua funcionando).
   ============================================================ */
window.LP_CONFIG = {

  /* ---------- WhatsApp / Tintim (JA CONFIGURADO) ----------
     Link rastreavel do Tintim. E para onde o lead e enviado
     depois de enviar o formulario. Atribuicao de UTM fica por
     conta do pixel do Tintim + deste link. */
  TINTIM_LINK: "https://tintim.link/whatsapp/27527554-75a9-4530-a542-b49ad7e2f92b/9aebba49-2802-4839-935c-b551b1c154c2",
  TINTIM_ACCOUNT_CODE: "27527554-75a9-4530-a542-b49ad7e2f92b",
  /* Anexar a mensagem (com o caso) ao link do Tintim via ?text=.
     Deixe false ate confirmar que o Tintim respeita esse parametro.
     O caso sempre e gravado no lead e no dataLayer, independente disto. */
  TINTIM_APPEND_TEXT: false,

  /* ---------- GTM (CRIAR DEPOIS) ----------
     Enquanto estiver "GTM-XXXXXXX" o container NAO carrega
     (evita request quebrado). Troque pelo ID real quando criar. */
  GTM_ID: "GTM-XXXXXXX",

  /* ---------- Supabase (CRIAR DEPOIS) ----------
     Enquanto vazio, o lead NAO grava em banco (so dispara o
     dataLayer e abre o WhatsApp). Preencha para ativar a captura.
     A anon key e publica e fica protegida por RLS (so INSERT). */
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",

  /* ---------- Dados do medico (compliance: visiveis) ---------- */
  CRM: "CRM-SP 107532",
  RQE: "RQE 48846",

  /* ---------- Conversao ----------
     Valor simbolico do lead para otimizacao (opcional). */
  LEAD_VALUE: 0,
  CURRENCY: "BRL"
};
