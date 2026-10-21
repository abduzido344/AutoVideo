export type Job = {
  id: number; project_dir: string; recipe: string; auto: number; status: string; stage: string; error: string
  created: number; updated: number
}
export type Auth = { ok: boolean; detail: string }
export type Doctor = { ok: boolean; checks: { name: string; ok: boolean; detail: string }[] }

export type Rede = "youtube" | "tiktok" | "instagram" | "facebook"
export type Agenda = { gerar_as: string; por_dia: number; postar_as: string[]; episodios_por_serie: number }
export type Conta = { conectada: boolean; usuario: string }
export type Perfil = {
  slug: string; nome: string; assunto: string; publico: string; estilo: string; voz_id: string; ativo: boolean
  agenda: Agenda; contas: Record<Rede, Conta>; onboarding: number
}
export type Ideia = { id: string; texto: string; origem: "usuario" | "claude"; usada: boolean }
export type EpisodioRef = { n: number; titulo: string; sinopse: string; job: number | null; postado: Rede[] }
export type Serie = { slug: string; titulo: string; logline: string; ideia: string | null; paused: boolean; episodios: EpisodioRef[] }
export type Personagem = { slug: string; ficha: string; folha: boolean; aprovada: boolean }
export type PerfilDetalhe = {
  perfil: Perfil; ideias: Ideia[]; personagens: Personagem[]
  // path_rel é relativo à pasta de perfis (ex.: "benji/series/01-x")
  series: { path_rel: string; serie: Serie; episodios: { n: number; titulo: string; job: number | null; status: string | null; stage: string | null }[] }[]
  universo: { mundo: string; historico: string }
}
export type EstiloInfo = { slug: string; origem: "usuario" | "fabrica"; titulo: string }
export type Estilo = {
  titulo: string; duracao_alvo_s: [number, number]; segundos_por_cena: number; legenda: boolean; paleta: string[]
  telas: string[]; imagem_prefixo: string; folha_prefixo: string; gancho: string; voz_padrao: string
}
export type EstiloDetalhe = { md: string; json: Estilo }
export type ChatKind = "onboarding" | "estilo"
export type ChatMsg = { autor: "voce" | "claude"; texto: string }
export type ChatReply = { resposta: string; historico: ChatMsg[]; etapa: number }

export type Voz = { voice_id: string; nome: string; preview_url: string | null; descricao: string }

export type Chave = { mascara: string; ambiente: boolean }
export type Config = {
  // null = não salva; a chave nunca volta inteira, só a máscara (começo e fim)
  keys: Record<"ELEVENLABS_API_KEY" | "OPENROUTER_API_KEY" | "HIGGSFIELD_API_KEY" | "OPENAI_API_KEY" | "APIFY_TOKEN", Chave | null>
  image_provider: string; image_model: string; higgsfield_model: string; openai_model: string; max_imagens: number
}
export type ConfigPatch = Partial<{
  ELEVENLABS_API_KEY: string; OPENROUTER_API_KEY: string; HIGGSFIELD_API_KEY: string; OPENAI_API_KEY: string; APIFY_TOKEN: string
  image_provider: string; image_model: string; higgsfield_model: string; openai_model: string; max_imagens: number
}>

export type FilaJob = Job & {
  perfil: string | null; serie: string | null; n: number | null; titulo: string | null
  // só nos jobs de episódio
  capa?: string | null; video?: boolean; aprovado?: boolean; postado?: Rede[]
}
export type Fila = { paused: boolean; paused_until: number | null; reason: string; jobs: FilaJob[] }

export type Decision = {
  ts: number; role?: string; model?: string; attempt?: number; cost_usd?: number | null; turns?: number | null
  is_error?: boolean; result?: string
}
export type Episodio = {
  job: Job; perfil: string | null; serie: string | null; n: number | null; titulo: string | null
  roteiro: string; episodio: unknown; cenas: unknown; revisao: unknown; ajustes: string
  decisions: Decision[]
  postado: Rede[]
  aprovado: boolean
  final: string | null; capa: string | null // URLs /projects/...
}

