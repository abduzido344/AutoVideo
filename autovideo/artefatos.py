"""Modelos dos artefatos de um episódio (episodio.json, cenas.json, voz.json, edicao.json, revisao.json).
Só validação de schema; as checagens entre arquivos (roteiro, personagens, limite de imagens) ficam no episode."""
from typing import Literal
from pydantic import BaseModel, Field, model_validator
from autovideo.blocks import SCHEMAS
from autovideo.data import ScreenType


class Post(BaseModel):
    caption: str
    hashtags: list[str]


class EpisodioOut(BaseModel):
    titulo: str
    resumo: str
    post: Post


class Screen(BaseModel):
    type: ScreenType
    data: dict

    @model_validator(mode="after")
    def _data(self):
        SCHEMAS[self.type].model_validate(self.data)
        return self


class Cena(BaseModel):
    id: str = Field(pattern=r"^s\d{2,}$")  # "s01", "s02"... sequencial; vai cru para HTML, JS e nome de arquivo
    kind: Literal["image", "screen"]
    narration: str  # trecho do roteiro lido nesta cena
    prompt: str = ""  # obrigatório se kind=image (em inglês, sem o prefixo do estilo)
    camera: Literal["zoom-in", "zoom-out", "pan-left", "pan-right", "static"] = "zoom-in"
    screen: Screen | None = None  # obrigatório se kind=screen
    sfx: str = ""  # descrição em inglês do efeito; "" = sem efeito
    characters: list[str] = []  # slugs de personagens do perfil presentes na imagem
    edicao: str = ""  # intenção de edição (ex.: "glitch na virada para o alerta"); "" = bom senso do editor dentro do estilo

    @model_validator(mode="after")
    def _kind(self):
        if self.kind == "image" and not self.prompt.strip():
            raise ValueError(f"cena {self.id}: kind=image exige prompt")
        if self.kind == "screen" and self.screen is None:
            raise ValueError(f"cena {self.id}: kind=screen exige screen")
        return self


class Cenas(BaseModel):
    cenas: list[Cena]
    ambiente: str = ""  # prompt de som de fundo


class VozCena(BaseModel):
    id: str
    file: str
    dur: float
    sha: str


class Voz(BaseModel):
    cenas: list[VozCena]


class MudancaEdicao(BaseModel):
    scene: str | None = None  # None = vale para o episódio todo
    o_que: str
    motivo: str = Field(min_length=1)


class Edicao(BaseModel):
    """Recibo do editor; fallback, motivo, sha e cache são do pipeline."""
    fallback: bool = False
    motivo: str = ""
    itens: list[str] = []
    mudancas: list[MudancaEdicao] = []
    sha: str = ""
    cache: bool = False


class Fix(BaseModel):
    role: Literal["roteirista", "diretor_arte"]
    scene: str | None = None
    note: str


class Revisao(BaseModel):
    ok: bool
    fixes: list[Fix] = []
