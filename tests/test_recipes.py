import pytest
from autovideo.recipes import load_recipe, list_recipes
from autovideo.timeline import FORMATS

def test_all_shipped_recipes_load():
    ids = list_recipes()
    assert {"talking-head-punchy", "screen-tutorial", "montage-beat"} <= set(ids)
    for i in ids:
        r = load_recipe(i)
        assert r.aspect in FORMATS
        assert set(r.prompts) == {"director", "copywriter", "designer", "editor"}

def test_unknown_recipe_lists_available():
    with pytest.raises(KeyError, match="talking-head-punchy"):
        load_recipe("nope")