export class ApiError extends Error {
  readonly status: number
  constructor(message: string, status: number) { super(message); this.status = status }
}

async function j<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(path, init)
  if (!r.ok) {
    const body = await r.text()
    let msg: unknown = body
    try { msg = JSON.parse(body).detail ?? body } catch { /* corpo não é JSON */ }
    throw new ApiError(typeof msg === "string" ? msg : JSON.stringify(msg), r.status)
  }
  return r.json() as Promise<T>
}
const send = <T>(method: string, path: string, body?: unknown) =>
  j<T>(path, body === undefined ? { method } : { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
type Ok = { ok: boolean }
const e = encodeURIComponent

export const api = {
  doctor: () => j<Doctor>("/api/doctor"),
  auth: () => j<Auth>("/api/auth"),
  authLogin: () => send<Ok>("POST", "/api/auth/login"),
  config: () => j<Config>("/api/config"),
  saveConfig: (patch: ConfigPatch) => send<Config>("PUT", "/api/config", patch),

  estilos: () => j<EstiloInfo[]>("/api/estilos"),
  estilo: (slug: string) => j<EstiloDetalhe>(`/api/estilos/${e(slug)}`),
  analisarEstilo: (handle: string) => send<{ job: number }>("POST", "/api/estilos/analisar", { handle }),

  perfis: () => j<Perfil[]>("/api/perfis"),
  novoPerfil: (nome: string) => send<Perfil>("POST", "/api/perfis", { nome }),
  perfil: (slug: string) => j<PerfilDetalhe>(`/api/perfis/${e(slug)}`),
  // merge raso: agenda e contas vão inteiras
  salvarPerfil: (slug: string, patch: Partial<Omit<Perfil, "slug">>) => send<Perfil>("PUT", `/api/perfis/${e(slug)}`, patch),
  gerarFolha: (slug: string, p: string) => send<Ok>("POST", `/api/perfis/${e(slug)}/personagens/${e(p)}/folha`),
  aprovarPersonagem: (slug: string, p: string) => send<Ok>("POST", `/api/perfis/${e(slug)}/personagens/${e(p)}/aprovar`),
  salvarMundo: (slug: string, texto: string) => send<Ok>("PUT", `/api/perfis/${e(slug)}/universo/mundo`, { texto }),
  addIdeia: (slug: string, texto: string) => send<Ideia>("POST", `/api/perfis/${e(slug)}/ideias`, { texto }),
  delIdeia: (slug: string, id: string) => send<Ok>("DELETE", `/api/perfis/${e(slug)}/ideias/${e(id)}`),
  gerar: (slug: string) => send<Ok>("POST", `/api/perfis/${e(slug)}/gerar`),

  chat: (kind: ChatKind, slug: string) => j<ChatMsg[]>(`/api/chat/${kind}/${e(slug)}`),
  chatSend: (kind: ChatKind, slug: string, mensagem: string) => send<ChatReply>("POST", `/api/chat/${kind}/${e(slug)}`, { mensagem }),

  vozes: () => j<Voz[]>("/api/vozes"),

  fila: () => j<Fila>("/api/fila"),
  pausarFila: () => send<Ok>("POST", "/api/fila/pausar"),
  continuarFila: () => send<Ok>("POST", "/api/fila/continuar"),
  pausarSerie: (path_rel: string, paused: boolean) => send<Ok>("POST", "/api/series/pausar", { path_rel, paused }),

  episodio: (jid: number) => j<Episodio>(`/api/episodios/${jid}`),
  aprovar: (jid: number) => send<Ok>("POST", `/api/episodios/${jid}/aprovar`),
  ajustar: (jid: number, texto: string) => send<Ok>("POST", `/api/episodios/${jid}/ajustar`, { texto }),
  descartar: (jid: number) => send<Ok>("POST", `/api/episodios/${jid}/descartar`),
  retomar: (jid: number) => send<Ok>("POST", `/api/episodios/${jid}/retomar`),
  postado: (jid: number, rede: Rede) => send<{ ok: boolean; postado: Rede[] }>("POST", `/api/episodios/${jid}/postado`, { rede }),
}
