"""Lab: compiled Python. The source is gone; the bytecode is not."""

_PARTS = ("qu", "arry", "-", "07")


def build_token() -> str:
    return "".join(_PARTS)


def check(candidate: str) -> bool:
    return candidate == build_token()


if __name__ == "__main__":
    import sys

    print("ok" if len(sys.argv) > 1 and check(sys.argv[1]) else "no")
