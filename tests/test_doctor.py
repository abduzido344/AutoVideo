from autovideo.doctor import parse_node_major

def test_parse_node_major():
    assert parse_node_major("v22.22.2\n") == 22
    assert parse_node_major("v18.0.0") == 18
