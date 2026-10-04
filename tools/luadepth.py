"""量一个 .lua 文件的最大语法嵌套深度。

LuaJIT 的 `LJ_MAX_XLEVELS` = 200，超了就是 `too many C levels`，
**整个模块加载失败**（症状是被 ydbase.dll 包成原生闪退，见 memory
`wc3-luajit-concat-limit`）。这个脚本就是拿来在重建后立刻自查的 ——
它比等游戏报错快得多，也比只数 `..` 准（层数不只来自 `..`）。

粗但在实践中够用：按 token 扫，`( [ {` 与 `function/do/then/repeat` 各加一层，
`) ] }` 与 `end/until` 各减一层，跳过字符串和 `--` 注释。

用法：python tools/luadepth.py dist/src/**/*.lua
"""
import re
import sys


def scan(path):
    try:
        src = open(path, encoding="utf-8", errors="replace").read()
    except OSError:
        return None

    depth = 0
    line = 1
    best = (0, 0)
    i = 0
    n = len(src)
    word = re.compile(r"[A-Za-z_][A-Za-z0-9_]*")
    OPEN_WORDS = {"function", "do", "then", "repeat"}
    CLOSE_WORDS = {"end", "until"}

    while i < n:
        c = src[i]
        if c == "\n":
            line += 1
            i += 1
            continue

        # -- 注释（含 --[[ ]] 长注释一律按到行尾处理，够用）
        if c == "-" and src[i : i + 2] == "--":
            j = src.find("\n", i)
            i = n if j < 0 else j
            continue

        # 字符串：单双引号，处理 \" \\ 转义
        if c == '"' or c == "'":
            quote = c
            i += 1
            while i < n and src[i] != quote:
                if src[i] == "\\":
                    i += 1
                i += 1
            i += 1
            continue

        if c in "([{":
            depth += 1
            if depth > best[0]:
                best = (depth, line)
            i += 1
            continue

        if c in ")]}":
            depth -= 1
            i += 1
            continue

        m = word.match(src, i)
        if m:
            w = m.group(0)
            if w in OPEN_WORDS:
                depth += 1
                if depth > best[0]:
                    best = (depth, line)
            elif w in CLOSE_WORDS:
                depth -= 1
            i = m.end()
            continue

        i += 1

    return best


def main():
    limit = int(sys.argv[1]) if sys.argv[1].isdigit() else 60
    paths = sys.argv[2:] if sys.argv[1].isdigit() else sys.argv[1:]
    rows = []
    for p in paths:
        r = scan(p)
        if r:
            rows.append((r[0], r[1], p))
    rows.sort(reverse=True)
    for d, ln, p in rows:
        flag = "  <== 逼近 LuaJIT 200 上限" if d >= 100 else ""
        print("%4d  L%-6d %s%s" % (d, ln, p, flag))
    print("--- 共 %d 个文件，最大深度 %d" % (len(rows), rows[0][0] if rows else 0))


if __name__ == "__main__":
    main()
